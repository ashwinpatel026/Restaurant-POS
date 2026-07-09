import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/orders/:id Get order
 * @apiName GetOrder
 * @apiGroup Orders
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Order identifier (BigInt `orderId` or `orderNumber`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Order record with items
 * @apiSuccess {String}  data.orderId Order ID (string)
 * @apiSuccess {String}  data.orderNumber Order number
 * @apiSuccess {String}  data.status Order status
 * @apiSuccess {String}  data.orderType Order type
 * @apiSuccess {Object[]} data.orderItems Order items (with `orderItemId` as string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Order not found
 * @apiError (500) InternalServerError Unexpected error
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
      order = await locationPrisma.order.findFirst({
        where: { orderNumber: id, storeCode },
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
 * @api {put} /api/pos/sync/:storeCode/orders/:id Update order
 * @apiName UpdateOrder
 * @apiGroup Orders
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Order identifier (BigInt `orderId` or `orderNumber`)
 *
 * @apiBody {String} [status] Order status
 * @apiBody {String} [orderType] Order type
 * @apiBody {Number} [subtotal] Order subtotal
 * @apiBody {Number} [tax] Order tax
 * @apiBody {Number} [discount] Order discount
 * @apiBody {Number} [total] Order total
 * @apiBody {String} [customerName] Customer name
 * @apiBody {String} [customerPhone] Customer phone
 * @apiBody {String} [notes] Order notes
 * @apiBody {String} [completedAt] Completion ISO timestamp
 *
 * @apiParamExample {json} Request Body
 * {
 *   "status": "COMPLETED",
 *   "subtotal": 20.00,
 *   "tax": 1.60,
 *   "total": 21.60
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated order with items
 * @apiSuccess {String}  data.orderId Order ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Order not found
 * @apiError (500) InternalServerError Unexpected error
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
      existingOrder = await locationPrisma.order.findFirst({
        where: { orderNumber: id, storeCode }
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
 * @api {delete} /api/pos/sync/:storeCode/orders/:id Cancel order
 * @apiName CancelOrder
 * @apiGroup Orders
 * @apiVersion 1.0.0
 * @apiDescription Soft delete by setting status to `CANCELLED`.
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Order identifier (BigInt `orderId` or `orderNumber`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Cancelled identifiers
 * @apiSuccess {String}  data.orderNumber Order number
 * @apiSuccess {String}  data.orderId Order ID (string)
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "message": "Order cancelled successfully",
 *   "data": {
 *     "orderNumber": "ORD-001",
 *     "orderId": "2001"
 *   }
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Order not found
 * @apiError (500) InternalServerError Unexpected error
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
      existingOrder = await locationPrisma.order.findFirst({
        where: { orderNumber: id, storeCode }
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

