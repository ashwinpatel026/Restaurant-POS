import { NextRequest, NextResponse } from 'next/server'
import { locationPrisma } from '@/lib/databaseManager'
import { authenticatePOSRequest } from '@/lib/posApiHelper'

async function findRole(id: string) {
  const numericId = Number(id)
  if (!Number.isNaN(numericId)) {
    const byId = await locationPrisma.role.findFirst({
      where: { roleId: BigInt(numericId) },
    })
    if (byId) return byId
  }

  return locationPrisma.role.findUnique({
    where: { roleCode: id },
  })
}

function mapRole(role: any, permissions?: any[]) {
  return {
    roleId: role.roleId.toString(),
    roleCode: role.roleCode,
    roleName: role.roleName,
    description: role.description,
    isSystemRole: role.isSystemRole,
    isActive: role.isActive,
    syncId: role.syncId,
    syncSource: role.syncSource,
    createdOn: role.createdOn ? role.createdOn.toISOString() : null,
    updatedOn: role.updatedOn ? role.updatedOn.toISOString() : null,
    ...(permissions
      ? {
          permissions: permissions.map((rp) => ({
            permissionCode: rp.permissionCode,
            permissionName: rp.permission?.permissionName ?? null,
            module: rp.permission?.module ?? null,
            action: rp.permission?.action ?? null,
          })),
          permissionCount: permissions.length,
        }
      : {}),
  }
}

/**
 * @api {get} /api/pos/sync/:storeCode/roles/:id Get role
 * @apiName GetRole
 * @apiGroup Roles
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Role identifier (numeric `roleId` or string `roleCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Role record with assigned permissions
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Role not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const role = await findRole(id)
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    const rolePermissions = await locationPrisma.rolePermission.findMany({
      where: { roleCode: role.roleCode },
      include: { permission: true },
    })

    return NextResponse.json({
      success: true,
      storeCode,
      data: mapRole(role, rolePermissions),
    })
  } catch (error: any) {
    console.error('Error fetching role (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/roles/:id Update role
 * @apiName UpdateRole
 * @apiGroup Roles
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Role identifier (numeric `roleId` or string `roleCode`)
 *
 * @apiBody {String}  [roleName] Role display name
 * @apiBody {String}  [description] Role description
 * @apiBody {Boolean} [isActive] Active status
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated role record
 *
 * @apiError (400) BadRequest Cannot update system role / invalid body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Role not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const role = await findRole(id)
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.isSystemRole) {
      return NextResponse.json(
        { error: 'Cannot update system role' },
        { status: 400 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { roleName, description, isActive } = body

    const updated = await locationPrisma.role.update({
      where: { roleId: role.roleId },
      data: {
        roleName: roleName !== undefined ? String(roleName).trim() : role.roleName,
        description: description !== undefined ? description : role.description,
        isActive: isActive !== undefined ? !!isActive : role.isActive,
        syncSource: 'POS',
        updatedOn: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      storeCode,
      data: mapRole(updated),
    })
  } catch (error: any) {
    console.error('Error updating role (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/roles/:id Delete role
 * @apiName DeleteRole
 * @apiGroup Roles
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Role identifier (numeric `roleId` or string `roleCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 *
 * @apiError (400) BadRequest Cannot delete system role
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Role not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const role = await findRole(id)
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.isSystemRole) {
      return NextResponse.json(
        { error: 'Cannot delete system role' },
        { status: 400 }
      )
    }

    await locationPrisma.rolePermission.deleteMany({
      where: { roleCode: role.roleCode },
    })

    await locationPrisma.role.delete({
      where: { roleId: role.roleId },
    })

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully',
      storeCode,
    })
  } catch (error: any) {
    console.error('Error deleting role (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
