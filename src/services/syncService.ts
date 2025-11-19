// Sync Service for Master Data to Location Database
// Synchronizes master data templates to location databases with progress tracking

import { masterPrisma, locationPrisma } from '@/lib/databaseManager'

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
      error: errorMessage,
      progress
    }
  }
}

/**
 * Sync Menu Masters from master database
 */
async function syncMenuMasters(storeCode: string): Promise<{ recordsSynced: number }> {
  const masters = await masterPrisma.masterMenuMaster.findMany({
    where: { isActive: 1 },
    include: {
      menuMasterEvents: {
        include: {
          timeEvent: true
        }
      }
    }
  })

  let synced = 0
  for (const master of masters) {
    const { menuMasterEvents, ...masterData } = master
    
    await (locationPrisma as any).menuMaster.upsert({
      where: {
        menuMasterCode: master.menuMasterCode
      },
      update: {
        ...masterData,
        storeCode: storeCode,
        isSyncToWeb: 0,
        isSyncToLocal: 0
      },
      create: {
        ...masterData,
        storeCode: storeCode,
        isSyncToWeb: 0,
        isSyncToLocal: 0
      }
    })

    // Sync menu master events
    for (const event of menuMasterEvents) {
      await (locationPrisma as any).menuMasterEvent.upsert({
        where: {
          menuMasterCode_eventCode: {
            menuMasterCode: event.menuMasterCode,
            eventCode: event.eventCode
          }
        },
        update: {
          ...event,
          storeCode: storeCode
        },
        create: {
          ...event,
          storeCode: storeCode
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
    where: { isActive: 1 },
    include: {
      menuCategoryModifiers: true
    }
  })

  let synced = 0
  for (const category of categories) {
    const { menuCategoryModifiers, ...categoryData } = category
    
    await (locationPrisma as any).menuCategory.upsert({
      where: {
        menuCategoryCode: category.menuCategoryCode
      },
      update: {
        ...categoryData,
        storeCode: storeCode
      },
      create: {
        ...categoryData,
        storeCode: storeCode
      }
    })

    // Sync category modifiers
    for (const modifier of menuCategoryModifiers) {
      await (locationPrisma as any).menuCategoryModifier.upsert({
        where: {
          menuCategoryCode_modifierGroupCode: {
            menuCategoryCode: modifier.menuCategoryCode,
            modifierGroupCode: modifier.modifierGroupCode
          }
        },
        update: {
          ...modifier,
          storeCode: storeCode
        },
        create: {
          ...modifier,
          storeCode: storeCode
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
    where: { isActive: 1 },
    include: {
      menuItemModifierGroups: true
    }
  })

  let synced = 0
  for (const item of items) {
    const { menuItemModifierGroups, ...itemData } = item
    
    await (locationPrisma as any).menuItem.upsert({
      where: {
        menuItemCode: item.menuItemCode
      },
      update: {
        ...itemData,
        storeCode: storeCode
      },
      create: {
        ...itemData,
        storeCode: storeCode
      }
    })

    // Sync item modifier groups
    for (const modifierGroup of menuItemModifierGroups) {
      await (locationPrisma as any).menuItemModifierGroup.upsert({
        where: {
          menuItemCode_modifierGroupCode: {
            menuItemCode: modifierGroup.menuItemCode || '',
            modifierGroupCode: modifierGroup.modifierGroupCode || ''
          }
        },
        update: {
          ...modifierGroup,
          storeCode: storeCode
        },
        create: {
          ...modifierGroup,
          storeCode: storeCode
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
    await (locationPrisma as any).modifierGroup.upsert({
      where: {
        modifierGroupCode: group.modifierGroupCode
      },
      update: {
        ...group,
        storeCode: storeCode
      },
      create: {
        ...group,
        storeCode: storeCode
      }
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
    await (locationPrisma as any).prepZone.upsert({
      where: {
        prepZoneCode: zone.prepZoneCode
      },
      update: {
        ...zone,
        storeCode: storeCode
      },
      create: {
        ...zone,
        storeCode: storeCode
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
    await (locationPrisma as any).timeEvent.upsert({
      where: {
        eventCode: event.eventCode
      },
      update: {
        ...event,
        storeCode: storeCode
      },
      create: {
        ...event,
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
