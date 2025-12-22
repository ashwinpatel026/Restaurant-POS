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
      where: { userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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

    // Remove password
    const { password, ...userWithoutPassword } = user

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
      defaultStoreCode,
      storeCodes, // Array of store codes for LOCATION access level
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

    // Auto-determine accessLevel from role if role is being updated
    let determinedAccessLevel: string | undefined = accessLevel
    const roleToUse = role || existingUser.role
    
    if (role) {
      // Role is being updated, auto-determine accessLevel
      if (role === 'SUPER_ADMIN') {
        determinedAccessLevel = 'SUPER_ADMIN'
      } else if (role === 'COMPANY_ADMIN') {
        determinedAccessLevel = 'COMPANY'
      } else if (role === 'DEALER_ADMIN') {
        determinedAccessLevel = 'DEALER'
      } else {
        // For other roles, use provided accessLevel or keep existing
        determinedAccessLevel = accessLevel || existingUser.accessLevel || 'LOCATION'
      }
    } else if (accessLevel) {
      // Only accessLevel is being updated, use it
      determinedAccessLevel = accessLevel
    } else {
      // Neither is being updated, use existing
      determinedAccessLevel = existingUser.accessLevel || undefined
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
    if (determinedAccessLevel) updateData.accessLevel = determinedAccessLevel
    if (defaultStoreCode !== undefined) updateData.defaultStoreCode = defaultStoreCode
    
    // Ensure sync_id exists - database will handle UUID generation if missing
    if (!existingUser.syncId) {
      updateData.syncSource = 'server'
    }
    if (isActive !== undefined) updateData.isActive = isActive
    updateData.updatedOn = new Date()

    const user = await masterPrisma.user.update({
      where: { userId },
      data: updateData
    })

    // Initialize storeAccesses array - will be populated either from update or existing data
    let storeAccesses: Array<{ userId: bigint; locationId: bigint; storeCode: string; isDefault: boolean }> = []

    // Update store access if storeCodes provided or access level/role changed
    if (storeCodes !== undefined || determinedAccessLevel !== undefined || role !== undefined) {
      // Delete existing store access
      await masterPrisma.userStoreAccess.deleteMany({
        where: { userId: user.userId }
      })

      // Create new store access entries
      const newAccessLevel = determinedAccessLevel || existingUser.accessLevel

      if (newAccessLevel === 'SUPER_ADMIN') {
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

        for (const loc of allLocations) {
          storeAccesses.push({
            userId: user.userId,
            locationId: loc.locationId,
            storeCode: loc.storeCode,
            isDefault: loc.storeCode === (defaultStoreCode || user.defaultStoreCode)
          })
        }
      } else if (newAccessLevel === 'LOCATION') {
        if (storeCodes && Array.isArray(storeCodes) && storeCodes.length > 0) {
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

          for (const loc of locations) {
            storeAccesses.push({
              userId: user.userId,
              locationId: loc.locationId,
              storeCode: loc.storeCode,
              isDefault: loc.storeCode === (defaultStoreCode || user.defaultStoreCode)
            })
          }
        } else if (user.locationId) {
          const location = await masterPrisma.location.findUnique({
            where: { locationId: user.locationId },
            select: { locationId: true, storeCode: true }
          })
          if (location) {
            storeAccesses.push({
              userId: user.userId,
              locationId: location.locationId,
              storeCode: location.storeCode,
              isDefault: true
            })
          }
        }
      } else if (newAccessLevel === 'COMPANY' && user.companyId) {
        const locations = await masterPrisma.location.findMany({
          where: {
            companyId: user.companyId,
            isActive: 1
          },
          select: {
            locationId: true,
            storeCode: true
          }
        })

        for (const loc of locations) {
          storeAccesses.push({
            userId: user.userId,
            locationId: loc.locationId,
            storeCode: loc.storeCode,
            isDefault: loc.storeCode === (defaultStoreCode || user.defaultStoreCode)
          })
        }
      } else if (newAccessLevel === 'DEALER' && user.dealerId) {
        const locations = await masterPrisma.location.findMany({
          where: {
            dealerId: user.dealerId,
            isActive: 1
          },
          select: {
            locationId: true,
            storeCode: true
          }
        })

        for (const loc of locations) {
          storeAccesses.push({
            userId: user.userId,
            locationId: loc.locationId,
            storeCode: loc.storeCode,
            isDefault: loc.storeCode === (defaultStoreCode || user.defaultStoreCode)
          })
        }
      }

      // Create new store access entries
      if (storeAccesses.length > 0) {
        await masterPrisma.userStoreAccess.createMany({
          data: storeAccesses,
          skipDuplicates: true
        })
      }
    } else {
      // If store access wasn't updated, fetch existing store accesses for sync trigger
      const existingStoreAccesses = await masterPrisma.userStoreAccess.findMany({
        where: { userId: user.userId },
        select: {
          userId: true,
          locationId: true,
          storeCode: true,
          isDefault: true
        }
      })
      storeAccesses = existingStoreAccesses.map(sa => ({
        userId: sa.userId,
        locationId: sa.locationId,
        storeCode: sa.storeCode,
        isDefault: sa.isDefault
      }))
    }

    // Create sync log entry for user update
    // Use sync_id as record identifier
    // Database will handle UUID generation if syncId is missing
    try {
      // Build sync data object - include password if it was updated
      const syncData: any = {
        email: user.email,
        username: user.username,
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role,
        access_level: user.accessLevel,
        company_id: user.companyId?.toString(),
        dealer_id: user.dealerId?.toString(),
        location_id: user.locationId?.toString(),
        default_store_code: user.defaultStoreCode,
        is_active: user.isActive
      }

      // Include password in sync data if it was updated
      if (password) {
        syncData.password = user.password  // Use the hashed password from the updated user
      }

      // Include sync_id in data
      if (user.syncId) {
        syncData.sync_id = user.syncId
      }

      if (user.syncId) {
        await masterPrisma.$executeRaw`
          INSERT INTO sync_log (table_name, record_id, operation, source, data, change_time, sync_status, location_code)
          VALUES (
            'tbl_user',
            ${user.syncId}::uuid,
            'UPDATE',
            'server',
            ${JSON.stringify(syncData)}::jsonb,
            NOW(),
            0,
            NULL
          )
        `
      } else {
        // If syncId is missing, database will generate it via default UUID()
        await masterPrisma.$executeRaw`
          INSERT INTO sync_log (table_name, operation, source, data, change_time, sync_status, location_code)
          VALUES (
            'tbl_user',
            'UPDATE',
            'server',
            ${JSON.stringify(syncData)}::jsonb,
            NOW(),
            0,
            NULL
          )
        `
      }
    } catch (syncError) {
      console.error('Error creating sync log for user update:', syncError)
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
            
            console.log(`Auto-synced updated user to location ${storeCode}`)
          } catch (syncError) {
            console.error(`Error auto-syncing to ${storeCode}:`, syncError)
            // Continue with other stores even if one fails
          }
        }
      } catch (autoSyncError) {
        console.error('Error triggering automatic sync:', autoSyncError)
        // Don't fail the user update if auto-sync fails
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

    // Remove password
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

