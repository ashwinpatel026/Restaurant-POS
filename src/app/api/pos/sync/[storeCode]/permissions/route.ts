import { NextRequest, NextResponse } from 'next/server'
import { locationPrisma } from '@/lib/databaseManager'
import { authenticatePOSRequest } from '@/lib/posApiHelper'

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
 * @api {get} /api/pos/sync/:storeCode/permissions List permissions
 * @apiName GetPermissions
 * @apiGroup Permissions
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 * @apiQuery {String}  [module] Filter by module name
 * @apiQuery {Boolean} [activeOnly=false] When true, return only active permissions
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for auth
 * @apiSuccess {Number}  count Number of permission records returned
 * @apiSuccess {Object[]} data Flat list of permission records
 * @apiSuccess {Object}  grouped Permissions grouped by module
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
    const moduleFilter = url.searchParams.get('module')
    const activeOnly = url.searchParams.get('activeOnly') === 'true'

    const where: any = {}
    if (activeOnly) {
      where.isActive = true
    }
    if (moduleFilter) {
      where.module = moduleFilter
    }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    const permissions = await locationPrisma.permission.findMany({
      where,
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    })

    const data = permissions.map(mapPermission)
    const grouped = data.reduce(
      (acc, perm) => {
        if (!acc[perm.module]) {
          acc[perm.module] = []
        }
        acc[perm.module].push(perm)
        return acc
      },
      {} as Record<string, any[]>
    )

    return NextResponse.json({
      success: true,
      storeCode,
      count: data.length,
      data,
      grouped,
    })
  } catch (error: any) {
    console.error('Error fetching permissions (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/permissions Create permission
 * @apiName CreatePermission
 * @apiGroup Permissions
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} permissionCode Unique permission code (e.g., "orders.view")
 * @apiBody {String} permissionName Permission display name
 * @apiBody {String} module Module name
 * @apiBody {String} action Action name
 * @apiBody {String} [description] Permission description
 * @apiBody {Boolean} [isActive=true] Active status
 * @apiBody {String} [syncId] Unique sync identifier (auto-generated if omitted)
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created permission record
 *
 * @apiError (400) BadRequest Missing or invalid request body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Permission with this code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function POST(
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

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const {
      permissionCode,
      permissionName,
      module,
      action,
      description,
      isActive,
      syncId,
    } = body

    if (
      !permissionCode?.toString().trim() ||
      !permissionName?.toString().trim() ||
      !module?.toString().trim() ||
      !action?.toString().trim()
    ) {
      return NextResponse.json(
        {
          error:
            'permissionCode, permissionName, module, and action are required',
        },
        { status: 400 }
      )
    }

    const trimmedCode = String(permissionCode).trim()

    const existing = await locationPrisma.permission.findUnique({
      where: { permissionCode: trimmedCode },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Permission with this code already exists' },
        { status: 409 }
      )
    }

    const permission = await locationPrisma.permission.create({
      data: {
        permissionCode: trimmedCode,
        permissionName: String(permissionName).trim(),
        module: String(module).trim(),
        action: String(action).trim(),
        description: description ?? null,
        isActive: isActive !== undefined ? !!isActive : true,
        syncSource: 'POS',
        ...(syncId ? { syncId } : {}),
        updatedOn: new Date(),
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Permission created successfully',
        storeCode,
        data: mapPermission(permission),
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating permission (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
