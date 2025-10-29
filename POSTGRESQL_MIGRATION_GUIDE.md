# PostgreSQL Migration Guide

This guide will help you migrate your Restaurant POS application from MySQL to PostgreSQL.

## Prerequisites

- PostgreSQL installed on your system (version 12 or higher recommended)
- Node.js and npm installed
- Your existing MySQL database (optional, if you want to migrate data)

## Step 1: Install PostgreSQL

### Windows

1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer
3. Set a password for the `postgres` superuser (remember this!)
4. Default port is `5432`
5. Complete the installation

### macOS

```bash
brew install postgresql@16
brew services start postgresql@16
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Step 2: Create PostgreSQL Database

### Using psql Command Line

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Create the database
CREATE DATABASE restaurant_pos;

# Create a user (optional, but recommended)
CREATE USER pos_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE restaurant_pos TO pos_user;

# Exit psql
\q
```

### Using pgAdmin (GUI Tool)

1. Open pgAdmin (installed with PostgreSQL)
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → Create → Database
4. Name it `restaurant_pos`
5. Click Save

## Step 3: Update Environment Variables

1. Copy `env.example` to `.env` (if not already done):

```bash
cp env.example .env
```

2. Update the `DATABASE_URL` in `.env`:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/restaurant_pos?schema=public"
```

Replace:

- `postgres` with your PostgreSQL username
- `your_password` with your PostgreSQL password
- `localhost` with your database host (if different)
- `5432` with your port (if different)
- `restaurant_pos` with your database name (if different)

## Step 4: Install Required Packages

The PostgreSQL driver (`pg`) is already included in the dependencies. Just run:

```bash
npm install
```

## Step 5: Generate Prisma Client and Push Schema

```bash
# Generate Prisma Client for PostgreSQL
npm run db:generate

# Push the schema to PostgreSQL database
npm run db:push
```

This will create all the tables in your PostgreSQL database.

## Step 6: Seed the Database (Optional)

If you're starting fresh (no data migration), seed the database:

```bash
# Seed basic data
npm run seed:simple

# Seed menu data
npm run seed:menu

# Seed tax data
npm run seed:tax

# Or run all seeds
npm run seed
```

## Step 7: Verify Connection

Start the development server:

```bash
npm run dev
```

You should see:

```
✅ PostgreSQL database connected successfully
```

Open your browser at `http://localhost:3000` and verify the application works.

## Data Migration from MySQL (Optional)

If you have existing data in MySQL that you want to migrate to PostgreSQL:

### Option 1: Using Prisma Migrate (Recommended for Schema)

1. Keep your MySQL connection temporarily
2. Export data using Prisma Studio:

```bash
npm run db:studio
```

3. Switch to PostgreSQL (follow steps above)
4. Import data manually or use scripts

### Option 2: Using Database Tools

#### Export from MySQL

```bash
mysqldump -u username -p restaurant_pos > mysql_backup.sql
```

#### Convert MySQL dump to PostgreSQL format

Use tools like:

- [pgloader](https://pgloader.io/) - Automated migration tool
- [mysql2postgres](https://github.com/AnatolyUss/mysql2postgres) - Conversion utility

#### Using pgloader (Recommended)

```bash
# Install pgloader
# Windows: Download from https://pgloader.io/
# macOS: brew install pgloader
# Linux: apt-get install pgloader

# Create migration script
pgloader mysql://user:password@localhost/restaurant_pos postgresql://postgres:password@localhost/restaurant_pos
```

### Option 3: Manual Data Export/Import

1. **Export data from MySQL**:

```javascript
// Use MySQL Workbench or phpMyAdmin to export data as CSV
```

2. **Import to PostgreSQL**:

```sql
-- Connect to PostgreSQL
psql -U postgres -d restaurant_pos

-- Import CSV data
COPY users(id, email, username, password, "firstName", "lastName", phone, role, "isActive", "outletId", "createdAt", "updatedAt")
FROM '/path/to/users.csv'
DELIMITER ','
CSV HEADER;
```

## Troubleshooting

### Connection Issues

**Error: "password authentication failed"**

```bash
# Reset PostgreSQL password
sudo -u postgres psql
ALTER USER postgres PASSWORD 'new_password';
\q
```

**Error: "database does not exist"**

```bash
psql -U postgres
CREATE DATABASE restaurant_pos;
\q
```

### Schema Issues

**Error: "relation already exists"**

```bash
# Drop all tables and re-push
npm run db:push -- --force-reset
```

**Error: "Prisma schema validation error"**

```bash
# Regenerate Prisma Client
npm run db:generate
```

### Port Conflicts

If port 5432 is already in use:

1. Find the process: `netstat -ano | findstr :5432` (Windows) or `lsof -i :5432` (Mac/Linux)
2. Change PostgreSQL port in `postgresql.conf`
3. Update your `DATABASE_URL` with the new port

## PostgreSQL vs MySQL Differences

### Data Types

- **MySQL DATETIME** → **PostgreSQL TIMESTAMP**
- **MySQL TEXT** → **PostgreSQL TEXT** (no change)
- **MySQL INT** → **PostgreSQL INTEGER** (handled by Prisma)

### Auto Increment

- MySQL: `AUTO_INCREMENT`
- PostgreSQL: `SERIAL` or `SEQUENCE` (handled by Prisma's `@default(autoincrement())`)

### Date Functions

- MySQL: `NOW()`
- PostgreSQL: `NOW()` or `CURRENT_TIMESTAMP` (both work)

### String Comparison

- MySQL: Case-insensitive by default
- PostgreSQL: Case-sensitive (use `ILIKE` for case-insensitive searches)

## Performance Tips

### 1. Create Indexes

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_menu_items_category ON tbl_Menu_Item("tbl_Menu_Category_Id");
CREATE INDEX idx_modifiers_menu_item ON tbl_Modifier("tbl_Menu_Item_Id");
```

### 2. Connection Pooling

PostgreSQL handles connections differently. Consider using connection pooling:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_pos?schema=public&connection_limit=10&pool_timeout=20"
```

### 3. Vacuum and Analyze

```sql
-- Regular maintenance
VACUUM ANALYZE;
```

## Backup and Restore

### Backup

```bash
pg_dump -U postgres -d restaurant_pos -F c -f restaurant_pos_backup.dump
```

### Restore

```bash
pg_restore -U postgres -d restaurant_pos -F c restaurant_pos_backup.dump
```

## Next Steps

1. ✅ Update your `.env` file with PostgreSQL connection
2. ✅ Run `npm run db:generate` to generate Prisma Client
3. ✅ Run `npm run db:push` to create tables
4. ✅ Run seed scripts if starting fresh
5. ✅ Test your application thoroughly
6. ✅ Update any MySQL-specific queries in your code (if any)

## Support

For issues:

1. Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log` (Linux)
2. Check Prisma logs in your application console
3. Verify connection string in `.env`
4. Ensure PostgreSQL service is running

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
