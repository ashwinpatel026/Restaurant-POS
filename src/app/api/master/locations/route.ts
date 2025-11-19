import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { syncMasterDataToLocation } from '@/services/syncService'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const companyId = url.searchParams.get('companyId')
    const dealerId = url.searchParams.get('dealerId')

    const locations = await masterPrisma.location.findMany({
      where: {
        isActive: 1,
        ...(companyId && { companyId: BigInt(companyId) }),
        ...(dealerId && { dealerId: BigInt(dealerId) })
      },
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
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: {
        createdOn: 'desc'
      }
    })

    const locationsWithStringIds = locations.map(location => ({
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
      } : null
    }))

    return NextResponse.json(locationsWithStringIds)
  } catch (error) {
    console.error('Error fetching locations:', error)
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
      locationCode,
      locationName,
      companyId,
      dealerId,
      address,
      phone,
      email
    } = body

    // Generate unique store code
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const storeCode = `STORE_${timestamp}_${random}`

    // Verify company exists
    const company = await masterPrisma.company.findUnique({
      where: { companyId: BigInt(companyId) }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
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

      // Verify dealer belongs to company
      if (dealer.companyId.toString() !== companyId) {
        return NextResponse.json(
          { error: 'Dealer does not belong to the specified company' },
          { status: 400 }
        )
      }
    }

    // Create location
    const location = await masterPrisma.location.create({
      data: {
        locationCode: locationCode || storeCode,
        locationName,
        companyId: BigInt(companyId),
        dealerId: dealerId ? BigInt(dealerId) : null,
        storeCode: storeCode,
        address: address || null,
        phone: phone || null,
        email: email || null,
        isActive: 1,
        syncEnabled: 1
      }
    })

    // Sync master data to location (async, don't wait)
    syncMasterDataToLocation(storeCode, 'FULL').catch(error => {
      console.error(`Failed to sync master data to ${storeCode}:`, error)
    })

    return NextResponse.json({
      ...location,
      locationId: location.locationId.toString(),
      companyId: location.companyId.toString(),
      dealerId: location.dealerId?.toString() || null
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

