import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, canAccessStore, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { softDeleteCategoriesAndItemsByMasterCode } from '@/lib/menuSoftDelete'
import { normalizeEventCodes, saveMenuMasterTimeEvents } from '@/lib/menuMasterTimeEvents'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view menu masters
    if (!(await checkLocationPermission(session.user.role, 'menu.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    const resolvedParams = await params
    const masterId = BigInt(resolvedParams.id)

    const menuMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: masterId }
    })

    if (!menuMaster || menuMaster.isDelete) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Validate store access
    if (selectedStoreCode && menuMaster.storeCode) {
      if (!canAccessStore(accessInfo, menuMaster.storeCode)) {
        return NextResponse.json(
          { error: 'Access denied to this store' },
          { status: 403 }
        )
      }
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

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to update menu masters
    if (!(await checkLocationPermission(session.user.role, 'menu.update'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

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
      eventCodes,
      isActive,
      disableInPOS,
      deptCode
    } = body

    // Get the menu master to get its code
    const existingMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: masterId }
    })

    if (!existingMaster || existingMaster.isDelete) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Validate store access
    if (existingMaster.storeCode) {
      if (!canAccessStore(accessInfo, existingMaster.storeCode)) {
        return NextResponse.json(
          { error: 'Access denied to this store' },
          { status: 403 }
        )
      }
    }

    const selectedEventCodes = normalizeEventCodes(eventCodes)
    const userId = parseInt(session.user.id)
    const storeCode = existingMaster.storeCode || selectedStoreCode || ''

    // Update menu master and persist selected time events on its menu items
    const updateData = {
      name,
      labelName: labelName || null,
      colorCode: colorCode || null,
      forColorCode: forColorCode || null,
      deptCode: deptCode || null,
      prepZoneCode: prepZoneCodes && prepZoneCodes.length > 0 ? prepZoneCodes : null,
      stationCode: stationCodes && stationCodes.length > 0 ? stationCodes : null,
      isEventMenu: selectedEventCodes.length > 0 ? 1 : 0,
      isActive: isActive ?? 1,
      disableInPOS: disableInPOS ?? 0,
      updatedBy: userId,
      updatedOn: new Date(),
      syncSource: 'location' // Set sync_source to 'location' when updated from dashboard
    }

    const menuMaster = await prisma.$transaction(async (tx) => {
      const updated = await tx.menuMaster.update({
        where: { menuMasterId: masterId },
        data: updateData
      })

      if (storeCode) {
        await saveMenuMasterTimeEvents(tx, {
          menuMasterCode: existingMaster.menuMasterCode,
          storeCode,
          eventCodes: selectedEventCodes,
          userId,
        })
      }

      return updated
    }, { timeout: 60000 })

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

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to delete menu masters
    if (!(await checkLocationPermission(session.user.role, 'menu.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    const resolvedParams = await params
    const masterId = BigInt(resolvedParams.id)

    // Check if menu master exists
    const menuMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: masterId }
    })

    if (!menuMaster || menuMaster.isDelete) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Validate store access
    if (menuMaster.storeCode) {
      if (!canAccessStore(accessInfo, menuMaster.storeCode)) {
        return NextResponse.json(
          { error: 'Access denied to this store' },
          { status: 403 }
        )
      }
    }

    const updatedBy = parseInt(session.user.id)

    // Soft delete master, then cascade to categories and items
    await prisma.menuMaster.update({
      where: { menuMasterId: masterId },
      data: {
        isActive: 0,
        isDelete: true,
        updatedBy,
        updatedOn: new Date(),
        syncSource: 'location',
      }
    })

    await softDeleteCategoriesAndItemsByMasterCode(menuMaster.menuMasterCode, {
      updatedBy,
      syncSource: 'location',
    })

    return NextResponse.json({ message: 'Menu master deleted successfully' })
  } catch (error) {
    console.error('Error deleting menu master:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
