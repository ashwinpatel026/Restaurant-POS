# Sync System Quick Reference Guide

A concise reference guide for developers working with the sync system.

## Table of Contents

- [Quick Facts](#quick-facts)
- [Sync Tables](#sync-tables)
- [API Endpoints](#api-endpoints)
- [Sync Order](#sync-order)
- [Code Patterns](#code-patterns)
- [Common Issues](#common-issues)

---

## Quick Facts

| Aspect | Details |
|-------|---------|
| **Total Syncable Tables** | 24 tables |
| **Sync Types** | Incremental, Full, Location-to-Location |
| **Default Batch Size** | 100 records |
| **Max Retries** | 3 attempts |
| **Retry Delay** | 1 second (exponential backoff) |
| **Sync ID Type** | UUID |
| **Primary Matching Field** | `sync_id` (not business codes) |

---

## Sync Tables

### Independent Tables (No Dependencies)

| Master Table | Location Table | Key Field |
|-------------|---------------|-----------|
| `tbl_master_tax` | `tbl_tax` | `tax_code` |
| `tbl_master_printer` | `tbl_printer` | `printer_code` |
| `tbl_master_station` | `tbl_station` | `station_code` |
| `tbl_master_department_type` | `tbl_department_type` | `dept_type_code` |
| `tbl_master_department` | `tbl_department` | `dept_code` |
| `tbl_master_time_events` | `tbl_time_events` | `Event_code` |
| `tbl_master_prep_zone` | `tbl_prep_zone` | `prep_zone_code` |
| `tbl_master_discount_master` | `tbl_discount_master` | `discount_code` |
| `tbl_master_suggestion` | `tbl_suggestion` | `suggestion_code` |

### Permission System

| Master Table | Location Table | Dependencies |
|-------------|---------------|--------------|
| `tbl_permission` | `permissions` | None |
| `tbl_role` | `roles` | None |
| `tbl_role_permission` | `role_permissions` | `tbl_permission`, `tbl_role` |

### Menu Hierarchy

| Master Table | Location Table | Dependencies |
|-------------|---------------|--------------|
| `tbl_master_menu_master` | `tbl_menu_master` | None (parent) |
| `tbl_master_menu_category` | `tbl_menu_category` | `tbl_master_menu_master` |
| `tbl_master_menu_item` | `tbl_menu_item` | `tbl_master_menu_master`, `tbl_master_menu_category` |

### Modifier Hierarchy

| Master Table | Location Table | Dependencies |
|-------------|---------------|--------------|
| `tbl_master_modifier_group` | `tbl_modifier_group` | None (parent) |
| `tbl_master_modifier_item` | `tbl_modifier_item` | `tbl_master_modifier_group` |

### Relationship/Junction Tables

| Master Table | Location Table | Dependencies |
|-------------|---------------|--------------|
| `tbl_master_menu_master_event` | `tbl_menu_master_event` | `tbl_master_menu_master`, `tbl_master_time_events` |
| `tbl_master_menu_category_modifier` | `tbl_menu_category_modifier` | `tbl_master_menu_category`, `tbl_master_modifier_group` |
| `tbl_master_menu_item_modifier_group` | `tbl_menu_item_modifier_group` | `tbl_master_menu_item`, `tbl_master_modifier_group` |
| `tbl_master_menuitem_timeevent` | `tbl_menuitem_timeevent` | `tbl_master_menu_item`, `tbl_master_time_events` |

### Special Cases

| Master Table | Location Table | Notes |
|-------------|---------------|-------|
| `tbl_user` | `users` | Individual sync only (not in full sync) |

---

## API Endpoints

### Manual Sync

```http
POST /api/master/sync/manual
Authorization: Bearer {token}
Content-Type: application/json

{
  "locationCode": "STORE01",
  "tableName": "tbl_master_menu_item",  // Optional
  "fullSync": false,                     // Optional
  "forceSync": false                      // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "data": {
    "locationCode": "STORE01",
    "tableName": "tbl_master_menu_item",
    "recordsProcessed": 150,
    "recordsSucceeded": 148,
    "recordsFailed": 2,
    "duration": 5234,
    "errors": []
  }
}
```

### Sync Status

```http
GET /api/master/sync/status?locationCode=STORE01&tableName=tbl_master_menu_item
Authorization: Bearer {token}
```

### Sync Log

```http
GET /api/master/sync/log?locationCode=STORE01&status=0&limit=50
Authorization: Bearer {token}
```

---

## Sync Order

Tables must be synced in this order to satisfy foreign key constraints:

```
1. Independent Tables
   ├─ tbl_master_tax
   ├─ tbl_master_printer
   ├─ tbl_master_station
   ├─ tbl_master_department_type
   ├─ tbl_master_department
   ├─ tbl_master_time_events
   ├─ tbl_master_prep_zone
   ├─ tbl_master_discount_master
   └─ tbl_master_suggestion

2. Permission System
   ├─ tbl_permission
   ├─ tbl_role
   └─ tbl_role_permission

3. Menu Hierarchy
   ├─ tbl_master_menu_master
   ├─ tbl_master_menu_category
   └─ tbl_master_menu_item

4. Modifier Hierarchy
   ├─ tbl_master_modifier_group
   └─ tbl_master_modifier_item

5. Relationship Tables
   ├─ tbl_master_menu_master_event
   ├─ tbl_master_menu_category_modifier
   ├─ tbl_master_menu_item_modifier_group
   └─ tbl_master_menuitem_timeevent
```

---

## Code Patterns

### Sync ID Matching

```typescript
// Find existing record by sync_id
const existing = await locationPrisma.$queryRawUnsafe(`
  SELECT * FROM ${locationTable}
  WHERE sync_id::text = $1
    AND store_code = $2
  LIMIT 1
`, masterRecord.syncId.toString(), storeCode);
```

### Code Generation Pattern

```typescript
// Menu Item Time Event Code: WM{storeCode}MT{sequence}
const prefix = `WM${storeCode}MT`;
const code = `${prefix}${nextSequenceNumber}`;
// Example: WMSTORE01MT1, WMSTORE01MT2
```

### Field Mapping

```typescript
// Use SYNC_FIELD_MAP to map master → location fields
const fieldMap = SYNC_FIELD_MAP[tableName];
const mappedData = {};
for (const [masterField, locationField] of Object.entries(fieldMap)) {
  mappedData[locationField] = masterRecord[masterField];
}
```

### Batch Processing

```typescript
// Process records in batches
const batchSize = 100;
const batches = [];
for (let i = 0; i < records.length; i += batchSize) {
  batches.push(records.slice(i, i + batchSize));
}

for (const batch of batches) {
  await processBatch(batch);
}
```

---

## Common Issues

### Issue: Foreign Key Constraint Violation

**Cause:** Parent table not synced before child table.

**Solution:** Ensure tables are synced in dependency order. Use `SYNC_TABLE_ORDER` constant.

```typescript
const tablesToSync = sortTablesByDependencies(tables);
```

### Issue: Duplicate Code Generation

**Cause:** Code generation logic not checking existing codes properly.

**Solution:** Always query existing codes before generating new ones.

```typescript
const existingCodes = await locationPrisma.$queryRawUnsafe(`
  SELECT code FROM ${table}
  WHERE code LIKE $1
  ORDER BY id DESC
`, `${prefix}%`);
```

### Issue: Sync Log Entry Not Processing

**Cause:** `sync_status` is not 0 (pending), or `location_code` filter excludes it.

**Solution:** Check sync_log entry status and location_code.

```sql
SELECT * FROM sync_log
WHERE sync_status = 0
  AND (location_code = 'STORE01' OR location_code IS NULL);
```

### Issue: Record Not Found During Update

**Cause:** Record doesn't exist in location DB, but operation is UPDATE.

**Solution:** Check if record exists first, use INSERT if not found.

```typescript
const existing = await findRecordBySyncId(syncId, storeCode);
if (existing) {
  await updateRecord(existing.id, data);
} else {
  await insertRecord(data);
}
```

### Issue: Code Mismatch Between Master and Location

**Cause:** Location codes are generated differently (WM prefix).

**Solution:** Always match by `sync_id`, not by business codes.

```typescript
// ❌ Wrong: Match by business code
const record = await findByCode(masterCode);

// ✅ Correct: Match by sync_id
const record = await findBySyncId(syncId);
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/sync/syncService.ts` | Main sync orchestrator |
| `src/lib/sync/syncProcessor.ts` | Record processor |
| `src/lib/sync/types.ts` | Type definitions, table mappings, dependencies |
| `src/lib/sync/syncValidator.ts` | Data validation |
| `src/services/syncService.ts` | Legacy sync functions (legacy full sync) |
| `src/app/api/master/sync/manual/route.ts` | Manual sync API endpoint |

---

## Configuration

### Default Sync Config

```typescript
{
  batchSize: 100,
  maxRetries: 3,
  retryDelay: 1000,        // 1 second
  maxRetryDelay: 60000,    // 60 seconds
  backoffMultiplier: 2,    // Exponential backoff
  enableAutoSync: true,
  autoSyncInterval: 5 * 60 * 1000,  // 5 minutes
  conflictResolution: 'master_wins'
}
```

---

## Testing Sync

### Test Incremental Sync

```bash
# 1. Create/update a record in master DB
# 2. Check sync_log entry created
SELECT * FROM sync_log WHERE sync_status = 0;

# 3. Trigger sync
curl -X POST http://localhost:3000/api/master/sync/manual \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"locationCode": "STORE01", "tableName": "tbl_master_menu_item"}'

# 4. Verify sync_log updated
SELECT * FROM sync_log WHERE sync_status = 1;

# 5. Check location DB
SELECT * FROM tbl_menu_item WHERE sync_id = '{sync_id}';
```

### Test Full Sync

```bash
curl -X POST http://localhost:3000/api/master/sync/manual \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"locationCode": "STORE01", "fullSync": true}'
```

---

## Monitoring

### Check Sync Status

```sql
-- Get sync status for all locations
SELECT 
  location_code,
  table_name,
  last_sync_time,
  last_sync_status,
  total_records_synced,
  last_error_message
FROM sync_status
ORDER BY location_code, table_name;
```

### Check Pending Syncs

```sql
-- Count pending syncs per table
SELECT 
  table_name,
  COUNT(*) as pending_count
FROM sync_log
WHERE sync_status = 0
GROUP BY table_name
ORDER BY pending_count DESC;
```

### Check Failed Syncs

```sql
-- Get failed syncs with errors
SELECT 
  table_name,
  record_id,
  operation,
  error_message,
  retry_count,
  change_time
FROM sync_log
WHERE sync_status = 2
ORDER BY change_time DESC
LIMIT 50;
```

---

## Best Practices Checklist

- [ ] Always sync tables in dependency order
- [ ] Use `sync_id` for record matching, not business codes
- [ ] Process records in batches (default: 100)
- [ ] Validate records before syncing
- [ ] Handle errors gracefully (log and continue)
- [ ] Generate location-specific codes with WM prefix
- [ ] Update `sync_status` after each table sync
- [ ] Monitor `sync_log` for pending entries
- [ ] Use exponential backoff for retries
- [ ] Check foreign key constraints before syncing child tables

---

## Quick Commands

### Trigger Sync via API

```bash
# Incremental sync for specific table
curl -X POST http://localhost:3000/api/master/sync/manual \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"locationCode": "STORE01", "tableName": "tbl_master_menu_item"}'

# Full sync for all tables
curl -X POST http://localhost:3000/api/master/sync/manual \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"locationCode": "STORE01", "fullSync": true}'
```

### Check Sync Status

```bash
curl http://localhost:3000/api/master/sync/status?locationCode=STORE01 \
  -H "Authorization: Bearer {token}"
```

### View Sync Log

```bash
curl "http://localhost:3000/api/master/sync/log?locationCode=STORE01&status=0&limit=50" \
  -H "Authorization: Bearer {token}"
```

---

For detailed documentation, see:
- `SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md` - Full documentation
- `SYNC_SYSTEM_DIAGRAMS.md` - Visual diagrams
- `SYNC_UI_GUIDE.md` - UI usage guide
