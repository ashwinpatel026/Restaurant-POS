import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/orders
 * Get all orders for a store
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
    const status = url.searchParams.get('status')
    const orderType = url.searchParams.get('orderType')
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')

    // Build where clause
    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedAt = { gte: new Date(lastSyncAt) }
    }
    if (status) {
      where.status = status
    }
    if (orderType) {
      where.orderType = orderType
    }

    // Build query options
    const queryOptions: any = {
      where,
      include: {
        orderItems: true,
        table: true
      },
      orderBy: { createdAt: 'desc' }
    }

    if (limit) {
      queryOptions.take = parseInt(limit, 10)
    }

    if (offset) {
      queryOptions.skip = parseInt(offset, 10)
    }

    // Get orders
    const [orders, totalCount] = await Promise.all([
      locationPrisma.order.findMany(queryOptions),
      locationPrisma.order.count({ where })
    ])

    return NextResponse.json({
      success: true,
      storeCode,
      count: orders.length,
      total: totalCount,
      pagination: {
        limit: limit ? parseInt(limit, 10) : null,
        offset: offset ? parseInt(offset, 10) : 0,
        total: totalCount
      },
      data: orders.map(order => ({
        ...order,
        orderId: order.orderId.toString(),
        orderItems: order.orderItems.map(item => ({
          ...item,
          orderItemId: item.orderItemId.toString()
        }))
      }))
    })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pos/sync/[storeCode]/orders
 * Create a new order
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

    const { orderNumber, orderType, status, tableId, orderItems, ...orderData } = body

    // Validate required fields
    if (!orderNumber || !orderType) {
      return NextResponse.json(
        { error: 'orderNumber and orderType are required' },
        { status: 400 }
      )
    }

    // Check if order number already exists
    const existing = await locationPrisma.order.findUnique({
      where: { orderNumber }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Order with this number already exists' },
        { status: 409 }
      )
    }

    // Prepare order data
    const orderDataWithMetadata = addPOSSyncMetadata({
      orderNumber,
      orderType,
      status: status || 'PENDING',
      tableId: tableId ? parseInt(tableId) : null,
      subtotal: orderData.subtotal ? parseFloat(orderData.subtotal) : 0,
      tax: orderData.tax ? parseFloat(orderData.tax) : 0,
      discount: orderData.discount ? parseFloat(orderData.discount) : 0,
      total: orderData.total ? parseFloat(orderData.total) : 0,
      customerName: orderData.customerName || null,
      customerPhone: orderData.customerPhone || null,
      notes: orderData.notes || null,
      createdBy: orderData.createdBy ? parseInt(orderData.createdBy) : null,
      createdAt: new Date()
    }, storeCode)

    // Create order with items
    const order = await locationPrisma.order.create({
      data: {
        ...orderDataWithMetadata,
        orderItems: orderItems && Array.isArray(orderItems) ? {
          create: orderItems.map((item: any) => ({
            menuItemCode: item.menuItemCode,
            name: item.name,
            quantity: item.quantity || 1,
            price: parseFloat(item.price || 0),
            subtotal: parseFloat(item.subtotal || item.price || 0),
            notes: item.notes || null,
            status: item.status || 'PENDING',
            storeCode
          }))
        } : undefined
      },
      include: {
        orderItems: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: {
        ...order,
        orderId: order.orderId.toString(),
        orderItems: order.orderItems.map(item => ({
          ...item,
          orderItemId: item.orderItemId.toString()
        }))
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

