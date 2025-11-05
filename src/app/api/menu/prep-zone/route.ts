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

    const prepZones = await prisma.prepZone.findMany({
      orderBy: { createdOn: 'desc' }
    })

    // Convert BigInt to string for JSON serialization
    const serializedPrepZones = prepZones.map(prepZone => ({
      ...prepZone,
      prepZoneId: prepZone.prepZoneId.toString()
    }))

    // Cache response for 60 seconds
    return NextResponse.json(serializedPrepZones, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Error fetching prep zones:', error)
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
    const { prepZoneName, stationCode, sendToExpediter, alwaysPrintTicket, printerCode, backupPrinterCode, isActive } = body

    // Validate required fields
    if (!prepZoneName) {
      return NextResponse.json(
        { error: 'Prep zone name is required' },
        { status: 400 }
      )
    }

    // Generate prep zone code automatically
    const prepZoneCode = await generateUniqueCode('prepZone', 'prepZoneCode')

    const prepZone = await prisma.prepZone.create({
      data: {
        prepZoneCode,
        prepZoneName,
        stationCode: stationCode || null,
        isActive: isActive ? 1 : 0,
        sendToExpediter: sendToExpediter ? 1 : 0,
        alwaysPrintTicket: alwaysPrintTicket ? 1 : 0,
        printerCode: printerCode || null,
        backupPrinterCode: backupPrinterCode || null,
        createdBy: parseInt(session.user.id),
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        storeCode: process.env.STORE_CODE || null
      }
    })

    // Convert BigInt to string for JSON serialization
    const serializedPrepZone = {
      ...prepZone,
      prepZoneId: prepZone.prepZoneId.toString()
    }

    return NextResponse.json(serializedPrepZone, { status: 201 })
  } catch (error: any) {
    console.error('Error creating prep zone:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Prep zone code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
