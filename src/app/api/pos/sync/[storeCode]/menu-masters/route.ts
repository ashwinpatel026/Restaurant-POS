import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/menu-masters List menu masters
 * @apiName GetMenuMasters
 * @apiGroup MenuMasters
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
 * @apiSuccess {Object[]} data Menu master records
 * @apiSuccess {String}  data.menuMasterId Menu master ID (string)
 * @apiSuccess {String}  data.menuMasterCode Menu master code
 * @apiSuccess {String}  [data.name] Name
 * @apiSuccess {String}  [data.labelName] Label name
 * @apiSuccess {String}  [data.colorCode] Color code
 * @apiSuccess {Object}  [data.prepZoneCode] Prep zone codes JSON
 * @apiSuccess {Object}  [data.stationCode] Station codes JSON
 * @apiSuccess {Number}  [data.isEventMenu] Event menu flag
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
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')

    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    const queryOptions: any = {
      where,
      orderBy: { updatedOn: 'desc' }
    }

    if (limit) queryOptions.take = parseInt(limit, 10)
    if (offset) queryOptions.skip = parseInt(offset, 10)

    const [menuMasters, totalCount] = await Promise.all([
      locationPrisma.menuMaster.findMany(queryOptions),
      locationPrisma.menuMaster.count({ where })
    ])

    return NextResponse.json({
      success: true,
      storeCode,
      count: menuMasters.length,
      total: totalCount,
      pagination: {
        limit: limit ? parseInt(limit, 10) : null,
        offset: offset ? parseInt(offset, 10) : 0,
        total: totalCount
      },
      data: menuMasters.map(master => ({
        ...master,
        menuMasterId: master.menuMasterId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching menu masters:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/menu-masters Create menu master
 * @apiName CreateMenuMaster
 * @apiGroup MenuMasters
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiBody {String} menuMasterCode Unique menu master code
 * @apiBody {String} [name] Name
 * @apiBody {String} [labelName] Label name
 * @apiBody {String} [colorCode] Color code
 * @apiBody {Object} [prepZoneCode] Prep zone codes (JSON)
 * @apiBody {Object} [stationCode] Station codes (JSON)
 * @apiBody {Number|Boolean} [isEventMenu] Event menu flag
 * @apiBody {Number|Boolean} [isActive=1] Active flag
 * @apiBody {Number} [createdBy] User ID who created
 *
 * @apiError (400) BadRequest Missing required fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Menu master code exists
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

    const { menuMasterCode, name, isActive = 1 } = body

    if (!menuMasterCode) {
      return NextResponse.json(
        { error: 'menuMasterCode is required' },
        { status: 400 }
      )
    }

    const existing = await locationPrisma.menuMaster.findUnique({
      where: { menuMasterCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Menu master with this code already exists' },
        { status: 409 }
      )
    }

    const data = addPOSSyncMetadata(
      {
        menuMasterCode,
        name: name || null,
        labelName: body.labelName || null,
        colorCode: body.colorCode || null,
        forColorCode: body.forColorCode || null,
        deptCode: body.deptCode || null,
        prepZoneCode: body.prepZoneCode ?? null,
        stationCode: body.stationCode ?? null,
        isEventMenu: body.isEventMenu ? 1 : 0,
        isActive: isActive ? 1 : 0,
        createdBy: body.createdBy ? parseInt(body.createdBy) : null,
        createdOn: new Date(),
        globalCode: body.globalCode || null
      },
      storeCode
    )

    const menuMaster = await locationPrisma.menuMaster.create({
      data
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Menu master created successfully',
        data: {
          ...menuMaster,
          menuMasterId: menuMaster.menuMasterId.toString()
        }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating menu master:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

