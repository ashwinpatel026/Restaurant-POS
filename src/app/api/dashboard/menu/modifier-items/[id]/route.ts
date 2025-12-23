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

    const resolvedParams = await params
    const itemId = BigInt(resolvedParams.id)

    const modifierItem = await (prisma as any).modifierItem.findUnique({
      where: { id: itemId },
      include: {
        modifier: {
          include: {
            menuItem: {
              include: {
                menuCategory: {
                  include: {
                    menuMaster: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!modifierItem) {
      return NextResponse.json({ error: 'Modifier item not found' }, { status: 404 })
    }

    // If storeCode is provided, verify the item belongs to that store or user has access
    if (selectedStoreCode && modifierItem.storeCode !== selectedStoreCode) {
      if (!canAccessStore(accessInfo, modifierItem.storeCode || '')) {
        return NextResponse.json({ error: 'Modifier item not found' }, { status: 404 })
      }
    }

    return NextResponse.json(modifierItem)
  } catch (error) {
    console.error('Error fetching modifier item:', error)
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

    const resolvedParams = await params
    const itemId = BigInt(resolvedParams.id)
    
    // First check if item exists and belongs to the selected store
    const existingItem = await (prisma as any).modifierItem.findUnique({
      where: { id: itemId }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Modifier item not found' }, { status: 404 })
    }

    // Verify user has access to this item's store
    if (existingItem.storeCode && !canAccessStore(accessInfo, existingItem.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()

    const { name, labelName, colorCode, price } = body;

    const modifierItem = await (prisma as any).modifierItem.update({
      where: { id: itemId },
      data: {
        name,
        labelName,
        colorCode,
        price: typeof price === 'number' ? price : (price ? parseFloat(price) : null),
        // Keep the original storeCode, don't change it
        storeCode: existingItem.storeCode || selectedStoreCode,
        // Set sync_source to 'location' when updated from dashboard
        syncSource: 'location'
      }
    })

    return NextResponse.json(modifierItem)
  } catch (error) {
    console.error('Error updating modifier item:', error)

    const err = error as { code?: string; message?: string } | undefined

    // Provide more specific error messages
    if (err?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Modifier item not found' },
        { status: 404 }
      )
    }

    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A modifier item with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: err?.message ?? 'Unknown error' },
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to delete modifiers
    if (!(await checkLocationPermission(session.user.role, 'modifiers.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    const resolvedParams = await params
    const itemId = BigInt(resolvedParams.id)

    // First check if item exists and user has access
    const existingItem = await (prisma as any).modifierItem.findUnique({
      where: { id: itemId }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Modifier item not found' }, { status: 404 })
    }

    // Verify user has access to this item's store
    if (existingItem.storeCode && !canAccessStore(accessInfo, existingItem.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await (prisma as any).modifierItem.delete({
      where: { id: itemId }
    })

    return NextResponse.json({ message: 'Modifier item deleted successfully' })
  } catch (error) {
    console.error('Error deleting modifier item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
