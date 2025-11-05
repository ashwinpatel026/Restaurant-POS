# Database Connection Optimization Guide

## Problem
First API calls are slow (6-11 seconds) due to cold database connections and lack of connection pooling.

## Solution 1: Optimize DATABASE_URL Connection String

Add connection pooling parameters to your `DATABASE_URL` in `.env`:

```env
# Current format:
DATABASE_URL="postgresql://user:password@host:port/database"

# Optimized format (add these parameters):
DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=20&pool_timeout=10&connect_timeout=5"
```

### Parameters Explained:
- `connection_limit=20` - Maximum number of connections in the pool (adjust based on your server capacity)
- `pool_timeout=10` - Timeout in seconds when acquiring a connection from the pool
- `connect_timeout=5` - Timeout in seconds for establishing initial connection

### Recommended Values:
- **Small app (< 10 concurrent users)**: `connection_limit=10`
- **Medium app (10-50 users)**: `connection_limit=20`
- **Large app (50+ users)**: `connection_limit=50`

## Solution 2: PostgreSQL Server Configuration

If you have access to PostgreSQL server configuration, optimize these settings:

```sql
-- Check current settings
SHOW max_connections;
SHOW shared_buffers;
SHOW effective_cache_size;

-- Recommended settings (adjust based on your server RAM)
-- For 4GB RAM server:
-- max_connections = 100
-- shared_buffers = 1GB
-- effective_cache_size = 3GB
```

## Solution 3: Create Database Indexes

Execute the SQL indexes file to improve query performance:

```bash
# Using psql command line
psql -U your_user -d your_database -f scripts/create_indexes.sql

# Or copy/paste the contents into your database client
```

## Solution 4: Monitor Connection Usage

Check active connections:

```sql
-- View current connections
SELECT count(*) FROM pg_stat_activity;

-- View connections by database
SELECT datname, count(*) 
FROM pg_stat_activity 
GROUP BY datname;

-- View connection details
SELECT pid, usename, datname, state, query_start 
FROM pg_stat_activity 
WHERE datname = 'your_database_name';
```

## Solution 5: Production Build

Development mode compiles on every request. For production:

```bash
npm run build
npm start
```

This pre-compiles everything and uses optimized code.

## Expected Performance After Optimization

- **First API call**: 1-2 seconds (down from 6-11 seconds)
- **Subsequent calls**: < 100ms (cached)
- **With indexes**: 50-80% faster queries

## Troubleshooting

### Still Slow After Optimization?

1. **Check database server resources**:
   - CPU usage
   - Memory usage
   - Disk I/O

2. **Verify indexes are created**:
   ```sql
   SELECT tablename, indexname 
   FROM pg_indexes 
   WHERE schemaname = 'public';
   ```

3. **Check for slow queries**:
   ```sql
   SELECT query, mean_exec_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

4. **Monitor connection pool**:
   - Ensure `connection_limit` matches your database's `max_connections`
   - Check for connection leaks

5. **Consider using a connection pooler** (PgBouncer) for production

## Example Optimized DATABASE_URL

```env
# Development (local PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/restaurant_pos?connection_limit=10&pool_timeout=10&connect_timeout=5"

# Production (with SSL)
DATABASE_URL="postgresql://user:password@host:5432/database?connection_limit=20&pool_timeout=10&connect_timeout=5&sslmode=require"
```

