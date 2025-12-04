/**
 * @deprecated This comprehensive data endpoint is deprecated.
 * Please use specific entity routes instead:
 * - GET /api/pos/sync/[storeCode]/tax
 * - GET /api/pos/sync/[storeCode]/menu-items
 * - GET /api/pos/sync/[storeCode]/orders
 * - etc.
 * 
 * This route will be removed in a future version.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPOSClient, verifyStoreCode } from '@/lib/posAuthHelper'
import { posSyncService, getDataSinceLastSync, getModelName } from '@/services/posSyncService'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/location/[storeCode]/data
 * Pull all store data from Location DB (comprehensive sync)
 * @deprecated Use specific entity routes instead
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

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
    const table = url.searchParams.get('table') // Optional: specific table
    const incremental = url.searchParams.get('incremental') === 'true'

    const syncDate = lastSyncAt ? new Date(lastSyncAt) : undefined

    // Define tables to sync
    const tables = [
      'menu_masters',
      'menu_categories',
      'menu_items',
      'modifier_groups',
      'modifier_items',
      'prep_zones',
      'time_events',
      'tax',
      'stations',
      'printers',
      'orders',
      'order_items',
      'tables'
    ]

    const tablesToSync = table ? [table] : tables

    const result: Record<string, any[]> = {}
    const syncMetadata: Record<string, any> = {}

    // Fetch data for each table
    for (const tableName of tablesToSync) {
      try {
        const modelName = getModelName(tableName)
        const model = (locationPrisma as any)[modelName]

        if (!model) {
          console.warn(`Model not found for table: ${tableName}`)
          continue
        }

        // Build where clause
        const where: any = { storeCode }
        if (incremental && syncDate) {
          where.updatedOn = { gte: syncDate }
        }

        // Fetch data
        const data = await model.findMany({
          where,
          orderBy: { updatedOn: 'desc' }
        })

        result[tableName] = data

        // Store metadata
        syncMetadata[tableName] = {
          count: data.length,
          lastUpdated: data.length > 0 ? data[0].updatedOn : null
        }
      } catch (error: any) {
        console.error(`Error fetching ${tableName}:`, error)
        result[tableName] = []
        syncMetadata[tableName] = {
          count: 0,
          error: error.message
        }
      }
    }

    // Get sync status
    const syncStatus = await posSyncService.getSyncStatus(storeCode)

    return NextResponse.json({
      success: true,
      storeCode,
      lastSyncAt: syncStatus.lastSyncAt,
      syncTimestamp: new Date(),
      incremental,
      data: result,
      metadata: syncMetadata,
      summary: {
        totalTables: tablesToSync.length,
        tablesWithData: Object.values(result).filter((arr) => arr.length > 0).length,
        totalRecords: Object.values(result).reduce((sum, arr) => sum + arr.length, 0)
      }
    })
  } catch (error: any) {
    console.error('Error fetching store data:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pos/sync/location/[storeCode]/data
 * Push store data updates from POS to Location DB (comprehensive sync)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

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
    const { data, conflictStrategy } = body

    // Validate data structure
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid data format. Expected object with table names as keys.' },
        { status: 400 }
      )
    }

    const results: Record<string, any> = {}
    let totalProcessed = 0
    let totalSucceeded = 0
    let totalFailed = 0
    const allErrors: string[] = []
    const allConflicts: any[] = []

    // Process each table
    for (const [tableName, records] of Object.entries(data)) {
      if (!Array.isArray(records)) {
        results[tableName] = {
          success: false,
          error: 'Data must be an array'
        }
        continue
      }

      try {
        // Set conflict strategy if provided
        if (conflictStrategy) {
          posSyncService.setConflictStrategy(conflictStrategy as any)
        }

        // Sync data for this table
        const syncResult = await posSyncService.syncDataToLocation(
          storeCode,
          tableName,
          records,
          conflictStrategy as any
        )

        totalProcessed += syncResult.recordsProcessed
        totalSucceeded += syncResult.recordsSucceeded
        totalFailed += syncResult.recordsFailed

        if (syncResult.errors.length > 0) {
          allErrors.push(...syncResult.errors.map((e) => `${tableName}: ${e}`))
        }

        if (syncResult.conflicts.length > 0) {
          allConflicts.push(...syncResult.conflicts)
        }

        results[tableName] = {
          success: syncResult.success,
          recordsProcessed: syncResult.recordsProcessed,
          recordsSucceeded: syncResult.recordsSucceeded,
          recordsFailed: syncResult.recordsFailed,
          errors: syncResult.errors,
          conflicts: syncResult.conflicts
        }
      } catch (error: any) {
        totalFailed += records.length
        allErrors.push(`${tableName}: ${error.message}`)
        results[tableName] = {
          success: false,
          error: error.message,
          recordsProcessed: records.length,
          recordsSucceeded: 0,
          recordsFailed: records.length
        }
      }
    }

    return NextResponse.json({
      success: totalFailed === 0,
      storeCode,
      summary: {
        totalTables: Object.keys(data).length,
        totalRecordsProcessed: totalProcessed,
        totalRecordsSucceeded: totalSucceeded,
        totalRecordsFailed: totalFailed
      },
      results,
      errors: allErrors.slice(0, 50), // Limit errors in response
      conflicts: allConflicts,
      timestamp: new Date()
    })
  } catch (error: any) {
    console.error('Error syncing store data:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

