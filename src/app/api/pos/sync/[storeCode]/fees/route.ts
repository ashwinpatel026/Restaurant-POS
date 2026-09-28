import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

function serializeFee(record: any) {
  return {
    ...record,
    feeId: record.feeId.toString(),
    feeValue: record.feeValue != null ? Number(record.feeValue) : null,
    createdBy: record.createdBy != null ? record.createdBy.toString() : null,
    updatedBy: record.updatedBy != null ? record.updatedBy.toString() : null,
    createdOn: record.createdOn ? record.createdOn.toISOString() : null,
    updatedOn: record.updatedOn ? record.updatedOn.toISOString() : null
  }
}

function posFeeMeta(data: any, storeCode: string) {
  const result = addPOSSyncMetadata(data, storeCode)
  delete result.isSyncToWeb
  delete result.isSyncToLocal
  return result
}

/**
 * @api {get} /api/pos/sync/:storeCode/fees List fees
 * @apiName GetFees
 * @apiGroup Fees
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns fee masters (`tbl_fee_master`) for the store.
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
 * @apiSuccess {Object[]} data Fees
 * @apiSuccess {String}  data.feeId Fee ID (string)
 * @apiSuccess {String}  data.feeCode Unique fee code
 * @apiSuccess {String}  [data.feeName] Fee name
 * @apiSuccess {String}  data.feeType Fee type
 * @apiSuccess {String}  [data.dollarPer] Value mode (`Percent` or `Dollar`)
 * @apiSuccess {Number}  [data.feeValue] Fee value
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {String}  [data.createdBy] Created-by user ID
 * @apiSuccess {String}  data.createdOn Created timestamp (ISO)
 * @apiSuccess {String}  [data.updatedBy] Updated-by user ID
 * @apiSuccess {String}  [data.updatedOn] Updated timestamp (ISO)
 * @apiSuccess {String}  [data.storeCode] Store code
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  [data.syncSource] Sync source
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "storeCode": "LOC001",
 *   "count": 1,
 *   "data": [
 *     {
 *       "feeId": "1",
 *       "feeCode": "WLLOC001FEE1",
 *       "feeName": "Service Charge",
 *       "feeType": "Service",
 *       "dollarPer": "Percent",
 *       "feeValue": 10,
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
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    const fees = await locationPrisma.feeMaster.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: fees.length,
      data: fees.map(serializeFee)
    })
  } catch (error: any) {
    console.error('Error fetching fees:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/fees Create fee
 * @apiName CreateFee
 * @apiGroup Fees
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} feeCode Unique fee code
 * @apiBody {String} feeName Fee name
 * @apiBody {String} feeType Fee type
 * @apiBody {String}  [dollarPer=Percent] Value mode (`Percent` or `Dollar`)
 * @apiBody {Number}  [feeValue=0] Fee value
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {Number}  [createdBy] User ID who created the record
 * @apiBody {String}  [syncId] Unique sync identifier (auto-generated if omitted)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "feeCode": "WLLOC001FEE1",
 *   "feeName": "Service Charge",
 *   "feeType": "Service",
 *   "dollarPer": "Percent",
 *   "feeValue": 10,
 *   "isActive": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created fee
 * @apiSuccess (201) {String}  data.feeId Fee ID (string)
 * @apiSuccess (201) {String}  data.feeCode Unique fee code
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Fee code already exists
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

    const feeCode = body.feeCode || body.fee_code
    const feeName = body.feeName || body.fee_name
    const feeType = body.feeType || body.fee_type

    if (!feeCode || !feeName || !feeType) {
      return NextResponse.json(
        { error: 'feeCode, feeName and feeType are required' },
        { status: 400 }
      )
    }

    const existing = await locationPrisma.feeMaster.findUnique({
      where: { feeCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Fee with this code already exists' },
        { status: 409 }
      )
    }

    const created = await locationPrisma.feeMaster.create({
      data: posFeeMeta(
        {
          feeCode,
          feeName,
          feeType,
          dollarPer: body.dollarPer || body.dollar_per || 'Percent',
          feeValue:
            body.feeValue !== undefined && body.feeValue !== null && body.feeValue !== ''
              ? parseFloat(String(body.feeValue))
              : 0,
          isActive: body.isActive !== false,
          createdBy: body.createdBy ? BigInt(body.createdBy) : null,
          createdOn: new Date(),
          syncId: body.syncId || undefined
        },
        storeCode
      )
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Fee created successfully',
        data: serializeFee(created)
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating fee:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Fee with this code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
