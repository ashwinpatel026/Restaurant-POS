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
    const availabilityId = parseInt(resolvedParams.id)

    const availability = await prisma.availability.findUnique({
      where: { availabilityId: availabilityId }
    })

    if (!availability) {
      return NextResponse.json({ error: 'Availability not found' }, { status: 404 })
    }

    return NextResponse.json(availability)
  } catch (error) {
    console.error('Error fetching availability:', error)
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
    const availabilityId = parseInt(resolvedParams.id)
    const body = await request.json()

    const { avaiDays, avilTime } = body

    const availability = await prisma.availability.update({
      where: { availabilityId: availabilityId },
      data: {
        avaiDays,
        avilTime
      }
    })

    return NextResponse.json(availability)
  } catch (error) {
    console.error('Error updating availability:', error)
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
    const availabilityId = parseInt(resolvedParams.id)

    await prisma.availability.delete({
      where: { availabilityId: availabilityId }
    })

    return NextResponse.json({ message: 'Availability deleted successfully' })
  } catch (error) {
    console.error('Error deleting availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
