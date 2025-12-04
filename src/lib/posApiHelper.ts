// Helper functions for POS API routes
import { NextRequest } from 'next/server'
import { verifyPOSClient, verifyStoreCode } from './posAuthHelper'
import { locationPrisma } from './databaseManager'

export interface POSApiContext {
  storeCode: string
  locationId?: bigint
  isAuthenticated: boolean
}

/**
 * Authenticate and validate POS request
 */
export async function authenticatePOSRequest(
  request: NextRequest,
  storeCode: string
): Promise<{ success: boolean; context?: POSApiContext; error?: string; status?: number }> {
  // Verify POS authentication
  const authResult = await verifyPOSClient(request, storeCode)
  if (!authResult.isValid) {
    return {
      success: false,
      error: authResult.error || 'Unauthorized',
      status: 401
    }
  }

  // Verify store code
  const storeVerification = await verifyStoreCode(storeCode)
  if (!storeVerification.isValid) {
    return {
      success: false,
      error: storeVerification.error || 'Invalid store code',
      status: 404
    }
  }

  return {
    success: true,
    context: {
      storeCode,
      locationId: storeVerification.locationId,
      isAuthenticated: true
    }
  }
}

/**
 * Get Prisma model by entity name
 */
export function getModelByEntity(entityName: string): any {
  const modelMap: Record<string, string> = {
    'tax': 'tax',
    'menu-items': 'menuItem',
    'menu_items': 'menuItem',
    'menu-masters': 'menuMaster',
    'menu_masters': 'menuMaster',
    'menu-categories': 'menuCategory',
    'menu_categories': 'menuCategory',
    'modifier-groups': 'modifierGroup',
    'modifier_groups': 'modifierGroup',
    'modifier-items': 'modifierItem',
    'modifier_items': 'modifierItem',
    'prep-zones': 'prepZone',
    'prep_zones': 'prepZone',
    'time-events': 'timeEvent',
    'time_events': 'timeEvent',
    'stations': 'station',
    'printers': 'printer',
    'orders': 'order',
    'order-items': 'orderItem',
    'order_items': 'orderItem',
    'tables': 'table'
  }

  const modelName = modelMap[entityName.toLowerCase()]
  if (!modelName) {
    return null
  }

  return (locationPrisma as any)[modelName]
}

/**
 * Get unique identifier field for entity
 */
export function getUniqueField(entityName: string): string | null {
  const uniqueFieldMap: Record<string, string> = {
    'tax': 'taxCode',
    'menu-items': 'menuItemCode',
    'menu_items': 'menuItemCode',
    'menu-masters': 'menuMasterCode',
    'menu_masters': 'menuMasterCode',
    'menu-categories': 'menuCategoryCode',
    'menu_categories': 'menuCategoryCode',
    'modifier-groups': 'modifierGroupCode',
    'modifier_groups': 'modifierGroupCode',
    'modifier-items': 'modifierItemCode',
    'modifier_items': 'modifierItemCode',
    'prep-zones': 'prepZoneCode',
    'prep_zones': 'prepZoneCode',
    'time-events': 'eventCode',
    'time_events': 'eventCode',
    'stations': 'stationCode',
    'printers': 'printerCode',
    'orders': 'orderNumber',
    'tables': 'tableNumber'
  }

  return uniqueFieldMap[entityName.toLowerCase()] || null
}

/**
 * Get primary key field for entity
 */
export function getPrimaryKeyField(entityName: string): string {
  const primaryKeyMap: Record<string, string> = {
    'tax': 'tblTaxId',
    'menu-items': 'menuItemId',
    'menu_items': 'menuItemId',
    'menu-masters': 'menuMasterId',
    'menu_masters': 'menuMasterId',
    'menu-categories': 'menuCategoryId',
    'menu_categories': 'menuCategoryId',
    'modifier-groups': 'id',
    'modifier_groups': 'id',
    'modifier-items': 'id',
    'modifier_items': 'id',
    'prep-zones': 'prepZoneId',
    'prep_zones': 'prepZoneId',
    'time-events': 'id',
    'time_events': 'id',
    'stations': 'tblStationId',
    'printers': 'printerId',
    'orders': 'orderId',
    'order-items': 'orderItemId',
    'order_items': 'orderItemId',
    'tables': 'tableId'
  }

  return primaryKeyMap[entityName.toLowerCase()] || 'id'
}

/**
 * Add POS sync metadata to data
 * Note: syncId is only set if explicitly provided in data.
 * Otherwise, PostgreSQL will automatically generate it via @default(uuid()) in the schema.
 */
export function addPOSSyncMetadata(data: any, storeCode: string): any {
  const result: any = {
    ...data,
    storeCode,
    syncSource: 'POS',
    isSyncToWeb: 1,
    isSyncToLocal: 0,
    updatedOn: new Date()
  }

  // Only set syncId if explicitly provided in data
  // Otherwise, let PostgreSQL generate it via @default(uuid())
  if (data.syncId !== undefined && data.syncId !== null) {
    result.syncId = data.syncId
  }

  return result
}

