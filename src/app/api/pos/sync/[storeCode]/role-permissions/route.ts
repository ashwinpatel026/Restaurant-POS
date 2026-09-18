import { NextRequest, NextResponse } from 'next/server'
import { locationPrisma } from '@/lib/databaseManager'
import { authenticatePOSRequest } from '@/lib/posApiHelper'

function mapRolePermission(rp: any) {
  return {
    rolePermissionId: rp.rolePermissionId.toString(),
    roleCode: rp.roleCode,
    permissionCode: rp.permissionCode,
    syncId: rp.syncId,
    syncSource: rp.syncSource,
    createdOn: rp.createdOn ? rp.createdOn.toISOString() : null,
  }
}

/**
 * @api {get} /api/pos/sync/:storeCode/role-permissions List all role permissions
 * @apiName GetRolePermissionsList
 * @apiGroup RolePermissions
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records created since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 * @apiQuery {String}  [roleCode] Filter by role code
 * @apiQuery {String}  [permissionCode] Filter by permission code
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for auth
 * @apiSuccess {Number}  count Number of role permission records returned
 * @apiSuccess {Object[]} data List of role permission records
 * @apiSuccess {String}  data.rolePermissionId Role permission ID (string)
 * @apiSuccess {String}  data.roleCode Role code
 * @apiSuccess {String}  data.permissionCode Permission code
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source
 * @apiSuccess {String}  data.createdOn Creation timestamp
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Store not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const { storeCode } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const url = new URL(request.url)
    const lastSyncAt = url.searchParams.get('lastSyncAt')
    const incremental = url.searchParams.get('incremental') === 'true'
    const roleCode = url.searchParams.get('roleCode')
    const permissionCode = url.searchParams.get('permissionCode')

    const where: any = {}
    if (roleCode) {
      where.roleCode = roleCode
    }
    if (permissionCode) {
      where.permissionCode = permissionCode
    }
    // RolePermission has createdOn only (no updatedOn)
    if (incremental && lastSyncAt) {
      where.createdOn = { gte: new Date(lastSyncAt) }
    }

    const rolePermissions = await locationPrisma.rolePermission.findMany({
      where,
      orderBy: [{ roleCode: 'asc' }, { permissionCode: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: rolePermissions.length,
      data: rolePermissions.map(mapRolePermission),
    })
  } catch (error: any) {
    console.error('Error fetching role permissions (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
