/**
 * Sync System Types
 * Type definitions for UUID-based sync system
 */

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncSource = 'server' | 'terminal' | 'website';
export type SyncStatus = 0 | 1 | 2; // 0=pending, 1=processed, 2=failed

export interface SyncLogEntry {
  id: bigint;
  tableName: string;
  recordId: string; // UUID
  operation: SyncOperation;
  source: SyncSource;
  data: Record<string, any>; // JSONB data
  changeTime: Date;
  syncStatus: SyncStatus;
  locationCode?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  lastRetryAt?: Date | null;
  syncedAt?: Date | null;
  syncedBy?: number | null;
}

export interface SyncStatusEntry {
  id: bigint;
  locationCode: string;
  tableName: string;
  lastSyncTime?: Date | null;
  lastSyncStatus: number; // 0=success, 1=failed
  totalRecordsSynced: bigint;
  lastErrorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncRequest {
  locationCode: string;
  tableName?: string; // Optional: sync specific table
  fullSync?: boolean; // Optional: full sync vs incremental
  forceSync?: boolean; // Optional: force sync even if already synced
}

export interface SyncResult {
  success: boolean;
  locationCode: string;
  tableName?: string;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors: SyncError[];
  duration: number; // milliseconds
  startedAt: Date;
  completedAt: Date;
}

export interface SyncError {
  recordId: string;
  operation: SyncOperation;
  error: string;
  tableName: string;
}

export interface SyncConfig {
  batchSize: number; // Number of records to process per batch
  maxRetries: number;
  retryDelay: number; // milliseconds
  maxRetryDelay: number; // milliseconds
  backoffMultiplier: number;
  enableAutoSync: boolean;
  autoSyncInterval: number; // milliseconds
  conflictResolution: 'master_wins' | 'timestamp_wins' | 'manual';
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  batchSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
  maxRetryDelay: 60000,
  backoffMultiplier: 2,
  enableAutoSync: true,
  autoSyncInterval: 5 * 60 * 1000, // 5 minutes
  conflictResolution: 'master_wins',
};

// Table mapping: Master table name -> Location table name
// Note: Master tables have "tbl_master_" prefix, location tables don't
export const SYNC_TABLE_MAP: Record<string, string> = {
  'tbl_master_printer': 'tbl_printer',
  'tbl_master_menu_master': 'tbl_menu_master',
  'tbl_master_menu_category': 'tbl_menu_category',
  'tbl_master_menu_item': 'tbl_menu_item',
  'tbl_master_modifier_group': 'tbl_modifier_group',
  'tbl_master_modifier_item': 'tbl_modifier_item',
  'tbl_master_prep_zone': 'tbl_prep_zone',
  'tbl_master_station': 'tbl_station',
  'tbl_master_tax': 'tbl_tax',
  'tbl_master_time_events': 'tbl_time_events',
};

// Field mapping: Master table column -> Location table column
// ONLY includes columns that should be synced (business data only)
// Excludes: ID fields, audit fields (created/updated), sync fields, store-specific fields
// Note: PostgreSQL returns column names in lowercase from SELECT *
export const SYNC_FIELD_MAP: Record<string, Record<string, string>> = {
  'tbl_master_tax': {
    // Only sync business columns
    'tax_code': 'tax_code',
    'taxname': 'taxname',
    'taxrate': 'taxrate',
  },
  'tbl_master_printer': {
    'printer_code': 'printer_code',
    'printer_name': 'printer_name',
    'is_active': 'is_active',
  },
  'tbl_master_menu_master': {
    'menu_master_code': 'menu_master_code',
    'name': 'name',
    'label_name': 'label_name',
    'color_code': 'color_code',
    'prep_zone_code': 'prep_zone_code',
    'station_code': 'station_code',
    'is_event_menu': 'is_event_menu',
    'is_active': 'is_active',
    'global_code': 'global_code',
  },
  'tbl_master_menu_category': {
    'menu_master_code': 'menu_master_code',
    'menu_category_code': 'menu_category_code',
    'name': 'name',
    'color_code': 'color_code',
    'is_active': 'is_active',
    'global_code': 'global_code',
  },
  'tbl_master_menu_item': {
    'menu_item_code': 'menu_item_code',
    'menu_master_code': 'menu_master_code',
    'menu_category_code': 'menu_category_code',
    'name': 'name',
    'kitchen_name': 'kitchen_name',
    'label_name': 'label_name',
    'color_code': 'color_code',
    'calories': 'calories',
    'description': 'description',
    'item_size': 'item_size',
    'sku_plu': 'sku_plu',
    'is_alcohol': 'is_alcohol',
    'menu_img': 'menu_img',
    'price_strategy': 'price_strategy',
    'card_price': 'card_price',
    'cash_price': 'cash_price',
    'is_price': 'is_price',
    'is_active': 'is_active',
    'stockinhand': 'stockinhand',
    'is_out_stock': 'is_out_stock',
    'item_contain_alcohol': 'item_contain_alcohol',
    'is_pos_visible': 'is_pos_visible',
    'is_kiosk_order_pay': 'is_kiosk_order_pay',
    'is_online_order_by_app': 'is_online_order_by_app',
    'is_online_ordering': 'is_online_ordering',
    'is_customer_invoice': 'is_customer_invoice',
    'tax_code': 'tax_code',
    'inherit_tax_inclusion': 'inherit_tax_inclusion',
    'is_tax_included': 'is_tax_included',
    'inherit_dining_tax': 'inherit_dining_tax',
    'dining_tax_effect': 'dining_tax_effect',
    'disqualify_dining_tax_exemption': 'disqualify_dining_tax_exemption',
    'inherit_modifier_group': 'inherit_modifier_group',
    'prep_zone_code': 'prep_zone_code',
  },
  'tbl_master_modifier_group': {
    'modifier_group_code': 'modifier_group_code',
    'group_name': 'group_name',
    'label_name': 'label_name',
    'is_required': 'is_required',
    'is_multiselect': 'is_multiselect',
    'min_selection': 'min_selection',
    'max_selection': 'max_selection',
    'show_default_top': 'show_default_top',
    'inherit_from_menu_group': 'inherit_from_menu_group',
    'price_strategy': 'price_strategy',
    'price': 'price',
    'is_active': 'is_active',
  },
  'tbl_master_modifier_item': {
    'modifier_item_code': 'modifier_item_code',
    'modifier_group_code': 'modifier_group_code',
    'name': 'name',
    'label_name': 'label_name',
    'color_code': 'color_code',
    'price': 'price',
    'is_default': 'is_default',
    'display_order': 'display_order',
    'is_active': 'is_active',
  },
  'tbl_master_prep_zone': {
    'prep_zone_code': 'prep_zone_code',
    'prep_zone_name': 'prep_zone_name',
    'station_code': 'station_code',
    'is_active': 'is_active',
    'send_to_expediter': 'send_to_expediter',
    'always_print_ticket': 'always_print_ticket',
    'printer_code': 'printer_code',
    'backup_printer_code': 'backup_printer_code',
  },
  'tbl_master_station': {
    'station_code': 'station_code',
    'stationname': 'stationname',
    'is_active': 'is_active',
    'station_groups': 'station_groups',
  },
  'tbl_master_time_events': {
    'Event_code': 'Event_code',
    'EventName': 'EventName',
    'GlobalPrice_Amount_Add': 'GlobalPrice_Amount_Add',
    'GlobalPrice_Amount_Disc': 'GlobalPrice_Amount_Disc',
    'GlobalPrice_Per_Add': 'GlobalPrice_Per_Add',
    'GlobalPrice_Per_Disc': 'GlobalPrice_Per_Disc',
    'Monday': 'Monday',
    'Mon_StartTime': 'Mon_StartTime',
    'Mon_EndTime': 'Mon_EndTime',
    'Tuesday': 'Tuesday',
    'Tue_StartTime': 'Tue_StartTime',
    'Tue_EndTime': 'Tue_EndTime',
    'Wednesday': 'Wednesday',
    'Wed_StartTime': 'Wed_StartTime',
    'Wed_EndTime': 'Wed_EndTime',
    'Thursday': 'Thursday',
    'Thu_StartTime': 'Thu_StartTime',
    'Thu_EndTime': 'Thu_EndTime',
    'FriDay': 'FriDay',
    'Fri_StartTime': 'Fri_StartTime',
    'Fri_EndTime': 'Fri_EndTime',
    'Saturday': 'Saturday',
    'Sat_StartTime': 'Sat_StartTime',
    'Sat_EndTime': 'Sat_EndTime',
    'SunDay': 'SunDay',
    'Sun_StartTime': 'Sun_StartTime',
    'Sun_EndTime': 'Sun_EndTime',
    'Event_Start_Date': 'Event_Start_Date',
    'Event_End_Date': 'Event_End_Date',
    'is_active': 'is_active',
  },
};

// Column name for ordering records (varies by table)
export const SYNC_ORDER_BY_COLUMN: Record<string, string> = {
  'tbl_master_printer': 'createdon',
  'tbl_master_menu_master': 'createdon',
  'tbl_master_menu_category': 'createdon',
  'tbl_master_menu_item': 'createdon',
  'tbl_master_modifier_group': 'createdon',
  'tbl_master_modifier_item': 'createdon',
  'tbl_master_prep_zone': 'createdon',
  'tbl_master_station': 'created_on',
  'tbl_master_tax': 'created_date',
  'tbl_master_time_events': 'created_date',
};

// List of tables that support syncing
export const SYNCABLE_TABLES = Object.keys(SYNC_TABLE_MAP);

