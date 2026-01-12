import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, canAccessStore, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view modifiers
    if (!(await checkLocationPermission(session.user.role, 'modifiers.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    const { id } = await params
    const itemId = BigInt(id)
    const item = await (prisma as any).modifierItem.findUnique({ where: { id: itemId } })
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // If storeCode is provided, verify the item belongs to that store or user has access
    if (selectedStoreCode && item.storeCode !== selectedStoreCode) {
      if (!canAccessStore(accessInfo, item.storeCode || '')) {
        return NextResponse.json({ error: 'Modifier item not found' }, { status: 404 })
      }
    }

    const data: any = { ...item, id: item.id.toString() }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching modifier item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Check permission to update modifiers
    if (!(await checkLocationPermission(session.user.role, 'modifiers.update'))) {
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
    const itemId = BigInt(id)
    
    // First check if item exists and belongs to the selected store
    const existingItem = await (prisma as any).modifierItem.findUnique({ 
      where: { id: itemId } 
    })
    
    if (!existingItem) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Verify user has access to this item's store
    if (existingItem.storeCode && !canAccessStore(accessInfo, existingItem.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const {
      modifierGroupCode,
      name,
      labelName,
      colorCode,
      forColorCode,
      price,
      isDefault,
      displayOrder,
      groupCode,
      isActive,
    } = body

    const updated = await (prisma as any).modifierItem.update({
      where: { id: itemId },
      data: {
        modifierGroupCode: modifierGroupCode ?? null,
        name: name ?? null,
        labelName: labelName ?? null,
        colorCode: colorCode ?? null,
        forColorCode: forColorCode ?? null,
        price: price ?? null,
        isDefault: typeof isDefault === 'number' ? isDefault : undefined,
        displayOrder: typeof displayOrder === 'number' ? displayOrder : null,
        groupCode: groupCode ?? null,
        isActive: typeof isActive === 'number' ? isActive : undefined,
        // Keep the original storeCode, don't change it
        storeCode: existingItem.storeCode || selectedStoreCode,
        // Set sync_source to 'location' when updated from dashboard
        syncSource: 'location'
      },
    })

    const data: any = { ...updated, id: updated.id.toString() }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating modifier item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to delete modifiers
    if (!(await checkLocationPermission(session.user.role, 'modifiers.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    const { id } = await params
    const itemId = BigInt(id)

    const exist = await (prisma as any).modifierItem.findUnique({ where: { id: itemId } })
    if (!exist) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Verify user has access to this item's store
    if (exist.storeCode && !canAccessStore(accessInfo, exist.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await (prisma as any).modifierItem.delete({ where: { id: itemId } })
    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Error deleting modifier item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


