import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { checkDuplicate } from '@/lib/validation'

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
    
    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const discounts = await prisma.discountMaster.findMany({
      where: {
        ...storeFilter,
        isDelete: false
      },
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
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to create discounts
    if (!(await checkLocationPermission(session.user.role, 'discount.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query or body
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
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

    // Check for duplicate discount name in this store
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)
    const existingDiscount = await prisma.discountMaster.findFirst({
      where: {
        ...storeFilter,
        discountName: discountName,
        isDelete: false
      }
    })

    if (existingDiscount) {
      return NextResponse.json(
        { error: 'Discount with this name already exists' },
        { status: 400 }
      )
    }

    // Generate discount code using WL + STORE_CODE + DISC + number pattern
    const prefix = `WL${selectedStoreCode}DISC`
    
    // Get all discount codes that match the WL pattern for this store
    const discounts = await prisma.discountMaster.findMany({
      where: {
        ...storeFilter,
        discountCode: {
          startsWith: prefix
        }
      },
      select: { discountCode: true },
      orderBy: { discountId: 'desc' }
    })

    let nextNumber = 1
    
    if (discounts.length > 0) {
      // Extract number from codes like "WLLOC01DISC1", "WLLOC01DISC2", etc.
      const numbers = discounts
        .map((discount: { discountCode: string }) => {
          const match = discount.discountCode.match(new RegExp(`^${prefix}(\\d+)$`))
          return match ? parseInt(match[1]) : 0
        })
        .filter((num: number) => num > 0)
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1
      }
    }
    
    // Format as WL + STORE_CODE + DISC + number starting from 1
    const finalDiscountCode = `${prefix}${nextNumber}`

    const discount = await prisma.discountMaster.create({
      data: {
        discountCode: finalDiscountCode,
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
        storeCode: selectedStoreCode,
        createdBy: parseInt(session.user.id)
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

