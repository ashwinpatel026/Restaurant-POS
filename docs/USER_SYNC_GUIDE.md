# User Sync Guide

## How User Creation and Sync Works

### 1. Creating a User in Master Database

When you create a user in `/master/users`:

1. **User Record Created**: User is inserted into `tbl_user` in master database
2. **Store Access Created**: Based on access level, entries are created in `tbl_user_store_access`:
   - **LOCATION**: Creates entry for the selected location's store
   - **COMPANY**: Creates entries for all stores in the company
   - **DEALER**: Creates entries for all stores in the dealer
   - **SUPER_ADMIN**: Creates entry for default store (if provided)
3. **Sync Log Created**: Entries are created in `sync_log` table for:
   - User record (`tbl_user`)
   - Store access records (`tbl_user_store_access`)

### 2. Troubleshooting Store Access Not Created

If `tbl_user_store_access` entries are not being created, check:

1. **Check Console Logs**: The API now logs:

   - Number of locations found
   - Number of store access entries created
   - Any errors during creation

2. **Verify Access Level and IDs**:

   - For **LOCATION**: Must have `locationId` set
   - For **COMPANY**: Must have `companyId` set
   - For **DEALER**: Must have `dealerId` set

3. **Check Database**:

   ```sql
   -- Check if user was created
   SELECT * FROM tbl_user WHERE email = 'user@example.com';

   -- Check if store access was created
   SELECT * FROM tbl_user_store_access WHERE user_id = <user_id>;

   -- Check sync log entries
   SELECT * FROM sync_log WHERE table_name IN ('tbl_user', 'tbl_user_store_access') ORDER BY change_time DESC;
   ```

### 3. How to Sync Users to Location Database

#### Option 1: Manual Sync via Master Dashboard

1. Go to `/master/sync`
2. Select the location/store you want to sync to
3. Select table: `Users` (this will automatically sync `User Store Access` as well)
   - **Note**: When you sync `tbl_user`, the system automatically syncs `tbl_user_store_access` because it's a relationship table
   - You don't need to manually select `tbl_user_store_access` - it syncs automatically!
4. Click "Sync" button
5. The sync processor will:
   - Read sync log entries with `sync_status = 0` (pending)
   - Process INSERT/UPDATE operations
   - Create/update records in location database
   - **Automatically sync dependent tables** (e.g., `tbl_user_store_access` when syncing `tbl_user`)
   - Mark sync log entries as processed (`sync_status = 1`)

#### Option 2: Automatic Sync (if configured)

If auto-sync is enabled, the sync processor will automatically:

- Process pending sync log entries periodically
- **Automatically sync dependent tables** (e.g., when `tbl_user` entries are processed, `tbl_user_store_access` entries are also processed)
- Follow the sync order: `tbl_user` syncs before `tbl_user_store_access`

#### Option 3: API Endpoint (if available)

You can trigger sync via API:

```bash
POST /api/master/sync
{
  "locationCode": "STORE001",
  "tableName": "tbl_user",
  "fullSync": false
}
```

### 4. Sync Process Flow

```
1. User Created in Master DB
   ↓
2. Store Access Entries Created
   ↓
3. Sync Log Entries Created (sync_status = 0)
   ↓
4. Sync Processor Reads Pending Entries
   ↓
5. User Synced to Location DB
   ↓
6. Store Access Synced to Location DB
   ↓
7. Sync Log Marked as Processed (sync_status = 1)
```

### 5. Field Mappings

**User Table (`tbl_user` → `users`)**:

- `email` → `email`
- `username` → `username`
- `password` → `password` (hashed)
- `first_name` → `firstName`
- `last_name` → `lastName`
- `role` → `role`
- `access_level` → `accessLevel`
- `company_id` → `companyId`
- `dealer_id` → `dealerId`
- `location_id` → `locationId`
- `default_store_code` → `defaultStoreCode`
- `is_active` → `isActive`

**Store Access Table (`tbl_user_store_access` → `tbl_user_store_access`)**:

- `user_id` → `userId` (mapped to location user's `id`)
- `store_code` → `storeCode`
- `is_default` → `isDefault`

### 6. Common Issues

**Issue**: Store access not created

- **Solution**: Check console logs, verify locationId/companyId/dealerId is set correctly

**Issue**: User not syncing to location

- **Solution**:
  1. Check sync log entries exist: `SELECT * FROM sync_log WHERE table_name = 'tbl_user' AND sync_status = 0`
  2. Manually trigger sync from `/master/sync`
  3. Check sync processor logs for errors

**Issue**: Store access not syncing

- **Solution**:
  1. **Automatic**: When you sync `tbl_user`, `tbl_user_store_access` syncs automatically (no need to sync separately)
  2. If needed, check sync log: `SELECT * FROM sync_log WHERE table_name = 'tbl_user_store_access' AND sync_status = 0`
  3. The system ensures `tbl_user` syncs before `tbl_user_store_access` based on table dependencies

### 7. Testing

1. **Create a test user**:

   - Access Level: LOCATION
   - Select a location
   - Submit form

2. **Verify in Master DB**:

   ```sql
   SELECT u.*, usa.*
   FROM tbl_user u
   LEFT JOIN tbl_user_store_access usa ON u.user_id = usa.user_id
   WHERE u.email = 'test@example.com';
   ```

3. **Check Sync Log**:

   ```sql
   SELECT * FROM sync_log
   WHERE table_name IN ('tbl_user', 'tbl_user_store_access')
   ORDER BY change_time DESC
   LIMIT 10;
   ```

4. **Trigger Sync**:

   - Go to `/master/sync`
   - Select location
   - Select table: **"Users"** (this will automatically sync both `tbl_user` and `tbl_user_store_access`)
   - Click "Sync" button
   - The system automatically handles the dependency order

5. **Verify in Location DB**:
   ```sql
   SELECT * FROM users WHERE email = 'test@example.com';
   SELECT * FROM tbl_user_store_access WHERE user_id = <user_id>;
   ```
