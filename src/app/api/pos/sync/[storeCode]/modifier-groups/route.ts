import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/modifier-groups List modifier groups
 * @apiName GetModifiers
 * @apiGroup Modifiers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Object[]} data Modifiers records
 * @apiSuccess {String}  data.id Modifiers ID (string)
 * @apiSuccess {String}  data.modifierGroupCode Modifiers code
 * @apiSuccess {String}  data.groupName Display name
 * @apiSuccess {Number}  data.isActive Active flag
 * @apiSuccess {Object[]} data.items Modifier items records
 * @apiSuccess {String}  data.items.id Modifier item ID (string)
 * @apiSuccess {String}  data.items.modifierItemCode Modifier item code
 * @apiSuccess {String}  data.items.name Modifier item name
 * @apiSuccess {Number}  data.items.isActive Active flag
 * @apiSuccess {Number}  data.items.displayOrder Display order
 * @apiSuccess {Number}  data.items.price Price
 * @apiSuccess {Number}  data.items.isDefault Default selection flag
 * @apiSuccess {Number}  data.items.createdOn Created on
 * @apiSuccess {Number}  data.items.updatedOn Updated on
 * @apiSuccess {Number}  data.items.createdBy Created by
 * @apiSuccess {Number}  data.items.updatedBy Updated by
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

    // Build where clause
    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    // Get modifier groups with their items
    const [modifierGroups, modifierItems] = await Promise.all([
      locationPrisma.modifierGroup.findMany({
      where,
      orderBy: { createdOn: 'desc' }
      }),
      locationPrisma.modifierItem.findMany({
        where: { storeCode },
        orderBy: { displayOrder: 'asc' }
      })
    ])

    const itemsByGroupCode = modifierItems.reduce<Record<string, any[]>>(
      (acc, item) => {
        const code = item.modifierGroupCode || ''
        if (!code) return acc
        if (!acc[code]) acc[code] = []
        acc[code].push({
          ...item,
          id: item.id.toString()
        })
        return acc
      },
      {}
    )

    return NextResponse.json({
      success: true,
      storeCode,
      count: modifierGroups.length,
      data: modifierGroups.map(group => ({
        ...group,
        id: group.id.toString(),
        items: itemsByGroupCode[group.modifierGroupCode || ''] || []
      }))
    })
  } catch (error: any) {
    console.error('Error fetching modifier groups:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/modifier-groups Create modifier group
 * @apiName CreateModifiers
 * @apiGroup Modifiers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiBody {String} modifierGroupCode Unique modifier group code
 * @apiBody {String} groupName Group display name
 * @apiBody {String} [labelName] Label name
 * @apiBody {Boolean} [isRequired] Whether selection is required
 * @apiBody {Boolean} [isMultiselect] Allow multiple selections
 * @apiBody {Number} [minSelection] Minimum selections
 * @apiBody {Number} [maxSelection] Maximum selections
 * @apiBody {Number} [priceStrategy=1] Pricing strategy
 * @apiBody {Number} [price] Additional price
 * @apiBody {String} [prefix] Display prefix
 * @apiBody {Number|Boolean} [isActive=1] Active flag (1/0 or true/false)
 * @apiBody {Number} [createdBy] User ID (integer) who created the group
 * @apiBody {Object[]} [items] Optional list of modifier items to create
 * @apiBody {String} items.modifierItemCode Modifier item code
 * @apiBody {String} items.name Modifier item name
 * @apiBody {String} [items.labelName] Label name
 * @apiBody {String} [items.colorCode] Color code
 * @apiBody {Number} [items.price] Item price
 * @apiBody {Number|Boolean} [items.isDefault] Default selection flag
 * @apiBody {Number} [items.displayOrder] Display order
 *
 * @apiParamExample {json} Request Body
 * {
 *   "modifierGroupCode": "MG001",
 *   "groupName": "Add-ons",
 *   "isRequired": false,
 *   "isMultiselect": true,
 *   "maxSelection": 3
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created modifier group
 * @apiSuccess (201) {String}  data.id Modifier group ID (string)
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Modifier group code already exists
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

    const { modifierGroupCode, groupName, isActive = 1 } = body

    // Validate required fields
    if (!modifierGroupCode || !groupName) {
      return NextResponse.json(
        { error: 'modifiersCode and Name are required' },
        { status: 400 }
      )
    }

    // Check if modifier group code already exists
    const existing = await locationPrisma.modifierGroup.findFirst({
      where: {
        modifierGroupCode,
        storeCode
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Modifiers with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const modifierGroupData = addPOSSyncMetadata(
      {
      modifierGroupCode,
      groupName,
      labelName: body.labelName || null,
      isRequired: body.isRequired ? 1 : 0,
      isMultiselect: body.isMultiselect ? 1 : 0,
      minSelection: body.minSelection || null,
      maxSelection: body.maxSelection || null,
      priceStrategy: body.priceStrategy || 1,
      price: body.price ? parseFloat(body.price) : null,
      prefix: body.prefix || null,
      isActive: isActive ? 1 : 0,
      createdOn: new Date()
      },
      storeCode
    )
    delete (modifierGroupData as any).updatedOn
    delete (modifierGroupData as any).updatedBy

    // Create modifier group
    const modifierGroup = await locationPrisma.modifierGroup.create({
      data: modifierGroupData
    })

    // Optionally create modifier items
    const items: any[] = Array.isArray(body.items) ? body.items : []
    let createdItems: any[] = []
    if (items.length > 0) {
      const createdBy = body.createdBy ? parseInt(body.createdBy) : null

      await locationPrisma.modifierItem.createMany({
        data: items.map(item => {
          const itemData = addPOSSyncMetadata(
            {
              modifierItemCode: item.modifierItemCode || null,
              modifierGroupCode,
              name: item.name || null,
              labelName: item.labelName || null,
              colorCode: item.colorCode || null,
              forColorCode: item.forColorCode || null,
              price:
                item.price !== undefined && item.price !== null
                  ? parseFloat(item.price)
                  : null,
              isDefault: item.isDefault ? 1 : 0,
              displayOrder:
                item.displayOrder !== undefined ? parseInt(item.displayOrder) : null,
              groupCode: item.groupCode || null,
              isActive: item.isActive ? 1 : 0,
              createdBy,
              createdOn: new Date()
            },
            storeCode
          )
          delete (itemData as any).updatedOn
          delete (itemData as any).updatedBy
          return itemData
        }),
        skipDuplicates: true
      })

      createdItems = await locationPrisma.modifierItem.findMany({
        where: { modifierGroupCode, storeCode },
        orderBy: { displayOrder: 'asc' }
      })
    }

    return NextResponse.json(
      {
      success: true,
      message: 'Modifiers and items created successfully',
      data: {
        ...modifierGroup,
        id: modifierGroup.id.toString(),
        items: createdItems.map(item => ({
          ...item,
          id: item.id.toString()
        }))
      }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating modifiers :', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

