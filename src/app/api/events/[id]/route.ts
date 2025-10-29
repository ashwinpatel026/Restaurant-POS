import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

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

// GET single time event by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    
    // Convert BigInt to string for JSON serialization
    const eventWithStringId = {
      ...event,
      id: event.id.toString()
    }
    
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
    const { id: idParam } = await params
    const id = BigInt(idParam)
    const body = await request.json()
    
    // Debug logging
    console.log('PUT request body:', JSON.stringify(body, null, 2))
    console.log('Monday times:', { 
      monStartTime: body.monStartTime, 
      monEndTime: body.monEndTime,
      monday: body.monday 
    })
    
    // Debug validation
    console.log('Validating times:')
    console.log('monStartTime validation:', {
      input: body.monStartTime,
      validated: validateTimeString(body.monStartTime)
    })
    console.log('monEndTime validation:', {
      input: body.monEndTime,
      validated: validateTimeString(body.monEndTime)
    })
    
    const event = await prisma.timeEvent.update({
      where: { id },
      data: {
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
        isActive: body.isActive,
        storeCode: body.storeCode || null,
        isSyncToWeb: body.isSyncToWeb,
        isSyncToLocal: body.isSyncToLocal
      }
    })
    
    // Debug what was saved to database
    console.log('Saved to database:', {
      monStartTime: event.monStartTime,
      monEndTime: event.monEndTime,
      monday: event.monday
    })
    
    // Convert BigInt to string for JSON serialization
    const eventWithStringId = {
      ...event,
      id: event.id.toString()
    }
    
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
    const { id: idParam } = await params
    const id = BigInt(idParam)
    
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
    
    return NextResponse.json(
      { error: 'Failed to delete time event' },
      { status: 500 }
    )
  }
}

