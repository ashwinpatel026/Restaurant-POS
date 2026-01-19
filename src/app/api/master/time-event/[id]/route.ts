import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
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

// Helper function to map event response
function mapEventResponse(event: any) {
  return {
    ...event,
    id: event.id.toString(),
    globalPriceAmountAdd: event.globalPriceAmountAdd ? event.globalPriceAmountAdd.toString() : null,
    globalPriceAmountDisc: event.globalPriceAmountDisc ? event.globalPriceAmountDisc.toString() : null,
    globalPricePerAdd: event.globalPricePerAdd ? event.globalPricePerAdd.toString() : null,
    globalPricePerDisc: event.globalPricePerDisc ? event.globalPricePerDisc.toString() : null,
    eventStartDate: event.eventStartDate ? event.eventStartDate.toISOString().split('T')[0] : null,
    eventEndDate: event.eventEndDate ? event.eventEndDate.toISOString().split('T')[0] : null,
    createdDate: event.createdDate ? event.createdDate.toISOString() : null,
    createdBy: event.createdBy ? event.createdBy.toString() : null,
    updatedOn: event.updatedOn ? event.updatedOn.toISOString() : null
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
    const id = BigInt(idParam)
    
    const event = await masterPrisma.masterTimeEvent.findUnique({
      where: { id }
    })
    
    if (!event) {
      return NextResponse.json(
        { error: 'Time event not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(mapEventResponse(event))
  } catch (error) {
    console.error('Error fetching time event:', error)
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
    const id = BigInt(idParam)
    const body = await request.json()
    
    const event = await masterPrisma.masterTimeEvent.update({
      where: { id },
      data: {
        eventName: body.eventName,
        deptCode: normalizeDeptCode(body.deptCode),
        byFixedValue: Boolean(body.byFixedValue),
        overrideAllEvents: Boolean(body.overrideAllEvents),
        globalPriceAmountAdd: body.globalPriceAmountAdd ? parseFloat(body.globalPriceAmountAdd) : null,
        globalPriceAmountDisc: body.globalPriceAmountDisc ? parseFloat(body.globalPriceAmountDisc) : null,
        globalPricePerAdd: body.globalPricePerAdd ? parseFloat(body.globalPricePerAdd) : null,
        globalPricePerDisc: body.globalPricePerDisc ? parseFloat(body.globalPricePerDisc) : null,
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
        updatedOn: new Date()
      }
    })
    
    return NextResponse.json(mapEventResponse(event))
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
    const id = BigInt(idParam)
    
    await masterPrisma.masterTimeEvent.delete({
      where: { id }
    })
    
    return NextResponse.json(
      { message: 'Time event deleted successfully' }
    )
  } catch (error: any) {
    console.error('Error deleting time event:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Time event not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

