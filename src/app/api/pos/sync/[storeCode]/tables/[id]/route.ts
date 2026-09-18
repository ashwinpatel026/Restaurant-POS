import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

function mapTable(table: any) {
  return {
    ...table,
    tableId: table.tableId.toString(),
    createdBy: table.createdBy != null ? String(table.createdBy) : null,
    updatedBy: table.updatedBy != null ? String(table.updatedBy) : null,
    createdOn: table.createdOn ? table.createdOn.toISOString() : null,
    updatedOn: table.updatedOn ? table.updatedOn.toISOString() : null,
  }
}

async function findTable(storeCode: string, id: string) {
  let table = null
  const tableId = parseInt(id, 10)

  if (!Number.isNaN(tableId)) {
    table = await locationPrisma.table.findFirst({
      where: { tableId, storeCode, isDelete: false },
    })
  }

  if (!table) {
    table = await locationPrisma.table.findFirst({
      where: {
        storeCode,
        isDelete: false,
        OR: [{ tableCode: id }, { code: id }],
      },
    })
  }

  return table
}

/**
 * @api {get} /api/pos/sync/:storeCode/tables/:id Get table
 * @apiName GetTable
 * @apiGroup Table
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Table identifier (tableId, tableCode, or code)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Table record
 * @apiSuccess {String}  data.tableId Table ID (string)
 * @apiSuccess {String}  data.tableCode System table code
 * @apiSuccess {String}  data.code User table code
 * @apiSuccess {String}  data.tableName Table display name
 * @apiSuccess {Number}  data.seatingCapacity Seating capacity
 * @apiSuccess {String}  data.status Table status (Free | Available | Occupied)
 * @apiSuccess {Number}  data.isActive Active flag (0/1)
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
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const table = await findTable(storeCode, id)

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: mapTable(table),
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
 * @apiGroup Table
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Table identifier (tableId, tableCode, or code)
 *
 * @apiBody {String} [code] User table code
 * @apiBody {String} [tableName] Table display name
 * @apiBody {Number} [seatingCapacity] Seats
 * @apiBody {String} [status] Free | Available | Occupied
 * @apiBody {Number} [isActive] Active flag (0/1)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "tableName": "Table 1",
 *   "seatingCapacity": 6,
 *   "status": "Available"
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated table record
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
    const { storeCode, id } = await params

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

    const existingTable = await findTable(storeCode, id)

    if (!existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const updateData: any = {
      updatedOn: new Date(),
      isSyncToWeb: 1,
      isSyncToLocal: 0,
      syncSource: 'POS',
    }

    if (body.code !== undefined) updateData.code = String(body.code).trim()
    if (body.tableName !== undefined)
      updateData.tableName = String(body.tableName).trim()
    if (body.seatingCapacity !== undefined)
      updateData.seatingCapacity = parseInt(body.seatingCapacity, 10)
    if (body.status !== undefined) {
      const raw = String(body.status).trim()
      if (raw === '0') updateData.status = 'Free'
      else if (raw === '1') updateData.status = 'Available'
      else if (raw === '2') updateData.status = 'Occupied'
      else {
        const matched = ['Free', 'Available', 'Occupied'].find(
          (s) => s.toLowerCase() === raw.toLowerCase()
        )
        if (matched) updateData.status = matched
      }
    }
    if (body.isActive !== undefined)
      updateData.isActive = parseInt(body.isActive, 10)

    const updatedTable = await locationPrisma.table.update({
      where: { tableId: existingTable.tableId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: 'Table updated successfully',
      data: mapTable(updatedTable),
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
 * @api {delete} /api/pos/sync/:storeCode/tables/:id Delete table (soft)
 * @apiName DeleteTable
 * @apiGroup Table
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Table identifier (tableId, tableCode, or code)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.tableCode System table code
 * @apiSuccess {String}  data.code User table code
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
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const existingTable = await findTable(storeCode, id)

    if (!existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    await locationPrisma.table.update({
      where: { tableId: existingTable.tableId },
      data: {
        isDelete: true,
        isActive: 0,
        updatedOn: new Date(),
        syncSource: 'POS',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Table deleted successfully',
      data: {
        tableCode: existingTable.tableCode,
        code: existingTable.code,
        tableId: existingTable.tableId.toString(),
      },
    })
  } catch (error: any) {
    console.error('Error deleting table:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
