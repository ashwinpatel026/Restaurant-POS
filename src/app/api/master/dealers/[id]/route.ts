import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'

// GET single dealer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const dealerId = BigInt(resolvedParams.id)

    const dealer = await masterPrisma.dealer.findUnique({
      where: { dealerId }
    })

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    // Fetch related data separately since relations are not defined
    const [company, locations, users] = await Promise.all([
      dealer.companyId ? masterPrisma.company.findUnique({
        where: { companyId: dealer.companyId },
        select: {
          companyId: true,
          companyCode: true,
          companyName: true
        }
      }) : Promise.resolve(null),
      masterPrisma.location.findMany({
        where: { dealerId: dealer.dealerId, isActive: 1 },
        select: {
          locationId: true,
          locationName: true,
          storeCode: true,
          isActive: true
        }
      }),
      masterPrisma.user.findMany({
        where: { dealerId: dealer.dealerId, isActive: true },
        select: {
          userId: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          accessLevel: true
        }
      })
    ])

    return NextResponse.json({
      ...dealer,
      dealerId: dealer.dealerId.toString(),
      companyId: dealer.companyId?.toString() || null,
      company: company ? {
        ...company,
        companyId: company.companyId.toString()
      } : null,
      locations: locations.map(l => ({
        ...l,
        locationId: l.locationId.toString()
      })),
      users: users.map(u => ({
        ...u,
        userId: u.userId.toString()
      }))
    })
  } catch (error) {
    console.error('Error fetching dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UPDATE dealer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const dealerId = BigInt(resolvedParams.id)
    const body = await request.json()
    
    const {
      dealerCode,
      dealerName,
      companyId,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipcode,
      phone,
      email,
      isActive
    } = body

    // Check if dealer exists
    const existingDealer = await masterPrisma.dealer.findUnique({
      where: { dealerId }
    })

    if (!existingDealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    // Check if dealer code is being changed and if new code already exists
    if (dealerCode && dealerCode !== existingDealer.dealerCode) {
      const codeExists = await masterPrisma.dealer.findUnique({
        where: { dealerCode }
      })
      if (codeExists) {
        return NextResponse.json(
          { error: 'Dealer code already exists' },
          { status: 400 }
        )
      }
    }

    // Verify company exists if companyId is being changed
    if (companyId && companyId !== (existingDealer.companyId?.toString() || '')) {
      const company = await masterPrisma.company.findUnique({
        where: { companyId: BigInt(companyId) }
      })
      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        )
      }
    }

    const updateData: any = {
      ...(dealerCode && { dealerCode }),
      ...(dealerName && { dealerName }),
      ...(addressLine1 !== undefined && { addressLine1: addressLine1 || null }),
      ...(addressLine2 !== undefined && { addressLine2: addressLine2 || null }),
      ...(city !== undefined && { city: city || null }),
      ...(state !== undefined && { state: state || null }),
      ...(country !== undefined && { country: country || null }),
      ...(zipcode !== undefined && { zipcode: zipcode || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(email !== undefined && { email: email || null }),
      ...(isActive !== undefined && { isActive: isActive ? 1 : 0 }),
      updatedOn: new Date()
    }

    // Handle companyId update
    if (companyId !== undefined) {
      if (companyId === "" || companyId === null) {
        updateData.companyId = null
      } else {
        updateData.companyId = BigInt(companyId)
      }
    }

    const dealer = await masterPrisma.dealer.update({
      where: { dealerId },
      data: updateData
    })

    return NextResponse.json({
      ...dealer,
      dealerId: dealer.dealerId.toString(),
      companyId: dealer.companyId ? dealer.companyId.toString() : null
    })
  } catch (error) {
    console.error('Error updating dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE dealer (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const dealerId = BigInt(resolvedParams.id)

    // Check if dealer exists
    const dealer = await masterPrisma.dealer.findUnique({
      where: { dealerId }
    })

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    // Get counts separately if needed
    const [locationsCount, usersCount] = await Promise.all([
      masterPrisma.location.count({
        where: { dealerId: dealerId, isActive: 1 }
      }),
      masterPrisma.user.count({
        where: { dealerId: dealerId, isActive: true }
      })
    ])

    // Soft delete
    await masterPrisma.dealer.update({
      where: { dealerId },
      data: {
        isActive: 0,
        updatedOn: new Date()
      }
    })

    return NextResponse.json({ 
      message: 'Dealer deactivated successfully',
      dealerId: dealerId.toString()
    })
  } catch (error) {
    console.error('Error deleting dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

