import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

function serializeCustomer(record: any) {
  return {
    ...record,
    customerId: record.customerId.toString(),
    createdBy: record.createdBy != null ? record.createdBy.toString() : null,
    updatedBy: record.updatedBy != null ? record.updatedBy.toString() : null,
    createdAt: record.createdAt ? record.createdAt.toISOString() : null,
    updatedAt: record.updatedAt ? record.updatedAt.toISOString() : null
  }
}

function posCustomerMeta(data: any, storeCode: string) {
  const result = addPOSSyncMetadata(data, storeCode)
  delete result.isSyncToWeb
  delete result.isSyncToLocal
  if (result.updatedOn) {
    result.updatedAt = result.updatedOn
    delete result.updatedOn
  }
  return result
}

function readRequired(value: unknown, max: number) {
  const text = String(value ?? '').trim()
  if (!text || text.length > max) return null
  return text
}

function readOptional(value: unknown, max: number) {
  if (value === undefined) return undefined
  const text = String(value ?? '').trim()
  if (!text) return null
  if (text.length > max) return false as const
  return text
}

/**
 * @api {get} /api/pos/sync/:storeCode/customers List customers
 * @apiName GetCustomers
 * @apiGroup Customers
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns customers (`tbl_customer_master`) for the store.
 * Soft-deleted records are excluded. Supports incremental sync.
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Object[]} data Customers
 * @apiSuccess {String}  data.customerId Customer ID (string)
 * @apiSuccess {String}  data.customerCode Customer code
 * @apiSuccess {String}  data.phoneNumber Phone number
 * @apiSuccess {String}  data.customerName Customer name
 * @apiSuccess {String}  [data.businessName] Business name
 * @apiSuccess {String}  [data.email] Email
 * @apiSuccess {String}  [data.addressLine1] Address line 1
 * @apiSuccess {String}  [data.addressLine2] Address line 2
 * @apiSuccess {String}  [data.city] City
 * @apiSuccess {String}  [data.state] State
 * @apiSuccess {String}  [data.zipCode] Zip code
 * @apiSuccess {String}  [data.country] Country
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "storeCode": "LOC001",
 *   "count": 1,
 *   "data": [
 *     {
 *       "customerId": "1",
 *       "customerCode": "WLLOC001CUS1",
 *       "phoneNumber": "5550100",
 *       "customerName": "Alex Rivera",
 *       "isActive": true,
 *       "isDelete": false
 *     }
 *   ]
 * }
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

    const where: any = { storeCode, isDelete: false }
    if (incremental && lastSyncAt) {
      where.updatedAt = { gte: new Date(lastSyncAt) }
    }

    const customers = await locationPrisma.customerMaster.findMany({
      where,
      orderBy: [{ customerName: 'asc' }, { customerId: 'asc' }]
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: customers.length,
      data: customers.map(serializeCustomer)
    })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/customers Create customer
 * @apiName CreateCustomer
 * @apiGroup Customers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} customerCode Unique customer code (max 40)
 * @apiBody {String} phoneNumber Phone number (max 20)
 * @apiBody {String} customerName Customer name (max 150)
 * @apiBody {String} [businessName] Business name
 * @apiBody {String} [email] Email
 * @apiBody {String} [addressLine1] Address line 1
 * @apiBody {String} [addressLine2] Address line 2
 * @apiBody {String} [city] City
 * @apiBody {String} [state] State
 * @apiBody {String} [zipCode] Zip code
 * @apiBody {String} [country] Country
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {Number}  [createdBy] User ID who created the record
 * @apiBody {String}  [syncId] Unique sync identifier (auto-generated if omitted)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "customerCode": "WLLOC001CUS1",
 *   "phoneNumber": "5550100",
 *   "customerName": "Alex Rivera",
 *   "city": "Austin",
 *   "isActive": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created customer
 * @apiSuccess (201) {String}  data.customerId Customer ID (string)
 * @apiSuccess (201) {String}  data.customerCode Customer code
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Customer code or phone already exists
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

    const customerCode = readRequired(body.customerCode || body.customer_code, 40)
    const phoneNumber = readRequired(body.phoneNumber || body.phone_number, 20)
    const customerName = readRequired(body.customerName || body.customer_name, 150)

    if (!customerCode || !phoneNumber || !customerName) {
      return NextResponse.json(
        { error: 'customerCode, phoneNumber and customerName are required' },
        { status: 400 }
      )
    }

    const optionalFields = {
      businessName: readOptional(body.businessName ?? body.business_name, 100),
      email: readOptional(body.email, 150),
      addressLine1: readOptional(body.addressLine1 ?? body.address_line1, 255),
      addressLine2: readOptional(body.addressLine2 ?? body.address_line2, 150),
      city: readOptional(body.city, 100),
      state: readOptional(body.state, 100),
      zipCode: readOptional(body.zipCode ?? body.zip_code, 20),
      country: readOptional(body.country, 50)
    }

    if (Object.values(optionalFields).some((value) => value === false)) {
      return NextResponse.json(
        { error: 'One or more fields exceed the allowed length' },
        { status: 400 }
      )
    }

    const codeTaken = await locationPrisma.customerMaster.findFirst({
      where: { storeCode, isDelete: false, customerCode }
    })
    if (codeTaken) {
      return NextResponse.json(
        { error: 'Customer with this code already exists' },
        { status: 409 }
      )
    }

    const phoneTaken = await locationPrisma.customerMaster.findFirst({
      where: { storeCode, isDelete: false, phoneNumber }
    })
    if (phoneTaken) {
      return NextResponse.json(
        { error: 'Customer with this phone number already exists' },
        { status: 409 }
      )
    }

    const created = await locationPrisma.customerMaster.create({
      data: posCustomerMeta(
        {
          customerCode,
          phoneNumber,
          customerName,
          businessName: optionalFields.businessName ?? null,
          email: optionalFields.email ?? null,
          addressLine1: optionalFields.addressLine1 ?? null,
          addressLine2: optionalFields.addressLine2 ?? null,
          city: optionalFields.city ?? null,
          state: optionalFields.state ?? null,
          zipCode: optionalFields.zipCode ?? null,
          country: optionalFields.country ?? null,
          isActive: body.isActive !== false,
          createdBy: body.createdBy ? BigInt(body.createdBy) : null,
          createdAt: new Date(),
          syncId: body.syncId || undefined
        },
        storeCode
      )
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Customer created successfully',
        data: serializeCustomer(created)
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
