import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { generateUniqueCode } from '@/lib/codeGenerator'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const availability = await prisma.availability.findMany({
      include: {
        schedules: {
          orderBy: { dayName: 'asc' }
        }
      },
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
    const { avaiName, isActive } = body

    // Validate required fields
    if (!avaiName) {
      return NextResponse.json(
        { error: 'Availability name is required' },
        { status: 400 }
      )
    }

    // Generate availability code automatically
    const avaiCode = await generateUniqueCode('availability' as any, 'avaiCode')

    // Create availability record
    const availability = await prisma.availability.create({
      data: {
        avaiCode,
        avaiName,
        isActive: isActive ? 1 : 0,
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null
      }
    })

    return NextResponse.json(availability, { status: 201 })
  } catch (error: any) {
    console.error('Error creating availability:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Availability code or name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
