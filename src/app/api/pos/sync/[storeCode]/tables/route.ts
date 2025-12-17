import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/tables List tables
 * @apiName GetTables
 * @apiGroup Tables
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records created since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 * @apiQuery {Number}  [status] Filter by status code
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Object[]} data Tables
 * @apiSuccess {String}  data.tableId Table ID (string)
 * @apiSuccess {String}  data.tableNumber Table number/name
 * @apiSuccess {Number}  data.seatingCapacity Seating capacity
 * @apiSuccess {Number}  data.status Status code
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
    const status = url.searchParams.get('status')

    // Build where clause
    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.createdDate = { gte: new Date(lastSyncAt) }
    }
    if (status) {
      where.status = parseInt(status)
    }

    // Get tables
    const tables = await locationPrisma.table.findMany({
      where,
      orderBy: { createdDate: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: tables.length,
      data: tables.map(table => ({
        ...table,
        tableId: table.tableId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching tables:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/tables Create table
 * @apiName CreateTable
 * @apiGroup Tables
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiBody {String} tableNumber Table number/name
 * @apiBody {Number} seatingCapacity Seating capacity
 * @apiBody {String} [location] Location/section
 * @apiBody {Number} [status=0] Status code
 *
 * @apiParamExample {json} Request Body
 * {
 *   "tableNumber": "T01",
 *   "seatingCapacity": 4,
 *   "status": 0
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created table
 * @apiSuccess (201) {String}  data.tableId Table ID (string)
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Table number already exists
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

    const { tableNumber, seatingCapacity, location, status = 0 } = body

    // Validate required fields
    if (!tableNumber || seatingCapacity === undefined) {
      return NextResponse.json(
        { error: 'tableNumber and seatingCapacity are required' },
        { status: 400 }
      )
    }

    // Check if table number already exists
    const existing = await locationPrisma.table.findUnique({
      where: { tableNumber }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Table with this number already exists' },
        { status: 409 }
      )
    }

    // Prepare data
    const tableData = {
      tableNumber,
      seatingCapacity: parseInt(seatingCapacity),
      currentOccupancy: 0,
      location: location || null,
      status: status ? parseInt(status) : 0,
      storeCode,
      createdDate: new Date()
    }

    // Create table
    const table = await locationPrisma.table.create({
      data: tableData
    })

    return NextResponse.json({
      success: true,
      message: 'Table created successfully',
      data: {
        ...table,
        tableId: table.tableId.toString()
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating table:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

