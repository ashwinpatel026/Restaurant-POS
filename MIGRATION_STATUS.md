# Migration Status

## Current Status

The migration script has been run, but verification shows some items may not have been created. This could be due to:

1. **Silent failures** - Some SQL statements may have failed without throwing errors
2. **Transaction rollback** - If one statement fails, the entire transaction may rollback
3. **Permission issues** - Some operations may require superuser privileges

## Next Steps

### Option 1: Verify Manually

Run these queries to check what was actually created:

**Master Database:**

```sql
-- Check sync_log table
SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_log';

-- Check sync_status table
SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_status';

-- Check triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%_sync';

-- Check sync_id in master tables
SELECT column_name FROM information_schema.columns
WHERE table_name = 'tbl_printer_master' AND column_name = 'sync_id';
```

**Location Database:**

```sql
-- Check UUID extension
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';

-- Check sync_id in location tables
SELECT column_name FROM information_schema.columns
WHERE table_name = 'tbl_printer' AND column_name = 'sync_id';
```

### Option 2: Run Migrations Manually

If the automated script didn't work, run the migrations manually:

1. **Using psql:**

   ```bash
   # Master DB
   psql -h localhost -U username -d master_db -f prisma\migrations\add_sync_system\migration.sql

   # Location DB
   psql -h localhost -U username -d location_db -f prisma\migrations\add_sync_system_location_db\migration.sql
   ```

2. **Using Database GUI:**
   - Open the SQL files in your database client
   - Execute them one section at a time
   - Check for any errors

### Option 3: Run Statements Individually

If you encounter errors, you can run the migration statements one by one to identify which ones fail:

1. Start with UUID extension:

   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

2. Then create sync_log table
3. Then create sync_status table
4. Then add columns to tables
5. Then create triggers

## Common Issues

### "permission denied to create extension"

- **Solution**: Connect as a PostgreSQL superuser or ask your DBA

### "relation does not exist"

- **Solution**: Make sure you're connected to the correct database
- Check that the table names match your actual schema

### "column already exists"

- **Solution**: This is safe to ignore if using `IF NOT EXISTS`

## Verification Checklist

After running migrations, verify:

- [ ] UUID extension exists in both databases
- [ ] `sync_log` table exists in Master DB
- [ ] `sync_status` table exists in Master DB
- [ ] `sync_id` columns added to master tables
- [ ] `sync_id` columns added to location tables
- [ ] Triggers created on master tables
- [ ] Indexes created on sync_id columns

## Need Help?

If migrations are still not working:

1. Check the actual error messages (they may be hidden)
2. Try running statements individually
3. Verify database permissions
4. Check that table names match your schema exactly
