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
      where: { dealerId },
      include: {
        company: {
          select: {
            companyId: true,
            companyCode: true,
            companyName: true
          }
        },
        locations: {
          where: { isActive: 1 },
          select: {
            locationId: true,
            locationCode: true,
            locationName: true,
            storeCode: true,
            isActive: true
          }
        },
        users: {
          where: { isActive: true },
          select: {
            userId: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            accessLevel: true
          }
        },
        _count: {
          select: {
            locations: true,
            users: true
          }
        }
      }
    })

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...dealer,
      dealerId: dealer.dealerId.toString(),
      companyId: dealer.companyId.toString(),
      company: {
        ...dealer.company,
        companyId: dealer.company.companyId.toString()
      },
      locations: dealer.locations.map(l => ({
        ...l,
        locationId: l.locationId.toString()
      })),
      users: dealer.users.map(u => ({
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
      address,
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
    if (companyId && companyId !== existingDealer.companyId.toString()) {
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

    const dealer = await masterPrisma.dealer.update({
      where: { dealerId },
      data: {
        ...(dealerCode && { dealerCode }),
        ...(dealerName && { dealerName }),
        ...(companyId && { companyId: BigInt(companyId) }),
        ...(address !== undefined && { address: address || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(isActive !== undefined && { isActive: isActive ? 1 : 0 }),
        updatedOn: new Date()
      }
    })

    return NextResponse.json({
      ...dealer,
      dealerId: dealer.dealerId.toString(),
      companyId: dealer.companyId.toString()
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
      where: { dealerId },
      include: {
        _count: {
          select: {
            locations: true,
            users: true
          }
        }
      }
    })

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

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

