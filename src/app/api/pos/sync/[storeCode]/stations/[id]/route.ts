import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/stations/:id Get station
 * @apiName GetStation
 * @apiGroup Stations
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Station identifier (BigInt `tblStationId` or `stationCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Station record
 * @apiSuccess {String}  data.tblStationId Station ID (string)
 * @apiSuccess {String}  data.stationCode Station code
 * @apiSuccess {String}  data.stationname Station name
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Station not found
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

    // Try to find by ID first, then by stationCode
    let station = null
    const stationId = BigInt(id)
    
    try {
      station = await locationPrisma.station.findFirst({
        where: {
          tblStationId: stationId,
          storeCode
        }
      })
    } catch {
      // If BigInt conversion fails, try by code
    }

    if (!station) {
      station = await locationPrisma.station.findUnique({
        where: { stationCode: id }
      })
    }

    if (!station || station.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...station,
        tblStationId: station.tblStationId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching station:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/stations/:id Update station
 * @apiName UpdateStation
 * @apiGroup Stations
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Station identifier (BigInt `tblStationId` or `stationCode`)
 *
 * @apiBody {String} [stationname] Station name
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {String} [stationGroups] Station group info
 * @apiBody {Boolean} [isKitchen] Kitchen station flag
 * @apiBody {Boolean} [isBar] Bar station flag
 * @apiBody {Boolean} [isBill] Billing station flag
 * @apiBody {Boolean} [isReport] Reporting station flag
 * @apiBody {String} [ipAddress] Station IP address
 * @apiBody {Number} [updatedBy] User ID (BigInt) who updated the station
 *
 * @apiParamExample {json} Request Body
 * {
 *   "stationname": "Kitchen - Hot",
 *   "isKitchen": true,
 *   "isActive": 1
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated station
 * @apiSuccess {String}  data.tblStationId Station ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Station not found
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

    // Find existing station
    let existingStation = null
    const stationId = BigInt(id)
    
    try {
      existingStation = await locationPrisma.station.findFirst({
        where: {
          tblStationId: stationId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingStation) {
      existingStation = await locationPrisma.station.findUnique({
        where: { stationCode: id }
      })
    }

    if (!existingStation || existingStation.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      )
    }

    // Prepare update data with POS sync metadata
    const updateData: any = addPOSSyncMetadata({
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    // Override the syncId that might have been generated by addPOSSyncMetadata
    updateData.syncId = existingStation.syncId

    // Update allowed fields
    if (body.stationname !== undefined) updateData.stationname = body.stationname
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0
    if (body.stationGroups !== undefined) updateData.stationGroups = body.stationGroups
    if (body.isKitchen !== undefined) updateData.isKitchen = body.isKitchen
    if (body.isBar !== undefined) updateData.isBar = body.isBar
    if (body.isBill !== undefined) updateData.isBill = body.isBill
    if (body.isReport !== undefined) updateData.isReport = body.isReport
    if (body.ipAddress !== undefined) updateData.ipAddress = body.ipAddress

    // Update station
    const updatedStation = await locationPrisma.station.update({
      where: { tblStationId: existingStation.tblStationId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Station updated successfully',
      data: {
        ...updatedStation,
        tblStationId: updatedStation.tblStationId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating station:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/stations/:id Delete station
 * @apiName DeleteStation
 * @apiGroup Stations
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Station identifier (BigInt `tblStationId` or `stationCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.stationCode Station code
 * @apiSuccess {String}  data.tblStationId Station ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Station not found
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

    // Find existing station
    let existingStation = null
    const stationId = BigInt(id)
    
    try {
      existingStation = await locationPrisma.station.findFirst({
        where: {
          tblStationId: stationId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingStation) {
      existingStation = await locationPrisma.station.findUnique({
        where: { stationCode: id }
      })
    }

    if (!existingStation || existingStation.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      )
    }

    // Delete station
    await locationPrisma.station.delete({
      where: { tblStationId: existingStation.tblStationId }
    })

    return NextResponse.json({
      success: true,
      message: 'Station deleted successfully',
      data: {
        stationCode: existingStation.stationCode,
        tblStationId: existingStation.tblStationId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting station:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

