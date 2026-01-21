import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to generate unique menu item time event code with MT prefix
async function generateMenuItemTimeEventCode(): Promise<string> {
  // Get the latest code with MT prefix
  const latest = await masterPrisma.masterMenuItemTimeEvent.findFirst({
    where: {
      menuItemTimeEventCode: {
        startsWith: 'MT'
      }
    },
    orderBy: { menuItemTimeEventId: 'desc' },
    select: { menuItemTimeEventCode: true }
  })

  let nextNumber = 1
  
  if (latest?.menuItemTimeEventCode) {
    // Extract number from code like "MT1", "MT2", etc.
    const match = latest.menuItemTimeEventCode.match(/^MT(\d+)$/i)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as MT + number starting from 1
  return `MT${nextNumber}`
}

// POST endpoint to bulk create/update menu item time events
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get menu item to verify it exists
    const menuItem = await masterPrisma.masterMenuItem.findUnique({
      where: { menuItemId: BigInt(id) },
      select: { menuItemCode: true }
    })

    if (!menuItem || menuItem.menuItemCode !== body.menuItemCode) {
      return NextResponse.json(
        { error: 'Menu item not found or menuItemCode mismatch' },
        { status: 404 }
      )
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

        // Verify time event exists
        const timeEvent = await masterPrisma.masterTimeEvent.findUnique({
          where: { eventCode: timeEventCode },
          select: { byFixedValue: true }
        })

        if (!timeEvent) {
          errors.push({ timeEventCode: `Time event ${timeEventCode} not found` })
          continue
        }

        // Use isFixedValue from time event if not provided
        const finalIsFixedValue = isFixedValue !== undefined ? isFixedValue : timeEvent.byFixedValue || false

        // Check if record already exists
        const existing = await masterPrisma.masterMenuItemTimeEvent.findFirst({
          where: {
            menuItemCode: body.menuItemCode,
            timeEventCode: timeEventCode
          }
        })

        if (existing) {
          // Update existing record
          const updated = await masterPrisma.masterMenuItemTimeEvent.update({
            where: { menuItemTimeEventId: existing.menuItemTimeEventId },
            data: {
              formulaValue: formulaValue !== undefined && formulaValue !== null ? parseFloat(formulaValue.toString()) : null,
              isFixedValue: finalIsFixedValue,
              isDelete: Boolean(isDelete),
              isOverride: Boolean(isOverride),
              updatedBy: admin.adminId,
              updatedOn: new Date()
            }
          })
          results.push({
            menuItemTimeEventId: updated.menuItemTimeEventId.toString(),
            menuItemTimeEventCode: updated.menuItemTimeEventCode,
            timeEventCode: updated.timeEventCode,
            success: true
          })
        } else {
          // Create new record
          const menuItemTimeEventCode = await generateMenuItemTimeEventCode()
          const created = await masterPrisma.masterMenuItemTimeEvent.create({
            data: {
              menuItemTimeEventCode: menuItemTimeEventCode,
              menuItemCode: body.menuItemCode,
              timeEventCode: timeEventCode,
              formulaValue: formulaValue !== undefined && formulaValue !== null ? parseFloat(formulaValue.toString()) : null,
              isFixedValue: finalIsFixedValue,
              isDelete: Boolean(isDelete),
              isOverride: Boolean(isOverride),
              createdBy: admin.adminId
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
      errors: errors.length,
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
