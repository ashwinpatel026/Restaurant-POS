import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/menu-items List menu items
 * @apiName GetMenuItems
 * @apiGroup MenuItems
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 * @apiQuery {Number}  [limit] Maximum records to return
 * @apiQuery {Number}  [offset=0] Records to skip (for pagination)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Number}  total Total matching records
 * @apiSuccess {Object}  pagination Pagination info
 * @apiSuccess {Number}  pagination.limit Requested limit (or null)
 * @apiSuccess {Number}  pagination.offset Requested offset
 * @apiSuccess {Number}  pagination.total Total matching records
 * @apiSuccess {Object[]} data Array of menu items
 * @apiSuccess {String}  data.menuItemId Menu item ID (string)
 * @apiSuccess {String}  data.menuItemCode Menu item code
 * @apiSuccess {String}  data.name Menu item name
 * @apiSuccess {Number}  [data.cashPrice] Cash price
 * @apiSuccess {Number}  [data.cardPrice] Card price
 * @apiSuccess {Number}  [data.isActive] Active flag
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "storeCode": "LOC001",
 *   "count": 1,
 *   "total": 1,
 *   "pagination": { "limit": 50, "offset": 0, "total": 1 },
 *   "data": [
 *     {
 *       "menuItemId": "101",
 *       "menuItemCode": "MI001",
 *       "name": "Classic Burger",
 *       "cashPrice": 12.99,
 *       "cardPrice": 13.99,
 *       "isActive": 1
 *     }
 *   ]
 * }
 *
 * @apiError (400) BadRequest Invalid query parameters
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

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const lastSyncAt = url.searchParams.get('lastSyncAt')
    const incremental = url.searchParams.get('incremental') === 'true'
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')

    // Build where clause
    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    // Build query options
    const queryOptions: any = {
      where,
      orderBy: { updatedOn: 'desc' }
    }

    if (limit) {
      queryOptions.take = parseInt(limit, 10)
    }

    if (offset) {
      queryOptions.skip = parseInt(offset, 10)
    }

    // Get menu items
    const [menuItems, totalCount] = await Promise.all([
      locationPrisma.menuItem.findMany(queryOptions),
      locationPrisma.menuItem.count({ where })
    ])

    return NextResponse.json({
      success: true,
      storeCode,
      count: menuItems.length,
      total: totalCount,
      pagination: {
        limit: limit ? parseInt(limit, 10) : null,
        offset: offset ? parseInt(offset, 10) : 0,
        total: totalCount
      },
      data: menuItems.map(item => ({
        ...item,
        menuItemId: item.menuItemId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/menu-items Create menu item
 * @apiName CreateMenuItem
 * @apiGroup MenuItems
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code
 *
 * @apiBody {String} menuItemCode Unique menu item code
 * @apiBody {String} name Menu item name
 * @apiBody {String} [menuMasterCode] Menu master code
 * @apiBody {String[]} [menuCategoryCode] Menu category codes (array)
 * @apiBody {String[]} [prepZoneCode] Prep zone codes (array)
 * @apiBody {Number} [isPrice=1] Price flag (1/0)
 * @apiBody {Number} [cashPrice] Cash price
 * @apiBody {Number} [cardPrice] Card price
 * @apiBody {Boolean} [inheritModifierGroup=true] Inherit modifiers from menu categories
 * @apiBody {String[]} [modifierGroupCodes] Direct modifier group codes to assign
 * @apiBody {Number|Boolean} [isActive=1] Active flag (1/0 or true/false)
 * @apiBody {String} [taxCode] Tax code to apply
 * @apiBody {Boolean} [inheritTaxInclusion=true] Inherit tax inclusion from category
 * @apiBody {Boolean} [isTaxIncluded=false] Whether tax is included in price
 * @apiBody {Boolean} [inheritDiningTax=true] Inherit dining tax from category
 * @apiBody {String} [diningTaxEffect="No Effect"] Dining tax effect (e.g., "No Effect", "Add", "Subtract")
 * @apiBody {Boolean} [disqualifyDiningTaxExemption=false] Disqualify dining tax exemption
 *
 * @apiParamExample {json} Request Body
 * {
 *   "menuItemCode": "MI001",
 *   "name": "Classic Burger",
 *   "menuMasterCode": "MM001",
 *   "menuCategoryCode": ["MC001", "MC002"],
 *   "prepZoneCode": ["PZ001", "PZ002"],
 *   "isPrice": 1,
 *   "cashPrice": 12.99,
 *   "cardPrice": 13.99,
 *   "inheritModifierGroup": true,
 *   "modifierGroupCodes": ["MG001"],
 *   "taxCode": "TAX001",
 *   "inheritTaxInclusion": true,
 *   "isTaxIncluded": false,
 *   "inheritDiningTax": true,
 *   "diningTaxEffect": "No Effect",
 *   "disqualifyDiningTaxExemption": false,
 *   "isActive": 1
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created menu item
 * @apiSuccess (201) {String}  data.menuItemId Menu item ID (string)
 * @apiSuccess (201) {String}  data.menuItemCode Menu item code
 * @apiSuccess (201) {String}  data.name Menu item name
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Menu item code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

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

    const { 
      menuItemCode, 
      name, 
      menuMasterCode,
      menuCategoryCode,
      prepZoneCode,
      isPrice,
      cashPrice, 
      cardPrice,
      basePrice,
      isActive = 1,
      inheritModifierGroup = true,
      modifierGroupCodes,
      // Tax Configuration
      taxCode,
      inheritTaxInclusion = true,
      isTaxIncluded = false,
      inheritDiningTax = true,
      diningTaxEffect = "No Effect",
      disqualifyDiningTaxExemption = false,
      ...otherFields
    } = body

    // Validate required fields
    if (!menuItemCode || !name) {
      return NextResponse.json(
        { error: 'menuItemCode and name are required' },
        { status: 400 }
      )
    }

    // Check if menu item code already exists
    const existing = await locationPrisma.menuItem.findFirst({
      where: {
        menuItemCode,
        storeCode
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Menu item with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare menu item data - handle JSON fields properly
    const menuItemData: any = {
      menuItemCode,
      name,
      menuMasterCode: menuMasterCode || null,
      menuCategoryCode: menuCategoryCode ? (Array.isArray(menuCategoryCode) ? menuCategoryCode : [menuCategoryCode]) : null,
      prepZoneCode: prepZoneCode ? (Array.isArray(prepZoneCode) ? prepZoneCode : [prepZoneCode]) : null,
      isPrice: isPrice !== undefined ? (isPrice ? 1 : 0) : 1,
      basePrice: basePrice !== undefined ? parseFloat(basePrice) : null,
      cashPrice: cashPrice !== undefined ? parseFloat(cashPrice) : null,
      cardPrice: cardPrice !== undefined ? parseFloat(cardPrice) : null,
      isActive: isActive ? 1 : 0,
      inheritModifierGroup: inheritModifierGroup !== undefined ? (inheritModifierGroup ? true : false) : true,
      // Tax Configuration
      taxCode: taxCode || null,
      inheritTaxInclusion: inheritTaxInclusion !== undefined ? (inheritTaxInclusion ? true : false) : true,
      isTaxIncluded: isTaxIncluded !== undefined ? (isTaxIncluded ? true : false) : false,
      inheritDiningTax: inheritDiningTax !== undefined ? (inheritDiningTax ? true : false) : true,
      diningTaxEffect: diningTaxEffect || "No Effect",
      disqualifyDiningTaxExemption: disqualifyDiningTaxExemption !== undefined ? (disqualifyDiningTaxExemption ? true : false) : false,
      createdOn: new Date(),
      createdBy: otherFields.createdBy ? parseInt(otherFields.createdBy) : null,
    }

    // Add all other fields from schema if provided
    const allowedFields = [
      'kitchenName', 'labelName', 'colorCode', 'forColorCode', 'deptCode', 'calories', 'description', 'itemSize',
      'skuPlu', 'barcode', 'isAlcohol', 'menuImg', 'priceStrategy', 'stockinhand',
      'isOutStock', 'itemContainAlcohol', 'isPosVisible', 'isKioskOrderPay',
      'isOnlineOrderByApp', 'isOnlineOrdering', 'isCustomerInvoice'
    ]

    for (const field of allowedFields) {
      if (otherFields[field] !== undefined) {
        if (typeof otherFields[field] === 'boolean') {
          menuItemData[field] = otherFields[field]
        } else if (field === 'skuPlu' && otherFields[field]) {
          menuItemData[field] = BigInt(otherFields[field])
        } else if ((field === 'basePrice' || field === 'cashPrice' || field === 'cardPrice' || field === 'stockinhand') && otherFields[field]) {
          menuItemData[field] = parseFloat(otherFields[field])
        } else {
          menuItemData[field] = otherFields[field]
        }
      }
    }

    // Add POS sync metadata
    const finalMenuItemData = addPOSSyncMetadata(menuItemData, storeCode)

    // Create menu item
    const menuItem = await locationPrisma.menuItem.create({
      data: finalMenuItemData
    })

    // Handle modifier groups
    const modifierGroupsToAssign: string[] = []

    // 1. If inheritModifierGroup is true, fetch modifiers from menu categories
    if (inheritModifierGroup && menuCategoryCode) {
      const categoryCodes = Array.isArray(menuCategoryCode) ? menuCategoryCode : [menuCategoryCode]
      
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

    // 2. Add directly provided modifier group codes
    if (modifierGroupCodes && Array.isArray(modifierGroupCodes)) {
      modifierGroupsToAssign.push(...modifierGroupCodes)
    }

    // Remove duplicates
    const uniqueModifierGroups = [...new Set(modifierGroupsToAssign)]

    // Insert modifier group assignments
    if (uniqueModifierGroups.length > 0) {
      const createdBy = otherFields.createdBy ? parseInt(otherFields.createdBy) : null

      await locationPrisma.menuItemModifierGroup.createMany({
        data: uniqueModifierGroups.map(modifierGroupCode => {
          const modifierData = addPOSSyncMetadata(
            {
              menuItemCode,
              modifierGroupCode,
              inheritFromMenuGroup: inheritModifierGroup ? 1 : 0,
              isInheritFromMenuCategory: inheritModifierGroup ? 1 : 0,
              isRequired: 0,
              isMultiselect: 0,
              createdBy,
              createdOn: new Date()
            },
            storeCode
          )
          // MenuItemModifierGroup doesn't have updatedOn/updatedBy
          const { updatedOn, updatedBy, ...dataWithoutUpdated } = modifierData
          return dataWithoutUpdated
        }),
        skipDuplicates: true
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Menu item created successfully',
      data: {
        ...menuItem,
        menuItemId: menuItem.menuItemId.toString()
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

