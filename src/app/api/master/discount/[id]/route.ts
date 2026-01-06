import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to map discount response
function mapDiscountResponse(discount: any) {
  return {
    ...discount,
    discountId: discount.discountId.toString(),
    discountValue: discount.discountValue ? parseFloat(discount.discountValue.toString()) : null,
    maxDiscountAmount: discount.maxDiscountAmount ? parseFloat(discount.maxDiscountAmount.toString()) : null,
    createdBy: discount.createdBy ? discount.createdBy.toString() : null,
    createdDate: discount.createdDate ? discount.createdDate.toISOString() : null,
    updatedBy: discount.updatedBy ? discount.updatedBy.toString() : null,
    updatedOn: discount.updatedOn ? discount.updatedOn.toISOString() : null,
    validFrom: discount.validFrom ? discount.validFrom.toISOString().split('T')[0] : null,
    validTo: discount.validTo ? discount.validTo.toISOString().split('T')[0] : null,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const discountId = BigInt(idParam)

    const discount = await masterPrisma.masterDiscountMaster.findUnique({
      where: { discountId: discountId }
    })

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 })
    }

    return NextResponse.json(mapDiscountResponse(discount))
  } catch (error) {
    console.error('Error fetching discount:', error)
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const discountId = BigInt(idParam)
    const body = await request.json()

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
      isActive
    } = body

    if (!discountName || !discountType || !discountMode) {
      return NextResponse.json(
        { error: 'Discount name, type, and mode are required' },
        { status: 400 }
      )
    }

    // Validate discount value only if not open discount
    if (!isOpenDiscount && (discountValue === undefined || discountValue === null)) {
      return NextResponse.json(
        { error: 'Discount value is required when open discount is not enabled' },
        { status: 400 }
      )
    }

    const discount = await masterPrisma.masterDiscountMaster.update({
      where: { discountId: discountId },
      data: {
        discountCode,
        promoCode: promoCode || '',
        discountName,
        discountType,
        discountMode,
        discountValue: isOpenDiscount ? 0 : discountValue,
        maxDiscountAmount: maxDiscountAmount || null,
        isItemLevel: isItemLevel || false,
        isBillLevel: isBillLevel || false,
        requiresManagerApproval: requiresManagerApproval || false,
        allowedRoles: allowedRoles ? JSON.parse(JSON.stringify(allowedRoles)) : null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        menuCategory: menuCategory ? JSON.parse(JSON.stringify(menuCategory)) : null,
        deptCode: deptCode || null,
        discountNote: discountNote || null,
        isDelete: isDelete || false,
        isOpenDiscount: isOpenDiscount || false,
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: admin.adminId,
        updatedOn: new Date()
      }
    })

    return NextResponse.json(mapDiscountResponse(discount))
  } catch (error: any) {
    console.error('Error updating discount:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Discount code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const discountId = BigInt(idParam)

    await masterPrisma.masterDiscountMaster.delete({
      where: { discountId: discountId }
    })

    return NextResponse.json({ message: 'Discount deleted successfully' })
  } catch (error) {
    console.error('Error deleting discount:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

