import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import bcrypt from 'bcryptjs'

// GET all users (with filters)
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const companyId = url.searchParams.get('companyId')
    const dealerId = url.searchParams.get('dealerId')
    const locationId = url.searchParams.get('locationId')
    const accessLevel = url.searchParams.get('accessLevel')
    const role = url.searchParams.get('role')
    const isActive = url.searchParams.get('isActive')

    const where: any = {}
    
    if (companyId) where.companyId = BigInt(companyId)
    if (dealerId) where.dealerId = BigInt(dealerId)
    if (locationId) where.locationId = BigInt(locationId)
    if (accessLevel) where.accessLevel = accessLevel
    if (role) where.role = role
    if (isActive !== null) where.isActive = isActive === 'true'

    const users = await masterPrisma.user.findMany({
      where,
      orderBy: {
        createdOn: 'desc'
      }
    })

    // Fetch company, dealer, and location data separately for each user
    const usersWithRelations = await Promise.all(
      users.map(async (user) => {
        const [company, dealer, location] = await Promise.all([
          user.companyId ? masterPrisma.company.findUnique({
            where: { companyId: user.companyId },
            select: {
              companyId: true,
              companyCode: true,
              companyName: true
            }
          }) : null,
          user.dealerId ? masterPrisma.dealer.findUnique({
            where: { dealerId: user.dealerId },
            select: {
              dealerId: true,
              dealerCode: true,
              dealerName: true
            }
          }) : null,
          user.locationId ? masterPrisma.location.findUnique({
            where: { locationId: user.locationId },
            select: {
              locationId: true,
              locationCode: true,
              locationName: true,
              storeCode: true
            }
          }) : null
        ])

        const { password, ...userWithoutPassword } = user
        return {
          ...userWithoutPassword,
          userId: user.userId.toString(),
          companyId: user.companyId?.toString() || null,
          dealerId: user.dealerId?.toString() || null,
          locationId: user.locationId?.toString() || null,
          company: company ? {
            ...company,
            companyId: company.companyId.toString()
          } : null,
          dealer: dealer ? {
            ...dealer,
            dealerId: dealer.dealerId.toString()
          } : null,
          location: location ? {
            ...location,
            locationId: location.locationId.toString()
          } : null
        }
      })
    )

    return NextResponse.json(usersWithRelations)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// CREATE user
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      companyId,
      dealerId,
      locationId,
      role,
      accessLevel
    } = body

    // Validate required fields
    if (!email || !username || !password || !firstName || !lastName || !role || !accessLevel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingEmail = await masterPrisma.user.findUnique({
      where: { email }
    })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUsername = await masterPrisma.user.findUnique({
      where: { username }
    })
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Validate access level assignments
    if (accessLevel === 'COMPANY' && !companyId) {
      return NextResponse.json(
        { error: 'Company ID required for COMPANY access level' },
        { status: 400 }
      )
    }
    if (accessLevel === 'DEALER' && !dealerId) {
      return NextResponse.json(
        { error: 'Dealer ID required for DEALER access level' },
        { status: 400 }
      )
    }
    if (accessLevel === 'LOCATION' && !locationId) {
      return NextResponse.json(
        { error: 'Location ID required for LOCATION access level' },
        { status: 400 }
      )
    }

    // Verify company exists if provided
    if (companyId) {
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

    // Verify dealer exists if provided
    if (dealerId) {
      const dealer = await masterPrisma.dealer.findUnique({
        where: { dealerId: BigInt(dealerId) }
      })
      if (!dealer) {
        return NextResponse.json(
          { error: 'Dealer not found' },
          { status: 404 }
        )
      }
      // Verify dealer belongs to company if both provided
      if (companyId && dealer.companyId.toString() !== companyId) {
        return NextResponse.json(
          { error: 'Dealer does not belong to the specified company' },
          { status: 400 }
        )
      }
    }

    // Verify location exists if provided
    if (locationId) {
      const location = await masterPrisma.location.findUnique({
        where: { locationId: BigInt(locationId) }
      })
      if (!location) {
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 404 }
        )
      }
      // Verify location belongs to company/dealer if provided
      if (companyId && location.companyId.toString() !== companyId) {
        return NextResponse.json(
          { error: 'Location does not belong to the specified company' },
          { status: 400 }
        )
      }
      if (dealerId && location.dealerId?.toString() !== dealerId) {
        return NextResponse.json(
          { error: 'Location does not belong to the specified dealer' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await masterPrisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        companyId: companyId ? BigInt(companyId) : null,
        dealerId: dealerId ? BigInt(dealerId) : null,
        locationId: locationId ? BigInt(locationId) : null,
        role: role as any,
        accessLevel: accessLevel as any,
        isActive: true
      }
    })

    // Fetch company, dealer, and location data separately
    const [company, dealer, location] = await Promise.all([
      user.companyId ? masterPrisma.company.findUnique({
        where: { companyId: user.companyId },
        select: {
          companyId: true,
          companyCode: true,
          companyName: true
        }
      }) : null,
      user.dealerId ? masterPrisma.dealer.findUnique({
        where: { dealerId: user.dealerId },
        select: {
          dealerId: true,
          dealerCode: true,
          dealerName: true
        }
      }) : null,
      user.locationId ? masterPrisma.location.findUnique({
        where: { locationId: user.locationId },
        select: {
          locationId: true,
          locationCode: true,
          locationName: true,
          storeCode: true
        }
      }) : null
    ])

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      ...userWithoutPassword,
      userId: user.userId.toString(),
      companyId: user.companyId?.toString() || null,
      dealerId: user.dealerId?.toString() || null,
      locationId: user.locationId?.toString() || null,
      company: company ? {
        ...company,
        companyId: company.companyId.toString()
      } : null,
      dealer: dealer ? {
        ...dealer,
        dealerId: dealer.dealerId.toString()
      } : null,
      location: location ? {
        ...location,
        locationId: location.locationId.toString()
      } : null
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

