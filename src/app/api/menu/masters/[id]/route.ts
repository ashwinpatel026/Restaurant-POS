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
    const masterId = BigInt(resolvedParams.id)

    const menuMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: masterId }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Convert BigInt to string for JSON serialization
    const menuWithStringId = {
      ...menuMaster,
      menuMasterId: menuMaster.menuMasterId.toString()
    }

    return NextResponse.json(menuWithStringId)
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
    const session = await getServerSession(authOptions)
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const masterId = BigInt(resolvedParams.id)
    const body = await request.json()

    const {
      name,
      labelName,
      colorCode,
      prepZoneCodes,
      stationCodes,
      eventCode,
      currentEventCode,
      isEventMenu,
      isActive
    } = body

    // Get the menu master to get its code
    const existingMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: masterId }
    })

    if (!existingMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Update menu master
    const updateData = {
      name,
      labelName: labelName || null,
      colorCode: colorCode || null,
      prepZoneCode: prepZoneCodes && prepZoneCodes.length > 0 ? prepZoneCodes : null,
      stationCode: stationCodes && stationCodes.length > 0 ? stationCodes : null,
      isEventMenu: isEventMenu || 0,
      isActive: isActive ?? 1,
      updatedBy: parseInt(session.user.id),
      updatedOn: new Date()
    }

    const menuMaster = await prisma.menuMaster.update({
      where: { menuMasterId: masterId },
      data: updateData
    })

    // Handle event association
    if (currentEventCode && currentEventCode !== eventCode) {
      // Remove old event association
      await prisma.menuMasterEvent.deleteMany({
        where: {
          menuMasterCode: existingMaster.menuMasterCode,
          eventCode: currentEventCode
        }
      })
    }

    if (eventCode && isEventMenu === 1) {
      // Check if association already exists
      const existingAssoc = await prisma.menuMasterEvent.findFirst({
        where: {
          menuMasterCode: existingMaster.menuMasterCode,
          eventCode: eventCode
        }
      })

      // Create new association if it doesn't exist
      if (!existingAssoc) {
        await prisma.menuMasterEvent.create({
          data: {
            menuMasterCode: existingMaster.menuMasterCode,
            eventCode: eventCode,
            createdBy: parseInt(session.user.id),
            storeCode: process.env.STORE_CODE || null
          }
        })
      }
    } else if (!eventCode && currentEventCode) {
      // Remove all event associations if no event is selected
      await prisma.menuMasterEvent.deleteMany({
        where: {
          menuMasterCode: existingMaster.menuMasterCode
        }
      })
    }

    // Convert BigInt to string for JSON serialization
    const menuWithStringId = {
      ...menuMaster,
      menuMasterId: menuMaster.menuMasterId.toString()
    }

    return NextResponse.json(menuWithStringId)
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
    const session = await getServerSession(authOptions)
    
    if (!session || !['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const masterId = BigInt(resolvedParams.id)

    // Check if menu master exists
    const menuMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: masterId }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Check if menu master has any categories
    const categoriesCount = await prisma.menuCategory.count({
      where: { menuMasterCode: menuMaster.menuMasterCode }
    })

    // If menu master has categories, prevent deletion
    if (categoriesCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete menu master "${menuMaster.name}" because it contains ${categoriesCount} categor(ies). Please delete all categories first.` 
      }, { status: 400 })
    }

    // Delete associated menu master events first
    await prisma.menuMasterEvent.deleteMany({
      where: { menuMasterCode: menuMaster.menuMasterCode }
    })

    // Safe to delete the menu master
    await prisma.menuMaster.delete({
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
