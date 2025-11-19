import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import bcrypt from 'bcryptjs'

// GET single user
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
    const userId = BigInt(resolvedParams.id)

    const user = await masterPrisma.user.findUnique({
      where: { userId },
      include: {
        company: {
          select: {
            companyId: true,
            companyCode: true,
            companyName: true
          }
        },
        dealer: {
          select: {
            dealerId: true,
            dealerCode: true,
            dealerName: true
          }
        },
        location: {
          select: {
            locationId: true,
            locationCode: true,
            locationName: true,
            storeCode: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove password
    const { password, ...userWithoutPassword } = user

    return NextResponse.json({
      ...userWithoutPassword,
      userId: user.userId.toString(),
      companyId: user.companyId?.toString() || null,
      dealerId: user.dealerId?.toString() || null,
      locationId: user.locationId?.toString() || null,
      company: user.company ? {
        ...user.company,
        companyId: user.company.companyId.toString()
      } : null,
      dealer: user.dealer ? {
        ...user.dealer,
        dealerId: user.dealer.dealerId.toString()
      } : null,
      location: user.location ? {
        ...user.location,
        locationId: user.location.locationId.toString()
      } : null
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UPDATE user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const userId = BigInt(resolvedParams.id)
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
      accessLevel,
      isActive
    } = body

    // Check if user exists
    const existingUser = await masterPrisma.user.findUnique({
      where: { userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if email is being changed and if new email already exists
    if (email && email !== existingUser.email) {
      const emailExists = await masterPrisma.user.findUnique({
        where: { email }
      })
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    // Check if username is being changed and if new username already exists
    if (username && username !== existingUser.username) {
      const usernameExists = await masterPrisma.user.findUnique({
        where: { username }
      })
      if (usernameExists) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        )
      }
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

    // Prepare update data
    const updateData: any = {}
    if (email) updateData.email = email
    if (username) updateData.username = username
    if (password) updateData.password = await bcrypt.hash(password, 10)
    if (firstName) updateData.firstName = firstName
    if (lastName) updateData.lastName = lastName
    if (companyId !== undefined) updateData.companyId = companyId ? BigInt(companyId) : null
    if (dealerId !== undefined) updateData.dealerId = dealerId ? BigInt(dealerId) : null
    if (locationId !== undefined) updateData.locationId = locationId ? BigInt(locationId) : null
    if (role) updateData.role = role
    if (accessLevel) updateData.accessLevel = accessLevel
    if (isActive !== undefined) updateData.isActive = isActive
    updateData.updatedOn = new Date()

    const user = await masterPrisma.user.update({
      where: { userId },
      data: updateData,
      include: {
        company: {
          select: {
            companyId: true,
            companyCode: true,
            companyName: true
          }
        },
        dealer: {
          select: {
            dealerId: true,
            dealerCode: true,
            dealerName: true
          }
        },
        location: {
          select: {
            locationId: true,
            locationCode: true,
            locationName: true,
            storeCode: true
          }
        }
      }
    })

    // Remove password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      ...userWithoutPassword,
      userId: user.userId.toString(),
      companyId: user.companyId?.toString() || null,
      dealerId: user.dealerId?.toString() || null,
      locationId: user.locationId?.toString() || null,
      company: user.company ? {
        ...user.company,
        companyId: user.company.companyId.toString()
      } : null,
      dealer: user.dealer ? {
        ...user.dealer,
        dealerId: user.dealer.dealerId.toString()
      } : null,
      location: user.location ? {
        ...user.location,
        locationId: user.location.locationId.toString()
      } : null
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE user (soft delete by setting isActive = false)
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
    const userId = BigInt(resolvedParams.id)

    // Check if user exists
    const user = await masterPrisma.user.findUnique({
      where: { userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deleting yourself (if needed, get admin from token)
    // Note: Master admin deletion prevention can be added here if needed

    // Soft delete
    await masterPrisma.user.update({
      where: { userId },
      data: {
        isActive: false,
        updatedOn: new Date()
      }
    })

    return NextResponse.json({ 
      message: 'User deactivated successfully',
      userId: userId.toString()
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

