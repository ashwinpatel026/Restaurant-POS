import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

function mapMenuItemModifier(link: any) {
  return {
    ...link,
    id: link.id.toString(),
    createdBy: link.createdBy != null ? String(link.createdBy) : null,
    createdOn: link.createdOn ? link.createdOn.toISOString() : null,
  }
}

/**
 * @api {get} /api/pos/sync/:storeCode/menu-item-modifiers List menu item modifier group links
 * @apiName GetMenuItemModifiers
 * @apiGroup MenuItemModifiers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiQuery {String}  [menuItemCode] Filter by menu item code
 * @apiQuery {String}  [modifierGroupCode] Filter by modifier group code
 * @apiQuery {Boolean} [incremental=false] When true, return records created since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter (filters on `createdOn`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Object[]} data Menu item modifier link records
 * @apiSuccess {String}  data.id Link ID (string)
 * @apiSuccess {String}  [data.menuItemCode] Menu item code
 * @apiSuccess {String}  [data.modifierGroupCode] Modifier group code
 * @apiSuccess {Number}  data.inheritFromMenuGroup Inherit from menu group flag (0/1)
 * @apiSuccess {Number}  data.isInheritFromMenuCategory Inherit from menu category flag (0/1)
 * @apiSuccess {Number}  data.isRequired Required flag (0/1)
 * @apiSuccess {Number}  data.isMultiselect Multiselect flag (0/1)
 * @apiSuccess {Number}  [data.minSelection] Minimum selection
 * @apiSuccess {Number}  [data.maxSelection] Maximum selection
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "storeCode": "LOC001",
 *   "count": 1,
 *   "data": [
 *     {
 *       "id": "1",
 *       "menuItemCode": "WLLOC001MI1",
 *       "modifierGroupCode": "WLLOC001MOD1",
 *       "inheritFromMenuGroup": 0,
 *       "isInheritFromMenuCategory": 0,
 *       "isRequired": 1,
 *       "isMultiselect": 0,
 *       "minSelection": 1,
 *       "maxSelection": 1
 *     }
 *   ]
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
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
    const modifierGroupCode = url.searchParams.get('modifierGroupCode')

    const where: any = { storeCode }
    if (menuItemCode) where.menuItemCode = menuItemCode
    if (modifierGroupCode) where.modifierGroupCode = modifierGroupCode
    // MenuItemModifierGroup has no updatedOn — incremental sync uses createdOn
    if (incremental && lastSyncAt) {
      where.createdOn = { gte: new Date(lastSyncAt) }
    }

    const links = await locationPrisma.menuItemModifierGroup.findMany({
      where,
      orderBy: [{ menuItemCode: 'asc' }, { modifierGroupCode: 'asc' }, { createdOn: 'desc' }],
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: links.length,
      data: links.map(mapMenuItemModifier),
    })
  } catch (error: any) {
    console.error('Error fetching menu item modifiers:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/menu-item-modifiers Create menu item modifier link
 * @apiName CreateMenuItemModifier
 * @apiGroup MenuItemModifiers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiBody {String} menuItemCode Menu item code
 * @apiBody {String} modifierGroupCode Modifier group code
 * @apiBody {Number|Boolean} [inheritFromMenuGroup=0] Inherit from menu group
 * @apiBody {Number|Boolean} [isInheritFromMenuCategory=0] Inherit from menu category
 * @apiBody {Number|Boolean} [isRequired=0] Required flag
 * @apiBody {Number|Boolean} [isMultiselect=0] Multiselect flag
 * @apiBody {Number} [minSelection] Minimum selection
 * @apiBody {Number} [maxSelection] Maximum selection
 * @apiBody {Number} [createdBy] Created by user ID
 * @apiBody {String} [syncId] Unique sync identifier (auto-generated if omitted)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "menuItemCode": "WLLOC001MI1",
 *   "modifierGroupCode": "WLLOC001MOD1",
 *   "isRequired": 1,
 *   "isMultiselect": 0,
 *   "minSelection": 1,
 *   "maxSelection": 1
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created link record
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Menu item or modifier group not found for store
 * @apiError (409) Conflict Link already exists
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

    const { menuItemCode, modifierGroupCode } = body

    if (!menuItemCode || !modifierGroupCode) {
      return NextResponse.json(
        { error: 'menuItemCode and modifierGroupCode are required' },
        { status: 400 }
      )
    }

    const [menuItem, modifierGroup] = await Promise.all([
      locationPrisma.menuItem.findFirst({
        where: { menuItemCode, storeCode, isDelete: false },
        select: { menuItemCode: true },
      }),
      locationPrisma.modifierGroup.findFirst({
        where: { modifierGroupCode, storeCode, isDelete: false },
        select: { modifierGroupCode: true },
      }),
    ])

    if (!menuItem) {
      return NextResponse.json(
        { error: 'Menu item not found for this store' },
        { status: 404 }
      )
    }

    if (!modifierGroup) {
      return NextResponse.json(
        { error: 'Modifier group not found for this store' },
        { status: 404 }
      )
    }

    const existing = await locationPrisma.menuItemModifierGroup.findFirst({
      where: { menuItemCode, modifierGroupCode, storeCode },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Menu item modifier link already exists' },
        { status: 409 }
      )
    }

    const linkData = addPOSSyncMetadata(
      {
        menuItemCode,
        modifierGroupCode,
        inheritFromMenuGroup: body.inheritFromMenuGroup ? 1 : 0,
        isInheritFromMenuCategory: body.isInheritFromMenuCategory ? 1 : 0,
        isRequired: body.isRequired ? 1 : 0,
        isMultiselect: body.isMultiselect ? 1 : 0,
        minSelection:
          body.minSelection !== undefined && body.minSelection !== null
            ? parseInt(body.minSelection, 10)
            : null,
        maxSelection:
          body.maxSelection !== undefined && body.maxSelection !== null
            ? parseInt(body.maxSelection, 10)
            : null,
        createdBy: body.createdBy ? parseInt(body.createdBy, 10) : null,
        createdOn: new Date(),
        syncId: body.syncId || undefined,
      },
      storeCode
    )
    // MenuItemModifierGroup has no updatedOn / updatedBy
    delete (linkData as any).updatedOn
    delete (linkData as any).updatedBy

    const link = await locationPrisma.menuItemModifierGroup.create({
      data: linkData,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Menu item modifier link created successfully',
        data: mapMenuItemModifier(link),
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating menu item modifier:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Menu item modifier link already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
