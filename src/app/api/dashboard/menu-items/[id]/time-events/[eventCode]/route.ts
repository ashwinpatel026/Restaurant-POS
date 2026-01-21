import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, checkLocationPermission, canAccessStore } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventCode: string }> }
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

    const { id: menuItemId, eventCode } = await params
    const body = await request.json()
    const { formulaValue } = body

    if (formulaValue === undefined || formulaValue === null) {
      return NextResponse.json(
        { error: 'Formula value is required' },
        { status: 400 }
      )
    }

    const formulaValueNum = parseFloat(formulaValue)
    if (isNaN(formulaValueNum)) {
      return NextResponse.json(
        { error: 'Invalid formula value provided' },
        { status: 400 }
      )
    }

    const menuItem = await prisma.menuItem.findUnique({
      where: { menuItemId: BigInt(menuItemId) },
      select: { menuItemCode: true, storeCode: true }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Verify user has access to this menu item's store
    if (menuItem.storeCode && !canAccessStore(accessInfo, menuItem.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const timeEvent = await prisma.timeEvent.findFirst({
      where: {
        eventCode: eventCode,
        storeCode: selectedStoreCode
      },
      select: { byFixedValue: true }
    })

    if (!timeEvent) {
      return NextResponse.json({ error: 'Time event not found for this store' }, { status: 404 })
    }

    // Check if record already exists
    const existing = await (prisma as any).menuItemTimeEvent.findFirst({
      where: {
        menuItemCode: menuItem.menuItemCode!,
        timeEventCode: eventCode,
        storeCode: selectedStoreCode
      }
    })

    let upsertResult
    if (existing) {
      // Update existing record
      upsertResult = await (prisma as any).menuItemTimeEvent.update({
        where: { menuItemTimeEventId: existing.menuItemTimeEventId },
        data: {
          formulaValue: formulaValueNum,
          isFixedValue: timeEvent.byFixedValue,
          updatedBy: BigInt(parseInt(session.user.id)),
          updatedOn: new Date(),
        },
      })
    } else {
      // Generate code for new record
      const prefix = `WL${selectedStoreCode}MT`
      const menuItemTimeEvents = await (prisma as any).menuItemTimeEvent.findMany({
        where: {
          menuItemTimeEventCode: {
            startsWith: prefix
          },
          storeCode: selectedStoreCode
        },
        select: { menuItemTimeEventCode: true },
        orderBy: { menuItemTimeEventId: 'desc' }
      })

      let nextNumber = 1
      if (menuItemTimeEvents.length > 0) {
        const numbers = menuItemTimeEvents
          .map((item: { menuItemTimeEventCode: string | null }) => {
            const match = item.menuItemTimeEventCode?.match(new RegExp(`^${prefix}(\\d+)$`))
            return match ? parseInt(match[1]) : 0
          })
          .filter((num: number) => num > 0)

        if (numbers.length > 0) {
          nextNumber = Math.max(...numbers) + 1
        }
      }
      const menuItemTimeEventCode = `${prefix}${nextNumber}`

      // Create new record
      upsertResult = await (prisma as any).menuItemTimeEvent.create({
        data: {
          menuItemTimeEventCode: menuItemTimeEventCode,
          menuItemCode: menuItem.menuItemCode!,
          timeEventCode: eventCode,
          formulaValue: formulaValueNum,
          isFixedValue: timeEvent.byFixedValue,
          storeCode: selectedStoreCode,
          createdBy: BigInt(parseInt(session.user.id)),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...upsertResult,
        menuItemTimeEventId: upsertResult.menuItemTimeEventId.toString(),
        formulaValue: upsertResult.formulaValue ? Number(upsertResult.formulaValue) : null,
        createdBy: upsertResult.createdBy?.toString() || null,
        updatedBy: upsertResult.updatedBy?.toString() || null,
      },
    })
  } catch (error: any) {
    console.error('Error updating menu item time event formula value:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A record with this menu item and time event already exists.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
