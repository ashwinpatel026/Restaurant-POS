import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

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
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const masterId = BigInt(resolvedParams.id)

    const menuMaster = await masterPrisma.masterMenuMaster.findUnique({
      where: { menuMasterId: masterId }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    return NextResponse.json(mapMenuMasterResponse(menuMaster))
  } catch (error) {
    console.error('Error fetching menu master:', error)
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
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const masterId = BigInt(resolvedParams.id)
    const body = await request.json()

    const {
      name,
      labelName,
      colorCode,
      forColorCode,
      prepZoneCodes,
      stationCodes,
      eventCode,
      currentEventCode,
      isEventMenu,
      isActive
    } = body

    // Get the menu master to get its code
    const existingMaster = await masterPrisma.masterMenuMaster.findUnique({
      where: { menuMasterId: masterId }
    })

    if (!existingMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Update menu master
    const updateData: any = {
      name: name || null,
      labelName: labelName || null,
      colorCode: colorCode || null,
      forColorCode: forColorCode || null,
      prepZoneCode: prepZoneCodes && prepZoneCodes.length > 0 ? prepZoneCodes : null,
      stationCode: stationCodes && stationCodes.length > 0 ? stationCodes : null,
      isEventMenu: isEventMenu || 0,
      isActive: isActive ?? 1,
      updatedBy: admin.adminId,
      updatedOn: new Date()
    }

    const menuMaster = await masterPrisma.masterMenuMaster.update({
      where: { menuMasterId: masterId },
      data: updateData
    })

    // Handle event associations
    if (currentEventCode && currentEventCode !== eventCode) {
      // Remove old event association
      await masterPrisma.masterMenuMasterEvent.deleteMany({
        where: {
          menuMasterCode: existingMaster.menuMasterCode,
          eventCode: currentEventCode
        }
      })
    }

    if (eventCode && isEventMenu === 1) {
      // Check if association already exists
      const existingAssoc = await masterPrisma.masterMenuMasterEvent.findFirst({
        where: {
          menuMasterCode: existingMaster.menuMasterCode,
          eventCode: eventCode
        }
      })

      // Create new association if it doesn't exist
      if (!existingAssoc) {
        await masterPrisma.masterMenuMasterEvent.create({
          data: {
            menuMasterCode: existingMaster.menuMasterCode,
            eventCode: eventCode,
            createdBy: admin.adminId,
          }
        })
      }
    } else if (!eventCode && currentEventCode) {
      // Remove all event associations if no event is selected
      await masterPrisma.masterMenuMasterEvent.deleteMany({
        where: {
          menuMasterCode: existingMaster.menuMasterCode
        }
      })
    }

    return NextResponse.json(mapMenuMasterResponse(menuMaster))
  } catch (error) {
    console.error('Error updating menu master:', error)
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
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const masterId = BigInt(resolvedParams.id)

    // Check if menu master exists
    const menuMaster = await masterPrisma.masterMenuMaster.findUnique({
      where: { menuMasterId: masterId }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Check if menu master has any categories
    const categoriesCount = await masterPrisma.masterMenuCategory.count({
      where: { menuMasterCode: menuMaster.menuMasterCode }
    })

    // If menu master has categories, prevent deletion
    if (categoriesCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete menu master "${menuMaster.name}" because it contains ${categoriesCount} categor(ies). Please delete all categories first.` 
      }, { status: 400 })
    }

    // Delete associated menu master events first
    await masterPrisma.masterMenuMasterEvent.deleteMany({
      where: { menuMasterCode: menuMaster.menuMasterCode }
    })

    // Safe to delete the menu master
    await masterPrisma.masterMenuMaster.delete({
      where: { menuMasterId: masterId }
    })

    return NextResponse.json({ message: 'Menu master deleted successfully' })
  } catch (error) {
    console.error('Error deleting menu master:', error)
    
    // Handle foreign key constraint error specifically
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json({ 
        error: 'Cannot delete this menu master because it has related categories and menu items. Please delete all categories and items first.' 
      }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

