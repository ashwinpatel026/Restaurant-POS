import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, canAccessStore, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view prep zones
    if (!(await checkLocationPermission(session.user.role, 'prepzone.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    const resolvedParams = await params
    const prepZoneId = BigInt(resolvedParams.id)

    const prepZone = await prisma.prepZone.findUnique({
      where: { prepZoneId }
    })

    if (!prepZone) {
      return NextResponse.json({ error: 'Prep zone not found' }, { status: 404 })
    }

    // If storeCode is provided, verify the prep zone belongs to that store or user has access
    if (selectedStoreCode && prepZone.storeCode !== selectedStoreCode) {
      if (!canAccessStore(accessInfo, prepZone.storeCode || '')) {
        return NextResponse.json({ error: 'Prep zone not found' }, { status: 404 })
      }
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
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to update prep zones
    if (!(await checkLocationPermission(session.user.role, 'prepzone.update'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    const resolvedParams = await params
    const prepZoneId = BigInt(resolvedParams.id)
    
    // First check if prep zone exists and belongs to the selected store
    const existingPrepZone = await prisma.prepZone.findUnique({
      where: { prepZoneId }
    })

    if (!existingPrepZone) {
      return NextResponse.json({ error: 'Prep zone not found' }, { status: 404 })
    }

    // Verify user has access to this prep zone's store
    if (existingPrepZone.storeCode && !canAccessStore(accessInfo, existingPrepZone.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

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
        // Keep the original storeCode, don't change it
        storeCode: existingPrepZone.storeCode || selectedStoreCode,
        // Set sync_source to 'location' when updated from dashboard
        syncSource: 'location'
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to delete prep zones
    if (!(await checkLocationPermission(session.user.role, 'menu.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    const resolvedParams = await params
    const prepZoneId = BigInt(resolvedParams.id)

    // First check if prep zone exists and user has access
    const existingPrepZone = await prisma.prepZone.findUnique({
      where: { prepZoneId }
    })

    if (!existingPrepZone) {
      return NextResponse.json({ error: 'Prep zone not found' }, { status: 404 })
    }

    // Verify user has access to this prep zone's store
    if (existingPrepZone.storeCode && !canAccessStore(accessInfo, existingPrepZone.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

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
