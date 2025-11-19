import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { Prisma } from '@prisma/master-client'

// Helper function to generate unique station code
async function generateStationCode(): Promise<string> {
  // Get the latest station code from master database
  const latestStation = await masterPrisma.masterStation.findFirst({
    orderBy: { tblStationId: 'desc' },
    select: { stationCode: true }
  })

  let nextNumber = 1
  
  if (latestStation?.stationCode) {
    // Extract number from code like "S001"
    const match = latestStation.stationCode.match(/^S(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as S + padded 3-digit number
  return `S${String(nextNumber).padStart(3, '0')}`
}

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

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stations = await masterPrisma.masterStation.findMany({
      orderBy: { stationname: 'asc' }
    })

    const stationsWithStringId = stations.map(mapStationResponse)

    return NextResponse.json(stationsWithStringId)
  } catch (error) {
    console.error('Error fetching stations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stationname, isActive, stationGroups } = body

    const groups = sanitizeStationGroups(stationGroups)

    // Generate unique station code
    const stationCode = await generateStationCode()

    const stationData: Record<string, unknown> = {
      stationCode: stationCode,
      stationname,
      isActive: isActive ?? 1,
    }

    if (groups.length > 0) {
      stationData.stationGroups = groups
    } else {
      stationData.stationGroups = Prisma.JsonNull
    }

    const station = await masterPrisma.masterStation.create({
      data: stationData as Prisma.MasterStationCreateInput
    })

    return NextResponse.json(mapStationResponse(station), { status: 201 })
  } catch (error) {
    console.error('Error creating station:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

