import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/menu-items/[id]
 * Get a specific menu item by ID or code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Try to find by ID first, then by menuItemCode
    let menuItem = null
    const itemId = BigInt(id)
    
    try {
      menuItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemId: itemId,
          storeCode
        }
      })
    } catch {
      // If BigInt conversion fails, try by code
    }

    if (!menuItem) {
      menuItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemCode: id,
          storeCode
        }
      })
    }

    if (!menuItem || menuItem.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...menuItem,
        menuItemId: menuItem.menuItemId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/pos/sync/[storeCode]/menu-items/[id]
 * Update a menu item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Find existing menu item
    let existingItem = null
    const itemId = BigInt(id)
    
    try {
      existingItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemId: itemId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingItem) {
      existingItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemCode: id,
          storeCode
        }
      })
    }

    if (!existingItem || existingItem.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      )
    }

    // Prepare update data with POS sync metadata
    const updateData: any = addPOSSyncMetadata({
      updatedBy: body.updatedBy ? parseInt(body.updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingItem.syncId

    // Update allowed fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.kitchenName !== undefined) updateData.kitchenName = body.kitchenName
    if (body.labelName !== undefined) updateData.labelName = body.labelName
    if (body.cashPrice !== undefined) updateData.cashPrice = body.cashPrice ? parseFloat(body.cashPrice) : null
    if (body.cardPrice !== undefined) updateData.cardPrice = body.cardPrice ? parseFloat(body.cardPrice) : null
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0
    if (body.description !== undefined) updateData.description = body.description
    if (body.stockinhand !== undefined) updateData.stockinhand = body.stockinhand ? parseFloat(body.stockinhand) : null

    // Update menu item
    const updatedItem = await locationPrisma.menuItem.update({
      where: { menuItemId: existingItem.menuItemId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Menu item updated successfully',
      data: {
        ...updatedItem,
        menuItemId: updatedItem.menuItemId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/pos/sync/[storeCode]/menu-items/[id]
 * Delete a menu item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Find existing menu item
    let existingItem = null
    const itemId = BigInt(id)
    
    try {
      existingItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemId: itemId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingItem) {
      existingItem = await locationPrisma.menuItem.findFirst({
        where: {
          menuItemCode: id,
          storeCode
        }
      })
    }

    if (!existingItem || existingItem.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      )
    }

    // Delete menu item
    await locationPrisma.menuItem.delete({
      where: { menuItemId: existingItem.menuItemId }
    })

    return NextResponse.json({
      success: true,
      message: 'Menu item deleted successfully',
      data: {
        menuItemCode: existingItem.menuItemCode,
        menuItemId: existingItem.menuItemId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

