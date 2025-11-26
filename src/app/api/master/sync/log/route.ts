/**
 * Sync Log API Endpoint
 * GET /api/master/sync/log
 * Get sync log entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMasterAdmin } from '@/lib/masterAuthHelper';
import { masterPrisma } from '@/lib/databaseManager';
import { serializeBigInt, toNumber } from '@/lib/utils/bigIntSerializer';

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

    // Build WHERE clause with proper SQL escaping
    const whereParts: string[] = [];
    
    // Escape SQL values to prevent injection
    const escapeSQL = (value: any): string => {
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      }
      return String(value);
    };

    if (locationCode) {
      whereParts.push(`(location_code = ${escapeSQL(locationCode)} OR location_code IS NULL)`);
    }

    if (tableName) {
      whereParts.push(`table_name = ${escapeSQL(tableName)}`);
    }

    if (status !== null) {
      whereParts.push(`sync_status = ${parseInt(status)}`);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

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
      ${whereClause}
      ORDER BY change_time DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Get total count
    const countResult = await masterPrisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM sync_log
      ${whereClause}
    `);

    // Convert BigInt values for JSON serialization
    const serializedEntries = serializeBigInt(entries);
    const totalCount = (countResult as any[])[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        entries: serializedEntries,
        total: toNumber(totalCount),
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

