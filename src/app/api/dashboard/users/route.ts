import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { checkLocationPermission, getUserAccessInfo, getSelectedStoreCode } from '@/lib/auth/accessControl'
import { masterPrisma } from '@/lib/databaseManager'
import { serializeBigInt } from '@/lib/utils/bigIntSerializer'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view users
    if (!(await checkLocationPermission(session.user.role, 'users.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user access information
    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Step 1: Build access level filter
    let accessLevelFilter: any = {}
    let syncIds: string[] = []
    
    if (accessInfo.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN: Show ALL users (no filtering by storeCode or access level)
      // No filters needed - will query all users
    } else {
      // For non-SUPER_ADMIN users, filter by selectedStoreCode
      const searchParams = request.nextUrl.searchParams
      const queryStoreCode = searchParams.get('storeCode')
      const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
      
      if (!selectedStoreCode) {
        return NextResponse.json(
          { error: 'No accessible store selected' },
          { status: 403 }
        )
      }

      // Find all users with access to selectedStoreCode (from master DB)
      const storeAccesses = await masterPrisma.userStoreAccess.findMany({
        where: { storeCode: selectedStoreCode },
        select: { userId: true }
      })

      const masterUserIds = storeAccesses.map((sa) => sa.userId)
      
      // If no users have access to this storeCode, return empty array
      if (masterUserIds.length === 0) {
        return NextResponse.json([])
      }

      const masterUsers = await masterPrisma.user.findMany({
        where: { userId: { in: masterUserIds } },
        select: { syncId: true }
      })
      
      syncIds = masterUsers.map((u) => u.syncId).filter(Boolean) as string[]
      
      // If no syncIds found, return empty array
      if (syncIds.length === 0) {
        return NextResponse.json([])
      }

      // Build access level filter for non-SUPER_ADMIN
      if (accessInfo.accessLevel === 'COMPANY' && accessInfo.companyId) {
        // COMPANY: Filter by same companyId
        accessLevelFilter.companyId = BigInt(accessInfo.companyId)
      } else if (accessInfo.accessLevel === 'DEALER' && accessInfo.dealerId) {
        // DEALER: Filter by same dealerId
        accessLevelFilter.dealerId = BigInt(accessInfo.dealerId)
      } else if (accessInfo.accessLevel === 'LOCATION' && accessInfo.accessibleStoreCodes.length === 1) {
        // LOCATION with single storeCode: only own user
        accessLevelFilter.id = parseInt(session.user.id)
      }
      // LOCATION with multiple storeCodes: No additional access level filter (will be filtered by storeCode via syncIds)
    }

    // Step 2: Combine filters
    const whereClause: any = { ...accessLevelFilter }
    
    // Only add storeCode filter for non-SUPER_ADMIN users
    if (accessInfo.role !== 'SUPER_ADMIN' && syncIds.length > 0) {
      whereClause.syncId = { in: syncIds } // Filter by selectedStoreCode
    }

    // Step 4: Query location users
    const users = await (prisma as any).user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })

    // Remove password and serialize BigInt values for JSON response
    const usersWithoutPassword = users.map((user: any) => {
      const { password, ...userWithoutPassword } = user
      // Convert BigInt fields to strings for JSON serialization
      return {
        ...userWithoutPassword,
        id: userWithoutPassword.id.toString(),
        companyId: userWithoutPassword.companyId ? userWithoutPassword.companyId.toString() : null,
        dealerId: userWithoutPassword.dealerId ? userWithoutPassword.dealerId.toString() : null,
        locationId: userWithoutPassword.locationId ? userWithoutPassword.locationId.toString() : null,
        createdAt: userWithoutPassword.createdAt ? userWithoutPassword.createdAt.toISOString() : null,
        updatedAt: userWithoutPassword.updatedAt ? userWithoutPassword.updatedAt.toISOString() : null,
      }
    })

    return NextResponse.json(usersWithoutPassword)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to create users
    if (!(await checkLocationPermission(session.user.role, 'users.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, username, password, firstName, lastName, role, outletId } = body

    // Hash password
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await (prisma as any).user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        outletId: outletId ? parseInt(outletId) : null,
      }
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
