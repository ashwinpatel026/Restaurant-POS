import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/menu-items
 * Get all menu items for a store
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const lastSyncAt = url.searchParams.get('lastSyncAt')
    const incremental = url.searchParams.get('incremental') === 'true'
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')

    // Build where clause
    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    // Build query options
    const queryOptions: any = {
      where,
      orderBy: { updatedOn: 'desc' }
    }

    if (limit) {
      queryOptions.take = parseInt(limit, 10)
    }

    if (offset) {
      queryOptions.skip = parseInt(offset, 10)
    }

    // Get menu items
    const [menuItems, totalCount] = await Promise.all([
      locationPrisma.menuItem.findMany(queryOptions),
      locationPrisma.menuItem.count({ where })
    ])

    return NextResponse.json({
      success: true,
      storeCode,
      count: menuItems.length,
      total: totalCount,
      pagination: {
        limit: limit ? parseInt(limit, 10) : null,
        offset: offset ? parseInt(offset, 10) : 0,
        total: totalCount
      },
      data: menuItems.map(item => ({
        ...item,
        menuItemId: item.menuItemId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pos/sync/[storeCode]/menu-items
 * Create a new menu item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

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

    const { menuItemCode, name, cashPrice, cardPrice, isActive = 1 } = body

    // Validate required fields
    if (!menuItemCode || !name) {
      return NextResponse.json(
        { error: 'menuItemCode and name are required' },
        { status: 400 }
      )
    }

    // Check if menu item code already exists
    const existing = await locationPrisma.menuItem.findFirst({
      where: {
        menuItemCode,
        storeCode
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Menu item with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const menuItemData = addPOSSyncMetadata({
      menuItemCode,
      name,
      cashPrice: cashPrice ? parseFloat(cashPrice) : null,
      cardPrice: cardPrice ? parseFloat(cardPrice) : null,
      isActive: isActive ? 1 : 0,
      createdOn: new Date(),
      ...body
    }, storeCode)

    // Create menu item
    const menuItem = await locationPrisma.menuItem.create({
      data: menuItemData
    })

    return NextResponse.json({
      success: true,
      message: 'Menu item created successfully',
      data: {
        ...menuItem,
        menuItemId: menuItem.menuItemId.toString()
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

