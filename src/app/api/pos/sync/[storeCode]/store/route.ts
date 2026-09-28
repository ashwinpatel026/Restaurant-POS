import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

const FIELD_LIMITS: Record<string, { snake: string; max: number }> = {
  storeName: { snake: 'storename', max: 50 },
  storeAddress1: { snake: 'storeaddress1', max: 200 },
  storeAddress2: { snake: 'storeaddress2', max: 200 },
  storeCity: { snake: 'storecity', max: 30 },
  storeState: { snake: 'storestate', max: 20 },
  storeZipCode: { snake: 'storezipcode', max: 10 },
  storePhoneNumber: { snake: 'storephonenumber', max: 15 },
  storeFaxNumber: { snake: 'storefaxnumber', max: 15 },
  storeAccountNumber: { snake: 'storeaccountnumber', max: 30 },
  storeRoutingNumber: { snake: 'storeroutingnumber', max: 30 },
  companyCode: { snake: 'company_code', max: 50 }
}

function serializeStore(record: any) {
  return {
    storeId: record.storeId.toString(),
    storeName: record.storeName,
    storeAddress1: record.storeAddress1,
    storeAddress2: record.storeAddress2,
    storeCity: record.storeCity,
    storeState: record.storeState,
    storeZipCode: record.storeZipCode,
    storePhoneNumber: record.storePhoneNumber,
    storeFaxNumber: record.storeFaxNumber,
    storeAccountNumber: record.storeAccountNumber,
    storeRoutingNumber: record.storeRoutingNumber,
    isActive: record.isActive,
    createdBy: record.createdBy,
    createdOn: record.createdOn ? record.createdOn.toISOString() : null,
    updatedBy: record.updatedBy,
    updatedOn: record.updatedOn ? record.updatedOn.toISOString() : null,
    isDelete: record.isDelete ?? false,
    storeCode: record.storeCode,
    companyCode: record.companyCode
  }
}

function readText(value: unknown, max: number) {
  const text = String(value ?? '').trim()
  if (!text) return null
  if (text.length > max) return false as const
  return text
}

function readUserId(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = parseInt(String(value), 10)
  return Number.isInteger(parsed) ? parsed : NaN
}

async function findStore(storeCode: string, includeDeleted = false) {
  return locationPrisma.store.findFirst({
    where: {
      storeCode,
      ...(includeDeleted ? {} : { isDelete: false })
    },
    orderBy: { storeId: 'desc' }
  })
}

/**
 * @api {get} /api/pos/sync/:storeCode/store Get store info
 * @apiName GetStore
 * @apiGroup Store
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns the single store profile (`tbl_store`) for this store code.
 * This is separate from store settings.
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return the record only if updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Object}  [data] Store profile, or null when none is saved
 * @apiSuccess {String}  data.storeId Store ID (string)
 * @apiSuccess {String}  [data.storeName] Store name
 * @apiSuccess {String}  [data.storeAddress1] Address line 1
 * @apiSuccess {String}  [data.storeAddress2] Address line 2
 * @apiSuccess {String}  [data.storeCity] City
 * @apiSuccess {String}  [data.storeState] State
 * @apiSuccess {String}  [data.storeZipCode] Zip code
 * @apiSuccess {String}  [data.storePhoneNumber] Phone number
 * @apiSuccess {String}  [data.storeFaxNumber] Fax number
 * @apiSuccess {String}  [data.storeAccountNumber] Account number
 * @apiSuccess {String}  [data.storeRoutingNumber] Routing number
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  [data.companyCode] Company code
 * @apiSuccess {String}  data.storeCode Store code
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "storeCode": "LOC001",
 *   "data": {
 *     "storeId": "1",
 *     "storeName": "Main Street",
 *     "storeCode": "LOC001",
 *     "isActive": true
 *   }
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

    const store = await findStore(storeCode)
    const unchanged =
      incremental &&
      lastSyncAt &&
      store?.updatedOn &&
      store.updatedOn < new Date(lastSyncAt)

    return NextResponse.json({
      success: true,
      storeCode,
      data: store && !unchanged ? serializeStore(store) : null
    })
  } catch (error: any) {
    console.error('Error fetching store info:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/store Update store info
 * @apiName UpdateStore
 * @apiGroup Store
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Creates or updates the single store profile for this store code.
 * `createdBy` is required only when the record does not exist yet.
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String}  [storeName] Store name (max 50)
 * @apiBody {String}  [storeAddress1] Address line 1 (max 200)
 * @apiBody {String}  [storeAddress2] Address line 2 (max 200)
 * @apiBody {String}  [storeCity] City (max 30)
 * @apiBody {String}  [storeState] State (max 20)
 * @apiBody {String}  [storeZipCode] Zip code (max 10)
 * @apiBody {String}  [storePhoneNumber] Phone number (max 15)
 * @apiBody {String}  [storeFaxNumber] Fax number (max 15)
 * @apiBody {String}  [storeAccountNumber] Account number (max 30)
 * @apiBody {String}  [storeRoutingNumber] Routing number (max 30)
 * @apiBody {String}  [companyCode] Company code (max 50)
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Boolean} [isDelete] Soft delete flag
 * @apiBody {Number}  [createdBy] User ID who created the record (required on create)
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "storeName": "Main Street",
 *   "storeAddress1": "100 Main St",
 *   "storeCity": "Austin",
 *   "storeState": "TX",
 *   "storeZipCode": "78701",
 *   "storePhoneNumber": "5550100",
 *   "createdBy": 1
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Store profile
 * @apiSuccess {String}  data.storeId Store ID (string)
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
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

    const existing = await findStore(storeCode, true)
    const payload: any = {
      updatedOn: new Date()
    }

    for (const [camel, config] of Object.entries(FIELD_LIMITS)) {
      if (body[camel] === undefined && body[config.snake] === undefined) continue
      const value = readText(body[camel] ?? body[config.snake], config.max)
      if (value === false) {
        return NextResponse.json(
          { error: `${camel} exceeds ${config.max} characters` },
          { status: 400 }
        )
      }
      payload[camel] = value
    }

    if (body.isActive !== undefined) payload.isActive = body.isActive !== false
    if (body.isDelete !== undefined) payload.isDelete = body.isDelete === true

    const updatedBy = readUserId(body.updatedBy ?? body.updated_by)
    if (Number.isNaN(updatedBy)) {
      return NextResponse.json(
        { error: 'updatedBy must be an integer' },
        { status: 400 }
      )
    }
    if (updatedBy !== undefined) payload.updatedBy = updatedBy

    const createdBy = readUserId(body.createdBy ?? body.created_by)
    if (Number.isNaN(createdBy)) {
      return NextResponse.json(
        { error: 'createdBy must be an integer' },
        { status: 400 }
      )
    }

    let record
    if (existing) {
      record = await locationPrisma.store.update({
        where: { storeId: existing.storeId },
        data: payload
      })
    } else {
      if (createdBy === undefined) {
        return NextResponse.json(
          { error: 'createdBy is required when creating store info' },
          { status: 400 }
        )
      }

      record = await locationPrisma.store.create({
        data: {
          ...payload,
          storeCode,
          createdBy,
          createdOn: new Date(),
          isActive: payload.isActive ?? true,
          isDelete: false
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: existing
        ? 'Store info updated successfully'
        : 'Store info created successfully',
      storeCode,
      data: serializeStore(record)
    })
  } catch (error: any) {
    console.error('Error updating store info:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
