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
    const prepZoneId = BigInt(resolvedParams.id)

    const prepZone = await prisma.prepZone.findUnique({
      where: { prepZoneId }
    })

    if (!prepZone) {
      return NextResponse.json({ error: 'Prep zone not found' }, { status: 404 })
    }

    // Convert BigInt to string for JSON serialization
    const serializedPrepZone = {
      ...prepZone,
      prepZoneId: prepZone.prepZoneId.toString()
    }

    return NextResponse.json(serializedPrepZone)
  } catch (error) {
    console.error('Error fetching prep zone:', error)
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
    const prepZoneId = BigInt(resolvedParams.id)
    const body = await request.json()

    const { prepZoneName, stationCode, sendToExpediter, alwaysPrintTicket, printerCode, backupPrinterCode, isActive } = body

    if (!prepZoneName) {
      return NextResponse.json(
        { error: 'Prep zone name is required' },
        { status: 400 }
      )
    }

    const prepZone = await prisma.prepZone.update({
      where: { prepZoneId },
      data: {
        prepZoneName,
        stationCode: stationCode || null,
        isActive: isActive ? 1 : 0,
        sendToExpediter: sendToExpediter ? 1 : 0,
        alwaysPrintTicket: alwaysPrintTicket ? 1 : 0,
        printerCode: printerCode || null,
        backupPrinterCode: backupPrinterCode || null,
        updatedBy: parseInt(session.user.id),
        updatedOn: new Date(),
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        storeCode: process.env.STORE_CODE || null
      }
    })

    // Convert BigInt to string for JSON serialization
    const serializedPrepZone = {
      ...prepZone,
      prepZoneId: prepZone.prepZoneId.toString()
    }

    return NextResponse.json(serializedPrepZone)
  } catch (error) {
    console.error('Error updating prep zone:', error)
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
    const prepZoneId = BigInt(resolvedParams.id)

    await prisma.prepZone.delete({
      where: { prepZoneId }
    })

    return NextResponse.json({ message: 'Prep zone deleted successfully' })
  } catch (error) {
    console.error('Error deleting prep zone:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
