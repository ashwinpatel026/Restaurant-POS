import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

// Helper function to generate unique station code
async function generateStationCode(): Promise<string> {
  // Get the latest station code
  const latestStation = await prisma.station.findFirst({
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stations = await prisma.station.findMany({
      orderBy: { stationname: 'asc' }
    })

    // Convert BigInt to string for JSON serialization
    const stationsWithStringId = stations.map(station => ({
      ...station,
      tblStationId: station.tblStationId.toString()
    }))

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
    const session = await getServerSession(authOptions)

    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stationname, isActive } = body

    // Generate unique station code
    const stationCode = await generateStationCode()

    const station = await prisma.station.create({
      data: {
        stationCode: stationCode,
        stationname,
        isActive: isActive ?? 1,
        storeCode: process.env.STORE_CODE || null
      }
    })

    // Convert BigInt to string for JSON serialization
    return NextResponse.json({
      ...station,
      tblStationId: station.tblStationId.toString()
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating station:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

