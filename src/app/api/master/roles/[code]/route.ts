import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { checkMasterPermission } from '@/lib/auth/accessControl'
import { syncService } from '@/lib/sync/syncService'

// GET role details
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
      where: { roleCode: code },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            rolePermissions: true
          }
        }
      }
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      roleId: role.roleId.toString(),
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.description,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      permissionCount: role._count.rolePermissions,
      permissions: role.rolePermissions.map(rp => ({
        permissionCode: rp.permissionCode,
        permissionName: rp.permission.permissionName,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
      createdOn: role.createdOn,
      updatedOn: role.updatedOn,
    })
  } catch (error) {
    console.error('Error fetching role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UPDATE role
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

    // Cannot update system roles (except description)
    if (role.isSystemRole) {
      return NextResponse.json(
        { error: 'Cannot update system role' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { roleName, description } = body

    const updatedRole = await masterPrisma.role.update({
      where: { roleCode: code },
      data: {
        roleName: roleName || role.roleName,
        description: description !== undefined ? description : role.description,
        updatedOn: new Date()
      }
    })

    // Create sync log entry for role update
    if (updatedRole.syncId) {
      try {
        await masterPrisma.$executeRaw`
          INSERT INTO sync_log (table_name, record_id, operation, source, data, change_time, sync_status, location_code)
          VALUES (
            'tbl_role',
            ${updatedRole.syncId}::uuid,
            'UPDATE',
            'server',
            ${JSON.stringify({
              role_code: updatedRole.roleCode,
              role_name: updatedRole.roleName,
              description: updatedRole.description,
              is_system_role: updatedRole.isSystemRole,
              is_active: updatedRole.isActive,
              sync_id: updatedRole.syncId,
              sync_source: updatedRole.syncSource,
              created_on: updatedRole.createdOn.toISOString(),
              updated_on: updatedRole.updatedOn?.toISOString() || null
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
          console.error('Error triggering immediate sync for role update:', syncError)
          // Don't fail the request if immediate sync fails
        }
      } catch (syncError) {
        console.error('Error creating sync log for role update:', syncError)
        // Don't fail the request if sync log creation fails
      }
    }

    return NextResponse.json({
      roleId: updatedRole.roleId.toString(),
      roleCode: updatedRole.roleCode,
      roleName: updatedRole.roleName,
      description: updatedRole.description,
      isSystemRole: updatedRole.isSystemRole,
      isActive: updatedRole.isActive,
      createdOn: updatedRole.createdOn,
      updatedOn: updatedRole.updatedOn,
    })
  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasPermission = await checkMasterPermission(admin, 'roles.delete')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { code } = await params
    const role = await masterPrisma.role.findUnique({
      where: { roleCode: code },
      include: {
        _count: {
          select: {
            rolePermissions: true
          }
        }
      }
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Cannot delete system roles
    if (role.isSystemRole) {
      return NextResponse.json(
        { error: 'Cannot delete system role' },
        { status: 400 }
      )
    }

    // Check if any users have this role
    const usersWithRole = await masterPrisma.user.findFirst({
      where: { role: code as any }
    })

    if (usersWithRole) {
      return NextResponse.json(
        { error: 'Cannot delete role assigned to users. Reassign users first.' },
        { status: 400 }
      )
    }

    // Get sync_id before deletion for sync log
    const roleSyncId = role.syncId

    // Remove role permissions first, then delete role
    const rolePermissions = await masterPrisma.rolePermission.findMany({
      where: { roleCode: code }
    })

    if (rolePermissions.length > 0) {
      // Delete role permissions
      await masterPrisma.rolePermission.deleteMany({
        where: { roleCode: code }
      })

      // Log deletions for sync
      try {
        for (const rp of rolePermissions) {
          await masterPrisma.$executeRaw`
            INSERT INTO sync_log (table_name, record_id, operation, source, data, change_time, sync_status, location_code)
            VALUES (
              'tbl_role_permission',
              ${rp.syncId ?? ''}::uuid,
              'DELETE',
              'server',
              ${JSON.stringify({
                role_code: rp.roleCode,
                permission_code: rp.permissionCode,
              })}::jsonb,
              NOW(),
              0,
              NULL
            )
          `
        }
      } catch (syncError) {
        console.error('Error logging role_permission deletions:', syncError)
      }
    }

    await masterPrisma.role.delete({
      where: { roleCode: code }
    })

    // Create sync log entry for role deletion
    if (roleSyncId) {
      try {
        await masterPrisma.$executeRaw`
          INSERT INTO sync_log (table_name, record_id, operation, source, data, change_time, sync_status, location_code)
          VALUES (
            'tbl_role',
            ${roleSyncId}::uuid,
            'DELETE',
            'server',
            ${JSON.stringify({
              role_code: role.roleCode,
              role_name: role.roleName
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
                console.error(`Failed to sync role deletion to ${location.storeCode}:`, err)
              })
            )
          ).catch(err => {
            console.error('Error during parallel sync:', err)
          })
        } catch (syncError) {
          console.error('Error triggering immediate sync for role deletion:', syncError)
          // Don't fail the request if immediate sync fails
        }
      } catch (syncError) {
        console.error('Error creating sync log for role deletion:', syncError)
        // Don't fail the request if sync log creation fails
      }
    }

    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

