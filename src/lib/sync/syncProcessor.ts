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
  SYNC_FIELD_MAP,
} from './types';
import { syncValidator } from './syncValidator';

export class SyncProcessor {
  // List of boolean columns that need special handling
  private readonly BOOLEAN_COLUMNS = new Set([
    'inherit_tax_inclusion',
    'is_tax_included',
    'inherit_dining_tax',
    'disqualify_dining_tax_exemption',
    'inherit_modifier_group',
    'is_kitchen',
    'is_bar',
    'is_bill',
    'is_report',
  ]);

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
        console.log(`Processing sync entry: ${entry.recordId}, operation: ${entry.operation}, table: ${tableName}`);
        
        // Validate entry
        const validation = await syncValidator.validateEntry(entry, locationTableName);
        if (!validation.valid) {
          console.error(`Validation failed for entry ${entry.recordId}:`, validation.error);
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
        console.log(`Successfully synced entry ${entry.recordId}`);

        result.recordsSucceeded++;
      } catch (error: any) {
        console.error(`Error processing sync entry ${entry.recordId}:`, error);
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
    const { operation, data, recordId, tableName } = entry;

    // Parse data if it's a string (JSONB from database)
    let parsedData: any = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse data JSON:', e);
        throw new Error(`Invalid JSON data in sync_log: ${e}`);
      }
    }

    // Filter out sync fields from data (we'll set them separately)
    const { sync_id, sync_source, ...recordData } = parsedData;

    // Map field names from master table to location table
    const mappedData = this.mapFieldsToLocationTable(tableName, recordData, locationCode);
    
    // Add store_code from locationCode (all location tables have store_code column)
    // This maps the sync location_code to the location database's store_code column
    mappedData.store_code = locationCode;
    
    console.log(`Mapped data for ${tableName} -> ${locationTableName}:`, Object.keys(mappedData));

    switch (operation) {
      case 'INSERT':
        await this.handleInsert(
          locationTableName,
          recordId,
          mappedData,
          parsedData.sync_source || 'server',
          locationCode
        );
        break;

      case 'UPDATE':
        await this.handleUpdate(
          locationTableName,
          recordId,
          mappedData,
          parsedData.sync_source || 'server',
          locationCode
        );
        break;

      case 'DELETE':
        await this.handleDelete(locationTableName, recordId, locationCode);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Map field names from master table to location table
   * Only includes columns defined in SYNC_FIELD_MAP (whitelist approach)
   */
  private mapFieldsToLocationTable(masterTableName: string, data: Record<string, any>, locationCode?: string): Record<string, any> {
    const fieldMap = SYNC_FIELD_MAP[masterTableName];
    if (!fieldMap) {
      // No mapping defined - return empty object (don't sync anything)
      console.warn(`No sync field map defined for table ${masterTableName}, skipping all fields`);
      return {};
    }

    const mappedData: Record<string, any> = {};

    // Normalize all keys to lowercase for comparison (PostgreSQL returns lowercase from row_to_json)
    const normalizedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      normalizedData[key.toLowerCase()] = value;
    }

    for (const [key, value] of Object.entries(normalizedData)) {
      // Skip sync fields - they're handled separately
      if (key === 'sync_id' || key === 'sync_source') {
        continue;
      }

      // Skip ID fields (auto-increment primary keys)
      if (key === 'tbl_tax_id' || key === 'printer_id' || key === 'prep_zone_id' ||
          key === 'menu_master_id' || key === 'menu_category_id' || key === 'menu_item_id' ||
          key === 'tbl_station_id' || key === 'id') {
        continue;
      }

      // Skip audit fields (check various case variations)
      if (key === 'created_date' || key === 'created_on' || key === 'createdon' ||
          key === 'updated_on' || key === 'updatedon' ||
          key === 'created_by' || key === 'createdby' ||
          key === 'updated_by' || key === 'updatedby' ||
          key === 'created_date' || key === 'created_by' ) {
        continue;
      }

      // Skip store-specific fields (we'll set store_code from locationCode)
      if (key === 'store_code' || key === 'storecode' ||
          key === 'is_sync_to_web' || key === 'is_sync_to_local') {
        continue;
      }

      // Try exact match first (for case-sensitive columns like Event_code)
      let mappedKey = fieldMap[key];
      
      // If no exact match, try with original case from fieldMap keys
      if (!mappedKey) {
        // Check if any fieldMap key matches (case-insensitive)
        for (const [mapKey, mapValue] of Object.entries(fieldMap)) {
          if (mapKey.toLowerCase() === key) {
            mappedKey = mapValue;
            break;
          }
        }
      }
      
      // Only include if field is in the sync map (whitelist)
      if (mappedKey) {
        // Special handling for code fields: transform from master format to dashboard format
        if (locationCode) {
          // Handle tax_code
          if (masterTableName === 'tbl_master_tax' && key === 'tax_code') {
            // Master format: TAX1, TAX2, etc.
            // Dashboard format: WM + STORE_CODE + TAX1 (e.g., WMLOC01TAX1)
            const taxCodeValue = String(value || '');
            const taxMatch = taxCodeValue.match(/^(TAX\d+)$/);
            if (taxMatch) {
              mappedData[mappedKey] = `WM${locationCode}${taxMatch[1]}`;
            } else {
              mappedData[mappedKey] = value;
            }
          }
          // Handle printer_code
          else if (masterTableName === 'tbl_master_printer' && key === 'printer_code') {
            // Master format: PRT1, PRT2, etc.
            // Dashboard format: WM + STORE_CODE + PRT1 (e.g., WMLOC01PRT1)
            const printerCodeValue = String(value || '');
            const printerMatch = printerCodeValue.match(/^(PRT\d+)$/);
            if (printerMatch) {
              mappedData[mappedKey] = `WM${locationCode}${printerMatch[1]}`;
            } else {
              mappedData[mappedKey] = value;
            }
          }
          // Handle station_code
          else if (masterTableName === 'tbl_master_station' && key === 'station_code') {
            // Master format: STA1, STA2, etc.
            // Dashboard format: WM + STORE_CODE + STA1 (e.g., WMLOC01STA1)
            const stationCodeValue = String(value || '');
            const stationMatch = stationCodeValue.match(/^(STA\d+)$/);
            if (stationMatch) {
              mappedData[mappedKey] = `WM${locationCode}${stationMatch[1]}`;
            } else {
              mappedData[mappedKey] = value;
            }
          }
          // Handle Event_code (time events) - key is normalized to lowercase
          else if (masterTableName === 'tbl_master_time_events' && key === 'event_code') {
            // Master format: TE1, TE2, etc.
            // Dashboard format: WM + STORE_CODE + TE1 (e.g., WMLOC01TE1)
            const eventCodeValue = String(value || '');
            const eventMatch = eventCodeValue.match(/^(TE\d+)$/);
            if (eventMatch) {
              mappedData[mappedKey] = `WM${locationCode}${eventMatch[1]}`;
            } else {
              mappedData[mappedKey] = value;
            }
          }
          // Handle prep_zone_code
          else if (masterTableName === 'tbl_master_prep_zone' && key === 'prep_zone_code') {
            // Master format: PZ1, PZ2, etc.
            // Dashboard format: WM + STORE_CODE + PZ1 (e.g., WMLOC01PZ1)
            const prepZoneCodeValue = String(value || '');
            const prepZoneMatch = prepZoneCodeValue.match(/^(PZ\d+)$/);
            if (prepZoneMatch) {
              mappedData[mappedKey] = `WM${locationCode}${prepZoneMatch[1]}`;
            } else {
              mappedData[mappedKey] = value;
            }
          }
          // Handle menu_master_code
          else if (masterTableName === 'tbl_master_menu_master' && key === 'menu_master_code') {
            // Master format: MM1, MM2, etc.
            // Dashboard format: WM + STORE_CODE + MM1 (e.g., WMLOC01MM1)
            const menuMasterCodeValue = String(value || '');
            const menuMasterMatch = menuMasterCodeValue.match(/^(MM\d+)$/);
            if (menuMasterMatch) {
              mappedData[mappedKey] = `WM${locationCode}${menuMasterMatch[1]}`;
            } else {
              mappedData[mappedKey] = value;
            }
          }
          // Handle menu_category_code
          else if (masterTableName === 'tbl_master_menu_category' && key === 'menu_category_code') {
            // Master format: MC1, MC2, etc.
            // Dashboard format: WM + STORE_CODE + MC1 (e.g., WMLOC01MC1)
            const menuCategoryCodeValue = String(value || '');
            const menuCategoryMatch = menuCategoryCodeValue.match(/^(MC\d+)$/);
            if (menuCategoryMatch) {
              mappedData[mappedKey] = `WM${locationCode}${menuCategoryMatch[1]}`;
            } else {
              mappedData[mappedKey] = value;
            }
          }
          // Handle menu_item_code
          else if (masterTableName === 'tbl_master_menu_item' && key === 'menu_item_code') {
            // Master format: MI1, MI2, etc.
            // Dashboard format: WM + STORE_CODE + MI1 (e.g., WMLOC01MI1)
            const menuItemCodeValue = String(value || '');
            const menuItemMatch = menuItemCodeValue.match(/^(MI\d+)$/);
            if (menuItemMatch) {
              mappedData[mappedKey] = `WM${locationCode}${menuItemMatch[1]}`;
            } else {
              mappedData[mappedKey] = value;
            }
          }
          // Handle modifier_group_code
          else if (masterTableName === 'tbl_master_modifier_group' && key === 'modifier_group_code') {
            // Master format: MOD1, MOD2, etc.
            // Dashboard format: WM + STORE_CODE + MOD1 (e.g., WMLOC01MOD1)
            const modifierGroupCodeValue = String(value || '');
            const modifierGroupMatch = modifierGroupCodeValue.match(/^(MOD\d+)$/);
            if (modifierGroupMatch) {
              mappedData[mappedKey] = `WM${locationCode}${modifierGroupMatch[1]}`;
            } else {
              mappedData[mappedKey] = value;
            }
          }
          // Handle modifier_item_code
          else if (masterTableName === 'tbl_master_modifier_item' && key === 'modifier_item_code') {
            // Master format: MOI1, MOI2, etc.
            // Dashboard format: WM + STORE_CODE + MOI1 (e.g., WMLOC01MOI1)
            const modifierItemCodeValue = String(value || '');
            const modifierItemMatch = modifierItemCodeValue.match(/^(MOI\d+)$/);
            if (modifierItemMatch) {
              mappedData[mappedKey] = `WM${locationCode}${modifierItemMatch[1]}`;
            } else {
              mappedData[mappedKey] = value;
            }
          }
          else {
            mappedData[mappedKey] = value;
          }
        } else {
          mappedData[mappedKey] = value;
        }
      }
    }

    return mappedData;
  }

  /**
   * Handle INSERT operation
   */
  private async handleInsert(
    tableName: string,
    syncId: string,
    data: Record<string, any>,
    syncSource: string,
    locationCode: string
  ): Promise<void> {
    // Check if record already exists
    const existing = await locationPrisma.$queryRawUnsafe(`
      SELECT sync_id FROM ${tableName}
      WHERE sync_id = '${syncId}'::UUID
        AND store_code = '${locationCode.replace(/'/g, "''")}'::VARCHAR
    `);

    if (existing && (existing as any[]).length > 0) {
      // Record exists, treat as UPDATE instead
      await this.handleUpdate(tableName, syncId, data, syncSource, locationCode);
      return;
    }

    // Insert new record
    const insertData = {
      ...data,
      sync_id: syncId,
      sync_source: syncSource,
    };

    // Build dynamic INSERT query with proper value formatting
    const columns: string[] = [];
    const values: string[] = [];

    for (const [key, value] of Object.entries(insertData)) {
      // Skip undefined values
      if (value === undefined) continue;
      
      // Use double quotes for column names to handle case sensitivity
      columns.push(`"${key}"`);
      
      // Type value as any to handle Prisma Decimal and other complex types
      const val: any = value;
      
      if (val === null) {
        values.push('NULL');
      } else if (typeof val === 'boolean') {
        // Check if this is a boolean column - if so, use PostgreSQL boolean, otherwise convert to int
        if (this.BOOLEAN_COLUMNS.has(key)) {
          values.push(val ? 'true' : 'false');
        } else {
          values.push(val ? '1' : '0');
        }
      } else if (this.BOOLEAN_COLUMNS.has(key)) {
        // Handle boolean columns - convert various formats to boolean
        if (typeof val === 'number') {
          values.push(val ? 'true' : 'false');
        } else if (typeof val === 'string') {
          // Handle string values like "1", "0", "true", "false"
          const boolVal = val === '1' || val.toLowerCase() === 'true';
          values.push(boolVal ? 'true' : 'false');
        } else {
          // Fallback for other types
          values.push(val ? 'true' : 'false');
        }
      } else if (val instanceof Date) {
        values.push(`'${val.toISOString()}'`);
      } else if (typeof val === 'number') {
        // Handle numeric values (including Decimal from Prisma)
        values.push(String(val));
      } else if (Array.isArray(val)) {
        // Handle arrays as JSONB
        values.push(`'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`);
      } else if (typeof val === 'object' && val !== null) {
        // Check if it's a Decimal-like object with toNumber or valueOf method
        if (typeof val.toNumber === 'function') {
          values.push(String(val.toNumber()));
        } else if (typeof val.valueOf === 'function' && typeof val.valueOf() === 'number') {
          values.push(String(val.valueOf()));
        } else if (val.constructor === Object) {
          // Only treat plain objects as JSONB
          values.push(`'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`);
        } else {
          // For other objects, try to convert to string
          values.push(`'${String(val).replace(/'/g, "''")}'`);
        }
      } else if (typeof val === 'string') {
        values.push(`'${val.replace(/'/g, "''")}'`);
      } else {
        values.push(String(val));
      }
    }

    const columnsStr = columns.join(', ');
    const valuesStr = values.join(', ');

    console.log(`Inserting into ${tableName} with columns:`, columns);
    console.log(`Values count:`, values.length);

    try {
      await locationPrisma.$executeRawUnsafe(`
        INSERT INTO ${tableName} (${columnsStr})
        VALUES (${valuesStr})
      `);
    } catch (error: any) {
      console.error(`Failed to insert into ${tableName}:`, error);
      console.error('Columns:', columns);
      console.error('Data keys:', Object.keys(insertData));
      throw error;
    }
  }

  /**
   * Handle UPDATE operation
   */
  private async handleUpdate(
    tableName: string,
    syncId: string,
    data: Record<string, any>,
    syncSource: string,
    locationCode: string
  ): Promise<void> {
    // Check if record exists
    const existing = await locationPrisma.$queryRawUnsafe(`
      SELECT sync_id FROM ${tableName}
      WHERE sync_id = '${syncId}'::UUID
        AND store_code = '${locationCode.replace(/'/g, "''")}'::VARCHAR
    `);

    if (!existing || (existing as any[]).length === 0) {
      // Record doesn't exist, treat as INSERT
      await this.handleInsert(tableName, syncId, data, syncSource, locationCode);
      return;
    }

    // Build UPDATE query with proper value formatting
    const setParts: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      // Skip undefined values
      if (value === undefined) continue;
      
      // Use double quotes for column names to handle case sensitivity
      const quotedKey = `"${key}"`;
      
      // Type value as any to handle Prisma Decimal and other complex types
      const val: any = value;
      
      if (val === null) {
        setParts.push(`${quotedKey} = NULL`);
      } else if (typeof val === 'boolean') {
        // Check if this is a boolean column - if so, use PostgreSQL boolean, otherwise convert to int
        if (this.BOOLEAN_COLUMNS.has(key)) {
          setParts.push(`${quotedKey} = ${val ? 'true' : 'false'}`);
        } else {
          setParts.push(`${quotedKey} = ${val ? '1' : '0'}`);
        }
      } else if (this.BOOLEAN_COLUMNS.has(key)) {
        // Handle boolean columns - convert various formats to boolean
        if (typeof val === 'number') {
          setParts.push(`${quotedKey} = ${val ? 'true' : 'false'}`);
        } else if (typeof val === 'string') {
          // Handle string values like "1", "0", "true", "false"
          const boolVal = val === '1' || val.toLowerCase() === 'true';
          setParts.push(`${quotedKey} = ${boolVal ? 'true' : 'false'}`);
        } else {
          // Fallback for other types
          setParts.push(`${quotedKey} = ${val ? 'true' : 'false'}`);
        }
      } else if (val instanceof Date) {
        setParts.push(`${quotedKey} = '${val.toISOString()}'`);
      } else if (typeof val === 'number') {
        // Handle numeric values (including Decimal from Prisma)
        setParts.push(`${quotedKey} = ${val}`);
      } else if (Array.isArray(val)) {
        // Handle arrays as JSONB
        setParts.push(`${quotedKey} = '${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`);
      } else if (typeof val === 'object' && val !== null) {
        // Check if it's a Decimal-like object with toNumber or valueOf method
        if (typeof val.toNumber === 'function') {
          setParts.push(`${quotedKey} = ${val.toNumber()}`);
        } else if (typeof val.valueOf === 'function' && typeof val.valueOf() === 'number') {
          setParts.push(`${quotedKey} = ${val.valueOf()}`);
        } else if (val.constructor === Object) {
          // Only treat plain objects as JSONB
          setParts.push(`${quotedKey} = '${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`);
        } else {
          // For other objects, try to convert to string
          setParts.push(`${quotedKey} = '${String(val).replace(/'/g, "''")}'`);
        }
      } else if (typeof val === 'string') {
        setParts.push(`${quotedKey} = '${val.replace(/'/g, "''")}'`);
      } else {
        setParts.push(`${quotedKey} = ${val}`);
      }
    }

    // Add sync_source
    setParts.push(`"sync_source" = '${syncSource.replace(/'/g, "''")}'`);

    const setClause = setParts.join(', ');

    try {
      await locationPrisma.$executeRawUnsafe(`
        UPDATE ${tableName}
        SET ${setClause}
        WHERE sync_id = '${syncId}'::UUID
          AND store_code = '${locationCode.replace(/'/g, "''")}'::VARCHAR
      `);
    } catch (error: any) {
      console.error(`Failed to update ${tableName}:`, error);
      console.error('Set parts:', setParts);
      console.error('Data keys:', Object.keys(data));
      throw error;
    }
  }

  /**
   * Handle DELETE operation
   */
  private async handleDelete(
    tableName: string,
    syncId: string,
    locationCode: string
  ): Promise<void> {
    await locationPrisma.$executeRawUnsafe(`
      DELETE FROM ${tableName}
      WHERE sync_id = '${syncId}'::UUID
        AND store_code = '${locationCode.replace(/'/g, "''")}'::VARCHAR
    `);
  }

  /**
   * Mark sync entry as processed
   */
  private async markSyncProcessed(entryId: bigint): Promise<void> {
    await masterPrisma.$executeRawUnsafe(`
      UPDATE sync_log
      SET sync_status = 1,
          synced_at = CURRENT_TIMESTAMP
      WHERE id = ${entryId}
    `);
  }

  /**
   * Mark sync entry as failed
   */
  private async markSyncFailed(entryId: bigint, errorMessage: string): Promise<void> {
    const escapedError = errorMessage.replace(/'/g, "''");
    await masterPrisma.$executeRawUnsafe(`
      UPDATE sync_log
      SET sync_status = 2,
          error_message = '${escapedError}'
      WHERE id = ${entryId}
    `);
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
    const escapedError = errorMessage.replace(/'/g, "''");

    if (newRetryCount <= config.maxRetries) {
      // Calculate retry delay with exponential backoff
      const delay = Math.min(
        config.retryDelay * Math.pow(config.backoffMultiplier, newRetryCount - 1),
        config.maxRetryDelay
      );

      await masterPrisma.$executeRawUnsafe(`
        UPDATE sync_log
        SET retry_count = ${newRetryCount},
            error_message = '${escapedError}',
            last_retry_at = CURRENT_TIMESTAMP,
            sync_status = 0
        WHERE id = ${entry.id}
      `);
    } else {
      // Max retries reached, mark as failed
      await this.markSyncFailed(entry.id, `Max retries reached: ${errorMessage}`);
    }
  }
}

export const syncProcessor = new SyncProcessor();

