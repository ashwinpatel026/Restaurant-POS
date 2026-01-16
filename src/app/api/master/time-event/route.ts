import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { checkDuplicate } from '@/lib/validation'
import { normalizeDeptCode } from '@/lib/deptCodeHelper'

// Helper function to generate unique event code
async function generateEventCode(): Promise<string> {
  // Get the latest event code from master database
  const latestEvent = await masterPrisma.masterTimeEvent.findFirst({
    orderBy: { id: 'desc' },
    select: { eventCode: true }
  })

  let nextNumber = 1
  
  if (latestEvent?.eventCode) {
    // Extract number from code like "TE1", "TE2", etc.
    const match = latestEvent.eventCode.match(/^TE(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as TE + number starting from 1
  return `TE${nextNumber}`
}

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

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const events = await masterPrisma.masterTimeEvent.findMany({
      orderBy: { createdDate: 'desc' }
    })

    const eventsWithStringId = events.map(mapEventResponse)

    return NextResponse.json(eventsWithStringId)
  } catch (error) {
    console.error('Error fetching time events:', error)
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
    
    // Validate required fields
    const eventName = body.eventName ? body.eventName.trim() : '';
    if (!eventName) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      )
    }
    
    // Check for duplicate event name (case-insensitive)
    // Get all events and check case-insensitively
    const allEvents = await masterPrisma.masterTimeEvent.findMany({
      select: {
        id: true,
        eventName: true
      }
    });

    const duplicateEvent = allEvents.find(
      (e) => e.eventName && e.eventName.toLowerCase().trim() === eventName.toLowerCase().trim()
    );

    if (duplicateEvent) {
      return NextResponse.json(
        { error: 'Event with this name already exists' },
        { status: 409 }
      );
    }
    
    // Auto-generate event code
    const eventCode = await generateEventCode()
    
    const event = await masterPrisma.masterTimeEvent.create({
      data: {
        eventCode: eventCode,
        eventName: eventName,
        deptCode: normalizeDeptCode(body.deptCode),
        byFixedValue: Boolean(body.byFixedValue),
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
        isActive: body.isActive ?? 1,
        createdBy: admin.adminId
      }
    })
    
    return NextResponse.json(mapEventResponse(event), { status: 201 })
  } catch (error: any) {
    console.error('Error creating time event:', error)
    
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

