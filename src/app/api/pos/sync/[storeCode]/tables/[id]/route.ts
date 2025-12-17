import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/tables/:id Get table
 * @apiName GetTable
 * @apiGroup Tables
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Table identifier (integer `tableId` or `tableNumber`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Table record
 * @apiSuccess {String}  data.tableId Table ID (string)
 * @apiSuccess {String}  data.tableNumber Table number/name
 * @apiSuccess {Number}  data.seatingCapacity Seating capacity
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Table not found
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

    // Try to find by ID first, then by tableNumber
    let table = null
    const tableId = parseInt(id)
    
    if (!isNaN(tableId)) {
      table = await locationPrisma.table.findFirst({
        where: {
          tableId: tableId,
          storeCode
        }
      })
    }

    if (!table) {
      table = await locationPrisma.table.findUnique({
        where: { tableNumber: id }
      })
    }

    if (!table || table.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...table,
        tableId: table.tableId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching table:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/tables/:id Update table
 * @apiName UpdateTable
 * @apiGroup Tables
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Table identifier (integer `tableId` or `tableNumber`)
 *
 * @apiBody {Number} [seatingCapacity] Seating capacity
 * @apiBody {Number} [currentOccupancy] Current occupancy
 * @apiBody {String} [location] Location/section
 * @apiBody {Number} [status] Status code
 *
 * @apiParamExample {json} Request Body
 * {
 *   "seatingCapacity": 6,
 *   "status": 1
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated table
 * @apiSuccess {String}  data.tableId Table ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Table not found
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

    // Find existing table
    let existingTable = null
    const tableId = parseInt(id)
    
    if (!isNaN(tableId)) {
      existingTable = await locationPrisma.table.findFirst({
        where: {
          tableId: tableId,
          storeCode
        }
      })
    }

    if (!existingTable) {
      existingTable = await locationPrisma.table.findUnique({
        where: { tableNumber: id }
      })
    }

    if (!existingTable || existingTable.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (body.seatingCapacity !== undefined) updateData.seatingCapacity = parseInt(body.seatingCapacity)
    if (body.currentOccupancy !== undefined) updateData.currentOccupancy = parseInt(body.currentOccupancy)
    if (body.location !== undefined) updateData.location = body.location
    if (body.status !== undefined) updateData.status = parseInt(body.status)

    // Update table
    const updatedTable = await locationPrisma.table.update({
      where: { tableId: existingTable.tableId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Table updated successfully',
      data: {
        ...updatedTable,
        tableId: updatedTable.tableId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating table:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/tables/:id Delete table
 * @apiName DeleteTable
 * @apiGroup Tables
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Table identifier (integer `tableId` or `tableNumber`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.tableNumber Table number/name
 * @apiSuccess {String}  data.tableId Table ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Table not found
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

    // Find existing table
    let existingTable = null
    const tableId = parseInt(id)
    
    if (!isNaN(tableId)) {
      existingTable = await locationPrisma.table.findFirst({
        where: {
          tableId: tableId,
          storeCode
        }
      })
    }

    if (!existingTable) {
      existingTable = await locationPrisma.table.findUnique({
        where: { tableNumber: id }
      })
    }

    if (!existingTable || existingTable.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Delete table
    await locationPrisma.table.delete({
      where: { tableId: existingTable.tableId }
    })

    return NextResponse.json({
      success: true,
      message: 'Table deleted successfully',
      data: {
        tableNumber: existingTable.tableNumber,
        tableId: existingTable.tableId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting table:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

