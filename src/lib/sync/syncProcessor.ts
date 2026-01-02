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
  // Tables that are global (not store-specific) - don't use store_code
  // These tables are synced once per location database, not per store_code
  private readonly GLOBAL_TABLES = new Set([
    'permissions',      // Location table name
    'tbl_permission',   // Master table name
    'roles',            // Location table name
    'tbl_role',         // Master table name
    'role_permissions', // Location table name
    'tbl_role_permission', // Master table name
  ]);

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
    'isreceipt',    // Printer receipt type (boolean)
    'isdocument',   // Printer document type (boolean)
    'isActive',     // Location database users table column (camelCase)
  ]);

  // Table-specific boolean columns (columns that are boolean in some tables, integer in others)
  // Note: Use location table names here (as that's what handleInsert/handleUpdate receive)
  private readonly TABLE_BOOLEAN_COLUMNS: Record<string, Set<string>> = {
    'permissions': new Set(['is_active']),  // Location table name
    'tbl_permission': new Set(['is_active']),  // Master table name (for reverse lookup)
    'roles': new Set(['is_active', 'is_system_role']),  // Location table name
    'tbl_role': new Set(['is_active', 'is_system_role']),  // Master table name (for reverse lookup)
    'tbl_printer': new Set(['isreceipt', 'isdocument', 'is_kitchen']),  // Location table name
    'tbl_master_printer': new Set(['isreceipt', 'isdocument', 'is_kitchen']),  // Master table name (for reverse lookup)
  };

  // Table-specific integer columns (columns that are integer in some tables)
  private readonly TABLE_INTEGER_COLUMNS: Record<string, Set<string>> = {
    'tbl_modifier_item': new Set(['is_default']), // is_default is integer in modifier_item
  };

  // List of integer columns that might come as boolean but should be converted to integer
  // These columns are integers in the database but might be stored/read as boolean
  // Note: is_active is NOT here for tbl_permission and tbl_role (they use boolean)
  private readonly INTEGER_COLUMNS = new Set([
    'is_required',
    'is_multiselect',
    'is_sync_to_web',
    'is_sync_to_local',
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
    
    // Set target store_code (skip for users table and global tables - they don't use store_code)
    const isGlobalTable = this.GLOBAL_TABLES.has(tableName) || this.GLOBAL_TABLES.has(locationTableName);
    if (locationTableName !== 'users' && !isGlobalTable) {
      mappedData.store_code = targetLocationCode;
    }
    
    console.log(`Mapped data for ${tableName} -> ${locationTableName} (${sourceLocationCode} -> ${targetLocationCode}):`, Object.keys(mappedData));

    // For location-to-location clone sync, SKIP foreign key validation
    // We're cloning data from one location to another - parent records should already exist
    // or will be created as part of the sync process. Don't block on FK validation.
    // Note: This allows cloning even if parent records don't exist yet (they'll be synced in order)

    // Special handling for different table types:
    // 1. User tables: check by email (no store_code)
    // 2. Global tables: check by code only (no store_code)
    // 3. Other tables: check by code + store_code
    const isUserTable = tableName === 'tbl_user';
    let existing;
    
    if (isUserTable && tableName === 'tbl_user') {
      // For users table, check by email (since it's the unique identifier)
      // Users table doesn't have store_code column
      const escapedEmail = String(mappedData.email || '').replace(/'/g, "''");
      existing = await locationPrisma.$queryRawUnsafe(`
        SELECT sync_id FROM ${locationTableName}
        WHERE email = '${escapedEmail}'::VARCHAR
      `);
    } else if (isGlobalTable) {
      // For global tables (permissions, roles, role_permissions), check by code only (no store_code)
      const primaryCodeField = this.getPrimaryCodeField(tableName);
      if (!primaryCodeField || !mappedData[primaryCodeField]) {
        throw new Error(`Cannot determine primary code field for table ${tableName}`);
      }

      const primaryCodeValue = mappedData[primaryCodeField];
      const escapedCode = String(primaryCodeValue).replace(/'/g, "''");

      // For role_permissions, check by composite key (role_code + permission_code)
      if (locationTableName === 'role_permissions' && mappedData.role_code && mappedData.permission_code) {
        const escapedRoleCode = String(mappedData.role_code).replace(/'/g, "''");
        const escapedPermissionCode = String(mappedData.permission_code).replace(/'/g, "''");
        
        existing = await locationPrisma.$queryRawUnsafe(`
          SELECT sync_id FROM ${locationTableName}
          WHERE "role_code" = '${escapedRoleCode}'::VARCHAR
            AND "permission_code" = '${escapedPermissionCode}'::VARCHAR
        `);
      } else {
        // For permissions and roles, check by code only
        existing = await locationPrisma.$queryRawUnsafe(`
          SELECT sync_id FROM ${locationTableName}
          WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
        `);
      }
    } else {
      // For other tables, get the primary code field and check by code and store_code
      const primaryCodeField = this.getPrimaryCodeField(tableName);
      if (!primaryCodeField || !mappedData[primaryCodeField]) {
        throw new Error(`Cannot determine primary code field for table ${tableName}`);
      }

      const primaryCodeValue = mappedData[primaryCodeField];
      const escapedCode = String(primaryCodeValue).replace(/'/g, "''");
      const escapedStoreCode = targetLocationCode.replace(/'/g, "''");

      existing = await locationPrisma.$queryRawUnsafe(`
        SELECT sync_id FROM ${locationTableName}
        WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
          AND store_code = '${escapedStoreCode}'::VARCHAR
      `);
    }

    const recordExists = existing && (existing as any[]).length > 0;

    if (cloneMode === 'merge' && recordExists) {
      // In merge mode, skip existing records
      console.log(`Skipping existing record in merge mode for table ${tableName}`);
      return;
    }

    // Generate NEW sync_id for target location (don't reuse source sync_id)
    const newSyncId = randomUUID();

    // For location-to-location clone sync, use UPSERT (INSERT ... ON CONFLICT DO UPDATE)
    // This handles both insert and update automatically without checking master database
    if (cloneMode === 'clone') {
      // Use UPSERT based on unique constraint (code + store_code for most tables, email for users)
      await this.handleLocationToLocationUpsert(
        locationTableName,
        tableName,
        mappedData,
        newSyncId,
        'location',
        targetLocationCode,
        isUserTable
      );
    } else {
      // Merge mode: only insert if doesn't exist
      if (!recordExists) {
        await this.handleInsert(
          locationTableName,
          newSyncId,
          mappedData,
          'location',
          targetLocationCode
        );
      }
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

    // Special handling: role_permissions bulk update (single entry with full permission set)
    if (
      tableName === 'tbl_role_permission' &&
      Array.isArray((parsedData as any)?.permissions)
    ) {
      const roleCode = (parsedData as any)?.role_code;
      const permissions: string[] = (parsedData as any)?.permissions || [];
      const syncSource = (parsedData as any)?.sync_source || 'server';

      if (!roleCode) {
        throw new Error('role_code missing in tbl_role_permission sync payload');
      }

      const escape = (val: string) => String(val).replace(/'/g, "''");
      const escapedRole = escape(roleCode);

      await locationPrisma.$transaction(async tx => {
        // Replace the entire permission set for this role
        await tx.$executeRawUnsafe(
          `DELETE FROM ${locationTableName} WHERE "role_code" = '${escapedRole}'::VARCHAR`
        );

        if (permissions.length > 0) {
          const values = permissions
            .map(code => {
              const escapedPerm = escape(code);
              const newSyncId = randomUUID();
              return `('${escapedRole}'::VARCHAR, '${escapedPerm}'::VARCHAR, '${newSyncId}'::UUID, '${escape(syncSource)}')`;
            })
            .join(', ');

          await tx.$executeRawUnsafe(`
            INSERT INTO ${locationTableName} ("role_code", "permission_code", "sync_id", "sync_source")
            VALUES ${values}
            ON CONFLICT ("role_code", "permission_code") DO UPDATE SET
              "sync_id" = EXCLUDED."sync_id",
              "sync_source" = EXCLUDED."sync_source"
          `);
        }
      });

      // Nothing else to do for this entry
      return;
    }

    // Filter out sync fields from data (we'll set them separately)
    const { sync_id, sync_source, ...recordData } = parsedData;

    // Map field names from master table to location table
    const mappedData = this.mapFieldsToLocationTable(tableName, recordData, locationCode);
    
    // Add store_code from locationCode (most location tables have store_code column)
    // Exceptions: 
    // - users table doesn't have store_code
    // - Global tables (permissions, roles, role_permissions) don't use store_code
    const isGlobalTable = this.GLOBAL_TABLES.has(tableName) || this.GLOBAL_TABLES.has(locationTableName);
    if (locationTableName !== 'users' && !isGlobalTable) {
      mappedData.store_code = locationCode;
    }
    
    console.log(`Mapped data for ${tableName} -> ${locationTableName}:`, Object.keys(mappedData));

    // Validate foreign key references before syncing (skip for global tables as they're synced in order)
    if (!isGlobalTable) {
      await this.validateForeignKeyReferences(tableName, locationTableName, mappedData, locationCode);
    }

    // Special handling for different table types:
    // 1. User tables: sync by sync_id only (no code + store_code check)
    // 2. Global tables (permissions, roles, role_permissions): sync by code only (no store_code)
    // 3. Other tables: sync by code + store_code
    const isUserTable = tableName === 'tbl_user';
    let existingRecordSyncId: string | null = null;
    
    // Get primary code field for use in DELETE case and other operations
    const primaryCodeField = this.getPrimaryCodeField(tableName);

    if (isUserTable) {
      // For user tables, check by sync_id only (not by code + store_code)
      // This allows multiple users per location, each with unique sync_id
      const existing = await locationPrisma.$queryRawUnsafe<any[]>(`
        SELECT sync_id FROM ${locationTableName}
        WHERE sync_id = '${recordId}'::UUID
        LIMIT 1
      `);

      if (existing && existing.length > 0) {
        existingRecordSyncId = existing[0].sync_id;
        console.log(`Found existing record by sync_id = ${recordId} for ${locationTableName}`);
      }
    } else if (isGlobalTable) {
      // For global tables (permissions, roles, role_permissions), check by code only (no store_code)
      // These tables are synced once per location database, not per store
      // Try both master and location table names for getPrimaryCodeField
      const codeFieldForMaster = this.getPrimaryCodeField(tableName);
      const codeFieldForLocation = this.getPrimaryCodeField(locationTableName);
      const primaryCodeField = codeFieldForLocation || codeFieldForMaster;
      
      console.log(`[applySyncOperation] Global table check: tableName=${tableName}, locationTableName=${locationTableName}, primaryCodeField=${primaryCodeField}, mappedData keys:`, Object.keys(mappedData));
      
      if (primaryCodeField && mappedData[primaryCodeField]) {
        const primaryCodeValue = mappedData[primaryCodeField];
        const escapedCode = String(primaryCodeValue).replace(/'/g, "''");

        // For role_permissions, check by composite key (role_code + permission_code)
        if (locationTableName === 'role_permissions' && mappedData.role_code && mappedData.permission_code) {
          const escapedRoleCode = String(mappedData.role_code).replace(/'/g, "''");
          const escapedPermissionCode = String(mappedData.permission_code).replace(/'/g, "''");
          
          const existing = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${locationTableName}
            WHERE "role_code" = '${escapedRoleCode}'::VARCHAR
              AND "permission_code" = '${escapedPermissionCode}'::VARCHAR
            LIMIT 1
          `);

          if (existing && existing.length > 0) {
            existingRecordSyncId = existing[0].sync_id;
            console.log(`[applySyncOperation] Found existing role_permission by role_code=${mappedData.role_code} and permission_code=${mappedData.permission_code}, sync_id=${existingRecordSyncId}`);
          }
        } else {
          // For permissions and roles, check by code only
          console.log(`[applySyncOperation] Checking for existing ${locationTableName} with ${primaryCodeField}='${primaryCodeValue}'`);
          const existing = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${locationTableName}
            WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
            LIMIT 1
          `);

          console.log(`[applySyncOperation] Query result for ${locationTableName}:`, existing);

          if (existing && existing.length > 0) {
            existingRecordSyncId = existing[0].sync_id;
            console.log(`[applySyncOperation] Found existing record with ${primaryCodeField} = ${primaryCodeValue} (global table, no store_code), sync_id = ${existingRecordSyncId}`);
          } else {
            console.log(`[applySyncOperation] No existing record found for ${locationTableName} with ${primaryCodeField}='${primaryCodeValue}'`);
          }
        }
      } else {
        console.log(`[applySyncOperation] Warning: Could not check by code for ${locationTableName}. primaryCodeField=${primaryCodeField}, hasCodeField=${primaryCodeField ? !!mappedData[primaryCodeField] : false}`);
      }
    } else {
      // For other tables, check by primary code + store_code
      
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
    }

    // Use existing sync_id if found, otherwise use the one from master (or generate new if needed)
    const finalSyncId = existingRecordSyncId || recordId;

    switch (operation) {
      case 'INSERT':
        if (existingRecordSyncId) {
          // Record exists by sync_id (for user tables) or by code (for other tables), update it instead
          await this.handleUpdate(
            locationTableName,
            existingRecordSyncId,
            mappedData,
            parsedData.sync_source || 'server',
            locationCode
          );
        } else if (isUserTable) {
          // For user tables, sync_id is the primary identifier - insert directly
          // Multiple users can share the same store_code, each with unique sync_id
          await this.handleInsert(
            locationTableName,
            recordId,
            mappedData,
            parsedData.sync_source || 'server',
            locationCode
          );
        } else {
          // For other tables, check if sync_id already exists globally (from another location)
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
          // Special handling for different table types
          const isUserTable = tableName === 'tbl_user';
          const isGlobalTable = this.GLOBAL_TABLES.has(tableName) || this.GLOBAL_TABLES.has(locationTableName);
          
          if (isUserTable) {
            // For user tables, check if sync_id exists globally (no store_code check)
            const syncIdExists = await locationPrisma.$queryRawUnsafe<any[]>(`
              SELECT sync_id FROM ${locationTableName}
              WHERE sync_id = '${recordId}'::UUID
              LIMIT 1
            `);

            if (syncIdExists && syncIdExists.length > 0) {
              // Update existing record by sync_id
              await this.handleUpdate(
                locationTableName,
                recordId,
                mappedData,
                parsedData.sync_source || 'server',
                locationCode
              );
            } else {
              // sync_id doesn't exist, insert as new
              await this.handleInsert(
                locationTableName,
                recordId,
                mappedData,
                parsedData.sync_source || 'server',
                locationCode
              );
            }
          } else if (isGlobalTable) {
            // For global tables (permissions, roles, role_permissions), check by sync_id globally (no store_code)
            const syncIdExists = await locationPrisma.$queryRawUnsafe<any[]>(`
              SELECT sync_id FROM ${locationTableName}
              WHERE sync_id = '${recordId}'::UUID
              LIMIT 1
            `);

            if (syncIdExists && syncIdExists.length > 0) {
              // Update existing record by sync_id
              await this.handleUpdate(
                locationTableName,
                recordId,
                mappedData,
                parsedData.sync_source || 'server',
                locationCode
              );
            } else {
              // sync_id doesn't exist, insert as new
              await this.handleInsert(
                locationTableName,
                recordId,
                mappedData,
                parsedData.sync_source || 'server',
                locationCode
              );
            }
          } else {
            // For other tables, check if sync_id exists for this store_code
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
        }
        break;

      case 'DELETE':
        // For DELETE, find record by code (and store_code for non-global tables)
        const isGlobalTableForDelete = this.GLOBAL_TABLES.has(tableName) || this.GLOBAL_TABLES.has(locationTableName);
        
        if (primaryCodeField && mappedData[primaryCodeField]) {
          const primaryCodeValue = mappedData[primaryCodeField];
          const escapedCode = String(primaryCodeValue).replace(/'/g, "''");

          if (isGlobalTableForDelete) {
            // For global tables, check by code only (no store_code)
            // For role_permissions, check by composite key
            if (locationTableName === 'role_permissions' && mappedData.role_code && mappedData.permission_code) {
              const escapedRoleCode = String(mappedData.role_code).replace(/'/g, "''");
              const escapedPermissionCode = String(mappedData.permission_code).replace(/'/g, "''");
              
              const recordToDelete = await locationPrisma.$queryRawUnsafe<any[]>(`
                SELECT sync_id FROM ${locationTableName}
                WHERE "role_code" = '${escapedRoleCode}'::VARCHAR
                  AND "permission_code" = '${escapedPermissionCode}'::VARCHAR
                LIMIT 1
              `);

              if (recordToDelete && recordToDelete.length > 0) {
                await this.handleDelete(locationTableName, recordToDelete[0].sync_id, locationCode, isGlobalTableForDelete);
              }
            } else {
              // For permissions and roles, check by code only
              const recordToDelete = await locationPrisma.$queryRawUnsafe<any[]>(`
                SELECT sync_id FROM ${locationTableName}
                WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
                LIMIT 1
              `);

              if (recordToDelete && recordToDelete.length > 0) {
                await this.handleDelete(locationTableName, recordToDelete[0].sync_id, locationCode, isGlobalTableForDelete);
              }
            }
          } else {
            // For other tables, check by code + store_code
            const escapedStoreCode = locationCode.replace(/'/g, "''");

            const recordToDelete = await locationPrisma.$queryRawUnsafe<any[]>(`
              SELECT sync_id FROM ${locationTableName}
              WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
                AND store_code = '${escapedStoreCode}'::VARCHAR
              LIMIT 1
            `);

            if (recordToDelete && recordToDelete.length > 0) {
              await this.handleDelete(locationTableName, recordToDelete[0].sync_id, locationCode, isGlobalTableForDelete);
            }
          }
        } else {
          await this.handleDelete(locationTableName, recordId, locationCode, isGlobalTableForDelete);
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

    // Handle various prefixes: WM, LS, WL, etc. + LOCATION_CODE + CODE
    // Examples: WMLOC009TAX1, LSLOC009MM1, WLLOC009DPT1
    // Pattern: [PREFIX][LOCATION_CODE][CODE]
    
    // Common prefixes used in the system
    const prefixes = ['WM', 'LS', 'WL', 'ML', 'SM'];
    
    // Try each prefix pattern
    for (const prefix of prefixes) {
      const sourcePattern = `${prefix}${sourceLocationCode}`;
      const targetPattern = `${prefix}${targetLocationCode}`;
      
      // If code starts with source prefix pattern, replace with target prefix pattern
      if (code.startsWith(sourcePattern)) {
        return code.replace(sourcePattern, targetPattern);
      }
    }

    // If code is in master format (e.g., TAX1, MOD1, MM1), transform to target format with WM prefix
    // This handles codes that don't have location prefix yet
    const targetPrefix = `WM${targetLocationCode}`;
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
      { pattern: /^(DPT\d+)$/, prefix: targetPrefix },
      { pattern: /^(DEP\d+)$/, prefix: targetPrefix },
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
          key === 'tbl_station_id' || key === 'dept_type_id' || key === 'dept_id' || key === 'id') {
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
          'menu_item_code', 'modifier_group_code', 'modifier_item_code',
          'dept_type_code', 'dept_code', 'dept_taxcode', 'dept_type'
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
          key === 'tbl_station_id' || key === 'dept_type_id' || key === 'dept_id' || key === 'id') {
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
            // Transform dept_type_code (in any table)
            else if (key === 'dept_type_code') {
              const deptTypeMatch = codeValue.match(/^(DPT\d+)$/);
              if (deptTypeMatch) {
                mappedData[mappedKey] = `WM${locationCode}${deptTypeMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
            // Transform dept_code (in any table)
            else if (key === 'dept_code') {
              const deptMatch = codeValue.match(/^(DEP\d+)$/);
              if (deptMatch) {
                mappedData[mappedKey] = `WM${locationCode}${deptMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
            // Transform dept_taxcode (foreign key reference in department table)
            else if (key === 'dept_taxcode') {
              const deptTaxMatch = codeValue.match(/^(TAX\d+)$/);
              if (deptTaxMatch) {
                mappedData[mappedKey] = `WM${locationCode}${deptTaxMatch[1]}`;
              } else {
                mappedData[mappedKey] = value;
              }
            }
            // Transform dept_type (foreign key reference in department table)
            else if (key === 'dept_type') {
              const deptTypeRefMatch = codeValue.match(/^(DPT\d+)$/);
              if (deptTypeRefMatch) {
                mappedData[mappedKey] = `WM${locationCode}${deptTypeRefMatch[1]}`;
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
      } else if (parentTable === 'tbl_master_tax') {
        foreignKeyField = 'tax_code';
        foreignKeyValue = mappedData.dept_taxcode; // For department table, tax is referenced as dept_taxcode
      } else if (parentTable === 'tbl_master_department_type') {
        foreignKeyField = 'dept_type_code';
        foreignKeyValue = mappedData.dept_type; // For department table, department type is referenced as dept_type
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
      } else if (parentTable === 'tbl_master_tax') {
        foreignKeyField = 'tax_code';
        foreignKeyValue = mappedData.dept_taxcode; // For department table, tax is referenced as dept_taxcode
      } else if (parentTable === 'tbl_master_department_type') {
        foreignKeyField = 'dept_type_code';
        foreignKeyValue = mappedData.dept_type; // For department table, department type is referenced as dept_type
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
    // Check if record already exists
    // Special handling for different table types:
    // 1. User tables: check by sync_id only (no store_code)
    // 2. Global tables: check by sync_id only (no store_code)
    // 3. Other tables: check by sync_id and store_code
    const isUserTable = tableName === 'users';
    const isGlobalTable = this.GLOBAL_TABLES.has(tableName);
    let existing: any[] = [];
    
    if (isUserTable || isGlobalTable) {
      // For user tables and global tables, check by sync_id only (no store_code)
      existing = await locationPrisma.$queryRawUnsafe(`
        SELECT sync_id FROM ${tableName}
        WHERE sync_id = '${syncId}'::UUID
      `) as any[];
    } else {
      // For other tables, check by sync_id and store_code
      existing = await locationPrisma.$queryRawUnsafe(`
        SELECT sync_id FROM ${tableName}
        WHERE sync_id = '${syncId}'::UUID
          AND store_code = '${locationCode.replace(/'/g, "''")}'::VARCHAR
      `) as any[];
    }

    if (existing && (existing as any[]).length > 0) {
      // Record exists for this store_code, treat as UPDATE instead
      await this.handleUpdate(tableName, syncId, data, syncSource, locationCode);
      return;
    }

    // For global tables, also check by primary code field (before attempting insert)
    // This prevents unique constraint violations
    if (isGlobalTable) {
      const primaryCodeField = this.getPrimaryCodeField(tableName);
      if (primaryCodeField && data[primaryCodeField]) {
        const primaryCodeValue = data[primaryCodeField];
        const escapedCode = String(primaryCodeValue).replace(/'/g, "''");

        // For role_permissions, check by composite key (role_code + permission_code)
        if (tableName === 'role_permissions' && data.role_code && data.permission_code) {
          const escapedRoleCode = String(data.role_code).replace(/'/g, "''");
          const escapedPermissionCode = String(data.permission_code).replace(/'/g, "''");
          
          const existingByCode = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${tableName}
            WHERE "role_code" = '${escapedRoleCode}'::VARCHAR
              AND "permission_code" = '${escapedPermissionCode}'::VARCHAR
            LIMIT 1
          `);

          if (existingByCode && existingByCode.length > 0) {
            // Record exists by code, update it instead
            const existingSyncId = existingByCode[0].sync_id || syncId;
            console.log(`Found existing role_permission by composite key, updating with sync_id=${existingSyncId}`);
            await this.handleUpdate(tableName, existingSyncId, data, syncSource, locationCode);
            return;
          }
        } else {
          // For permissions and roles, check by code only
          console.log(`[PRE-CHECK] Checking for existing ${tableName} with ${primaryCodeField}='${primaryCodeValue}'`);
          const existingByCode = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${tableName}
            WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
            LIMIT 1
          `);

          console.log(`[PRE-CHECK] Query result for ${tableName}:`, existingByCode);

          if (existingByCode && existingByCode.length > 0) {
            // Record exists by code, update it instead
            const existingSyncId = existingByCode[0].sync_id || syncId;
            console.log(`[PRE-CHECK] Found existing ${tableName} record by ${primaryCodeField}=${primaryCodeValue}, updating with sync_id=${existingSyncId}`);
            await this.handleUpdate(tableName, existingSyncId, data, syncSource, locationCode);
            return;
          } else {
            console.log(`[PRE-CHECK] No existing ${tableName} record found by ${primaryCodeField}=${primaryCodeValue}, proceeding with insert`);
          }
        }
      } else {
        console.log(`Warning: Could not check by code for ${tableName}. primaryCodeField=${primaryCodeField}, hasCodeField=${primaryCodeField ? !!data[primaryCodeField] : false}`);
      }
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
    let insertData: any = {
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
      
      // Skip store_code for users table and global tables (they don't use store_code)
      if ((tableName === 'users' || isGlobalTable) && (key === 'store_code' || key === 'storecode')) {
        continue;
      }
      
      // Use double quotes for column names to handle case sensitivity
      columns.push(`"${key}"`);
      
      // Type value as any to handle Prisma Decimal and other complex types
      const val: any = value;
      
      // Check table-specific column types first
      const isTableBoolean = this.TABLE_BOOLEAN_COLUMNS[tableName]?.has(key);
      const isTableInteger = this.TABLE_INTEGER_COLUMNS[tableName]?.has(key);
      const isBooleanColumn = isTableBoolean || (!isTableInteger && this.BOOLEAN_COLUMNS.has(key));
      const isIntegerColumn = isTableInteger || this.INTEGER_COLUMNS.has(key);
      
      if (val === null) {
        values.push('NULL');
      } else if (typeof val === 'boolean') {
        // Handle boolean values
        if (isBooleanColumn) {
          values.push(val ? 'true' : 'false');
        } else {
          // Convert boolean to integer (0 or 1)
          values.push(val ? '1' : '0');
        }
      } else if (isBooleanColumn) {
        // Handle boolean columns - convert various formats to boolean
        // This must come before integer column check to handle numeric values correctly
        if (typeof val === 'number') {
          // Convert 0/1 to boolean
          values.push(val ? 'true' : 'false');
        } else if (typeof val === 'string') {
          // Handle string values like "1", "0", "true", "false"
          const boolVal = val === '1' || val.toLowerCase().trim() === 'true';
          values.push(boolVal ? 'true' : 'false');
        } else {
          // Fallback for other types
          values.push(val ? 'true' : 'false');
        }
      } else if (isTableInteger) {
        // Handle table-specific integer columns that might come as boolean or string
        let intVal: number;
        if (typeof val === 'boolean') {
          intVal = val ? 1 : 0;
        } else if (typeof val === 'number') {
          intVal = val;
        } else if (typeof val === 'string') {
          const normalized = val.toLowerCase().trim();
          intVal = (normalized === 'true' || normalized === '1') ? 1 : 0;
        } else {
          intVal = val ? 1 : 0;
        }
        values.push(String(intVal));
      } else if (isIntegerColumn) {
        // Handle integer columns that might come as boolean or string - always convert to integer
        let intVal: number;
        if (typeof val === 'boolean') {
          intVal = val ? 1 : 0;
        } else if (typeof val === 'number') {
          intVal = val;
        } else if (typeof val === 'string') {
          const normalized = val.toLowerCase().trim();
          intVal = (normalized === 'true' || normalized === '1') ? 1 : 0;
        } else {
          intVal = val ? 1 : 0;
        }
        values.push(String(intVal));
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

    // For global tables, use ON CONFLICT DO UPDATE to handle existing records
    let conflictClause = '';
    
    if (isGlobalTable) {
      // For role_permissions, use composite unique constraint
      if (tableName === 'role_permissions' && insertData.role_code && insertData.permission_code) {
        conflictClause = `
          ON CONFLICT (role_code, permission_code) DO UPDATE SET
          sync_id = EXCLUDED.sync_id,
          sync_source = EXCLUDED.sync_source,
          created_on = EXCLUDED.created_on
        `;
      } else {
        // For permissions and roles, use role_code or permission_code unique constraint
        const primaryCodeField = this.getPrimaryCodeField(tableName) || this.getPrimaryCodeField(`tbl_${tableName.replace('s$', '')}`);
        if (primaryCodeField && insertData[primaryCodeField]) {
          // Build update clause for all columns except the primary code field and ID fields
          const updateColumns = columns
            .map(col => col.replace(/"/g, ''))
            .filter(colName => 
              colName !== primaryCodeField && 
              colName !== 'role_id' && 
              colName !== 'permission_id' &&
              colName !== 'role_permission_id'
            )
            .map(colName => `"${colName}" = EXCLUDED."${colName}"`)
            .join(', ');
          
          if (updateColumns) {
            conflictClause = `
              ON CONFLICT ("${primaryCodeField}") DO UPDATE SET
              ${updateColumns}
            `;
          }
        }
      }
    }

    try {
      const insertQuery = conflictClause
        ? `
          INSERT INTO ${tableName} (${columnsStr})
          VALUES (${valuesStr})
          ${conflictClause}
        `
        : `
          INSERT INTO ${tableName} (${columnsStr})
          VALUES (${valuesStr})
        `;
      
      console.log(`[INSERT] Using ON CONFLICT: ${conflictClause ? 'YES' : 'NO'}`);
      await locationPrisma.$executeRawUnsafe(insertQuery);
    } catch (error: any) {
      // Handle foreign key constraint violations (23503) - parent record doesn't exist yet
      // This can happen if role_permissions syncs before permissions/roles are synced
      if (error.code === '23503') {
        console.warn(`[FOREIGN KEY ERROR] ${error.message}`);
        console.warn(`[FOREIGN KEY ERROR] Skipping ${tableName} sync - parent record doesn't exist yet. Will retry after parent is synced.`);
        // Don't throw - let it be retried later when parent records are synced
        return;
      }
      
      // Handle unique constraint violations (23505) - record already exists
      // For location-to-location sync, update existing record instead of failing
      if (error.code === '23505') {
        console.log(`[ERROR HANDLER] Unique constraint violation for ${tableName}, attempting to update existing record...`);
        console.log(`[ERROR HANDLER] Error message: ${error.message}`);
        
        // Try to find existing record by primary code field
        const isGlobalTable = this.GLOBAL_TABLES.has(tableName);
        console.log(`[ERROR HANDLER] isGlobalTable=${isGlobalTable}, insertData keys:`, Object.keys(insertData));
        
        // Try both table name variations for getPrimaryCodeField
        let primaryCodeField = this.getPrimaryCodeField(tableName);
        if (!primaryCodeField) {
          // Try master table name
          const masterTableName = tableName === 'roles' ? 'tbl_role' : 
                                  tableName === 'permissions' ? 'tbl_permission' :
                                  tableName === 'role_permissions' ? 'tbl_role_permission' : null;
          if (masterTableName) {
            primaryCodeField = this.getPrimaryCodeField(masterTableName);
          }
        }
        
        console.log(`[ERROR HANDLER] primaryCodeField=${primaryCodeField}, hasCodeField=${primaryCodeField ? !!insertData[primaryCodeField] : false}`);
        
        // For global tables, try to find by code field
        if (isGlobalTable && primaryCodeField && insertData[primaryCodeField]) {
          const primaryCodeValue = insertData[primaryCodeField];
          const escapedCode = String(primaryCodeValue).replace(/'/g, "''");
          
          // For role_permissions, check by composite key (role_code + permission_code)
          if (tableName === 'role_permissions' && insertData.role_code && insertData.permission_code) {
            const escapedRoleCode = String(insertData.role_code).replace(/'/g, "''");
            const escapedPermissionCode = String(insertData.permission_code).replace(/'/g, "''");
            
            console.log(`[ERROR HANDLER] Checking role_permissions with role_code='${insertData.role_code}', permission_code='${insertData.permission_code}'`);
            const existing = await locationPrisma.$queryRawUnsafe<any[]>(`
              SELECT sync_id FROM ${tableName}
              WHERE "role_code" = '${escapedRoleCode}'::VARCHAR
                AND "permission_code" = '${escapedPermissionCode}'::VARCHAR
              LIMIT 1
            `);
            
            console.log(`[ERROR HANDLER] Query result:`, existing);
            
            if (existing && existing.length > 0) {
              const existingSyncId = existing[0].sync_id || syncId;
              console.log(`[ERROR HANDLER] Found existing role_permission, updating with sync_id=${existingSyncId}`);
              await this.handleUpdate(tableName, existingSyncId, insertData, syncSource, locationCode);
              console.log(`[ERROR HANDLER] Successfully updated existing role_permission`);
              return; // Successfully handled, don't re-throw
            }
          } else {
            // For permissions and roles, check by code only
            console.log(`[ERROR HANDLER] Checking ${tableName} with ${primaryCodeField}='${primaryCodeValue}'`);
            const existing = await locationPrisma.$queryRawUnsafe<any[]>(`
              SELECT sync_id FROM ${tableName}
              WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
              LIMIT 1
            `);
            
            console.log(`[ERROR HANDLER] Query result:`, existing);
            
            if (existing && existing.length > 0) {
              const existingSyncId = existing[0].sync_id || syncId;
              console.log(`[ERROR HANDLER] Found existing ${tableName} by ${primaryCodeField}=${primaryCodeValue}, updating with sync_id=${existingSyncId}`);
              await this.handleUpdate(tableName, existingSyncId, insertData, syncSource, locationCode);
              console.log(`[ERROR HANDLER] Successfully updated existing record for ${tableName}`);
              return; // Successfully handled, don't re-throw
            } else {
              console.log(`[ERROR HANDLER] WARNING: No existing record found for ${tableName} with ${primaryCodeField}=${primaryCodeValue}, but error says it exists!`);
              // Even though query didn't find it, the error says it exists, so try to use UPSERT
              console.log(`[ERROR HANDLER] Attempting UPSERT as fallback...`);
              try {
                await this.handleUpsert(tableName, syncId, insertData, syncSource, locationCode, 'merge');
                console.log(`[ERROR HANDLER] UPSERT succeeded`);
                return; // Successfully handled
              } catch (upsertError: any) {
                console.error(`[ERROR HANDLER] UPSERT also failed:`, upsertError);
              }
            }
          }
        }
        
        // If we can't find by code, try to update by sync_id (for users table)
        if (tableName === 'users' && insertData.email) {
          const escapedEmail = String(insertData.email).replace(/'/g, "''");
          const existing = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${tableName}
            WHERE email = '${escapedEmail}'::VARCHAR
            LIMIT 1
          `);
          
          if (existing && existing.length > 0) {
            const existingSyncId = existing[0].sync_id || syncId;
            await this.handleUpdate(tableName, existingSyncId, insertData, syncSource, locationCode);
            console.log(`[ERROR HANDLER] Successfully updated existing user record`);
            return; // Successfully handled
          }
        }
        
        // If we get here, we couldn't handle the error
        console.error(`[ERROR HANDLER] Could not resolve unique constraint violation for ${tableName}`);
        console.error(`[ERROR HANDLER] Error details:`, error);
      }
      
      // Re-throw error if we couldn't handle it
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
    // Special handling for different table types:
    // 1. User tables: check by sync_id only (no store_code)
    // 2. Global tables: check by sync_id only (no store_code)
    // 3. Other tables: check by sync_id and store_code
    const isUserTable = tableName === 'users';
    const isGlobalTable = this.GLOBAL_TABLES.has(tableName);
    
    // Check if record exists
    let existing;
    if (isUserTable || isGlobalTable) {
      // For user tables and global tables, check by sync_id only (no store_code)
      existing = await locationPrisma.$queryRawUnsafe(`
        SELECT sync_id FROM ${tableName}
        WHERE sync_id = '${syncId}'::UUID
      `);
    } else {
      // For other tables, check by sync_id and store_code
      existing = await locationPrisma.$queryRawUnsafe(`
        SELECT sync_id FROM ${tableName}
        WHERE sync_id = '${syncId}'::UUID
          AND store_code = '${locationCode.replace(/'/g, "''")}'::VARCHAR
      `);
    }

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
      
      // Check table-specific column types first
      const isTableBoolean = this.TABLE_BOOLEAN_COLUMNS[tableName]?.has(key);
      const isTableInteger = this.TABLE_INTEGER_COLUMNS[tableName]?.has(key);
      // Determine if column should be treated as boolean (table-specific override takes precedence)
      const isBooleanColumn = isTableBoolean || (!isTableInteger && this.BOOLEAN_COLUMNS.has(key));
      const isIntegerColumn = isTableInteger || this.INTEGER_COLUMNS.has(key);
      
      if (val === null) {
        setParts.push(`${quotedKey} = NULL`);
      } else if (typeof val === 'boolean') {
        // Handle boolean values
        if (isBooleanColumn) {
          setParts.push(`${quotedKey} = ${val ? 'true' : 'false'}`);
        } else {
          // Convert boolean to integer (0 or 1)
          setParts.push(`${quotedKey} = ${val ? '1' : '0'}`);
        }
      } else if (isBooleanColumn) {
        // Handle boolean columns - MUST check before integer columns
        // Convert various formats (number, string) to boolean
        if (typeof val === 'number') {
          // Convert 0/1 to boolean
          setParts.push(`${quotedKey} = ${val ? 'true' : 'false'}`);
        } else if (typeof val === 'string') {
          // Handle string values like "1", "0", "true", "false"
          const boolVal = val === '1' || val.toLowerCase().trim() === 'true';
          setParts.push(`${quotedKey} = ${boolVal ? 'true' : 'false'}`);
        } else {
          // Fallback for other types
          setParts.push(`${quotedKey} = ${val ? 'true' : 'false'}`);
        }
      } else if (isIntegerColumn) {
        // Handle integer columns - convert various formats to integer
        let intVal: number;
        if (typeof val === 'boolean') {
          intVal = val ? 1 : 0;
        } else if (typeof val === 'number') {
          intVal = val;
        } else if (typeof val === 'string') {
          const normalized = val.toLowerCase().trim();
          intVal = (normalized === 'true' || normalized === '1') ? 1 : 0;
        } else {
          intVal = val ? 1 : 0;
        }
        setParts.push(`${quotedKey} = ${intVal}`);
      } else if (this.INTEGER_COLUMNS.has(key) && typeof val !== 'number') {
        // Handle integer columns that might come as boolean or string - always convert to integer
        let intVal: number;
        if (typeof val === 'boolean') {
          intVal = val ? 1 : 0;
        } else if (typeof val === 'string') {
          const normalized = val.toLowerCase().trim();
          intVal = (normalized === 'true' || normalized === '1') ? 1 : 0;
        } else {
          intVal = val ? 1 : 0;
        }
        setParts.push(`${quotedKey} = ${intVal}`);
      } else if (isTableBoolean || this.BOOLEAN_COLUMNS.has(key)) {
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
      // Special handling for user tables and global tables: update by sync_id only (no store_code)
      if (isUserTable || isGlobalTable) {
        await locationPrisma.$executeRawUnsafe(`
          UPDATE ${tableName}
          SET ${setClause}
          WHERE sync_id = '${syncId}'::UUID
        `);
      } else {
        await locationPrisma.$executeRawUnsafe(`
          UPDATE ${tableName}
          SET ${setClause}
          WHERE sync_id = '${syncId}'::UUID
            AND store_code = '${locationCode.replace(/'/g, "''")}'::VARCHAR
        `);
      }
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
    locationCode: string,
    isGlobalTable: boolean = false
  ): Promise<void> {
    // For global tables and user tables, don't use store_code in WHERE clause
    const isUserTable = tableName === 'users';
    
    // Explicit dependency cleanup for roles -> role_permissions
    if (tableName === 'roles') {
      try {
        const role = await locationPrisma.role.findUnique({
          where: { syncId: syncId as any },
          select: { roleCode: true }
        });

        if (role?.roleCode) {
          await locationPrisma.$executeRawUnsafe(`
            DELETE FROM role_permissions
            WHERE role_code = '${role.roleCode.replace(/'/g, "''")}'
          `);
        }
      } catch (error: any) {
        console.error(`Failed to cascade delete role_permissions for role sync_id=${syncId}:`, error);
        throw error;
      }
    }

    if (isUserTable || isGlobalTable) {
      await locationPrisma.$executeRawUnsafe(`
        DELETE FROM ${tableName}
        WHERE sync_id = '${syncId}'::UUID
      `);
    } else {
      await locationPrisma.$executeRawUnsafe(`
        DELETE FROM ${tableName}
        WHERE sync_id = '${syncId}'::UUID
          AND store_code = '${locationCode.replace(/'/g, "''")}'::VARCHAR
      `);
    }
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
   * Handle UPSERT for location-to-location sync using code field as conflict key
   * This ensures records are updated if they exist, inserted if they don't
   * NO master database checks - only checks target location database
   */
  private async handleLocationToLocationUpsert(
    locationTableName: string,
    masterTableName: string,
    data: Record<string, any>,
    syncId: string,
    syncSource: string,
    locationCode: string,
    isUserTable: boolean
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
      
      // Skip store_code for users table
      if (locationTableName === 'users' && (key === 'store_code' || key === 'storecode')) {
        continue;
      }
      
      // Use double quotes for column names to handle case sensitivity
      const quotedKey = `"${key}"`;
      columns.push(quotedKey);
      
      // Type value as any to handle Prisma Decimal and other complex types
      const val: any = value;
      
      // Check table-specific column types first
      const isTableBoolean = this.TABLE_BOOLEAN_COLUMNS[locationTableName]?.has(key);
      const isTableInteger = this.TABLE_INTEGER_COLUMNS[locationTableName]?.has(key);
      const isBooleanColumn = isTableBoolean || (!isTableInteger && this.BOOLEAN_COLUMNS.has(key));
      const isIntegerColumn = isTableInteger || this.INTEGER_COLUMNS.has(key);
      
      let valueStr: string;
      if (val === null) {
        valueStr = 'NULL';
      } else if (typeof val === 'boolean') {
        if (isBooleanColumn) {
          valueStr = val ? 'true' : 'false';
        } else {
          valueStr = val ? '1' : '0';
        }
      } else if (isBooleanColumn) {
        if (typeof val === 'number') {
          valueStr = val ? 'true' : 'false';
        } else if (typeof val === 'string') {
          const boolVal = val === '1' || val.toLowerCase().trim() === 'true';
          valueStr = boolVal ? 'true' : 'false';
        } else {
          valueStr = val ? 'true' : 'false';
        }
      } else if (isTableInteger || isIntegerColumn) {
        let intVal: number;
        if (typeof val === 'boolean') {
          intVal = val ? 1 : 0;
        } else if (typeof val === 'number') {
          intVal = val;
        } else if (typeof val === 'string') {
          const normalized = val.toLowerCase().trim();
          intVal = (normalized === 'true' || normalized === '1') ? 1 : 0;
        } else {
          intVal = val ? 1 : 0;
        }
        valueStr = String(intVal);
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

      // For UPDATE part, exclude the conflict key field(s)
      // For users: conflict on email
      // For other tables: conflict on code field + store_code
      if (isUserTable) {
        if (key !== 'email') {
          updateParts.push(`${quotedKey} = EXCLUDED.${quotedKey}`);
        }
      } else {
        const primaryCodeField = this.getPrimaryCodeField(masterTableName);
        if (key !== primaryCodeField && key !== 'store_code' && key !== 'storecode') {
          updateParts.push(`${quotedKey} = EXCLUDED.${quotedKey}`);
        }
      }
    }

    const columnsStr = columns.join(', ');
    const valuesStr = values.join(', ');
    const updateClause = updateParts.join(', ');

    try {
      // Check if record already exists in target location (NO master database check)
      let recordExists = false;
      let existingSyncId: string | null = null;

      if (isUserTable) {
        // For users, check by email
        const email = (data as any).email;
        if (email) {
          const escapedEmail = String(email).replace(/'/g, "''");
          const existing = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${locationTableName}
            WHERE email = '${escapedEmail}'::VARCHAR
            LIMIT 1
          `);
          if (existing && existing.length > 0) {
            recordExists = true;
            existingSyncId = existing[0].sync_id || syncId;
          }
        }
      } else {
        // For other tables, check by code field only (unique constraint is on code, not code+store_code)
        // Some tables have unique on code only, so we check by code first
        const primaryCodeField = this.getPrimaryCodeField(masterTableName);
        if (primaryCodeField && (data as any)[primaryCodeField]) {
          const codeValue = (data as any)[primaryCodeField];
          const escapedCode = String(codeValue).replace(/'/g, "''");
          
          // First try to find by code + store_code (for tables with composite unique)
          const escapedStoreCode = locationCode.replace(/'/g, "''");
          let existing = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${locationTableName}
            WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
              AND store_code = '${escapedStoreCode}'::VARCHAR
            LIMIT 1
          `);
          
          // If not found, try by code only (for tables with unique on code only)
          if (!existing || existing.length === 0) {
            existing = await locationPrisma.$queryRawUnsafe<any[]>(`
              SELECT sync_id FROM ${locationTableName}
              WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
              LIMIT 1
            `);
          }
          
          if (existing && existing.length > 0) {
            recordExists = true;
            existingSyncId = existing[0].sync_id || syncId;
          }
        }
      }

      if (recordExists && existingSyncId) {
        // Record exists - UPDATE it (NO master database check, only location database)
        console.log(`Record exists in target location, updating...`);
        await this.handleUpdate(locationTableName, existingSyncId, data, syncSource, locationCode);
      } else {
        // Record doesn't exist - try INSERT
        // For tables without unique constraint on code field, use sync_id for conflict resolution
        const primaryCodeField = isUserTable ? 'email' : this.getPrimaryCodeField(masterTableName);
        
        try {
          if (isUserTable) {
            // Users table: use email for conflict
            await locationPrisma.$executeRawUnsafe(`
              INSERT INTO ${locationTableName} (${columnsStr})
              VALUES (${valuesStr})
              ON CONFLICT (email) DO UPDATE
              SET ${updateClause}
            `);
            console.log(`Successfully upserted user record in ${locationTableName}`);
          } else if (primaryCodeField) {
            // Try UPSERT with sync_id first (always unique, most reliable)
            try {
              await locationPrisma.$executeRawUnsafe(`
                INSERT INTO ${locationTableName} (${columnsStr})
                VALUES (${valuesStr})
                ON CONFLICT (sync_id) DO UPDATE
                SET ${updateClause}
              `);
              console.log(`Successfully upserted record in ${locationTableName} using sync_id`);
            } catch (syncIdError: any) {
              // If sync_id conflict fails, try code field
              if (syncIdError.code === '42P10' || syncIdError.message?.includes('ON CONFLICT')) {
                console.log(`sync_id conflict failed, trying code field: ${primaryCodeField}...`);
                try {
                  await locationPrisma.$executeRawUnsafe(`
                    INSERT INTO ${locationTableName} (${columnsStr})
                    VALUES (${valuesStr})
                    ON CONFLICT ("${primaryCodeField}") DO UPDATE
                    SET ${updateClause}
                  `);
                  console.log(`Successfully upserted with code field: ${primaryCodeField}`);
                } catch (codeError: any) {
                  // If code field also fails, try composite (code, store_code)
                  if (codeError.code === '42P10' || codeError.message?.includes('ON CONFLICT')) {
                    console.log(`Code field conflict failed, trying composite (${primaryCodeField}, store_code)...`);
                    try {
                      await locationPrisma.$executeRawUnsafe(`
                        INSERT INTO ${locationTableName} (${columnsStr})
                        VALUES (${valuesStr})
                        ON CONFLICT ("${primaryCodeField}", store_code) DO UPDATE
                        SET ${updateClause}
                      `);
                      console.log(`Successfully upserted with composite key`);
                    } catch (compositeError: any) {
                      // If all UPSERT attempts fail, fall back to simple INSERT
                      // The catch block below will handle unique constraint violations
                      throw compositeError;
                    }
                  } else {
                    throw codeError;
                  }
                }
              } else {
                throw syncIdError;
              }
            }
          } else {
            // No primary code field - try with sync_id
            try {
              await locationPrisma.$executeRawUnsafe(`
                INSERT INTO ${locationTableName} (${columnsStr})
                VALUES (${valuesStr})
                ON CONFLICT (sync_id) DO UPDATE
                SET ${updateClause}
              `);
              console.log(`Successfully upserted using sync_id`);
            } catch (syncIdError: any) {
              // If sync_id conflict also fails, just try simple INSERT
              // The catch block below will handle it
              throw syncIdError;
            }
          }
        } catch (insertError: any) {
          // If all UPSERT attempts fail (no matching constraint), try simple INSERT
          // This will be caught by the outer catch block if unique constraint violation occurs
          throw insertError;
        }
      }
    } catch (error: any) {
      // Handle different error types
      if (error.code === '23505') {
        // Unique constraint violation - record exists, try to update
        console.log(`Insert failed due to unique constraint, attempting to update existing record...`);
        
        // First try to find by sync_id (most reliable, always unique)
        try {
          const escapedSyncId = syncId.replace(/'/g, "''");
          const existingBySyncId = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${locationTableName}
            WHERE sync_id = '${escapedSyncId}'::UUID
            LIMIT 1
          `);
          
          if (existingBySyncId && existingBySyncId.length > 0) {
            const existingSyncId = existingBySyncId[0].sync_id || syncId;
            await this.handleUpdate(locationTableName, existingSyncId, data, syncSource, locationCode);
            console.log(`Updated existing record by sync_id: ${syncId}`);
            return;
          }
        } catch (syncIdError) {
          // Continue to other methods if sync_id check fails
        }
        
        // Try to find existing record by code/email and update it
        if (isUserTable) {
          const email = (data as Record<string, any>).email;
          if (email) {
            const escapedEmail = String(email).replace(/'/g, "''");
            const existing = await locationPrisma.$queryRawUnsafe<any[]>(`
              SELECT sync_id FROM ${locationTableName}
              WHERE email = '${escapedEmail}'::VARCHAR
              LIMIT 1
            `);
            
            if (existing && existing.length > 0) {
              const existingSyncId = existing[0].sync_id || syncId;
              await this.handleUpdate(locationTableName, existingSyncId, data, syncSource, locationCode);
              console.log(`Updated existing record by email: ${email}`);
              return;
            }
          }
        } else {
          const primaryCodeField = this.getPrimaryCodeField(masterTableName);
          if (primaryCodeField) {
            const codeValue = (data as Record<string, any>)[primaryCodeField];
            if (codeValue) {
              const escapedCode = String(codeValue).replace(/'/g, "''");
              const escapedStoreCode = locationCode.replace(/'/g, "''");
              
              // Try code + store_code first
              let existing = await locationPrisma.$queryRawUnsafe<any[]>(`
                SELECT sync_id FROM ${locationTableName}
                WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
                  AND store_code = '${escapedStoreCode}'::VARCHAR
                LIMIT 1
              `);
              
              // If not found, try code only (for tables with unique on code only)
              if (!existing || existing.length === 0) {
                existing = await locationPrisma.$queryRawUnsafe<any[]>(`
                  SELECT sync_id FROM ${locationTableName}
                  WHERE "${primaryCodeField}" = '${escapedCode}'::VARCHAR
                  LIMIT 1
                `);
              }
              
              if (existing && existing.length > 0) {
                const existingSyncId = existing[0].sync_id || syncId;
                await this.handleUpdate(locationTableName, existingSyncId, data, syncSource, locationCode);
                console.log(`Updated existing record by code: ${codeValue}`);
                return;
              }
            }
          }
        }
        
        // If we couldn't find the record, re-throw the error
        throw error;
      } else if (error.code === '42P10') {
        // ON CONFLICT specification doesn't match any constraint
        // This means the table doesn't have the unique constraint we tried to use
        // Fall back to checking if record exists by sync_id and update, or insert
        console.log(`ON CONFLICT failed - no matching constraint. Checking by sync_id...`);
        
        try {
          const escapedSyncId = syncId.replace(/'/g, "''");
          const existing = await locationPrisma.$queryRawUnsafe<any[]>(`
            SELECT sync_id FROM ${locationTableName}
            WHERE sync_id = '${escapedSyncId}'::UUID
            LIMIT 1
          `);
          
          if (existing && existing.length > 0) {
            // Record exists - update it
            const existingSyncId = existing[0].sync_id || syncId;
            await this.handleUpdate(locationTableName, existingSyncId, data, syncSource, locationCode);
            console.log(`Updated existing record by sync_id: ${syncId}`);
            return;
          } else {
            // Record doesn't exist - try simple INSERT (without ON CONFLICT)
            await locationPrisma.$executeRawUnsafe(`
              INSERT INTO ${locationTableName} (${columnsStr})
              VALUES (${valuesStr})
            `);
            console.log(`Inserted new record (no conflict clause needed)`);
            return;
          }
        } catch (fallbackError: any) {
          // If fallback also fails, re-throw original error
          throw error;
        }
      }
      
      console.error(`Failed to upsert ${locationTableName}:`, error);
      console.error('Columns:', columns);
      console.error('Values count:', values.length);
      throw error;
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
      'tbl_master_department_type': 'dept_type_code',
      'tbl_master_department': 'dept_code',
      'tbl_master_menu_master': 'menu_master_code',
      'tbl_master_menu_category': 'menu_category_code',
      'tbl_master_menu_item': 'menu_item_code',
      'tbl_master_modifier_group': 'modifier_group_code',
      'tbl_master_modifier_item': 'modifier_item_code',
      'tbl_master_time_events': 'Event_code',
      // Permission system tables (global, no store_code)
      'tbl_permission': 'permission_code',
      'permissions': 'permission_code',
      'tbl_role': 'role_code',
      'roles': 'role_code',
      'tbl_role_permission': 'role_code', // Composite: role_code + permission_code
      'role_permissions': 'role_code', // Composite: role_code + permission_code
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
        // Check table-specific column types first
        const isTableBoolean = this.TABLE_BOOLEAN_COLUMNS[tableName]?.has(key);
        const isTableInteger = this.TABLE_INTEGER_COLUMNS[tableName]?.has(key);
        const isBooleanColumn = isTableBoolean || (!isTableInteger && this.BOOLEAN_COLUMNS.has(key));
        
        if (isBooleanColumn) {
          setParts.push(`${quotedKey} = ${val ? 'true' : 'false'}`);
        } else {
          // Convert to integer (0 or 1)
          setParts.push(`${quotedKey} = ${val ? '1' : '0'}`);
        }
      } else if (this.TABLE_INTEGER_COLUMNS[tableName]?.has(key)) {
        // Handle integer columns (like is_default in tbl_modifier_item)
        let intVal: number;
        if (typeof val === 'boolean') {
          intVal = val ? 1 : 0;
        } else if (typeof val === 'number') {
          intVal = val;
        } else if (typeof val === 'string') {
          const normalized = val.toLowerCase().trim();
          intVal = (normalized === 'true' || normalized === '1') ? 1 : 0;
        } else {
          intVal = val ? 1 : 0;
        }
        setParts.push(`${quotedKey} = ${intVal}`);
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
      // Skip store_code in WHERE clause for tables that don't have it (like users table)
      const locationTableName = SYNC_TABLE_MAP[tableName] || tableName;
      const isUserTable = locationTableName === 'users';
      
      let whereClause: string;
      if (isUserTable) {
        // For users table, don't use store_code in WHERE clause
        whereClause = `"${codeField}" = '${escapedCode}'::VARCHAR`;
      } else {
        // For other tables, use store_code in WHERE clause
        whereClause = `"${codeField}" = '${escapedCode}'::VARCHAR
          AND store_code = '${escapedLocationCode}'::VARCHAR`;
      }
      
      await locationPrisma.$executeRawUnsafe(`
        UPDATE ${locationTableName}
        SET ${setClause}
        WHERE ${whereClause}
      `);
    } catch (error: any) {
      console.error(`Failed to update ${tableName} by ${codeField}:`, error);
      console.error('Set parts:', setParts);
      throw error;
    }
  }
}

export const syncProcessor = new SyncProcessor();

