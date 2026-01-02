/**
 * Validation Utilities
 * Common validation functions for duplicate checking
 */

import { masterPrisma, locationPrisma } from '@/lib/databaseManager'

type PrismaClientType = typeof masterPrisma | typeof locationPrisma

/**
 * Check if a value already exists in a database table/model (case-insensitive)
 * 
 * @param modelName - Prisma model name (e.g., 'masterMenuMaster', 'menuMaster')
 * @param fieldName - Field/column name to check (e.g., 'name', 'deptName', 'printerName')
 * @param value - Value to check for duplicates
 * @param options - Optional configuration
 * @param options.db - Database client (masterPrisma or locationPrisma). If not provided, will auto-detect based on model name
 * @param options.storeCode - Store code filter for location-specific checks
 * @param options.excludeId - ID to exclude from check (useful for update operations). Provide the ID field name and value as an object, e.g., { menuMasterId: 123 }
 * @returns Promise<boolean> - true if duplicate exists, false otherwise
 */
export async function checkDuplicate(
  modelName: string,
  fieldName: string,
  value: string | null | undefined,
  options: {
    db?: PrismaClientType
    storeCode?: string
    excludeId?: { [key: string]: string | number | bigint }
  } = {}
): Promise<boolean> {
  // Return false if value is null, undefined, or empty
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return false
  }

  const { db, storeCode, excludeId } = options

  // Determine which database to use
  let database: PrismaClientType
  if (db) {
    database = db
  } else {
    // Auto-detect based on model name
    if (modelName.startsWith('master')) {
      database = masterPrisma
    } else {
      database = locationPrisma
    }
  }

  try {
    // Build the where clause
    const where: any = {
      [fieldName]: {
        equals: value.trim(),
        mode: 'insensitive' // Case-insensitive comparison
      }
    }

    // Add store code filter if provided
    if (storeCode) {
      where.storeCode = storeCode
    }

    // Exclude current record if excludeId is provided
    if (excludeId) {
      where.NOT = excludeId
    }

    // Use dynamic model access
    const model = (database as any)[modelName]
    if (!model) {
      console.error(`Model ${modelName} not found in database client`)
      return false
    }

    const result = await model.findFirst({
      where
    })

    return !!result
  } catch (error: any) {
    console.error(`Error checking duplicate for ${modelName}.${fieldName}:`, error)
    // If there's an error, return false to allow the operation (fail open)
    return false
  }
}

