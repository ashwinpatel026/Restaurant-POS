import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { generateOrderNumber } from '@/lib/utils'

// GET /api/orders - Get all orders with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    // Build where clause
    const where: any = {}
    
    if (status && status !== 'ALL') {
      if (status.includes(',')) {
        // Multiple statuses (e.g., "PENDING,CONFIRMED")
        where.status = { in: status.split(',') }
      } else {
        where.status = status
      }
    }

    if (type) {
      where.orderType = type
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: {
          select: {
            tableNumber: true,
          }
        },
        orderItems: {
          select: {
            orderItemId: true,
            name: true,
            quantity: true,
            price: true,
            subtotal: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Convert BigInt to string for JSON serialization
    const serializedOrders = orders.map(order => ({
      id: order.orderId.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      orderType: order.orderType,
      total: Number(order.total),
      table: order.table ? { tableNumber: order.table.tableNumber } : null,
      customerName: order.customerName,
      createdAt: order.createdAt.toISOString(),
      orderItems: order.orderItems.map(item => ({
        quantity: item.quantity,
      })),
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      notes: order.notes,
    }))

    return NextResponse.json(serializedOrders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      tableId,
      tableNumber,
      orderType,
      customerName,
      customerPhone,
      orderItems,
      subtotal,
      tax,
      discount,
      total,
      notes,
    } = body

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json(
        { error: 'Order items are required' },
        { status: 400 }
      )
    }

    // Generate unique order number
    const orderNumber = generateOrderNumber()

    // Resolve tableId from tableNumber if provided
    let resolvedTableId: number | null = null
    if (tableNumber) {
      const table = await prisma.table.findUnique({
        where: { tableNumber },
        select: { tableId: true }
      })
      if (table) {
        resolvedTableId = table.tableId
      }
    } else if (tableId) {
      resolvedTableId = Number(tableId)
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        tableId: resolvedTableId,
        orderType: orderType || 'QR_ORDER',
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        subtotal: subtotal || 0,
        tax: tax || 0,
        discount: discount || 0,
        total: total || 0,
        notes: notes || null,
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null,
        orderItems: {
          create: orderItems.map((item: any) => ({
            menuItemId: item.menuItemId ? BigInt(item.menuItemId) : null,
            menuItemCode: item.menuItemCode || null,
            name: item.name || '',
            quantity: item.quantity || 1,
            price: item.price || 0,
            subtotal: (item.price || 0) * (item.quantity || 1),
            notes: item.notes || null,
            storeCode: process.env.STORE_CODE || null,
          }))
        }
      },
      include: {
        table: {
          select: {
            tableNumber: true,
          }
        },
        orderItems: true
      }
    })

    // Serialize BigInt
    const serializedOrder = {
      id: order.orderId.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      orderType: order.orderType,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      table: order.table ? { tableNumber: order.table.tableNumber } : null,
      customerName: order.customerName,
      createdAt: order.createdAt.toISOString(),
      orderItems: order.orderItems.map(item => ({
        id: item.orderItemId.toString(),
        menuItemId: item.menuItemId ? item.menuItemId.toString() : null,
        menuItemCode: item.menuItemCode,
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        notes: item.notes,
        status: item.status,
      })),
    }

    return NextResponse.json(serializedOrder, { status: 201 })
  } catch (error: any) {
    console.error('Error creating order:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Order number already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
