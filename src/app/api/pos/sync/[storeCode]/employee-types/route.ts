import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/employee-types List employee types
 * @apiName GetEmployeeTypes
 * @apiGroup EmployeeType
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
 * @apiSuccess {Number}  count Number of employee type records returned
 * @apiSuccess {Object[]} data List of employee type records
 * @apiSuccess {String}  data.employeeTypeId Employee type ID (string)
 * @apiSuccess {String}  data.typeCode Employee type code
 * @apiSuccess {String}  data.typeName Employee type name
 * @apiSuccess {String}  [data.description] Employee type description
 * @apiSuccess {Boolean} data.isActive Active status
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {String}  [data.createdOn] Creation timestamp
 * @apiSuccess {String}  [data.updatedOn] Last update timestamp
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source (e.g., "POS", "location")
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

    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    const employeeTypes = await locationPrisma.employeeType.findMany({
      where,
      orderBy: { updatedOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: employeeTypes.length,
      data: employeeTypes.map(empType => ({
        ...empType,
        employeeTypeId: empType.employeeTypeId.toString(),
        createdBy: empType.createdBy ? empType.createdBy.toString() : null,
        updatedBy: empType.updatedBy ? empType.updatedBy.toString() : null,
        createdOn: empType.createdOn ? empType.createdOn.toISOString() : null,
        updatedOn: empType.updatedOn ? empType.updatedOn.toISOString() : null
      }))
    })
  } catch (error: any) {
    console.error('Error fetching employee types (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/employee-types Create employee type
 * @apiName CreateEmployeeType
 * @apiGroup EmployeeType
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} typeCode Unique employee type code
 * @apiBody {String} typeName Employee type name
 * @apiBody {String} [description] Employee type description
 * @apiBody {Boolean} [isActive=true] Active status
 * @apiBody {Boolean} [isDelete=false] Soft delete flag
 * @apiBody {Number} [createdBy] User ID (integer) who created the employee type
 * @apiBody {String} [syncId] Unique sync identifier (auto-generated if not provided)
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created employee type record
 * @apiSuccess (201) {String}  data.employeeTypeId Employee type ID (string)
 * @apiSuccess (201) {String}  data.typeCode Employee type code
 * @apiSuccess (201) {String}  data.typeName Employee type name
 *
 * @apiError (400) BadRequest Missing or invalid request body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Employee type with this code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

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
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const {
      typeCode,
      typeName,
      description,
      isActive,
      isDelete,
      createdBy,
      syncId
    } = body

    if (!typeCode || !typeName) {
      return NextResponse.json(
        { error: 'typeCode and typeName are required' },
        { status: 400 }
      )
    }

    const existing = await locationPrisma.employeeType.findFirst({
      where: { typeCode, storeCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Employee type with this code already exists' },
        { status: 409 }
      )
    }

    const employeeTypeData = addPOSSyncMetadata({
      typeCode,
      typeName,
      description: description || null,
      isActive: isActive !== undefined ? !!isActive : true,
      isDelete: isDelete !== undefined ? !!isDelete : false,
      createdBy: createdBy ? BigInt(createdBy) : null,
      syncId: syncId || undefined
    }, storeCode)

    const employeeType = await locationPrisma.employeeType.create({
      data: employeeTypeData
    })

    return NextResponse.json({
      success: true,
      message: 'Employee type created successfully',
      data: {
        ...employeeType,
        employeeTypeId: employeeType.employeeTypeId.toString(),
        createdBy: employeeType.createdBy ? employeeType.createdBy.toString() : null,
        updatedBy: employeeType.updatedBy ? employeeType.updatedBy.toString() : null,
        createdOn: employeeType.createdOn ? employeeType.createdOn.toISOString() : null,
        updatedOn: employeeType.updatedOn ? employeeType.updatedOn.toISOString() : null
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating employee type (POS sync):', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Employee type with this code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
