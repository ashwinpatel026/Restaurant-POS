import { NextRequest, NextResponse } from 'next/server'
import { locationPrisma } from '@/lib/databaseManager'
import { authenticatePOSRequest } from '@/lib/posApiHelper'

function mapRole(role: any, permissionCount?: number) {
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
    ...(permissionCount !== undefined ? { permissionCount } : {}),
  }
}

/**
 * @api {get} /api/pos/sync/:storeCode/roles List roles
 * @apiName GetRoles
 * @apiGroup Roles
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 * @apiQuery {Boolean} [activeOnly=false] When true, return only active roles
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for auth
 * @apiSuccess {Number}  count Number of role records returned
 * @apiSuccess {Object[]} data List of role records
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
    const activeOnly = url.searchParams.get('activeOnly') === 'true'

    const where: any = {}
    if (activeOnly) {
      where.isActive = true
    }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    const roles = await locationPrisma.role.findMany({
      where,
      orderBy: { roleName: 'asc' },
      include: {
        _count: {
          select: { rolePermissions: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: roles.length,
      data: roles.map((role) => mapRole(role, role._count.rolePermissions)),
    })
  } catch (error: any) {
    console.error('Error fetching roles (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/roles Create role
 * @apiName CreateRole
 * @apiGroup Roles
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} roleCode Unique role code
 * @apiBody {String} roleName Role display name
 * @apiBody {String} [description] Role description
 * @apiBody {Boolean} [isActive=true] Active status
 * @apiBody {String} [syncId] Unique sync identifier (auto-generated if omitted)
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created role record
 *
 * @apiError (400) BadRequest Missing or invalid request body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Role with this code already exists
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

    const { roleCode, roleName, description, isActive, syncId } = body

    if (!roleCode?.toString().trim() || !roleName?.toString().trim()) {
      return NextResponse.json(
        { error: 'roleCode and roleName are required' },
        { status: 400 }
      )
    }

    const trimmedCode = String(roleCode).trim()

    const existing = await locationPrisma.role.findUnique({
      where: { roleCode: trimmedCode },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Role with this code already exists' },
        { status: 409 }
      )
    }

    const role = await locationPrisma.role.create({
      data: {
        roleCode: trimmedCode,
        roleName: String(roleName).trim(),
        description: description ?? null,
        isSystemRole: false,
        isActive: isActive !== undefined ? !!isActive : true,
        syncSource: 'POS',
        ...(syncId ? { syncId } : {}),
        updatedOn: new Date(),
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Role created successfully',
        storeCode,
        data: mapRole(role, 0),
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating role (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
