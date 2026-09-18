import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/modifier-items List modifier items
 * @apiName GetModifierItems
 * @apiGroup ModifierItems
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiQuery {String}  [modifierGroupCode] Filter items by modifier group code
 * @apiQuery {Boolean} [incremental=false] When true, return records created since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter (filters on `createdOn`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Object[]} data Modifier item records
 * @apiSuccess {String}  data.id Modifier item ID (string)
 * @apiSuccess {String}  data.modifierItemCode Modifier item code
 * @apiSuccess {String}  data.modifierGroupCode Parent modifier group code
 * @apiSuccess {String}  data.name Modifier item name
 * @apiSuccess {String}  [data.labelName] Label name
 * @apiSuccess {String}  [data.colorCode] Color code
 * @apiSuccess {String}  [data.forColorCode] Foreground color code
 * @apiSuccess {Number}  [data.price] Price
 * @apiSuccess {Number}  data.isDefault Default selection flag (0/1)
 * @apiSuccess {Number}  [data.displayOrder] Display order
 * @apiSuccess {String}  [data.groupCode] Group code
 * @apiSuccess {Number}  data.isActive Active flag (0/1)
 * @apiSuccess {Number}  [data.createdBy] Created by user ID
 * @apiSuccess {String}  data.createdOn Created on timestamp
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source (e.g., "POS", "server")
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "storeCode": "LOC001",
 *   "count": 1,
 *   "data": [
 *     {
 *       "id": "1",
 *       "modifierItemCode": "MI001",
 *       "modifierGroupCode": "MG001",
 *       "name": "Extra Cheese",
 *       "price": 1.5,
 *       "isDefault": 0,
 *       "displayOrder": 1,
 *       "isActive": 1
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
    const modifierGroupCode = url.searchParams.get('modifierGroupCode')

    const where: any = { storeCode, isDelete: false }
    if (modifierGroupCode) {
      where.modifierGroupCode = modifierGroupCode
    }
    // ModifierItem has no updatedOn column — incremental sync uses createdOn
    if (incremental && lastSyncAt) {
      where.createdOn = { gte: new Date(lastSyncAt) }
    }

    const modifierItems = await locationPrisma.modifierItem.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdOn: 'desc' }]
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: modifierItems.length,
      data: modifierItems.map(item => ({
        ...item,
        id: item.id.toString(),
        createdOn: item.createdOn ? item.createdOn.toISOString() : null
      }))
    })
  } catch (error: any) {
    console.error('Error fetching modifier items:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/modifier-items Create modifier item
 * @apiName CreateModifierItem
 * @apiGroup ModifierItems
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiBody {String} modifierItemCode Unique modifier item code
 * @apiBody {String} modifierGroupCode Parent modifier group code
 * @apiBody {String} name Modifier item display name
 * @apiBody {String} [labelName] Label name
 * @apiBody {String} [colorCode] Color code
 * @apiBody {String} [forColorCode] Foreground color code
 * @apiBody {Number} [price] Item price
 * @apiBody {Number|Boolean} [isDefault=0] Default selection flag
 * @apiBody {Number} [displayOrder] Display order
 * @apiBody {String} [groupCode] Group code
 * @apiBody {Number|Boolean} [isActive=1] Active flag (1/0 or true/false)
 * @apiBody {Number} [createdBy] User ID who created the item
 * @apiBody {String} [syncId] Unique sync identifier (auto-generated if omitted)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "modifierItemCode": "MI001",
 *   "modifierGroupCode": "MG001",
 *   "name": "Extra Cheese",
 *   "price": 1.5,
 *   "isDefault": false,
 *   "displayOrder": 1,
 *   "isActive": 1
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created modifier item
 * @apiSuccess (201) {String}  data.id Modifier item ID (string)
 * @apiSuccess (201) {String}  data.modifierItemCode Modifier item code
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Modifier group not found for store
 * @apiError (409) Conflict Modifier item code already exists
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
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const {
      modifierItemCode,
      modifierGroupCode,
      name,
      isActive = 1
    } = body

    if (!modifierItemCode || !modifierGroupCode || !name) {
      return NextResponse.json(
        { error: 'modifierItemCode, modifierGroupCode, and name are required' },
        { status: 400 }
      )
    }

    const parentGroup = await locationPrisma.modifierGroup.findFirst({
      where: { modifierGroupCode, storeCode }
    })

    if (!parentGroup) {
      return NextResponse.json(
        { error: 'Modifier group not found for this store' },
        { status: 404 }
      )
    }

    const existing = await locationPrisma.modifierItem.findFirst({
      where: { modifierItemCode, storeCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Modifier item with this code already exists' },
        { status: 409 }
      )
    }

    const itemData = addPOSSyncMetadata(
      {
        modifierItemCode,
        modifierGroupCode,
        name,
        labelName: body.labelName || null,
        colorCode: body.colorCode || null,
        forColorCode: body.forColorCode || null,
        price:
          body.price !== undefined && body.price !== null
            ? parseFloat(body.price)
            : null,
        isDefault: body.isDefault ? 1 : 0,
        displayOrder:
          body.displayOrder !== undefined && body.displayOrder !== null
            ? parseInt(body.displayOrder)
            : null,
        groupCode: body.groupCode || null,
        isActive: isActive ? 1 : 0,
        createdBy: body.createdBy ? parseInt(body.createdBy) : null,
        createdOn: new Date(),
        syncId: body.syncId || undefined
      },
      storeCode
    )
    // ModifierItem schema has no updatedOn / updatedBy
    delete (itemData as any).updatedOn
    delete (itemData as any).updatedBy

    const modifierItem = await locationPrisma.modifierItem.create({
      data: itemData
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Modifier item created successfully',
        data: {
          ...modifierItem,
          id: modifierItem.id.toString(),
          createdOn: modifierItem.createdOn
            ? modifierItem.createdOn.toISOString()
            : null
        }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating modifier item:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Modifier item with this code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
