/**
 * Sync System Types
 * Type definitions for UUID-based sync system
 */

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncSource = 'server' | 'terminal' | 'website' | 'location';
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

export interface LocationToLocationSyncRequest {
  sourceLocationCode: string;  // Source location (e.g., "LOC001")
  targetLocationCode: string;  // Target location (e.g., "LOC002")
  tableName?: string;           // Optional: sync specific table
  fullSync?: boolean;          // Full sync vs incremental
  cloneMode?: 'clone' | 'merge'; // Clone (replace) or merge (keep existing)
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
  'tbl_master_department_type': 'tbl_department_type',
  'tbl_master_department': 'tbl_department',
  'tbl_master_menu_master': 'tbl_menu_master',
  'tbl_master_menu_category': 'tbl_menu_category',
  'tbl_master_menu_item': 'tbl_menu_item',
  'tbl_master_modifier_group': 'tbl_modifier_group',
  'tbl_master_modifier_item': 'tbl_modifier_item',
  'tbl_master_prep_zone': 'tbl_prep_zone',
  'tbl_master_station': 'tbl_station',
  'tbl_master_tax': 'tbl_tax',
  'tbl_master_time_events': 'tbl_time_events',
  'tbl_master_discount_master': 'tbl_discount_master',
  // User management tables - Individual sync only (not in full sync)
  'tbl_user': 'users',
  // Permission system tables
  'tbl_permission': 'permissions',
  'tbl_role': 'roles',
  'tbl_role_permission': 'role_permissions',
  // Relationship/junction tables
  'tbl_master_menu_master_event': 'tbl_menu_master_event',
  'tbl_master_menu_category_modifier': 'tbl_menu_category_modifier',
  'tbl_master_menu_item_modifier_group': 'tbl_menu_item_modifier_group',
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
    'isreceipt': 'isreceipt',
    'isdocument': 'isdocument',
    'is_kitchen': 'is_kitchen',
  },
  'tbl_master_department_type': {
    'dept_type_code': 'dept_type_code',
    'name': 'name',
    'is_active': 'is_active',
  },
  'tbl_master_department': {
    'dept_code': 'dept_code',
    'dept_name': 'dept_name',
    'dept_taxcode': 'dept_taxcode',
    'dept_type': 'dept_type',
    'is_active': 'is_active',
  },
  'tbl_master_menu_master': {
    'menu_master_code': 'menu_master_code',
    'name': 'name',
    'label_name': 'label_name',
    'color_code': 'color_code',
    'forcolor_code': 'forcolor_code',
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
    'forcolor_code': 'forcolor_code',
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
    'forcolor_code': 'forcolor_code',
    'calories': 'calories',
    'description': 'description',
    'item_size': 'item_size',
    'sku_plu': 'sku_plu',
    'barcode': 'barcode',
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
    'prefix': 'prefix',
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
    'is_kitchen': 'is_kitchen',
    'is_bar': 'is_bar',
    'is_bill': 'is_bill',
    'is_report': 'is_report',
  },
  'tbl_master_time_events': {
    'Event_code': 'Event_code',
    'EventName': 'EventName',
    'dept_code': 'dept_code',
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
  'tbl_master_discount_master': {
    'discount_code': 'discount_code',
    'promo_code': 'promo_code',
    'discount_name': 'discount_name',
    'discount_type': 'discount_type',
    'discount_mode': 'discount_mode',
    'discount_value': 'discount_value',
    'max_discount_amount': 'max_discount_amount',
    'is_item_level': 'is_item_level',
    'is_bill_level': 'is_bill_level',
    'requires_manager_approval': 'requires_manager_approval',
    'allowed_roles': 'allowed_roles',
    'valid_from': 'valid_from',
    'valid_to': 'valid_to',
    'menu_category': 'menu_category',
    'dept_code': 'dept_code',
    'discount_note': 'discount_note',
    'is_delete': 'is_delete',
    'is_open_discount': 'is_open_discount',
    'is_active': 'is_active',
  },
  // User management tables - Individual sync only (synced on create/update, not in full sync)
  'tbl_user': {
    'email': 'email',
    'username': 'username',
    'password': 'password', // Note: Password should be synced as hashed
    'first_name': 'firstName',  // Database column name (snake_case)
    'last_name': 'lastName',  // Map from master table's last_name (snake_case) to location table's lastName (camelCase)
    'phone': 'phone',
    'role': 'role',
    'access_level': 'access_level',  // Database column name (snake_case)
    'company_id': 'company_id',  // Database column name (snake_case)
    'dealer_id': 'dealer_id',  // Database column name (snake_case)
    'location_id': 'location_id',  // Database column name (snake_case)
    'default_store_code': 'default_store_code',  // Database column name (snake_case)
    'is_active': 'isActive',  // Map from master table's is_active (snake_case) to location table's isActive (camelCase)
    'sync_id': 'sync_id',  // Database column name (snake_case) - for sync tracking
  },
  // Relationship/junction tables
  'tbl_master_menu_master_event': {
    'menu_master_code': 'menu_master_code',
    'event_code': 'event_code',
    'global_code': 'global_code',
  },
  'tbl_master_menu_category_modifier': {
    'menu_category_code': 'menu_category_code',
    'modifier_group_code': 'modifier_group_code',
  },
  'tbl_master_menu_item_modifier_group': {
    'menu_item_code': 'menu_item_code',
    'modifier_group_code': 'modifier_group_code',
    'inherit_from_menu_group': 'inherit_from_menu_group',
    'is_inherit_from_menu_category': 'is_inherit_from_menu_category',
    'is_required': 'is_required',
    'is_multiselect': 'is_multiselect',
    'min_selection': 'min_selection',
    'max_selection': 'max_selection',
  },
  // Permission system tables
  'tbl_permission': {
    'permission_code': 'permission_code',
    'permission_name': 'permission_name',
    'module': 'module',
    'action': 'action',
    'description': 'description',
    'is_active': 'is_active',
  },
  'tbl_role': {
    'role_code': 'role_code',
    'role_name': 'role_name',
    'description': 'description',
    'is_system_role': 'is_system_role',
    'is_active': 'is_active',
  },
  'tbl_role_permission': {
    'role_code': 'role_code',
    'permission_code': 'permission_code',
  },
};

