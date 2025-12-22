import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

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
      password,
      firstName,
      lastName,
      companyId,
      dealerId,
      locationId,
      role,
      accessLevel,
      defaultStoreCode,
      storeCodes // Array of store codes for LOCATION access level
    } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Auto-determine accessLevel from role
    let determinedAccessLevel: string
    if (role === 'SUPER_ADMIN') {
      determinedAccessLevel = 'SUPER_ADMIN' // Full access to all companies, dealers, and locations
      // SUPER_ADMIN doesn't need companyId, dealerId, or locationId
    } else if (role === 'COMPANY_ADMIN') {
      determinedAccessLevel = 'COMPANY'
      if (!companyId) {
        return NextResponse.json(
          { error: 'Company ID required for COMPANY_ADMIN role' },
          { status: 400 }
        )
      }
    } else if (role === 'DEALER_ADMIN') {
      determinedAccessLevel = 'DEALER'
      if (!dealerId) {
        return NextResponse.json(
          { error: 'Dealer ID required for DEALER_ADMIN role' },
          { status: 400 }
        )
      }
    } else {
      // For other roles (OUTLET_MANAGER, STAFF, etc.), use provided accessLevel or default to LOCATION
      determinedAccessLevel = accessLevel || 'LOCATION'
      if (determinedAccessLevel === 'LOCATION' && !locationId) {
        return NextResponse.json(
          { error: 'Location ID required for LOCATION access level' },
          { status: 400 }
        )
      }
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

    // Validate access level assignments
    if (determinedAccessLevel === 'COMPANY' && !companyId) {
      return NextResponse.json(
        { error: 'Company ID required for COMPANY access level' },
        { status: 400 }
      )
    }
    if (determinedAccessLevel === 'DEALER' && !dealerId) {
      return NextResponse.json(
        { error: 'Dealer ID required for DEALER access level' },
        { status: 400 }
      )
    }
    if (determinedAccessLevel === 'LOCATION' && !locationId) {
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
      // Dealers are now independent of companies, so no validation needed
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
      // Locations are independent, so no validation needed for company/dealer relationships
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate username from email (extract part before @)
    // If username already exists, append a number to make it unique
    let baseUsername = email.split('@')[0]
    let username = baseUsername
    let counter = 1
    
    while (true) {
      const existingUsername = await masterPrisma.user.findUnique({
        where: { username }
      })
      if (!existingUsername) break
      username = `${baseUsername}${counter}`
      counter++
      if (counter > 1000) {
        // Fallback: use timestamp
        username = `${baseUsername}_${Date.now()}`
        break
      }
    }

    // Generate sync_id for the user
    const userSyncId = randomUUID()

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
        accessLevel: determinedAccessLevel as any,
        defaultStoreCode: defaultStoreCode || null,
        isActive: true,
        syncId: userSyncId,  // Explicitly set sync_id
        syncSource: 'server'
      }
    })

    // Create UserStoreAccess entries based on access level
    const storeAccesses: Array<{ userId: bigint; locationId: bigint; storeCode: string; isDefault: boolean }> = []

    try {
      if (determinedAccessLevel === 'SUPER_ADMIN') {
        // For SUPER_ADMIN, get ALL locations across all companies and dealers
        const allLocations = await masterPrisma.location.findMany({
          where: {
            isActive: 1
          },
          select: {
            locationId: true,
            storeCode: true
          }
        })

        console.log(`Found ${allLocations.length} locations for SUPER_ADMIN`)

        for (const loc of allLocations) {
          storeAccesses.push({
            userId: user.userId,
            locationId: loc.locationId,
            storeCode: loc.storeCode,
            isDefault: loc.storeCode === defaultStoreCode
          })
        }
      } else if (determinedAccessLevel === 'LOCATION') {
        // For LOCATION access level, use provided storeCodes or get from locationId
        if (storeCodes && Array.isArray(storeCodes) && storeCodes.length > 0) {
          // Get location IDs for the provided store codes
          const locations = await masterPrisma.location.findMany({
            where: {
              storeCode: { in: storeCodes },
              isActive: 1
            },
            select: {
              locationId: true,
              storeCode: true
            }
          })

          console.log(`Found ${locations.length} locations for storeCodes:`, storeCodes)

          for (const loc of locations) {
            storeAccesses.push({
              userId: user.userId,
              locationId: loc.locationId,
              storeCode: loc.storeCode,
              isDefault: loc.storeCode === defaultStoreCode
            })
          }
        } else if (locationId) {
          // If no storeCodes provided but locationId exists, get store code from location
          const location = await masterPrisma.location.findUnique({
            where: { locationId: BigInt(locationId) },
            select: { locationId: true, storeCode: true }
          })
          console.log('Location found for locationId:', locationId, location)
          if (location) {
            storeAccesses.push({
              userId: user.userId,
              locationId: location.locationId,
              storeCode: location.storeCode,
              isDefault: true
            })
          } else {
            console.warn(`Location not found for locationId: ${locationId}`)
          }
        } else {
          console.warn('LOCATION access level but no locationId or storeCodes provided')
        }
      } else if (determinedAccessLevel === 'COMPANY' && companyId) {
        // For COMPANY access level, get all locations in the company
        const locations = await masterPrisma.location.findMany({
          where: {
            companyId: BigInt(companyId),
            isActive: 1
          },
          select: {
            locationId: true,
            storeCode: true
          }
        })

        console.log(`Found ${locations.length} locations for companyId:`, companyId)

        for (const loc of locations) {
          storeAccesses.push({
            userId: user.userId,
            locationId: loc.locationId,
            storeCode: loc.storeCode,
            isDefault: loc.storeCode === defaultStoreCode
          })
        }
      } else if (determinedAccessLevel === 'DEALER' && dealerId) {
        // For DEALER access level, get all locations in the dealer
        const locations = await masterPrisma.location.findMany({
          where: {
            dealerId: BigInt(dealerId),
            isActive: 1
          },
          select: {
            locationId: true,
            storeCode: true
          }
        })

        console.log(`Found ${locations.length} locations for dealerId:`, dealerId)

        for (const loc of locations) {
          storeAccesses.push({
            userId: user.userId,
            locationId: loc.locationId,
            storeCode: loc.storeCode,
            isDefault: loc.storeCode === defaultStoreCode
          })
        }
      } else {
        // This should not happen, but log a warning
        console.warn(`No store access entries to create. Access level: ${determinedAccessLevel} Role: ${role}`)
      }

      console.log(`Creating ${storeAccesses.length} store access entries for user ${user.userId}`)

      // Create store access entries
      if (storeAccesses.length > 0) {
        const result = await masterPrisma.userStoreAccess.createMany({
          data: storeAccesses,
          skipDuplicates: true
        })
        console.log(`Created ${result.count} store access entries`)
      } else {
        console.warn(`No store access entries to create. Access level: ${determinedAccessLevel} Role: ${role}`)
      }
    } catch (storeAccessError) {
      console.error('Error creating store access entries:', storeAccessError)
      // Don't fail the entire request, but log the error
    }

    // Create sync log entries for user and store access
    // Use sync_id as record identifier
    if (!user.syncId) {
      throw new Error('User sync_id is missing. This should not happen.')
    }
    
    // Create sync log entry for user
    try {
      await masterPrisma.$executeRaw`
        INSERT INTO sync_log (table_name, record_id, operation, source, data, change_time, sync_status, location_code)
        VALUES (
          'tbl_user',
          ${user.syncId}::uuid,
          'INSERT',
          'server',
          ${JSON.stringify({
            email: user.email,
            username: user.username,
            password: hashedPassword, // Note: Password is hashed
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role,
            access_level: user.accessLevel,
            company_id: user.companyId?.toString(),
            dealer_id: user.dealerId?.toString(),
            location_id: user.locationId?.toString(),
            default_store_code: user.defaultStoreCode,
            is_active: user.isActive,
            sync_id: user.syncId  // Include sync_id in data
          })}::jsonb,
          NOW(),
          0,
          NULL
        )
      `
    } catch (syncError) {
      console.error('Error creating sync log for user:', syncError)
      // Continue even if sync log fails
    }

    // Automatically trigger sync to all locations that this user has access to
    if (storeAccesses.length > 0) {
      try {
        // Get unique store codes for this user
        const storeCodes = [...new Set(storeAccesses.map(sa => sa.storeCode))]
        
        // Trigger sync for each store
        for (const storeCode of storeCodes) {
          try {
            // Import sync service
            const { syncService } = await import('@/lib/sync/syncService')
            
            // Sync user
            await syncService.syncToLocation({
              locationCode: storeCode,
              tableName: 'tbl_user',
              fullSync: false,
              forceSync: false
            })
            
            console.log(`Auto-synced user to location ${storeCode}`)
          } catch (syncError) {
            console.error(`Error auto-syncing to ${storeCode}:`, syncError)
            // Continue with other stores even if one fails
          }
        }
      } catch (autoSyncError) {
        console.error('Error triggering automatic sync:', autoSyncError)
        // Don't fail the user creation if auto-sync fails
      }
    }

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

