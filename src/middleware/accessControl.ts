// Access Control Middleware for Multi-Tenant System
// Handles user access levels: COMPANY, DEALER, LOCATION

import { masterPrisma } from '@/lib/databaseManager'

export type AccessLevel = 'COMPANY' | 'DEALER' | 'LOCATION'

export interface UserWithAccess {
  userId: bigint
  email: string
  companyId: bigint | null
  dealerId: bigint | null
  locationId: bigint | null
  accessLevel: AccessLevel
  role: string
  company?: {
    companyId: bigint
    companyCode: string
    locations: Array<{
      locationId: bigint
      storeCode: string
      isActive: number
    }>
  } | null
  dealer?: {
    dealerId: bigint
    dealerCode: string
    locations: Array<{
      locationId: bigint
      storeCode: string
      isActive: number
    }>
  } | null
  location?: {
    locationId: bigint
    storeCode: string
    isActive: number
  } | null
}

/**
 * Get user with access information from master database
 */
export async function getUserWithAccess(userId: number): Promise<UserWithAccess | null> {
  try {
    const user = await masterPrisma.user.findUnique({
      where: { userId: BigInt(userId) },
      include: {
        company: {
          include: {
            locations: {
              select: {
                locationId: true,
                storeCode: true,
                isActive: true
              }
            }
          }
        },
        dealer: {
          include: {
            locations: {
              select: {
                locationId: true,
                storeCode: true,
                isActive: true
              }
            }
          }
        },
        location: {
          select: {
            locationId: true,
            storeCode: true,
            isActive: true
          }
        }
      }
    })

    if (!user) return null

    return {
      userId: user.userId,
      email: user.email,
      companyId: user.companyId,
      dealerId: user.dealerId,
      locationId: user.locationId,
      accessLevel: user.accessLevel as AccessLevel,
      role: user.role,
      company: user.company,
      dealer: user.dealer,
      location: user.location
    }
  } catch (error) {
    console.error('Error fetching user with access:', error)
    return null
  }
}

/**
 * Get all store codes that a user can access based on their access level
 */
export async function getAccessibleStores(userId: number): Promise<string[]> {
  const user = await getUserWithAccess(userId)
  
  if (!user) return []

  if (user.accessLevel === 'COMPANY' && user.company) {
    // User can access all stores in the company
    return user.company.locations
      .filter(loc => loc.isActive === 1)
      .map(loc => loc.storeCode)
  }

  if (user.accessLevel === 'DEALER' && user.dealer) {
    // User can access all stores in the dealer
    return user.dealer.locations
      .filter(loc => loc.isActive === 1)
      .map(loc => loc.storeCode)
  }

  if (user.accessLevel === 'LOCATION' && user.location) {
    // User can only access their assigned location
    return user.location.isActive === 1 ? [user.location.storeCode] : []
  }

  return []
}

/**
 * Check if user has access to a specific store
 */
export async function checkStoreAccess(
  userId: number,
  storeCode: string
): Promise<boolean> {
  const accessibleStores = await getAccessibleStores(userId)
  return accessibleStores.includes(storeCode)
}

/**
 * Get the primary store code for a user (first accessible store)
 */
export async function getPrimaryStoreCode(userId: number): Promise<string | null> {
  const accessibleStores = await getAccessibleStores(userId)
  return accessibleStores.length > 0 ? accessibleStores[0] : null
}

/**
 * Validate store code and user access
 * Throws error if access is denied
 */
export async function validateStoreAccess(
  userId: number,
  storeCode: string
): Promise<void> {
  const hasAccess = await checkStoreAccess(userId, storeCode)
  
  if (!hasAccess) {
    throw new Error(`User does not have access to store: ${storeCode}`)
  }
}


