import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/discounts/:id Get discount
 * @apiName GetDiscount
 * @apiGroup Discount
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Discount identifier (numeric `discountId` or string `discountCode`)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Try to find by numeric ID first, then by discountCode
    let discount = null
    const discountId = BigInt(Number(id))

    if (!Number.isNaN(Number(id))) {
      discount = await locationPrisma.discountMaster.findFirst({
        where: {
          discountId,
          storeCode
        }
      })
    }

    if (!discount) {
      discount = await locationPrisma.discountMaster.findUnique({
        where: { discountCode: id }
      })
    }

    if (!discount || discount.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Discount not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
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
      }
    })
  } catch (error: any) {
    console.error('Error fetching discount (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/discounts/:id Update discount
 * @apiName UpdateDiscount
 * @apiGroup Discount
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Discount identifier (numeric `discountId` or string `discountCode`)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Find existing discount
    const numericId = BigInt(Number(id))
    let existingDiscount = null

    if (!Number.isNaN(Number(id))) {
      existingDiscount = await locationPrisma.discountMaster.findFirst({
        where: {
          discountId: numericId,
          storeCode
        }
      })
    }

    if (!existingDiscount) {
      existingDiscount = await locationPrisma.discountMaster.findUnique({
        where: { discountCode: id }
      })
    }

    if (!existingDiscount || existingDiscount.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Discount not found' },
        { status: 404 }
      )
    }

    const {
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
      updatedBy
    } = body

    // Validate if present
    if (
      (discountName !== undefined && !discountName) ||
      (discountType !== undefined && !discountType) ||
      (discountMode !== undefined && !discountMode)
    ) {
      return NextResponse.json(
        { error: 'discountName, discountType and discountMode cannot be empty when provided' },
        { status: 400 }
      )
    }

    if (!isOpenDiscount && (discountValue === undefined || discountValue === null)) {
      return NextResponse.json(
        { error: 'discountValue is required when open discount is not enabled' },
        { status: 400 }
      )
    }

    // Prepare update data with POS sync metadata
    const updateData: any = addPOSSyncMetadata({
      updatedBy: updatedBy ? BigInt(updatedBy) : null
    }, storeCode)

    // Preserve existing syncId
    updateData.syncId = existingDiscount.syncId

    if (promoCode !== undefined) updateData.promoCode = promoCode || null
    if (discountName !== undefined) updateData.discountName = discountName
    if (discountType !== undefined) updateData.discountType = discountType
    if (discountMode !== undefined) updateData.discountMode = discountMode
    if (discountValue !== undefined) {
      updateData.discountValue = isOpenDiscount
        ? 0
        : parseFloat(discountValue)
    }
    if (maxDiscountAmount !== undefined) {
      updateData.maxDiscountAmount =
        maxDiscountAmount !== null
          ? parseFloat(maxDiscountAmount)
          : null
    }
    if (isItemLevel !== undefined) updateData.isItemLevel = !!isItemLevel
    if (isBillLevel !== undefined) updateData.isBillLevel = !!isBillLevel
    if (requiresManagerApproval !== undefined) {
      updateData.requiresManagerApproval = !!requiresManagerApproval
    }
    if (allowedRoles !== undefined) {
      updateData.allowedRoles = allowedRoles
        ? JSON.parse(JSON.stringify(allowedRoles))
        : null
    }
    if (validFrom !== undefined) {
      updateData.validFrom = validFrom ? new Date(validFrom) : null
    }
    if (validTo !== undefined) {
      updateData.validTo = validTo ? new Date(validTo) : null
    }
    if (menuCategory !== undefined) {
      updateData.menuCategory = menuCategory
        ? JSON.parse(JSON.stringify(menuCategory))
        : null
    }
    if (deptCode !== undefined) updateData.deptCode = deptCode || null
    if (discountNote !== undefined) {
      updateData.discountNote = discountNote || null
    }
    if (isDelete !== undefined) updateData.isDelete = !!isDelete
    if (isOpenDiscount !== undefined) {
      updateData.isOpenDiscount = !!isOpenDiscount
    }
    if (isActive !== undefined) updateData.isActive = !!isActive

    const updatedDiscount = await locationPrisma.discountMaster.update({
      where: { discountId: existingDiscount.discountId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Discount updated successfully',
      data: {
        ...updatedDiscount,
        discountId: updatedDiscount.discountId.toString(),
        createdBy: updatedDiscount.createdBy
          ? updatedDiscount.createdBy.toString()
          : null,
        updatedBy: updatedDiscount.updatedBy
          ? updatedDiscount.updatedBy.toString()
          : null,
        createdDate: updatedDiscount.createdDate
          ? updatedDiscount.createdDate.toISOString()
          : null,
        updatedOn: updatedDiscount.updatedOn
          ? updatedDiscount.updatedOn.toISOString()
          : null,
        validFrom: updatedDiscount.validFrom
          ? updatedDiscount.validFrom.toISOString().split('T')[0]
          : null,
        validTo: updatedDiscount.validTo
          ? updatedDiscount.validTo.toISOString().split('T')[0]
          : null
      }
    })
  } catch (error: any) {
    console.error('Error updating discount (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/discounts/:id Delete discount
 * @apiName DeleteDiscount
 * @apiGroup Discount
 * @apiVersion 1.0.0
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Find existing discount
    const numericId = BigInt(Number(id))
    let existingDiscount = null

    if (!Number.isNaN(Number(id))) {
      existingDiscount = await locationPrisma.discountMaster.findFirst({
        where: {
          discountId: numericId,
          storeCode
        }
      })
    }

    if (!existingDiscount) {
      existingDiscount = await locationPrisma.discountMaster.findUnique({
        where: { discountCode: id }
      })
    }

    if (!existingDiscount || existingDiscount.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Discount not found' },
        { status: 404 }
      )
    }

    await locationPrisma.discountMaster.delete({
      where: { discountId: existingDiscount.discountId }
    })

    return NextResponse.json({
      success: true,
      message: 'Discount deleted successfully',
      data: {
        discountCode: existingDiscount.discountCode,
        discountId: existingDiscount.discountId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting discount (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}


