import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  canAccessStore,
} from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { Prisma } from '@prisma/client'

function sanitizeStationGroups(input: unknown): string[] {
  if (!input) {
    return []
  }

  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : []

  const unique = new Set<string>()

  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        unique.add(trimmed)
      }
    }
  }

  return Array.from(unique)
}

function mapStationResponse(station: any) {
  const rawGroups = station?.stationGroups as Prisma.JsonValue | null | undefined
  const groups =
    Array.isArray(rawGroups)
      ? rawGroups
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter((item): item is string => item.length > 0)
      : []

  return {
    ...station,
    tblStationId: station.tblStationId.toString(),
    stationGroups: groups,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    const { id: idParam } = await params
    const stationId = BigInt(idParam)

    const station = await prisma.station.findUnique({
      where: { tblStationId: stationId }
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // If storeCode is provided, verify the station belongs to that store or user has access
    if (selectedStoreCode && station.storeCode !== selectedStoreCode) {
      if (!canAccessStore(accessInfo, station.storeCode || '')) {
        return NextResponse.json({ error: 'Station not found' }, { status: 404 })
      }
    }

    return NextResponse.json(mapStationResponse(station))
  } catch (error) {
    console.error('Error fetching station:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const { id: idParam } = await params
    const stationId = BigInt(idParam)
    const body = await request.json()

    const { stationname, isActive, stationGroups, isKitchen, isBar, isBill, isReport, ipAddress } = body
    const groups = sanitizeStationGroups(stationGroups)

    // First check if station exists and belongs to a store the user can access
    const existingStation = await prisma.station.findUnique({
      where: { tblStationId: stationId },
    })

    if (!existingStation) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    if (
      existingStation.storeCode &&
      !canAccessStore(accessInfo, existingStation.storeCode)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {
      stationname,
      isActive,
      isKitchen: isKitchen ?? false,
      isBar: isBar ?? false,
      isBill: isBill ?? false,
      isReport: isReport ?? false,
      ipAddress: ipAddress || null,
      // Set updatedBy to current user ID
      updatedBy: BigInt(parseInt(session.user.id)),
      updatedOn: new Date(),
      // Keep original storeCode; if missing, set to currently selected store
      storeCode: existingStation.storeCode || selectedStoreCode,
      // Mark updates from dashboard/location
      syncSource: 'location',
    }

    if (groups.length > 0) {
      updateData.stationGroups = groups
    } else {
      updateData.stationGroups = Prisma.JsonNull
    }

    const station = await prisma.station.update({
      where: { tblStationId: stationId },
      data: updateData as Prisma.StationUpdateInput
    })

    return NextResponse.json(mapStationResponse(station))
  } catch (error) {
    console.error('Error updating station:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    const { id: idParam } = await params
    const stationId = BigInt(idParam)

    // First check if station exists and user has access
    const existingStation = await prisma.station.findUnique({
      where: { tblStationId: stationId },
    })

    if (!existingStation) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    if (
      existingStation.storeCode &&
      !canAccessStore(accessInfo, existingStation.storeCode)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.station.delete({
      where: { tblStationId: stationId },
    })

    return NextResponse.json({ message: 'Station deleted successfully' })
  } catch (error) {
    console.error('Error deleting station:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

