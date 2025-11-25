/**
 * Sync Processor
 * Processes individual sync log entries and applies them to Location DB
 */

import { locationPrisma, masterPrisma } from '@/lib/databaseManager';
import {
  SyncLogEntry,
  SyncResult,
  SyncError,
  SyncConfig,
  SyncOperation,
  SYNC_TABLE_MAP,
} from './types';
import { syncValidator } from './syncValidator';

export class SyncProcessor {
  /**
   * Process a batch of sync log entries
   */
  async processBatch(
    locationCode: string,
    tableName: string,
    entries: SyncLogEntry[],
    config: SyncConfig
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      locationCode,
      tableName,
      recordsProcessed: entries.length,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
      startedAt: new Date(),
      completedAt: new Date(),
    };

    const startTime = Date.now();

    // Get location table name
    const locationTableName = SYNC_TABLE_MAP[tableName];
    if (!locationTableName) {
      result.success = false;
      result.errors.push({
        recordId: '',
        operation: 'INSERT',
        error: `No mapping found for table ${tableName}`,
        tableName,
      });
      result.completedAt = new Date();
      result.duration = Date.now() - startTime;
      return result;
    }

    // Process each entry
    for (const entry of entries) {
      try {
        // Validate entry
        const validation = await syncValidator.validateEntry(entry, locationTableName);
        if (!validation.valid) {
          result.recordsFailed++;
          result.errors.push({
            recordId: entry.recordId,
            operation: entry.operation,
            error: validation.error || 'Validation failed',
            tableName,
          });
          await this.markSyncFailed(entry.id, validation.error || 'Validation failed');
          continue;
        }

        // Apply sync operation
        await this.applySyncOperation(entry, locationTableName, locationCode);

        // Mark as processed
        await this.markSyncProcessed(entry.id);

        result.recordsSucceeded++;
      } catch (error: any) {
        result.recordsFailed++;
        result.errors.push({
          recordId: entry.recordId,
          operation: entry.operation,
          error: error.message || 'Unknown error',
          tableName,
        });

        // Update retry count
        await this.handleSyncError(entry, error.message, config);

        if (result.recordsFailed > 0) {
          result.success = false;
        }
      }
    }

    result.completedAt = new Date();
    result.duration = Date.now() - startTime;

    return result;
  }

  /**
   * Apply sync operation to location database
   */
  private async applySyncOperation(
    entry: SyncLogEntry,
    locationTableName: string,
    locationCode: string
  ): Promise<void> {
    const { operation, data, recordId } = entry;

    // Filter out sync fields from data (we'll set them separately)
    const { sync_id, sync_source, ...recordData } = data;

    switch (operation) {
      case 'INSERT':
        await this.handleInsert(locationTableName, recordId, recordData, data.sync_source);
        break;

      case 'UPDATE':
        await this.handleUpdate(locationTableName, recordId, recordData, data.sync_source);
        break;

      case 'DELETE':
        await this.handleDelete(locationTableName, recordId);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Handle INSERT operation
   */
  private async handleInsert(
    tableName: string,
    syncId: string,
    data: Record<string, any>,
    syncSource: string
  ): Promise<void> {
    // Check if record already exists
    const existing = await locationPrisma.$queryRawUnsafe(`
      SELECT sync_id FROM ${tableName} WHERE sync_id = '${syncId}'::UUID
    `);

    if (existing && (existing as any[]).length > 0) {
      // Record exists, treat as UPDATE instead
      await this.handleUpdate(tableName, syncId, data, syncSource);
      return;
    }

    // Insert new record
    const insertData = {
      ...data,
      sync_id: syncId,
      sync_source: syncSource,
    };

    // Build dynamic INSERT query
    const columns = Object.keys(insertData).join(', ');
    const values = Object.values(insertData)
      .map((v) => (v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`))
      .join(', ');

    await locationPrisma.$executeRawUnsafe(`
      INSERT INTO ${tableName} (${columns})
      VALUES (${values})
    `);
  }

  /**
   * Handle UPDATE operation
   */
  private async handleUpdate(
    tableName: string,
    syncId: string,
    data: Record<string, any>,
    syncSource: string
  ): Promise<void> {
    // Check if record exists
    const existing = await locationPrisma.$queryRawUnsafe(`
      SELECT sync_id FROM ${tableName} WHERE sync_id = '${syncId}'::UUID
    `);

    if (!existing || (existing as any[]).length === 0) {
      // Record doesn't exist, treat as INSERT
      await this.handleInsert(tableName, syncId, data, syncSource);
      return;
    }

    // Build UPDATE query
    const setClause = Object.entries(data)
      .map(([key, value]) => {
        if (value === null) {
          return `${key} = NULL`;
        }
        return `${key} = '${String(value).replace(/'/g, "''")}'`;
      })
      .join(', ');

    await locationPrisma.$executeRawUnsafe(`
      UPDATE ${tableName}
      SET ${setClause}, sync_source = '${syncSource}'
      WHERE sync_id = '${syncId}'::UUID
    `);
  }

  /**
   * Handle DELETE operation
   */
  private async handleDelete(tableName: string, syncId: string): Promise<void> {
    await locationPrisma.$executeRawUnsafe(`
      DELETE FROM ${tableName}
      WHERE sync_id = '${syncId}'::UUID
    `);
  }

  /**
   * Mark sync entry as processed
   */
  private async markSyncProcessed(entryId: bigint): Promise<void> {
    await masterPrisma.$executeRaw`
      UPDATE sync_log
      SET sync_status = 1,
          synced_at = CURRENT_TIMESTAMP
      WHERE id = ${entryId}
    `;
  }

  /**
   * Mark sync entry as failed
   */
  private async markSyncFailed(entryId: bigint, errorMessage: string): Promise<void> {
    await masterPrisma.$executeRaw`
      UPDATE sync_log
      SET sync_status = 2,
          error_message = ${errorMessage}
      WHERE id = ${entryId}
    `;
  }

  /**
   * Handle sync error with retry logic
   */
  private async handleSyncError(
    entry: SyncLogEntry,
    errorMessage: string,
    config: SyncConfig
  ): Promise<void> {
    const newRetryCount = entry.retryCount + 1;

    if (newRetryCount <= config.maxRetries) {
      // Calculate retry delay with exponential backoff
      const delay = Math.min(
        config.retryDelay * Math.pow(config.backoffMultiplier, newRetryCount - 1),
        config.maxRetryDelay
      );

      await masterPrisma.$executeRaw`
        UPDATE sync_log
        SET retry_count = ${newRetryCount},
            error_message = ${errorMessage},
            last_retry_at = CURRENT_TIMESTAMP,
            sync_status = 0
        WHERE id = ${entry.id}
      `;
    } else {
      // Max retries reached, mark as failed
      await this.markSyncFailed(entry.id, `Max retries reached: ${errorMessage}`);
    }
  }
}

export const syncProcessor = new SyncProcessor();

