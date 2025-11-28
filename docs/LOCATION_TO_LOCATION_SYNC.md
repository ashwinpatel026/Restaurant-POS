# Location-to-Location Clone Sync

## Overview

The location-to-location sync feature allows you to clone all syncable data from one location to another. This is useful for:
- Setting up new locations based on existing ones
- Copying configuration from a template location
- Synchronizing menu structures across locations

## How It Works

1. **Reads** all syncable data from the source location (filtered by `store_code`)
2. **Transforms** all location codes from source format to target format
   - Example: `WMLOC001TAX1` → `WMLOC002TAX1`
3. **Writes** transformed data to target location with new `store_code`
4. **Maintains** all relationships and foreign keys

## Code Transformation

All codes are automatically transformed:
- **Tax codes**: `WMLOC001TAX1` → `WMLOC002TAX1`
- **Printer codes**: `WMLOC001PRT1` → `WMLOC002PRT1`
- **Station codes**: `WMLOC001STA1` → `WMLOC002STA1`
- **Menu codes**: `WMLOC001MM1` → `WMLOC002MM1`
- **Category codes**: `WMLOC001MC1` → `WMLOC002MC1`
- **Item codes**: `WMLOC001MI1` → `WMLOC002MI1`
- **Modifier codes**: `WMLOC001MOD1` → `WMLOC002MOD1`
- And all other code fields...

## API Endpoint

### POST `/api/master/sync/location-to-location`

**Authentication**: Requires master admin authentication (SUPER_ADMIN, COMPANY_ADMIN, or DEALER_ADMIN)

**Request Body**:
```json
{
  "sourceLocationCode": "LOC001",
  "targetLocationCode": "LOC002",
  "tableName": "tbl_master_menu_master",  // Optional: sync specific table
  "fullSync": true,                        // Optional: default true
  "cloneMode": "clone"                     // Optional: "clone" or "merge", default "clone"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Location-to-location sync completed successfully: LOC001 -> LOC002",
  "data": {
    "sourceLocationCode": "LOC001",
    "targetLocationCode": "LOC002",
    "recordsProcessed": 150,
    "recordsSucceeded": 148,
    "recordsFailed": 2,
    "duration": 5234,
    "errors": []
  }
}
```

## Clone Modes

### Clone Mode (`cloneMode: "clone"`)
- **Replaces** all existing data in target location
- If a record exists, it will be **updated**
- If a record doesn't exist, it will be **inserted**
- Use this when you want to completely copy source location to target

### Merge Mode (`cloneMode: "merge"`)
- **Preserves** existing data in target location
- Only **inserts** new records that don't exist
- **Skips** records that already exist (based on `sync_id`)
- Use this when you want to add missing data without overwriting existing data

## Sync Order

Tables are synced in dependency order to ensure foreign key constraints are satisfied:

1. Independent tables (tax, printer, station, time_events, prep_zone)
2. Parent tables (menu_master, modifier_group)
3. Child tables (menu_category, menu_item, modifier_item)
4. Relationship tables (menu_master_event, menu_category_modifier, menu_item_modifier_group)

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:3000/api/master/sync/location-to-location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sourceLocationCode": "LOC001",
    "targetLocationCode": "LOC002",
    "fullSync": true,
    "cloneMode": "clone"
  }'
```

### Using JavaScript/TypeScript
```typescript
const response = await fetch('/api/master/sync/location-to-location', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    sourceLocationCode: 'LOC001',
    targetLocationCode: 'LOC002',
    fullSync: true,
    cloneMode: 'clone'
  })
});

const result = await response.json();
console.log(result);
```

## What Gets Synced

All tables defined in `SYNCABLE_TABLES`:
- ✅ Tax (`tbl_tax`)
- ✅ Printer (`tbl_printer`)
- ✅ Station (`tbl_station`)
- ✅ Time Events (`tbl_time_events`)
- ✅ Prep Zone (`tbl_prep_zone`)
- ✅ Menu Master (`tbl_menu_master`)
- ✅ Menu Category (`tbl_menu_category`)
- ✅ Menu Item (`tbl_menu_item`)
- ✅ Modifier Group (`tbl_modifier_group`)
- ✅ Modifier Item (`tbl_modifier_item`)
- ✅ Menu Master Event (`tbl_menu_master_event`)
- ✅ Menu Category Modifier (`tbl_menu_category_modifier`)
- ✅ Menu Item Modifier Group (`tbl_menu_item_modifier_group`)

## What Doesn't Get Synced

- ❌ User data
- ❌ Order data
- ❌ Transaction data
- ❌ Audit fields (created_by, created_on, etc.)
- ❌ ID fields (auto-increment primary keys)
- ❌ Sync metadata (sync_id is preserved, sync_source is set to 'location')

## Important Notes

1. **Foreign Key Validation**: The system validates that all parent records exist before syncing child records
2. **Code Transformation**: All codes are automatically transformed to match target location format
3. **Store Code**: All records get the target location's `store_code`
4. **Sync ID**: Records keep their original `sync_id` to track cloned records
5. **Sync Source**: Records are marked with `sync_source = 'location'` to indicate they came from another location

## Error Handling

If a sync fails:
- The system will continue processing other records
- Failed records are logged in the `errors` array
- You can retry the sync - it will handle existing records appropriately
- Check the error messages to identify issues (usually foreign key constraints)

## Best Practices

1. **Backup First**: Always backup target location data before cloning
2. **Test on Staging**: Test the clone process on a staging environment first
3. **Verify Results**: Check the sync results and verify data in target location
4. **Use Merge Mode**: Use merge mode if you want to preserve existing data
5. **Sync Specific Tables**: Use `tableName` parameter to sync specific tables if needed

## Troubleshooting

### Foreign Key Errors
- **Issue**: Parent records don't exist in target location
- **Solution**: Ensure parent tables are synced before child tables (automatic)

### Code Conflicts
- **Issue**: Codes already exist in target location
- **Solution**: Use `cloneMode: "merge"` to skip existing records, or clear target location first

### Missing Data
- **Issue**: Some records didn't sync
- **Solution**: Check error messages, verify source location has data, check foreign key constraints

