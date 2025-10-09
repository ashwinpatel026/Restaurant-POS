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

    const prepStations = await prisma.prepStation.findMany({
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json(prepStations)
  } catch (error) {
    console.error('Error fetching prep stations:', error)
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
    const { prepStationName, stationId, sendToExpediter, alwaysPrintTicket, printerCode, isActive } = body

    // Validate required fields
    if (!prepStationName) {
      return NextResponse.json(
        { error: 'Prep station name is required' },
        { status: 400 }
      )
    }

    // Generate prep station code automatically
    const prepStationCode = await generateUniqueCode('prepStation', 'prepStationCode')

    const prepStation = await prisma.prepStation.create({
      data: {
        prepStationCode,
        prepStationName,
        stationId: stationId ? parseInt(stationId) : null,
        isActive: isActive ? 1 : 0,
        sendToExpediter: sendToExpediter ? 1 : 0,
        alwaysPrintTicket: alwaysPrintTicket ? 1 : 0,
        printerCode: printerCode || null,
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null
      }
    })

    return NextResponse.json(prepStation, { status: 201 })
  } catch (error: any) {
    console.error('Error creating prep station:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Prep station code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
