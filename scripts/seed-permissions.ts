/**
 * Seed Default Permissions and Roles
 * This script creates default permissions for all modules and assigns them to system roles
 */

import { PrismaClient as MasterPrismaClient } from '@prisma/master-client'
import { randomUUID } from 'crypto'

const masterPrisma = new MasterPrismaClient()

// Define all modules and their actions
const MODULES = {
  users: ['create', 'read', 'update', 'delete', 'manage', 'view'],
  locations: ['create', 'read', 'update', 'delete', 'manage', 'view'],
  companies: ['create', 'read', 'update', 'delete', 'manage', 'view'],
  dealers: ['create', 'read', 'update', 'delete', 'manage', 'view'],
  menu: ['create', 'read', 'update', 'delete', 'manage', 'view'],
  reports: ['view', 'export', 'manage'],
  roles: ['create', 'read', 'update', 'delete', 'manage', 'view'],
  permissions: ['view', 'manage'],
  settings: ['view', 'update', 'manage'],
}

// Define default role permissions
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [], // Will get all permissions
  COMPANY_ADMIN: [
    // Company-scoped permissions
    'companies.view',
    'companies.read',
    'dealers.create',
    'dealers.read',
    'dealers.update',
    'dealers.view',
    'dealers.manage',
    'locations.create',
    'locations.read',
    'locations.update',
    'locations.view',
    'locations.manage',
    'users.create',
    'users.read',
    'users.update',
    'users.view',
    'users.manage',
    'menu.view',
    'menu.read',
    'reports.view',
    'settings.view',
  ],
  DEALER_ADMIN: [
    // Dealer-scoped permissions
    'dealers.view',
    'dealers.read',
    'locations.create',
    'locations.read',
    'locations.update',
    'locations.view',
    'locations.manage',
    'users.create',
    'users.read',
    'users.update',
    'users.view',
    'users.manage',
    'menu.view',
    'menu.read',
    'reports.view',
    'settings.view',
  ],
  OUTLET_MANAGER: [
    // Location-scoped permissions
    'locations.view',
    'locations.read',
    'users.create',
    'users.read',
    'users.update',
    'users.view',
    'menu.create',
    'menu.read',
    'menu.update',
    'menu.view',
    'menu.manage',
    'reports.view',
    'settings.view',
  ],
  CAPTAIN: [
    'menu.view',
    'menu.read',
    'reports.view',
  ],
  CASHIER: [
    'menu.view',
    'menu.read',
    'reports.view',
  ],
  KITCHEN_STAFF: [
    'menu.view',
    'menu.read',
  ],
}

async function seedPermissions() {
  console.log('🌱 Seeding permissions...')

  // Create all permissions
  const permissions: Array<{ permissionCode: string; permissionName: string; module: string; action: string }> = []

  for (const [module, actions] of Object.entries(MODULES)) {
    for (const action of actions) {
      const permissionCode = `${module}.${action}`
      const permissionName = `${module.charAt(0).toUpperCase() + module.slice(1)} ${action.charAt(0).toUpperCase() + action.slice(1)}`
      
      permissions.push({
        permissionCode,
        permissionName,
        module,
        action,
      })
    }
  }

  // Insert permissions
  for (const perm of permissions) {
    await masterPrisma.permission.upsert({
      where: { permissionCode: perm.permissionCode },
      update: {
        permissionName: perm.permissionName,
        module: perm.module,
        action: perm.action,
        isActive: true,
      },
      create: {
        permissionCode: perm.permissionCode,
        permissionName: perm.permissionName,
        module: perm.module,
        action: perm.action,
        description: `Permission to ${perm.action} ${perm.module}`,
        isActive: true,
        syncId: randomUUID(),
        syncSource: 'server',
      },
    })
  }

  console.log(`✅ Created ${permissions.length} permissions`)
  return permissions
}

