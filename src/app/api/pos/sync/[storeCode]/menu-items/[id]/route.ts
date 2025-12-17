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
 * @apiBody {String} [menuMasterCode] Menu master code
 * @apiBody {String[]} [menuCategoryCode] Menu category codes (array)
 * @apiBody {String[]} [prepZoneCode] Prep zone codes (array)
 * @apiBody {Number} [isPrice] Price flag (1/0)
 * @apiBody {Number} [cashPrice] Cash price
 * @apiBody {Number} [cardPrice] Card price
 * @apiBody {Boolean} [inheritModifierGroup] Inherit modifiers from menu categories
 * @apiBody {String[]} [modifierGroupCodes] Direct modifier group codes to assign (replaces existing)
 * @apiBody {String} [taxCode] Tax code to apply
 * @apiBody {Boolean} [inheritTaxInclusion] Inherit tax inclusion from category
 * @apiBody {Boolean} [isTaxIncluded] Whether tax is included in price
 * @apiBody {Boolean} [inheritDiningTax] Inherit dining tax from category
 * @apiBody {String} [diningTaxEffect] Dining tax effect (e.g., "No Effect", "Add", "Subtract")
 * @apiBody {Boolean} [disqualifyDiningTaxExemption] Disqualify dining tax exemption
 * @apiBody {Number|Boolean} [isActive] Active flag (1/0 or true/false)
 * @apiBody {Number} [updatedBy] User ID (integer) who updated the item
 * @apiBody {Object} [*] Any other menu item fields from schema
 *
 * @apiParamExample {json} Request Body
 * {
 *   "name": "Classic Burger (Large)",
 *   "menuMasterCode": "MM001",
 *   "menuCategoryCode": ["MC001", "MC002"],
 *   "prepZoneCode": ["PZ001"],
 *   "isPrice": 1,
 *   "cashPrice": 13.49,
 *   "cardPrice": 14.49,
 *   "inheritModifierGroup": true,
 *   "modifierGroupCodes": ["MG001"],
 *   "taxCode": "TAX001",
 *   "inheritTaxInclusion": true,
 *   "isTaxIncluded": false,
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
    let itemId: bigint | null = null
    
    try {
      itemId = BigInt(id)
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

    const {
      name,
      menuMasterCode,
      menuCategoryCode,
      prepZoneCode,
      isPrice,
      cashPrice,
      cardPrice,
      isActive,
      inheritModifierGroup,
      modifierGroupCodes,
      // Tax Configuration
      taxCode,
      inheritTaxInclusion,
      isTaxIncluded,
      inheritDiningTax,
      diningTaxEffect,
      disqualifyDiningTaxExemption,
      updatedBy,
      ...otherFields
    } = body

    // Prepare update data with POS sync metadata
    const updateData: any = addPOSSyncMetadata({
      updatedBy: updatedBy ? parseInt(updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingItem.syncId

    // Update basic fields
    if (name !== undefined) updateData.name = name
    if (menuMasterCode !== undefined) updateData.menuMasterCode = menuMasterCode || null
    if (menuCategoryCode !== undefined) {
      updateData.menuCategoryCode = menuCategoryCode 
        ? (Array.isArray(menuCategoryCode) ? menuCategoryCode : [menuCategoryCode]) 
        : null
    }
    if (prepZoneCode !== undefined) {
      updateData.prepZoneCode = prepZoneCode 
        ? (Array.isArray(prepZoneCode) ? prepZoneCode : [prepZoneCode]) 
        : null
    }
    if (isPrice !== undefined) updateData.isPrice = isPrice ? 1 : 0
    if (cashPrice !== undefined) updateData.cashPrice = cashPrice ? parseFloat(cashPrice) : null
    if (cardPrice !== undefined) updateData.cardPrice = cardPrice ? parseFloat(cardPrice) : null
    if (isActive !== undefined) updateData.isActive = isActive ? 1 : 0
    if (inheritModifierGroup !== undefined) {
      updateData.inheritModifierGroup = inheritModifierGroup ? true : false
    }

    // Tax Configuration
    if (taxCode !== undefined) updateData.taxCode = taxCode || null
    if (inheritTaxInclusion !== undefined) {
      updateData.inheritTaxInclusion = inheritTaxInclusion ? true : false
    }
    if (isTaxIncluded !== undefined) {
      updateData.isTaxIncluded = isTaxIncluded ? true : false
    }
    if (inheritDiningTax !== undefined) {
      updateData.inheritDiningTax = inheritDiningTax ? true : false
    }
    if (diningTaxEffect !== undefined) updateData.diningTaxEffect = diningTaxEffect || "No Effect"
    if (disqualifyDiningTaxExemption !== undefined) {
      updateData.disqualifyDiningTaxExemption = disqualifyDiningTaxExemption ? true : false
    }

    // Add all other fields from schema if provided
    const allowedFields = [
      'kitchenName', 'labelName', 'colorCode', 'calories', 'description', 'itemSize',
      'skuPlu', 'barcode', 'isAlcohol', 'menuImg', 'priceStrategy', 'stockinhand',
      'isOutStock', 'itemContainAlcohol', 'isPosVisible', 'isKioskOrderPay',
      'isOnlineOrderByApp', 'isOnlineOrdering', 'isCustomerInvoice'
    ]

    for (const field of allowedFields) {
      if (otherFields[field] !== undefined) {
        if (typeof otherFields[field] === 'boolean') {
          updateData[field] = otherFields[field]
        } else if (field === 'skuPlu' && otherFields[field]) {
          updateData[field] = BigInt(otherFields[field])
        } else if ((field === 'cashPrice' || field === 'cardPrice' || field === 'stockinhand') && otherFields[field]) {
          updateData[field] = parseFloat(otherFields[field])
        } else {
          updateData[field] = otherFields[field]
        }
      }
    }

    // Update menu item
    const updatedItem = await locationPrisma.menuItem.update({
      where: { menuItemId: existingItem.menuItemId },
      data: updateData
    })

    // Handle modifier groups if provided
    if (modifierGroupCodes !== undefined || inheritModifierGroup !== undefined) {
      const menuItemCode = existingItem.menuItemCode

      if (menuItemCode) {
        // Delete existing modifier group assignments
        await locationPrisma.menuItemModifierGroup.deleteMany({
          where: {
            menuItemCode,
            storeCode
          }
        })

        // Rebuild modifier groups
        const modifierGroupsToAssign: string[] = []
        const finalInheritModifierGroup = inheritModifierGroup !== undefined 
          ? inheritModifierGroup 
          : (existingItem.inheritModifierGroup || true)

        // 1. If inheritModifierGroup is true, fetch modifiers from menu categories
        if (finalInheritModifierGroup) {
          const categoryCodes = updateData.menuCategoryCode 
            ? (Array.isArray(updateData.menuCategoryCode) ? updateData.menuCategoryCode : [updateData.menuCategoryCode])
            : (existingItem.menuCategoryCode 
              ? (Array.isArray(existingItem.menuCategoryCode as any) 
                ? (existingItem.menuCategoryCode as any) 
                : [existingItem.menuCategoryCode])
              : [])

          if (categoryCodes.length > 0) {
            const categoryModifiers = await locationPrisma.menuCategoryModifier.findMany({
              where: {
                menuCategoryCode: { in: categoryCodes },
                storeCode
              },
              select: {
                modifierGroupCode: true
              }
            })

            // Get unique modifier group codes
            const inheritedCodes = [...new Set(categoryModifiers.map(m => m.modifierGroupCode).filter(Boolean))]
            modifierGroupsToAssign.push(...inheritedCodes)
          }
        }

        // 2. Add directly provided modifier group codes
        if (modifierGroupCodes && Array.isArray(modifierGroupCodes)) {
          modifierGroupsToAssign.push(...modifierGroupCodes)
        }

        // Remove duplicates
        const uniqueModifierGroups = [...new Set(modifierGroupsToAssign)]

        // Insert modifier group assignments
        if (uniqueModifierGroups.length > 0) {
          const createdBy = updatedBy ? parseInt(updatedBy) : null

          await locationPrisma.menuItemModifierGroup.createMany({
            data: uniqueModifierGroups.map(modifierGroupCode => {
              const modifierData = addPOSSyncMetadata(
                {
                  menuItemCode,
                  modifierGroupCode,
                  inheritFromMenuGroup: finalInheritModifierGroup ? 1 : 0,
                  isInheritFromMenuCategory: finalInheritModifierGroup ? 1 : 0,
                  isRequired: 0,
                  isMultiselect: 0,
                  createdBy,
                  createdOn: new Date()
                },
                storeCode
              )
              // MenuItemModifierGroup doesn't have updatedOn/updatedBy
              const { updatedOn, updatedBy: _, ...dataWithoutUpdated } = modifierData
              return dataWithoutUpdated
            }),
            skipDuplicates: true
          })
        }
      }
    }

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

