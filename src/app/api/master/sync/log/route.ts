/**
 * Sync Log API Endpoint
 * GET /api/master/sync/log
 * Get sync log entries
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
    const status = searchParams.get('status'); // 0=pending, 1=processed, 2=failed
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (locationCode) {
      whereClause += ` AND (location_code = $${paramIndex} OR location_code IS NULL)`;
      params.push(locationCode);
      paramIndex++;
    }

    if (tableName) {
      whereClause += ` AND table_name = $${paramIndex}`;
      params.push(tableName);
      paramIndex++;
    }

    if (status !== null) {
      whereClause += ` AND sync_status = $${paramIndex}`;
      params.push(parseInt(status));
      paramIndex++;
    }

    // Get sync log entries
    const entries = await masterPrisma.$queryRawUnsafe(`
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
      ORDER BY change_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...params, limit, offset);

    // Get total count
    const countResult = await masterPrisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM sync_log
      WHERE ${whereClause}
    `, ...params);

    return NextResponse.json({
      success: true,
      data: {
        entries: entries,
        total: (countResult as any[])[0]?.count || 0,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('Error fetching sync log:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

