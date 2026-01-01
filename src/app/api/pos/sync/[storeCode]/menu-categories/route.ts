import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/menu-categories List menu categories
 * @apiName GetMenuCategories
 * @apiGroup MenuCategories
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 * @apiQuery {Number}  [limit] Maximum records to return
 * @apiQuery {Number}  [offset=0] Records to skip (pagination)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Number}  total Total matching records
 * @apiSuccess {Object}  pagination Pagination info
 * @apiSuccess {Object[]} data Menu categories
 * @apiSuccess {String}  data.menuCategoryId Menu category ID (string)
 * @apiSuccess {String}  data.menuCategoryCode Menu category code
 * @apiSuccess {String}  data.menuMasterCode Menu master code
 * @apiSuccess {String}  [data.name] Category name
 * @apiSuccess {String}  [data.colorCode] Color code
 * @apiSuccess {Number}  data.isActive Active flag
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
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')

    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    const queryOptions: any = {
      where,
      orderBy: { createdOn: 'desc' }
    }
    if (limit) queryOptions.take = parseInt(limit, 10)
    if (offset) queryOptions.skip = parseInt(offset, 10)

    const [categories, totalCount] = await Promise.all([
      locationPrisma.menuCategory.findMany(queryOptions),
      locationPrisma.menuCategory.count({ where })
    ])

    return NextResponse.json({
      success: true,
      storeCode,
      count: categories.length,
      total: totalCount,
      pagination: {
        limit: limit ? parseInt(limit, 10) : null,
        offset: offset ? parseInt(offset, 10) : 0,
        total: totalCount
      },
      data: categories.map(cat => ({
        ...cat,
        menuCategoryId: cat.menuCategoryId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching menu categories:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/menu-categories Create menu category
 * @apiName CreateMenuCategory
 * @apiGroup MenuCategories
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiBody {String} menuMasterCode Menu master code
 * @apiBody {String} menuCategoryCode Unique menu category code
 * @apiBody {String} [name] Category name
 * @apiBody {String} [colorCode] Color code
 * @apiBody {Number|Boolean} [isActive=1] Active flag
 * @apiBody {Number} [createdBy] User ID who created
 * @apiBody {String[]} [modifierGroupCodes] Optional list of modifier group codes to assign
 *
 * @apiError (400) BadRequest Missing required fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Menu category code exists
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

    const { menuMasterCode, menuCategoryCode, isActive = 1 } = body
    if (!menuMasterCode || !menuCategoryCode) {
      return NextResponse.json(
        { error: 'menuMasterCode and menuCategoryCode are required' },
        { status: 400 }
      )
    }

    const existing = await locationPrisma.menuCategory.findUnique({
      where: { menuCategoryCode }
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Menu category with this code already exists' },
        { status: 409 }
      )
    }

    const data = addPOSSyncMetadata(
      {
        menuMasterCode,
        menuCategoryCode,
        name: body.name || null,
        colorCode: body.colorCode || null,
        forColorCode: body.forColorCode || null,
        deptCode: body.deptCode || null,
        isActive: isActive ? 1 : 0,
        createdBy: body.createdBy ? parseInt(body.createdBy) : null,
        createdOn: new Date()
      },
      storeCode
    )

    const category = await locationPrisma.menuCategory.create({ data })

    const modifierGroupCodes: string[] = Array.isArray(body.modifierGroupCodes)
      ? body.modifierGroupCodes
      : []

    if (modifierGroupCodes.length > 0) {
      const createdBy = body.createdBy ? parseInt(body.createdBy) : null

      await locationPrisma.menuCategoryModifier.createMany({
        data: modifierGroupCodes.map(code => {
          const modifierData = addPOSSyncMetadata(
            {
              menuCategoryCode,
              modifierGroupCode: code,
              createdBy,
              createdOn: new Date()
            },
            storeCode
          )
          // Remove updatedOn as MenuCategoryModifier doesn't have this field
          const { updatedOn, ...dataWithoutUpdatedOn } = modifierData
          return dataWithoutUpdatedOn
        }),
        skipDuplicates: true
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Menu category created successfully',
        data: {
          ...category,
          menuCategoryId: category.menuCategoryId.toString()
        }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating menu category:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