async function seedRoles() {
  console.log('🌱 Seeding roles...')

  const roleDefinitions = [
    {
      roleCode: 'SUPER_ADMIN',
      roleName: 'Super Administrator',
      description: 'Full access to all system features and data',
      isSystemRole: true,
    },
    {
      roleCode: 'COMPANY_ADMIN',
      roleName: 'Company Administrator',
      description: 'Manages companies, dealers, locations, and users within their company',
      isSystemRole: true,
    },
    {
      roleCode: 'DEALER_ADMIN',
      roleName: 'Dealer Administrator',
      description: 'Manages dealers, locations, and users within their dealer',
      isSystemRole: true,
    },
    {
      roleCode: 'OUTLET_MANAGER',
      roleName: 'Outlet Manager',
      description: 'Manages location operations, menu, and users',
      isSystemRole: true,
    },
    {
      roleCode: 'CAPTAIN',
      roleName: 'Captain',
      description: 'Manages orders and service operations',
      isSystemRole: true,
    },
    {
      roleCode: 'CASHIER',
      roleName: 'Cashier',
      description: 'Handles payments and transactions',
      isSystemRole: true,
    },
    {
      roleCode: 'KITCHEN_STAFF',
      roleName: 'Kitchen Staff',
      description: 'Prepares food orders',
      isSystemRole: true,
    },
  ]

  // Insert roles
  for (const roleDef of roleDefinitions) {
    await masterPrisma.role.upsert({
      where: { roleCode: roleDef.roleCode },
      update: {
        roleName: roleDef.roleName,
        description: roleDef.description,
        isSystemRole: roleDef.isSystemRole,
        isActive: true,
      },
      create: {
        roleCode: roleDef.roleCode,
        roleName: roleDef.roleName,
        description: roleDef.description,
        isSystemRole: roleDef.isSystemRole,
        isActive: true,
        syncId: randomUUID(),
        syncSource: 'server',
      },
    })
  }

  console.log(`✅ Created ${roleDefinitions.length} roles`)
  return roleDefinitions
}

async function seedRolePermissions() {
  console.log('🌱 Seeding role-permission mappings...')

  // Get all permissions
  const allPermissions = await masterPrisma.permission.findMany({
    where: { isActive: true },
  })

  const permissionMap = new Map(allPermissions.map(p => [p.permissionCode, p]))

  // For SUPER_ADMIN, assign all permissions
  const superAdminRole = await masterPrisma.role.findUnique({
    where: { roleCode: 'SUPER_ADMIN' },
  })

  if (superAdminRole) {
    // Delete existing permissions for SUPER_ADMIN
    await masterPrisma.rolePermission.deleteMany({
      where: { roleCode: 'SUPER_ADMIN' },
    })

    // Assign all permissions
    for (const permission of allPermissions) {
      await masterPrisma.rolePermission.create({
        data: {
          roleCode: superAdminRole.roleCode,
          permissionCode: permission.permissionCode,
          syncId: randomUUID(),
          syncSource: 'server',
        },
      })
    }
    console.log(`✅ Assigned ${allPermissions.length} permissions to SUPER_ADMIN`)
  }

  // Assign permissions to other roles
  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    if (roleCode === 'SUPER_ADMIN') continue // Already handled

    const role = await masterPrisma.role.findUnique({
      where: { roleCode },
    })

    if (!role) {
      console.warn(`⚠️  Role ${roleCode} not found, skipping...`)
      continue
    }

    // Delete existing permissions for this role
    await masterPrisma.rolePermission.deleteMany({
      where: { roleCode },
    })

    // Assign permissions
    for (const permissionCode of permissionCodes) {
      const permission = permissionMap.get(permissionCode)
      if (!permission) {
        console.warn(`⚠️  Permission ${permissionCode} not found, skipping...`)
        continue
      }

      await masterPrisma.rolePermission.create({
        data: {
          roleCode: role.roleCode,
          permissionCode: permission.permissionCode,
          syncId: randomUUID(),
          syncSource: 'server',
        },
      })
    }

    console.log(`✅ Assigned ${permissionCodes.length} permissions to ${roleCode}`)
  }
}

async function main() {
  try {
    console.log('🚀 Starting permission seeding...\n')

    await seedPermissions()
    await seedRoles()
    await seedRolePermissions()

    console.log('\n✅ Permission seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding permissions:', error)
    throw error
  } finally {
    await masterPrisma.$disconnect()
  }
}

main()

