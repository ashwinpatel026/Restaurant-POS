/**
 * Location Permission Service
 * Checks permissions in the location database (synced copy)
 * Used by location/dashboard API routes (/api/dashboard/*)
 */

import { prisma } from '@/lib/database'

// Cache for permission lookups (in-memory cache)
const permissionCache = new Map<string, Set<string>>()
const cacheExpiry = new Map<string, number>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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

  // Check cache first
  const cacheKey = `${roleCode}:permissions`
  const cached = permissionCache.get(cacheKey)
  const expiry = cacheExpiry.get(cacheKey) || 0

  if (cached && Date.now() < expiry) {
    return cached.has(permissionCode)
  }

  // Query location database
  const rolePermission = await prisma.rolePermission.findFirst({
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
    const allPermissions = await prisma.rolePermission.findMany({
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
}

/**
 * Get all permissions for a role
 */
export async function getUserPermissions(roleCode: string): Promise<string[]> {
  // SUPER_ADMIN has all permissions
  if (roleCode === 'SUPER_ADMIN') {
    const allPermissions = await prisma.permission.findMany({
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

  // Query location database
  const rolePermissions = await prisma.rolePermission.findMany({
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

  // Debug logging (commented out - uncomment if needed for debugging)
  // console.log(`[locationPermissionService] Role: ${roleCode}, Found ${permissions.length} permissions in location DB`)
  // if (permissions.length > 0) {
  //   console.log(`[locationPermissionService] Sample permissions:`, permissions.slice(0, 5).join(', '))
  // }

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

