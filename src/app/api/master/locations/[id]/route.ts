import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { syncMasterDataToLocation } from '@/services/syncService'

// GET single location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const locationId = BigInt(resolvedParams.id)

    const location = await masterPrisma.location.findUnique({
      where: { locationId }
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Fetch related data separately
    const [company, dealer, users, syncLogs, userCount] = await Promise.all([
      location.companyId ? masterPrisma.company.findUnique({
        where: { companyId: location.companyId },
        select: {
          companyId: true,
          companyCode: true,
          companyName: true
        }
      }) : null,
      location.dealerId ? masterPrisma.dealer.findUnique({
        where: { dealerId: location.dealerId },
        select: {
          dealerId: true,
          dealerCode: true,
          dealerName: true
        }
      }) : null,
      masterPrisma.user.findMany({
        where: {
          locationId: location.locationId,
          isActive: true
        },
        select: {
          userId: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          accessLevel: true
        }
      }),
      masterPrisma.syncLog.findMany({
        where: { locationId: location.locationId },
        take: 10,
        orderBy: { startedAt: 'desc' },
        select: {
          syncLogId: true,
          syncType: true,
          status: true,
          recordsSynced: true,
          startedAt: true,
          completedAt: true
        }
      }),
      masterPrisma.user.count({
        where: {
          locationId: location.locationId,
          isActive: true
        }
      })
    ])

    return NextResponse.json({
      ...location,
      locationId: location.locationId.toString(),
      companyId: location.companyId?.toString() || null,
      dealerId: location.dealerId?.toString() || null,
      company: company ? {
        ...company,
        companyId: company.companyId.toString()
      } : null,
      dealer: dealer ? {
        ...dealer,
        dealerId: dealer.dealerId.toString()
      } : null,
      users: users.map(u => ({
        ...u,
        userId: u.userId.toString()
      })),
      syncLogs: syncLogs.map(log => ({
        ...log,
        syncLogId: log.syncLogId.toString()
      })),
      _count: {
        users: userCount
      }
    })
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UPDATE location
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
    const locationId = BigInt(resolvedParams.id)
    const body = await request.json()
    
    const {
      storeCode,
      locationName,
      companyId,
      dealerId,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipcode,
      phone,
      email,
      federalTaxId,
      socialSecurityNumber,
      entityType,
      isActive,
      syncEnabled
    } = body

    // Check if location exists
    const existingLocation = await masterPrisma.location.findUnique({
      where: { locationId }
    })

    if (!existingLocation) {
      console.error(`Location not found with ID: ${locationId} (from params: ${resolvedParams.id})`)
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Verify company exists if companyId is being changed
    if (companyId && companyId !== existingLocation.companyId?.toString()) {
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

    // Verify dealer exists if dealerId is being changed
    if (dealerId !== undefined && dealerId !== null) {
      if (dealerId !== existingLocation.dealerId?.toString()) {
        const dealer = await masterPrisma.dealer.findUnique({
          where: { dealerId: BigInt(dealerId) }
        })
        if (!dealer) {
          return NextResponse.json(
            { error: 'Dealer not found' },
            { status: 404 }
          )
        }
      }
    }

    const location = await masterPrisma.location.update({
      where: { locationId },
      data: {
        ...(storeCode && { storeCode }),
        ...(locationName && { locationName }),
        ...(companyId !== undefined && { companyId: companyId && companyId !== "" ? BigInt(companyId) : null }),
        ...(dealerId !== undefined && { dealerId: dealerId && dealerId !== "" ? BigInt(dealerId) : null }),
        ...(addressLine1 !== undefined && { addressLine1: addressLine1 || null }),
        ...(addressLine2 !== undefined && { addressLine2: addressLine2 || null }),
        ...(city !== undefined && { city: city || null }),
        ...(state !== undefined && { state: state || null }),
        ...(country !== undefined && { country: country || null }),
        ...(zipcode !== undefined && { zipcode: zipcode || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(federalTaxId !== undefined && { federalTaxId: federalTaxId || null }),
        ...(socialSecurityNumber !== undefined && { socialSecurityNumber: socialSecurityNumber || null }),
        ...(entityType !== undefined && { entityType: entityType || null }),
        ...(isActive !== undefined && { isActive: isActive ? 1 : 0 }),
        ...(syncEnabled !== undefined && { syncEnabled: syncEnabled ? 1 : 0 }),
        updatedOn: new Date()
      }
    })

    return NextResponse.json({
      ...location,
      locationId: location.locationId.toString(),
      companyId: location.companyId?.toString() || null,
      dealerId: location.dealerId?.toString() || null
    })
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE location (soft delete)
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
    const locationId = BigInt(resolvedParams.id)

    // Check if location exists
    const location = await masterPrisma.location.findUnique({
      where: { locationId }
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Soft delete
    await masterPrisma.location.update({
      where: { locationId },
      data: {
        isActive: 0,
        updatedOn: new Date()
      }
    })

    return NextResponse.json({ 
      message: 'Location deactivated successfully',
      locationId: locationId.toString()
    })
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Manual sync trigger with progress tracking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const locationId = BigInt(resolvedParams.id)
    const body = await request.json()
    const syncType = body.syncType || 'FULL'

    const location = await masterPrisma.location.findUnique({
      where: { locationId }
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    if (location.syncEnabled === 0) {
      return NextResponse.json(
        { error: 'Sync is disabled for this location' },
        { status: 400 }
      )
    }

    // Execute sync with progress tracking
    const progressUpdates: any[] = []
    
    const result = await syncMasterDataToLocation(
      location.storeCode, 
      syncType as 'FULL' | 'INCREMENTAL',
      (progress) => {
        progressUpdates.push(progress)
      }
    )

    return NextResponse.json({ 
      success: result.success,
      message: result.success ? 'Sync completed successfully' : 'Sync failed',
      storeCode: location.storeCode,
      recordsSynced: result.recordsSynced,
      error: result.error,
      progress: result.progress || progressUpdates
    })
  } catch (error: any) {
    console.error('Error triggering sync:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

