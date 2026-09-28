import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

function serializeMenuItemTimeEvent(record: any) {
  return {
    ...record,
    menuItemTimeEventId: record.menuItemTimeEventId.toString(),
    formulaValue: record.formulaValue != null ? Number(record.formulaValue) : null,
    createdBy: record.createdBy != null ? record.createdBy.toString() : null,
    updatedBy: record.updatedBy != null ? record.updatedBy.toString() : null,
    createdOn: record.createdOn ? record.createdOn.toISOString() : null,
    updatedOn: record.updatedOn ? record.updatedOn.toISOString() : null
  }
}

function posTimeEventMeta(data: any, storeCode: string) {
  const result = addPOSSyncMetadata(data, storeCode)
  delete result.isSyncToWeb
  delete result.isSyncToLocal
  return result
}

async function findMenuItemTimeEvent(storeCode: string, id: string) {
  if (/^\d+$/.test(id)) {
    const byId = await locationPrisma.menuItemTimeEvent.findFirst({
      where: { menuItemTimeEventId: BigInt(id), storeCode }
    })
    if (byId) return byId
  }

  const byCode = await locationPrisma.menuItemTimeEvent.findFirst({
    where: { menuItemTimeEventCode: id, storeCode }
  })
  if (byCode) return byCode

  return locationPrisma.menuItemTimeEvent.findFirst({
    where: { syncId: id, storeCode }
  })
}

/**
 * @api {get} /api/pos/sync/:storeCode/menu-item-time-events/:id Get menu item time event
 * @apiName GetMenuItemTimeEvent
 * @apiGroup MenuItemTimeEvents
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `menuItemTimeEventId`, `menuItemTimeEventCode`, or `syncId`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Menu item time event record
 * @apiSuccess {String}  data.menuItemTimeEventId Record ID (string)
 * @apiSuccess {String}  [data.menuItemTimeEventCode] Unique link code
 * @apiSuccess {String}  [data.timeEventCode] Time event code
 * @apiSuccess {String}  [data.menuItemCode] Menu item code
 * @apiSuccess {Boolean} [data.isFixedValue] Use formula as a fixed price
 * @apiSuccess {Boolean} [data.isDelete] Soft delete flag
 * @apiSuccess {Boolean} [data.isOverride] Override global time-event price
 * @apiSuccess {Number}  [data.formulaValue] Formula or fixed value
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Menu item time event not found
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

    const record = await findMenuItemTimeEvent(storeCode, id)
    if (!record || record.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item time event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: serializeMenuItemTimeEvent(record)
    })
  } catch (error: any) {
    console.error('Error fetching menu item time event:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/menu-item-time-events/:id Update menu item time event
 * @apiName UpdateMenuItemTimeEvent
 * @apiGroup MenuItemTimeEvents
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `menuItemTimeEventId`, `menuItemTimeEventCode`, or `syncId`
 *
 * @apiBody {String}  [menuItemCode] Menu item code
 * @apiBody {String}  [timeEventCode] Time event code
 * @apiBody {String}  [menuItemTimeEventCode] Unique link code
 * @apiBody {Boolean} [isFixedValue] Use formula as a fixed price
 * @apiBody {Boolean} [isOverride] Override global time-event price
 * @apiBody {Number}  [formulaValue] Formula or fixed value
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Boolean} [isDelete] Soft delete flag
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "isOverride": true,
 *   "formulaValue": 3.00,
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated menu item time event
 * @apiSuccess {String}  data.menuItemTimeEventId Record ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Menu item time event not found
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

    const existing = await findMenuItemTimeEvent(storeCode, id)
    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item time event not found' },
        { status: 404 }
      )
    }

    const payload: any = {
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }

    if (body.menuItemCode !== undefined || body.menu_item_code !== undefined) {
      payload.menuItemCode = body.menuItemCode || body.menu_item_code || null
    }
    if (body.timeEventCode !== undefined || body.time_event_code !== undefined) {
      payload.timeEventCode = body.timeEventCode || body.time_event_code || null
    }
    if (body.menuItemTimeEventCode !== undefined) {
      payload.menuItemTimeEventCode = body.menuItemTimeEventCode || null
    }
    if (body.isFixedValue !== undefined) payload.isFixedValue = body.isFixedValue === true
    if (body.isOverride !== undefined) payload.isOverride = body.isOverride === true
    if (body.isActive !== undefined) payload.isActive = body.isActive !== false
    if (body.isDelete !== undefined) payload.isDelete = body.isDelete === true
    if (body.formulaValue !== undefined) {
      payload.formulaValue =
        body.formulaValue === null || body.formulaValue === ''
          ? null
          : parseFloat(String(body.formulaValue))
    }

    const updateData = posTimeEventMeta(payload, storeCode)
    updateData.syncId = existing.syncId

    const updated = await locationPrisma.menuItemTimeEvent.update({
      where: { menuItemTimeEventId: existing.menuItemTimeEventId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Menu item time event updated successfully',
      data: serializeMenuItemTimeEvent(updated)
    })
  } catch (error: any) {
    console.error('Error updating menu item time event:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/menu-item-time-events/:id Delete menu item time event
 * @apiName DeleteMenuItemTimeEvent
 * @apiGroup MenuItemTimeEvents
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the menu item time event (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `menuItemTimeEventId`, `menuItemTimeEventCode`, or `syncId`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.menuItemTimeEventCode Link code
 * @apiSuccess {String}  data.menuItemTimeEventId Record ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Menu item time event not found
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

    const existing = await findMenuItemTimeEvent(storeCode, id)
    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item time event not found' },
        { status: 404 }
      )
    }

    await locationPrisma.menuItemTimeEvent.update({
      where: { menuItemTimeEventId: existing.menuItemTimeEventId },
      data: posTimeEventMeta(
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
      message: 'Menu item time event deleted successfully',
      data: {
        menuItemTimeEventCode: existing.menuItemTimeEventCode,
        menuItemTimeEventId: existing.menuItemTimeEventId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting menu item time event:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
