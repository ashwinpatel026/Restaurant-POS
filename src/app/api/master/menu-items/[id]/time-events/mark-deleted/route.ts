import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// POST endpoint to mark all time events for a menu item as deleted
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

    // Mark all existing time events for this menu item as deleted
    const updateResult = await masterPrisma.masterMenuItemTimeEvent.updateMany({
      where: {
        menuItemCode: body.menuItemCode,
        isDelete: false, // Only update non-deleted records
      },
      data: {
        isDelete: true,
        updatedBy: admin.adminId,
        updatedOn: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      markedDeleted: updateResult.count,
    })
  } catch (error: any) {
    console.error('Error marking time events as deleted:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
