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

/**
 * @api {get} /api/pos/sync/:storeCode/menu-item-time-events List menu item time events
 * @apiName GetMenuItemTimeEvents
 * @apiGroup MenuItemTimeEvents
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns menu item time-event pricing links (`tbl_menuitem_timeevent`) for the store.
 * Supports incremental sync and optional filters by menu item or time event.
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 * @apiQuery {String}  [menuItemCode] Filter by menu item code
 * @apiQuery {String}  [timeEventCode] Filter by time event code
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Object[]} data Menu item time events
 * @apiSuccess {String}  data.menuItemTimeEventId Record ID (string)
 * @apiSuccess {String}  [data.menuItemTimeEventCode] Unique link code
 * @apiSuccess {String}  [data.timeEventCode] Time event code
 * @apiSuccess {String}  [data.menuItemCode] Menu item code
 * @apiSuccess {Boolean} [data.isFixedValue] Use formula as a fixed price
 * @apiSuccess {Boolean} [data.isDelete] Soft delete flag
 * @apiSuccess {Boolean} [data.isOverride] Override global time-event price
 * @apiSuccess {Number}  [data.formulaValue] Formula or fixed value
 * @apiSuccess {Boolean} data.isActive Active flag
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
 *       "menuItemTimeEventId": "1",
 *       "menuItemTimeEventCode": "WMLOC001MT1",
 *       "menuItemCode": "WMLOC001MI1",
 *       "timeEventCode": "WMLOC001TE1",
 *       "isFixedValue": false,
 *       "isOverride": true,
 *       "formulaValue": 2.50,
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
    const menuItemCode = url.searchParams.get('menuItemCode')
    const timeEventCode = url.searchParams.get('timeEventCode')

    const where: any = { storeCode }
    if (menuItemCode) where.menuItemCode = menuItemCode
    if (timeEventCode) where.timeEventCode = timeEventCode
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    const records = await locationPrisma.menuItemTimeEvent.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: records.length,
      data: records.map(serializeMenuItemTimeEvent)
    })
  } catch (error: any) {
    console.error('Error fetching menu item time events:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/menu-item-time-events Create menu item time event
 * @apiName CreateMenuItemTimeEvent
 * @apiGroup MenuItemTimeEvents
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} menuItemCode Menu item code
 * @apiBody {String} timeEventCode Time event code
 * @apiBody {String}  [menuItemTimeEventCode] Unique link code
 * @apiBody {Boolean} [isFixedValue=false] Use formula as a fixed price
 * @apiBody {Boolean} [isOverride=false] Override global time-event price
 * @apiBody {Number}  [formulaValue] Formula or fixed value
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {Boolean} [isDelete=false] Soft delete flag
 * @apiBody {Number}  [createdBy] User ID who created the record
 * @apiBody {String}  [syncId] Unique sync identifier (auto-generated if omitted)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "menuItemCode": "WMLOC001MI1",
 *   "timeEventCode": "WMLOC001TE1",
 *   "isOverride": true,
 *   "isFixedValue": false,
 *   "formulaValue": 2.50,
 *   "isActive": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created menu item time event
 * @apiSuccess (201) {String}  data.menuItemTimeEventId Record ID (string)
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Link already exists for this menu item and time event
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

    const menuItemCode = body.menuItemCode || body.menu_item_code
    const timeEventCode = body.timeEventCode || body.time_event_code

    if (!menuItemCode || !timeEventCode) {
      return NextResponse.json(
        { error: 'menuItemCode and timeEventCode are required' },
        { status: 400 }
      )
    }

    const existing = await locationPrisma.menuItemTimeEvent.findFirst({
      where: { menuItemCode, timeEventCode, storeCode, isDelete: false }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Menu item time event already exists for this menu item and time event' },
        { status: 409 }
      )
    }

    const created = await locationPrisma.menuItemTimeEvent.create({
      data: posTimeEventMeta(
        {
          menuItemCode,
          timeEventCode,
          menuItemTimeEventCode: body.menuItemTimeEventCode || null,
          isFixedValue: body.isFixedValue === true,
          isOverride: body.isOverride === true,
          formulaValue:
            body.formulaValue !== undefined && body.formulaValue !== null && body.formulaValue !== ''
              ? parseFloat(String(body.formulaValue))
              : null,
          isActive: body.isActive !== false,
          isDelete: body.isDelete === true,
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
        message: 'Menu item time event created successfully',
        data: serializeMenuItemTimeEvent(created)
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating menu item time event:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Menu item time event already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
