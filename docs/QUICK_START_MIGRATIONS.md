# Quick Start: Run Sync Migrations

## Step 1: Set Up Environment Variables

Create or update your `.env` file in the project root with your database connection strings:

```env
# Location Database (your main database)
DATABASE_URL=postgresql://username:password@localhost:5432/location_db

# Master Database (your master/tenant database)
MASTER_DATABASE_URL=postgresql://username:password@localhost:5432/master_db
```

**Replace:**

- `username` - Your PostgreSQL username
- `password` - Your PostgreSQL password
- `localhost:5432` - Your database host and port
- `location_db` - Your location database name
- `master_db` - Your master database name

## Step 2: Run the Migration

Simply run:

```bash
npm run sync:migrate
```

The script will:

1. ✅ Connect to both databases
2. ✅ Run all migrations automatically
3. ✅ Verify everything was created correctly
4. ✅ Show you a summary

## Alternative: Manual Migration

If you prefer to run migrations manually or the script doesn't work:

### Using psql (Command Line)

**Master Database:**

```bash
psql -h localhost -U your_username -d master_db -f prisma\migrations\add_sync_system\migration.sql
```

**Location Database:**

```bash
psql -h localhost -U your_username -d location_db -f prisma\migrations\add_sync_system_location_db\migration.sql
```

### Using Database GUI

1. Open your database client (pgAdmin, DBeaver, etc.)
2. Connect to **Master Database**
3. Open and execute: `prisma/migrations/add_sync_system/migration.sql`
4. Connect to **Location Database**
5. Open and execute: `prisma/migrations/add_sync_system_location_db/migration.sql`

## Step 3: Verify

After running migrations, verify they worked:

### Master Database

```sql
-- Should return 1 row
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';

-- Should return sync_log
SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_log';

-- Should return 9+ triggers
SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name LIKE '%_sync';
```

### Location Database

```sql
-- Should return 1 row
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';

-- Should return sync_id column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'tbl_printer' AND column_name = 'sync_id';
```

## Troubleshooting

### "DATABASE_URL not set"

- Make sure you have a `.env` file in the project root
- Check that the variable names are exactly `DATABASE_URL` and `MASTER_DATABASE_URL`

### "Could not connect"

- Verify your database is running
- Check your connection string format
- Verify username/password are correct

### "Permission denied"

- You may need superuser privileges for the UUID extension
- Try connecting as a PostgreSQL superuser

## Next Steps

Once migrations are complete:

1. ✅ Test the sync system
2. ✅ Create a test record in master DB and check `sync_log`
3. ✅ Try a manual sync via API
4. ✅ Set up auto-sync (optional)
