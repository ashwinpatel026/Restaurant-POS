import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

function serializeGiftCard(record: any) {
  return {
    ...record,
    giftCardId: String(record.giftCardId),
    cardAmount: record.cardAmount != null ? Number(record.cardAmount) : null,
    receivedAmount: record.receivedAmount != null ? Number(record.receivedAmount) : null,
    topupAmount: record.topupAmount != null ? Number(record.topupAmount) : 0,
    usedAmount: record.usedAmount != null ? Number(record.usedAmount) : 0,
    createdBy: record.createdBy != null ? record.createdBy.toString() : null,
    updatedBy: record.updatedBy != null ? record.updatedBy.toString() : null,
    cardExpDate: record.cardExpDate ? record.cardExpDate.toISOString() : null,
    createdOn: record.createdOn ? record.createdOn.toISOString() : null,
    updatedOn: record.updatedOn ? record.updatedOn.toISOString() : null
  }
}

function posGiftCardMeta(data: any, storeCode: string) {
  const result = addPOSSyncMetadata(data, storeCode)
  delete result.isSyncToWeb
  delete result.isSyncToLocal
  return result
}

/**
 * @api {get} /api/pos/sync/:storeCode/gift-cards List gift cards
 * @apiName GetGiftCards
 * @apiGroup GiftCards
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns gift cards (`tbl_gift_card`) for the store.
 * Soft-deleted records are excluded. Supports incremental sync.
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 * @apiQuery {String}  [giftCardNo] Filter by gift card number
 * @apiQuery {String}  [stationCode] Filter by station code
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Object[]} data Gift cards
 * @apiSuccess {String}  data.giftCardId Gift card ID (string)
 * @apiSuccess {String}  [data.giftCardCode] Gift card code
 * @apiSuccess {String}  [data.giftCardNo] Gift card number
 * @apiSuccess {Number}  [data.cardAmount] Card amount
 * @apiSuccess {String}  [data.cardExpDate] Expiration timestamp (ISO)
 * @apiSuccess {Number}  [data.receivedAmount] Received amount
 * @apiSuccess {Number}  [data.isClosed] Closed flag
 * @apiSuccess {String}  [data.shiftCode] Shift code
 * @apiSuccess {String}  [data.menuItemCode] Linked menu item code
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  [data.stationCode] Station code
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {Number}  data.topupAmount Top-up amount
 * @apiSuccess {Number}  data.usedAmount Used amount
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
 *       "giftCardId": "1",
 *       "giftCardCode": "WLLOC001GFT1",
 *       "giftCardNo": "10001",
 *       "cardAmount": 50,
 *       "topupAmount": 0,
 *       "usedAmount": 0,
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
    const giftCardNo = url.searchParams.get('giftCardNo')
    const stationCode = url.searchParams.get('stationCode')

    const where: any = { storeCode, isDelete: false }
    if (giftCardNo) where.giftCardNo = giftCardNo
    if (stationCode) where.stationCode = stationCode
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    const records = await locationPrisma.giftCard.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: records.length,
      data: records.map(serializeGiftCard)
    })
  } catch (error: any) {
    console.error('Error fetching gift cards:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/gift-cards Create gift card
 * @apiName CreateGiftCard
 * @apiGroup GiftCards
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} giftCardNo Gift card number
 * @apiBody {String}  [giftCardCode] Gift card code
 * @apiBody {Number}  [cardAmount] Card amount
 * @apiBody {String}  [cardExpDate] Expiration timestamp (ISO)
 * @apiBody {Number}  [receivedAmount] Received amount
 * @apiBody {Number}  [isClosed=0] Closed flag
 * @apiBody {String}  [shiftCode] Shift code
 * @apiBody {String}  [menuItemCode] Linked menu item code
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {String}  [stationCode] Station code
 * @apiBody {Number}  [topupAmount=0] Top-up amount
 * @apiBody {Number}  [usedAmount=0] Used amount
 * @apiBody {Number}  [createdBy] User ID who created the record
 * @apiBody {String}  [syncId] Unique sync identifier (auto-generated if omitted)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "giftCardNo": "10001",
 *   "giftCardCode": "WLLOC001GFT1",
 *   "cardAmount": 50,
 *   "isActive": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created gift card
 * @apiSuccess (201) {String}  data.giftCardId Gift card ID (string)
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Gift card number already exists
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

    const giftCardNo = String(body.giftCardNo || body.gift_card_no || '').trim()
    if (!giftCardNo) {
      return NextResponse.json(
        { error: 'giftCardNo is required' },
        { status: 400 }
      )
    }

    const existing = await locationPrisma.giftCard.findFirst({
      where: { giftCardNo, storeCode, isDelete: false }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Gift card with this number already exists' },
        { status: 409 }
      )
    }

    const created = await locationPrisma.giftCard.create({
      data: posGiftCardMeta(
        {
          giftCardNo,
          giftCardCode: body.giftCardCode || body.gift_card_code || null,
          cardAmount:
            body.cardAmount !== undefined && body.cardAmount !== null && body.cardAmount !== ''
              ? parseFloat(String(body.cardAmount))
              : null,
          cardExpDate: body.cardExpDate ? new Date(body.cardExpDate) : null,
          receivedAmount:
            body.receivedAmount !== undefined && body.receivedAmount !== null && body.receivedAmount !== ''
              ? parseFloat(String(body.receivedAmount))
              : null,
          isClosed: body.isClosed != null ? parseInt(String(body.isClosed), 10) : 0,
          shiftCode: body.shiftCode || body.shift_code || null,
          menuItemCode: body.menuItemCode || body.menu_item_code || null,
          isActive: body.isActive !== false,
          stationCode: body.stationCode || body.station_code || null,
          topupAmount:
            body.topupAmount !== undefined && body.topupAmount !== null && body.topupAmount !== ''
              ? parseFloat(String(body.topupAmount))
              : 0,
          usedAmount:
            body.usedAmount !== undefined && body.usedAmount !== null && body.usedAmount !== ''
              ? parseFloat(String(body.usedAmount))
              : 0,
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
        message: 'Gift card created successfully',
        data: serializeGiftCard(created)
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating gift card:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Gift card already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
