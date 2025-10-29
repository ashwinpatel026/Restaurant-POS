# PostgreSQL Quick Reference

## What Changed

Your application has been successfully configured to use PostgreSQL instead of MySQL.

### Files Updated:

1. ✅ `prisma/schema.prisma` - Changed provider from `mysql` to `postgresql`
2. ✅ `env.example` - Updated DATABASE_URL format for PostgreSQL
3. ✅ `src/lib/database.ts` - Updated connection messages
4. ✅ `package.json` - Added `pg` package (PostgreSQL driver)

### Files Created:

1. ✅ `POSTGRESQL_MIGRATION_GUIDE.md` - Comprehensive migration guide
2. ✅ `scripts/quick-start-postgresql.bat` - Windows quick start script
3. ✅ `scripts/quick-start-postgresql.sh` - Linux/Mac quick start script
4. ✅ `POSTGRESQL_QUICK_REFERENCE.md` - This file

## Quick Start (3 Steps)

### Step 1: Create PostgreSQL Database

```bash
# Login to PostgreSQL (use your postgres password)
psql -U postgres

# Create database
CREATE DATABASE restaurant_pos;

# Exit
\q
```

### Step 2: Update .env File

Create `.env` from `env.example` and update the DATABASE_URL:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/restaurant_pos?schema=public"
```

Replace `your_password` with your actual PostgreSQL password.

### Step 3: Run Quick Start Script

**Windows:**

```bash
scripts\quick-start-postgresql.bat
```

**Linux/Mac:**

```bash
chmod +x scripts/quick-start-postgresql.sh
./scripts/quick-start-postgresql.sh
```

Or manually run:

```bash
npm install --legacy-peer-deps
npm run db:generate
npm run db:push
npm run seed:simple
npm run seed:menu
npm run seed:tax
npm run dev
```

## Connection String Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

### Examples:

**Local PostgreSQL:**

```
postgresql://postgres:admin@localhost:5432/restaurant_pos?schema=public
```

**Remote PostgreSQL:**

```
postgresql://myuser:mypass@192.168.1.100:5432/restaurant_pos?schema=public
```

**With Special Characters in Password:**

```
postgresql://postgres:p%40ssw0rd@localhost:5432/restaurant_pos?schema=public
```

(Use URL encoding for special characters: @ = %40, # = %23, etc.)

## Common Commands

### Database Management

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Open Prisma Studio (Database GUI)
npm run db:studio

# Create a migration
npm run db:migrate
```

### Seeding

```bash
# Seed all data
npm run seed

# Seed specific data
npm run seed:simple   # Users and basic data
npm run seed:menu     # Menu items
npm run seed:tax      # Tax rates
```

### Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Troubleshooting

### "password authentication failed"

```bash
# Reset PostgreSQL password
psql -U postgres
ALTER USER postgres PASSWORD 'newpassword';
\q
```

Then update your `.env` file with the new password.

### "database does not exist"

```bash
psql -U postgres
CREATE DATABASE restaurant_pos;
\q
```

### "relation already exists"

```bash
# Force reset and push again
npm run db:push -- --force-reset
```

### "Can't reach database server"

- Check if PostgreSQL is running: `pg_isready`
- Check port: Default is 5432
- Check host: Default is localhost
- Verify credentials in `.env`

## Default Admin Credentials

After seeding, use these credentials to login:

- **Username:** `admin`
- **Email:** `admin@restaurant.com`
- **Password:** `admin123`

## PostgreSQL vs MySQL Differences in Your App

### No Code Changes Required! 🎉

Prisma handles all the database-specific differences automatically. Your application code remains the same.

### Behind the Scenes:

- ✅ Auto-increment works the same way
- ✅ DateTime fields handled correctly
- ✅ Enums supported natively in PostgreSQL
- ✅ JSON fields work identically
- ✅ All queries remain unchanged

### Performance Tip:

PostgreSQL is generally faster for complex queries and better at handling concurrent connections than MySQL.

## Backup & Restore

### Backup

```bash
pg_dump -U postgres -d restaurant_pos -F c -f backup.dump
```

### Restore

```bash
pg_restore -U postgres -d restaurant_pos backup.dump
```

### Backup as SQL

```bash
pg_dump -U postgres -d restaurant_pos > backup.sql
```

### Restore from SQL

```bash
psql -U postgres -d restaurant_pos < backup.sql
```

## Next Steps

1. ✅ Ensure PostgreSQL is installed and running
2. ✅ Create the `restaurant_pos` database
3. ✅ Update your `.env` file with PostgreSQL credentials
4. ✅ Run the quick-start script or manual commands
5. ✅ Start the development server: `npm run dev`
6. ✅ Login with admin credentials
7. ✅ Test your application

## Need Help?

Refer to `POSTGRESQL_MIGRATION_GUIDE.md` for detailed information on:

- Installing PostgreSQL
- Migrating existing data from MySQL
- Performance optimization
- Advanced configuration
- Troubleshooting common issues

## Useful PostgreSQL Commands

```bash
# Connect to database
psql -U postgres -d restaurant_pos

# List all databases
\l

# List all tables
\dt

# Describe a table
\d table_name

# Show current database
\c

# Quit
\q

# Execute SQL file
\i filename.sql

# Show table size
\dt+ table_name
```

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [pgAdmin](https://www.pgadmin.org/) - GUI tool for PostgreSQL
