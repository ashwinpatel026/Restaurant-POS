import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

async function findModifierItem(storeCode: string, id: string) {
  let item = null

  try {
    const itemId = BigInt(id)
    item = await locationPrisma.modifierItem.findFirst({
      where: { id: itemId, storeCode, isDelete: false }
    })
  } catch {
    // BigInt conversion failed — fall through to code lookup
  }

  if (!item) {
    item = await locationPrisma.modifierItem.findFirst({
      where: { modifierItemCode: id, storeCode, isDelete: false }
    })
  }

  return item
}

/**
 * @api {get} /api/pos/sync/:storeCode/modifier-items/:id Get modifier item
 * @apiName GetModifierItem
 * @apiGroup ModifierItems
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Modifier item identifier (BigInt `id` or `modifierItemCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Modifier item record
 * @apiSuccess {String}  data.id Modifier item ID (string)
 * @apiSuccess {String}  data.modifierItemCode Modifier item code
 * @apiSuccess {String}  data.modifierGroupCode Parent modifier group code
 * @apiSuccess {String}  data.name Modifier item name
 * @apiSuccess {Number}  [data.price] Price
 * @apiSuccess {Number}  data.isDefault Default selection flag
 * @apiSuccess {Number}  [data.displayOrder] Display order
 * @apiSuccess {Number}  data.isActive Active flag
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "id": "1",
 *     "modifierItemCode": "MI001",
 *     "modifierGroupCode": "MG001",
 *     "name": "Extra Cheese",
 *     "price": 1.5,
 *     "isActive": 1
 *   }
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Modifier item not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const modifierItem = await findModifierItem(storeCode, id)

    if (!modifierItem || modifierItem.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Modifier item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...modifierItem,
        id: modifierItem.id.toString(),
        createdOn: modifierItem.createdOn
          ? modifierItem.createdOn.toISOString()
          : null
      }
    })
  } catch (error: any) {
    console.error('Error fetching modifier item:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/modifier-items/:id Update modifier item
 * @apiName UpdateModifierItem
 * @apiGroup ModifierItems
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Modifier item identifier (BigInt `id` or `modifierItemCode`)
 *
 * @apiBody {String} [modifierGroupCode] Parent modifier group code
 * @apiBody {String} [name] Modifier item display name
 * @apiBody {String} [labelName] Label name
 * @apiBody {String} [colorCode] Color code
 * @apiBody {String} [forColorCode] Foreground color code
 * @apiBody {Number} [price] Item price
 * @apiBody {Number|Boolean} [isDefault] Default selection flag
 * @apiBody {Number} [displayOrder] Display order
 * @apiBody {String} [groupCode] Group code
 * @apiBody {Number|Boolean} [isActive] Active flag (1/0 or true/false)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "name": "Extra Cheese",
 *   "price": 2.0,
 *   "isDefault": true,
 *   "displayOrder": 1
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated modifier item
 * @apiSuccess {String}  data.id Modifier item ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Modifier item (or parent group) not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

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

    const existingItem = await findModifierItem(storeCode, id)

    if (!existingItem || existingItem.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'modifier item not found' },
        { status: 404 }
      )
    }

    if (body.modifierGroupCode !== undefined && body.modifierGroupCode !== null) {
      const parentGroup = await locationPrisma.modifierGroup.findFirst({
        where: { modifierGroupCode: body.modifierGroupCode, storeCode }
      })
      if (!parentGroup) {
        return NextResponse.json(
          { error: 'Modifier group not found for this store' },
          { status: 404 }
        )
      }
    }

    const updateData: any = addPOSSyncMetadata({}, storeCode)
    updateData.syncId = existingItem.syncId
    // ModifierItem schema has no updatedOn / updatedBy
    delete updateData.updatedOn
    delete updateData.updatedBy

    if (body.modifierGroupCode !== undefined) {
      updateData.modifierGroupCode = body.modifierGroupCode
    }
    if (body.name !== undefined) updateData.name = body.name
    if (body.labelName !== undefined) updateData.labelName = body.labelName
    if (body.colorCode !== undefined) updateData.colorCode = body.colorCode
    if (body.forColorCode !== undefined) updateData.forColorCode = body.forColorCode
    if (body.price !== undefined) {
      updateData.price =
        body.price !== null ? parseFloat(body.price) : null
    }
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault ? 1 : 0
    if (body.displayOrder !== undefined) {
      updateData.displayOrder =
        body.displayOrder !== null ? parseInt(body.displayOrder) : null
    }
    if (body.groupCode !== undefined) updateData.groupCode = body.groupCode
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0

    const updatedItem = await locationPrisma.modifierItem.update({
      where: { id: existingItem.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Modifier item updated successfully',
      data: {
        ...updatedItem,
        id: updatedItem.id.toString(),
        createdOn: updatedItem.createdOn
          ? updatedItem.createdOn.toISOString()
          : null
      }
    })
  } catch (error: any) {
    console.error('Error updating modifier item:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/modifier-items/:id Delete modifier item
 * @apiName DeleteModifierItem
 * @apiGroup ModifierItems
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Modifier item identifier (BigInt `id` or `modifierItemCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.modifierItemCode Modifier item code
 * @apiSuccess {String}  data.id Modifier item ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Modifier item not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const existingItem = await findModifierItem(storeCode, id)

    if (!existingItem || existingItem.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Modifier item not found' },
        { status: 404 }
      )
    }

    await locationPrisma.modifierItem.delete({
      where: { id: existingItem.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Modifier item deleted successfully',
      data: {
        modifierItemCode: existingItem.modifierItemCode,
        id: existingItem.id.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting modifier item:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
