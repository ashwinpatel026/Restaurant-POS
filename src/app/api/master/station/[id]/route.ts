import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { Prisma } from '@prisma/master-client'

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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const stationId = BigInt(idParam)

    const station = await masterPrisma.masterStation.findUnique({
      where: { tblStationId: stationId }
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const stationId = BigInt(idParam)
    const body = await request.json()

    const { stationname, isActive, stationGroups, isKitchen, isBar, isBill, isReport } = body
    const groups = sanitizeStationGroups(stationGroups)

    const updateData: Record<string, unknown> = {
      stationname,
      isActive,
      isKitchen: isKitchen ?? false,
      isBar: isBar ?? false,
      isBill: isBill ?? false,
      isReport: isReport ?? false,
    }

    if (groups.length > 0) {
      updateData.stationGroups = groups
    } else {
      updateData.stationGroups = Prisma.JsonNull
    }

    const station = await masterPrisma.masterStation.update({
      where: { tblStationId: stationId },
      data: updateData as Prisma.MasterStationUpdateInput
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const stationId = BigInt(idParam)

    await masterPrisma.masterStation.delete({
      where: { tblStationId: stationId }
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

