import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const stationId = BigInt(idParam)

    const station = await prisma.station.findUnique({
      where: { tblStationId: stationId }
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Convert BigInt to string for JSON serialization
    return NextResponse.json({
      ...station,
      tblStationId: station.tblStationId.toString()
    })
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
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const stationId = BigInt(idParam)
    const body = await request.json()

    const { stationname, isActive } = body

    const station = await prisma.station.update({
      where: { tblStationId: stationId },
      data: {
        stationname,
        isActive,
        storeCode: process.env.STORE_CODE || null
      }
    })

    // Convert BigInt to string for JSON serialization
    return NextResponse.json({
      ...station,
      tblStationId: station.tblStationId.toString()
    })
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
    
    if (!session || !['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const stationId = BigInt(idParam)

    await prisma.station.delete({
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

