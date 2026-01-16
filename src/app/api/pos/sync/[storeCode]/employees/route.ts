import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/employees List employees
 * @apiName GetEmployees
 * @apiGroup Employee
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
 * @apiSuccess {Number}  count Number of employee records returned
 * @apiSuccess {Object[]} data List of employee records
 * @apiSuccess {String}  data.employeeId Employee ID (string)
 * @apiSuccess {String}  data.employeeCode Employee code
 * @apiSuccess {String}  [data.employeeType] Employee type code
 * @apiSuccess {String}  [data.businessName] Business name
 * @apiSuccess {String}  [data.firstName] First name
 * @apiSuccess {String}  [data.lastName] Last name
 * @apiSuccess {String}  [data.address] Address
 * @apiSuccess {String}  [data.email] Email
 * @apiSuccess {String}  [data.phoneno] Phone number
 * @apiSuccess {Number}  [data.posAccessThisLocation] POS access at this location (0/1)
 * @apiSuccess {String}  [data.posAccessCode] POS access code
 * @apiSuccess {Number}  [data.allowPosAllLocation] POS access all locations (0/1)
 * @apiSuccess {Number}  [data.isUpdateEmpidAllLocation] Update employee ID all locations (0/1)
 * @apiSuccess {Number}  [data.isActive] Active status (0/1)
 * @apiSuccess {String}  [data.roleCode] Role code
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {String}  [data.alternateId] Alternate ID
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

    const employees = await locationPrisma.employee.findMany({
      where,
      orderBy: { updatedOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: employees.length,
      data: employees.map(employee => ({
        ...employee,
        employeeId: employee.employeeId.toString(),
        createdBy: employee.createdBy ? employee.createdBy.toString() : null,
        updatedBy: employee.updatedBy ? employee.updatedBy.toString() : null,
        createdOn: employee.createdOn ? employee.createdOn.toISOString() : null,
        updatedOn: employee.updatedOn ? employee.updatedOn.toISOString() : null
      }))
    })
  } catch (error: any) {
    console.error('Error fetching employees (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/employees Create employee
 * @apiName CreateEmployee
 * @apiGroup Employee
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} employeeCode Unique employee code
 * @apiBody {String} [employeeType] Employee type code
 * @apiBody {String} [businessName] Business name
 * @apiBody {String} [firstName] First name
 * @apiBody {String} [lastName] Last name
 * @apiBody {String} [address] Address
 * @apiBody {String} [email] Email
 * @apiBody {String} [phoneno] Phone number
 * @apiBody {Number} [posAccessThisLocation] POS access at this location (0/1)
 * @apiBody {String} [posAccessCode] POS access code
 * @apiBody {Number} [allowPosAllLocation] POS access all locations (0/1)
 * @apiBody {Number} [isUpdateEmpidAllLocation] Update employee ID all locations (0/1)
 * @apiBody {Number} [isActive=1] Active status (0/1)
 * @apiBody {String} [roleCode] Role code
 * @apiBody {Boolean} [isDelete=false] Soft delete flag
 * @apiBody {String} [alternateId] Alternate ID
 * @apiBody {Number} [createdBy] User ID (integer) who created the employee
 * @apiBody {String} [syncId] Unique sync identifier (auto-generated if not provided)
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created employee record
 * @apiSuccess (201) {String}  data.employeeId Employee ID (string)
 * @apiSuccess (201) {String}  data.employeeCode Employee code
 *
 * @apiError (400) BadRequest Missing or invalid request body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Employee with this code already exists
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
      employeeCode,
      employeeType,
      businessName,
      firstName,
      lastName,
      address,
      email,
      phoneno,
      posAccessThisLocation,
      posAccessCode,
      allowPosAllLocation,
      isUpdateEmpidAllLocation,
      isActive,
      roleCode,
      isDelete,
      alternateId,
      createdBy,
      syncId
    } = body

    if (!employeeCode) {
      return NextResponse.json(
        { error: 'employeeCode is required' },
        { status: 400 }
      )
    }

    const existing = await locationPrisma.employee.findFirst({
      where: { employeeCode, storeCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Employee with this code already exists' },
        { status: 409 }
      )
    }

    const employeeData = addPOSSyncMetadata({
      employeeCode,
      employeeType: employeeType || null,
      businessName: businessName || null,
      firstName: firstName || null,
      lastName: lastName || null,
      address: address || null,
      email: email || null,
      phoneno: phoneno || null,
      posAccessThisLocation: posAccessThisLocation !== undefined
        ? (posAccessThisLocation === null ? null : Number(posAccessThisLocation))
        : null,
      posAccessCode: posAccessCode || null,
      allowPosAllLocation: allowPosAllLocation !== undefined
        ? (allowPosAllLocation === null ? null : Number(allowPosAllLocation))
        : null,
      isUpdateEmpidAllLocation: isUpdateEmpidAllLocation !== undefined
        ? (isUpdateEmpidAllLocation === null ? null : Number(isUpdateEmpidAllLocation))
        : null,
      isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
      roleCode: roleCode || null,
      isDelete: isDelete !== undefined ? !!isDelete : false,
      alternateId: alternateId || null,
      createdBy: createdBy ? BigInt(createdBy) : null,
      syncId: syncId || undefined
    }, storeCode)

    const employee = await locationPrisma.employee.create({
      data: employeeData
    })

    return NextResponse.json({
      success: true,
      message: 'Employee created successfully',
      data: {
        ...employee,
        employeeId: employee.employeeId.toString(),
        createdBy: employee.createdBy ? employee.createdBy.toString() : null,
        updatedBy: employee.updatedBy ? employee.updatedBy.toString() : null,
        createdOn: employee.createdOn ? employee.createdOn.toISOString() : null,
        updatedOn: employee.updatedOn ? employee.updatedOn.toISOString() : null
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating employee (POS sync):', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Employee with this code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
