import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { checkDuplicate } from '@/lib/validation'

// Helper function to generate unique discount code
async function generateDiscountCode(): Promise<string> {
  const latestDiscount = await masterPrisma.masterDiscountMaster.findFirst({
    orderBy: { discountId: 'desc' },
    select: { discountCode: true }
  })

  let nextNumber = 1
  
  if (latestDiscount?.discountCode) {
    const match = latestDiscount.discountCode.match(/^DISC(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  return `DISC${nextNumber}`
}

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

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const discounts = await masterPrisma.masterDiscountMaster.findMany({
      orderBy: { createdDate: 'desc' }
    })

    const discountsWithStringId = discounts.map(mapDiscountResponse)

    return NextResponse.json(discountsWithStringId)
  } catch (error) {
    console.error('Error fetching discounts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
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
      isActive
    } = body

    // Validate required fields
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

    // Check for duplicate discount name
    const isDuplicate = await checkDuplicate('masterDiscountMaster', 'discountName', discountName)
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Discount with this name already exists' },
        { status: 400 }
      )
    }

    // Generate discount code automatically
    const finalDiscountCode = await generateDiscountCode()

    // Check for duplicate discount code
    const existingCode = await masterPrisma.masterDiscountMaster.findUnique({
      where: { discountCode: finalDiscountCode }
    })
    if (existingCode) {
      return NextResponse.json(
        { error: 'Discount code already exists' },
        { status: 400 }
      )
    }

    const discount = await masterPrisma.masterDiscountMaster.create({
      data: {
        discountCode: finalDiscountCode,
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
        createdBy: admin.adminId
      }
    })

    return NextResponse.json(mapDiscountResponse(discount), { status: 201 })
  } catch (error: any) {
    console.error('Error creating discount:', error)
    
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

