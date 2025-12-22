import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { checkMasterPermission } from '@/lib/auth/accessControl'
import { clearPermissionCache } from '@/lib/auth/permissionService'
import { randomUUID } from 'crypto'
import { syncService } from '@/lib/sync/syncService'

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

    // Get existing role permissions before deletion (for sync log)
    const existingRolePermissions = await masterPrisma.rolePermission.findMany({
      where: { roleCode: code }
    })

    // Delete existing permissions for this role
    await masterPrisma.rolePermission.deleteMany({
      where: { roleCode: code }
    })

    // Create sync log entries for deleted role permissions
    for (const rp of existingRolePermissions) {
      if (rp.syncId) {
        try {
          await masterPrisma.$executeRaw`
            INSERT INTO sync_log (table_name, record_id, operation, source, data, change_time, sync_status, location_code)
            VALUES (
              'tbl_role_permission',
              ${rp.syncId}::uuid,
              'DELETE',
              'server',
              ${JSON.stringify({
                role_code: rp.roleCode,
                permission_code: rp.permissionCode
              })}::jsonb,
              NOW(),
              0,
              NULL
            )
          `
        } catch (syncError) {
          console.error('Error creating sync log for role permission deletion:', syncError)
        }
      }
    }

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

    // Create sync log entries for new role permissions
    for (const rp of newRolePermissions) {
      if (rp.syncId) {
        try {
          await masterPrisma.$executeRaw`
            INSERT INTO sync_log (table_name, record_id, operation, source, data, change_time, sync_status, location_code)
            VALUES (
              'tbl_role_permission',
              ${rp.syncId}::uuid,
              'INSERT',
              'server',
              ${JSON.stringify({
                role_code: rp.roleCode,
                permission_code: rp.permissionCode,
                sync_id: rp.syncId,
                sync_source: rp.syncSource,
                created_on: rp.createdOn.toISOString()
              })}::jsonb,
              NOW(),
              0,
              NULL
            )
          `
        } catch (syncError) {
          console.error('Error creating sync log for role permission creation:', syncError)
        }
      }
    }

    // Clear permission cache for this role
    clearPermissionCache(code)

    // Trigger immediate sync to all locations for role_permissions
    try {
      const locations = await masterPrisma.location.findMany({
        where: { isActive: 1 },
        select: { storeCode: true }
      })

      // Sync to all locations in parallel (don't wait for completion)
      Promise.all(
        locations.map(location =>
          syncService.syncToLocation({
            locationCode: location.storeCode,
            tableName: 'tbl_role_permission',
            fullSync: false
          }).catch(err => {
            console.error(`Failed to sync role permissions to ${location.storeCode}:`, err)
          })
        )
      ).catch(err => {
        console.error('Error during parallel sync:', err)
      })
    } catch (syncError) {
      console.error('Error triggering immediate sync for role permissions:', syncError)
      // Don't fail the request if immediate sync fails
    }

    return NextResponse.json({
      roleCode: code,
      permissions,
      message: 'Permissions updated successfully'
    })
  } catch (error) {
    console.error('Error updating role permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

