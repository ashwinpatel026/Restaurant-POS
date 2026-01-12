// Sync Service for Master Data to Location Database
// Synchronizes master data templates to location databases with progress tracking

import { masterPrisma, locationPrisma } from '@/lib/databaseManager'
import { Prisma } from '@prisma/client'
import { normalizeDeptCode } from '@/lib/deptCodeHelper'

export type SyncType = 'FULL' | 'INCREMENTAL'
export type SyncStatus = 'SUCCESS' | 'FAILED' | 'IN_PROGRESS'

export interface SyncProgress {
  step: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  recordsSynced: number
  totalRecords?: number
  error?: string
}

export interface SyncResult {
  success: boolean
  recordsSynced: number
  error?: string
  progress?: SyncProgress[]
}

/**
 * Sync master data to a specific location/store with progress tracking
 */
export async function syncMasterDataToLocation(
  storeCode: string,
  syncType: SyncType = 'FULL',
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResult> {
  const location = await masterPrisma.location.findUnique({
    where: { storeCode }
  })

  if (!location) {
    throw new Error(`Location with storeCode ${storeCode} not found`)
  }

  if (location.syncEnabled === 0) {
    return {
      success: false,
      recordsSynced: 0,
      error: 'Sync is disabled for this location'
    }
  }

  // Create sync log entry
  const syncLog = await masterPrisma.syncLog.create({
    data: {
      locationId: location.locationId,
      storeCode: storeCode,
      syncType: syncType,
      status: 'IN_PROGRESS'
    }
  })

  const progress: SyncProgress[] = []
  let totalRecordsSynced = 0
  let errorMessage: string | null = null

  // Define sync steps in sequence
  const syncSteps = [
    { name: 'Menu Masters', fn: syncMenuMasters },
    { name: 'Menu Categories', fn: syncMenuCategories },
    { name: 'Menu Items', fn: syncMenuItems },
    { name: 'Modifier Groups', fn: syncModifierGroups },
    { name: 'Modifier Items', fn: syncModifierItems },
    { name: 'Prep Zones', fn: syncPrepZones },
    { name: 'Departments', fn: syncDepartments },
    { name: 'Time Events', fn: syncTimeEvents },
    { name: 'Tax', fn: syncTax },
    { name: 'Stations', fn: syncStations },
  ]

  try {
    // Execute sync steps sequentially
    for (const step of syncSteps) {
      const stepProgress: SyncProgress = {
        step: step.name,
        status: 'in_progress',
        recordsSynced: 0
      }
      progress.push(stepProgress)
      
      if (onProgress) {
        onProgress(stepProgress)
      }

      try {
        const result = await step.fn(storeCode)
        stepProgress.status = 'completed'
        stepProgress.recordsSynced = result.recordsSynced
        totalRecordsSynced += result.recordsSynced
        
        if (onProgress) {
          onProgress(stepProgress)
        }
      } catch (error: any) {
        stepProgress.status = 'failed'
        stepProgress.error = error.message || 'Unknown error'
        errorMessage = `Failed at ${step.name}: ${error.message}`
        
        if (onProgress) {
          onProgress(stepProgress)
        }
        
        // Stop sync on error
        throw error
      }
    }

    // Update location sync timestamp
    await masterPrisma.location.update({
      where: { storeCode },
      data: { lastSyncAt: new Date() }
    })

    // Update sync log as success
    await masterPrisma.syncLog.update({
      where: { syncLogId: syncLog.syncLogId },
      data: {
        status: 'SUCCESS',
        recordsSynced: totalRecordsSynced,
        completedAt: new Date()
      }
    })

    return {
      success: true,
      recordsSynced: totalRecordsSynced,
      progress
    }
  } catch (error: any) {
    errorMessage = error.message || 'Unknown error'

    // Update sync log as failed
    await masterPrisma.syncLog.update({
      where: { syncLogId: syncLog.syncLogId },
      data: {
        status: 'FAILED',
        errorMessage: errorMessage,
        recordsSynced: totalRecordsSynced,
        completedAt: new Date()
      }
    })

    return {
      success: false,
      recordsSynced: totalRecordsSynced,
      error: errorMessage || 'Unknown error',
      progress
    }
  }
}

/**
 * Sync Menu Masters from master database
 */
async function syncMenuMasters(storeCode: string): Promise<{ recordsSynced: number }> {
  const masters = await masterPrisma.masterMenuMaster.findMany({
    where: { isActive: 1 }
  })

  let synced = 0
  for (const master of masters) {
    // Sync menu master first
    await (locationPrisma as any).menuMaster.upsert({
      where: {
        menuMasterCode: master.menuMasterCode
      },
      update: {
        name: master.name,
        labelName: master.labelName,
        colorCode: master.colorCode,
        forColorCode: master.forColorCode,
        deptCode: master.deptCode,
        prepZoneCode: master.prepZoneCode,
        stationCode: master.stationCode,
        isEventMenu: master.isEventMenu,
        isActive: master.isActive,
        createdBy: master.createdBy,
        createdOn: master.createdOn,
        updatedBy: master.updatedBy,
        updatedOn: master.updatedOn,
        storeCode: storeCode,
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncId: master.syncId,
        syncSource: master.syncSource || 'server'
      },
      create: {
        menuMasterCode: master.menuMasterCode,
        name: master.name,
        labelName: master.labelName,
        colorCode: master.colorCode,
        forColorCode: master.forColorCode,
        deptCode: master.deptCode,
        prepZoneCode: master.prepZoneCode,
        stationCode: master.stationCode,
        isEventMenu: master.isEventMenu,
        isActive: master.isActive,
        createdBy: master.createdBy,
        createdOn: master.createdOn,
        updatedBy: master.updatedBy,
        updatedOn: master.updatedOn,
        storeCode: storeCode,
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncId: master.syncId,
        syncSource: master.syncSource || 'server'
      }
    })

    // Fetch and sync menu master events separately (no relation defined in master schema)
    const menuMasterEvents = await masterPrisma.masterMenuMasterEvent.findMany({
      where: {
        menuMasterCode: master.menuMasterCode
      }
    })

    for (const event of menuMasterEvents) {
      await (locationPrisma as any).menuMasterEvent.upsert({
        where: {
          menuMasterCode_eventCode: {
            menuMasterCode: event.menuMasterCode,
            eventCode: event.eventCode
          }
        },
        update: {
          menuMasterCode: event.menuMasterCode,
          eventCode: event.eventCode,
          createdBy: event.createdBy,
          createdOn: event.createdOn,
          storeCode: storeCode,
          syncId: event.syncId,
          syncSource: event.syncSource || 'server',
          isSyncToWeb: 0,
          isSyncToLocal: 0
        },
        create: {
          menuMasterCode: event.menuMasterCode,
          eventCode: event.eventCode,
          createdBy: event.createdBy,
          createdOn: event.createdOn,
          storeCode: storeCode,
          syncId: event.syncId,
          syncSource: event.syncSource || 'server',
          isSyncToWeb: 0,
          isSyncToLocal: 0
        }
      })
    }

    synced++
  }

  return { recordsSynced: synced }
}

/**
 * Sync Menu Categories
 */
async function syncMenuCategories(storeCode: string): Promise<{ recordsSynced: number }> {
  const categories = await masterPrisma.masterMenuCategory.findMany({
    where: { isActive: 1 }
  })

  let synced = 0
  for (const category of categories) {
    await (locationPrisma as any).menuCategory.upsert({
      where: {
        menuCategoryCode: category.menuCategoryCode
      },
      update: {
        menuMasterCode: category.menuMasterCode,
        name: category.name,
        colorCode: category.colorCode,
        forColorCode: category.forColorCode,
        deptCode: category.deptCode,
        isActive: category.isActive,
        createdBy: category.createdBy,
        createdOn: category.createdOn,
        updatedBy: category.updatedBy,
        updatedOn: category.updatedOn,
        storeCode: storeCode,
        syncId: category.syncId,
        syncSource: category.syncSource || 'server',
        isSyncToWeb: 0,
        isSyncToLocal: 0
      },
      create: {
        menuCategoryCode: category.menuCategoryCode,
        menuMasterCode: category.menuMasterCode,
        name: category.name,
        colorCode: category.colorCode,
        forColorCode: category.forColorCode,
        deptCode: category.deptCode,
        isActive: category.isActive,
        createdBy: category.createdBy,
        createdOn: category.createdOn,
        updatedBy: category.updatedBy,
        updatedOn: category.updatedOn,
        storeCode: storeCode,
        syncId: category.syncId,
        syncSource: category.syncSource || 'server',
        isSyncToWeb: 0,
        isSyncToLocal: 0
      }
    })

    // Fetch and sync category modifiers separately (no relation defined in master schema)
    const menuCategoryModifiers = await masterPrisma.masterMenuCategoryModifier.findMany({
      where: {
        menuCategoryCode: category.menuCategoryCode
      }
    })

    for (const modifier of menuCategoryModifiers) {
      await (locationPrisma as any).menuCategoryModifier.upsert({
        where: {
          menuCategoryCode_modifierGroupCode: {
            menuCategoryCode: modifier.menuCategoryCode,
            modifierGroupCode: modifier.modifierGroupCode
          }
        },
        update: {
          menuCategoryCode: modifier.menuCategoryCode,
          modifierGroupCode: modifier.modifierGroupCode,
          createdBy: modifier.createdBy,
          createdOn: modifier.createdOn,
          storeCode: storeCode,
          syncId: modifier.syncId,
          syncSource: modifier.syncSource || 'server',
          isSyncToWeb: 0,
          isSyncToLocal: 0
        },
        create: {
          menuCategoryCode: modifier.menuCategoryCode,
          modifierGroupCode: modifier.modifierGroupCode,
          createdBy: modifier.createdBy,
          createdOn: modifier.createdOn,
          storeCode: storeCode,
          syncId: modifier.syncId,
          syncSource: modifier.syncSource || 'server',
          isSyncToWeb: 0,
          isSyncToLocal: 0
        }
      })
    }

    synced++
  }

  return { recordsSynced: synced }
}

/**
 * Sync Menu Items
 */
async function syncMenuItems(storeCode: string): Promise<{ recordsSynced: number }> {
  const items = await masterPrisma.masterMenuItem.findMany({
    where: { isActive: 1 }
  })

  let synced = 0
  for (const item of items) {
    // Sync menu item (exclude nested relations that need separate sync)
    await (locationPrisma as any).menuItem.upsert({
      where: {
        menuItemCode: item.menuItemCode
      },
      update: {
        menuMasterCode: item.menuMasterCode,
        menuCategoryCode: item.menuCategoryCode,
        name: item.name,
        kitchenName: item.kitchenName,
        labelName: item.labelName,
        colorCode: item.colorCode,
        forColorCode: item.forColorCode,
        deptCode: item.deptCode,
        calories: item.calories,
        description: item.description,
        itemSize: item.itemSize,
        skuPlu: item.skuPlu,
        barcode: item.barcode,
        isAlcohol: item.isAlcohol,
        menuImg: item.menuImg,
        priceStrategy: item.priceStrategy,
        basePrice: item.basePrice,
        cardPrice: item.cardPrice,
        cashPrice: item.cashPrice,
        isPrice: item.isPrice,
        isActive: item.isActive,
        stockinhand: item.stockinhand,
        storeCode: storeCode,
        syncId: item.syncId,
        syncSource: item.syncSource || 'server',
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        createdBy: item.createdBy,
        createdOn: item.createdOn,
        updatedBy: item.updatedBy,
        updatedOn: item.updatedOn || new Date()
      },
      create: {
        menuItemCode: item.menuItemCode,
        menuMasterCode: item.menuMasterCode,
        menuCategoryCode: item.menuCategoryCode,
        name: item.name,
        kitchenName: item.kitchenName,
        labelName: item.labelName,
        colorCode: item.colorCode,
        forColorCode: item.forColorCode,
        deptCode: item.deptCode,
        calories: item.calories,
        description: item.description,
        itemSize: item.itemSize,
        skuPlu: item.skuPlu,
        barcode: item.barcode,
        isAlcohol: item.isAlcohol,
        menuImg: item.menuImg,
        priceStrategy: item.priceStrategy,
        basePrice: item.basePrice,
        cardPrice: item.cardPrice,
        cashPrice: item.cashPrice,
        isPrice: item.isPrice,
        isActive: item.isActive,
        stockinhand: item.stockinhand,
        storeCode: storeCode,
        syncId: item.syncId,
        syncSource: item.syncSource || 'server',
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        createdBy: item.createdBy,
        createdOn: item.createdOn
      }
    })

    // Fetch and sync item modifier groups separately (no relation defined in master schema)
    const menuItemModifierGroups = await masterPrisma.masterMenuItemModifierGroup.findMany({
      where: {
        menuItemCode: item.menuItemCode
      }
    })

    for (const modifierGroup of menuItemModifierGroups) {
      await (locationPrisma as any).menuItemModifierGroup.upsert({
        where: {
          menuItemCode_modifierGroupCode: {
            menuItemCode: modifierGroup.menuItemCode || '',
            modifierGroupCode: modifierGroup.modifierGroupCode || ''
          }
        },
        update: {
          menuItemCode: modifierGroup.menuItemCode,
          modifierGroupCode: modifierGroup.modifierGroupCode,
          inheritFromMenuGroup: modifierGroup.inheritFromMenuGroup,
          isInheritFromMenuCategory: modifierGroup.isInheritFromMenuCategory,
          isRequired: modifierGroup.isRequired,
          isMultiselect: modifierGroup.isMultiselect,
          minSelection: modifierGroup.minSelection,
          maxSelection: modifierGroup.maxSelection,
          createdBy: modifierGroup.createdBy,
          createdOn: modifierGroup.createdOn,
          storeCode: storeCode,
          syncId: modifierGroup.syncId,
          syncSource: modifierGroup.syncSource || 'server',
          isSyncToWeb: 0,
          isSyncToLocal: 0
        },
        create: {
          menuItemCode: modifierGroup.menuItemCode,
          modifierGroupCode: modifierGroup.modifierGroupCode,
          inheritFromMenuGroup: modifierGroup.inheritFromMenuGroup,
          isInheritFromMenuCategory: modifierGroup.isInheritFromMenuCategory,
          isRequired: modifierGroup.isRequired,
          isMultiselect: modifierGroup.isMultiselect,
          minSelection: modifierGroup.minSelection,
          maxSelection: modifierGroup.maxSelection,
          createdBy: modifierGroup.createdBy,
          createdOn: modifierGroup.createdOn,
          storeCode: storeCode,
          syncId: modifierGroup.syncId,
          syncSource: modifierGroup.syncSource || 'server',
          isSyncToWeb: 0,
          isSyncToLocal: 0
        }
      })
    }

    synced++
  }

  return { recordsSynced: synced }
}

/**
 * Sync Modifier Groups
 */
async function syncModifierGroups(storeCode: string): Promise<{ recordsSynced: number }> {
  const groups = await masterPrisma.masterModifierGroup.findMany({
    where: { isActive: 1 }
  })

  let synced = 0
  for (const group of groups) {
    // Get prefix value from master group
    const prefixValue = (group as any).prefix
    
    // Build update/create data - always include prefix field
    const baseData: Record<string, any> = {
      modifierGroupCode: group.modifierGroupCode,
      groupName: group.groupName,
      labelName: group.labelName,
      isRequired: group.isRequired,
      isMultiselect: group.isMultiselect,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      showDefaultTop: group.showDefaultTop,
      inheritFromMenuGroup: group.inheritFromMenuGroup,
      priceStrategy: group.priceStrategy,
      price: group.price,
      isActive: group.isActive,
      createdBy: group.createdBy,
      createdOn: group.createdOn,
      updatedBy: group.updatedBy,
      updatedOn: group.updatedOn,
      syncId: group.syncId,
      syncSource: group.syncSource || 'server',
      storeCode: storeCode
    }
    
    // Always include prefix field - handle null/empty/undefined properly
    // This ensures the prefix field is always synced, even if it's null
    if (prefixValue !== null && prefixValue !== undefined) {
      baseData.prefix = prefixValue
    } else {
      // Set to null using Prisma.JsonNull for proper JSON null handling
      baseData.prefix = Prisma.JsonNull
    }

    await (locationPrisma as any).modifierGroup.upsert({
      where: {
        modifierGroupCode: group.modifierGroupCode
      },
      update: baseData,
      create: baseData
    })
    synced++
  }

  return { recordsSynced: synced }
}

/**
 * Sync Modifier Items
 */
async function syncModifierItems(storeCode: string): Promise<{ recordsSynced: number }> {
  const items = await masterPrisma.masterModifierItem.findMany({
    where: { isActive: 1 }
  })

  let synced = 0
  for (const item of items) {
    await (locationPrisma as any).modifierItem.upsert({
      where: {
        modifierItemCode: item.modifierItemCode
      },
      update: {
        ...item,
        storeCode: storeCode
      },
      create: {
        ...item,
        storeCode: storeCode
      }
    })
    synced++
  }

  return { recordsSynced: synced }
}

/**
 * Sync Prep Zones
 */
async function syncPrepZones(storeCode: string): Promise<{ recordsSynced: number }> {
  const zones = await masterPrisma.masterPrepZone.findMany({
    where: { isActive: 1 }
  })

  let synced = 0
  for (const zone of zones) {
    const { stationCode, ...zoneData } = zone
    await (locationPrisma as any).prepZone.upsert({
      where: {
        prepZoneCode: zone.prepZoneCode
      },
      update: {
        ...zoneData,
        storeCode: storeCode
      },
      create: {
        ...zoneData,
        storeCode: storeCode
      }
    })
    synced++
  }

  return { recordsSynced: synced }
}

/**
 * Sync Departments
 */
async function syncDepartments(storeCode: string): Promise<{ recordsSynced: number }> {
  const departments = await masterPrisma.masterDepartment.findMany({
    where: { isActive: 1 }
  })

  let synced = 0
  for (const dept of departments) {
    await (locationPrisma as any).department.upsert({
      where: {
        deptCode: dept.deptCode
      },
      update: {
        deptCode: dept.deptCode,
        deptName: dept.deptName,
        deptTaxCode: dept.deptTaxCode,
        deptTypeCode: dept.deptTypeCode,
        isActive: dept.isActive,
        createdBy: dept.createdBy,
        createdOn: dept.createdOn,
        updatedBy: dept.updatedBy,
        updatedOn: dept.updatedOn,
        storeCode: storeCode,
        syncId: dept.syncId,
        syncSource: dept.syncSource || 'server'
      },
      create: {
        deptCode: dept.deptCode,
        deptName: dept.deptName,
        deptTaxCode: dept.deptTaxCode,
        deptTypeCode: dept.deptTypeCode,
        isActive: dept.isActive,
        createdBy: dept.createdBy,
        createdOn: dept.createdOn,
        updatedBy: dept.updatedBy,
        updatedOn: dept.updatedOn,
        storeCode: storeCode,
        syncId: dept.syncId,
        syncSource: dept.syncSource || 'server'
      }
    })
    synced++
  }

  return { recordsSynced: synced }
}

/**
 * Sync Time Events
 */
async function syncTimeEvents(storeCode: string): Promise<{ recordsSynced: number }> {
  const events = await masterPrisma.masterTimeEvent.findMany({
    where: { isActive: 1 }
  })

  let synced = 0
  for (const event of events) {
    // Normalize deptCode from string to JSON array format
    const normalizedDeptCode = normalizeDeptCode(event.deptCode)
    
    await (locationPrisma as any).timeEvent.upsert({
      where: {
        eventCode: event.eventCode
      },
      update: {
        ...event,
        deptCode: normalizedDeptCode,
        storeCode: storeCode
      },
      create: {
        ...event,
        deptCode: normalizedDeptCode,
        storeCode: storeCode
      }
    })
    synced++
  }

  return { recordsSynced: synced }
}

/**
 * Sync Tax
 */
async function syncTax(storeCode: string): Promise<{ recordsSynced: number }> {
  const taxes = await masterPrisma.masterTax.findMany()

  let synced = 0
  for (const tax of taxes) {
    await (locationPrisma as any).tax.upsert({
      where: {
        taxCode: tax.taxCode
      },
      update: {
        ...tax,
        storeCode: storeCode
      },
      create: {
        ...tax,
        storeCode: storeCode
      }
    })
    synced++
  }

  return { recordsSynced: synced }
}

/**
 * Sync Stations
 */
async function syncStations(storeCode: string): Promise<{ recordsSynced: number }> {
  const stations = await masterPrisma.masterStation.findMany({
    where: { isActive: 1 }
  })

  let synced = 0
  for (const station of stations) {
    await (locationPrisma as any).station.upsert({
      where: {
        stationCode: station.stationCode
      },
      update: {
        ...station,
        storeCode: storeCode
      },
      create: {
        ...station,
        storeCode: storeCode
      }
    })
    synced++
  }

  return { recordsSynced: synced }
}
