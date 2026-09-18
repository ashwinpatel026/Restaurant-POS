import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { authenticatePOSRequest } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

async function generateTableCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}TBL`

  const where: Prisma.TableWhereInput = {
    tableCode: { startsWith: prefix },
    storeCode,
  }

  const tables = await locationPrisma.table.findMany({
    where,
    select: { tableCode: true },
    orderBy: { tableId: 'desc' },
  })

  let nextNumber = 1

  if (tables.length > 0) {
    const numbers = tables
      .map((t) => {
        const match = t.tableCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1], 10) : 0
      })
      .filter((num) => num > 0)

    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }

  return `${prefix}${nextNumber}`
}

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

function normalizeStatus(value: unknown, fallback: string = 'Free'): string {
  if (value === undefined || value === null || value === '') return fallback
  const raw = String(value).trim()
  if (raw === '0') return 'Free'
  if (raw === '1') return 'Available'
  if (raw === '2') return 'Occupied'
  const matched = ['Free', 'Available', 'Occupied'].find(
    (s) => s.toLowerCase() === raw.toLowerCase()
  )
  return matched || fallback
}

/**
 * @api {get} /api/pos/sync/:storeCode/tables List tables
 * @apiName GetTables
 * @apiGroup Table
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 * @apiQuery {String}  [status] Filter by status: Free | Available | Occupied (or legacy 0/1/2)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of table records returned
 * @apiSuccess {Object[]} data List of table records
 * @apiSuccess {String}  data.tableId Table ID (string)
 * @apiSuccess {String}  data.tableCode System table code
 * @apiSuccess {String}  data.code User table code
 * @apiSuccess {String}  data.tableName Table display name
 * @apiSuccess {Number}  data.seatingCapacity Seating capacity
 * @apiSuccess {String}  data.status Table status (Free | Available | Occupied)
 * @apiSuccess {Number}  data.isActive Active flag (0/1)
 * @apiSuccess {String}  [data.createdOn] Creation timestamp
 * @apiSuccess {String}  [data.updatedOn] Last update timestamp
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source (e.g., "POS", "server")
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
    const { storeCode } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const url = new URL(request.url)
    const lastSyncAt = url.searchParams.get('lastSyncAt')?.trim() || null
    const incremental = url.searchParams.get('incremental') === 'true'
    const statusParam = url.searchParams.get('status')?.trim() || null

    const where: any = { storeCode, isDelete: false }
    if (incremental && lastSyncAt) {
      const since = new Date(lastSyncAt)
      if (!Number.isNaN(since.getTime())) {
        where.updatedOn = { gte: since }
      }
    }
    if (statusParam) {
      // Accept Free / Available / Occupied (case-insensitive) or legacy 0/1/2
      const raw = statusParam
      if (raw === '0') where.status = 'Free'
      else if (raw === '1') where.status = 'Available'
      else if (raw === '2') where.status = 'Occupied'
      else {
        const normalized = ['Free', 'Available', 'Occupied'].find(
          (s) => s.toLowerCase() === raw.toLowerCase()
        )
        if (normalized) where.status = normalized
      }
    }

    const tables = await locationPrisma.table.findMany({
      where,
      orderBy: { createdOn: 'desc' },
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: tables.length,
      data: tables.map(mapTable),
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
 * @apiGroup Table
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} code User table code
 * @apiBody {String} tableName Table display name
 * @apiBody {Number} seatingCapacity Seats
 * @apiBody {String} [status=Free] Free | Available | Occupied
 * @apiBody {Number} [isActive=1] Active flag (0/1)
 * @apiBody {String} [tableCode] Optional system table code (auto-generated if omitted)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "code": "T1",
 *   "tableName": "Table 1",
 *   "seatingCapacity": 4,
 *   "status": "Free"
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created table record
 * @apiSuccess (201) {String}  data.tableId Table ID (string)
 * @apiSuccess (201) {String}  data.tableCode System table code
 * @apiSuccess (201) {String}  data.code User table code
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Table with this code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const { storeCode } = await params

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

    const { code, tableName, seatingCapacity, status = 'Free', isActive = 1 } = body

    if (!code?.toString().trim() || !tableName?.toString().trim()) {
      return NextResponse.json(
        { error: 'code and tableName are required' },
        { status: 400 }
      )
    }

    if (seatingCapacity === undefined || seatingCapacity === null) {
      return NextResponse.json(
        { error: 'seatingCapacity is required' },
        { status: 400 }
      )
    }

    const trimmedCode = String(code).trim()

    const existing = await locationPrisma.table.findFirst({
      where: {
        code: trimmedCode,
        storeCode,
        isDelete: false,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Table with this code already exists' },
        { status: 409 }
      )
    }

    const tableCode = body.tableCode || (await generateTableCode(storeCode))

    const table = await locationPrisma.table.create({
      data: {
        tableCode,
        code: trimmedCode,
        tableName: String(tableName).trim(),
        seatingCapacity: parseInt(seatingCapacity, 10),
        status: normalizeStatus(status, 'Free'),
        isActive: isActive !== undefined ? parseInt(isActive, 10) : 1,
        isDelete: false,
        storeCode,
        createdOn: new Date(),
        isSyncToWeb: 1,
        isSyncToLocal: 0,
        syncSource: 'POS',
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Table created successfully',
        data: mapTable(table),
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating table:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
