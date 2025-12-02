# Sync Management UI Guide

## Overview

The Sync Management page provides a complete interface to manage synchronization between Master and Location databases from the Master Dashboard.

## Accessing Sync Management

1. Log in to the **Master Dashboard**
2. Navigate to **"Sync Management"** in the sidebar menu
3. URL: `/master/sync`

## Features

### 1. Filters

At the top of the page, you can filter by:

- **Location**: Select a specific location or view all
- **Table**: Select a specific table or view all tables
- **Refresh**: Manually refresh the data

### 2. Three Main Tabs

#### Tab 1: Sync Status

Shows the sync status for each location/table combination:

- **Location Code**: Which location
- **Table Name**: Which table was synced
- **Last Sync Time**: When the last sync occurred
- **Status**: Success (green) or Failed (red)
- **Records Synced**: Total number of records synced
- **Error**: Any error messages (if failed)

**Use Case**: Monitor which locations and tables have been synced successfully.

#### Tab 2: Sync Log

Shows pending and processed sync entries:

- **Table**: Which table the change is for
- **Operation**: INSERT, UPDATE, or DELETE
- **Record ID**: UUID of the record
- **Change Time**: When the change occurred
- **Status**: Pending, Processed, or Failed
- **Retries**: Number of retry attempts

**Use Case**: See what changes are waiting to be synced or have failed.

#### Tab 3: Manual Sync

Trigger manual synchronization:

- **Incremental Sync**: Syncs only pending changes from `sync_log`
- **Full Sync**: Re-syncs all records from master tables

**Use Case**: Manually trigger sync when needed or after fixing issues.

## How to Use

### Step 1: View Sync Status

1. Go to **Sync Status** tab
2. Select a location (optional)
3. Select a table (optional)
4. View the sync status for each location/table

### Step 2: Check Pending Syncs

1. Go to **Sync Log** tab
2. See all pending syncs (status = 0)
3. Check for any failed syncs (status = 2)
4. Review error messages if any

### Step 3: Trigger Manual Sync

1. Go to **Manual Sync** tab
2. Select a location (required)
3. Select a table (optional - leave empty for all tables)
4. Click **Incremental Sync** or **Full Sync**
5. Wait for sync to complete
6. Check the results in the toast notification

## Example Workflow

### Scenario: You added a printer in Master DB and want to sync it

1. **Add Printer** in Master DB (via `/master/printer`)

   - The trigger automatically logs it to `sync_log`

2. **Check Sync Log**:

   - Go to Sync Management → Sync Log tab
   - You should see a new entry with operation = "INSERT"

3. **Trigger Sync**:

   - Go to Manual Sync tab
   - Select the location you want to sync to
   - Optionally select "Printer Master" table
   - Click "Incremental Sync"

4. **Verify**:
   - Check Sync Status tab to see if sync succeeded
   - The sync_log entry should now show status = 1 (processed)
   - The printer should now exist in Location DB

## Understanding Status Indicators

### Sync Status Badges

- 🟢 **Success (Green)**: Last sync completed successfully
- 🔴 **Failed (Red)**: Last sync failed (check error message)

### Operation Badges

- 🔵 **INSERT (Blue)**: New record created
- 🟡 **UPDATE (Yellow)**: Record updated
- 🔴 **DELETE (Red)**: Record deleted

### Sync Log Status

- 🟡 **Pending**: Waiting to be synced
- 🟢 **Processed**: Successfully synced
- 🔴 **Failed**: Sync failed (check error message)

## Tips

1. **Pending Count**: The yellow badge at the top shows how many pending syncs exist
2. **Refresh**: Use the refresh button to update data without reloading the page
3. **Incremental vs Full**:
   - Use **Incremental** for regular syncing (faster)
   - Use **Full** only when needed (initial setup, recovery)
4. **Filtering**: Use location and table filters to focus on specific data
5. **Error Messages**: Click on error messages to see full details

## Troubleshooting

### No Pending Syncs Showing

- Make sure you've made changes in Master DB
- Check that triggers are working (insert a test record)
- Verify you're looking at the correct location

### Sync Failed

1. Check the error message in Sync Status tab
2. Verify the location exists and is active
3. Check that Location DB is accessible
4. Verify table names match exactly

### Sync Not Working

1. Check that both migrations are complete
2. Verify API endpoints are accessible
3. Check browser console for errors
4. Verify authentication token is valid

## API Integration

The UI uses these API endpoints:

- `GET /api/master/sync/status` - Get sync status
- `GET /api/master/sync/log` - Get sync log entries
- `POST /api/master/sync/manual` - Trigger manual sync

All endpoints require Master Admin authentication.

## Next Steps

After using the UI:

1. ✅ Monitor sync status regularly
2. ✅ Set up auto-sync (optional) for automatic syncing
3. ✅ Review failed syncs and fix issues
4. ✅ Use incremental sync for regular operations
5. ✅ Use full sync only when necessary

---

**The Sync Management UI is now ready to use!** 🚀

Navigate to `/master/sync` in your Master Dashboard to start managing syncs.
