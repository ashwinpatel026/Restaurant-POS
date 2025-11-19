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
      where: { locationId },
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
        syncLogs: {
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
        },
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...location,
      locationId: location.locationId.toString(),
      companyId: location.companyId.toString(),
      dealerId: location.dealerId?.toString() || null,
      company: {
        ...location.company,
        companyId: location.company.companyId.toString()
      },
      dealer: location.dealer ? {
        ...location.dealer,
        dealerId: location.dealer.dealerId.toString()
      } : null,
      users: location.users.map(u => ({
        ...u,
        userId: u.userId.toString()
      })),
      syncLogs: location.syncLogs.map(log => ({
        ...log,
        syncLogId: log.syncLogId.toString()
      }))
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
      locationCode,
      locationName,
      companyId,
      dealerId,
      address,
      phone,
      email,
      isActive,
      syncEnabled
    } = body

    // Check if location exists
    const existingLocation = await masterPrisma.location.findUnique({
      where: { locationId }
    })

    if (!existingLocation) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Verify company exists if companyId is being changed
    if (companyId && companyId !== existingLocation.companyId.toString()) {
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
        // Verify dealer belongs to company
        if (companyId && dealer.companyId.toString() !== companyId) {
          return NextResponse.json(
            { error: 'Dealer does not belong to the specified company' },
            { status: 400 }
          )
        }
      }
    }

    const location = await masterPrisma.location.update({
      where: { locationId },
      data: {
        ...(locationCode && { locationCode }),
        ...(locationName && { locationName }),
        ...(companyId && { companyId: BigInt(companyId) }),
        ...(dealerId !== undefined && { dealerId: dealerId ? BigInt(dealerId) : null }),
        ...(address !== undefined && { address: address || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(isActive !== undefined && { isActive: isActive ? 1 : 0 }),
        ...(syncEnabled !== undefined && { syncEnabled: syncEnabled ? 1 : 0 }),
        updatedOn: new Date()
      }
    })

    return NextResponse.json({
      ...location,
      locationId: location.locationId.toString(),
      companyId: location.companyId.toString(),
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
      where: { locationId },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
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

