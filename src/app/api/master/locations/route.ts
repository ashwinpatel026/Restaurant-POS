import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { syncMasterDataToLocation } from '@/services/syncService'
import { randomBytes } from 'crypto'

// Helper function to generate secure API key
function generateAPIKey(): string {
  // Generate a 32-byte random key and convert to hex (64 characters)
  // Prefix with 'pos_' to identify it as a POS API key
  const randomKey = randomBytes(32).toString('hex')
  return `pos_${randomKey}`
}

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

    // Generate API key for the location
    const apiKey = generateAPIKey()

    // Create location
    const locationData: any = {
      locationName,
      storeCode: finalStoreCode,
      apiKey: apiKey,
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

    // ------------------------------------------------------------------------
    // Automatically create user store access entries for this new location
    // Logic:
    // 1) Always give SUPER_ADMIN users access to the new location
    // 2) If location has companyId, give all users of that company access
    // 3) If location has dealerId, give all users of that dealer access
    // 4) If no companyId and no dealerId, only SUPER_ADMIN users get access
    //
    // Note: Unique constraint (userId, storeCode) + skipDuplicates avoids dupes
    // ------------------------------------------------------------------------
    try {
      const storeAccesses: Array<{
        userId: bigint
        locationId: bigint
        storeCode: string
        isDefault: boolean
      }> = []

      // 1) SUPER_ADMIN users (always)
      const superAdmins = await masterPrisma.user.findMany({
        where: {
          role: 'SUPER_ADMIN',
          isActive: true
        },
        select: {
          userId: true
        }
      })

      for (const u of superAdmins) {
        storeAccesses.push({
          userId: u.userId,
          locationId: location.locationId,
          storeCode: finalStoreCode,
          // For auto-created entries, don't force any default store
          isDefault: false
        })
      }

      // 2) Company users (if location has companyId)
      if (location.companyId) {
        const companyUsers = await masterPrisma.user.findMany({
          where: {
            companyId: location.companyId,
            isActive: true
          },
          select: {
            userId: true
          }
        })

        for (const u of companyUsers) {
          storeAccesses.push({
            userId: u.userId,
            locationId: location.locationId,
            storeCode: finalStoreCode,
            isDefault: false
          })
        }
      }

      // 3) Dealer users (if location has dealerId)
      if (location.dealerId) {
        const dealerUsers = await masterPrisma.user.findMany({
          where: {
            dealerId: location.dealerId,
            isActive: true
          },
          select: {
            userId: true
          }
        })

        for (const u of dealerUsers) {
          storeAccesses.push({
            userId: u.userId,
            locationId: location.locationId,
            storeCode: finalStoreCode,
            isDefault: false
          })
        }
      }

      if (storeAccesses.length > 0) {
        const result = await masterPrisma.userStoreAccess.createMany({
          data: storeAccesses,
          skipDuplicates: true
        })
        console.log(
          `Created ${result.count} user store access entries for new location ${location.locationId} (${finalStoreCode})`
        )
      } else {
        console.log(
          `No user store access entries created for new location ${location.locationId} (${finalStoreCode})`
        )
      }
    } catch (storeAccessError) {
      // Don't fail location creation if store access creation fails
      console.error(
        'Error creating user store access entries for new location:',
        storeAccessError
      )
    }

    // Sync master data to location (async, don't wait)
    syncMasterDataToLocation(finalStoreCode, 'FULL').catch(error => {
      console.error(`Failed to sync master data to ${finalStoreCode}:`, error)
    })

    return NextResponse.json({
      ...location,
      locationId: location.locationId.toString(),
      companyId: location.companyId?.toString() || null,
      dealerId: location.dealerId?.toString() || null,
      apiKey: location.apiKey // Include API key in response for initial setup
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

