import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { syncMasterDataToLocation } from '@/services/syncService'

// Helper function to generate unique store code
async function generateStoreCode(): Promise<string> {
  let attempts = 0
  const maxAttempts = 100
  
  while (attempts < maxAttempts) {
    // Find all locations with LOC prefix and extract the highest number
    const locations = await masterPrisma.location.findMany({
      where: {
        storeCode: {
          startsWith: 'LOC'
        }
      },
      select: { storeCode: true },
      orderBy: { locationId: 'desc' }
    })

    let nextNumber = 1
    
    if (locations.length > 0) {
      // Extract numbers from all LOC codes and find the maximum
      const numbers = locations
        .map(l => {
          const match = l.storeCode.match(/^LOC(\d+)$/i)
          return match ? parseInt(match[1]) : 0
        })
        .filter(n => n > 0)
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1
      }
    }
    
    // Format as LOC + padded 3-digit number
    const storeCode = `LOC${String(nextNumber).padStart(3, '0')}`
    
    // Check if this code already exists
    const existing = await masterPrisma.location.findUnique({
      where: { storeCode }
    })
    
    if (!existing) {
      return storeCode
    }
    
    // If code exists, try next number
    nextNumber++
    attempts++
  }
  
  // Fallback: use timestamp if we can't find a unique code
  const timestamp = Date.now().toString().slice(-6)
  return `LOC${timestamp}`
}

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
      orderBy: {
        createdOn: 'desc'
      }
    })

    // Fetch company and dealer data separately for each location
    const locationsWithRelations = await Promise.all(
      locations.map(async (location) => {
        const [company, dealer] = await Promise.all([
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
          }) : null
        ])

        return {
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
          } : null
        }
      })
    )

    return NextResponse.json(locationsWithRelations)
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
      entityType
    } = body

    // Generate store code if empty
    let finalStoreCode = storeCode
    if (!storeCode || storeCode.trim() === '') {
      finalStoreCode = await generateStoreCode()
    }

    const existingStore = await masterPrisma.location.findUnique({
      where: { storeCode: finalStoreCode }
    })

    if (existingStore) {
      return NextResponse.json(
        { error: 'Store code already exists' },
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
    }

    // Create location
    const locationData: any = {
      locationName,
      storeCode: finalStoreCode,
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2 || null,
      city: city || null,
      state: state || null,
      country: country || null,
      zipcode: zipcode || null,
      phone: phone || null,
      email: email || null,
      federalTaxId: federalTaxId || null,
      socialSecurityNumber: socialSecurityNumber || null,
      entityType: entityType || null,
      isActive: 1,
      syncEnabled: 1
    }

    // Only include companyId if provided and not empty
    if (companyId && typeof companyId === 'string' && companyId.trim() !== '') {
      locationData.companyId = BigInt(companyId)
    }

    // Only include dealerId if provided and not empty
    if (dealerId && typeof dealerId === 'string' && dealerId.trim() !== '') {
      locationData.dealerId = BigInt(dealerId)
    }

    const location = await masterPrisma.location.create({
      data: locationData
    })

    // Sync master data to location (async, don't wait)
    syncMasterDataToLocation(finalStoreCode, 'FULL').catch(error => {
      console.error(`Failed to sync master data to ${finalStoreCode}:`, error)
    })

    return NextResponse.json({
      ...location,
      locationId: location.locationId.toString(),
      companyId: location.companyId?.toString() || null,
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

