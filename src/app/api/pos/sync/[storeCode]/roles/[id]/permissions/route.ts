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

/**
 * @api {get} /api/pos/sync/:storeCode/roles/:id/permissions Get role permissions
 * @apiName GetRolePermissions
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
 * @apiSuccess {String}  roleCode Role code
 * @apiSuccess {String[]} permissions Assigned permission codes
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
    })

    return NextResponse.json({
      success: true,
      storeCode,
      roleCode: role.roleCode,
      permissions: rolePermissions.map((rp) => rp.permissionCode),
    })
  } catch (error: any) {
    console.error('Error fetching role permissions (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/roles/:id/permissions Assign role permissions
 * @apiName UpdateRolePermissions
 * @apiGroup Roles
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Role identifier (numeric `roleId` or string `roleCode`)
 *
 * @apiBody {String[]} permissions Array of permission codes to assign
 *
 * @apiParamExample {json} Request Body
 * {
 *   "permissions": ["orders.view", "orders.create", "menu.view"]
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {String}  roleCode Role code
 * @apiSuccess {String[]} permissions Assigned permission codes
 *
 * @apiError (400) BadRequest Invalid permissions array
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

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { permissions } = body
    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'permissions must be an array' },
        { status: 400 }
      )
    }

    const uniqueCodes = [...new Set(permissions.map((p: string) => String(p)))]

    const existingPermissions = await locationPrisma.permission.findMany({
      where: {
        permissionCode: { in: uniqueCodes },
        isActive: true,
      },
    })

    if (existingPermissions.length !== uniqueCodes.length) {
      const foundCodes = existingPermissions.map((p) => p.permissionCode)
      const missingCodes = uniqueCodes.filter(
        (code) => !foundCodes.includes(code)
      )
      return NextResponse.json(
        { error: `Invalid permissions: ${missingCodes.join(', ')}` },
        { status: 400 }
      )
    }

    await locationPrisma.rolePermission.deleteMany({
      where: { roleCode: role.roleCode },
    })

    if (uniqueCodes.length > 0) {
      await locationPrisma.rolePermission.createMany({
        data: uniqueCodes.map((permissionCode) => ({
          roleCode: role.roleCode,
          permissionCode,
          syncSource: 'POS',
        })),
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Role permissions updated successfully',
      storeCode,
      roleCode: role.roleCode,
      permissions: uniqueCodes,
    })
  } catch (error: any) {
    console.error('Error updating role permissions (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
