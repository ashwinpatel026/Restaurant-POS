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

    const resolvedParams = await params
    const stationId = parseInt(resolvedParams.id)

    const prepStation = await prisma.prepStation.findUnique({
      where: { prepStationId: stationId }
    })

    if (!prepStation) {
      return NextResponse.json({ error: 'Prep station not found' }, { status: 404 })
    }

    return NextResponse.json(prepStation)
  } catch (error) {
    console.error('Error fetching prep station:', error)
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

    const resolvedParams = await params
    const stationId = parseInt(resolvedParams.id)
    const body = await request.json()

    const { prepStationName, stationId: bodyStationId, sendToExpediter, alwaysPrintTicket, printerCode, isActive } = body

    if (!prepStationName) {
      return NextResponse.json(
        { error: 'Prep station name is required' },
        { status: 400 }
      )
    }

    const prepStation = await prisma.prepStation.update({
      where: { prepStationId: stationId },
      data: {
        prepStationName,
        stationId: bodyStationId ? parseInt(bodyStationId) : null,
        isActive: isActive ? 1 : 0,
        sendToExpediter: sendToExpediter ? 1 : 0,
        alwaysPrintTicket: alwaysPrintTicket ? 1 : 0,
        printerCode: printerCode || null,
        updatedBy: parseInt(session.user.id),
        updatedOn: new Date(),
        storeCode: process.env.STORE_CODE || null
      }
    })

    return NextResponse.json(prepStation)
  } catch (error) {
    console.error('Error updating prep station:', error)
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

    const resolvedParams = await params
    const stationId = parseInt(resolvedParams.id)

    await prisma.prepStation.delete({
      where: { prepStationId: stationId }
    })

    return NextResponse.json({ message: 'Prep station deleted successfully' })
  } catch (error) {
    console.error('Error deleting prep station:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
