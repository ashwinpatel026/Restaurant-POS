import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/orders/[id]
 * Get a specific order by ID or order number
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

    // Try to find by ID first, then by orderNumber
    let order = null
    const orderId = BigInt(id)
    
    try {
      order = await locationPrisma.order.findFirst({
        where: {
          orderId: orderId,
          storeCode
        },
        include: {
          orderItems: true,
          table: true
        }
      })
    } catch {
      // If BigInt conversion fails, try by orderNumber
    }

    if (!order) {
      order = await locationPrisma.order.findUnique({
        where: { orderNumber: id },
        include: {
          orderItems: true,
          table: true
        }
      })
    }

    if (!order || order.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        orderId: order.orderId.toString(),
        orderItems: order.orderItems.map(item => ({
          ...item,
          orderItemId: item.orderItemId.toString()
        }))
      }
    })
  } catch (error: any) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/pos/sync/[storeCode]/orders/[id]
 * Update an order
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

    // Find existing order
    let existingOrder = null
    const orderId = BigInt(id)
    
    try {
      existingOrder = await locationPrisma.order.findFirst({
        where: {
          orderId: orderId,
          storeCode
        }
      })
    } catch {
      // Try by orderNumber if BigInt fails
    }

    if (!existingOrder) {
      existingOrder = await locationPrisma.order.findUnique({
        where: { orderNumber: id }
      })
    }

    if (!existingOrder || existingOrder.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Prepare update data with POS sync metadata
    const updateData: any = addPOSSyncMetadata({}, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingOrder.syncId

    // Update allowed fields
    if (body.status !== undefined) updateData.status = body.status
    if (body.orderType !== undefined) updateData.orderType = body.orderType
    if (body.subtotal !== undefined) updateData.subtotal = parseFloat(body.subtotal)
    if (body.tax !== undefined) updateData.tax = parseFloat(body.tax)
    if (body.discount !== undefined) updateData.discount = parseFloat(body.discount)
    if (body.total !== undefined) updateData.total = parseFloat(body.total)
    if (body.customerName !== undefined) updateData.customerName = body.customerName
    if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.completedAt !== undefined) updateData.completedAt = body.completedAt ? new Date(body.completedAt) : null

    // Update order
    const updatedOrder = await locationPrisma.order.update({
      where: { orderId: existingOrder.orderId },
      data: updateData,
      include: {
        orderItems: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      data: {
        ...updatedOrder,
        orderId: updatedOrder.orderId.toString(),
        orderItems: updatedOrder.orderItems.map(item => ({
          ...item,
          orderItemId: item.orderItemId.toString()
        }))
      }
    })
  } catch (error: any) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/pos/sync/[storeCode]/orders/[id]
 * Delete an order (soft delete by changing status to CANCELLED)
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

    // Find existing order
    let existingOrder = null
    const orderId = BigInt(id)
    
    try {
      existingOrder = await locationPrisma.order.findFirst({
        where: {
          orderId: orderId,
          storeCode
        }
      })
    } catch {
      // Try by orderNumber if BigInt fails
    }

    if (!existingOrder) {
      existingOrder = await locationPrisma.order.findUnique({
        where: { orderNumber: id }
      })
    }

    if (!existingOrder || existingOrder.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting status to CANCELLED
    const updateData = addPOSSyncMetadata({
      status: 'CANCELLED'
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingOrder.syncId

    await locationPrisma.order.update({
      where: { orderId: existingOrder.orderId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderNumber: existingOrder.orderNumber,
        orderId: existingOrder.orderId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error cancelling order:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

