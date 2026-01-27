# Sync System Visual Diagrams

This document contains detailed visual diagrams of the sync system architecture, flows, and table relationships.

## Table of Contents

1. [System Architecture Diagrams](#system-architecture-diagrams)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Table Relationship Diagrams](#table-relationship-diagrams)
4. [Sync Process Flowcharts](#sync-process-flowcharts)
5. [Error Handling Flows](#error-handling-flows)

---

## System Architecture Diagrams

### Complete System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MASTER DATABASE                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Master Tables (tbl_master_*)                            │  │
│  │  • tbl_master_menu_master                                 │  │
│  │  • tbl_master_menu_category                               │  │
│  │  • tbl_master_menu_item                                   │  │
│  │  • tbl_master_time_events                                 │  │
│  │  • tbl_master_menuitem_timeevent                          │  │
│  │  • ... (24 total tables)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Sync Tracking Tables                                    │  │
│  │  • sync_log (change tracking)                            │  │
│  │  • sync_status (sync history)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Sync Operations
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SYNC SERVICE LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ SyncService  │→ │SyncProcessor │→ │SyncValidator │          │
│  │ Orchestrator │  │   Processor  │  │   Validator  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                │                │                     │
│         └────────────────┴────────────────┘                     │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │ Sync Config │                              │
│                    │ • Batch Size│                              │
│                    │ • Retries   │                              │
│                    │ • Delays    │                              │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Apply Changes
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOCATION DATABASES                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐│
│  │ Location DB 1  │  │ Location DB 2  │  │ Location DB N    ││
│  │ (STORE01)       │  │ (STORE02)       │  │ (STOREN)         ││
│  │                 │  │                 │  │                 ││
│  │ • tbl_menu_*    │  │ • tbl_menu_*    │  │ • tbl_menu_*    ││
│  │ • store_code    │  │ • store_code    │  │ • store_code    ││
│  │ • sync_id       │  │ • sync_id       │  │ • sync_id       ││
│  └──────────────────┘  └──────────────────┘  └──────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction

```
┌─────────────┐
│   API Call  │
│ /sync/manual│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    SyncService                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Validate Location                                  │  │
│  │ 2. Determine Tables to Sync                          │  │
│  │ 3. Sort by Dependencies                              │  │
│  │ 4. Process Each Table                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
       │
       ├──────────────────────────────────────────────────────┐
       │                                                       │
       ▼                                                       ▼
┌──────────────────────┐                          ┌──────────────────────┐
│  Incremental Sync    │                          │    Full Sync         │
│                      │                          │                      │
│ 1. Query sync_log    │                          │ 1. Query master table│
│    (pending entries) │                          │ 2. Get all records   │
│ 2. Process batches   │                          │ 3. Upsert to location│
│ 3. Update sync_log   │                          │ 4. Update sync_status│
└──────────────────────┘                          └──────────────────────┘
       │                                                       │
       └──────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │   SyncProcessor      │
                    │                      │
                    │ • Map fields         │
                    │ • Generate codes     │
                    │ • Handle operations  │
                    │ • Apply to DB        │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │   Location Database  │
                    │                      │
                    │ • INSERT/UPDATE/     │
                    │   DELETE records    │
                    └──────────────────────┘
```

---

## Data Flow Diagrams

### Incremental Sync Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Change Detection                                         │
└──────────────────────────────────────────────────────────────────┘
    User Action
        │
        ▼
┌─────────────────┐
│ Master Table    │  INSERT/UPDATE/DELETE
│ Record Modified │────────────────────────┐
└─────────────────┘                        │
                                           │
                                           ▼
                              ┌──────────────────────┐
                              │ Database Trigger     │
                              │ sync_log_trigger()   │
                              └──────────────────────┘
                                           │
                                           ▼
                              ┌──────────────────────┐
                              │ Insert into sync_log │
                              │ • table_name         │
                              │ • record_id (UUID)   │
                              │ • operation          │
                              │ • data (JSONB)       │
                              │ • sync_status = 0    │
                              └──────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Sync Initiation                                         │
└──────────────────────────────────────────────────────────────────┘
    API Request
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/master/sync/manual                                    │
│ {                                                               │
│   "locationCode": "STORE01",                                    │
│   "tableName": "tbl_master_menu_item",  // Optional            │
│   "fullSync": false                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ SyncService.syncToLocation()                                    │
│                                                                 │
│ 1. Validate location exists                                    │
│ 2. Determine tables to sync:                                    │
│    - If tableName specified → single table                      │
│    - If fullSync=true → all tables                             │
│    - Otherwise → tables with pending sync_log entries          │
│ 3. Sort tables by dependency order                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Process Tables                                          │
└──────────────────────────────────────────────────────────────────┘
    For each table (in dependency order)
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ Query sync_log for pending entries                              │
│                                                                 │
│ SELECT * FROM sync_log                                          │
│ WHERE table_name = 'tbl_master_menu_item'                       │
│   AND sync_status = 0                                           │
│   AND (location_code = 'STORE01' OR location_code IS NULL)      │
│ ORDER BY change_time ASC                                        │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ Group into batches (default: 100 records)                      │
│                                                                 │
│ Batch 1: [entry1, entry2, ..., entry100]                      │
│ Batch 2: [entry101, entry102, ..., entry200]                   │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: Process Batch                                           │
└──────────────────────────────────────────────────────────────────┘
    For each batch
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ SyncProcessor.processBatch()                                    │
│                                                                 │
│ For each entry in batch:                                        │
│   ├─ Validate record data                                      │
│   ├─ Map master fields → location fields                       │
│   ├─ Generate location-specific codes (if needed)               │
│   ├─ Check if record exists (by sync_id)                       │
│   └─ Execute operation:                                         │
│      ├─ INSERT: Insert new record                              │
│      ├─ UPDATE: Update existing record                         │
│      └─ DELETE: Delete record                                 │
└─────────────────────────────────────────────────────────────────┘
        │
        ├──────────────────┬──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    ┌────────┐      ┌────────┐      ┌────────┐
    │Success │      │ Error  │      │ Retry  │
    └────────┘      └────────┘      └────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Update      │  │ Log error    │  │ Increment    │
│ sync_log    │  │ Update       │  │ retry_count  │
│ status = 1  │  │ sync_log     │  │ Wait & retry │
│ synced_at   │  │ status = 2   │  │ (if < max)   │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: Update Sync Status                                      │
└──────────────────────────────────────────────────────────────────┘
    After all batches processed
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ Update sync_status table                                        │
│                                                                 │
│ INSERT/UPDATE sync_status                                       │
│ SET last_sync_time = NOW(),                                     │
│     last_sync_status = 0 (success) or 1 (failed),             │
│     total_records_synced = total,                              │
│     last_error_message = errors                                │
│ WHERE location_code = 'STORE01'                                │
│   AND table_name = 'tbl_master_menu_item'                       │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ Return result to API                                            │
│ {                                                               │
│   "success": true,                                             │
│   "recordsProcessed": 150,                                     │
│   "recordsSucceeded": 148,                                     │
│   "recordsFailed": 2,                                          │
│   "duration": 5234                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Full Sync Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ Full Sync Process (Simplified)                                   │
└──────────────────────────────────────────────────────────────────┘

    API Request (fullSync: true)
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ SyncService.syncToLocation(fullSync=true)                       │
│                                                                 │
│ 1. Get all syncable tables                                      │
│ 2. Sort by dependency order                                     │
│ 3. For each table:                                              │
│    └─ Call fullSyncTable()                                      │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ fullSyncTable(locationCode, tableName)                          │
│                                                                 │
│ 1. Query ALL records from master table                         │
│    SELECT * FROM {tableName}                                    │
│    WHERE is_active = 1                                          │
│    ORDER BY {order_column}                                      │
│                                                                 │
│ 2. For each record:                                             │
│    ├─ Check if exists in location (by sync_id)                 │
│    ├─ If exists: UPDATE                                         │
│    └─ If not exists: INSERT                                      │
│                                                                 │
│ 3. Update sync_status                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Table Relationship Diagrams

### Menu Hierarchy Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    MENU HIERARCHY                               │
└─────────────────────────────────────────────────────────────────┘

Level 1: Independent
┌──────────────────────┐
│ tbl_master_time_events│
│ • Event_code (PK)     │
│ • EventName           │
│ • dept_code           │
└──────────────────────┘
         │
         │ Referenced by
         ▼
Level 2: Menu Master
┌──────────────────────┐
│ tbl_master_menu_master│
│ • menu_master_code (PK)│
│ • name                │
│ • is_event_menu       │
└──────────────────────┘
         │
         │ Referenced by
         ├──────────────────────┬──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ tbl_master_menu  │  │ tbl_master_menu  │  │ tbl_master_menu  │
│ _category        │  │ _master_event    │  │ _item            │
│                  │  │                  │  │                  │
│ • menu_category_ │  │ • menu_master_   │  │ • menu_item_code │
│   code (PK)      │  │   code (FK)      │  │   (PK)           │
│ • menu_master_   │  │ • event_code     │  │ • menu_master_   │
│   code (FK)      │  │   (FK)           │  │   code (FK)      │
└──────────────────┘  └──────────────────┘  │ • menu_category_ │
         │                                    │   code (FK)      │
         │                                    └──────────────────┘
         │ Referenced by                            │
         ▼                                          │ Referenced by
┌──────────────────────────────────────────────────┐
│ tbl_master_menu_category_modifier                │
│ • menu_category_code (FK)                        │
│ • modifier_group_code (FK)                       │
└──────────────────────────────────────────────────┘
                                              │
                                              │ Referenced by
                                              ▼
                              ┌──────────────────────────────────┐
                              │ tbl_master_menu_item_modifier_   │
                              │ group                            │
                              │ • menu_item_code (FK)            │
                              │ • modifier_group_code (FK)       │
                              └──────────────────────────────────┘
                                              │
                                              │ Referenced by
                                              ▼
                              ┌──────────────────────────────────┐
                              │ tbl_master_menuitem_timeevent     │
                              │ • menu_item_code (FK)            │
                              │ • time_event_code (FK)           │
                              │ • formula_value                  │
                              └──────────────────────────────────┘
```

### Complete Dependency Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYNC DEPENDENCY TREE                         │
└─────────────────────────────────────────────────────────────────┘

Phase 1: Independent Tables (No Dependencies)
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Tax         │ Printer     │ Station     │ Dept Type   │
└─────────────┴─────────────┴─────────────┴─────────────┘
       │             │             │             │
       │             │             │             │
       ▼             ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Department  │ │ Prep Zone   │ │ Time Events │
│ (depends on │ │ (depends on │ │ (independent)│
│ Tax &       │ │ Station &   │ │             │
│ Dept Type)  │ │ Printer)    │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
                                              │
                                              │
Phase 2: Permission System                    │
┌─────────────┐                              │
│ Permission  │                              │
└─────────────┘                              │
       │                                      │
       │                                      │
       ▼                                      │
┌─────────────┐                              │
│ Role        │                              │
└─────────────┘                              │
       │                                      │
       │                                      │
       ▼                                      │
┌─────────────┐                              │
│ Role        │                              │
│ Permission  │                              │
│ (depends on │                              │
│ Permission  │                              │
│ & Role)     │                              │
└─────────────┘                              │
                                              │
Phase 3: Menu Hierarchy                       │
┌─────────────┐                              │
│ Menu Master │                              │
└─────────────┘                              │
       │                                      │
       ├──────────────────────────────────────┘
       │                                      │
       ▼                                      │
┌─────────────┐                    ┌─────────────┐
│ Menu        │                    │ Menu Master│
│ Category    │                    │ Event      │
│ (depends on │                    │ (depends on│
│ Menu Master)│                    │ Menu Master│
└─────────────┘                    │ & Time     │
       │                           │ Events)    │
       │                           └─────────────┘
       │
       ▼
┌─────────────┐
│ Menu Item   │
│ (depends on │
│ Menu Master │
│ & Category) │
└─────────────┘
       │
       ├──────────────────────────────┐
       │                              │
       ▼                              ▼
┌─────────────┐            ┌──────────────────────┐
│ Menu Item   │            │ Menu Item            │
│ Modifier    │            │ Time Event           │
│ Group       │            │ (depends on          │
│ (depends on │            │ Menu Item &          │
│ Menu Item & │            │ Time Events)         │
│ Modifier    │            └──────────────────────┘
│ Group)      │
└─────────────┘

Phase 4: Modifier Hierarchy
┌─────────────┐
│ Modifier    │
│ Group       │
└─────────────┘
       │
       │
       ▼
┌─────────────┐
│ Modifier    │
│ Item        │
│ (depends on │
│ Modifier    │
│ Group)      │
└─────────────┘
```

---

## Sync Process Flowcharts

### Complete Sync Lifecycle

```
                    ┌─────────────────────┐
                    │   User Action       │
                    │ (Create/Update/     │
                    │  Delete Record)     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Database Trigger    │
                    │ Fires on Master     │
                    │ Table Change        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Insert sync_log     │
                    │ Entry               │
                    │ • status = 0        │
                    │ • operation         │
                    │ • data (JSONB)      │
                    └──────────┬──────────┘
                               │
                               │ (Waits for sync)
                               │
                               ▼
                    ┌─────────────────────┐
                    │ API Call:           │
                    │ /sync/manual        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ SyncService         │
                    │ Validates Request  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Determine Tables    │
                    │ to Sync             │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Sort by Dependencies│
                    │ (Parent → Child)    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ For Each Table:     │
                    │ Process Records     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Update sync_log     │
                    │ status = 1          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Update sync_status  │
                    │ Table               │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Return Result       │
                    │ to API              │
                    └─────────────────────┘
```

### Record Processing Flow

```
                    ┌─────────────────────┐
                    │   Sync Entry        │
                    │ (from sync_log)     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Extract Data        │
                    │ • table_name        │
                    │ • record_id         │
                    │ • operation         │
                    │ • data (JSONB)      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Map Fields          │
                    │ Master → Location   │
                    │ (SYNC_FIELD_MAP)    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Validate Record     │
                    │ • Required fields   │
                    │ • Data types        │
                    │ • Foreign keys       │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
            ┌──────────────┐      ┌──────────────┐
            │   Valid      │      │  Invalid     │
            └──────┬───────┘      └──────┬───────┘
                   │                     │
                   │                     ▼
                   │            ┌─────────────────┐
                   │            │ Log Error       │
                   │            │ Skip Record     │
                   │            └─────────────────┘
                   │
                   ▼
        ┌───────────────────────┐
        │ Check Operation Type  │
        └───────────┬───────────┘
                    │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ INSERT   │  │ UPDATE   │  │ DELETE   │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     │             │             │
     ▼             ▼             ▼
┌─────────────────────────────────────┐
│ Check if Record Exists              │
│ (by sync_id in location DB)         │
└───────────┬─────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌────────┐      ┌────────┐
│Exists  │      │Not Exists│
└───┬────┘      └────┬────┘
    │                │
    │                │
    ▼                ▼
┌────────┐      ┌────────┐
│UPDATE  │      │INSERT  │
│Record  │      │Record  │
└────────┘      └────────┘
    │                │
    └────────┬───────┘
             │
             ▼
    ┌─────────────────┐
    │ Generate Codes  │
    │ (if needed)     │
    │ • WM{store}MT{seq}│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Execute SQL     │
    │ Operation       │
    └────────┬────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌────────┐      ┌────────┐
│Success │      │ Error  │
└───┬────┘      └────┬────┘
    │                 │
    │                 │
    ▼                 ▼
┌────────┐      ┌────────┐
│Update  │      │Retry   │
│sync_log│      │or Log  │
│status=1│      │Error   │
└────────┘      └────────┘
```

---

## Error Handling Flows

### Retry Logic Flow

```
                    ┌─────────────────────┐
                    │   Execute Operation │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
            ┌──────────────┐      ┌──────────────┐
            │   Success    │      │    Error     │
            └──────────────┘      └──────┬───────┘
                                          │
                                          ▼
                                ┌─────────────────┐
                                │ Check Error Type│
                                └────────┬────────┘
                                         │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
            ┌──────────────┐                      ┌──────────────┐
            │ Transient     │                      │ Permanent     │
            │ Error         │                      │ Error         │
            │ (retryable)   │                      │ (not retryable)│
            └──────┬───────┘                      └──────┬───────┘
                   │                                     │
                   ▼                                     ▼
        ┌───────────────────────┐            ┌─────────────────┐
        │ Check retry_count      │            │ Log Error       │
        │ < maxRetries?          │            │ Update sync_log │
        └───────────┬───────────┘            │ status = 2      │
                    │                        └─────────────────┘
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐      ┌──────────────┐
│ Yes          │      │ No           │
│ (< max)      │      │ (>= max)      │
└──────┬───────┘      └──────┬───────┘
       │                      │
       │                      ▼
       │            ┌─────────────────┐
       │            │ Log Error       │
       │            │ Update sync_log │
       │            │ status = 2      │
       │            └─────────────────┘
       │
       ▼
┌───────────────────────┐
│ Calculate Wait Time   │
│ delay = retryDelay *  │
│ backoffMultiplier^    │
│ retry_count           │
│ (max: maxRetryDelay)  │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Wait (delay ms)        │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Increment retry_count │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Retry Operation       │
│ (back to start)        │
└───────────────────────┘
```

### Error Types and Handling

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR CLASSIFICATION                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TRANSIENT ERRORS (Retryable)                                │
├─────────────────────────────────────────────────────────────┤
│ • Database connection timeout                                │
│ • Deadlock detection                                         │
│ • Temporary network issues                                   │
│ • Lock wait timeout                                         │
│                                                              │
│ Action: Retry with exponential backoff                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PERMANENT ERRORS (Not Retryable)                            │
├─────────────────────────────────────────────────────────────┤
│ • Foreign key constraint violation                           │
│ • Unique constraint violation                                │
│ • Invalid data format                                        │
│ • Missing required fields                                    │
│ • Data type mismatch                                         │
│                                                              │
│ Action: Log error, skip record, continue processing         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ VALIDATION ERRORS (Prevent Sync)                             │
├─────────────────────────────────────────────────────────────┤
│ • Record doesn't meet business rules                         │
│ • Invalid reference (FK not found)                          │
│ • Code generation failure                                    │
│                                                              │
│ Action: Log error, skip record, continue processing         │
└─────────────────────────────────────────────────────────────┘
```

---

## Code Generation Flow

### Menu Item Time Event Code Generation

```
┌─────────────────────────────────────────────────────────────┐
│ Menu Item Time Event Code Generation                        │
└─────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │ Need to Generate    │
                    │ Code for New Record │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Build Prefix        │
                    │ WM{storeCode}MT     │
                    │ Example: WMSTORE01MT│
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Query Location DB   │
                    │ SELECT              │
                    │ menuitem_timeevent_ │
                    │ code                │
                    │ WHERE code LIKE     │
                    │ 'WMSTORE01MT%'      │
                    │ ORDER BY id DESC    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Extract Sequence    │
                    │ Numbers from Codes  │
                    │ WMSTORE01MT1 → 1    │
                    │ WMSTORE01MT2 → 2    │
                    │ WMSTORE01MT10 → 10  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Find Maximum        │
                    │ Sequence Number     │
                    │ max = 10            │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Increment Sequence  │
                    │ next = max + 1      │
                    │ next = 11           │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Generate Code       │
                    │ code = prefix +     │
                    │ next                │
                    │ WMSTORE01MT11       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Use Generated Code  │
                    │ in INSERT Statement │
                    └─────────────────────┘
```

---

## Summary

These diagrams provide visual representations of:

1. **System Architecture**: How components interact
2. **Data Flow**: How data moves through the system
3. **Table Relationships**: Dependencies between tables
4. **Process Flows**: Step-by-step sync operations
5. **Error Handling**: How errors are managed and retried

For implementation details, refer to `SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md`.
