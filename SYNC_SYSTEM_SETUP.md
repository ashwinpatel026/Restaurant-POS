# Sync System Setup Guide

## Quick Start

Follow these steps to set up the UUID-based sync system:

## Step 1: Database Migrations

### Master Database

1. Connect to your Master PostgreSQL database
2. Run the migration script:

```bash
psql -h localhost -U your_user -d master_db -f prisma/migrations/add_sync_system/migration.sql
```

Or using psql directly:
```sql
\i prisma/migrations/add_sync_system/migration.sql
```

### Location Database

1. Connect to your Location PostgreSQL database
2. Run the migration script:

```bash
psql -h localhost -U your_user -d location_db -f prisma/migrations/add_sync_system_location_db/migration.sql
```

Or using psql directly:
```sql
\i prisma/migrations/add_sync_system_location_db/migration.sql
```

## Step 2: Verify Installation

### Check UUID Extension
```sql
-- Run on both databases
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';
```

### Check Sync Tables
```sql
-- Master DB
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('sync_log', 'sync_status');

-- Check sync fields added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tbl_printer_master' 
AND column_name IN ('sync_id', 'sync_source');
```

### Check Triggers
```sql
-- Master DB
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%_sync';
```

## Step 3: Test Sync System

### Test Manual Sync

1. Create a test record in Master DB:
```sql
INSERT INTO tbl_printer_master (printer_code, printer_name, is_active, created_by)
VALUES ('TEST001', 'Test Printer', 1, 1);
```

2. Check sync_log:
```sql
SELECT * FROM sync_log WHERE table_name = 'tbl_printer_master' ORDER BY change_time DESC LIMIT 1;
```

3. Trigger manual sync via API:
```bash
curl -X POST http://localhost:3000/api/master/sync/manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "locationCode": "LOC001",
    "tableName": "tbl_printer_master"
  }'
```

4. Verify data in Location DB:
```sql
SELECT * FROM tbl_printer WHERE sync_id = (SELECT sync_id FROM sync_log WHERE table_name = 'tbl_printer_master' ORDER BY change_time DESC LIMIT 1);
```

## Step 4: Configure Auto Sync

### Option 1: Using Vercel Cron (Recommended for Vercel deployments)

Create or update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/master/sync/auto",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Set environment variable:
```
CRON_SECRET=your-secret-key-here
```

### Option 2: Using External Cron Service

Set up a cron job to call:
```
POST https://your-domain.com/api/master/sync/auto
Authorization: Bearer YOUR_CRON_SECRET
```

Schedule: Every 5 minutes (`*/5 * * * *`)

### Option 3: Using Node.js Background Worker

```typescript
// In your server startup code
import { autoSyncWorker } from '@/lib/sync/autoSyncWorker';

// Start auto-sync worker
autoSyncWorker.start();
```

## Step 5: Environment Variables

Add to your `.env` file:

```env
# Database URLs (already configured)
DATABASE_URL=postgresql://user:pass@localhost:5432/location_db
MASTER_DATABASE_URL=postgresql://user:pass@localhost:5432/master_db

# Optional: Cron secret for auto-sync endpoint
CRON_SECRET=your-secret-key-here

# Optional: Auto-sync configuration
ENABLE_AUTO_SYNC=true
```

## Step 6: Update Prisma Schema (If Needed)

If you're using Prisma, you may need to add sync fields to your schema. However, since we're using raw SQL migrations, the Prisma schema can remain as-is for now. The sync fields are managed directly in the database.

## Step 7: Test Full Sync

Test a full sync to ensure all existing data is synced:

```bash
curl -X POST http://localhost:3000/api/master/sync/manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "locationCode": "LOC001",
    "tableName": "tbl_printer_master",
    "fullSync": true
  }'
```

## Monitoring

### Check Sync Status
```bash
curl http://localhost:3000/api/master/sync/status?locationCode=LOC001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Sync Log
```bash
curl "http://localhost:3000/api/master/sync/log?locationCode=LOC001&status=0&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Database Queries

Check pending syncs:
```sql
SELECT COUNT(*) as pending_count 
FROM sync_log 
WHERE sync_status = 0;
```

Check sync status per location:
```sql
SELECT location_code, table_name, last_sync_time, last_sync_status, total_records_synced
FROM sync_status
ORDER BY updated_at DESC;
```

Check failed syncs:
```sql
SELECT table_name, record_id, operation, error_message, retry_count
FROM sync_log
WHERE sync_status = 2
ORDER BY change_time DESC
LIMIT 20;
```

## Troubleshooting

### Issue: Triggers not firing
**Solution**: Verify triggers are created:
```sql
SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%_sync';
```

### Issue: UUID extension not found
**Solution**: Enable extension:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Issue: Sync not working
**Check**:
1. Database connections are correct
2. Location exists in master_locations table
3. Tables exist in both databases
4. Check sync_log for errors

### Issue: Performance problems
**Solutions**:
1. Increase batch size in sync config
2. Add indexes on sync_log table
3. Process syncs during off-peak hours
4. Use incremental sync instead of full sync

## Next Steps

1. **Monitor**: Set up monitoring for sync status
2. **Alerts**: Configure alerts for failed syncs
3. **Optimize**: Adjust batch sizes based on data volume
4. **Document**: Document your specific sync requirements
5. **Test**: Test sync with production-like data volumes

## Support

For issues or questions:
1. Check `SYNC_SYSTEM_ROADMAP.md` for detailed architecture
2. Review `src/lib/sync/README.md` for implementation details
3. Check sync_log table for error messages
4. Review application logs for detailed error information

