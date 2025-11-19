import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// GET all time events
export async function GET(request: NextRequest) {
  try {
    const events = await prisma.timeEvent.findMany({
      orderBy: {
        createdDate: 'desc'
      }
    })
    
    // Convert BigInt to string for JSON serialization
    const eventsWithStringId = events.map((event: any) => ({
      ...event,
      id: event.id.toString()
    }))
    
    return NextResponse.json(eventsWithStringId, { status: 200 })
  } catch (error) {
    console.error('Error fetching time events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time events' },
      { status: 500 }
    )
  }
}

// Helper function to generate next event code
async function generateEventCode(): Promise<string> {
  // Get the last event ordered by ID
  const lastEvent = await prisma.timeEvent.findFirst({
    orderBy: {
      id: 'desc'
    }
  })
  
  let nextNumber = 1
  if (lastEvent && lastEvent.eventCode) {
    // Extract number from code like "TE001"
    const match = lastEvent.eventCode.match(/TE(\d+)/)
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }
  
  // Format as TE + padded 3-digit number
  return `TE${String(nextNumber).padStart(3, '0')}`
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

// POST create new time event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Auto-generate event code
    const eventCode = await generateEventCode()
    
    const event = await prisma.timeEvent.create({
      data: {
        eventCode: eventCode,
        eventName: body.eventName,
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
        isActive: body.isActive ?? 1,
        createdBy: body.createdBy || null,
        storeCode: body.storeCode || null,
        isSyncToWeb: body.isSyncToWeb || 0,
        isSyncToLocal: body.isSyncToLocal || 0
      }
    })
    
    // Convert BigInt to string for JSON serialization
    const eventWithStringId = {
      ...event,
      id: event.id.toString()
    }
    
    return NextResponse.json(eventWithStringId, { status: 201 })
  } catch (error: any) {
    console.error('Error creating time event:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Event code already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create time event' },
      { status: 500 }
    )
  }
}

