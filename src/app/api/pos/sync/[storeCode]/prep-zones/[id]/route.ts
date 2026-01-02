import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/prep-zones/:id Get prep zone
 * @apiName GetPrepZone
 * @apiGroup PrepZones
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Prep zone identifier (BigInt `prepZoneId` or `prepZoneCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Prep zone record
 * @apiSuccess {String}  data.prepZoneId Prep zone ID (string)
 * @apiSuccess {String}  data.prepZoneCode Prep zone code
 * @apiSuccess {String}  data.prepZoneName Prep zone name
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Prep zone not found
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

    // Try to find by ID first, then by prepZoneCode
    let prepZone = null
    const zoneId = BigInt(id)
    
    try {
      prepZone = await locationPrisma.prepZone.findFirst({
        where: {
          prepZoneId: zoneId,
          storeCode
        }
      })
    } catch {
      // If BigInt conversion fails, try by code
    }

    if (!prepZone) {
      prepZone = await locationPrisma.prepZone.findUnique({
        where: { prepZoneCode: id }
      })
    }

    if (!prepZone || prepZone.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Prep zone not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...prepZone,
        prepZoneId: prepZone.prepZoneId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching prep zone:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/prep-zones/:id Update prep zone
 * @apiName UpdatePrepZone
 * @apiGroup PrepZones
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Prep zone identifier (BigInt `prepZoneId` or `prepZoneCode`)
 *
 * @apiBody {String} [prepZoneName] Prep zone name
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Boolean} [sendToExpediter] Send tickets to expediter
 * @apiBody {Boolean} [alwaysPrintTicket] Always print ticket
 * @apiBody {String} [printerCode] Primary printer code
 * @apiBody {String} [backupPrinterCode] Backup printer code
 * @apiBody {Number} [updatedBy] User ID (integer) who updated the prep zone
 *
 * @apiParamExample {json} Request Body
 * {
 *   "prepZoneName": "Grill",
 *   "printerCode": "PRN01",
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated prep zone
 * @apiSuccess {String}  data.prepZoneId Prep zone ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Prep zone not found
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

    // Find existing prep zone
    let existingZone = null
    const zoneId = BigInt(id)
    
    try {
      existingZone = await locationPrisma.prepZone.findFirst({
        where: {
          prepZoneId: zoneId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingZone) {
      existingZone = await locationPrisma.prepZone.findUnique({
        where: { prepZoneCode: id }
      })
    }

    if (!existingZone || existingZone.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Prep zone not found' },
        { status: 404 }
      )
    }

    // Prepare update data with POS sync metadata
    const updateData: any = addPOSSyncMetadata({
      updatedBy: body.updatedBy ? parseInt(body.updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingZone.syncId

    // Update allowed fields
    if (body.prepZoneName !== undefined) updateData.prepZoneName = body.prepZoneName
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0
    if (body.sendToExpediter !== undefined) updateData.sendToExpediter = body.sendToExpediter ? 1 : 0
    if (body.alwaysPrintTicket !== undefined) updateData.alwaysPrintTicket = body.alwaysPrintTicket ? 1 : 0
    if (body.printerCode !== undefined) updateData.printerCode = body.printerCode
    if (body.backupPrinterCode !== undefined) updateData.backupPrinterCode = body.backupPrinterCode

    // Update prep zone
    const updatedZone = await locationPrisma.prepZone.update({
      where: { prepZoneId: existingZone.prepZoneId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Prep zone updated successfully',
      data: {
        ...updatedZone,
        prepZoneId: updatedZone.prepZoneId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating prep zone:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/prep-zones/:id Delete prep zone
 * @apiName DeletePrepZone
 * @apiGroup PrepZones
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Prep zone identifier (BigInt `prepZoneId` or `prepZoneCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.prepZoneCode Prep zone code
 * @apiSuccess {String}  data.prepZoneId Prep zone ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Prep zone not found
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

    // Find existing prep zone
    let existingZone = null
    const zoneId = BigInt(id)
    
    try {
      existingZone = await locationPrisma.prepZone.findFirst({
        where: {
          prepZoneId: zoneId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingZone) {
      existingZone = await locationPrisma.prepZone.findUnique({
        where: { prepZoneCode: id }
      })
    }

    if (!existingZone || existingZone.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Prep zone not found' },
        { status: 404 }
      )
    }

    // Delete prep zone
    await locationPrisma.prepZone.delete({
      where: { prepZoneId: existingZone.prepZoneId }
    })

    return NextResponse.json({
      success: true,
      message: 'Prep zone deleted successfully',
      data: {
        prepZoneCode: existingZone.prepZoneCode,
        prepZoneId: existingZone.prepZoneId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting prep zone:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

