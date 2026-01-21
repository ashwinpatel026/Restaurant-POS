// Sync Service for Master Data to Location Database
// Synchronizes master data templates to location databases with progress tracking

import { masterPrisma, locationPrisma } from '@/lib/databaseManager'
import { Prisma } from '@prisma/client'
import { normalizeDeptCode } from '@/lib/deptCodeHelper'

/**
 * Generate menu item time event code with WM prefix for master sync
 * Format: WM{storeCode}MT{sequence}
 */
async function generateSyncMenuItemTimeEventCode(
  locationPrisma: any,
  storeCode: string
): Promise<string> {
  const prefix = `WM${storeCode}MT`

  try {
    // Get all menu item time event codes that match the WM pattern for this store using raw SQL
    const menuItemTimeEvents = await locationPrisma.$queryRawUnsafe(`
      SELECT menuitem_timeevent_code
      FROM tbl_menuitem_timeevent
      WHERE menuitem_timeevent_code LIKE $1
        AND store_code = $2
      ORDER BY menuitem_timeevent_id DESC
    `, `${prefix}%`, storeCode) as Array<{
      menuitem_timeevent_code: string | null
    }>

    let nextNumber = 1

    if (menuItemTimeEvents.length > 0) {
      // Extract number from codes like "WMSTORE01MT1", "WMSTORE01MT2", etc.
      const numbers = menuItemTimeEvents
        .map((item: any) => {
          const code = item.menuitem_timeevent_code
          if (!code) return 0
          const match = code.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`))
          return match ? parseInt(match[1]) : 0
        })
        .filter((num: number) => num > 0)

      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1
      }
    }

    // Format as WM{storeCode}MT + number starting from 1
    const generatedCode = `${prefix}${nextNumber}`
    console.log(`[SYNC] Generated code: ${generatedCode} for storeCode: ${storeCode}`)
    return generatedCode
  } catch (error: any) {
    console.error(`[SYNC] Error generating code, using fallback:`, error)
    // Fallback: return a code with timestamp-based number if query fails
    return `${prefix}${Date.now()}`
  }
}

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
  // IMPORTANT: Maintain dependency order - parent tables must sync before child tables
  const syncSteps = [
    { name: 'Menu Masters', fn: syncMenuMasters },
    { name: 'Menu Categories', fn: syncMenuCategories },
    { name: 'Menu Items', fn: syncMenuItems },
    { name: 'Time Events', fn: syncTimeEvents }, // Must sync before Menu Item Time Events
    { name: 'Menu Item Time Events', fn: syncMenuItemTimeEvents }, // Depends on Menu Items AND Time Events
    { name: 'Modifier Groups', fn: syncModifierGroups },
    { name: 'Modifier Items', fn: syncModifierItems },
    { name: 'Prep Zones', fn: syncPrepZones },
    { name: 'Departments', fn: syncDepartments },
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

    // Fetch and sync menu item time events separately using raw SQL for reliability
    let timeEventsSynced = 0
    try {
      const menuItemTimeEvents = await masterPrisma.masterMenuItemTimeEvent.findMany({
        where: {
          menuItemCode: item.menuItemCode,
          isDelete: false, // Only sync non-deleted records
          isActive: true // Only sync active records
        }
      })

      console.log(`[SYNC] Found ${menuItemTimeEvents.length} menu item time events for menuItemCode: ${item.menuItemCode}`)

      if (menuItemTimeEvents.length === 0) {
        console.log(`[SYNC] No menu item time events to sync for menuItemCode: ${item.menuItemCode}`)
      }

      for (const menuItemTimeEvent of menuItemTimeEvents) {
        try {
          // Validate required fields
          if (!menuItemTimeEvent.menuItemCode || !menuItemTimeEvent.timeEventCode) {
            console.warn(`[SYNC] Skipping menu item time event - missing required fields: menuItemCode=${menuItemTimeEvent.menuItemCode}, timeEventCode=${menuItemTimeEvent.timeEventCode}`)
            continue
          }

          console.log(`[SYNC] Processing menu item time event: menuItemCode=${menuItemTimeEvent.menuItemCode}, timeEventCode=${menuItemTimeEvent.timeEventCode}, syncId=${menuItemTimeEvent.syncId}`)

          // Check if record already exists by syncId using raw SQL
          const existingBySyncId = await locationPrisma.$queryRawUnsafe<Array<{
            menuitem_timeevent_id: bigint
            menuitem_timeevent_code: string | null
          }>>(`
            SELECT menuitem_timeevent_id, menuitem_timeevent_code
            FROM tbl_menuitem_timeevent
            WHERE sync_id = $1
            LIMIT 1
          `, menuItemTimeEvent.syncId)

          let existing = existingBySyncId.length > 0 ? existingBySyncId[0] : null

          // If not found by syncId, check by menuItemCode + timeEventCode + storeCode
          if (!existing) {
            const existingByCode = await locationPrisma.$queryRawUnsafe<Array<{
              menuitem_timeevent_id: bigint
              menuitem_timeevent_code: string | null
            }>>(`
              SELECT menuitem_timeevent_id, menuitem_timeevent_code
              FROM tbl_menuitem_timeevent
              WHERE menu_item_code = $1
                AND time_event_code = $2
                AND store_code = $3
              LIMIT 1
            `, menuItemTimeEvent.menuItemCode || '', menuItemTimeEvent.timeEventCode || '', storeCode)

            existing = existingByCode.length > 0 ? existingByCode[0] : null
          }

          console.log(`[SYNC] Existing record check: ${existing ? 'FOUND (ID: ' + existing.menuitem_timeevent_id + ')' : 'NOT FOUND'}`)

          // Generate code with WM prefix for master sync
          let menuItemTimeEventCode = existing?.menuitem_timeevent_code || null

          // Generate new code if:
          // 1. Record doesn't exist (new sync)
          // 2. Existing record doesn't have a code
          // 3. Existing record has a code but it doesn't start with WM (needs regeneration)
          if (!existing || !menuItemTimeEventCode || !menuItemTimeEventCode.startsWith(`WM${storeCode}MT`)) {
            menuItemTimeEventCode = await generateSyncMenuItemTimeEventCode(locationPrisma, storeCode)
            console.log(`[SYNC] Generated new code: ${menuItemTimeEventCode}`)
          } else {
            console.log(`[SYNC] Using existing code: ${menuItemTimeEventCode}`)
          }

          // Prepare values for SQL
          const formulaValue = menuItemTimeEvent.formulaValue ? Number(menuItemTimeEvent.formulaValue) : null
          const isFixedValue = menuItemTimeEvent.isFixedValue || false
          const isDelete = menuItemTimeEvent.isDelete || false
          const isOverride = menuItemTimeEvent.isOverride || false
          const isActive = menuItemTimeEvent.isActive !== undefined ? menuItemTimeEvent.isActive : true
          const syncSource = menuItemTimeEvent.syncSource || 'server'
          const createdOn = menuItemTimeEvent.createdOn || new Date()
          const updatedOn = menuItemTimeEvent.updatedOn || new Date()

          if (existing) {
            // Update existing record using raw SQL
            console.log(`[SYNC] Updating existing record with ID: ${existing.menuitem_timeevent_id}`)
            await locationPrisma.$executeRawUnsafe(`
              UPDATE tbl_menuitem_timeevent
              SET menuitem_timeevent_code = $1,
                  menu_item_code = $2,
                  time_event_code = $3,
                  is_fixed_value = $4,
                  is_delete = $5,
                  is_override = $6,
                  formula_value = $7,
                  is_active = $8,
                  store_code = $9,
                  sync_id = $10,
                  sync_source = $11,
                  updatedby = $12,
                  updatedon = $13
              WHERE menuitem_timeevent_id = $14
            `,
              menuItemTimeEventCode,
              menuItemTimeEvent.menuItemCode,
              menuItemTimeEvent.timeEventCode,
              isFixedValue,
              isDelete,
              isOverride,
              formulaValue,
              isActive,
              storeCode,
              menuItemTimeEvent.syncId,
              syncSource,
              menuItemTimeEvent.updatedBy,
              updatedOn,
              existing.menuitem_timeevent_id
            )
            console.log(`[SYNC] ✅ Updated menu item time event: ${menuItemTimeEventCode} for menuItemCode: ${item.menuItemCode}, timeEventCode: ${menuItemTimeEvent.timeEventCode}`)
            timeEventsSynced++
          } else {
            // Create new record using raw SQL
            console.log(`[SYNC] Creating new record`)
            await locationPrisma.$executeRawUnsafe(`
              INSERT INTO tbl_menuitem_timeevent (
                menuitem_timeevent_code, menu_item_code, time_event_code,
                is_fixed_value, is_delete, is_override, formula_value,
                is_active, store_code, sync_id, sync_source,
                createdby, createdon, updatedby, updatedon
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `,
              menuItemTimeEventCode,
              menuItemTimeEvent.menuItemCode,
              menuItemTimeEvent.timeEventCode,
              isFixedValue,
              isDelete,
              isOverride,
              formulaValue,
              isActive,
              storeCode,
              menuItemTimeEvent.syncId,
              syncSource,
              menuItemTimeEvent.createdBy,
              createdOn,
              menuItemTimeEvent.updatedBy,
              updatedOn
            )
            console.log(`[SYNC] ✅ Created menu item time event: ${menuItemTimeEventCode} for menuItemCode: ${item.menuItemCode}, timeEventCode: ${menuItemTimeEvent.timeEventCode}`)
            timeEventsSynced++
          }
        } catch (timeEventError: any) {
          console.error(`[SYNC] ❌ Error syncing menu item time event for menuItemCode ${item.menuItemCode}, timeEventCode ${menuItemTimeEvent.timeEventCode}:`, timeEventError)
          console.error('[SYNC] Error details:', {
            message: timeEventError.message,
            code: timeEventError.code,
            meta: timeEventError.meta,
            stack: timeEventError.stack?.split('\n').slice(0, 5).join('\n')
          })
          // Continue with next time event instead of failing entire sync
        }
      }
      console.log(`[SYNC] ✅ Synced ${timeEventsSynced}/${menuItemTimeEvents.length} menu item time events for menuItemCode: ${item.menuItemCode}`)
    } catch (error: any) {
      console.error(`[SYNC] ❌ Error fetching menu item time events for menuItemCode ${item.menuItemCode}:`, error)
      console.error('[SYNC] Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      })
      // Continue with next menu item instead of failing entire sync
    }

    synced++
  }

  return { recordsSynced: synced }
}

/**
 * Sync Menu Item Time Events separately (as a dedicated sync step)
 */
export async function syncMenuItemTimeEvents(storeCode: string): Promise<{ recordsSynced: number }> {
  try {
    console.log(`[SYNC] ========================================`)
    console.log(`[SYNC] Starting Menu Item Time Events sync for storeCode: ${storeCode}`)
    console.log(`[SYNC] ========================================`)

    // First, verify the table exists in location database
    try {
      const tableCheck = await locationPrisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tbl_menuitem_timeevent'
        ) as exists
      `)
      const tableExists = tableCheck[0]?.exists || false
      console.log(`[SYNC] Table tbl_menuitem_timeevent exists in location DB: ${tableExists}`)

      if (!tableExists) {
        console.error(`[SYNC] ❌ Table tbl_menuitem_timeevent does not exist in location database!`)
        return { recordsSynced: 0 }
      }
    } catch (tableCheckError: any) {
      console.error('[SYNC] ❌ Error checking if tbl_menuitem_timeevent table exists:', tableCheckError)
      return { recordsSynced: 0 }
    }

    // Test query master table directly with raw SQL to verify we can read it
    try {
      const masterCount = await masterPrisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count
        FROM tbl_master_menuitem_timeevent
        WHERE is_delete = false AND is_active = true
      `)
      console.log(`[SYNC] Master table record count (raw SQL): ${masterCount[0]?.count || 0}`)
    } catch (masterCountError: any) {
      console.error('[SYNC] ❌ Error counting master records:', masterCountError)
    }

    // Get all menu item time events from master database
    const allMenuItemTimeEvents = await masterPrisma.masterMenuItemTimeEvent.findMany({
      where: {
        isDelete: false, // Only sync non-deleted records
        isActive: true // Only sync active records
      },
      select: {
        menuItemTimeEventId: true,
        menuItemTimeEventCode: true,
        menuItemCode: true,
        timeEventCode: true,
        isFixedValue: true,
        isDelete: true,
        isOverride: true,
        formulaValue: true,
        isActive: true,
        createdBy: true,
        createdOn: true,
        updatedBy: true,
        updatedOn: true,
        syncId: true,
        syncSource: true
      }
    })

    console.log(`[SYNC] Found ${allMenuItemTimeEvents.length} total menu item time events in master database (via Prisma)`)

    // Log sample of records to verify we're getting data
    if (allMenuItemTimeEvents.length > 0) {
      console.log(`[SYNC] Sample record:`, {
        menuItemCode: allMenuItemTimeEvents[0].menuItemCode,
        timeEventCode: allMenuItemTimeEvents[0].timeEventCode,
        syncId: allMenuItemTimeEvents[0].syncId,
        isActive: allMenuItemTimeEvents[0].isActive,
        isDelete: allMenuItemTimeEvents[0].isDelete,
        formulaValue: allMenuItemTimeEvents[0].formulaValue
      })

      // Check for records with missing codes
      const recordsWithMissingCodes = allMenuItemTimeEvents.filter(
        r => !r.menuItemCode || !r.timeEventCode
      )
      if (recordsWithMissingCodes.length > 0) {
        console.warn(`[SYNC] ⚠️ Found ${recordsWithMissingCodes.length} records with missing menuItemCode or timeEventCode`)
        console.warn(`[SYNC] Sample problematic records:`, recordsWithMissingCodes.slice(0, 3).map(r => ({
          id: r.menuItemTimeEventId,
          menuItemCode: r.menuItemCode,
          timeEventCode: r.timeEventCode
        })))
      }
    }

    if (allMenuItemTimeEvents.length === 0) {
      console.log(`[SYNC] No menu item time events to sync`)
      return { recordsSynced: 0 }
    }

    let timeEventsSynced = 0
    let timeEventsSkipped = 0
    let timeEventsFailed = 0

    for (let i = 0; i < allMenuItemTimeEvents.length; i++) {
      const menuItemTimeEvent = allMenuItemTimeEvents[i]
      try {
        console.log(`[SYNC] Processing record ${i + 1}/${allMenuItemTimeEvents.length}: menuItemCode=${menuItemTimeEvent.menuItemCode}, timeEventCode=${menuItemTimeEvent.timeEventCode}`)

        // Validate required fields
        if (!menuItemTimeEvent.menuItemCode || !menuItemTimeEvent.timeEventCode) {
          console.warn(`[SYNC] ⚠️ Skipping menu item time event ${i + 1} - missing required fields:`, {
            menuItemTimeEventId: menuItemTimeEvent.menuItemTimeEventId,
            menuItemCode: menuItemTimeEvent.menuItemCode,
            timeEventCode: menuItemTimeEvent.timeEventCode,
            syncId: menuItemTimeEvent.syncId
          })
          timeEventsSkipped++
          continue
        }

        // Get master menu item to find its syncId
        const masterMenuItem = await masterPrisma.masterMenuItem.findFirst({
          where: {
            menuItemCode: menuItemTimeEvent.menuItemCode
          },
          select: {
            syncId: true
          }
        })

        if (!masterMenuItem || !masterMenuItem.syncId) {
          console.warn(`[SYNC] ⚠️ Skipping record ${i + 1} - master menu item '${menuItemTimeEvent.menuItemCode}' not found or has no syncId`)
          timeEventsSkipped++
          continue
        }

        // Find location menu item by syncId to get its location-specific code
        // First try with storeCode
        let locationMenuItem = await locationPrisma.$queryRawUnsafe<Array<{
          menu_item_code: string
        }>>(`
          SELECT menu_item_code
          FROM tbl_menu_item
          WHERE sync_id::text = $1
            AND store_code = $2
            AND is_active = 1
          LIMIT 1
        `, masterMenuItem.syncId.toString(), storeCode)

        let locationMenuItemCode: string

        if (locationMenuItem && locationMenuItem.length > 0 && locationMenuItem[0]?.menu_item_code) {
          // Found existing location menu item for this store
          locationMenuItemCode = locationMenuItem[0].menu_item_code
          console.log(`[SYNC] Found existing location menu item code '${locationMenuItemCode}' for master code '${menuItemTimeEvent.menuItemCode}'`)
        } else {
          // Not found in this store - generate code using pattern WM{storeCode}{originalCode}
          locationMenuItemCode = `WM${storeCode}${menuItemTimeEvent.menuItemCode}`
          console.log(`[SYNC] Generated location menu item code '${locationMenuItemCode}' for master code '${menuItemTimeEvent.menuItemCode}' (not found in store)`)
        }

        // Get master time event to find its syncId
        const masterTimeEvent = await masterPrisma.masterTimeEvent.findFirst({
          where: {
            eventCode: menuItemTimeEvent.timeEventCode
          },
          select: {
            syncId: true
          }
        })

        if (!masterTimeEvent || !masterTimeEvent.syncId) {
          console.warn(`[SYNC] ⚠️ Skipping record ${i + 1} - master time event '${menuItemTimeEvent.timeEventCode}' not found or has no syncId`)
          timeEventsSkipped++
          continue
        }

        // Find location time event by syncId to get its location-specific code
        // First try with storeCode
        let locationTimeEvent = await locationPrisma.$queryRawUnsafe<Array<{
          Event_code: string
        }>>(`
          SELECT "Event_code"
          FROM tbl_time_events
          WHERE sync_id::text = $1
            AND store_code = $2
            AND is_active = 1
            AND is_delete = FALSE
          LIMIT 1
        `, masterTimeEvent.syncId.toString(), storeCode)

        let locationTimeEventCode: string

        if (locationTimeEvent && locationTimeEvent.length > 0 && locationTimeEvent[0]?.Event_code) {
          // Found existing location time event for this store
          locationTimeEventCode = locationTimeEvent[0].Event_code
          console.log(`[SYNC] Found existing location time event code '${locationTimeEventCode}' for master code '${menuItemTimeEvent.timeEventCode}'`)
        } else {
          // Not found in this store - generate code using pattern WM{storeCode}{originalCode}
          locationTimeEventCode = `WM${storeCode}${menuItemTimeEvent.timeEventCode}`
          console.log(`[SYNC] Generated location time event code '${locationTimeEventCode}' for master code '${menuItemTimeEvent.timeEventCode}' (not found in store)`)
        }

        // Check if record already exists by syncId + storeCode combination
        // sync_id is unique per store_code (composite unique constraint)
        // If exists, skip (don't override existing records for this store)
        let existing = null
        try {
          const existingBySyncIdAndStore = await locationPrisma.$queryRawUnsafe<Array<{
            menuitem_timeevent_id: bigint
            menuitem_timeevent_code: string | null
          }>>(`
            SELECT menuitem_timeevent_id, menuitem_timeevent_code
            FROM tbl_menuitem_timeevent
            WHERE sync_id::text = $1
              AND store_code = $2
            LIMIT 1
          `, menuItemTimeEvent.syncId.toString(), storeCode)

          existing = existingBySyncIdAndStore.length > 0 ? existingBySyncIdAndStore[0] : null
        } catch (checkError: any) {
          console.warn(`[SYNC] Error checking by syncId + storeCode:`, checkError.message)
        }

        // If record exists for this store_code + sync_id, skip it
        if (existing) {
          console.log(`[SYNC] ⏭️ Skipping record ${i + 1} - already exists for syncId '${menuItemTimeEvent.syncId}' and storeCode '${storeCode}'`)
          timeEventsSkipped++
          continue
        }

        // Generate code with WM prefix for master sync
        const menuItemTimeEventCode = await generateSyncMenuItemTimeEventCode(locationPrisma, storeCode)
        console.log(`[SYNC] Generated new code: ${menuItemTimeEventCode} for menuItemCode: ${locationMenuItemCode}, timeEventCode: ${locationTimeEventCode}`)

        // Prepare values for SQL
        const formulaValue = menuItemTimeEvent.formulaValue ? Number(menuItemTimeEvent.formulaValue) : null
        const isFixedValue = menuItemTimeEvent.isFixedValue || false
        const isDelete = menuItemTimeEvent.isDelete || false
        const isOverride = menuItemTimeEvent.isOverride || false
        const isActive = menuItemTimeEvent.isActive !== undefined ? menuItemTimeEvent.isActive : true
        const syncSource = menuItemTimeEvent.syncSource || 'server'
        const createdOn = menuItemTimeEvent.createdOn || new Date()
        const updatedOn = menuItemTimeEvent.updatedOn || new Date()

        // Create new record using raw SQL
        const insertResult = await locationPrisma.$executeRawUnsafe(`
          INSERT INTO tbl_menuitem_timeevent (
            menuitem_timeevent_code, menu_item_code, time_event_code,
            is_fixed_value, is_delete, is_override, formula_value,
            is_active, store_code, sync_id, sync_source,
            createdby, createdon, updatedby, updatedon
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::uuid, $11, $12, $13, $14, $15)
        `,
          menuItemTimeEventCode,
          locationMenuItemCode, // Use location-specific code
          locationTimeEventCode, // Use location-specific code
          isFixedValue,
          isDelete,
          isOverride,
          formulaValue,
          isActive,
          storeCode,
          menuItemTimeEvent.syncId.toString(),
          syncSource,
          menuItemTimeEvent.createdBy,
          createdOn,
          menuItemTimeEvent.updatedBy,
          updatedOn
        )
        console.log(`[SYNC] ✅ Created ${insertResult} record(s) with code: ${menuItemTimeEventCode}, menuItemCode: ${locationMenuItemCode}, timeEventCode: ${locationTimeEventCode}`)
        timeEventsSynced++
      } catch (timeEventError: any) {
        console.error(`[SYNC] ❌ Error syncing menu item time event:`, {
          menuItemCode: menuItemTimeEvent.menuItemCode,
          timeEventCode: menuItemTimeEvent.timeEventCode,
          syncId: menuItemTimeEvent.syncId,
          error: timeEventError.message,
          code: timeEventError.code
        })
        timeEventsFailed++
        // Continue with next time event instead of failing entire sync
      }
    }

    console.log(`[SYNC] ✅ Menu Item Time Events sync completed: ${timeEventsSynced} synced, ${timeEventsSkipped} skipped, ${timeEventsFailed} failed`)
    console.log(`[SYNC] ========================================`)
    return { recordsSynced: timeEventsSynced }
  } catch (outerError: any) {
    console.error(`[SYNC] ❌❌❌ CRITICAL ERROR in syncMenuItemTimeEvents:`, {
      message: outerError.message,
      code: outerError.code,
      stack: outerError.stack
    })
    // Always return a result, never throw
    return { recordsSynced: 0 }
  }
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
    const baseData: Record<string, any> = {
      modifierItemCode: item.modifierItemCode,
      modifierGroupCode: item.modifierGroupCode,
      name: item.name,
      labelName: item.labelName,
      colorCode: item.colorCode,
      forColorCode: item.forColorCode,
      price: item.price,
      isDefault: item.isDefault,
      displayOrder: item.displayOrder,
      groupCode: item.groupCode,
      isActive: item.isActive,
      createdBy: item.createdBy,
      createdOn: item.createdOn,
      updatedBy: item.updatedBy,
      updatedOn: item.updatedOn,
      syncId: item.syncId,
      syncSource: item.syncSource || 'server',
      storeCode: storeCode
    }

    await (locationPrisma as any).modifierItem.upsert({
      where: {
        modifierItemCode: item.modifierItemCode
      },
      update: baseData,
      create: baseData
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
        eventCode: event.eventCode,
        eventName: event.eventName,
        deptCode: normalizedDeptCode,
        globalPriceAmountAdd: event.globalPriceAmountAdd,
        globalPriceAmountDisc: event.globalPriceAmountDisc,
        globalPricePerAdd: event.globalPricePerAdd,
        globalPricePerDisc: event.globalPricePerDisc,
        monday: event.monday,
        monStartTime: event.monStartTime,
        monEndTime: event.monEndTime,
        tuesday: event.tuesday,
        tueStartTime: event.tueStartTime,
        tueEndTime: event.tueEndTime,
        wednesday: event.wednesday,
        wedStartTime: event.wedStartTime,
        wedEndTime: event.wedEndTime,
        thursday: event.thursday,
        thuStartTime: event.thuStartTime,
        thuEndTime: event.thuEndTime,
        friday: event.friday,
        friStartTime: event.friStartTime,
        friEndTime: event.friEndTime,
        saturday: event.saturday,
        satStartTime: event.satStartTime,
        satEndTime: event.satEndTime,
        sunday: event.sunday,
        sunStartTime: event.sunStartTime,
        sunEndTime: event.sunEndTime,
        eventStartDate: event.eventStartDate,
        eventEndDate: event.eventEndDate,
        byFixedValue: event.byFixedValue || false,
        overrideAllEvents: event.overrideAllEvents || false, // Explicitly sync overrideAllEvents
        isDelete: event.isDelete || false,
        isActive: event.isActive,
        createdBy: event.createdBy,
        createdDate: event.createdDate,
        storeCode: storeCode,
        syncId: event.syncId,
        syncSource: event.syncSource || 'server'
      },
      create: {
        eventCode: event.eventCode,
        eventName: event.eventName,
        deptCode: normalizedDeptCode,
        globalPriceAmountAdd: event.globalPriceAmountAdd,
        globalPriceAmountDisc: event.globalPriceAmountDisc,
        globalPricePerAdd: event.globalPricePerAdd,
        globalPricePerDisc: event.globalPricePerDisc,
        monday: event.monday,
        monStartTime: event.monStartTime,
        monEndTime: event.monEndTime,
        tuesday: event.tuesday,
        tueStartTime: event.tueStartTime,
        tueEndTime: event.tueEndTime,
        wednesday: event.wednesday,
        wedStartTime: event.wedStartTime,
        wedEndTime: event.wedEndTime,
        thursday: event.thursday,
        thuStartTime: event.thuStartTime,
        thuEndTime: event.thuEndTime,
        friday: event.friday,
        friStartTime: event.friStartTime,
        friEndTime: event.friEndTime,
        saturday: event.saturday,
        satStartTime: event.satStartTime,
        satEndTime: event.satEndTime,
        sunday: event.sunday,
        sunStartTime: event.sunStartTime,
        sunEndTime: event.sunEndTime,
        eventStartDate: event.eventStartDate,
        eventEndDate: event.eventEndDate,
        byFixedValue: event.byFixedValue || false,
        overrideAllEvents: event.overrideAllEvents || false, // Explicitly sync overrideAllEvents
        isDelete: event.isDelete || false,
        isActive: event.isActive,
        createdBy: event.createdBy,
        createdDate: event.createdDate,
        storeCode: storeCode,
        syncId: event.syncId,
        syncSource: event.syncSource || 'server'
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
