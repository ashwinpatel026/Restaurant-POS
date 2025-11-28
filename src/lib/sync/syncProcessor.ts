/**
 * Sync Processor
 * Processes individual sync log entries and applies them to Location DB
 */

import { randomUUID } from 'crypto';
import { locationPrisma, masterPrisma } from '@/lib/databaseManager';
import {
  SyncLogEntry,
  SyncResult,
  SyncError,
  SyncConfig,
  SyncOperation,
  SYNC_TABLE_MAP,
  SYNC_FIELD_MAP,
  SYNC_TABLE_DEPENDENCIES,
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
   * Process a batch for location-to-location sync
   * Transforms codes from source location to target location
   */
  async processLocationToLocationBatch(
    sourceLocationCode: string,
    targetLocationCode: string,
    tableName: string,
    entries: SyncLogEntry[],
    config: SyncConfig,
    cloneMode: 'clone' | 'merge'
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      locationCode: targetLocationCode,
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
        console.log(`Processing location-to-location sync entry: ${entry.recordId}, operation: ${entry.operation}, table: ${tableName}`);
        
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
          continue;
        }

        // Apply location-to-location sync operation with code transformation
        await this.applyLocationToLocationSyncOperation(
          entry,
          locationTableName,
          sourceLocationCode,
          targetLocationCode,
          cloneMode
        );

        console.log(`Successfully synced entry ${entry.recordId} from ${sourceLocationCode} to ${targetLocationCode}`);

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
   * Apply location-to-location sync operation with code transformation
   */
  private async applyLocationToLocationSyncOperation(
    entry: SyncLogEntry,
    locationTableName: string,
    sourceLocationCode: string,
    targetLocationCode: string,
    cloneMode: 'clone' | 'merge'
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

    // Map field names and transform location codes
    const mappedData = this.mapFieldsForLocationToLocation(
      tableName,
      recordData,
      sourceLocationCode,
      targetLocationCode
    );
    
    // Set target store_code
    mappedData.store_code = targetLocationCode;
    
    console.log(`Mapped data for ${tableName} -> ${locationTableName} (${sourceLocationCode} -> ${targetLocationCode}):`, Object.keys(mappedData));

    // For location-to-location sync, validate foreign keys but skip instead of throw
    // Records with missing parents will be skipped (they'll be synced after parents are synced)
    const fkValidationError = await this.validateForeignKeyReferencesSilent(
      tableName,
      locationTableName,
      mappedData,
      targetLocationCode
    );

    if (fkValidationError) {
      // Parent doesn't exist, skip this record
      throw new Error(fkValidationError);
    }

    // Get the primary code field for this table to check for existing records
    const primaryCodeField = this.getPrimaryCodeField(tableName);
    if (!primaryCodeField || !mappedData[primaryCodeField]) {
      throw new Error(`Cannot determine primary code field for table ${tableName}`);
    }

    const primaryCodeValue = mappedData[primaryCodeField];
    const escapedCode = String(primaryCodeValue).replace(/'/g, "''");
    const escapedStoreCode = targetLocationCode.replace(/'/g, "''");

    // Check if record with same code already exists in target location
    const existing = await locationPrisma.$queryRawUnsafe(`
      SELECT sync_id FROM ${locationTableName}
      WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
        AND store_code = '${escapedStoreCode}'::VARCHAR
    `);

    const recordExists = existing && (existing as any[]).length > 0;

    if (cloneMode === 'merge' && recordExists) {
      // In merge mode, skip existing records
      console.log(`Skipping existing record with ${primaryCodeField} = ${primaryCodeValue} in merge mode`);
      return;
    }

    // Generate NEW sync_id for target location (don't reuse source sync_id)
    const newSyncId = randomUUID();

    if (recordExists && cloneMode === 'clone') {
      // In clone mode, update existing record by code
      await this.handleUpdateByCode(
        locationTableName,
        primaryCodeField,
        primaryCodeValue,
        mappedData,
        newSyncId,
        'location',
        targetLocationCode
      );
    } else {
      // Insert new record with new sync_id
      await this.handleInsert(
        locationTableName,
        newSyncId,
        mappedData,
        'location',
        targetLocationCode
      );
    }
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

    // Validate foreign key references before syncing
    await this.validateForeignKeyReferences(tableName, locationTableName, mappedData, locationCode);

    // Get the primary code field for this table to check for existing records by code + store_code
    const primaryCodeField = this.getPrimaryCodeField(tableName);
    let existingRecordSyncId: string | null = null;

    if (primaryCodeField && mappedData[primaryCodeField]) {
      // Check if record with same code already exists for this store_code
      const primaryCodeValue = mappedData[primaryCodeField];
      const escapedCode = String(primaryCodeValue).replace(/'/g, "''");
      const escapedStoreCode = locationCode.replace(/'/g, "''");

      const existing = await locationPrisma.$queryRawUnsafe<any[]>(`
        SELECT sync_id FROM ${locationTableName}
        WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
          AND store_code = '${escapedStoreCode}'::VARCHAR
        LIMIT 1
      `);

      if (existing && existing.length > 0) {
        existingRecordSyncId = existing[0].sync_id;
        console.log(`Found existing record with ${primaryCodeField} = ${primaryCodeValue} for store_code = ${locationCode}, sync_id = ${existingRecordSyncId}`);
      }
    }

    // Use existing sync_id if found, otherwise use the one from master (or generate new if needed)
    const finalSyncId = existingRecordSyncId || recordId;

    switch (operation) {
      case 'INSERT':
        if (existingRecordSyncId) {
          // Record exists by code, update it instead
          await this.handleUpdate(
            locationTableName,
            existingRecordSyncId,
            mappedData,
            parsedData.sync_source || 'server',
            locationCode
          );
        } else {
          // Check if sync_id already exists globally (from another location)
          const syncIdExists = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${locationTableName}
            WHERE sync_id = '${recordId}'::UUID
            LIMIT 1
          `);

          if (syncIdExists && syncIdExists.length > 0) {
            // sync_id exists from another location, generate new one for this location
            const newSyncId = randomUUID();
            console.log(`sync_id ${recordId} already exists, generating new sync_id ${newSyncId} for ${locationCode}`);
            await this.handleInsert(
              locationTableName,
              newSyncId,
              mappedData,
              parsedData.sync_source || 'server',
              locationCode
            );
          } else {
            // sync_id is unique, safe to use
            await this.handleInsert(
              locationTableName,
              recordId,
              mappedData,
              parsedData.sync_source || 'server',
              locationCode
            );
          }
        }
        break;

      case 'UPDATE':
        if (existingRecordSyncId) {
          // Update by existing sync_id
          await this.handleUpdate(
            locationTableName,
            existingRecordSyncId,
            mappedData,
            parsedData.sync_source || 'server',
            locationCode
          );
        } else {
          // Check if sync_id exists for this store_code
          const syncIdForStore = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${locationTableName}
            WHERE sync_id = '${recordId}'::UUID
              AND store_code = '${locationCode.replace(/'/g, "''")}'::VARCHAR
            LIMIT 1
          `);

          if (syncIdForStore && syncIdForStore.length > 0) {
            // Update existing record
            await this.handleUpdate(
              locationTableName,
              recordId,
              mappedData,
              parsedData.sync_source || 'server',
              locationCode
            );
          } else {
            // sync_id doesn't exist for this store_code, check if it exists globally
            const syncIdExists = await locationPrisma.$queryRawUnsafe<any[]>(`
              SELECT sync_id FROM ${locationTableName}
              WHERE sync_id = '${recordId}'::UUID
              LIMIT 1
            `);

            if (syncIdExists && syncIdExists.length > 0) {
              // sync_id exists from another location, insert as new record with new sync_id
              const newSyncId = randomUUID();
              console.log(`sync_id ${recordId} exists in another location, inserting as new record with sync_id ${newSyncId} for ${locationCode}`);
              await this.handleInsert(
                locationTableName,
                newSyncId,
                mappedData,
                parsedData.sync_source || 'server',
                locationCode
              );
            } else {
              // sync_id doesn't exist at all, insert as new
              await this.handleInsert(
                locationTableName,
                recordId,
                mappedData,
                parsedData.sync_source || 'server',
                locationCode
              );
            }
          }
        }
        break;

      case 'DELETE':
        // For DELETE, find record by code + store_code if sync_id doesn't match
        if (primaryCodeField && mappedData[primaryCodeField]) {
          const primaryCodeValue = mappedData[primaryCodeField];
          const escapedCode = String(primaryCodeValue).replace(/'/g, "''");
          const escapedStoreCode = locationCode.replace(/'/g, "''");

          const recordToDelete = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${locationTableName}
            WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
              AND store_code = '${escapedStoreCode}'::VARCHAR
            LIMIT 1
          `);

          if (recordToDelete && recordToDelete.length > 0) {
            await this.handleDelete(locationTableName, recordToDelete[0].sync_id, locationCode);
          }
        } else {
          await this.handleDelete(locationTableName, recordId, locationCode);
        }
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Transform location codes from source location to target location
   * Example: WMLOC001TAX1 -> WMLOC002TAX1
   */
  private transformLocationCode(code: string, sourceLocationCode: string, targetLocationCode: string): string {
    if (!code || typeof code !== 'string') {
      return code;
    }

    // Pattern: WM + LOCATION_CODE + CODE (e.g., WMLOC001TAX1)
    const sourcePrefix = `WM${sourceLocationCode}`;
    const targetPrefix = `WM${targetLocationCode}`;

    // If code starts with source prefix, replace with target prefix
    if (code.startsWith(sourcePrefix)) {
      return code.replace(sourcePrefix, targetPrefix);
    }

    // If code is in master format (e.g., TAX1, MOD1), transform to target format
    const masterPatterns = [
      { pattern: /^(TAX\d+)$/, prefix: targetPrefix },
      { pattern: /^(PRT\d+)$/, prefix: targetPrefix },
      { pattern: /^(STA\d+)$/, prefix: targetPrefix },
      { pattern: /^(TE\d+)$/, prefix: targetPrefix },
      { pattern: /^(PZ\d+)$/, prefix: targetPrefix },
      { pattern: /^(MM\d+)$/, prefix: targetPrefix },
      { pattern: /^(MC\d+)$/, prefix: targetPrefix },
      { pattern: /^(MI\d+)$/, prefix: targetPrefix },
      { pattern: /^(MOD\d+)$/, prefix: targetPrefix },
      { pattern: /^(MOI\d+)$/, prefix: targetPrefix },
    ];

    for (const { pattern, prefix } of masterPatterns) {
      const match = code.match(pattern);
      if (match) {
        return `${prefix}${match[1]}`;
      }
    }

    // Return as-is if no transformation needed
    return code;
  }

  /**
   * Map fields for location-to-location sync with code transformation
   */
  private mapFieldsForLocationToLocation(
    masterTableName: string,
    data: Record<string, any>,
    sourceLocationCode: string,
    targetLocationCode: string
  ): Record<string, any> {
    const fieldMap = SYNC_FIELD_MAP[masterTableName];
    if (!fieldMap) {
      console.warn(`No sync field map defined for table ${masterTableName}, skipping all fields`);
      return {};
    }

    const mappedData: Record<string, any> = {};

    // Normalize all keys to lowercase
    const normalizedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      normalizedData[key.toLowerCase()] = value;
    }

    for (const [key, value] of Object.entries(normalizedData)) {
      // Skip sync fields
      if (key === 'sync_id' || key === 'sync_source') {
        continue;
      }

      // Skip ID fields
      if (key === 'tbl_tax_id' || key === 'printer_id' || key === 'prep_zone_id' ||
          key === 'menu_master_id' || key === 'menu_category_id' || key === 'menu_item_id' ||
          key === 'tbl_station_id' || key === 'id') {
        continue;
      }

      // Skip audit fields
      if (key === 'created_date' || key === 'created_on' || key === 'createdon' ||
          key === 'updated_on' || key === 'updatedon' ||
          key === 'created_by' || key === 'createdby' ||
          key === 'updated_by' || key === 'updatedby') {
        continue;
      }

      // Skip store-specific fields (we'll set store_code from targetLocationCode)
      if (key === 'store_code' || key === 'storecode' ||
          key === 'is_sync_to_web' || key === 'is_sync_to_local') {
        continue;
      }

      // Find mapped key
      let mappedKey = fieldMap[key];
      if (!mappedKey) {
        for (const [mapKey, mapValue] of Object.entries(fieldMap)) {
          if (mapKey.toLowerCase() === key) {
            mappedKey = mapValue;
            break;
          }
        }
      }

      if (mappedKey) {
        // Transform code fields from source location to target location
        const codeFields = [
          'tax_code', 'printer_code', 'backup_printer_code', 'station_code',
          'event_code', 'prep_zone_code', 'menu_master_code', 'menu_category_code',
          'menu_item_code', 'modifier_group_code', 'modifier_item_code'
        ];

        // Check if this is a code field (case-insensitive check)
        const isCodeField = codeFields.some(cf => cf.toLowerCase() === key.toLowerCase()) ||
                           key.toLowerCase() === 'event_code'; // Handle Event_code (case-sensitive in DB)

        if (isCodeField) {
          // Handle arrays (JSON fields)
          if (Array.isArray(value)) {
            mappedData[mappedKey] = value.map((v: any) => 
              this.transformLocationCode(String(v || ''), sourceLocationCode, targetLocationCode)
            );
          } else {
            mappedData[mappedKey] = this.transformLocationCode(
              String(value || ''),
              sourceLocationCode,
              targetLocationCode
            );
          }
        } else {
          // For non-code fields, copy as-is
          mappedData[mappedKey] = value;
        }
      }
    }

    return mappedData;
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
        // Transform based on FIELD NAME, not table name, so foreign keys are also transformed
        if (locationCode) {
          // Transform station_code (in any table) - check for arrays FIRST
          if (key === 'station_code') {
            // Handle JSON arrays (e.g., in tbl_master_menu_master)
            if (Array.isArray(value)) {
              mappedData[mappedKey] = value.map((v: any) => {
                const stationCodeValue = String(v || '');
                const stationMatch = stationCodeValue.match(/^(STA\d+)$/);
                return stationMatch ? `WM${locationCode}${stationMatch[1]}` : v;
              });
            } else {
              const codeValue = String(value || '');
              const stationMatch = codeValue.match(/^(STA\d+)$/);
              if (stationMatch) {
                mappedData[mappedKey] = `WM${locationCode}${stationMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
          }
          // Transform prep_zone_code (in any table) - check for arrays FIRST
          else if (key === 'prep_zone_code') {
            // Handle JSON arrays
            if (Array.isArray(value)) {
              mappedData[mappedKey] = value.map((v: any) => {
                const prepZoneCodeValue = String(v || '');
                const prepZoneMatch = prepZoneCodeValue.match(/^(PZ\d+)$/);
                return prepZoneMatch ? `WM${locationCode}${prepZoneMatch[1]}` : v;
              });
            } else {
              const codeValue = String(value || '');
              const prepZoneMatch = codeValue.match(/^(PZ\d+)$/);
              if (prepZoneMatch) {
                mappedData[mappedKey] = `WM${locationCode}${prepZoneMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
          }
          // Transform menu_category_code (in any table, including foreign keys) - check for arrays FIRST
          else if (key === 'menu_category_code') {
            // Handle JSON arrays
            if (Array.isArray(value)) {
              mappedData[mappedKey] = value.map((v: any) => {
                const menuCategoryCodeValue = String(v || '');
                const menuCategoryMatch = menuCategoryCodeValue.match(/^(MC\d+)$/);
                return menuCategoryMatch ? `WM${locationCode}${menuCategoryMatch[1]}` : v;
              });
            } else {
              const codeValue = String(value || '');
              const menuCategoryMatch = codeValue.match(/^(MC\d+)$/);
              if (menuCategoryMatch) {
                mappedData[mappedKey] = `WM${locationCode}${menuCategoryMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
          }
          // For other code fields, convert to string first
          else {
            const codeValue = String(value || '');
            
            // Transform tax_code (in any table)
            if (key === 'tax_code') {
              const taxMatch = codeValue.match(/^(TAX\d+)$/);
              if (taxMatch) {
                mappedData[mappedKey] = `WM${locationCode}${taxMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
            // Transform printer_code (in any table, including backup_printer_code)
            else if (key === 'printer_code' || key === 'backup_printer_code') {
              const printerMatch = codeValue.match(/^(PRT\d+)$/);
              if (printerMatch) {
                mappedData[mappedKey] = `WM${locationCode}${printerMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
            // Transform Event_code (time events) - key is normalized to lowercase
            else if (key === 'event_code') {
              const eventMatch = codeValue.match(/^(TE\d+)$/);
              if (eventMatch) {
                mappedData[mappedKey] = `WM${locationCode}${eventMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
            // Transform menu_master_code (in any table, including foreign keys)
            else if (key === 'menu_master_code') {
              const menuMasterMatch = codeValue.match(/^(MM\d+)$/);
              if (menuMasterMatch) {
                mappedData[mappedKey] = `WM${locationCode}${menuMasterMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
            // Transform menu_item_code (in any table)
            else if (key === 'menu_item_code') {
              const menuItemMatch = codeValue.match(/^(MI\d+)$/);
              if (menuItemMatch) {
                mappedData[mappedKey] = `WM${locationCode}${menuItemMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
            // Transform modifier_group_code (in any table, including foreign keys)
            else if (key === 'modifier_group_code') {
              const modifierGroupMatch = codeValue.match(/^(MOD\d+)$/);
              if (modifierGroupMatch) {
                mappedData[mappedKey] = `WM${locationCode}${modifierGroupMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
            // Transform modifier_item_code (in any table)
            else if (key === 'modifier_item_code') {
              const modifierItemMatch = codeValue.match(/^(MOI\d+)$/);
              if (modifierItemMatch) {
                mappedData[mappedKey] = `WM${locationCode}${modifierItemMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
            else {
              mappedData[mappedKey] = value;
            }
          }
        } else {
          mappedData[mappedKey] = value;
        }
      }
    }

    return mappedData;
  }

  /**
   * Validate foreign key references silently (returns error message instead of throwing)
   * Used for location-to-location sync where we want to skip records instead of failing
   */
  private async validateForeignKeyReferencesSilent(
    masterTableName: string,
    locationTableName: string,
    mappedData: Record<string, any>,
    locationCode: string
  ): Promise<string | null> {
    const dependencies = SYNC_TABLE_DEPENDENCIES[masterTableName];
    if (!dependencies || dependencies.length === 0) {
      return null; // No dependencies to validate
    }

    // Check each dependency
    for (const parentTable of dependencies) {
      const parentLocationTable = SYNC_TABLE_MAP[parentTable];
      if (!parentLocationTable) {
        continue;
      }

      // Determine which field to check based on the parent table
      let foreignKeyField: string | null = null;
      let foreignKeyValue: any = null;

      if (parentTable === 'tbl_master_menu_master') {
        foreignKeyField = 'menu_master_code';
        foreignKeyValue = mappedData.menu_master_code;
      } else if (parentTable === 'tbl_master_menu_category') {
        foreignKeyField = 'menu_category_code';
        foreignKeyValue = mappedData.menu_category_code;
      } else if (parentTable === 'tbl_master_menu_item') {
        foreignKeyField = 'menu_item_code';
        foreignKeyValue = mappedData.menu_item_code;
      } else if (parentTable === 'tbl_master_modifier_group') {
        foreignKeyField = 'modifier_group_code';
        foreignKeyValue = mappedData.modifier_group_code;
      } else if (parentTable === 'tbl_master_station') {
        foreignKeyField = 'station_code';
        foreignKeyValue = mappedData.station_code;
      } else if (parentTable === 'tbl_master_printer') {
        foreignKeyField = 'printer_code';
        foreignKeyValue = mappedData.printer_code || mappedData.backup_printer_code;
      } else if (parentTable === 'tbl_master_time_events') {
        foreignKeyField = 'Event_code';
        foreignKeyValue = mappedData.event_code;
      }

      if (!foreignKeyField || !foreignKeyValue) {
        continue;
      }

      // Check if parent record exists in location database
      const valuesToCheck = Array.isArray(foreignKeyValue) 
        ? foreignKeyValue 
        : [foreignKeyValue];

      for (const value of valuesToCheck) {
        if (!value) continue;

        const escapedValue = String(value).replace(/'/g, "''");
        const escapedLocationCode = locationCode.replace(/'/g, "''");

        const parentExists = await locationPrisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
          SELECT COUNT(*) as count
          FROM ${parentLocationTable}
          WHERE "${foreignKeyField}" = '${escapedValue}'::VARCHAR
            AND store_code = '${escapedLocationCode}'::VARCHAR
        `);

        const count = parentExists[0]?.count || BigInt(0);
        if (count === BigInt(0)) {
          return `Parent record not found: ${parentLocationTable}.${foreignKeyField} = '${value}' for store_code = '${locationCode}'. Parent table ${parentTable} must be synced before ${masterTableName}.`;
        }
      }
    }

    return null; // All validations passed
  }

  /**
   * Validate foreign key references before syncing
   * Ensures parent records exist in location database
   */
  private async validateForeignKeyReferences(
    masterTableName: string,
    locationTableName: string,
    mappedData: Record<string, any>,
    locationCode: string
  ): Promise<void> {
    const dependencies = SYNC_TABLE_DEPENDENCIES[masterTableName];
    if (!dependencies || dependencies.length === 0) {
      return; // No dependencies to validate
    }

    // Check each dependency
    for (const parentTable of dependencies) {
      const parentLocationTable = SYNC_TABLE_MAP[parentTable];
      if (!parentLocationTable) {
        console.warn(`No location table mapping for parent table ${parentTable}`);
        continue;
      }

      // Determine which field to check based on the parent table
      let foreignKeyField: string | null = null;
      let foreignKeyValue: any = null;

      if (parentTable === 'tbl_master_menu_master') {
        foreignKeyField = 'menu_master_code';
        foreignKeyValue = mappedData.menu_master_code;
      } else if (parentTable === 'tbl_master_menu_category') {
        foreignKeyField = 'menu_category_code';
        foreignKeyValue = mappedData.menu_category_code;
      } else if (parentTable === 'tbl_master_menu_item') {
        foreignKeyField = 'menu_item_code';
        foreignKeyValue = mappedData.menu_item_code;
      } else if (parentTable === 'tbl_master_modifier_group') {
        foreignKeyField = 'modifier_group_code';
        foreignKeyValue = mappedData.modifier_group_code;
      } else if (parentTable === 'tbl_master_station') {
        foreignKeyField = 'station_code';
        foreignKeyValue = mappedData.station_code;
      } else if (parentTable === 'tbl_master_printer') {
        foreignKeyField = 'printer_code';
        foreignKeyValue = mappedData.printer_code || mappedData.backup_printer_code;
      } else if (parentTable === 'tbl_master_time_events') {
        foreignKeyField = 'Event_code';
        foreignKeyValue = mappedData.event_code;
      }

      if (!foreignKeyField || !foreignKeyValue) {
        // Skip if the foreign key field is not present (might be optional)
        continue;
      }

      // Check if parent record exists in location database
      // Handle both single values and arrays (for JSON fields)
      const valuesToCheck = Array.isArray(foreignKeyValue) 
        ? foreignKeyValue 
        : [foreignKeyValue];

      for (const value of valuesToCheck) {
        if (!value) continue; // Skip null/undefined values

        const escapedValue = String(value).replace(/'/g, "''");
        const escapedLocationCode = locationCode.replace(/'/g, "''");

        const parentExists = await locationPrisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
          SELECT COUNT(*) as count
          FROM ${parentLocationTable}
          WHERE "${foreignKeyField}" = '${escapedValue}'::VARCHAR
            AND store_code = '${escapedLocationCode}'::VARCHAR
        `);

        const count = parentExists[0]?.count || BigInt(0);
        if (count === BigInt(0)) {
          const errorMsg = 
            `Parent record not found: ${parentLocationTable}.${foreignKeyField} = '${value}' ` +
            `for store_code = '${locationCode}'. ` +
            `Parent table ${parentTable} must be synced before ${masterTableName}. ` +
            `Skipping this record - it will be retried after parent is synced.`;
          
          console.warn(errorMsg);
          throw new Error(errorMsg);
        }
      }
    }
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
    // Check if record already exists for this store_code
    const existing = await locationPrisma.$queryRawUnsafe(`
      SELECT sync_id FROM ${tableName}
      WHERE sync_id = '${syncId}'::UUID
        AND store_code = '${locationCode.replace(/'/g, "''")}'::VARCHAR
    `);

    if (existing && (existing as any[]).length > 0) {
      // Record exists for this store_code, treat as UPDATE instead
      await this.handleUpdate(tableName, syncId, data, syncSource, locationCode);
      return;
    }

    // Check if sync_id exists globally (from another location)
    // If so, we should have already generated a new sync_id before calling this method
    // But as a safety check, verify sync_id is unique
    const globalCheck = await locationPrisma.$queryRawUnsafe(`
      SELECT sync_id FROM ${tableName}
      WHERE sync_id = '${syncId}'::UUID
      LIMIT 1
    `);

    if (globalCheck && (globalCheck as any[]).length > 0) {
      // sync_id already exists globally - this shouldn't happen if called correctly
      // but if it does, generate a new one
      console.warn(`sync_id ${syncId} already exists globally, generating new sync_id for ${locationCode}`);
      const newSyncId = randomUUID();
      // Recursively call with new sync_id (but only once to avoid infinite loop)
      if (syncId !== newSyncId) {
        return this.handleInsert(tableName, newSyncId, data, syncSource, locationCode);
      }
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

  /**
   * Handle UPSERT operation (INSERT ... ON CONFLICT DO UPDATE)
   * Used for location-to-location sync to handle sync_id conflicts
   */
  private async handleUpsert(
    tableName: string,
    syncId: string,
    data: Record<string, any>,
    syncSource: string,
    locationCode: string,
    cloneMode: 'clone' | 'merge'
  ): Promise<void> {
    // Prepare data with sync fields
    const insertData = {
      ...data,
      sync_id: syncId,
      sync_source: syncSource,
    };

    // Build dynamic INSERT query with proper value formatting
    const columns: string[] = [];
    const values: string[] = [];
    const updateParts: string[] = [];

    for (const [key, value] of Object.entries(insertData)) {
      // Skip undefined values
      if (value === undefined) continue;
      
      // Use double quotes for column names to handle case sensitivity
      const quotedKey = `"${key}"`;
      columns.push(quotedKey);
      
      // Type value as any to handle Prisma Decimal and other complex types
      const val: any = value;
      
      let valueStr: string;
      if (val === null) {
        valueStr = 'NULL';
      } else if (typeof val === 'boolean') {
        if (this.BOOLEAN_COLUMNS.has(key)) {
          valueStr = val ? 'true' : 'false';
        } else {
          valueStr = val ? '1' : '0';
        }
      } else if (this.BOOLEAN_COLUMNS.has(key)) {
        if (typeof val === 'number') {
          valueStr = val ? 'true' : 'false';
        } else if (typeof val === 'string') {
          const boolVal = val === '1' || val.toLowerCase() === 'true';
          valueStr = boolVal ? 'true' : 'false';
        } else {
          valueStr = val ? 'true' : 'false';
        }
      } else if (val instanceof Date) {
        valueStr = `'${val.toISOString()}'`;
      } else if (typeof val === 'number') {
        valueStr = String(val);
      } else if (Array.isArray(val)) {
        valueStr = `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
      } else if (typeof val === 'object' && val !== null) {
        if (typeof val.toNumber === 'function') {
          valueStr = String(val.toNumber());
        } else if (typeof val.valueOf === 'function' && typeof val.valueOf() === 'number') {
          valueStr = String(val.valueOf());
        } else if (val.constructor === Object) {
          valueStr = `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
        } else {
          valueStr = `'${String(val).replace(/'/g, "''")}'`;
        }
      } else if (typeof val === 'string') {
        valueStr = `'${val.replace(/'/g, "''")}'`;
      } else {
        valueStr = String(val);
      }

      values.push(valueStr);

      // For UPDATE part, exclude sync_id (it's the conflict key)
      if (key !== 'sync_id') {
        updateParts.push(`${quotedKey} = EXCLUDED.${quotedKey}`);
      }
    }

    const columnsStr = columns.join(', ');
    const valuesStr = values.join(', ');
    const updateClause = updateParts.join(', ');

    try {
      // Use INSERT ... ON CONFLICT DO UPDATE (UPSERT)
      // sync_id is unique globally, so conflict is on sync_id only
      await locationPrisma.$executeRawUnsafe(`
        INSERT INTO ${tableName} (${columnsStr})
        VALUES (${valuesStr})
        ON CONFLICT (sync_id) DO UPDATE
        SET ${updateClause}
      `);
    } catch (error: any) {
      console.error(`Failed to upsert ${tableName}:`, error);
      console.error('Columns:', columns);
      console.error('Values count:', values.length);
      console.error('Update clause:', updateClause);
      throw error;
    }
  }

  /**
   * Get the primary unique code field for a table
   * Used to check for existing records by code instead of sync_id
   */
  private getPrimaryCodeField(tableName: string): string | null {
    const codeFieldMap: Record<string, string> = {
      'tbl_master_tax': 'tax_code',
      'tbl_master_printer': 'printer_code',
      'tbl_master_station': 'station_code',
      'tbl_master_prep_zone': 'prep_zone_code',
      'tbl_master_menu_master': 'menu_master_code',
      'tbl_master_menu_category': 'menu_category_code',
      'tbl_master_menu_item': 'menu_item_code',
      'tbl_master_modifier_group': 'modifier_group_code',
      'tbl_master_modifier_item': 'modifier_item_code',
      'tbl_master_time_events': 'Event_code',
      // Relationship tables - use composite keys or first code field
      'tbl_master_menu_master_event': 'menu_master_code', // Composite: menu_master_code + event_code
      'tbl_master_menu_category_modifier': 'menu_category_code', // Composite: menu_category_code + modifier_group_code
      'tbl_master_menu_item_modifier_group': 'menu_item_code', // Composite: menu_item_code + modifier_group_code
    };

    return codeFieldMap[tableName] || null;
  }

  /**
   * Handle UPDATE operation by code (not by sync_id)
   * Used for location-to-location clone sync when record already exists
   */
  private async handleUpdateByCode(
    tableName: string,
    codeField: string,
    codeValue: any,
    data: Record<string, any>,
    newSyncId: string,
    syncSource: string,
    locationCode: string
  ): Promise<void> {
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
        if (this.BOOLEAN_COLUMNS.has(key)) {
          setParts.push(`${quotedKey} = ${val ? 'true' : 'false'}`);
        } else {
          setParts.push(`${quotedKey} = ${val ? '1' : '0'}`);
        }
      } else if (this.BOOLEAN_COLUMNS.has(key)) {
        if (typeof val === 'number') {
          setParts.push(`${quotedKey} = ${val ? 'true' : 'false'}`);
        } else if (typeof val === 'string') {
          const boolVal = val === '1' || val.toLowerCase() === 'true';
          setParts.push(`${quotedKey} = ${boolVal ? 'true' : 'false'}`);
        } else {
          setParts.push(`${quotedKey} = ${val ? 'true' : 'false'}`);
        }
      } else if (val instanceof Date) {
        setParts.push(`${quotedKey} = '${val.toISOString()}'`);
      } else if (typeof val === 'number') {
        setParts.push(`${quotedKey} = ${val}`);
      } else if (Array.isArray(val)) {
        setParts.push(`${quotedKey} = '${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`);
      } else if (typeof val === 'object' && val !== null) {
        if (typeof val.toNumber === 'function') {
          setParts.push(`${quotedKey} = ${val.toNumber()}`);
        } else if (typeof val.valueOf === 'function' && typeof val.valueOf() === 'number') {
          setParts.push(`${quotedKey} = ${val.valueOf()}`);
        } else if (val.constructor === Object) {
          setParts.push(`${quotedKey} = '${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`);
        } else {
          setParts.push(`${quotedKey} = '${String(val).replace(/'/g, "''")}'`);
        }
      } else if (typeof val === 'string') {
        setParts.push(`${quotedKey} = '${val.replace(/'/g, "''")}'`);
      } else {
        setParts.push(`${quotedKey} = ${val}`);
      }
    }

    // Update sync_id and sync_source
    setParts.push(`"sync_id" = '${newSyncId}'`);
    setParts.push(`"sync_source" = '${syncSource.replace(/'/g, "''")}'`);

    const setClause = setParts.join(', ');
    const escapedCode = String(codeValue).replace(/'/g, "''");
    const escapedLocationCode = locationCode.replace(/'/g, "''");

    try {
      await locationPrisma.$executeRawUnsafe(`
        UPDATE ${tableName}
        SET ${setClause}
        WHERE "${codeField}" = '${escapedCode}'::VARCHAR
          AND store_code = '${escapedLocationCode}'::VARCHAR
      `);
    } catch (error: any) {
      console.error(`Failed to update ${tableName} by ${codeField}:`, error);
      console.error('Set parts:', setParts);
      throw error;
    }
  }
}

export const syncProcessor = new SyncProcessor();

