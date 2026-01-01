import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/departments List departments
 * @apiName GetDepartments
 * @apiGroup Department
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
 * @apiSuccess {Number}  count Number of department records returned
 * @apiSuccess {Object[]} data List of department records
 * @apiSuccess {String}  data.deptId Department ID (string)
 * @apiSuccess {String}  data.deptCode Department code
 * @apiSuccess {String}  data.deptName Department display name
 * @apiSuccess {String}  [data.deptTaxCode] Tax code associated with department
 * @apiSuccess {String}  [data.deptTypeCode] Department type code
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
 *       "deptId": "1",
 *       "deptCode": "DEP001",
 *       "deptName": "Food Department",
 *       "deptTaxCode": "TAX001",
 *       "deptTypeCode": "DPT1",
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

    // Get departments
    const departments = await locationPrisma.department.findMany({
      where,
      orderBy: { updatedOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: departments.length,
      data: departments.map(dept => ({
        ...dept,
        deptId: dept.deptId.toString(),
        createdBy: dept.createdBy ? dept.createdBy.toString() : null,
        updatedBy: dept.updatedBy ? dept.updatedBy.toString() : null,
        createdOn: dept.createdOn ? dept.createdOn.toISOString() : null,
        updatedOn: dept.updatedOn ? dept.updatedOn.toISOString() : null
      }))
    })
  } catch (error: any) {
    console.error('Error fetching departments:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/departments Create department
 * @apiName CreateDepartment
 * @apiGroup Department
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} deptCode Unique department code
 * @apiBody {String} deptName Department display name
 * @apiBody {String} [deptTaxCode] Tax code associated with department
 * @apiBody {String} [deptTypeCode] Department type code
 * @apiBody {Number} [isActive=1] Active status (0 or 1)
 * @apiBody {Number} [createdBy] User ID (integer) who created the department
 * @apiBody {String} [syncId] Unique sync identifier (auto-generated if not provided)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "deptCode": "DEP001",
 *   "deptName": "Food Department",
 *   "deptTaxCode": "TAX001",
 *   "deptTypeCode": "DPT1",
 *   "isActive": 1,
 *   "createdBy": 1001
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created department record
 * @apiSuccess (201) {String}  data.deptId Department ID (string)
 * @apiSuccess (201) {String}  data.deptCode Department code
 * @apiSuccess (201) {String}  data.deptName Department display name
 * @apiSuccess (201) {String}  [data.deptTaxCode] Tax code associated with department
 * @apiSuccess (201) {String}  [data.deptTypeCode] Department type code
 * @apiSuccess (201) {Number}  data.isActive Active status (0 or 1)
 * @apiSuccess (201) {String}  data.syncId Unique sync identifier
 * @apiSuccess (201) {String}  data.syncSource Sync source (e.g., "POS")
 *
 * @apiSuccessExample {json} 201 Created
 * {
 *   "success": true,
 *   "message": "Department created successfully",
 *   "data": {
 *     "deptId": "1",
 *     "deptCode": "DEP001",
 *     "deptName": "Food Department",
 *     "deptTaxCode": "TAX001",
 *     "deptTypeCode": "DPT1",
 *     "isActive": 1,
 *     "syncId": "550e8400-e29b-41d4-a716-446655440000",
 *     "syncSource": "POS"
 *   }
 * }
 *
 * @apiError (400) BadRequest Missing or invalid request body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Department with this code already exists
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

    const { deptCode, deptName, deptTaxCode, deptTypeCode, isActive, createdBy, syncId } = body

    // Validate required fields
    if (!deptCode || !deptName) {
      return NextResponse.json(
        { error: 'deptCode and deptName are required' },
        { status: 400 }
      )
    }

    // Check if department code already exists
    const existing = await locationPrisma.department.findUnique({
      where: { deptCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Department with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const deptData = addPOSSyncMetadata({
      deptCode,
      deptName,
      deptTaxCode: deptTaxCode || null,
      deptTypeCode: deptTypeCode || null,
      isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
      createdBy: createdBy ? BigInt(createdBy) : null,
      syncId: syncId || undefined
    }, storeCode)

    // Create department
    const department = await locationPrisma.department.create({
      data: deptData
    })

    return NextResponse.json({
      success: true,
      message: 'Department created successfully',
      data: {
        ...department,
        deptId: department.deptId.toString(),
        createdBy: department.createdBy ? department.createdBy.toString() : null,
        updatedBy: department.updatedBy ? department.updatedBy.toString() : null,
        createdOn: department.createdOn ? department.createdOn.toISOString() : null,
        updatedOn: department.updatedOn ? department.updatedOn.toISOString() : null
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating department:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Department with this code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