// Column name for ordering records (varies by table)
export const SYNC_ORDER_BY_COLUMN: Record<string, string> = {
  'tbl_master_printer': 'createdon',
  'tbl_master_department_type': 'createdon',
  'tbl_master_department': 'createdon',
  'tbl_master_menu_master': 'createdon',
  'tbl_master_menu_category': 'createdon',
  'tbl_master_menu_item': 'createdon',
  'tbl_master_modifier_group': 'createdon',
  'tbl_master_modifier_item': 'createdon',
  'tbl_master_prep_zone': 'createdon',
  'tbl_master_station': 'station_code', // Station table doesn't have createdon/created_date
  'tbl_master_tax': 'created_date',
  'tbl_master_time_events': 'created_date',
  'tbl_master_discount_master': 'created_date',
  // User management tables - Individual sync only (not in full sync)
  'tbl_user': 'created_on',
  // Permission system tables
  'tbl_permission': 'created_on',
  'tbl_role': 'created_on',
  'tbl_role_permission': 'created_on',
  // Relationship/junction tables
  'tbl_master_menu_master_event': 'createdon',
  'tbl_master_menu_category_modifier': 'createdon',
  'tbl_master_menu_item_modifier_group': 'createdon',
};

// List of tables that support syncing
export const SYNCABLE_TABLES = Object.keys(SYNC_TABLE_MAP);

// Table sync order: parent tables must be synced before child tables
// This ensures foreign key constraints are satisfied during sync
export const SYNC_TABLE_ORDER: string[] = [
  // Independent tables (no dependencies)
  'tbl_master_tax',
  'tbl_master_printer',
  'tbl_master_station',
  'tbl_master_department_type',
  'tbl_master_department',
  'tbl_master_time_events',
  'tbl_master_prep_zone',
  'tbl_master_discount_master',
  
  // Permission system tables (must sync before users)
  'tbl_permission',              // Independent
  'tbl_role',                    // Independent
  'tbl_role_permission',         // Depends on tbl_permission and tbl_role
  
  // User management - REMOVED: synced separately
  
  // Menu hierarchy (parent -> child)
  'tbl_master_menu_master',      // Must sync before menu_category and menu_master_event
  'tbl_master_menu_category',    // Depends on menu_master
  'tbl_master_menu_item',         // Depends on menu_master and menu_category
  
  // Modifier hierarchy
  'tbl_master_modifier_group',   // Independent
  'tbl_master_modifier_item',     // Depends on modifier_group
  
  // Relationship/junction tables (must sync after all parent tables)
  'tbl_master_menu_master_event',        // Depends on menu_master and time_events
  'tbl_master_menu_category_modifier',   // Depends on menu_category and modifier_group
  'tbl_master_menu_item_modifier_group', // Depends on menu_item and modifier_group
];

// Table dependencies: child table -> parent table(s)
export const SYNC_TABLE_DEPENDENCIES: Record<string, string[]> = {
  // User management dependencies - REMOVED: synced separately
  // Permission system dependencies
  'tbl_role_permission': ['tbl_permission', 'tbl_role'],
  // Menu dependencies
  'tbl_master_menu_category': ['tbl_master_menu_master'],
  'tbl_master_menu_item': ['tbl_master_menu_master', 'tbl_master_menu_category'],
  'tbl_master_modifier_item': ['tbl_master_modifier_group'],
  'tbl_master_prep_zone': ['tbl_master_station', 'tbl_master_printer'],
  'tbl_master_department': ['tbl_master_tax', 'tbl_master_department_type'],
  // Relationship/junction tables
  'tbl_master_menu_master_event': ['tbl_master_menu_master', 'tbl_master_time_events'],
  'tbl_master_menu_category_modifier': ['tbl_master_menu_category', 'tbl_master_modifier_group'],
  'tbl_master_menu_item_modifier_group': ['tbl_master_menu_item', 'tbl_master_modifier_group'],
};

