import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { checkDuplicate } from '@/lib/validation'
import { normalizeDeptCode } from '@/lib/deptCodeHelper'

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

// GET all time events
export async function GET(request: NextRequest) {
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
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }
    
    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const events = await prisma.timeEvent.findMany({
      where: {
        ...storeFilter
      },
      orderBy: {
        createdDate: 'desc'
      }
    })
    
    // Convert BigInt and Decimal to string/number for JSON serialization
    const eventsWithStringId = events.map((event: any) => convertEventForJson(event))
    
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
async function generateEventCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}TE`
  
  // Get all event codes that match the WL pattern for this store
  const events = await prisma.timeEvent.findMany({
    where: {
      eventCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { eventCode: true },
    orderBy: { id: 'desc' }
  })

  let nextNumber = 1
  
  if (events.length > 0) {
    // Extract number from codes like "WLLOC01TE1", "WLLOC01TE2", etc.
    const numbers = events
      .map(event => {
        const match = event.eventCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + TE + number starting from 1
  return `${prefix}${nextNumber}`
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
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to create events
    if (!(await checkLocationPermission(session.user.role, 'events.create'))) {
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

    const body = await request.json()
    
    // Check for duplicate event name
    if (body.eventName) {
      const isDuplicate = await checkDuplicate('timeEvent', 'eventName', body.eventName, {
        storeCode: selectedStoreCode
      });

      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Event with this name already exists' },
          { status: 409 }
        );
      }
    }
    
    // Auto-generate event code for the selected store
    const eventCode = await generateEventCode(selectedStoreCode)
    
    const event = await prisma.timeEvent.create({
      data: {
        eventCode: eventCode,
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
        isActive: body.isActive ?? 1,
        createdBy: parseInt(session.user.id),
        storeCode: selectedStoreCode,
        isSyncToWeb: body.isSyncToWeb || 0,
        isSyncToLocal: body.isSyncToLocal || 0,
        syncSource: 'location' // Set sync_source to 'location' when created from dashboard
      }
    })
    
    // Convert BigInt and Decimal to string/number for JSON serialization
    const eventWithStringId = convertEventForJson(event)
    
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

