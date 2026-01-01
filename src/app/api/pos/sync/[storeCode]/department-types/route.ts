import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/department-types List department types
 * @apiName GetDepartmentTypes
 * @apiGroup DepartmentType
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, only return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp to filter updated records (used with incremental)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of department type records returned
 * @apiSuccess {Object[]} data List of department type records
 * @apiSuccess {String}  data.deptTypeId Department type ID (string)
 * @apiSuccess {String}  data.deptTypeCode Department type code
 * @apiSuccess {String}  data.name Department type display name
 * @apiSuccess {Number}  data.isActive Active status (0 or 1)
 * @apiSuccess {String}  [data.createdOn] Creation timestamp
 * @apiSuccess {String}  [data.updatedOn] Last update timestamp
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source (e.g., "POS", "location")
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "storeCode": "LOC001",
 *   "count": 2,
 *   "data": [
 *     {
 *       "deptTypeId": "1",
 *       "deptTypeCode": "DPT1",
 *       "name": "Food Service",
 *       "isActive": 1,
 *       "syncId": "550e8400-e29b-41d4-a716-446655440000",
 *       "syncSource": "POS"
 *     }
 *   ]
 * }
 *
 * @apiError (400) BadRequest Invalid query parameters
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Store not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const lastSyncAt = url.searchParams.get('lastSyncAt')
    const incremental = url.searchParams.get('incremental') === 'true'

    // Build where clause
    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    // Get department types
    const departmentTypes = await locationPrisma.departmentType.findMany({
      where,
      orderBy: { updatedOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: departmentTypes.length,
      data: departmentTypes.map(deptType => ({
        ...deptType,
        deptTypeId: deptType.deptTypeId.toString(),
        createdBy: deptType.createdBy ? deptType.createdBy.toString() : null,
        updatedBy: deptType.updatedBy ? deptType.updatedBy.toString() : null,
        createdOn: deptType.createdOn ? deptType.createdOn.toISOString() : null,
        updatedOn: deptType.updatedOn ? deptType.updatedOn.toISOString() : null
      }))
    })
  } catch (error: any) {
    console.error('Error fetching department types:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/department-types Create department type
 * @apiName CreateDepartmentType
 * @apiGroup DepartmentType
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} deptTypeCode Unique department type code
 * @apiBody {String} name Department type display name
 * @apiBody {Number} [isActive=1] Active status (0 or 1)
 * @apiBody {Number} [createdBy] User ID (integer) who created the department type
 * @apiBody {String} [syncId] Unique sync identifier (auto-generated if not provided)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "deptTypeCode": "DPT1",
 *   "name": "Food Service",
 *   "isActive": 1,
 *   "createdBy": 1001
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created department type record
 * @apiSuccess (201) {String}  data.deptTypeId Department type ID (string)
 * @apiSuccess (201) {String}  data.deptTypeCode Department type code
 * @apiSuccess (201) {String}  data.name Department type display name
 * @apiSuccess (201) {Number}  data.isActive Active status (0 or 1)
 * @apiSuccess (201) {String}  data.syncId Unique sync identifier
 * @apiSuccess (201) {String}  data.syncSource Sync source (e.g., "POS")
 *
 * @apiSuccessExample {json} 201 Created
 * {
 *   "success": true,
 *   "message": "Department type created successfully",
 *   "data": {
 *     "deptTypeId": "1",
 *     "deptTypeCode": "DPT1",
 *     "name": "Food Service",
 *     "isActive": 1,
 *     "syncId": "550e8400-e29b-41d4-a716-446655440000",
 *     "syncSource": "POS"
 *   }
 * }
 *
 * @apiError (400) BadRequest Missing or invalid request body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Department type with this code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { deptTypeCode, name, isActive, createdBy, syncId } = body

    // Validate required fields
    if (!deptTypeCode || !name) {
      return NextResponse.json(
        { error: 'deptTypeCode and name are required' },
        { status: 400 }
      )
    }

    // Check if department type code already exists
    const existing = await locationPrisma.departmentType.findUnique({
      where: { deptTypeCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Department type with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const deptTypeData = addPOSSyncMetadata({
      deptTypeCode,
      name,
      isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
      createdBy: createdBy ? BigInt(createdBy) : null,
      syncId: syncId || undefined
    }, storeCode)

    // Create department type
    const departmentType = await locationPrisma.departmentType.create({
      data: deptTypeData
    })

    return NextResponse.json({
      success: true,
      message: 'Department type created successfully',
      data: {
        ...departmentType,
        deptTypeId: departmentType.deptTypeId.toString(),
        createdBy: departmentType.createdBy ? departmentType.createdBy.toString() : null,
        updatedBy: departmentType.updatedBy ? departmentType.updatedBy.toString() : null,
        createdOn: departmentType.createdOn ? departmentType.createdOn.toISOString() : null,
        updatedOn: departmentType.updatedOn ? departmentType.updatedOn.toISOString() : null
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating department type:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Department type with this code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

