import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { checkMasterPermission } from '@/lib/auth/accessControl'
import { randomUUID } from 'crypto'
import { syncService } from '@/lib/sync/syncService'

// GET all roles
export async function GET(request: NextRequest) {
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

    const roles = await masterPrisma.role.findMany({
      orderBy: {
        createdOn: 'desc'
      },
      include: {
        _count: {
          select: {
            rolePermissions: true
          }
        }
      }
    })

    const rolesWithCounts = roles.map(role => ({
      roleId: role.roleId.toString(),
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.description,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      permissionCount: role._count.rolePermissions,
      createdOn: role.createdOn,
      updatedOn: role.updatedOn,
    }))

    return NextResponse.json(rolesWithCounts)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// CREATE new role
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasPermission = await checkMasterPermission(admin, 'roles.create')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { roleCode, roleName, description } = body

    // Validate required fields
    if (!roleCode || !roleName) {
      return NextResponse.json(
        { error: 'Missing required fields: roleCode and roleName' },
        { status: 400 }
      )
    }

    // Validate role code format (should match UserRole enum values or be custom)
    const validRoleCodes = [
      'SUPER_ADMIN',
      'COMPANY_ADMIN',
      'DEALER_ADMIN',
      'OUTLET_MANAGER',
      'CAPTAIN',
      'CASHIER',
      'KITCHEN_STAFF'
    ]

    // Check if role code already exists
    const existingRole = await masterPrisma.role.findUnique({
      where: { roleCode }
    })

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role code already exists' },
        { status: 400 }
      )
    }

    // Create role (non-system role)
    const role = await masterPrisma.role.create({
      data: {
        roleCode,
        roleName,
        description: description || null,
        isSystemRole: false,
        isActive: true,
        syncId: randomUUID(),
        syncSource: 'server'
      }
    })

    // Create sync log entry for role creation
    try {
      await masterPrisma.$executeRaw`
        INSERT INTO sync_log (table_name, record_id, operation, source, data, change_time, sync_status, location_code)
        VALUES (
          'tbl_role',
          ${role.syncId}::uuid,
          'INSERT',
          'server',
          ${JSON.stringify({
            role_code: role.roleCode,
            role_name: role.roleName,
            description: role.description,
            is_system_role: role.isSystemRole,
            is_active: role.isActive,
            sync_id: role.syncId,
            sync_source: role.syncSource,
            created_on: role.createdOn.toISOString(),
            updated_on: role.updatedOn?.toISOString() || null
          })}::jsonb,
          NOW(),
          0,
          NULL
        )
      `

      // Trigger immediate sync to all locations
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
              tableName: 'tbl_role',
              fullSync: false
            }).catch(err => {
              console.error(`Failed to sync role to ${location.storeCode}:`, err)
            })
          )
        ).catch(err => {
          console.error('Error during parallel sync:', err)
        })
      } catch (syncError) {
        console.error('Error triggering immediate sync for role:', syncError)
        // Don't fail the request if immediate sync fails
      }
    } catch (syncError) {
      console.error('Error creating sync log for role:', syncError)
      // Don't fail the request if sync log creation fails
    }

    return NextResponse.json({
      roleId: role.roleId.toString(),
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.description,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      createdOn: role.createdOn,
      updatedOn: role.updatedOn,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

