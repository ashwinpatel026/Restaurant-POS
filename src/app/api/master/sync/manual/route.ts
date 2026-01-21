/**
 * Manual Sync API Endpoint
 * POST /api/master/sync/manual
 * Triggers manual sync from Master DB to Location DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMasterAdmin } from '@/lib/masterAuthHelper';
import { syncService } from '@/lib/sync/syncService';
import { SyncRequest, SYNC_TABLE_DEPENDENCIES } from '@/lib/sync/types';
import { syncMenuItemTimeEvents } from '@/services/syncService';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const admin = await verifyMasterAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (only SUPER_ADMIN, COMPANY_ADMIN, DEALER_ADMIN can sync)
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to perform sync' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { locationCode, tableName, fullSync, forceSync } = body;

    // Validate required fields
    if (!locationCode) {
      return NextResponse.json(
        { error: 'locationCode is required' },
        { status: 400 }
      );
    }

    // Special handling for Menu Item Time Event table - use dedicated sync function
    if (tableName === 'tbl_master_menuitem_timeevent') {
      console.log('Using dedicated sync function for Menu Item Time Event');
      const startTime = Date.now();
      try {
        const recordsSynced = await syncMenuItemTimeEvents(locationCode);
        const duration = Date.now() - startTime;

        return NextResponse.json({
          success: true,
          message: `Menu Item Time Event sync completed successfully for location ${locationCode}`,
          data: {
            locationCode,
            tableName: 'tbl_master_menuitem_timeevent',
            recordsProcessed: recordsSynced.recordsSynced,
            recordsSucceeded: recordsSynced.recordsSynced,
            recordsFailed: 0,
            duration,
            errors: [],
          },
        });
      } catch (error: any) {
        console.error('Error syncing Menu Item Time Event:', error);
        return NextResponse.json({
          success: false,
          message: `Menu Item Time Event sync failed for location ${locationCode}`,
          data: {
            locationCode,
            tableName: 'tbl_master_menuitem_timeevent',
            recordsProcessed: 0,
            recordsSucceeded: 0,
            recordsFailed: 0,
            duration: Date.now() - startTime,
            errors: [{ recordId: '', operation: 'INSERT' as const, error: error.message || 'Unknown error', tableName: 'tbl_master_menuitem_timeevent' }],
          },
        });
      }
    }

    // Build sync request
    const syncRequest: SyncRequest = {
      locationCode,
      tableName: tableName || undefined,
      fullSync: fullSync || false,
      forceSync: forceSync || false,
    };

    // Execute sync
    console.log('Manual sync request:', syncRequest);
    const result = await syncService.syncToLocation(syncRequest);
    console.log('Manual sync result:', {
      success: result.success,
      recordsProcessed: result.recordsProcessed,
      recordsSucceeded: result.recordsSucceeded,
      recordsFailed: result.recordsFailed,
      errors: result.errors,
    });

    // If syncing a table that has dependent tables, automatically sync those too
    // For example: when syncing tbl_user, also sync tbl_user_store_access
    const dependentTables: string[] = [];
    if (tableName && SYNC_TABLE_DEPENDENCIES) {
      // Find tables that depend on the current table
      Object.entries(SYNC_TABLE_DEPENDENCIES).forEach(([childTable, parentTables]) => {
        if (parentTables.includes(tableName)) {
          dependentTables.push(childTable);
        }
      });
    }

    const dependentResults: any[] = [];
    if (dependentTables.length > 0) {
      console.log(`Auto-syncing dependent tables: ${dependentTables.join(', ')}`);
      for (const depTable of dependentTables) {
        const depSyncRequest: SyncRequest = {
          locationCode,
          tableName: depTable,
          fullSync: fullSync || false,
          forceSync: forceSync || false,
        };
        const depResult = await syncService.syncToLocation(depSyncRequest);
        dependentResults.push({
          tableName: depTable,
          ...depResult,
        });
      }
    }

    // Combine results
    const totalRecordsProcessed = result.recordsProcessed + dependentResults.reduce((sum, r) => sum + r.recordsProcessed, 0);
    const totalRecordsSucceeded = result.recordsSucceeded + dependentResults.reduce((sum, r) => sum + r.recordsSucceeded, 0);
    const totalRecordsFailed = result.recordsFailed + dependentResults.reduce((sum, r) => sum + r.recordsFailed, 0);
    const allErrors = [...result.errors, ...dependentResults.flatMap(r => r.errors)];
    const overallSuccess = result.success && dependentResults.every(r => r.success);

    // Return result
    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess
        ? `Sync completed successfully for location ${locationCode}${dependentTables.length > 0 ? ` (including ${dependentTables.length} dependent table(s))` : ''}`
        : `Sync completed with errors for location ${locationCode}`,
      data: {
        locationCode: result.locationCode,
        tableName: result.tableName,
        recordsProcessed: totalRecordsProcessed,
        recordsSucceeded: totalRecordsSucceeded,
        recordsFailed: totalRecordsFailed,
        duration: result.duration,
        errors: allErrors.slice(0, 10), // Limit errors in response
        dependentTables: dependentTables.length > 0 ? dependentResults : undefined,
      },
    });
  } catch (error: any) {
    console.error('Error in manual sync:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

