---
name: Add Menu Item Time Event to Full Sync
overview: Add menu item time event table to the full sync configuration and add special handling to use the dedicated sync function when syncing all tables.
todos:
  - id: add-to-sync-config
    content: Add tbl_master_menuitem_timeevent to SYNC_TABLE_MAP, SYNC_FIELD_MAP, SYNC_ORDER_BY_COLUMN, SYNC_TABLE_ORDER, and SYNC_TABLE_DEPENDENCIES in types.ts
    status: completed
  - id: add-special-handling
    content: Add special handling in syncService.ts to call syncMenuItemTimeEvents() when syncing tbl_master_menuitem_timeevent table
    status: completed
    dependencies:
      - add-to-sync-config
---

# Add Menu Item Time Event Table to Full Sync

## Problem

When syncing all tables from location, the `tbl_master_menuitem_timeevent` table is not included because it's missing from the sync configuration (`SYNCABLE_TABLES`). It only works when syncing that specific table individually due to special handling in the route.

## Solution

Add `tbl_master_menuitem_timeevent` to the sync configuration and add special handling in the sync service to use the dedicated `syncMenuItemTimeEvents()` function.

## Implementation Steps

### 1. Update Sync Configuration (`src/lib/sync/types.ts`)

- Add `tbl_master_menuitem_timeevent` → `tbl_menuitem_timeevent` mapping to `SYNC_TABLE_MAP`
- Add field mappings to `SYNC_FIELD_MAP` (though this table uses special sync logic)
- Add ordering column to `SYNC_ORDER_BY_COLUMN`
- Add table to `SYNC_TABLE_ORDER` after `tbl_master_menu_item` and `tbl_master_time_events` (it depends on both)
- Add dependency entry to `SYNC_TABLE_DEPENDENCIES` indicating it depends on menu items and time events

### 2. Add Special Handling in Sync Service (`src/lib/sync/syncService.ts`)

- Import `syncMenuItemTimeEvents` from `@/services/syncService`
- In `fullSyncTable()` method, add a check: if `tableName === 'tbl_master_menuitem_timeevent'`, call the dedicated `syncMenuItemTimeEvents()` function instead of using the generic sync processor
- Convert the result from `syncMenuItemTimeEvents()` (which returns `{ recordsSynced: number }`) to match the `SyncResult` format expected by the sync service
- Also add the same special handling in `incrementalSyncTable()` method for consistency

### 3. Verify Integration

- Ensure the table appears in `SYNCABLE_TABLES` (it's derived from `SYNC_TABLE_MAP` keys)
- Verify the sync order respects dependencies (menu items and time events must sync before menu item time events)

## Files to Modify

- `src/lib/sync/types.ts` - Add table to sync configuration
- `src/lib/sync/syncService.ts` - Add special handling for menu item time event table

## Notes

- The menu item time event table has complex sync logic (code generation, location-specific codes, etc.) that's already implemented in `syncMenuItemTimeEvents()`, so we'll reuse that function rather than implementing generic sync logic
- The table must sync after both menu items and time events are synced due to foreign key dependencies