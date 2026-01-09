import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, canAccessStore, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { normalizeDeptCode } from '@/lib/deptCodeHelper'

// Helper function to validate and store time string directly
function validateTimeString(time: string | null): string | null {
  if (!time || time.trim() === "") return null
  
  // Expect 24-hour format (HH:MM) - return as string
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time
  }
  
  // If format doesn't match HH:MM, return null
  return null
}

// Helper function to convert BigInt and Decimal fields for JSON serialization
function convertEventForJson(event: any): any {
  return {
    ...event,
    id: event.id.toString(),
    createdBy: event.createdBy ? event.createdBy.toString() : null,
    updatedBy: event.updatedBy ? event.updatedBy.toString() : null,
    globalPriceAmountAdd: event.globalPriceAmountAdd ? Number(event.globalPriceAmountAdd) : null,
    globalPriceAmountDisc: event.globalPriceAmountDisc ? Number(event.globalPriceAmountDisc) : null,
    globalPricePerAdd: event.globalPricePerAdd ? Number(event.globalPricePerAdd) : null,
    globalPricePerDisc: event.globalPricePerDisc ? Number(event.globalPricePerDisc) : null,
  }
}

// GET single time event by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view events
    if (!(await checkLocationPermission(session.user.role, 'events.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    const { id: idParam } = await params
    const id = BigInt(idParam)
    
    const event = await prisma.timeEvent.findUnique({
      where: { id }
    })
    
    if (!event) {
      return NextResponse.json(
        { error: 'Time event not found' },
        { status: 404 }
      )
    }

    // If storeCode is provided, verify the event belongs to that store or user has access
    if (selectedStoreCode && event.storeCode !== selectedStoreCode) {
      if (!canAccessStore(accessInfo, event.storeCode || '')) {
        return NextResponse.json({ error: 'Time event not found' }, { status: 404 })
      }
    }
    
    // Convert BigInt and Decimal to string/number for JSON serialization
    const eventWithStringId = convertEventForJson(event)
    
    return NextResponse.json(eventWithStringId, { status: 200 })
  } catch (error) {
    console.error('Error fetching time event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time event' },
      { status: 500 }
    )
  }
}

// PUT update time event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to update events
    if (!(await checkLocationPermission(session.user.role, 'events.update'))) {
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

    const { id: idParam } = await params
    const id = BigInt(idParam)
    const body = await request.json()
    
    // First check if event exists and belongs to the selected store
    const existingEvent = await prisma.timeEvent.findUnique({
      where: { id }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Time event not found' }, { status: 404 })
    }

    // Verify user has access to this event's store
    if (existingEvent.storeCode && !canAccessStore(accessInfo, existingEvent.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const event = await prisma.timeEvent.update({
      where: { id },
      data: {
        eventName: body.eventName,
        deptCode: normalizeDeptCode(body.deptCode),
        globalPriceAmountAdd: body.globalPriceAmountAdd || null,
        globalPriceAmountDisc: body.globalPriceAmountDisc || null,
        globalPricePerAdd: body.globalPricePerAdd || null,
        globalPricePerDisc: body.globalPricePerDisc || null,
        monday: body.monday || null,
        monStartTime: validateTimeString(body.monStartTime),
        monEndTime: validateTimeString(body.monEndTime),
        tuesday: body.tuesday || null,
        tueStartTime: validateTimeString(body.tueStartTime),
        tueEndTime: validateTimeString(body.tueEndTime),
        wednesday: body.wednesday || null,
        wedStartTime: validateTimeString(body.wedStartTime),
        wedEndTime: validateTimeString(body.wedEndTime),
        thursday: body.thursday || null,
        thuStartTime: validateTimeString(body.thuStartTime),
        thuEndTime: validateTimeString(body.thuEndTime),
        friday: body.friday || null,
        friStartTime: validateTimeString(body.friStartTime),
        friEndTime: validateTimeString(body.friEndTime),
        saturday: body.saturday || null,
        satStartTime: validateTimeString(body.satStartTime),
        satEndTime: validateTimeString(body.satEndTime),
        sunday: body.sunday || null,
        sunStartTime: validateTimeString(body.sunStartTime),
        sunEndTime: validateTimeString(body.sunEndTime),
        eventStartDate: body.eventStartDate && body.eventStartDate.trim() !== "" ? new Date(body.eventStartDate) : null,
        eventEndDate: body.eventEndDate && body.eventEndDate.trim() !== "" ? new Date(body.eventEndDate) : null,
        isActive: body.isActive,
        // Keep the original storeCode, don't change it
        storeCode: existingEvent.storeCode || selectedStoreCode,
        isSyncToWeb: body.isSyncToWeb,
        isSyncToLocal: body.isSyncToLocal,
        // Set sync_source to 'location' when updated from dashboard
        syncSource: 'location'
      }
    })
    
    // Debug what was saved to database
    console.log('Saved to database:', {
      monStartTime: event.monStartTime,
      monEndTime: event.monEndTime,
      monday: event.monday
    })
    
    // Convert BigInt and Decimal to string/number for JSON serialization
    const eventWithStringId = convertEventForJson(event)
    
    return NextResponse.json(eventWithStringId, { status: 200 })
  } catch (error: any) {
    console.error('Error updating time event:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Time event not found' },
        { status: 404 }
      )
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Event code already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update time event' },
      { status: 500 }
    )
  }
}

// DELETE time event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to delete events
    if (!(await checkLocationPermission(session.user.role, 'events.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    const { id: idParam } = await params
    const id = BigInt(idParam)
    
    // First, get the event to retrieve its eventCode
    const event = await prisma.timeEvent.findUnique({
      where: { id }
    })
    
    if (!event) {
      return NextResponse.json(
        { error: 'Time event not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this event's store
    if (event.storeCode && !canAccessStore(accessInfo, event.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Delete all MenuMasterEvent records that reference this event
    await prisma.menuMasterEvent.deleteMany({
      where: { eventCode: event.eventCode }
    })
    
    // Now delete the time event
    await prisma.timeEvent.delete({
      where: { id }
    })
    
    return NextResponse.json(
      { message: 'Time event deleted successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error deleting time event:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Time event not found' },
        { status: 404 }
      )
    }
    
    // Handle foreign key constraint errors
    if (error.code === 'P2003' || error.message?.includes('foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot delete event: it is still referenced by menu masters. Please remove the event from all menu masters first.' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete time event' },
      { status: 500 }
    )
  }
}

