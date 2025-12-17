import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/orders List orders
 * @apiName GetOrders
 * @apiGroup Orders
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 * @apiQuery {String}  [status] Filter by order status (e.g., PENDING, COMPLETED)
 * @apiQuery {String}  [orderType] Filter by order type (e.g., DINE_IN, TAKE_AWAY)
 * @apiQuery {Number}  [limit] Maximum records to return
 * @apiQuery {Number}  [offset=0] Records to skip (for pagination)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Number}  total Total matching records
 * @apiSuccess {Object}  pagination Pagination info
 * @apiSuccess {Object[]} data Array of orders with items
 * @apiSuccess {String}  data.orderId Order ID (string)
 * @apiSuccess {String}  data.orderNumber Order number
 * @apiSuccess {String}  data.status Order status
 * @apiSuccess {String}  data.orderType Order type
 * @apiSuccess {Object[]} data.orderItems Order items (with `orderItemId` as string)
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "storeCode": "LOC001",
 *   "count": 1,
 *   "total": 1,
 *   "pagination": { "limit": 50, "offset": 0, "total": 1 },
 *   "data": [
 *     {
 *       "orderId": "2001",
 *       "orderNumber": "ORD-001",
 *       "orderType": "DINE_IN",
 *       "status": "PENDING",
 *       "orderItems": [
 *         { "orderItemId": "3001", "menuItemCode": "MI001", "quantity": 2 }
 *       ]
 *     }
 *   ]
 * }
 *
 * @apiError (400) BadRequest Invalid query parameters
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Store not found
 * @apiError (500) InternalServerError Unexpected error
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
      data: orders.map((order: any) => ({
        ...order,
        orderId: order.orderId.toString(),
        orderItems: (order.orderItems || []).map((item: any) => ({
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
 * @api {post} /api/pos/sync/:storeCode/orders Create order
 * @apiName CreateOrder
 * @apiGroup Orders
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code
 *
 * @apiBody {String} orderNumber Unique order number
 * @apiBody {String} orderType Order type (e.g., DINE_IN, TAKE_AWAY)
 * @apiBody {String} [status=PENDING] Order status
 * @apiBody {Number} [tableId] Table ID (integer)
 * @apiBody {Object[]} [orderItems] Order items to create
 * @apiBody {String} orderItems.menuItemCode Menu item code
 * @apiBody {String} orderItems.name Menu item name
 * @apiBody {Number} [orderItems.quantity=1] Quantity
 * @apiBody {Number} [orderItems.price=0] Item price
 * @apiBody {Number} [orderItems.subtotal] Item subtotal
 * @apiBody {String} [orderItems.notes] Item notes
 * @apiBody {String} [orderItems.status=PENDING] Item status
 * @apiBody {Number} [subtotal=0] Order subtotal
 * @apiBody {Number} [tax=0] Order tax
 * @apiBody {Number} [discount=0] Order discount
 * @apiBody {Number} [total=0] Order total
 * @apiBody {String} [customerName] Customer name
 * @apiBody {String} [customerPhone] Customer phone
 * @apiBody {String} [notes] Order notes
 * @apiBody {Number} [createdBy] User ID (integer) who created the order
 *
 * @apiParamExample {json} Request Body
 * {
 *   "orderNumber": "ORD-001",
 *   "orderType": "DINE_IN",
 *   "tableId": 5,
 *   "orderItems": [
 *     { "menuItemCode": "MI001", "name": "Burger", "quantity": 2, "price": 12.99 }
 *   ],
 *   "subtotal": 25.98,
 *   "tax": 2.08,
 *   "total": 28.06
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created order with items
 * @apiSuccess (201) {String}  data.orderId Order ID (string)
 * @apiSuccess (201) {String}  data.orderNumber Order number
 * @apiSuccess (201) {Object[]} data.orderItems Order items (with `orderItemId` as string)
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Order number already exists
 * @apiError (500) InternalServerError Unexpected error
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

