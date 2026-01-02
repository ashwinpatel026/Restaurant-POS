import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to map prep zone response
function mapPrepZoneResponse(zone: any) {
  return {
    ...zone,
    prepZoneId: zone.prepZoneId.toString(),
    createdBy: zone.createdBy ? zone.createdBy.toString() : null,
    createdOn: zone.createdOn ? zone.createdOn.toISOString() : null,
    updatedBy: zone.updatedBy ? zone.updatedBy.toString() : null,
    updatedOn: zone.updatedOn ? zone.updatedOn.toISOString() : null
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
    const prepZoneId = BigInt(idParam)

    const prepZone = await masterPrisma.masterPrepZone.findUnique({
      where: { prepZoneId }
    })

    if (!prepZone) {
      return NextResponse.json({ error: 'Prep zone not found' }, { status: 404 })
    }

    return NextResponse.json(mapPrepZoneResponse(prepZone))
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const prepZoneId = BigInt(idParam)
    const body = await request.json()

    const { prepZoneName, sendToExpediter, alwaysPrintTicket, printerCode, backupPrinterCode, isActive } = body

    if (!prepZoneName) {
      return NextResponse.json(
        { error: 'Prep zone name is required' },
        { status: 400 }
      )
    }

    const prepZone = await masterPrisma.masterPrepZone.update({
      where: { prepZoneId },
      data: {
        prepZoneName,
        isActive: isActive ? 1 : 0,
        sendToExpediter: sendToExpediter ? 1 : 0,
        alwaysPrintTicket: alwaysPrintTicket ? 1 : 0,
        printerCode: printerCode || null,
        backupPrinterCode: backupPrinterCode || null,
        updatedBy: admin.adminId,
        updatedOn: new Date()
      }
    })

    return NextResponse.json(mapPrepZoneResponse(prepZone))
  } catch (error: any) {
    console.error('Error updating prep zone:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Prep zone not found' },
        { status: 404 }
      )
    }

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
    const prepZoneId = BigInt(idParam)

    await masterPrisma.masterPrepZone.delete({
      where: { prepZoneId }
    })

    return NextResponse.json({ message: 'Prep zone deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting prep zone:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Prep zone not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

