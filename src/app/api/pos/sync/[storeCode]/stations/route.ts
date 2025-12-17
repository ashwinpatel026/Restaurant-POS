import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/stations List stations
 * @apiName GetStations
 * @apiGroup Stations
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
 * @apiSuccess {Object[]} data Stations
 * @apiSuccess {String}  data.tblStationId Station ID (string)
 * @apiSuccess {String}  data.stationCode Station code
 * @apiSuccess {String}  data.stationname Station name
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

    // Get stations
    // Note: Using tblStationId for ordering until Prisma client is regenerated with new fields
    // The where clause uses updatedOn for incremental sync filtering (will work after Prisma regeneration)
    const stations = await locationPrisma.station.findMany({
      where,
      orderBy: { tblStationId: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: stations.length,
      data: stations.map(station => ({
        ...station,
        tblStationId: station.tblStationId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching stations:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/stations Create station
 * @apiName CreateStation
 * @apiGroup Stations
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiBody {String} stationCode Unique station code
 * @apiBody {String} stationname Station name
 * @apiBody {Boolean} [isActive=1] Active flag
 * @apiBody {String} [stationGroups] Station group info
 * @apiBody {Boolean} [isKitchen] Kitchen station flag
 * @apiBody {Boolean} [isBar] Bar station flag
 * @apiBody {Boolean} [isBill] Billing station flag
 * @apiBody {Boolean} [isReport] Reporting station flag
 * @apiBody {String} [ipAddress] Station IP address
 * @apiBody {Number} [createdBy] User ID (integer) who created the station
 *
 * @apiParamExample {json} Request Body
 * {
 *   "stationCode": "KIT01",
 *   "stationname": "Kitchen",
 *   "isKitchen": true,
 *   "isActive": 1
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created station
 * @apiSuccess (201) {String}  data.tblStationId Station ID (string)
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Station code already exists
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

    const { stationCode, stationname, isActive = 1, createdBy } = body

    // Validate required fields
    if (!stationCode || !stationname) {
      return NextResponse.json(
        { error: 'stationCode and stationname are required' },
        { status: 400 }
      )
    }

    // Check if station code already exists
    const existing = await locationPrisma.station.findUnique({
      where: { stationCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Station with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const stationData = addPOSSyncMetadata({
      stationCode,
      stationname,
      isActive: isActive ? 1 : 0,
      stationGroups: body.stationGroups || null,
      isKitchen: body.isKitchen || false,
      isBar: body.isBar || false,
      isBill: body.isBill || false,
      isReport: body.isReport || false,
      ipAddress: body.ipAddress || null,
      createdBy: createdBy ? parseInt(createdBy) : null,
      createdOn: new Date()
    }, storeCode)

    // Create station
    const station = await locationPrisma.station.create({
      data: stationData
    })

    return NextResponse.json({
      success: true,
      message: 'Station created successfully',
      data: {
        ...station,
        tblStationId: station.tblStationId.toString()
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating station:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

