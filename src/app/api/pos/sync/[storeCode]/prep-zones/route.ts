import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/prep-zones List prep zones
 * @apiName GetPrepZones
 * @apiGroup PrepZones
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
 * @apiSuccess {Object[]} data Prep zones
 * @apiSuccess {String}  data.prepZoneId Prep zone ID (string)
 * @apiSuccess {String}  data.prepZoneCode Prep zone code
 * @apiSuccess {String}  data.prepZoneName Prep zone name
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

    // Get prep zones
    const prepZones = await locationPrisma.prepZone.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: prepZones.length,
      data: prepZones.map(zone => ({
        ...zone,
        prepZoneId: zone.prepZoneId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching prep zones:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/prep-zones Create prep zone
 * @apiName CreatePrepZone
 * @apiGroup PrepZones
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiBody {String} prepZoneCode Unique prep zone code
 * @apiBody {String} prepZoneName Prep zone name
 * @apiBody {Boolean} [isActive=1] Active flag
 * @apiBody {Boolean} [sendToExpediter] Send tickets to expediter
 * @apiBody {Boolean} [alwaysPrintTicket] Always print ticket
 * @apiBody {String} [printerCode] Primary printer code
 * @apiBody {String} [backupPrinterCode] Backup printer code
 * @apiBody {Number} [createdBy] User ID (integer) who created the prep zone
 *
 * @apiParamExample {json} Request Body
 * {
 *   "prepZoneCode": "PZ001",
 *   "prepZoneName": "Grill",
 *   "printerCode": "PRN01",
 *   "sendToExpediter": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created prep zone
 * @apiSuccess (201) {String}  data.prepZoneId Prep zone ID (string)
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Prep zone code already exists
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

    const { prepZoneCode, prepZoneName, isActive = 1 } = body

    // Validate required fields
    if (!prepZoneCode || !prepZoneName) {
      return NextResponse.json(
        { error: 'prepZoneCode and prepZoneName are required' },
        { status: 400 }
      )
    }

    // Check if prep zone code already exists
    const existing = await locationPrisma.prepZone.findUnique({
      where: { prepZoneCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Prep zone with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const prepZoneData = addPOSSyncMetadata({
      prepZoneCode,
      prepZoneName,
      isActive: isActive ? 1 : 0,
      sendToExpediter: body.sendToExpediter ? 1 : 0,
      alwaysPrintTicket: body.alwaysPrintTicket ? 1 : 0,
      printerCode: body.printerCode || null,
      backupPrinterCode: body.backupPrinterCode || null,
      createdBy: body.createdBy ? parseInt(body.createdBy) : null,
      createdOn: new Date()
    }, storeCode)

    // Create prep zone
    const prepZone = await locationPrisma.prepZone.create({
      data: prepZoneData
    })

    return NextResponse.json({
      success: true,
      message: 'Prep zone created successfully',
      data: {
        ...prepZone,
        prepZoneId: prepZone.prepZoneId.toString()
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating prep zone:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

