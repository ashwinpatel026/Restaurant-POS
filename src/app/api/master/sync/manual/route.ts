/**
 * Manual Sync API Endpoint
 * POST /api/master/sync/manual
 * Triggers manual sync from Master DB to Location DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMasterAdmin } from '@/lib/masterAuthHelper';
import { syncService } from '@/lib/sync/syncService';
import { SyncRequest } from '@/lib/sync/types';

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

    // Return result
    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Sync completed successfully for location ${locationCode}`
        : `Sync completed with errors for location ${locationCode}`,
      data: {
        locationCode: result.locationCode,
        tableName: result.tableName,
        recordsProcessed: result.recordsProcessed,
        recordsSucceeded: result.recordsSucceeded,
        recordsFailed: result.recordsFailed,
        duration: result.duration,
        errors: result.errors.slice(0, 10), // Limit errors in response
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

