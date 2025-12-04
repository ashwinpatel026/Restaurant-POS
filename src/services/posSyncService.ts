// POS Sync Service for Two-Way Synchronization
// Handles data synchronization between POS clients and Location Database

import { locationPrisma, masterPrisma } from '@/lib/databaseManager'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

export type ConflictResolutionStrategy = 'last-write-wins' | 'pos-wins' | 'server-wins' | 'manual'

export interface POSSyncResult {
  success: boolean
  recordsProcessed: number
  recordsSucceeded: number
  recordsFailed: number
  errors: string[]
  conflicts: ConflictInfo[]
}

export interface ConflictInfo {
  table: string
  recordId: string
  syncSource: string
  conflictReason: string
  resolved: boolean
}

export interface SyncMetadata {
  syncId: string
  syncSource: 'POS'
  storeCode: string
  timestamp: Date
}

/**
 * Main POS Sync Service
 */
class POSSyncService {
  private conflictStrategy: ConflictResolutionStrategy = 'last-write-wins'

  /**
   * Set conflict resolution strategy
   */
  setConflictStrategy(strategy: ConflictResolutionStrategy) {
    this.conflictStrategy = strategy
  }

  /**
   * Sync data from POS to Location DB
   * Handles insert/update operations with conflict resolution
   */
  async syncDataToLocation(
    storeCode: string,
    tableName: string,
    data: any[],
    conflictStrategy?: ConflictResolutionStrategy
  ): Promise<POSSyncResult> {
    const strategy = conflictStrategy || this.conflictStrategy
    const result: POSSyncResult = {
      success: true,
      recordsProcessed: data.length,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      conflicts: []
    }

    // Validate storeCode
    const location = await masterPrisma.location.findUnique({
      where: { storeCode }
    })

    if (!location || location.isActive !== 1) {
      result.success = false
      result.errors.push('Invalid or inactive store code')
      return result
    }

    // Process each record
    for (const record of data) {
      try {
        // Add POS sync metadata
        const syncMetadata: SyncMetadata = {
          syncId: record.syncId || randomUUID(),
          syncSource: 'POS',
          storeCode,
          timestamp: new Date()
        }

        // Transform and validate data
        const transformedData = this.transformDataForLocation(record, syncMetadata, storeCode)

        // Check for conflicts and resolve
        const conflictResult = await this.handleConflict(
          tableName,
          record,
          transformedData,
          strategy
        )

        if (conflictResult.hasConflict && !conflictResult.resolved) {
          result.conflicts.push({
            table: tableName,
            recordId: record.syncId || record.id?.toString() || 'unknown',
            syncSource: conflictResult.existingSyncSource || 'unknown',
            conflictReason: conflictResult.reason || 'Conflict detected',
            resolved: false
          })
          result.recordsFailed++
          continue
        }

        // Perform upsert operation
        await this.upsertRecord(tableName, transformedData, conflictResult.useExisting)
        
        result.recordsSucceeded++
      } catch (error: any) {
        result.recordsFailed++
        result.errors.push(`Failed to sync record: ${error.message}`)
        result.success = false
      }
    }

    // Update location lastSyncAt
    if (result.recordsSucceeded > 0) {
      await masterPrisma.location.update({
        where: { storeCode },
        data: { lastSyncAt: new Date() }
      })
    }

    return result
  }

  /**
   * Transform POS data to Location DB schema format
   */
  private transformDataForLocation(
    data: any,
    syncMetadata: SyncMetadata,
    storeCode: string
  ): any {
    const transformed: any = { ...data }

    // Set sync metadata
    transformed.syncId = syncMetadata.syncId
    transformed.syncSource = syncMetadata.syncSource
    transformed.storeCode = storeCode

    // Set sync flags
    transformed.isSyncToWeb = 1 // Mark for web sync
    transformed.isSyncToLocal = 0 // Already in local DB

    // Ensure timestamps
    if (!transformed.createdOn) {
      transformed.createdOn = new Date()
    }
    transformed.updatedOn = new Date()

    return transformed
  }

