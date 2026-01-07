import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/discounts List discounts
 * @apiName GetDiscounts
 * @apiGroup Discount
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, only return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp to filter updated records (used with incremental)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of discount records returned
 * @apiSuccess {Object[]} data List of discount records
 * @apiSuccess {String}  data.discountId Discount ID (string)
 * @apiSuccess {String}  data.discountCode Discount code
 * @apiSuccess {String}  [data.promoCode] Promo code
 * @apiSuccess {String}  data.discountName Discount display name
 * @apiSuccess {String}  data.discountType Discount type
 * @apiSuccess {String}  data.discountMode Discount mode (PERCENTAGE/FIXED)
 * @apiSuccess {Number}  data.discountValue Discount value (0 when open discount)
 * @apiSuccess {Number}  [data.maxDiscountAmount] Max discount amount
 * @apiSuccess {Boolean} data.isItemLevel Applies at item level
 * @apiSuccess {Boolean} data.isBillLevel Applies at bill/transaction level
 * @apiSuccess {Boolean} data.requiresManagerApproval Requires manager approval
 * @apiSuccess {Object}  [data.allowedRoles] JSON list of allowed roles
 * @apiSuccess {String}  [data.validFrom] Valid from date (YYYY-MM-DD)
 * @apiSuccess {String}  [data.validTo] Valid to date (YYYY-MM-DD)
 * @apiSuccess {Object}  [data.menuCategory] JSON list of menu categories
 * @apiSuccess {String}  [data.deptCode] Department code
 * @apiSuccess {String}  [data.discountNote] Discount note
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {Boolean} data.isOpenDiscount Open discount flag
 * @apiSuccess {Boolean} data.isActive Active status
 * @apiSuccess {String}  [data.createdDate] Creation timestamp
 * @apiSuccess {String}  [data.updatedOn] Last update timestamp
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source (e.g., "server", "POS", "location")
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

    // Build where clause
    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    // Get discounts
    const discounts = await locationPrisma.discountMaster.findMany({
      where,
      orderBy: { updatedOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: discounts.length,
      data: discounts.map(discount => ({
        ...discount,
        discountId: discount.discountId.toString(),
        createdBy: discount.createdBy ? discount.createdBy.toString() : null,
        updatedBy: discount.updatedBy ? discount.updatedBy.toString() : null,
        createdDate: discount.createdDate
          ? discount.createdDate.toISOString()
          : null,
        updatedOn: discount.updatedOn
          ? discount.updatedOn.toISOString()
          : null,
        validFrom: discount.validFrom
          ? discount.validFrom.toISOString().split('T')[0]
          : null,
        validTo: discount.validTo
          ? discount.validTo.toISOString().split('T')[0]
          : null
      }))
    })
  } catch (error: any) {
    console.error('Error fetching discounts (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/discounts Create discount
 * @apiName CreateDiscount
 * @apiGroup Discount
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} discountCode Unique discount code
 * @apiBody {String} [promoCode] Promo code
 * @apiBody {String} discountName Discount display name
 * @apiBody {String} discountType Discount type
 * @apiBody {String} discountMode Discount mode (PERCENTAGE/FIXED)
 * @apiBody {Number} [discountValue] Discount value (required when not open discount)
 * @apiBody {Number} [maxDiscountAmount] Max discount amount
 * @apiBody {Boolean} [isItemLevel=false] Applies at item level
 * @apiBody {Boolean} [isBillLevel=false] Applies at bill/transaction level
 * @apiBody {Boolean} [requiresManagerApproval=false] Requires manager approval
 * @apiBody {Object}  [allowedRoles] JSON list of allowed roles
 * @apiBody {String}  [validFrom] Valid from date (YYYY-MM-DD)
 * @apiBody {String}  [validTo] Valid to date (YYYY-MM-DD)
 * @apiBody {Object}  [menuCategory] JSON list of menu categories
 * @apiBody {String}  [deptCode] Department code
 * @apiBody {String}  [discountNote] Discount note
 * @apiBody {Boolean} [isDelete=false] Soft delete flag
 * @apiBody {Boolean} [isOpenDiscount=false] Open discount flag
 * @apiBody {Boolean} [isActive=true] Active status
 * @apiBody {Number} [createdBy] User ID (integer) who created the discount
 * @apiBody {String} [syncId] Unique sync identifier (auto-generated if not provided)
 *
 * @apiError (400) BadRequest Missing or invalid request body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Discount with this code already exists
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

    const {
      discountCode,
      promoCode,
      discountName,
      discountType,
      discountMode,
      discountValue,
      maxDiscountAmount,
      isItemLevel,
      isBillLevel,
      requiresManagerApproval,
      allowedRoles,
      validFrom,
      validTo,
      menuCategory,
      deptCode,
      discountNote,
      isDelete,
      isOpenDiscount,
      isActive,
      createdBy,
      syncId
    } = body

    // Validate required fields
    if (!discountCode || !discountName || !discountType || !discountMode) {
      return NextResponse.json(
        { error: 'discountCode, discountName, discountType and discountMode are required' },
        { status: 400 }
      )
    }

    // Validate discount value only if not open discount
    if (!isOpenDiscount && (discountValue === undefined || discountValue === null)) {
      return NextResponse.json(
        { error: 'discountValue is required when open discount is not enabled' },
        { status: 400 }
      )
    }

    // Check if discount code already exists
    const existing = await locationPrisma.discountMaster.findUnique({
      where: { discountCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Discount with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const discountData = addPOSSyncMetadata({
      discountCode,
      promoCode: promoCode || null,
      discountName,
      discountType,
      discountMode,
      discountValue: isOpenDiscount ? 0 : parseFloat(discountValue),
      maxDiscountAmount: maxDiscountAmount !== undefined && maxDiscountAmount !== null
        ? parseFloat(maxDiscountAmount)
        : null,
      isItemLevel: !!isItemLevel,
      isBillLevel: !!isBillLevel,
      requiresManagerApproval: !!requiresManagerApproval,
      allowedRoles: allowedRoles ? JSON.parse(JSON.stringify(allowedRoles)) : null,
      validFrom: validFrom ? new Date(validFrom) : null,
      validTo: validTo ? new Date(validTo) : null,
      menuCategory: menuCategory ? JSON.parse(JSON.stringify(menuCategory)) : null,
      deptCode: deptCode || null,
      discountNote: discountNote || null,
      isDelete: !!isDelete,
      isOpenDiscount: !!isOpenDiscount,
      isActive: isActive !== undefined ? !!isActive : true,
      createdBy: createdBy ? BigInt(createdBy) : null,
      syncId: syncId || undefined
    }, storeCode)

    // Create discount
    const discount = await locationPrisma.discountMaster.create({
      data: discountData
    })

    return NextResponse.json({
      success: true,
      message: 'Discount created successfully',
      data: {
        ...discount,
        discountId: discount.discountId.toString(),
        createdBy: discount.createdBy ? discount.createdBy.toString() : null,
        updatedBy: discount.updatedBy ? discount.updatedBy.toString() : null,
        createdDate: discount.createdDate ? discount.createdDate.toISOString() : null,
        updatedOn: discount.updatedOn ? discount.updatedOn.toISOString() : null,
        validFrom: discount.validFrom
          ? discount.validFrom.toISOString().split('T')[0]
          : null,
        validTo: discount.validTo
          ? discount.validTo.toISOString().split('T')[0]
          : null
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating discount (POS sync):', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Discount with this code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}


