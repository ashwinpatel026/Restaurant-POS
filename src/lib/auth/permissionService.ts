/**
 * Master Permission Service
 * Checks permissions in the master database
 * Used by master API routes (/api/master/*)
 */

import { masterPrisma } from '@/lib/databaseManager'

// Cache for permission lookups (in-memory cache)
const permissionCache = new Map<string, Set<string>>()
const cacheExpiry = new Map<string, number>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

/**
 * Check if a role has a specific permission
 */
export async function hasPermission(
  roleCode: string,
  permissionCode: string
): Promise<boolean> {
  // SUPER_ADMIN always has all permissions
  if (roleCode === 'SUPER_ADMIN') {
    return true
  }

  try {
    // Check cache first
    const cacheKey = `${roleCode}:permissions`
    const cached = permissionCache.get(cacheKey)
    const expiry = cacheExpiry.get(cacheKey) || 0

    if (cached && Date.now() < expiry) {
      return cached.has(permissionCode)
    }

    // Query database
    const rolePermission = await masterPrisma.rolePermission.findFirst({
      where: {
        roleCode,
        permissionCode,
        role: {
          isActive: true,
        },
        permission: {
          isActive: true,
        },
      },
    })

    const hasPerm = !!rolePermission

    // Update cache
    if (cached) {
      cached.add(permissionCode)
    } else {
      // Load all permissions for this role into cache
      const allPermissions = await masterPrisma.rolePermission.findMany({
        where: {
          roleCode,
          role: {
            isActive: true,
          },
          permission: {
            isActive: true,
          },
        },
        select: {
          permissionCode: true,
        },
      })

      const permissionSet = new Set(allPermissions.map(rp => rp.permissionCode))
      permissionCache.set(cacheKey, permissionSet)
      cacheExpiry.set(cacheKey, Date.now() + CACHE_TTL)
    }

    return hasPerm
  } catch (error: any) {
    // If tables don't exist yet (migrations not run), return false
    // This will be caught by checkMasterPermission and handled there
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      throw error // Re-throw to be handled by checkMasterPermission
    }
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Get all permissions for a role
 */
export async function getUserPermissions(roleCode: string): Promise<string[]> {
  // SUPER_ADMIN has all permissions
  if (roleCode === 'SUPER_ADMIN') {
    const allPermissions = await masterPrisma.permission.findMany({
      where: { isActive: true },
      select: { permissionCode: true },
    })
    return allPermissions.map(p => p.permissionCode)
  }

  // Check cache first
  const cacheKey = `${roleCode}:permissions`
  const cached = permissionCache.get(cacheKey)
  const expiry = cacheExpiry.get(cacheKey) || 0

  if (cached && Date.now() < expiry) {
    return Array.from(cached)
  }

  // Query database
  const rolePermissions = await masterPrisma.rolePermission.findMany({
    where: {
      roleCode,
      role: {
        isActive: true,
      },
      permission: {
        isActive: true,
      },
    },
    select: {
      permissionCode: true,
    },
  })

  const permissions = rolePermissions.map(rp => rp.permissionCode)

  // Update cache
  const permissionSet = new Set(permissions)
  permissionCache.set(cacheKey, permissionSet)
  cacheExpiry.set(cacheKey, Date.now() + CACHE_TTL)

  return permissions
}

/**
 * Clear permission cache for a role (call when permissions are updated)
 */
export function clearPermissionCache(roleCode?: string): void {
  if (roleCode) {
    permissionCache.delete(`${roleCode}:permissions`)
    cacheExpiry.delete(`${roleCode}:permissions`)
  } else {
    permissionCache.clear()
    cacheExpiry.clear()
  }
}

