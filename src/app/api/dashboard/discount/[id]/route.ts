import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view discounts
    if (!(await checkLocationPermission(session.user.role, 'discount.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const { id: idParam } = await params
    const discountId = BigInt(idParam)

    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const discount = await prisma.discountMaster.findFirst({
      where: {
        discountId: discountId,
        ...storeFilter
      }
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to update discounts
    if (!(await checkLocationPermission(session.user.role, 'discount.update'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
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

    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    // Check if discount exists and belongs to this store
    const existingDiscount = await prisma.discountMaster.findFirst({
      where: {
        discountId: discountId,
        ...storeFilter
      }
    })

    if (!existingDiscount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 })
    }

    const discount = await prisma.discountMaster.update({
      where: { discountId: discountId },
      data: {
        discountCode,
        promoCode: promoCode || null,
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
        updatedBy: parseInt(session.user.id),
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to delete discounts
    if (!(await checkLocationPermission(session.user.role, 'discount.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const { id: idParam } = await params
    const discountId = BigInt(idParam)

    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    // Check if discount exists and belongs to this store
    const existingDiscount = await prisma.discountMaster.findFirst({
      where: {
        discountId: discountId,
        ...storeFilter
      }
    })

    if (!existingDiscount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 })
    }

    await prisma.discountMaster.delete({
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

