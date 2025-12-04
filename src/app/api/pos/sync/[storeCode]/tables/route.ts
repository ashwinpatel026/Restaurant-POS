import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/tables
 * Get all tables for a store
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
 * POST /api/pos/sync/[storeCode]/tables
 * Create a new table
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

