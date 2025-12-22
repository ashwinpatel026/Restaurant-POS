/**
 * Access Control Utilities
 * Handles user access levels, store filtering, and permissions
 */

import { prisma } from '@/lib/database'
import { masterPrisma } from '@/lib/databaseManager'
import { hasPermission as hasMasterPermission } from './permissionService'
import { hasPermission as hasLocationPermission } from './locationPermissionService'

export interface UserAccessInfo {
  userId: number
  role: string
  accessLevel: 'COMPANY' | 'DEALER' | 'LOCATION' | null
  accessibleStoreCodes: string[]  // List of stores user CAN access (for dropdown)
  defaultStoreCode: string | null  // Default store to show on login
  companyId?: number
  dealerId?: number
  locationId?: number
}

/**
 * Get user access information including accessible stores
 */
export async function getUserAccessInfo(userId: number): Promise<UserAccessInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  let accessibleStoreCodes: string[] = []

  // SUPER ADMIN: Can access ALL stores (but shows ONE at a time)
  if (user.role === 'SUPER_ADMIN') {
    // Get all store codes from master database (all locations)
    const allLocations = await masterPrisma.location.findMany({
      where: { isActive: 1 },
      select: { storeCode: true }
    })
    accessibleStoreCodes = allLocations
      .map(l => l.storeCode)
      .filter(Boolean) as string[]
    
    // Also get from location database (in case some stores exist there)
    // try {
    //   const locationStores = await prisma.$queryRaw<Array<{storeCode: string}>>`
    //     SELECT DISTINCT store_code as "storeCode" 
    //     FROM tbl_order 
    //     WHERE store_code IS NOT NULL
    //     UNION
    //     SELECT DISTINCT store_code as "storeCode"
    //     FROM tbl_menu_master
    //     WHERE store_code IS NOT NULL
    //   `
    //   const locationStoreCodes = locationStores.map(s => s.storeCode).filter(Boolean)
      
    //   // Merge and deduplicate
    //   accessibleStoreCodes = [...new Set([...accessibleStoreCodes, ...locationStoreCodes])]
    // } catch (error) {
    //   // If query fails, just use master locations
    //   console.warn('Could not fetch stores from location DB:', error)
    // }

  } else {
    // Non-Super Admin: Access based on access level
    if (user.accessLevel === 'COMPANY' && user.companyId) {
      // Get all stores for company
      const companyLocations = await masterPrisma.location.findMany({
        where: {
          companyId: BigInt(user.companyId),
          isActive: 1
        },
        select: { storeCode: true }
      })
      accessibleStoreCodes = companyLocations
        .map(l => l.storeCode)
        .filter(Boolean) as string[]

    } else if (user.accessLevel === 'DEALER' && user.dealerId) {
      // Get all stores for dealer
      const dealerLocations = await masterPrisma.location.findMany({
        where: {
          dealerId: BigInt(user.dealerId),
          isActive: 1
        },
        select: { storeCode: true }
      })
      accessibleStoreCodes = dealerLocations
        .map(l => l.storeCode)
        .filter(Boolean) as string[]

    } else if (user.accessLevel === 'LOCATION') {
      // Get stores from user store access table - query directly since relation is removed
      const storeAccesses = await masterPrisma.userStoreAccess.findMany({
        where: { userId: userId },
        select: { storeCode: true }
      })
      accessibleStoreCodes = storeAccesses
        .map(sa => sa.storeCode)
        .filter(Boolean) as string[]
    }
  }

  // Filter accessLevel to only valid values
  const validAccessLevels = ['COMPANY', 'DEALER', 'LOCATION'] as const
  const accessLevel = user.accessLevel && validAccessLevels.includes(user.accessLevel as any)
    ? user.accessLevel
    : null

  return {
    userId: user.id,
    role: user.role,
    accessLevel: accessLevel as 'COMPANY' | 'DEALER' | 'LOCATION' | null,
    accessibleStoreCodes,
    defaultStoreCode: user.defaultStoreCode,
    companyId: user.companyId ? Number(user.companyId) : undefined,
    dealerId: user.dealerId ? Number(user.dealerId) : undefined,
    locationId: user.locationId ? Number(user.locationId) : undefined
  }
}

/**
 * Get the currently selected store (from query param or default)
 */
export function getSelectedStoreCode(
  accessInfo: UserAccessInfo,
  queryStoreCode?: string | null
): string | null {
  // If query param provided and user has access, use it
  if (queryStoreCode && accessInfo.accessibleStoreCodes.includes(queryStoreCode)) {
    return queryStoreCode
  }
  
  // Otherwise use default store
  if (accessInfo.defaultStoreCode && accessInfo.accessibleStoreCodes.includes(accessInfo.defaultStoreCode)) {
    return accessInfo.defaultStoreCode
  }
  
  // Fallback to first accessible store
  if (accessInfo.accessibleStoreCodes.length > 0) {
    return accessInfo.accessibleStoreCodes[0]
  }
  
  return null
}

/**
 * Build store filter - ALWAYS filters by ONE selected store
 */
export function buildStoreFilter(
  accessInfo: UserAccessInfo,
  selectedStoreCode: string | null
): { storeCode: string } | { storeCode: { in: [] } } {
  // Validate selected store is accessible
  if (selectedStoreCode && accessInfo.accessibleStoreCodes.includes(selectedStoreCode)) {
    // Return filter for ONE specific store
    return { storeCode: selectedStoreCode }
  }
  
  // If no valid store selected, return empty filter (no results)
  return { storeCode: { in: [] } }
}

/**
 * Check if user can access a specific store
 */
export function canAccessStore(
  accessInfo: UserAccessInfo,
  storeCode: string
): boolean {
  if (accessInfo.role === 'SUPER_ADMIN') {
    // Super Admin can access any store that exists
    return true
  }
  return accessInfo.accessibleStoreCodes.includes(storeCode)
}

/**
 * Check permission in master database (for master API routes)
 * @param admin Admin object from verifyMasterAdmin
 * @param permissionCode Permission code to check (e.g., 'users.create')
 * @returns Promise<boolean>
 */
export async function checkMasterPermission(
  admin: any,
  permissionCode: string
): Promise<boolean> {
  try {
    if (!admin || !admin.role) {
      return false
    }

    // SUPER_ADMIN always has all permissions
    if (admin.role === 'SUPER_ADMIN') {
      return true
    }

    // If permission tables don't exist yet, allow access (for initial setup)
    try {
      return await hasMasterPermission(admin.role, permissionCode)
    } catch (error: any) {
      // If tables don't exist (e.g., migrations not run), allow access
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        console.warn('Permission tables not found, allowing access:', error.message)
        return true
      }
      throw error
    }
  } catch (error) {
    console.error('Error checking master permission:', error)
    return false
  }
}

/**
 * Check permission in location database (for dashboard API routes)
 * @param userRole User role code
 * @param permissionCode Permission code to check (e.g., 'menu.create')
 * @returns Promise<boolean>
 */
export async function checkLocationPermission(
  userRole: string,
  permissionCode: string
): Promise<boolean> {
  try {
    if (!userRole) {
      return false
    }

    // SUPER_ADMIN always has all permissions
    if (userRole === 'SUPER_ADMIN') {
      return true
    }

    return await hasLocationPermission(userRole, permissionCode)
  } catch (error) {
    console.error('Error checking location permission:', error)
    return false
  }
}

