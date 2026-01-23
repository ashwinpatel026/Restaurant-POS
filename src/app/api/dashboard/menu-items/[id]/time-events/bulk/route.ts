import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, checkLocationPermission, canAccessStore } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to generate unique menu item time event code with WL{storeCode}MT prefix
async function generateMenuItemTimeEventCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}MT`
  
  // Get all menu item time event codes that match the WL pattern for this store
  const menuItemTimeEvents = await prisma.menuItemTimeEvent.findMany({
    where: {
      menuItemTimeEventCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { menuItemTimeEventCode: true },
    orderBy: { menuItemTimeEventId: 'desc' }
  })

  let nextNumber = 1
  
  if (menuItemTimeEvents.length > 0) {
    // Extract number from codes like "WLSTORE01MT1", "WLSTORE01MT2", etc.
    const numbers = menuItemTimeEvents
      .map(item => {
        const match = item.menuItemTimeEventCode?.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL{storeCode}MT + number starting from 1
  return `${prefix}${nextNumber}`
}

// POST endpoint to bulk create/update menu item time events
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

    const { id } = await params
    const body = await request.json()

    // Validate request body
    if (!body.menuItemCode) {
      return NextResponse.json(
        { error: 'menuItemCode is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.timeEvents)) {
      return NextResponse.json(
        { error: 'timeEvents must be an array' },
        { status: 400 }
      )
    }

    // Get menu item to verify it exists and user has access
    const menuItem = await prisma.menuItem.findUnique({
      where: { menuItemId: BigInt(id) },
      select: { menuItemCode: true, storeCode: true }
    })

    if (!menuItem || menuItem.menuItemCode !== body.menuItemCode) {
      return NextResponse.json(
        { error: 'Menu item not found or menuItemCode mismatch' },
        { status: 404 }
      )
    }

    // Verify user has access to this menu item's store
    if (menuItem.storeCode && !canAccessStore(accessInfo, menuItem.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const results = []
    const errors = []

    // Process each time event
    for (const timeEventData of body.timeEvents) {
      try {
        const {
          timeEventCode,
          formulaValue,
          isFixedValue,
          isDelete = false,
          isOverride = false
        } = timeEventData

        if (!timeEventCode) {
          errors.push({ timeEventCode: 'Missing timeEventCode' })
          continue
        }

        // Verify time event exists and belongs to the store
        const timeEvent = await prisma.timeEvent.findFirst({
          where: { 
            eventCode: timeEventCode,
            storeCode: selectedStoreCode
          },
          select: { byFixedValue: true }
        })

        if (!timeEvent) {
          errors.push({ timeEventCode: `Time event ${timeEventCode} not found for this store` })
          continue
        }

        // Use isFixedValue from time event if not provided
        const finalIsFixedValue = isFixedValue !== undefined ? isFixedValue : timeEvent.byFixedValue || false

        // Check if record already exists
        const existing = await prisma.menuItemTimeEvent.findFirst({
          where: {
            menuItemCode: body.menuItemCode,
            timeEventCode: timeEventCode,
            storeCode: selectedStoreCode
          }
        })

        if (existing) {
          // Update existing record - generate code if it doesn't exist
          const updateData: any = {
            formulaValue: formulaValue !== undefined && formulaValue !== null ? parseFloat(formulaValue.toString()) : null,
            isFixedValue: finalIsFixedValue,
            isDelete: Boolean(isDelete),
            isOverride: Boolean(isOverride),
            updatedBy: BigInt(parseInt(session.user.id)),
            updatedOn: new Date()
          }
          
          // Generate code if existing record doesn't have one
          if (!existing.menuItemTimeEventCode) {
            updateData.menuItemTimeEventCode = await generateMenuItemTimeEventCode(selectedStoreCode)
          }
          
          const updated = await prisma.menuItemTimeEvent.update({
            where: { menuItemTimeEventId: existing.menuItemTimeEventId },
            data: updateData
          })
          results.push({
            menuItemTimeEventId: updated.menuItemTimeEventId.toString(),
            menuItemTimeEventCode: updated.menuItemTimeEventCode,
            timeEventCode: updated.timeEventCode,
            success: true
          })
        } else {
          // Create new record
          const menuItemTimeEventCode = await generateMenuItemTimeEventCode(selectedStoreCode)
          const created = await prisma.menuItemTimeEvent.create({
            data: {
              menuItemTimeEventCode: menuItemTimeEventCode,
              menuItemCode: body.menuItemCode,
              timeEventCode: timeEventCode,
              formulaValue: formulaValue !== undefined && formulaValue !== null ? parseFloat(formulaValue.toString()) : null,
              isFixedValue: finalIsFixedValue,
              isDelete: Boolean(isDelete),
              isOverride: Boolean(isOverride),
              storeCode: selectedStoreCode,
              createdBy: BigInt(parseInt(session.user.id))
            }
          })
          results.push({
            menuItemTimeEventId: created.menuItemTimeEventId.toString(),
            menuItemTimeEventCode: created.menuItemTimeEventCode,
            timeEventCode: created.timeEventCode,
            success: true
          })
        }
      } catch (error: any) {
        console.error(`Error processing time event ${timeEventData.timeEventCode}:`, error)
        errors.push({
          timeEventCode: timeEventData.timeEventCode,
          error: error.message || 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      created: results.length,
      errorCount: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('Error bulk saving menu item time events:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
