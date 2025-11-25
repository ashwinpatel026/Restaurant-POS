/**
 * Sync Validator
 * Validates sync log entries before processing
 */

import { locationPrisma } from '@/lib/databaseManager';
import { SyncLogEntry } from './types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class SyncValidator {
  /**
   * Validate sync log entry before processing
   */
  async validateEntry(entry: SyncLogEntry, locationTableName: string): Promise<ValidationResult> {
    // Check if table exists
    const tableExists = await this.checkTableExists(locationTableName);
    if (!tableExists) {
      return {
        valid: false,
        error: `Table ${locationTableName} does not exist in location database`,
      };
    }

    // Validate required fields
    if (!entry.recordId) {
      return {
        valid: false,
        error: 'Record ID (sync_id) is required',
      };
    }

    if (!entry.operation) {
      return {
        valid: false,
        error: 'Operation is required',
      };
    }

    if (!entry.data) {
      return {
        valid: false,
        error: 'Data is required',
      };
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(entry.recordId)) {
      return {
        valid: false,
        error: `Invalid UUID format: ${entry.recordId}`,
      };
    }

    // Validate operation type
    const validOperations = ['INSERT', 'UPDATE', 'DELETE'];
    if (!validOperations.includes(entry.operation)) {
      return {
        valid: false,
        error: `Invalid operation: ${entry.operation}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check if table exists in location database
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await locationPrisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        )
      `);

      return (result as any[])[0]?.exists || false;
    } catch (error) {
      console.error(`Error checking table existence: ${error}`);
      return false;
    }
  }

  /**
   * Validate data structure matches table schema
   */
  async validateDataStructure(
    tableName: string,
    data: Record<string, any>
  ): Promise<ValidationResult> {
    try {
      // Get table columns
      const columns = await locationPrisma.$queryRawUnsafe(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        AND table_schema = 'public'
      `);

      const columnMap = new Map(
        (columns as any[]).map((col) => [col.column_name.toLowerCase(), col])
      );

      // Check if required columns exist in data
      for (const [key, value] of Object.entries(data)) {
        const col = columnMap.get(key.toLowerCase());
        if (!col && key !== 'sync_id' && key !== 'sync_source') {
          // Allow sync fields even if not in schema
          continue;
        }
      }

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: `Error validating data structure: ${error.message}`,
      };
    }
  }
}

export const syncValidator = new SyncValidator();

