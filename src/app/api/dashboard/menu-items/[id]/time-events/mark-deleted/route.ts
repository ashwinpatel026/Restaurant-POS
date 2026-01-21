import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, checkLocationPermission, canAccessStore } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to update menu items
    if (!(await checkLocationPermission(session.user.role, 'menu.update'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    const { id: menuItemId } = await params
    const body = await request.json()
    const { menuItemCode, oldDeptCode } = body

    if (!menuItemCode || !oldDeptCode) {
      return NextResponse.json(
        { error: 'menuItemCode and oldDeptCode are required' },
        { status: 400 }
      )
    }

    // Verify menu item exists and user has access
    const menuItem = await prisma.menuItem.findUnique({
      where: { menuItemId: BigInt(menuItemId) },
      select: { menuItemCode: true, storeCode: true }
    })

    if (!menuItem || menuItem.menuItemCode !== menuItemCode) {
      return NextResponse.json({ error: 'Menu item not found or menuItemCode mismatch' }, { status: 404 })
    }

    // Verify user has access to this menu item's store
    if (menuItem.storeCode && !canAccessStore(accessInfo, menuItem.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update all time events associated with this menu item and storeCode to mark as deleted
    const updateResult = await prisma.menuItemTimeEvent.updateMany({
      where: {
        menuItemCode: menuItemCode,
        storeCode: selectedStoreCode
      },
      data: {
        isDelete: true,
        updatedBy: BigInt(parseInt(session.user.id)),
        updatedOn: new Date(),
      },
    })

    return NextResponse.json({ success: true, markedDeleted: updateResult.count })
  } catch (error: any) {
    console.error('Error marking menu item time events as deleted:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
