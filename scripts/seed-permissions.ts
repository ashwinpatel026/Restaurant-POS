/**
 * Seed Default Permissions and Roles
 * This script creates default permissions for all modules and assigns them to system roles
 */

import { PrismaClient as MasterPrismaClient } from '@prisma/master-client'
import { randomUUID } from 'crypto'

const masterPrisma = new MasterPrismaClient()

// Define all modules and their actions
const MODULES = {
  users: ['create', 'update', 'delete', 'view'],
  locations: ['create', 'update', 'delete', 'view'],
  companies: ['create', 'update', 'delete', 'view'],
  dealers: ['create', 'update', 'delete', 'view'],
  menu: ['create', 'update', 'delete', 'view'],
  stations: ['create', 'update', 'delete', 'view'],
  tax: ['create', 'update', 'delete', 'view'],
  printers: ['create', 'update', 'delete', 'view'],
  events: ['create', 'update', 'delete', 'view'],
  modifiers: ['create', 'update', 'delete', 'view'],
  prepzone: ['create', 'update', 'delete', 'view'],
  departments: ['create', 'update', 'delete', 'view'],
  department_types: ['create', 'update', 'delete', 'view'],
  reports: ['view', 'export'],
  roles: ['create', 'update', 'delete', 'view'],
  permissions: ['view'],
  settings: ['view', 'update'],
}

// Additional granular menu permissions
const ADDITIONAL_PERMISSIONS = [
  { permissionCode: 'menu.masters.view', permissionName: 'Menu Masters View', module: 'menu', action: 'masters.view' },
  { permissionCode: 'menu.categories.view', permissionName: 'Menu Categories View', module: 'menu', action: 'categories.view' },
  { permissionCode: 'menu.items.view', permissionName: 'Menu Items View', module: 'menu', action: 'items.view' },
]

// Define default role permissions
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [], // Will get all permissions
  COMPANY_ADMIN: [
    // Company-scoped permissions
    'companies.view',
    'dealers.create',
    'dealers.update',
    'dealers.view',
    'dealers.delete',
    'locations.create',
    'locations.update',
    'locations.view',
    'locations.delete',
    'users.create',
    'users.update',
    'users.view',
    'users.delete',
    'menu.view',
    'reports.view',
    'settings.view',
  ],
  DEALER_ADMIN: [
    // Dealer-scoped permissions
    'dealers.view',
    'locations.create',
    'locations.update',
    'locations.view',
    'locations.delete',
    'users.create',
    'users.update',
    'users.view',
    'users.delete',
    'menu.view',
    'reports.view',
    'settings.view',
  ],
  OUTLET_MANAGER: [
    // Location-scoped permissions
    'locations.view',
    'users.create',
    'users.update',
    'users.view',
    'users.delete',
    'menu.create',
    'menu.update',
    'menu.view',
    'menu.delete',
    'reports.view',
    'settings.view',
  ],
  CAPTAIN: [
    'menu.view',
    'reports.view',
  ],
  CASHIER: [
    'menu.view',
    'reports.view',
  ],
  KITCHEN_STAFF: [
    'menu.view',
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

  // Add additional granular permissions
  for (const perm of ADDITIONAL_PERMISSIONS) {
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
    permissions.push({
      permissionCode: perm.permissionCode,
      permissionName: perm.permissionName,
      module: perm.module,
      action: perm.action,
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

