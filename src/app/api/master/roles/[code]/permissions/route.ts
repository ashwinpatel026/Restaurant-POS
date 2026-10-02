import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { checkMasterPermission } from '@/lib/auth/accessControl'
import { clearPermissionCache } from '@/lib/auth/permissionService'
import { randomUUID } from 'crypto'
import { syncProcessor } from '@/lib/sync/syncProcessor'

// GET role permissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasPermission = await checkMasterPermission(admin, 'roles.view')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { code } = await params
    const role = await masterPrisma.role.findUnique({
      where: { roleCode: code }
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    const rolePermissions = await masterPrisma.rolePermission.findMany({
      where: { roleCode: code },
      include: {
        permission: true
      }
    })

    return NextResponse.json({
      roleCode: role.roleCode,
      permissions: rolePermissions.map(rp => rp.permissionCode)
    })
  } catch (error) {
    console.error('Error fetching role permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UPDATE role permissions (bulk assignment)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasPermission = await checkMasterPermission(admin, 'roles.update')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { code } = await params
    const role = await masterPrisma.role.findUnique({
      where: { roleCode: code }
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { permissions } = body

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'permissions must be an array' },
        { status: 400 }
      )
    }

    // Validate all permissions exist
    const existingPermissions = await masterPrisma.permission.findMany({
      where: {
        permissionCode: { in: permissions },
        isActive: true
      }
    })

    if (existingPermissions.length !== permissions.length) {
      const foundCodes = existingPermissions.map(p => p.permissionCode)
      const missingCodes = permissions.filter((code: string) => !foundCodes.includes(code))
      return NextResponse.json(
        { error: `Invalid permissions: ${missingCodes.join(', ')}` },
        { status: 400 }
      )
    }

    // Delete existing permissions for this role
    await masterPrisma.rolePermission.deleteMany({
      where: { roleCode: code }
    })

    // Create new role-permission mappings
    const newRolePermissions = []
    if (permissions.length > 0) {
      const rolePermissionData = permissions.map((permissionCode: string) => ({
        roleCode: code,
        permissionCode,
        syncId: randomUUID(),
        syncSource: 'server'
      }))
      
      await masterPrisma.rolePermission.createMany({
        data: rolePermissionData
      })

      // Fetch created records to get their syncIds for sync log
      const createdRolePermissions = await masterPrisma.rolePermission.findMany({
        where: {
          roleCode: code,
          permissionCode: { in: permissions }
        }
      })
      newRolePermissions.push(...createdRolePermissions)
    }

    // Emit a single sync log entry per role change (UPSERT semantics)
    const syncId = randomUUID()
    try {
      await masterPrisma.$executeRaw`
        INSERT INTO sync_log (table_name, record_id, operation, source, data, change_time, sync_status, location_code)
        VALUES (
          'tbl_role_permission',
          ${syncId}::uuid,
          'UPDATE',
          'server',
          ${JSON.stringify({
            role_code: code,
            permissions,
            sync_id: syncId,
            sync_source: 'server',
            change_time: new Date().toISOString()
          })}::jsonb,
          NOW(),
          0,
          NULL
        )
      `
    } catch (syncError) {
      console.error('Error creating sync log for role permission update:', syncError)
    }

    // Clear master permission cache for this role
    clearPermissionCache(code)

    // Write the current master set into the shared location database.
    // Location login reads roles / permissions / role_permissions from there.
    let locationSyncError: string | null = null
    try {
      await syncProcessor.upsertLocationRoleFromMaster(code)
      await syncProcessor.upsertLocationPermissionsFromMaster(permissions)
      await syncProcessor.replaceRolePermissionSet(code, permissions)
      await syncProcessor.acknowledgePendingRoleLogs(code, ['tbl_role_permission'])
    } catch (syncError: any) {
      locationSyncError = syncError?.message || 'Location sync failed'
      console.error(`[role-permissions] Error syncing role ${code} to location database:`, syncError)
    }

    return NextResponse.json({
      roleCode: code,
      permissions,
      locationSyncError,
      message: locationSyncError
        ? `Permissions saved, but location sync failed: ${locationSyncError}`
        : 'Permissions updated successfully'
    })
  } catch (error) {
    console.error('Error updating role permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

