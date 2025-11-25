/**
 * Sync Service
 * Main orchestrator for syncing data from Master DB to Location DB
 */

import { masterPrisma, locationPrisma } from '@/lib/databaseManager';
import {
  SyncRequest,
  SyncResult,
  SyncError,
  SyncLogEntry,
  SyncConfig,
  DEFAULT_SYNC_CONFIG,
  SYNC_TABLE_MAP,
  SYNCABLE_TABLES,
  SyncOperation,
} from './types';
import { syncProcessor } from './syncProcessor';
import { syncValidator } from './syncValidator';

export class SyncService {
  private config: SyncConfig;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }

  /**
   * Sync data to a specific location
   * Supports both incremental and full sync
   */
  async syncToLocation(request: SyncRequest): Promise<SyncResult> {
    const startTime = Date.now();
    const { locationCode, tableName, fullSync = false, forceSync = false } = request;

    const result: SyncResult = {
      success: true,
      locationCode,
      tableName,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
      startedAt: new Date(),
      completedAt: new Date(),
    };

    try {
      // Validate location exists
      const location = await masterPrisma.masterLocation.findUnique({
        where: { storeCode: locationCode },
      });

      if (!location) {
        throw new Error(`Location ${locationCode} not found`);
      }

      // Determine which tables to sync
      const tablesToSync = tableName
        ? [tableName]
        : fullSync
        ? SYNCABLE_TABLES
        : await this.getTablesWithPendingSyncs(locationCode);

      // Process each table
      for (const table of tablesToSync) {
        if (!SYNCABLE_TABLES.includes(table)) {
          console.warn(`Table ${table} is not syncable, skipping`);
          continue;
        }

        const tableResult = fullSync
          ? await this.fullSyncTable(locationCode, table, forceSync)
          : await this.incrementalSyncTable(locationCode, table, forceSync);

        result.recordsProcessed += tableResult.recordsProcessed;
        result.recordsSucceeded += tableResult.recordsSucceeded;
        result.recordsFailed += tableResult.recordsFailed;
        result.errors.push(...tableResult.errors);

        if (!tableResult.success) {
          result.success = false;
        }
      }

      result.completedAt = new Date();
      result.duration = Date.now() - startTime;

      return result;
    } catch (error: any) {
      result.success = false;
      result.completedAt = new Date();
      result.duration = Date.now() - startTime;
      result.errors.push({
        recordId: '',
        operation: 'INSERT',
        error: error.message || 'Unknown error',
        tableName: tableName || 'unknown',
      });

      throw error;
    }
  }

  /**
   * Incremental sync: Process only pending sync_log entries
   */
  private async incrementalSyncTable(
    locationCode: string,
    tableName: string,
    forceSync: boolean
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      locationCode,
      tableName,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
      startedAt: new Date(),
      completedAt: new Date(),
    };

    try {
      // Fetch pending sync log entries
      const pendingEntries = await this.getPendingSyncEntries(locationCode, tableName);

      if (pendingEntries.length === 0) {
        console.log(`No pending syncs for ${tableName} at location ${locationCode}`);
        result.completedAt = new Date();
        result.duration = Date.now() - startTime;
        return result;
      }

      // Process in batches
      const batches = this.createBatches(pendingEntries, this.config.batchSize);

      for (const batch of batches) {
        const batchResult = await syncProcessor.processBatch(
          locationCode,
          tableName,
          batch,
          this.config
        );

        result.recordsProcessed += batchResult.recordsProcessed;
        result.recordsSucceeded += batchResult.recordsSucceeded;
        result.recordsFailed += batchResult.recordsFailed;
        result.errors.push(...batchResult.errors);

        if (!batchResult.success) {
          result.success = false;
        }
      }

      // Update sync status
      await this.updateSyncStatus(
        locationCode,
        tableName,
        result.success ? 0 : 1,
        result.errors.length > 0 ? result.errors[0].error : null
      );

      result.completedAt = new Date();
      result.duration = Date.now() - startTime;

      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push({
        recordId: '',
        operation: 'INSERT',
        error: error.message,
        tableName,
      });
      result.completedAt = new Date();
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Full sync: Re-sync all records from master table
   */
  private async fullSyncTable(
    locationCode: string,
    tableName: string,
    forceSync: boolean
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      locationCode,
      tableName,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
      startedAt: new Date(),
      completedAt: new Date(),
    };

    try {
      // Get all records from master table
      const masterRecords = await this.getMasterTableRecords(tableName);

      // Process in batches
      const batches = this.createBatches(masterRecords, this.config.batchSize);

      for (const batch of batches) {
        // Convert master records to sync log format
        const syncEntries = batch.map((record) => ({
          id: BigInt(0),
          tableName,
          recordId: record.sync_id,
          operation: 'UPDATE' as SyncOperation, // Treat as UPDATE for full sync
          source: record.sync_source || 'server',
          data: record,
          changeTime: new Date(),
          syncStatus: 0 as const,
          locationCode,
          retryCount: 0,
        }));

        const batchResult = await syncProcessor.processBatch(
          locationCode,
          tableName,
          syncEntries,
          this.config
        );

        result.recordsProcessed += batchResult.recordsProcessed;
        result.recordsSucceeded += batchResult.recordsSucceeded;
        result.recordsFailed += batchResult.recordsFailed;
        result.errors.push(...batchResult.errors);

        if (!batchResult.success) {
          result.success = false;
        }
      }

      // Update sync status
      await this.updateSyncStatus(
        locationCode,
        tableName,
        result.success ? 0 : 1,
        result.errors.length > 0 ? result.errors[0].error : null
      );

      result.completedAt = new Date();
      result.duration = Date.now() - startTime;

      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push({
        recordId: '',
        operation: 'INSERT',
        error: error.message,
        tableName,
      });
      result.completedAt = new Date();
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Get pending sync log entries
   */
  private async getPendingSyncEntries(
    locationCode: string,
    tableName?: string
  ): Promise<SyncLogEntry[]> {
    const where: any = {
      sync_status: 0, // pending
      OR: [{ location_code: locationCode }, { location_code: null }], // null = all locations
    };

    if (tableName) {
      where.table_name = tableName;
    }

    const entries = await masterPrisma.$queryRaw<SyncLogEntry[]>`
      SELECT 
        id,
        table_name as "tableName",
        record_id::text as "recordId",
        operation,
        source,
        data,
        change_time as "changeTime",
        sync_status as "syncStatus",
        location_code as "locationCode",
        error_message as "errorMessage",
        retry_count as "retryCount",
        last_retry_at as "lastRetryAt",
        synced_at as "syncedAt",
        synced_by as "syncedBy"
      FROM sync_log
      WHERE sync_status = 0
        AND (location_code = ${locationCode} OR location_code IS NULL)
        ${tableName ? `AND table_name = ${tableName}` : ''}
      ORDER BY change_time ASC
      LIMIT 1000
    `;

    return entries;
  }

  /**
   * Get tables that have pending syncs
   */
  private async getTablesWithPendingSyncs(locationCode: string): Promise<string[]> {
    const result = await masterPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT DISTINCT table_name
      FROM sync_log
      WHERE sync_status = 0
        AND (location_code = ${locationCode} OR location_code IS NULL)
    `;

    return result.map((r) => r.table_name);
  }

  /**
   * Get all records from master table
   */
  private async getMasterTableRecords(tableName: string): Promise<any[]> {
    // This is a simplified version - you'll need to map table names to Prisma models
    // For now, using raw query
    const records = await masterPrisma.$queryRawUnsafe(`
      SELECT * FROM ${tableName}
      ORDER BY createdon DESC
    `);

    return records as any[];
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(
    locationCode: string,
    tableName: string,
    status: number,
    errorMessage: string | null
  ): Promise<void> {
    await masterPrisma.$executeRaw`
      SELECT update_sync_status(
        ${locationCode}::VARCHAR,
        ${tableName}::TEXT,
        ${status}::SMALLINT,
        ${errorMessage}::TEXT
      )
    `;
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process pending syncs for all locations (auto-sync)
   */
  async processPendingSyncs(): Promise<void> {
    // Get all active locations
    const locations = await masterPrisma.masterLocation.findMany({
      where: { isActive: 1 },
      select: { storeCode: true },
    });

    for (const location of locations) {
      try {
        await this.syncToLocation({
          locationCode: location.storeCode,
          fullSync: false,
        });
      } catch (error) {
        console.error(`Failed to sync location ${location.storeCode}:`, error);
      }
    }
  }
}

export const syncService = new SyncService();

