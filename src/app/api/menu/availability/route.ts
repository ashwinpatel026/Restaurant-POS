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

    const availability = await prisma.availability.findMany({
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json(availability)
  } catch (error) {
    console.error('Error fetching availability:', error)
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
    const { avaiDays, avilTime } = body

    const availability = await prisma.availability.create({
      data: {
        avaiDays,
        avilTime,
        createdBy: parseInt(session.user.id),
        storeCode: 'MAIN'
      }
    })

    return NextResponse.json(availability, { status: 201 })
  } catch (error) {
    console.error('Error creating availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
