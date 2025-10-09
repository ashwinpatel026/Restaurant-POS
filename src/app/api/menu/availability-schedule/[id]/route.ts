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
    const scheduleId = parseInt(resolvedParams.id)

    const schedule = await (prisma as any).availabilitySchedule.findUnique({
      where: { id: scheduleId },
      include: { availability: true }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

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

    return NextResponse.json(formattedSchedule)
  } catch (error) {
    console.error('Error fetching schedule:', error)
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
    const scheduleId = parseInt(resolvedParams.id)
    const body = await request.json()
    const { dayName, startTime, endTime } = body

    // Validate required fields
    if (!dayName || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    const schedule = await (prisma as any).availabilitySchedule.update({
      where: { id: scheduleId },
      data: {
        dayName,
        startTime: new Date(`1970-01-01T${startTime}:00.000Z`),
        endTime: new Date(`1970-01-01T${endTime}:00.000Z`),
        storeCode: process.env.STORE_CODE || null
      },
      include: { availability: true }
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

    return NextResponse.json(formattedSchedule)
  } catch (error) {
    console.error('Error updating schedule:', error)
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
    const scheduleId = parseInt(resolvedParams.id)

    await (prisma as any).availabilitySchedule.delete({
      where: { id: scheduleId }
    })

    return NextResponse.json({ message: 'Schedule deleted successfully' })
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

