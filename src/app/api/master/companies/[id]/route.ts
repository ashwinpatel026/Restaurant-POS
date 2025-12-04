import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'

// GET single company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const companyId = BigInt(resolvedParams.id)

    const company = await masterPrisma.company.findUnique({
      where: { companyId }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Fetch related data separately since relations are not defined
    const [dealers, locations, users] = await Promise.all([
      masterPrisma.dealer.findMany({
        where: { companyId: company.companyId, isActive: 1 },
        select: {
          dealerId: true,
          dealerCode: true,
          dealerName: true,
          isActive: true
        }
      }),
      masterPrisma.location.findMany({
        where: { companyId: company.companyId, isActive: 1 },
        select: {
          locationId: true,
          locationName: true,
          storeCode: true,
          isActive: true
        }
      }),
      masterPrisma.user.findMany({
        where: { companyId: company.companyId, isActive: true },
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
      ...company,
      companyId: company.companyId.toString(),
      dealers: dealers.map(d => ({
        ...d,
        dealerId: d.dealerId.toString()
      })),
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
    console.error('Error fetching company:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UPDATE company
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const companyId = BigInt(resolvedParams.id)
    const body = await request.json()
    
    const {
      companyCode,
      companyName,
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

    // Check if company exists
    const existingCompany = await masterPrisma.company.findUnique({
      where: { companyId }
    })

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Check if company code is being changed and if new code already exists
    if (companyCode && companyCode !== existingCompany.companyCode) {
      const codeExists = await masterPrisma.company.findUnique({
        where: { companyCode }
      })
      if (codeExists) {
        return NextResponse.json(
          { error: 'Company code already exists' },
          { status: 400 }
        )
      }
    }

    const company = await masterPrisma.company.update({
      where: { companyId },
      data: {
        ...(companyCode && { companyCode }),
        ...(companyName && { companyName }),
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
    })

    return NextResponse.json({
      ...company,
      companyId: company.companyId.toString()
    })
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE company (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const companyId = BigInt(resolvedParams.id)

    // Check if company exists
    const company = await masterPrisma.company.findUnique({
      where: { companyId }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Soft delete
    await masterPrisma.company.update({
      where: { companyId },
      data: {
        isActive: 0,
        updatedOn: new Date()
      }
    })

    return NextResponse.json({ 
      message: 'Company deactivated successfully',
      companyId: companyId.toString()
    })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

