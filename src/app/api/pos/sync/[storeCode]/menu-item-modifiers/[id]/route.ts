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

async function findMenuItemModifier(storeCode: string, id: string) {
  try {
    const linkId = BigInt(id)
    return await locationPrisma.menuItemModifierGroup.findFirst({
      where: { id: linkId, storeCode },
    })
  } catch {
    return null
  }
}

/**
 * @api {get} /api/pos/sync/:storeCode/menu-item-modifiers/:id Get menu item modifier link
 * @apiName GetMenuItemModifier
 * @apiGroup MenuItemModifiers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Link identifier (BigInt `id`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Menu item modifier link record
 * @apiSuccess {String}  data.id Link ID (string)
 * @apiSuccess {String}  [data.menuItemCode] Menu item code
 * @apiSuccess {String}  [data.modifierGroupCode] Modifier group code
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "id": "1",
 *     "menuItemCode": "WLLOC001MI1",
 *     "modifierGroupCode": "WLLOC001MOD1",
 *     "isRequired": 1,
 *     "isMultiselect": 0
 *   }
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Link not found
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

    const link = await findMenuItemModifier(storeCode, id)

    if (!link || link.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item modifier link not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mapMenuItemModifier(link),
    })
  } catch (error: any) {
    console.error('Error fetching menu item modifier:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/menu-item-modifiers/:id Update menu item modifier link
 * @apiName UpdateMenuItemModifier
 * @apiGroup MenuItemModifiers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Link identifier (BigInt `id`)
 *
 * @apiBody {String} [menuItemCode] Menu item code
 * @apiBody {String} [modifierGroupCode] Modifier group code
 * @apiBody {Number|Boolean} [inheritFromMenuGroup] Inherit from menu group
 * @apiBody {Number|Boolean} [isInheritFromMenuCategory] Inherit from menu category
 * @apiBody {Number|Boolean} [isRequired] Required flag
 * @apiBody {Number|Boolean} [isMultiselect] Multiselect flag
 * @apiBody {Number} [minSelection] Minimum selection
 * @apiBody {Number} [maxSelection] Maximum selection
 *
 * @apiParamExample {json} Request Body
 * {
 *   "isRequired": 1,
 *   "isMultiselect": 1,
 *   "minSelection": 0,
 *   "maxSelection": 3
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated link record
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Link, menu item, or modifier group not found
 * @apiError (409) Conflict Updated menuItemCode + modifierGroupCode already exists
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

    const existing = await findMenuItemModifier(storeCode, id)

    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item modifier link not found' },
        { status: 404 }
      )
    }

    const nextMenuItemCode =
      body.menuItemCode !== undefined ? body.menuItemCode : existing.menuItemCode
    const nextModifierGroupCode =
      body.modifierGroupCode !== undefined
        ? body.modifierGroupCode
        : existing.modifierGroupCode

    if (body.menuItemCode !== undefined && body.menuItemCode !== null) {
      const menuItem = await locationPrisma.menuItem.findFirst({
        where: { menuItemCode: body.menuItemCode, storeCode, isDelete: false },
        select: { menuItemCode: true },
      })
      if (!menuItem) {
        return NextResponse.json(
          { error: 'Menu item not found for this store' },
          { status: 404 }
        )
      }
    }

    if (body.modifierGroupCode !== undefined && body.modifierGroupCode !== null) {
      const modifierGroup = await locationPrisma.modifierGroup.findFirst({
        where: {
          modifierGroupCode: body.modifierGroupCode,
          storeCode,
          isDelete: false,
        },
        select: { modifierGroupCode: true },
      })
      if (!modifierGroup) {
        return NextResponse.json(
          { error: 'Modifier group not found for this store' },
          { status: 404 }
        )
      }
    }

    if (
      nextMenuItemCode !== existing.menuItemCode ||
      nextModifierGroupCode !== existing.modifierGroupCode
    ) {
      const duplicate = await locationPrisma.menuItemModifierGroup.findFirst({
        where: {
          menuItemCode: nextMenuItemCode,
          modifierGroupCode: nextModifierGroupCode,
          storeCode,
          NOT: { id: existing.id },
        },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Menu item modifier link already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: any = addPOSSyncMetadata({}, storeCode)
    updateData.syncId = existing.syncId
    delete updateData.updatedOn
    delete updateData.updatedBy

    if (body.menuItemCode !== undefined) updateData.menuItemCode = body.menuItemCode
    if (body.modifierGroupCode !== undefined) {
      updateData.modifierGroupCode = body.modifierGroupCode
    }
    if (body.inheritFromMenuGroup !== undefined) {
      updateData.inheritFromMenuGroup = body.inheritFromMenuGroup ? 1 : 0
    }
    if (body.isInheritFromMenuCategory !== undefined) {
      updateData.isInheritFromMenuCategory = body.isInheritFromMenuCategory ? 1 : 0
    }
    if (body.isRequired !== undefined) {
      updateData.isRequired = body.isRequired ? 1 : 0
    }
    if (body.isMultiselect !== undefined) {
      updateData.isMultiselect = body.isMultiselect ? 1 : 0
    }
    if (body.minSelection !== undefined) {
      updateData.minSelection =
        body.minSelection !== null ? parseInt(body.minSelection, 10) : null
    }
    if (body.maxSelection !== undefined) {
      updateData.maxSelection =
        body.maxSelection !== null ? parseInt(body.maxSelection, 10) : null
    }

    const updated = await locationPrisma.menuItemModifierGroup.update({
      where: { id: existing.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: 'Menu item modifier link updated successfully',
      data: mapMenuItemModifier(updated),
    })
  } catch (error: any) {
    console.error('Error updating menu item modifier:', error)

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

/**
 * @api {delete} /api/pos/sync/:storeCode/menu-item-modifiers/:id Delete menu item modifier link
 * @apiName DeleteMenuItemModifier
 * @apiGroup MenuItemModifiers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Link identifier (BigInt `id`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.id Link ID (string)
 * @apiSuccess {String}  [data.menuItemCode] Menu item code
 * @apiSuccess {String}  [data.modifierGroupCode] Modifier group code
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Link not found
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

    const existing = await findMenuItemModifier(storeCode, id)

    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item modifier link not found' },
        { status: 404 }
      )
    }

    await locationPrisma.menuItemModifierGroup.delete({
      where: { id: existing.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Menu item modifier link deleted successfully',
      data: {
        id: existing.id.toString(),
        menuItemCode: existing.menuItemCode,
        modifierGroupCode: existing.modifierGroupCode,
      },
    })
  } catch (error: any) {
    console.error('Error deleting menu item modifier:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
