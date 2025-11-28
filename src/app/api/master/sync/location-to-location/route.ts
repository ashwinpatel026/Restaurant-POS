/**
 * Location-to-Location Sync API
 * Clones syncable data from one location to another
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMasterAdmin } from '@/lib/masterAuthHelper';
import { syncService } from '@/lib/sync/syncService';
import { LocationToLocationSyncRequest } from '@/lib/sync/types';

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
        { error: 'Insufficient permissions to perform location-to-location sync' },
        { status: 403 }
      );
    }

    const body: LocationToLocationSyncRequest = await request.json();
    const { sourceLocationCode, targetLocationCode, tableName, fullSync, cloneMode } = body;

    // Validate required fields
    if (!sourceLocationCode || !targetLocationCode) {
      return NextResponse.json(
        { error: 'sourceLocationCode and targetLocationCode are required' },
        { status: 400 }
      );
    }

    if (sourceLocationCode === targetLocationCode) {
      return NextResponse.json(
        { error: 'Source and target locations cannot be the same' },
        { status: 400 }
      );
    }

    console.log(`Starting location-to-location sync: ${sourceLocationCode} -> ${targetLocationCode}`);

    // Perform location-to-location sync
    const result = await syncService.syncLocationToLocation({
      sourceLocationCode,
      targetLocationCode,
      tableName,
      fullSync: fullSync ?? true,
      cloneMode: cloneMode ?? 'clone',
    });

    console.log('Location-to-location sync result:', {
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
        ? `Location-to-location sync completed successfully: ${sourceLocationCode} -> ${targetLocationCode}`
        : `Location-to-location sync completed with errors: ${sourceLocationCode} -> ${targetLocationCode}`,
      data: {
        sourceLocationCode,
        targetLocationCode,
        tableName: result.tableName,
        recordsProcessed: result.recordsProcessed,
        recordsSucceeded: result.recordsSucceeded,
        recordsFailed: result.recordsFailed,
        duration: result.duration,
        errors: result.errors.slice(0, 10), // Limit errors in response
      },
    });
  } catch (error: any) {
    console.error('Location-to-location sync error:', error);
    return NextResponse.json(
      {
        error: 'Location-to-location sync failed',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

