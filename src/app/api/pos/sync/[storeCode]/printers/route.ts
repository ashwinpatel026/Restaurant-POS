import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/printers List printers
 * @apiName GetPrinters
 * @apiGroup Printers
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
 * @apiSuccess {Object[]} data Printers
 * @apiSuccess {String}  data.printerId Printer ID (string)
 * @apiSuccess {String}  data.printerCode Printer code
 * @apiSuccess {String}  data.printerName Printer name
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

    // Get printers
    const printers = await locationPrisma.printer.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: printers.length,
      data: printers.map(printer => ({
        ...printer,
        printerId: printer.printerId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching printers:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/printers Create printer
 * @apiName CreatePrinter
 * @apiGroup Printers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiBody {String} printerCode Unique printer code
 * @apiBody {String} printerName Printer name
 * @apiBody {Boolean} [isActive=1] Active flag
 * @apiBody {Number} [createdBy] User ID (integer) who created the printer
 *
 * @apiParamExample {json} Request Body
 * {
 *   "printerCode": "PRN01",
 *   "printerName": "Kitchen Printer",
 *   "isActive": 1
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created printer
 * @apiSuccess (201) {String}  data.printerId Printer ID (string)
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Printer code already exists
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

    const { printerCode, printerName, isActive = 1 } = body

    // Validate required fields
    if (!printerCode || !printerName) {
      return NextResponse.json(
        { error: 'printerCode and printerName are required' },
        { status: 400 }
      )
    }

    // Check if printer code already exists
    const existing = await locationPrisma.printer.findUnique({
      where: { printerCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Printer with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const printerData = addPOSSyncMetadata({
      printerCode,
      printerName,
      isActive: isActive ? 1 : 0,
      createdBy: body.createdBy ? parseInt(body.createdBy) : null,
      createdOn: new Date()
    }, storeCode)

    // Create printer
    const printer = await locationPrisma.printer.create({
      data: printerData
    })

    return NextResponse.json({
      success: true,
      message: 'Printer created successfully',
      data: {
        ...printer,
        printerId: printer.printerId.toString()
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating printer:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

