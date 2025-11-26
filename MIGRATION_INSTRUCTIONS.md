# Running Sync System Migrations

This guide will help you run the sync system migrations on both Master and Location databases.

## Quick Start (Recommended)

The easiest way is to use the automated migration script:

```bash
npm run sync:migrate
```

This script will:

- ✅ Connect to both databases using your `.env` variables
- ✅ Run all migrations automatically
- ✅ Verify the migrations were successful
- ✅ Show you a summary of what was done

## Prerequisites

Before running migrations, ensure:

1. **Environment Variables are set** in your `.env` file:

   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/location_db
   MASTER_DATABASE_URL=postgresql://user:password@localhost:5432/master_db
   ```

2. **PostgreSQL client (`pg`) is installed**:

   ```bash
   npm install pg
   ```

   (Already included in your dependencies)

3. **You have database access** with appropriate permissions:
   - CREATE EXTENSION permission (for UUID extension)
   - CREATE TABLE permission
   - ALTER TABLE permission

## Method 1: Automated Script (Recommended)

### Step 1: Verify Environment Variables

Check your `.env` file has both database URLs:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/location_db
MASTER_DATABASE_URL=postgresql://username:password@localhost:5432/master_db
```

### Step 2: Run the Migration Script

```bash
npm run sync:migrate
```

### Step 3: Review the Output

The script will show you:

- Connection status for both databases
- Migration progress
- Verification results
- Any errors (if they occur)

## Method 2: Manual Migration with psql

If you prefer to run migrations manually:

### Master Database

```bash
# Windows PowerShell
psql -h localhost -U your_username -d master_db -f prisma\migrations\add_sync_system\migration.sql

# Or with full connection string
psql "postgresql://user:password@localhost:5432/master_db" -f prisma\migrations\add_sync_system\migration.sql
```

### Location Database

```bash
# Windows PowerShell
psql -h localhost -U your_username -d location_db -f prisma\migrations\add_sync_system_location_db\migration.sql

# Or with full connection string
psql "postgresql://user:password@localhost:5432/location_db" -f prisma\migrations\add_sync_system_location_db\migration.sql
```

## Method 3: Using Database GUI (pgAdmin, DBeaver, etc.)

1. **Connect to Master Database**

   - Open SQL Query Editor
   - Open file: `prisma/migrations/add_sync_system/migration.sql`
   - Execute the script

2. **Connect to Location Database**
   - Open SQL Query Editor
   - Open file: `prisma/migrations/add_sync_system_location_db/migration.sql`
   - Execute the script

## Verification

After running migrations, verify everything worked:

### Check Master Database

```sql
-- 1. Check UUID extension
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';

-- 2. Check sync_log table
SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_log';

-- 3. Check sync_status table
SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_status';

-- 4. Check triggers (should show 9+ triggers)
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%_sync';

-- 5. Check sync_id column in a master table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tbl_printer_master'
AND column_name = 'sync_id';
```

### Check Location Database

```sql
-- 1. Check UUID extension
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';

-- 2. Check sync_id column in location table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tbl_printer'
AND column_name = 'sync_id';
```

## What Gets Created

### Master Database

✅ **Tables:**

- `sync_log` - Tracks all changes (INSERT/UPDATE/DELETE)
- `sync_status` - Tracks sync status per location/table

✅ **Columns Added to Master Tables:**

- `sync_id` (UUID) - Unique identifier for sync
- `sync_source` (VARCHAR) - Source of data (server/terminal/website)

✅ **Triggers:**

- Automatic change detection triggers on all syncable tables
- Logs all changes to `sync_log` table

✅ **Functions:**

- `log_sync_change()` - Trigger function for change detection
- `update_sync_status()` - Helper function for status updates

### Location Database

✅ **Columns Added to Location Tables:**

- `sync_id` (UUID) - Matches master sync_id
- `sync_source` (VARCHAR) - Source of data

✅ **Indexes:**

- Unique indexes on `sync_id` for faster lookups

## Troubleshooting

### Error: "extension uuid-ossp does not exist"

**Solution**: Run this first:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "permission denied to create extension"

**Solution**: You need superuser privileges. Options:

1. Connect as a PostgreSQL superuser
2. Ask your DBA to create the extension
3. Use a user with CREATEEXTENSION privilege

### Error: "relation already exists"

**Solution**: This is normal if re-running migrations. The `IF NOT EXISTS` clauses prevent actual errors.

### Error: "column already exists"

**Solution**: The migration uses `ADD COLUMN IF NOT EXISTS`, so this is safe to ignore.

### Error: "connection refused" or "could not connect"

**Solution**:

1. Check database is running
2. Verify connection string in `.env`
3. Check firewall/network settings
4. Verify username/password

## Next Steps

After successful migration:

1. ✅ **Test the sync system** with sample data
2. ✅ **Verify triggers are working** - Insert a record in master DB and check `sync_log`
3. ✅ **Run a test sync** - Use the manual sync API endpoint
4. ✅ **Set up auto-sync** - Configure cron job or background worker
5. ✅ **Monitor sync logs** - Check `sync_log` and `sync_status` tables

## Need Help?

If you encounter issues:

1. Check the error message carefully
2. Verify your database connection strings
3. Ensure you have the required permissions
4. Review the migration SQL files directly
5. Check the verification queries above

## Migration Files

- **Master DB**: `prisma/migrations/add_sync_system/migration.sql`
- **Location DB**: `prisma/migrations/add_sync_system_location_db/migration.sql`

Both files are idempotent (safe to run multiple times) thanks to `IF NOT EXISTS` clauses.
