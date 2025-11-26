# Manual Migration Instructions

If you prefer to run migrations manually using `psql` or a database client, follow these instructions:

## Prerequisites

- PostgreSQL client (`psql`) installed
- Access to both Master and Location databases
- Database connection credentials

## Option 1: Using psql Command Line

### Master Database Migration

```bash
# Windows PowerShell
psql -h localhost -U your_username -d master_db -f prisma\migrations\add_sync_system\migration.sql

# Or with connection string
psql "postgresql://user:password@localhost:5432/master_db" -f prisma\migrations\add_sync_system\migration.sql
```

### Location Database Migration

```bash
# Windows PowerShell
psql -h localhost -U your_username -d location_db -f prisma\migrations\add_sync_system_location_db\migration.sql

# Or with connection string
psql "postgresql://user:password@localhost:5432/location_db" -f prisma\migrations\add_sync_system_location_db\migration.sql
```

## Option 2: Using pgAdmin or DBeaver

1. **Open your database client** (pgAdmin, DBeaver, etc.)

2. **Connect to Master Database**

   - Open SQL Query Editor
   - Copy and paste the contents of `prisma/migrations/add_sync_system/migration.sql`
   - Execute the script

3. **Connect to Location Database**
   - Open SQL Query Editor
   - Copy and paste the contents of `prisma/migrations/add_sync_system_location_db/migration.sql`
   - Execute the script

## Option 3: Using Node.js Script (Recommended)

```bash
# Make sure you have pg installed
npm install pg

# Run the migration script
node scripts/run-sync-migrations.js
```

This script will:

- Read your `.env` file for database URLs
- Connect to both databases
- Run migrations automatically
- Verify the migrations were successful

## Verification

After running migrations, verify they were successful:

### Check Master Database

```sql
-- Check UUID extension
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';

-- Check sync_log table
SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_log';

-- Check sync_status table
SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_status';

-- Check triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%_sync';

-- Check sync_id column in a table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tbl_printer_master'
AND column_name = 'sync_id';
```

### Check Location Database

```sql
-- Check UUID extension
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';

-- Check sync_id column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tbl_printer'
AND column_name = 'sync_id';
```

## Troubleshooting

### Error: "extension uuid-ossp does not exist"

**Solution**: The extension needs to be created manually first:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "permission denied to create extension"

**Solution**: You need superuser privileges. Connect as a superuser or ask your DBA to create the extension.

### Error: "relation already exists"

**Solution**: This is normal if you're re-running migrations. The `IF NOT EXISTS` clauses prevent errors.

### Error: "column already exists"

**Solution**: The migration uses `ADD COLUMN IF NOT EXISTS`, so this shouldn't happen. If it does, the column already exists and you can skip that part.

## Next Steps

After successful migration:

1. ✅ Verify migrations completed successfully
2. ✅ Test sync system with sample data
3. ✅ Configure auto-sync (if needed)
4. ✅ Monitor sync logs
