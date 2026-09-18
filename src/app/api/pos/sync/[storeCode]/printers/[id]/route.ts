import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'
import { applyPrinterFieldUpdates, serializePrinter } from '@/lib/printerPayload'

/**
 * @api {get} /api/pos/sync/:storeCode/printers/:id Get printer
 * @apiName GetPrinter
 * @apiGroup Printers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Printer identifier (BigInt `printerId` or `printerCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Printer record
 * @apiSuccess {String}  data.printerId Printer ID (string)
 * @apiSuccess {String}  data.printerCode Printer code
 * @apiSuccess {String}  data.printerName Printer name
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Printer not found
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

    // Try to find by ID first, then by printerCode
    let printer = null
    const printerId = BigInt(id)
    
    try {
      printer = await locationPrisma.printer.findFirst({
        where: {
          printerId: printerId,
          storeCode,
          isDelete: false
        }
      })
    } catch {
      // If BigInt conversion fails, try by code
    }

    if (!printer) {
      printer = await locationPrisma.printer.findFirst({
        where: { printerCode: id, storeCode, isDelete: false }
      })
    }

    if (!printer || printer.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...serializePrinter(printer)
      }
    })
  } catch (error: any) {
    console.error('Error fetching printer:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/printers/:id Update printer
 * @apiName UpdatePrinter
 * @apiGroup Printers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Printer identifier (BigInt `printerId` or `printerCode`)
 *
 * @apiBody {String} [printerName] Printer name
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Number} [updatedBy] User ID (BigInt) who updated the printer
 *
 * @apiParamExample {json} Request Body
 * {
 *   "printerName": "Kitchen Printer",
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated printer
 * @apiSuccess {String}  data.printerId Printer ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Printer not found
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

    // Find existing printer
    let existingPrinter = null
    const printerId = BigInt(id)
    
    try {
      existingPrinter = await locationPrisma.printer.findFirst({
        where: {
          printerId: printerId,
          storeCode,
          isDelete: false
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingPrinter) {
      existingPrinter = await locationPrisma.printer.findFirst({
        where: { printerCode: id, storeCode, isDelete: false }
      })
    }

    if (!existingPrinter || existingPrinter.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      )
    }

    // Prepare update data with POS sync metadata
    const updateData: any = addPOSSyncMetadata({
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingPrinter.syncId

    applyPrinterFieldUpdates(body, updateData)

    const nextIsSerial = updateData.isSerial ?? existingPrinter.isSerial
    const nextComport = updateData.comport !== undefined ? updateData.comport : existingPrinter.comport
    if (nextIsSerial && !nextComport) {
      return NextResponse.json(
        { error: 'COM Port is required when Serial is enabled' },
        { status: 400 }
      )
    }

    // Update printer
    const updatedPrinter = await locationPrisma.printer.update({
      where: { printerId: existingPrinter.printerId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Printer updated successfully',
      data: serializePrinter(updatedPrinter)
    })
  } catch (error: any) {
    console.error('Error updating printer:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/printers/:id Delete printer
 * @apiName DeletePrinter
 * @apiGroup Printers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Printer identifier (BigInt `printerId` or `printerCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.printerCode Printer code
 * @apiSuccess {String}  data.printerId Printer ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Printer not found
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

    // Find existing printer
    let existingPrinter = null
    const printerId = BigInt(id)
    
    try {
      existingPrinter = await locationPrisma.printer.findFirst({
        where: {
          printerId: printerId,
          storeCode,
          isDelete: false
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingPrinter) {
      existingPrinter = await locationPrisma.printer.findFirst({
        where: { printerCode: id, storeCode, isDelete: false }
      })
    }

    if (!existingPrinter || existingPrinter.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      )
    }

    await locationPrisma.printer.update({
      where: { printerId: existingPrinter.printerId },
      data: addPOSSyncMetadata({
        isDelete: true,
        isActive: 0,
      }, storeCode)
    })

    return NextResponse.json({
      success: true,
      message: 'Printer deleted successfully',
      data: {
        printerCode: existingPrinter.printerCode,
        printerId: existingPrinter.printerId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting printer:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

