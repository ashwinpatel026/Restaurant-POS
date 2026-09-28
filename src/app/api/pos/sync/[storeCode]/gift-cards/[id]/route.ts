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

async function findGiftCard(storeCode: string, id: string) {
  if (/^\d+$/.test(id)) {
    const byId = await locationPrisma.giftCard.findFirst({
      where: { giftCardId: Number(id), storeCode, isDelete: false }
    })
    if (byId) return byId
  }

  const byCode = await locationPrisma.giftCard.findFirst({
    where: { giftCardCode: id, storeCode, isDelete: false }
  })
  if (byCode) return byCode

  const byNumber = await locationPrisma.giftCard.findFirst({
    where: { giftCardNo: id, storeCode, isDelete: false }
  })
  if (byNumber) return byNumber

  return locationPrisma.giftCard.findFirst({
    where: { syncId: id, storeCode, isDelete: false }
  })
}

/**
 * @api {get} /api/pos/sync/:storeCode/gift-cards/:id Get gift card
 * @apiName GetGiftCard
 * @apiGroup GiftCards
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `giftCardId`, `giftCardCode`, `giftCardNo`, or `syncId`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Gift card record
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
 * @apiSuccess {Number}  data.topupAmount Top-up amount
 * @apiSuccess {Number}  data.usedAmount Used amount
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Gift card not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const record = await findGiftCard(storeCode, id)
    if (!record || record.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: serializeGiftCard(record)
    })
  } catch (error: any) {
    console.error('Error fetching gift card:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/gift-cards/:id Update gift card
 * @apiName UpdateGiftCard
 * @apiGroup GiftCards
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `giftCardId`, `giftCardCode`, `giftCardNo`, or `syncId`
 *
 * @apiBody {String}  [giftCardCode] Gift card code
 * @apiBody {String}  [giftCardNo] Gift card number
 * @apiBody {Number}  [cardAmount] Card amount
 * @apiBody {String}  [cardExpDate] Expiration timestamp (ISO)
 * @apiBody {Number}  [receivedAmount] Received amount
 * @apiBody {Number}  [isClosed] Closed flag
 * @apiBody {String}  [shiftCode] Shift code
 * @apiBody {String}  [menuItemCode] Linked menu item code
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {String}  [stationCode] Station code
 * @apiBody {Boolean} [isDelete] Soft delete flag
 * @apiBody {Number}  [topupAmount] Top-up amount
 * @apiBody {Number}  [usedAmount] Used amount
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "cardAmount": 75,
 *   "usedAmount": 25,
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated gift card
 * @apiSuccess {String}  data.giftCardId Gift card ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Gift card not found
 * @apiError (409) Conflict Gift card number already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

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

    const existing = await findGiftCard(storeCode, id)
    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      )
    }

    const nextNo = body.giftCardNo !== undefined || body.gift_card_no !== undefined
      ? String(body.giftCardNo || body.gift_card_no || '').trim()
      : undefined

    if (nextNo && nextNo !== existing.giftCardNo) {
      const conflict = await locationPrisma.giftCard.findFirst({
        where: { giftCardNo: nextNo, storeCode, isDelete: false }
      })
      if (conflict && conflict.giftCardId !== existing.giftCardId) {
        return NextResponse.json(
          { error: 'Gift card with this number already exists' },
          { status: 409 }
        )
      }
    }

    const payload: any = {
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }

    if (body.giftCardCode !== undefined || body.gift_card_code !== undefined) {
      payload.giftCardCode = body.giftCardCode || body.gift_card_code || null
    }
    if (nextNo !== undefined) payload.giftCardNo = nextNo || null
    if (body.cardAmount !== undefined) {
      payload.cardAmount =
        body.cardAmount === null || body.cardAmount === ''
          ? null
          : parseFloat(String(body.cardAmount))
    }
    if (body.cardExpDate !== undefined) {
      payload.cardExpDate = body.cardExpDate ? new Date(body.cardExpDate) : null
    }
    if (body.receivedAmount !== undefined) {
      payload.receivedAmount =
        body.receivedAmount === null || body.receivedAmount === ''
          ? null
          : parseFloat(String(body.receivedAmount))
    }
    if (body.isClosed !== undefined) {
      payload.isClosed = body.isClosed == null ? 0 : parseInt(String(body.isClosed), 10)
    }
    if (body.shiftCode !== undefined || body.shift_code !== undefined) {
      payload.shiftCode = body.shiftCode || body.shift_code || null
    }
    if (body.menuItemCode !== undefined || body.menu_item_code !== undefined) {
      payload.menuItemCode = body.menuItemCode || body.menu_item_code || null
    }
    if (body.isActive !== undefined) payload.isActive = body.isActive !== false
    if (body.stationCode !== undefined || body.station_code !== undefined) {
      payload.stationCode = body.stationCode || body.station_code || null
    }
    if (body.isDelete !== undefined) payload.isDelete = body.isDelete === true
    if (body.topupAmount !== undefined) {
      payload.topupAmount =
        body.topupAmount === null || body.topupAmount === ''
          ? 0
          : parseFloat(String(body.topupAmount))
    }
    if (body.usedAmount !== undefined) {
      payload.usedAmount =
        body.usedAmount === null || body.usedAmount === ''
          ? 0
          : parseFloat(String(body.usedAmount))
    }

    const updateData = posGiftCardMeta(payload, storeCode)
    updateData.syncId = existing.syncId

    const updated = await locationPrisma.giftCard.update({
      where: { giftCardId: existing.giftCardId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Gift card updated successfully',
      data: serializeGiftCard(updated)
    })
  } catch (error: any) {
    console.error('Error updating gift card:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/gift-cards/:id Delete gift card
 * @apiName DeleteGiftCard
 * @apiGroup GiftCards
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the gift card (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `giftCardId`, `giftCardCode`, `giftCardNo`, or `syncId`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.giftCardNo Gift card number
 * @apiSuccess {String}  data.giftCardCode Gift card code
 * @apiSuccess {String}  data.giftCardId Gift card ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Gift card not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const existing = await findGiftCard(storeCode, id)
    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      )
    }

    await locationPrisma.giftCard.update({
      where: { giftCardId: existing.giftCardId },
      data: posGiftCardMeta(
        {
          isDelete: true,
          isActive: false,
          syncId: existing.syncId
        },
        storeCode
      )
    })

    return NextResponse.json({
      success: true,
      message: 'Gift card deleted successfully',
      data: {
        giftCardNo: existing.giftCardNo,
        giftCardCode: existing.giftCardCode,
        giftCardId: String(existing.giftCardId)
      }
    })
  } catch (error: any) {
    console.error('Error deleting gift card:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
