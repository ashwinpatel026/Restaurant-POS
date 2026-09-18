import { NextRequest, NextResponse } from 'next/server'
import { locationPrisma } from '@/lib/databaseManager'
import { authenticatePOSRequest } from '@/lib/posApiHelper'

async function findPermission(id: string) {
  const numericId = Number(id)
  if (!Number.isNaN(numericId)) {
    const byId = await locationPrisma.permission.findFirst({
      where: { permissionId: BigInt(numericId) },
    })
    if (byId) return byId
  }

  return locationPrisma.permission.findUnique({
    where: { permissionCode: id },
  })
}

function mapPermission(perm: any) {
  return {
    permissionId: perm.permissionId.toString(),
    permissionCode: perm.permissionCode,
    permissionName: perm.permissionName,
    module: perm.module,
    action: perm.action,
    description: perm.description,
    isActive: perm.isActive,
    syncId: perm.syncId,
    syncSource: perm.syncSource,
    createdOn: perm.createdOn ? perm.createdOn.toISOString() : null,
    updatedOn: perm.updatedOn ? perm.updatedOn.toISOString() : null,
  }
}

/**
 * @api {get} /api/pos/sync/:storeCode/permissions/:id Get permission
 * @apiName GetPermission
 * @apiGroup Permissions
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Permission identifier (numeric `permissionId` or string `permissionCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Permission record
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Permission not found
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

    const permission = await findPermission(id)
    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      storeCode,
      data: mapPermission(permission),
    })
  } catch (error: any) {
    console.error('Error fetching permission (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/permissions/:id Update permission
 * @apiName UpdatePermission
 * @apiGroup Permissions
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Permission identifier (numeric `permissionId` or string `permissionCode`)
 *
 * @apiBody {String}  [permissionName] Permission display name
 * @apiBody {String}  [module] Module name
 * @apiBody {String}  [action] Action name
 * @apiBody {String}  [description] Permission description
 * @apiBody {Boolean} [isActive] Active status
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated permission record
 *
 * @apiError (400) BadRequest Invalid body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Permission not found
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

    const permission = await findPermission(id)
    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
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

    const { permissionName, module, action, description, isActive } = body

    const updated = await locationPrisma.permission.update({
      where: { permissionId: permission.permissionId },
      data: {
        permissionName:
          permissionName !== undefined
            ? String(permissionName).trim()
            : permission.permissionName,
        module:
          module !== undefined ? String(module).trim() : permission.module,
        action:
          action !== undefined ? String(action).trim() : permission.action,
        description:
          description !== undefined ? description : permission.description,
        isActive: isActive !== undefined ? !!isActive : permission.isActive,
        syncSource: 'POS',
        updatedOn: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Permission updated successfully',
      storeCode,
      data: mapPermission(updated),
    })
  } catch (error: any) {
    console.error('Error updating permission (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/permissions/:id Delete permission
 * @apiName DeletePermission
 * @apiGroup Permissions
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Permission identifier (numeric `permissionId` or string `permissionCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Permission not found
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

    const permission = await findPermission(id)
    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      )
    }

    await locationPrisma.rolePermission.deleteMany({
      where: { permissionCode: permission.permissionCode },
    })

    await locationPrisma.permission.delete({
      where: { permissionId: permission.permissionId },
    })

    return NextResponse.json({
      success: true,
      message: 'Permission deleted successfully',
      storeCode,
    })
  } catch (error: any) {
    console.error('Error deleting permission (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
