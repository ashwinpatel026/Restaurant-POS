import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to generate unique prep zone code
async function generatePrepZoneCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}PZ`
  
  // Get all prep zone codes that match the WL pattern for this store
  const prepZones = await prisma.prepZone.findMany({
    where: {
      prepZoneCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { prepZoneCode: true },
    orderBy: { prepZoneId: 'desc' }
  })

  let nextNumber = 1
  
  if (prepZones.length > 0) {
    // Extract number from codes like "WLLOC01PZ1", "WLLOC01PZ2", etc.
    const numbers = prepZones
      .map(prepZone => {
        const match = prepZone.prepZoneCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter(num => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + PZ + number starting from 1
  return `${prefix}${nextNumber}`
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const prepZones = await prisma.prepZone.findMany({
      where: {
        ...storeFilter
      },
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
    const { prepZoneName, stationCode, sendToExpediter, alwaysPrintTicket, printerCode, backupPrinterCode, isActive } = body

    // Validate required fields
    if (!prepZoneName) {
      return NextResponse.json(
        { error: 'Prep zone name is required' },
        { status: 400 }
      )
    }

    // Generate unique prep zone code for the selected store
    const prepZoneCode = await generatePrepZoneCode(selectedStoreCode)

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
        storeCode: selectedStoreCode,
        syncSource: 'location' // Set sync_source to 'location' when created from dashboard
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
