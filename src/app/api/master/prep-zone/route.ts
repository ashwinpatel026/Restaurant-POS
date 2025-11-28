import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to generate unique prep zone code
async function generatePrepZoneCode(): Promise<string> {
  // Get the latest prep zone code from master database
  const latestZone = await masterPrisma.masterPrepZone.findFirst({
    orderBy: { prepZoneId: 'desc' },
    select: { prepZoneCode: true }
  })

  let nextNumber = 1
  
  if (latestZone?.prepZoneCode) {
    // Extract number from code like "PZ1", "PZ2", etc.
    const match = latestZone.prepZoneCode.match(/^PZ(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as PZ + number starting from 1
  return `PZ${nextNumber}`
}

// Helper function to map prep zone response
function mapPrepZoneResponse(zone: any) {
  return {
    ...zone,
    prepZoneId: zone.prepZoneId.toString(),
    createdBy: zone.createdBy ? zone.createdBy.toString() : null,
    createdOn: zone.createdOn ? zone.createdOn.toISOString() : null,
    updatedBy: zone.updatedBy ? zone.updatedBy.toString() : null,
    updatedOn: zone.updatedOn ? zone.updatedOn.toISOString() : null
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prepZones = await masterPrisma.masterPrepZone.findMany({
      orderBy: { createdOn: 'desc' }
    })

    const zonesWithStringId = prepZones.map(mapPrepZoneResponse)

    return NextResponse.json(zonesWithStringId)
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
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
    const prepZoneCode = await generatePrepZoneCode()

    const prepZone = await masterPrisma.masterPrepZone.create({
      data: {
        prepZoneCode,
        prepZoneName,
        stationCode: stationCode || null,
        isActive: isActive ? 1 : 0,
        sendToExpediter: sendToExpediter ? 1 : 0,
        alwaysPrintTicket: alwaysPrintTicket ? 1 : 0,
        printerCode: printerCode || null,
        backupPrinterCode: backupPrinterCode || null,
        createdBy: admin.adminId
      }
    })

    return NextResponse.json(mapPrepZoneResponse(prepZone), { status: 201 })
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

