/**
 * Sync Status API Endpoint
 * GET /api/master/sync/status
 * Get sync status for locations and tables
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMasterAdmin } from '@/lib/masterAuthHelper';
import { masterPrisma } from '@/lib/databaseManager';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const admin = await verifyMasterAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const locationCode = searchParams.get('locationCode');
    const tableName = searchParams.get('tableName');

    // Build query
    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (locationCode) {
      whereClause += ` AND location_code = $${paramIndex}`;
      params.push(locationCode);
      paramIndex++;
    }

    if (tableName) {
      whereClause += ` AND table_name = $${paramIndex}`;
      params.push(tableName);
      paramIndex++;
    }

    // Get sync status
    const status = await masterPrisma.$queryRawUnsafe(`
      SELECT 
        id,
        location_code as "locationCode",
        table_name as "tableName",
        last_sync_time as "lastSyncTime",
        last_sync_status as "lastSyncStatus",
        total_records_synced as "totalRecordsSynced",
        last_error_message as "lastErrorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM sync_status
      WHERE ${whereClause}
      ORDER BY updated_at DESC
    `);

    // Get pending sync count
    let pendingCountQuery = `
      SELECT COUNT(*) as count
      FROM sync_log
      WHERE sync_status = 0
    `;
    const pendingParams: any[] = [];
    let pendingParamIndex = 1;

    if (locationCode) {
      pendingCountQuery += ` AND (location_code = $${pendingParamIndex} OR location_code IS NULL)`;
      pendingParams.push(locationCode);
      pendingParamIndex++;
    }

    if (tableName) {
      pendingCountQuery += ` AND table_name = $${pendingParamIndex}`;
      pendingParams.push(tableName);
    }

    const pendingCount = await masterPrisma.$queryRawUnsafe(pendingCountQuery);

    return NextResponse.json({
      success: true,
      data: {
        status: status,
        pendingCount: (pendingCount as any[])[0]?.count || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

