# Sync System Implementation Guide

## Overview

This sync system implements UUID-based synchronization between Master Database and Location Database(s). It supports both manual and automatic synchronization.

## Architecture

```
Master DB (Source)
├── Tables with sync_id (UUID) and sync_source
├── sync_log table (tracks all changes)
└── sync_status table (tracks sync status per location)

    ↓ Sync Process ↓

Location DB (Target)
├── Tables with sync_id (UUID) and sync_source
└── Data synchronized from Master DB
```

## Key Components

### 1. Database Schema

- **sync_log**: Tracks all INSERT/UPDATE/DELETE operations
- **sync_status**: Tracks sync status per location/table
- **sync_id**: UUID field in all syncable tables
- **sync_source**: Tracks where data originated (server/terminal/website)

### 2. Sync Service (`syncService.ts`)

Main orchestrator that:

- Handles manual sync requests
- Processes incremental syncs (pending changes only)
- Processes full syncs (all records)
- Manages sync status

### 3. Sync Processor (`syncProcessor.ts`)

Processes individual sync operations:

- Applies INSERT/UPDATE/DELETE to Location DB
- Handles errors and retries
- Updates sync log status

### 4. Sync Validator (`syncValidator.ts`)

Validates sync entries before processing:

- Checks table existence
- Validates UUID format
- Validates data structure

### 5. Auto Sync Worker (`autoSyncWorker.ts`)

Background worker for automatic synchronization:

- Runs on configurable interval
- Processes pending syncs for all locations
- Can be started/stopped programmatically

## API Endpoints

### Manual Sync

```http
POST /api/master/sync/manual
Content-Type: application/json
Authorization: Bearer <token>

{
  "locationCode": "LOC001",
  "tableName": "tbl_master_printer",  // Optional
  "fullSync": false,                   // Optional
  "forceSync": false                   // Optional
}
```

### Get Sync Status

```http
GET /api/master/sync/status?locationCode=LOC001&tableName=tbl_master_printer
Authorization: Bearer <token>
```

### Get Sync Log

```http
GET /api/master/sync/log?locationCode=LOC001&status=0&limit=100
Authorization: Bearer <token>
```

## Usage Examples

### Manual Sync (Incremental)

```typescript
import { syncService } from "@/lib/sync/syncService";

const result = await syncService.syncToLocation({
  locationCode: "LOC001",
  fullSync: false,
});
```

### Manual Sync (Full)

```typescript
const result = await syncService.syncToLocation({
  locationCode: "LOC001",
  tableName: "tbl_master_printer",
  fullSync: true,
});
```

### Start Auto Sync Worker

```typescript
import { autoSyncWorker } from "@/lib/sync/autoSyncWorker";

// Start worker (runs every 5 minutes by default)
autoSyncWorker.start();

// Stop worker
autoSyncWorker.stop();
```

## Configuration

Sync configuration can be customized:

```typescript
import { SyncService } from "@/lib/sync/syncService";

const customConfig = {
  batchSize: 200,
  maxRetries: 5,
  retryDelay: 2000,
  enableAutoSync: true,
  autoSyncInterval: 10 * 60 * 1000, // 10 minutes
  conflictResolution: "master_wins",
};

const syncService = new SyncService(customConfig);
```

## Database Setup

### 1. Run Master DB Migration

```bash
# Apply migration to Master Database
psql -d master_db -f prisma/migrations/add_sync_system/migration.sql
```

### 2. Run Location DB Migration

```bash
# Apply migration to Location Database
psql -d location_db -f prisma/migrations/add_sync_system_location_db/migration.sql
```

### 3. Verify Triggers

Check that triggers are created:

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%_sync';
```

## Sync Process Flow

1. **Change Detection**: Database triggers automatically log changes to `sync_log`
2. **Sync Trigger**: Manual API call or auto-sync worker triggers sync
3. **Entry Processing**: Sync processor reads pending entries from `sync_log`
4. **Validation**: Validator checks entry before processing
5. **Application**: Processor applies INSERT/UPDATE/DELETE to Location DB
6. **Status Update**: Sync status updated in `sync_log` and `sync_status`

## Error Handling

- **Retry Logic**: Failed syncs are retried with exponential backoff
- **Error Logging**: All errors logged in `sync_log.error_message`
- **Status Tracking**: Failed syncs marked with `sync_status = 2`
- **Max Retries**: After max retries, entry marked as permanently failed

## Monitoring

### Check Pending Syncs

```sql
SELECT COUNT(*)
FROM sync_log
WHERE sync_status = 0;
```

### Check Sync Status

```sql
SELECT *
FROM sync_status
WHERE location_code = 'LOC001';
```

### Check Failed Syncs

```sql
SELECT *
FROM sync_log
WHERE sync_status = 2
ORDER BY change_time DESC;
```

## Troubleshooting

### Sync Not Working

1. Check if triggers are active: `SELECT * FROM sync_log LIMIT 10;`
2. Verify location exists: `SELECT * FROM master_locations WHERE store_code = 'LOC001';`
3. Check for errors: `SELECT * FROM sync_log WHERE sync_status = 2;`

### Performance Issues

1. Increase batch size in config
2. Add indexes on `sync_log` table
3. Process syncs during off-peak hours

### Data Conflicts

1. Review conflict resolution strategy
2. Check `sync_log` for UPDATE operations
3. Manually resolve conflicts if needed

## Security

- All sync endpoints require master admin authentication
- Only authorized roles (SUPER_ADMIN, COMPANY_ADMIN, DEALER_ADMIN) can trigger syncs
- All sync operations are logged with user information
- Data validation prevents invalid data from being synced

## Best Practices

1. **Regular Monitoring**: Check sync status regularly
2. **Incremental Syncs**: Use incremental syncs for regular operations
3. **Full Syncs**: Use full syncs only for initial setup or recovery
4. **Error Handling**: Monitor and resolve failed syncs promptly
5. **Performance**: Adjust batch size based on data volume
6. **Backup**: Always backup before major sync operations

## Future Enhancements

- [ ] Bidirectional sync (Location → Master)
- [ ] Real-time sync via webhooks
- [ ] Sync conflict resolution UI
- [ ] Advanced filtering and selective sync
- [ ] Sync performance analytics dashboard
- [ ] Multi-location batch sync
