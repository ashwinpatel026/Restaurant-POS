/**
 * Sync Status API Endpoint
 * GET /api/master/sync/status
 * Get sync status for locations and tables
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

    // Build WHERE clauses with proper SQL escaping
    const escapeSQL = (value: any): string => {
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      }
      return String(value);
    };

    const statusWhereParts: string[] = [];
    const logWhereParts: string[] = ['sync_status = 0'];

    if (locationCode) {
      statusWhereParts.push(`location_code = ${escapeSQL(locationCode)}`);
      logWhereParts.push(`(location_code = ${escapeSQL(locationCode)} OR location_code IS NULL)`);
    }

    if (tableName) {
      statusWhereParts.push(`table_name = ${escapeSQL(tableName)}`);
      logWhereParts.push(`table_name = ${escapeSQL(tableName)}`);
    }

    const statusWhereClause = statusWhereParts.length > 0 
      ? `WHERE ${statusWhereParts.join(' AND ')}`
      : '';
    
    const logWhereClause = `WHERE ${logWhereParts.join(' AND ')}`;

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
      ${statusWhereClause}
      ORDER BY updated_at DESC
    `);

    // Get pending sync count
    const pendingCount = await masterPrisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM sync_log
      ${logWhereClause}
    `);

    // Convert BigInt values for JSON serialization
    const serializedStatus = serializeBigInt(status);
    const pendingCountValue = (pendingCount as any[])[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        status: serializedStatus,
        pendingCount: toNumber(pendingCountValue),
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

