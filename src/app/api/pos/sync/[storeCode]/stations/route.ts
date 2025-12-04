import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/stations
 * Get all stations for a store
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

    // Get stations
    // Note: Using tblStationId for ordering until Prisma client is regenerated with new fields
    // The where clause uses updatedOn for incremental sync filtering (will work after Prisma regeneration)
    const stations = await locationPrisma.station.findMany({
      where,
      orderBy: { tblStationId: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: stations.length,
      data: stations.map(station => ({
        ...station,
        tblStationId: station.tblStationId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching stations:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pos/sync/[storeCode]/stations
 * Create a new station
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

    const { stationCode, stationname, isActive = 1, createdBy } = body

    // Validate required fields
    if (!stationCode || !stationname) {
      return NextResponse.json(
        { error: 'stationCode and stationname are required' },
        { status: 400 }
      )
    }

    // Check if station code already exists
    const existing = await locationPrisma.station.findUnique({
      where: { stationCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Station with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const stationData = addPOSSyncMetadata({
      stationCode,
      stationname,
      isActive: isActive ? 1 : 0,
      stationGroups: body.stationGroups || null,
      isKitchen: body.isKitchen || false,
      isBar: body.isBar || false,
      isBill: body.isBill || false,
      isReport: body.isReport || false,
      ipAddress: body.ipAddress || null,
      createdBy: createdBy ? parseInt(createdBy) : null,
      createdOn: new Date()
    }, storeCode)

    // Create station
    const station = await locationPrisma.station.create({
      data: stationData
    })

    return NextResponse.json({
      success: true,
      message: 'Station created successfully',
      data: {
        ...station,
        tblStationId: station.tblStationId.toString()
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating station:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