  /**
   * Handle conflict resolution
   */
  private async handleConflict(
    tableName: string,
    incomingRecord: any,
    transformedData: any,
    strategy: ConflictResolutionStrategy
  ): Promise<{
    hasConflict: boolean
    resolved: boolean
    useExisting: boolean
    existingSyncSource?: string
    reason?: string
  }> {
    // Try to find existing record by syncId or unique code
    const existingRecord = await this.findExistingRecord(tableName, incomingRecord)

    if (!existingRecord) {
      return {
        hasConflict: false,
        resolved: true,
        useExisting: false
      }
    }

    // Check if conflict exists
    const existingSyncSource = existingRecord.syncSource || 'server'
    const incomingSyncSource = 'POS'

    // If same source, allow update
    if (existingSyncSource === incomingSyncSource) {
      return {
        hasConflict: false,
        resolved: true,
        useExisting: false
      }
    }

    // Conflict detected - apply resolution strategy
    switch (strategy) {
      case 'pos-wins':
        return {
          hasConflict: true,
          resolved: true,
          useExisting: false,
          existingSyncSource,
          reason: 'POS-wins strategy applied'
        }

      case 'server-wins':
        return {
          hasConflict: true,
          resolved: false,
          useExisting: true,
          existingSyncSource,
          reason: 'Server-wins strategy - rejecting POS update'
        }

      case 'last-write-wins':
        const existingUpdatedAt = existingRecord.updatedOn || existingRecord.updatedAt || existingRecord.createdOn
        const incomingUpdatedAt = transformedData.updatedOn || new Date()

        if (new Date(incomingUpdatedAt) > new Date(existingUpdatedAt)) {
          return {
            hasConflict: true,
            resolved: true,
            useExisting: false,
            existingSyncSource,
            reason: 'Last-write-wins - incoming is newer'
          }
        } else {
          return {
            hasConflict: true,
            resolved: false,
            useExisting: true,
            existingSyncSource,
            reason: 'Last-write-wins - existing is newer'
          }
        }

      case 'manual':
        return {
          hasConflict: true,
          resolved: false,
          useExisting: true,
          existingSyncSource,
          reason: 'Manual resolution required'
        }

      default:
        return {
          hasConflict: true,
          resolved: false,
          useExisting: true,
          existingSyncSource,
          reason: 'Unknown conflict strategy'
        }
    }
  }

  /**
   * Find existing record in Location DB
   */
  private async findExistingRecord(tableName: string, record: any): Promise<any> {
    try {
      const model = (locationPrisma as any)[this.getModelName(tableName)]
      if (!model) {
        return null
      }

      // Try to find by syncId first
      if (record.syncId) {
        const bySyncId = await model.findUnique({
          where: { syncId: record.syncId }
        })
        if (bySyncId) return bySyncId
      }

      // Try to find by unique code/identifier
      const uniqueField = this.getUniqueField(tableName)
      if (uniqueField && record[uniqueField]) {
        const byUnique = await model.findUnique({
          where: { [uniqueField]: record[uniqueField] }
        })
        if (byUnique) return byUnique
      }

      return null
    } catch (error) {
      console.error(`Error finding existing record in ${tableName}:`, error)
      return null
    }
  }

  /**
   * Get Prisma model name from table name
   */
  private getModelName(tableName: string): string {
    const modelMap: Record<string, string> = {
      'menu_items': 'menuItem',
      'menu_item': 'menuItem',
      'tbl_menu_item': 'menuItem',
      'modifier_groups': 'modifierGroup',
      'modifier_group': 'modifierGroup',
      'tbl_modifier_group': 'modifierGroup',
      'modifier_items': 'modifierItem',
      'modifier_item': 'modifierItem',
      'tbl_modifier_item': 'modifierItem',
      'menu_masters': 'menuMaster',
      'menu_master': 'menuMaster',
      'tbl_menu_master': 'menuMaster',
      'menu_categories': 'menuCategory',
      'menu_category': 'menuCategory',
      'tbl_menu_category': 'menuCategory',
      'prep_zones': 'prepZone',
      'prep_zone': 'prepZone',
      'tbl_prep_zone': 'prepZone',
      'time_events': 'timeEvent',
      'time_event': 'timeEvent',
      'tbl_time_events': 'timeEvent',
      'tax': 'tax',
      'tbl_tax': 'tax',
      'stations': 'station',
      'station': 'station',
      'tbl_station': 'station',
      'printers': 'printer',
      'printer': 'printer',
      'tbl_printer': 'printer',
      'orders': 'order',
      'order': 'order',
      'tbl_order': 'order',
      'order_items': 'orderItem',
      'order_item': 'orderItem',
      'tbl_order_item': 'orderItem',
      'tables': 'table',
      'table': 'table',
      'tbl_table': 'table'
    }

    return modelMap[tableName.toLowerCase()] || tableName
  }

