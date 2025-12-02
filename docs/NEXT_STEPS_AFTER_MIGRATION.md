# Next Steps After Master Database Migration

## ✅ Current Status

You've completed the **Master Database migration**. Now you need to:

1. ✅ **Complete Location Database migration**
2. ✅ **Verify both migrations**
3. ✅ **Test the sync system**
4. ✅ **Configure auto-sync (optional)**

---

## Step 1: Complete Location Database Migration

Since you've done the Master DB migration, now run the Location DB migration:

### Option A: Using the Automated Script

```bash
npm run sync:migrate
```

This will run both migrations, but since Master is done, it will skip those and only run Location DB migration.

### Option B: Manual Location DB Migration

```bash
# Using psql
psql -h localhost -U your_username -d location_db -f prisma\migrations\add_sync_system_location_db\migration.sql
```

Or using a database GUI:

1. Connect to your **Location Database**
2. Open: `prisma/migrations/add_sync_system_location_db/migration.sql`
3. Execute the script

---

## Step 2: Verify Both Migrations

### Verify Master Database

```sql
-- 1. Check sync_log table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_log';
-- Should return: sync_log

-- 2. Check sync_status table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_status';
-- Should return: sync_status

-- 3. Check triggers (should show 9+ triggers)
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%_sync';
-- Should return multiple rows

-- 4. Check sync_id column in master table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tbl_printer_master'
AND column_name = 'sync_id';
-- Should return: sync_id | uuid
```

### Verify Location Database

```sql
-- 1. Check UUID extension
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';
-- Should return 1 row

-- 2. Check sync_id column in location table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tbl_printer'
AND column_name = 'sync_id';
-- Should return: sync_id | uuid

-- 3. Check sync_source column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tbl_printer'
AND column_name = 'sync_source';
-- Should return: sync_source | character varying
```

---

## Step 3: Test the Sync System

### 3.1 Test Change Detection

1. **Insert a test record in Master DB:**

   ```sql
   -- Connect to Master DB
   INSERT INTO tbl_printer_master (printer_code, printer_name, is_active, created_by)
   VALUES ('TEST001', 'Test Printer', 1, 1);
   ```

2. **Check if it was logged:**

   ```sql
   -- Still in Master DB
   SELECT * FROM sync_log
   WHERE table_name = 'tbl_printer_master'
   ORDER BY change_time DESC
   LIMIT 1;
   ```

   You should see a new entry with:

   - `operation` = 'INSERT'
   - `sync_status` = 0 (pending)
   - `data` = JSON of the new record

### 3.2 Test Manual Sync

Use the API to trigger a sync:

```bash
# Replace YOUR_TOKEN with your actual auth token
# Replace LOC001 with your actual location code

curl -X POST http://localhost:3000/api/master/sync/manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "locationCode": "LOC001",
    "tableName": "tbl_printer_master"
  }'
```

Or use Postman/Thunder Client:

- **URL**: `POST http://localhost:3000/api/master/sync/manual`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN`
- **Body**:
  ```json
  {
    "locationCode": "LOC001",
    "tableName": "tbl_printer_master"
  }
  ```

### 3.3 Verify Data Synced

Check if the data appeared in Location DB:

```sql
-- Connect to Location DB
SELECT * FROM tbl_printer WHERE sync_id = (
  SELECT record_id FROM sync_log
  WHERE table_name = 'tbl_printer_master'
  ORDER BY change_time DESC LIMIT 1
);
```

---

## Step 4: Important - One-Way Sync Configuration

✅ **Good News**: The sync system is already configured for **one-way sync only** (Master → Location).

### How It Works:

1. **Master DB** is the **source of truth**
2. **Location DB** receives data from Master
3. **No reverse sync** - Location changes never go back to Master
4. **Triggers only on Master DB** - Changes in Location DB are NOT logged

### What This Means:

- ✅ Changes in Master DB → Automatically logged → Synced to Location DB
- ❌ Changes in Location DB → NOT synced back to Master DB
- ✅ Location DB can have local-only data (won't be overwritten)
- ✅ Master DB always wins in conflicts

---

## Step 5: Configure Auto-Sync (Optional)

If you want automatic syncing, you have two options:

### Option A: Vercel Cron (if using Vercel)

Add to `vercel.json`:

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
CRON_SECRET=your-secret-key
```

### Option B: External Cron Service

Set up a cron job to call:

```
POST https://your-domain.com/api/master/sync/auto
Authorization: Bearer YOUR_CRON_SECRET
```

Schedule: Every 5 minutes (`*/5 * * * *`)

### Option C: Background Worker (Node.js)

```typescript
// In your server startup code
import { autoSyncWorker } from "@/lib/sync/autoSyncWorker";

// Start auto-sync (runs every 5 minutes by default)
autoSyncWorker.start();
```

---

## Step 6: Monitor Sync Status

### Check Pending Syncs

```sql
-- In Master DB
SELECT COUNT(*) as pending_count
FROM sync_log
WHERE sync_status = 0;
```

### Check Sync Status Per Location

```sql
-- In Master DB
SELECT location_code, table_name, last_sync_time, last_sync_status, total_records_synced
FROM sync_status
WHERE location_code = 'LOC001'
ORDER BY updated_at DESC;
```

### Check Failed Syncs

```sql
-- In Master DB
SELECT table_name, record_id, operation, error_message, retry_count
FROM sync_log
WHERE sync_status = 2
ORDER BY change_time DESC
LIMIT 20;
```

---

## Step 7: API Endpoints Available

Once migrations are complete, you can use:

### Manual Sync

```
POST /api/master/sync/manual
Body: {
  "locationCode": "LOC001",
  "tableName": "tbl_printer_master",  // Optional
  "fullSync": false                    // Optional
}
```

### Check Sync Status

```
GET /api/master/sync/status?locationCode=LOC001
```

### View Sync Log

```
GET /api/master/sync/log?locationCode=LOC001&status=0&limit=100
```

---

## Troubleshooting

### Issue: "Location not found"

- **Solution**: Make sure the location exists in `master_locations` table with correct `store_code`

### Issue: "Table not found"

- **Solution**: Verify table names match exactly (case-sensitive in PostgreSQL)

### Issue: "No pending syncs"

- **Solution**: Create a test record in Master DB to trigger the sync log

### Issue: "Sync failed"

- **Solution**: Check `sync_log.error_message` for details

---

## Summary Checklist

- [ ] ✅ Master DB migration completed
- [ ] ⬜ Location DB migration completed
- [ ] ⬜ Both migrations verified
- [ ] ⬜ Test change detection (insert in Master, check sync_log)
- [ ] ⬜ Test manual sync via API
- [ ] ⬜ Verify data appears in Location DB
- [ ] ⬜ Configure auto-sync (optional)
- [ ] ⬜ Set up monitoring

---

## Next Actions

1. **Complete Location DB migration** (if not done)
2. **Verify both databases** have sync fields
3. **Test with a sample record**
4. **Configure auto-sync** (if needed)

You're almost there! Once Location DB migration is complete, the sync system will be fully operational. 🚀
