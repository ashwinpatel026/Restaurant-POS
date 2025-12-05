/**
 * Sync Service
 * Main orchestrator for syncing data from Master DB to Location DB
 */

import { masterPrisma, locationPrisma } from '@/lib/databaseManager';
import { randomUUID } from 'crypto';
import {
  SyncRequest,
  LocationToLocationSyncRequest,
  SyncResult,
  SyncError,
  SyncLogEntry,
  SyncConfig,
  DEFAULT_SYNC_CONFIG,
  SYNC_TABLE_MAP,
  SYNCABLE_TABLES,
  SYNC_ORDER_BY_COLUMN,
  SYNC_TABLE_ORDER,
  SYNC_TABLE_DEPENDENCIES,
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
      const location = await masterPrisma.location.findUnique({
        where: { storeCode: locationCode },
      });

      if (!location) {
        throw new Error(`Location ${locationCode} not found`);
      }

      // Determine which tables to sync
      let tablesToSync = tableName
        ? [tableName]
        : fullSync
        ? SYNCABLE_TABLES
        : await this.getTablesWithPendingSyncs(locationCode);

      // Sort tables by dependency order (parent tables first)
      tablesToSync = this.sortTablesByDependencies(tablesToSync);

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

      console.log(`Found ${pendingEntries.length} pending entries for ${tableName} at location ${locationCode}`);

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
        const syncEntries = batch.map((record) => {
          // Generate sync_id if record doesn't have one (for tables like tbl_user)
          let recordId = record.sync_id;
          if (!recordId) {
            // Use email for users table, or generate UUID for others
            if (tableName === 'tbl_user' && record.email) {
              // For users, we'll use email as identifier in sync log, but generate UUID for record_id
              recordId = randomUUID();
            } else {
              recordId = randomUUID();
            }
          }
          
          return {
            id: BigInt(0),
            tableName,
            recordId: recordId || randomUUID(),
            operation: 'UPDATE' as SyncOperation, // Treat as UPDATE for full sync
            source: record.sync_source || 'server',
            data: record,
            changeTime: new Date(),
            syncStatus: 0 as const,
            locationCode,
            retryCount: 0,
          };
        });

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
    // Build WHERE clause
    const escapeSQL = (value: any): string => {
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      }
      return String(value);
    };

    let whereClause = `sync_status = 0 AND (location_code = ${escapeSQL(locationCode)} OR location_code IS NULL)`;
    
    if (tableName) {
      whereClause += ` AND table_name = ${escapeSQL(tableName)}`;
    }

    const entries = await masterPrisma.$queryRawUnsafe<SyncLogEntry[]>(`
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
      WHERE ${whereClause}
      ORDER BY change_time ASC
      LIMIT 1000
    `);

    return entries || [];
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
    // Get the order by column for this table
    const orderByColumn = SYNC_ORDER_BY_COLUMN[tableName] || 'createdon';
    
    // This is a simplified version - you'll need to map table names to Prisma models
    // For now, using raw query
    const records = await masterPrisma.$queryRawUnsafe(`
      SELECT * FROM ${tableName}
      ORDER BY ${orderByColumn} DESC
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
    try {
      // Use direct SQL INSERT/UPDATE instead of function call
      // This works regardless of whether the function exists
      await masterPrisma.$executeRaw`
        INSERT INTO sync_status (
          location_code,
          table_name,
          last_sync_time,
          last_sync_status,
          last_error_message,
          updated_at,
          total_records_synced
        )
        VALUES (
          ${locationCode}::VARCHAR(100),
          ${tableName}::TEXT,
          CURRENT_TIMESTAMP,
          ${status}::SMALLINT,
          ${errorMessage || null}::TEXT,
          CURRENT_TIMESTAMP,
          1
        )
        ON CONFLICT (location_code, table_name) 
        DO UPDATE SET
          last_sync_time = CURRENT_TIMESTAMP,
          last_sync_status = ${status}::SMALLINT,
          last_error_message = ${errorMessage || null}::TEXT,
          updated_at = CURRENT_TIMESTAMP,
          total_records_synced = sync_status.total_records_synced + 1
      `;
    } catch (error: any) {
      // Log error but don't throw - sync status update failure shouldn't break sync
      console.error(`[syncService] Failed to update sync status for ${locationCode}.${tableName}:`, error.message);
    }
  }

  /**
   * Sort tables by dependency order (parent tables before child tables)
   */
  private sortTablesByDependencies(tables: string[]): string[] {
    // Create a map of table -> order index
    const orderMap = new Map<string, number>();
    SYNC_TABLE_ORDER.forEach((table, index) => {
      orderMap.set(table, index);
    });

    // Sort tables: first by defined order, then by dependency depth
    return tables.sort((a, b) => {
      const orderA = orderMap.get(a) ?? 999;
      const orderB = orderMap.get(b) ?? 999;
      
      // If both have defined order, use that
      if (orderA !== 999 && orderB !== 999) {
        return orderA - orderB;
      }
      
      // Check dependencies: if A depends on B, B should come first
      const depsA = SYNC_TABLE_DEPENDENCIES[a] || [];
      const depsB = SYNC_TABLE_DEPENDENCIES[b] || [];
      
      if (depsA.includes(b)) {
        return 1; // B should come before A
      }
      if (depsB.includes(a)) {
        return -1; // A should come before B
      }
      
      // Fallback to defined order
      return orderA - orderB;
    });
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
    const locations = await masterPrisma.location.findMany({
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

  /**
   * Sync data from one location to another (location-to-location clone)
   * Clones all syncable data from source location to target location
   */
  async syncLocationToLocation(request: LocationToLocationSyncRequest): Promise<SyncResult> {
    const startTime = Date.now();
    const { 
      sourceLocationCode, 
      targetLocationCode, 
      tableName, 
      fullSync = true, 
      cloneMode = 'clone' 
    } = request;

    const result: SyncResult = {
      success: true,
      locationCode: targetLocationCode,
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
      // Validate both locations exist
      const [sourceLocation, targetLocation] = await Promise.all([
        masterPrisma.location.findUnique({
          where: { storeCode: sourceLocationCode },
        }),
        masterPrisma.location.findUnique({
          where: { storeCode: targetLocationCode },
        }),
      ]);

      if (!sourceLocation) {
        throw new Error(`Source location ${sourceLocationCode} not found`);
      }
      if (!targetLocation) {
        throw new Error(`Target location ${targetLocationCode} not found`);
      }
      if (sourceLocationCode === targetLocationCode) {
        throw new Error('Source and target locations cannot be the same');
      }

      // Determine which tables to sync
      const tablesToSync = tableName
        ? [tableName]
        : SYNCABLE_TABLES;

      // Sort tables by dependency order (parent tables first)
      const sortedTables = this.sortTablesByDependencies(tablesToSync);

      console.log(`Starting location-to-location sync: ${sourceLocationCode} -> ${targetLocationCode}`);
      console.log(`Mode: ${cloneMode}, Tables: ${sortedTables.length}`);

      // Process each table
      for (const masterTableName of sortedTables) {
        if (!SYNCABLE_TABLES.includes(masterTableName)) {
          console.warn(`Table ${masterTableName} is not syncable, skipping`);
          continue;
        }

        const tableResult = await this.cloneLocationTable(
          sourceLocationCode,
          targetLocationCode,
          masterTableName,
          cloneMode
        );

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

      console.log(`Location-to-location sync completed: ${result.recordsSucceeded}/${result.recordsProcessed} records synced`);

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
   * Clone a table from source location to target location
   */
  private async cloneLocationTable(
    sourceLocationCode: string,
    targetLocationCode: string,
    masterTableName: string,
    cloneMode: 'clone' | 'merge'
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const locationTableName = SYNC_TABLE_MAP[masterTableName];
    
    if (!locationTableName) {
      return {
        success: false,
        locationCode: targetLocationCode,
        tableName: masterTableName,
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        errors: [{
          recordId: '',
          operation: 'INSERT',
          error: `No mapping found for table ${masterTableName}`,
          tableName: masterTableName,
        }],
        duration: 0,
        startedAt: new Date(),
        completedAt: new Date(),
      };
    }

    const result: SyncResult = {
      success: true,
      locationCode: targetLocationCode,
      tableName: masterTableName,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
      startedAt: new Date(),
      completedAt: new Date(),
    };

    try {
      // Get order by column
      const orderByColumn = SYNC_ORDER_BY_COLUMN[masterTableName] || 'createdon';
      const escapedSourceCode = sourceLocationCode.replace(/'/g, "''");

      // First, check total records in table for debugging
      const totalCount = await locationPrisma.$queryRawUnsafe<[{ count: bigint }]>(`
        SELECT COUNT(*) as count FROM ${locationTableName}
      `);
      console.log(`Total records in ${locationTableName}: ${totalCount[0]?.count || 0}`);

      // Check records with any store_code for debugging
      const anyStoreCodeCount = await locationPrisma.$queryRawUnsafe<[{ count: bigint }]>(`
        SELECT COUNT(*) as count FROM ${locationTableName}
        WHERE store_code IS NOT NULL
      `);
      console.log(`Records with store_code in ${locationTableName}: ${anyStoreCodeCount[0]?.count || 0}`);

      // Check distinct store_codes for debugging
      const distinctStores = await locationPrisma.$queryRawUnsafe<[{ store_code: string }]>(`
        SELECT DISTINCT store_code FROM ${locationTableName}
        WHERE store_code IS NOT NULL
        LIMIT 10
      `);
      console.log(`Sample store_codes in ${locationTableName}:`, distinctStores.map(s => s.store_code));

      // Fetch records from source location - handle case sensitivity
      // Use double quotes for table/column names and proper escaping for values
      const sourceRecords = await locationPrisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "${locationTableName}"
        WHERE "store_code" = '${escapedSourceCode}'
        ORDER BY "${orderByColumn}" DESC
      `);

      console.log(`Found ${sourceRecords.length} records in ${locationTableName} for source location ${sourceLocationCode}`);

      if (sourceRecords.length === 0) {
        result.completedAt = new Date();
        result.duration = Date.now() - startTime;
        return result;
      }

      // Process in batches
      const batches = this.createBatches(sourceRecords, this.config.batchSize);

      for (const batch of batches) {
        // Convert to sync entries with location code transformation
        const syncEntries = batch.map((record) => ({
          id: BigInt(0),
          tableName: masterTableName,
          recordId: record.sync_id,
          operation: 'UPDATE' as SyncOperation,
          source: 'location' as const,
          data: record,
          changeTime: new Date(),
          syncStatus: 0 as const,
          locationCode: targetLocationCode,
          retryCount: 0,
        }));

        // Process batch with location-to-location transformation
        const batchResult = await syncProcessor.processLocationToLocationBatch(
          sourceLocationCode,
          targetLocationCode,
          masterTableName,
          syncEntries,
          this.config,
          cloneMode
        );

        result.recordsProcessed += batchResult.recordsProcessed;
        result.recordsSucceeded += batchResult.recordsSucceeded;
        result.recordsFailed += batchResult.recordsFailed;
        result.errors.push(...batchResult.errors);

        if (!batchResult.success) {
          result.success = false;
        }
      }

      result.completedAt = new Date();
      result.duration = Date.now() - startTime;

      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push({
        recordId: '',
        operation: 'INSERT',
        error: error.message,
        tableName: masterTableName,
      });
      result.completedAt = new Date();
      result.duration = Date.now() - startTime;
      return result;
    }
  }
}

export const syncService = new SyncService();

