import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/prep-zones
 * Get all prep zones for a store
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

    // Get prep zones
    const prepZones = await locationPrisma.prepZone.findMany({
      where,
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: prepZones.length,
      data: prepZones.map(zone => ({
        ...zone,
        prepZoneId: zone.prepZoneId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching prep zones:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pos/sync/[storeCode]/prep-zones
 * Create a new prep zone
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

    const { prepZoneCode, prepZoneName, isActive = 1 } = body

    // Validate required fields
    if (!prepZoneCode || !prepZoneName) {
      return NextResponse.json(
        { error: 'prepZoneCode and prepZoneName are required' },
        { status: 400 }
      )
    }

    // Check if prep zone code already exists
    const existing = await locationPrisma.prepZone.findUnique({
      where: { prepZoneCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Prep zone with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const prepZoneData = addPOSSyncMetadata({
      prepZoneCode,
      prepZoneName,
      stationCode: body.stationCode || null,
      isActive: isActive ? 1 : 0,
      sendToExpediter: body.sendToExpediter ? 1 : 0,
      alwaysPrintTicket: body.alwaysPrintTicket ? 1 : 0,
      printerCode: body.printerCode || null,
      backupPrinterCode: body.backupPrinterCode || null,
      createdBy: body.createdBy ? parseInt(body.createdBy) : null,
      createdOn: new Date()
    }, storeCode)

    // Create prep zone
    const prepZone = await locationPrisma.prepZone.create({
      data: prepZoneData
    })

    return NextResponse.json({
      success: true,
      message: 'Prep zone created successfully',
      data: {
        ...prepZone,
        prepZoneId: prepZone.prepZoneId.toString()
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating prep zone:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

