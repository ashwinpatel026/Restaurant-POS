/**
 * @deprecated This dynamic route is deprecated.
 * Please use specific entity routes instead:
 * - /api/pos/sync/[storeCode]/tax
 * - /api/pos/sync/[storeCode]/menu-items
 * - /api/pos/sync/[storeCode]/orders
 * - etc.
 * 
 * This route will be removed in a future version.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPOSClient, verifyStoreCode } from '@/lib/posAuthHelper'
import { posSyncService, getDataSinceLastSync, getModelName } from '@/services/posSyncService'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/location/[storeCode]/[tableName]
 * Pull specific table data from Location DB
 * @deprecated Use specific entity routes instead
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; tableName: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, tableName } = resolvedParams

    // Verify POS authentication
    const authResult = await verifyPOSClient(request, storeCode)
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify store code
    const storeVerification = await verifyStoreCode(storeCode)
    if (!storeVerification.isValid) {
      return NextResponse.json(
        { error: storeVerification.error || 'Invalid store code' },
        { status: 404 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const lastSyncAt = url.searchParams.get('lastSyncAt')
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')
    const incremental = url.searchParams.get('incremental') === 'true'

    // Get model name
    const modelName = getModelName(tableName)
    const model = (locationPrisma as any)[modelName]

    if (!model) {
      return NextResponse.json(
        { error: `Unknown table: ${tableName}` },
        { status: 400 }
      )
    }

    // Build where clause
    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    // Build query options
    const queryOptions: any = {
      where,
      orderBy: { updatedOn: 'desc' }
    }

    if (limit) {
      queryOptions.take = parseInt(limit, 10)
    }

    if (offset) {
      queryOptions.skip = parseInt(offset, 10)
    }

    // Fetch data
    const [data, totalCount] = await Promise.all([
      model.findMany(queryOptions),
      model.count({ where })
    ])

    // Get sync status
    const syncStatus = await posSyncService.getSyncStatus(storeCode)

    return NextResponse.json({
      success: true,
      storeCode,
      tableName,
      lastSyncAt: syncStatus.lastSyncAt,
      syncTimestamp: new Date(),
      incremental,
      pagination: {
        total: totalCount,
        limit: limit ? parseInt(limit, 10) : null,
        offset: offset ? parseInt(offset, 10) : 0,
        returned: data.length
      },
      data,
      metadata: {
        count: data.length,
        lastUpdated: data.length > 0 ? data[0].updatedOn : null
      }
    })
  } catch (error: any) {
    console.error(`Error fetching ${tableName} data:`, error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pos/sync/location/[storeCode]/[tableName]
 * Push table-specific data updates from POS to Location DB
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; tableName: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, tableName } = resolvedParams

    // Verify POS authentication
    const authResult = await verifyPOSClient(request, storeCode)
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify store code
    const storeVerification = await verifyStoreCode(storeCode)
    if (!storeVerification.isValid) {
      return NextResponse.json(
        { error: storeVerification.error || 'Invalid store code' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { data, conflictStrategy, operation } = body

    // Validate data
    if (!data) {
      return NextResponse.json(
        { error: 'Data is required' },
        { status: 400 }
      )
    }

    // Handle different operation types
    const operationType = operation || 'upsert' // upsert, insert, update, delete

    if (operationType === 'delete') {
      // Handle delete operation
      if (!Array.isArray(data) && !data.id && !data.syncId) {
        return NextResponse.json(
          { error: 'For delete operation, provide array of records or id/syncId' },
          { status: 400 }
        )
      }

      const modelName = getModelName(tableName)
      const model = (locationPrisma as any)[modelName]

      if (!model) {
        return NextResponse.json(
          { error: `Unknown table: ${tableName}` },
          { status: 400 }
        )
      }

      // Delete by syncId or id
      const recordsToDelete = Array.isArray(data) ? data : [data]
      let deletedCount = 0

      for (const record of recordsToDelete) {
        try {
          if (record.syncId) {
            await model.deleteMany({
              where: { syncId: record.syncId, storeCode }
            })
          } else if (record.id) {
            await model.deleteMany({
              where: { id: record.id, storeCode }
            })
          }
          deletedCount++
        } catch (error: any) {
          console.error('Error deleting record:', error)
        }
      }

      return NextResponse.json({
        success: true,
        storeCode,
        tableName,
        operation: 'delete',
        deletedCount,
        timestamp: new Date()
      })
    }

    // Handle upsert/insert/update operations
    const records = Array.isArray(data) ? data : [data]

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No records to sync' },
        { status: 400 }
      )
    }

    // Set conflict strategy if provided
    if (conflictStrategy) {
      posSyncService.setConflictStrategy(conflictStrategy as any)
    }

    // Sync data
    const syncResult = await posSyncService.syncDataToLocation(
      storeCode,
      tableName,
      records,
      conflictStrategy as any
    )

    return NextResponse.json({
      success: syncResult.success,
      storeCode,
      tableName,
      operation: operationType,
      recordsProcessed: syncResult.recordsProcessed,
      recordsSucceeded: syncResult.recordsSucceeded,
      recordsFailed: syncResult.recordsFailed,
      errors: syncResult.errors.slice(0, 20), // Limit errors in response
      conflicts: syncResult.conflicts,
      timestamp: new Date()
    })
  } catch (error: any) {
    console.error(`Error syncing ${tableName} data:`, error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

