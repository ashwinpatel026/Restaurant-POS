import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { checkDuplicate } from '@/lib/validation'

// Helper function to generate unique menu master code
async function generateMenuMasterCode(): Promise<string> {
  const latestMaster = await masterPrisma.masterMenuMaster.findFirst({
    orderBy: { menuMasterId: 'desc' },
    select: { menuMasterCode: true }
  })

  let nextNumber = 1

  if (latestMaster?.menuMasterCode) {
    // Extract number from code like "MM1", "MM2", etc.
    const match = latestMaster.menuMasterCode.match(/^MM(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }

  // Format as MM + number starting from 1
  return `MM${nextNumber}`
}

// Helper function to map menu master response
function mapMenuMasterResponse(menuMaster: any) {
  return {
    ...menuMaster,
    menuMasterId: menuMaster.menuMasterId.toString(),
    createdBy: menuMaster.createdBy?.toString() || null,
    updatedBy: menuMaster.updatedBy?.toString() || null,
    createdOn: menuMaster.createdOn?.toISOString() || null,
    updatedOn: menuMaster.updatedOn?.toISOString() || null,
    // Handle JSON fields
    prepZoneCode: menuMaster.prepZoneCode ? (typeof menuMaster.prepZoneCode === 'string' ? JSON.parse(menuMaster.prepZoneCode) : menuMaster.prepZoneCode) : null,
    stationCode: menuMaster.stationCode ? (typeof menuMaster.stationCode === 'string' ? JSON.parse(menuMaster.stationCode) : menuMaster.stationCode) : null,
    deptCode: menuMaster.deptCode || null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const menuMasters = await masterPrisma.masterMenuMaster.findMany({
      orderBy: { createdOn: 'desc' }
    })

    const mappedMasters = menuMasters.map(mapMenuMasterResponse)

    return NextResponse.json(mappedMasters)
  } catch (error) {
    console.error('Error fetching menu masters:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      labelName,
      colorCode,
      forColorCode,
      prepZoneCodes,
      stationCodes,
      eventCodes,
      isEventMenu,
      isActive,
      deptCode
    } = body

    // Check for duplicate name
    if (name) {
      const isDuplicate = await checkDuplicate('masterMenuMaster', 'name', name)
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Menu master with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Generate unique menu master code
    const menuMasterCode = await generateMenuMasterCode()

    // Create menu master
    const createData: any = {
      menuMasterCode,
      name: name || null,
      labelName: labelName || null,
      colorCode: colorCode || null,
      forColorCode: forColorCode || null,
      deptCode: deptCode || null,
      prepZoneCode: prepZoneCodes && prepZoneCodes.length > 0 ? prepZoneCodes : null,
      stationCode: stationCodes && stationCodes.length > 0 ? stationCodes : null,
      isEventMenu: isEventMenu || 0,
      isActive: isActive ?? 1,
      createdBy: admin.adminId,
    }

    const menuMaster = await masterPrisma.masterMenuMaster.create({
      data: createData
    })

    // If this is an event menu, create associations for all event codes
    if (eventCodes && Array.isArray(eventCodes) && eventCodes.length > 0 && isEventMenu === 1) {
      for (const eventCode of eventCodes) {
        await masterPrisma.masterMenuMasterEvent.create({
          data: {
            menuMasterCode: menuMasterCode,
            eventCode: eventCode,
            createdBy: admin.adminId,
          }
        })
      }
    }

    return NextResponse.json(mapMenuMasterResponse(menuMaster), { status: 201 })
  } catch (error) {
    console.error('Error creating menu master:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

