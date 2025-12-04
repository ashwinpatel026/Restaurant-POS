import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/printers
 * Get all printers for a store
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
 * POST /api/pos/sync/[storeCode]/printers
 * Create a new printer
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

