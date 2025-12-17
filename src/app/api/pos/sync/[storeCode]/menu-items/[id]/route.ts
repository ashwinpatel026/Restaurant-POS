import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/menu-items/:id Get menu item
 * @apiName GetMenuItem
 * @apiGroup MenuItems
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Menu item identifier (BigInt `menuItemId` or `menuItemCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Menu item record
 * @apiSuccess {String}  data.menuItemId Menu item ID (string)
 * @apiSuccess {String}  data.menuItemCode Menu item code
 * @apiSuccess {String}  data.name Menu item name
 * @apiSuccess {Number}  [data.cashPrice] Cash price
 * @apiSuccess {Number}  [data.cardPrice] Card price
 * @apiSuccess {Number}  data.isActive Active flag
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Menu item not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Try to find by ID first, then by menuItemCode
    let menuItem = null
    const itemId = BigInt(id)
    
    try {
      menuItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemId: itemId,
          storeCode
        }
      })
    } catch {
      // If BigInt conversion fails, try by code
    }

    if (!menuItem) {
      menuItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemCode: id,
          storeCode
        }
      })
    }

    if (!menuItem || menuItem.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...menuItem,
        menuItemId: menuItem.menuItemId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/menu-items/:id Update menu item
 * @apiName UpdateMenuItem
 * @apiGroup MenuItems
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Menu item identifier (BigInt `menuItemId` or `menuItemCode`)
 *
 * @apiBody {String} [name] Menu item name
 * @apiBody {String} [kitchenName] Kitchen display name
 * @apiBody {String} [labelName] Label display name
 * @apiBody {Number} [cashPrice] Cash price
 * @apiBody {Number} [cardPrice] Card price
 * @apiBody {Number|Boolean} [isActive] Active flag (1/0 or true/false)
 * @apiBody {String} [description] Description
 * @apiBody {Number} [stockinhand] Current stock
 * @apiBody {Number} [updatedBy] User ID (integer) who updated the item
 *
 * @apiParamExample {json} Request Body
 * {
 *   "name": "Classic Burger (Large)",
 *   "cashPrice": 13.49,
 *   "isActive": 1,
 *   "updatedBy": 1002
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated menu item
 * @apiSuccess {String}  data.menuItemId Menu item ID (string)
 * @apiSuccess {String}  data.menuItemCode Menu item code
 * @apiSuccess {String}  data.name Menu item name
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Menu item not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Find existing menu item
    let existingItem = null
    const itemId = BigInt(id)
    
    try {
      existingItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemId: itemId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingItem) {
      existingItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemCode: id,
          storeCode
        }
      })
    }

    if (!existingItem || existingItem.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      )
    }

    // Prepare update data with POS sync metadata
    const updateData: any = addPOSSyncMetadata({
      updatedBy: body.updatedBy ? parseInt(body.updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingItem.syncId

    // Update allowed fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.kitchenName !== undefined) updateData.kitchenName = body.kitchenName
    if (body.labelName !== undefined) updateData.labelName = body.labelName
    if (body.cashPrice !== undefined) updateData.cashPrice = body.cashPrice ? parseFloat(body.cashPrice) : null
    if (body.cardPrice !== undefined) updateData.cardPrice = body.cardPrice ? parseFloat(body.cardPrice) : null
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0
    if (body.description !== undefined) updateData.description = body.description
    if (body.stockinhand !== undefined) updateData.stockinhand = body.stockinhand ? parseFloat(body.stockinhand) : null

    // Update menu item
    const updatedItem = await locationPrisma.menuItem.update({
      where: { menuItemId: existingItem.menuItemId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Menu item updated successfully',
      data: {
        ...updatedItem,
        menuItemId: updatedItem.menuItemId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/menu-items/:id Delete menu item
 * @apiName DeleteMenuItem
 * @apiGroup MenuItems
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Menu item identifier (BigInt `menuItemId` or `menuItemCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.menuItemCode Menu item code
 * @apiSuccess {String}  data.menuItemId Menu item ID (string)
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "message": "Menu item deleted successfully",
 *   "data": {
 *     "menuItemCode": "MI001",
 *     "menuItemId": "101"
 *   }
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Menu item not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Find existing menu item
    let existingItem = null
    const itemId = BigInt(id)
    
    try {
      existingItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemId: itemId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingItem) {
      existingItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemCode: id,
          storeCode
        }
      })
    }

    if (!existingItem || existingItem.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      )
    }

    // Delete menu item
    await locationPrisma.menuItem.delete({
      where: { menuItemId: existingItem.menuItemId }
    })

    return NextResponse.json({
      success: true,
      message: 'Menu item deleted successfully',
      data: {
        menuItemCode: existingItem.menuItemCode,
        menuItemId: existingItem.menuItemId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

