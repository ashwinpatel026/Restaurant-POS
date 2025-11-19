// Database Manager for Two-Database Architecture
// Manages connections to both Master Database and Location Database

import { PrismaClient as LocationPrismaClient } from '@prisma/client'
import { PrismaClient as MasterPrismaClient } from '@prisma/master-client'

// ============================================
// Location Database (Shared by all stores)
// ============================================

const globalForLocationPrisma = globalThis as unknown as {
  locationPrisma: LocationPrismaClient | undefined
}

export const locationPrisma = globalForLocationPrisma.locationPrisma ?? new LocationPrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForLocationPrisma.locationPrisma = locationPrisma
}

// ============================================
// Master Database (Tenant Management)
// ============================================

const globalForMasterPrisma = globalThis as unknown as {
  masterPrisma: MasterPrismaClient | undefined
}

export const masterPrisma = globalForMasterPrisma.masterPrisma ?? new MasterPrismaClient({
  datasources: {
    db: { url: process.env.MASTER_DATABASE_URL }
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForMasterPrisma.masterPrisma = masterPrisma
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get location database client (for all stores, filtered by storeCode)
 */
export function getLocationDB(): LocationPrismaClient {
  return locationPrisma
}

/**
 * Get master database client (for tenant management)
 */
export function getMasterDB(): MasterPrismaClient {
  return masterPrisma
}

/**
 * Connect to both databases
 */
export async function connectDatabases() {
  try {
    await Promise.all([
      locationPrisma.$connect(),
      masterPrisma.$connect()
    ])
    console.log('✅ Both databases connected successfully')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

/**
 * Disconnect from both databases
 */
export async function disconnectDatabases() {
  await Promise.all([
    locationPrisma.$disconnect(),
    masterPrisma.$disconnect()
  ])
  console.log('✅ Both databases disconnected')
}

/**
 * Health check for both databases
 */
export async function checkDatabases() {
  try {
    await Promise.all([
      locationPrisma.$queryRaw`SELECT 1`,
      masterPrisma.$queryRaw`SELECT 1`
    ])
    return { location: true, master: true }
  } catch (error) {
    console.error('❌ Database health check failed:', error)
    return { location: false, master: false }
  }
}

// Export default locationPrisma for backward compatibility
export default locationPrisma


