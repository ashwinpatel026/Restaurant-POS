import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

// GET /api/orders/[id] - Get order details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const orderId = BigInt(id)

    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        table: {
          select: {
            tableNumber: true,
          }
        },
        orderItems: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

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
      customerPhone: order.customerPhone,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      orderItems: order.orderItems.map(item => ({
        id: item.orderItemId.toString(),
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        notes: item.notes,
        status: item.status,
      })),
    }

    return NextResponse.json(serializedOrder)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id] - Update order (mainly status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const orderId = BigInt(id)
    const body = await request.json()

    const updateData: any = {}

    if (body.status) {
      updateData.status = body.status
      // Set completedAt when status is COMPLETED
      if (body.status === 'COMPLETED') {
        updateData.completedAt = new Date()
      }
    }

    if (body.customerName !== undefined) {
      updateData.customerName = body.customerName || null
    }

    if (body.customerPhone !== undefined) {
      updateData.customerPhone = body.customerPhone || null
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes || null
    }

    const updatedOrder = await prisma.order.update({
      where: { orderId },
      data: updateData,
      include: {
        table: {
          select: {
            tableNumber: true,
          }
        },
        orderItems: {
          select: {
            quantity: true,
          }
        }
      }
    })

    // Serialize BigInt
    const serializedOrder = {
      id: updatedOrder.orderId.toString(),
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      orderType: updatedOrder.orderType,
      total: Number(updatedOrder.total),
      table: updatedOrder.table ? { tableNumber: updatedOrder.table.tableNumber } : null,
      customerName: updatedOrder.customerName,
      createdAt: updatedOrder.createdAt.toISOString(),
      orderItems: updatedOrder.orderItems,
    }

    return NextResponse.json(serializedOrder)
  } catch (error: any) {
    console.error('Error updating order:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - Delete order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const orderId = BigInt(id)

    await prisma.order.delete({
      where: { orderId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting order:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