  /**
   * Get unique field name for a table
   */
  private getUniqueField(tableName: string): string | null {
    const uniqueFieldMap: Record<string, string> = {
      'menu_items': 'menuItemCode',
      'menu_item': 'menuItemCode',
      'modifier_groups': 'modifierGroupCode',
      'modifier_group': 'modifierGroupCode',
      'modifier_items': 'modifierItemCode',
      'modifier_item': 'modifierItemCode',
      'menu_masters': 'menuMasterCode',
      'menu_master': 'menuMasterCode',
      'menu_categories': 'menuCategoryCode',
      'menu_category': 'menuCategoryCode',
      'prep_zones': 'prepZoneCode',
      'prep_zone': 'prepZoneCode',
      'time_events': 'eventCode',
      'time_event': 'eventCode',
      'tax': 'taxCode',
      'stations': 'stationCode',
      'station': 'stationCode',
      'printers': 'printerCode',
      'printer': 'printerCode',
      'orders': 'orderNumber',
      'order': 'orderNumber',
      'tables': 'tableNumber',
      'table': 'tableNumber'
    }

    return uniqueFieldMap[tableName.toLowerCase()] || null
  }

  /**
   * Upsert record in Location DB
   */
  private async upsertRecord(
    tableName: string,
    data: any,
    useExisting: boolean
  ): Promise<void> {
    if (useExisting) {
      // Skip update if using existing
      return
    }

    const model = (locationPrisma as any)[this.getModelName(tableName)]
    if (!model) {
      throw new Error(`Unknown table/model: ${tableName}`)
    }

    const uniqueField = this.getUniqueField(tableName)
    if (!uniqueField || !data[uniqueField]) {
      // Try syncId as fallback
      if (data.syncId) {
        await model.upsert({
          where: { syncId: data.syncId },
          update: data,
          create: data
        })
      } else {
        // Create new record
        await model.create({ data })
      }
      return
    }

    // Upsert by unique field
    await model.upsert({
      where: { [uniqueField]: data[uniqueField] },
      update: data,
      create: data
    })
  }

  /**
   * Get sync status for a store
   */
  async getSyncStatus(storeCode: string): Promise<{
    lastSyncAt: Date | null
    isActive: boolean
    syncEnabled: boolean
  }> {
    const location = await masterPrisma.location.findUnique({
      where: { storeCode },
      select: {
        lastSyncAt: true,
        isActive: true,
        syncEnabled: true
      }
    })

    if (!location) {
      throw new Error(`Location with storeCode ${storeCode} not found`)
    }

    return {
      lastSyncAt: location.lastSyncAt,
      isActive: location.isActive === 1,
      syncEnabled: location.syncEnabled === 1
    }
  }
}

// Export singleton instance
export const posSyncService = new POSSyncService()

// Export utility functions
export function getModelName(tableName: string): string {
  const modelMap: Record<string, string> = {
    'menu_items': 'menuItem',
    'menu_item': 'menuItem',
    'tbl_menu_item': 'menuItem',
    'modifier_groups': 'modifierGroup',
    'modifier_group': 'modifierGroup',
    'tbl_modifier_group': 'modifierGroup',
    'modifier_items': 'modifierItem',
    'modifier_item': 'modifierItem',
    'tbl_modifier_item': 'modifierItem',
    'menu_masters': 'menuMaster',
    'menu_master': 'menuMaster',
    'tbl_menu_master': 'menuMaster',
    'menu_categories': 'menuCategory',
    'menu_category': 'menuCategory',
    'tbl_menu_category': 'menuCategory',
    'prep_zones': 'prepZone',
    'prep_zone': 'prepZone',
    'tbl_prep_zone': 'prepZone',
    'time_events': 'timeEvent',
    'time_event': 'timeEvent',
    'tbl_time_events': 'timeEvent',
    'tax': 'tax',
    'tbl_tax': 'tax',
    'stations': 'station',
    'station': 'station',
    'tbl_station': 'station',
    'printers': 'printer',
    'printer': 'printer',
    'tbl_printer': 'printer',
    'orders': 'order',
    'order': 'order',
    'tbl_order': 'order',
    'order_items': 'orderItem',
    'order_item': 'orderItem',
    'tbl_order_item': 'orderItem',
    'tables': 'table',
    'table': 'table',
    'tbl_table': 'table'
  }

  return modelMap[tableName.toLowerCase()] || tableName
}

export async function getDataSinceLastSync(
  storeCode: string,
  tableName: string,
  lastSyncAt?: Date
): Promise<any[]> {
  const modelName = getModelName(tableName)
  const model = (locationPrisma as any)[modelName]
  if (!model) {
    throw new Error(`Unknown table: ${tableName}`)
  }

  const where: any = { storeCode }
  if (lastSyncAt) {
    where.updatedOn = { gte: lastSyncAt }
  }

  return model.findMany({
    where,
    orderBy: { updatedOn: 'desc' }
  })
}

