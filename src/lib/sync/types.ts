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
  'tbl_master_time_events': 'tbl_Time_Events',
};

// List of tables that support syncing
export const SYNCABLE_TABLES = Object.keys(SYNC_TABLE_MAP);

