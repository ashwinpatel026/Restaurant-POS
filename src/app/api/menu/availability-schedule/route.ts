import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const avaiCode = searchParams.get('avaiCode')

    const where: any = {}
    if (avaiCode) {
      where.avaiCode = avaiCode
    }

    const schedules = await (prisma as any).availabilitySchedule.findMany({
      where,
      include: {
        availability: true
      },
      orderBy: { dayName: 'asc' }
    })

    // Format the time fields for better display
    const formattedSchedules = schedules.map((schedule: any) => {
      const formatTime = (time: any) => {
        if (!time) return null;
        
        // If it's already a string in HH:MM:SS format, convert to HH:MM
        if (typeof time === 'string') {
          if (time.includes(':')) {
            return time.slice(0, 5); // Take HH:MM part
          }
          return time;
        }
        
        // If it's a Date object
        if (time instanceof Date) {
          return time.toTimeString().slice(0, 5);
        }
        
        return time;
      };

      return {
        ...schedule,
        startTime: formatTime(schedule.startTime),
        endTime: formatTime(schedule.endTime)
      };
    })

    return NextResponse.json(formattedSchedules)
  } catch (error) {
    console.error('Error fetching availability schedules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { avaiCode, dayName, startTime, endTime } = body
    

    // Validate required fields
    if (!avaiCode || !dayName || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Verify availability exists
    const availability = await prisma.availability.findFirst({
      where: { avaiCode } as any
    })

    if (!availability) {
      return NextResponse.json(
        { error: 'Availability not found' },
        { status: 404 }
      )
    }

    const schedule = await (prisma as any).availabilitySchedule.create({
      data: {
        avaiCode,
        dayName,
        startTime: new Date(`1970-01-01T${startTime}:00.000Z`),
        endTime: new Date(`1970-01-01T${endTime}:00.000Z`),
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null
      },
      include: {
        availability: true
      }
    })


    // Format the time fields for better display
    const formatTime = (time: any) => {
      if (!time) return null;
      
      // If it's already a string in HH:MM:SS format, convert to HH:MM
      if (typeof time === 'string') {
        if (time.includes(':')) {
          return time.slice(0, 5); // Take HH:MM part
        }
        return time;
      }
      
      // If it's a Date object
      if (time instanceof Date) {
        // Use UTC methods to avoid timezone conversion
        const hours = time.getUTCHours().toString().padStart(2, '0');
        const minutes = time.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      
      return time;
    };

    const formattedSchedule = {
      ...schedule,
      startTime: formatTime(schedule.startTime),
      endTime: formatTime(schedule.endTime)
    }

    return NextResponse.json(formattedSchedule, { status: 201 })
  } catch (error: any) {
    console.error('Error creating availability schedule:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

