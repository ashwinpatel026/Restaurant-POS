# Sync System Comprehensive Documentation

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Sync Tables and Dependencies](#sync-tables-and-dependencies)
4. [Sync Implementation Details](#sync-implementation-details)
5. [Sync Service Architecture](#sync-service-architecture)
6. [Sync Flow Diagrams](#sync-flow-diagrams)
7. [API Endpoints](#api-endpoints)
8. [Error Handling and Retry Logic](#error-handling-and-retry-logic)
9. [Code Generation and Triggers](#code-generation-and-triggers)
10. [Best Practices](#best-practices)

---

## Overview

The Sync System is a comprehensive data synchronization solution that enables bidirectional and unidirectional data flow between:

- **Master Database**: Central repository containing master data templates
- **Location Databases**: Individual location-specific databases for each restaurant/store

### Key Features

- **Incremental Sync**: Syncs only changed records via `sync_log` table
- **Full Sync**: Re-syncs all records from master tables
- **Dependency Management**: Automatically handles table dependencies and sync order
- **Error Handling**: Robust retry mechanism with exponential backoff
- **Progress Tracking**: Real-time sync progress and status monitoring
- **Location-to-Location Sync**: Clone/merge data between locations

### Sync Types

1. **Master → Location Sync**: Primary sync from master templates to locations
2. **Location → Location Sync**: Clone or merge data between locations
3. **Incremental Sync**: Process only pending changes
4. **Full Sync**: Re-sync all records regardless of sync status

---

## System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Master Database"
        MT[Master Tables<br/>tbl_master_*]
        SL[sync_log<br/>Change Tracking]
        SS[sync_status<br/>Sync History]
    end
    
    subgraph "Sync Service Layer"
        SSVC[SyncService<br/>Orchestrator]
        SP[SyncProcessor<br/>Record Processor]
        SV[SyncValidator<br/>Data Validator]
    end
    
    subgraph "Location Database"
        LT[Location Tables<br/>tbl_*]
        LS[Location-specific<br/>Data]
    end
    
    subgraph "API Layer"
        API1[POST /api/master/sync/manual]
        API2[GET /api/master/sync/status]
        API3[GET /api/master/sync/log]
        API4[POST /api/master/sync/auto]
    end
    
    MT -->|Changes| SL
    SL -->|Read Pending| SSVC
    SSVC -->|Validate| SV
    SSVC -->|Process| SP
    SP -->|Write| LT
    SSVC -->|Update| SS
    SSVC -->|Update| SL
    
    API1 --> SSVC
    API2 --> SS
    API3 --> SL
    API4 --> SSVC
    
    style MT fill:#e1f5ff
    style LT fill:#fff4e1
    style SSVC fill:#e8f5e9
    style SP fill:#f3e5f5
```

### Database Architecture

```mermaid
erDiagram
    MASTER_DB ||--o{ LOCATION_DB : syncs_to
    MASTER_DB {
        uuid sync_id PK
        string table_name
        jsonb data
        timestamp created_on
    }
    
    SYNC_LOG ||--o{ SYNC_STATUS : tracks
    SYNC_LOG {
        bigint id PK
        string table_name
        uuid record_id
        string operation
        string source
        jsonb data
        timestamp change_time
        int sync_status
        string location_code
        string error_message
        int retry_count
    }
    
    SYNC_STATUS {
        bigint id PK
        string location_code
        string table_name
        timestamp last_sync_time
        int last_sync_status
        bigint total_records_synced
        string last_error_message
    }
    
    LOCATION_DB {
        uuid sync_id FK
        string store_code
        jsonb location_data
    }
```

---

## Sync Tables and Dependencies

### Complete Table List

The sync system handles **24 syncable tables** organized into categories:

#### 1. Independent Tables (No Dependencies)
- `tbl_master_tax` → `tbl_tax`
- `tbl_master_printer` → `tbl_printer`
- `tbl_master_station` → `tbl_station`
- `tbl_master_department_type` → `tbl_department_type`
- `tbl_master_department` → `tbl_department`
- `tbl_master_time_events` → `tbl_time_events`
- `tbl_master_prep_zone` → `tbl_prep_zone`
- `tbl_master_discount_master` → `tbl_discount_master`
- `tbl_master_suggestion` → `tbl_suggestion`

#### 2. Permission System Tables
- `tbl_permission` → `permissions`
- `tbl_role` → `roles`
- `tbl_role_permission` → `role_permissions` (depends on `tbl_permission` and `tbl_role`)

#### 3. Menu Hierarchy Tables
- `tbl_master_menu_master` → `tbl_menu_master` (parent)
- `tbl_master_menu_category` → `tbl_menu_category` (depends on `menu_master`)
- `tbl_master_menu_item` → `tbl_menu_item` (depends on `menu_master` and `menu_category`)

#### 4. Modifier Hierarchy Tables
- `tbl_master_modifier_group` → `tbl_modifier_group` (parent)
- `tbl_master_modifier_item` → `tbl_modifier_item` (depends on `modifier_group`)

#### 5. Relationship/Junction Tables
- `tbl_master_menu_master_event` → `tbl_menu_master_event` (depends on `menu_master` and `time_events`)
- `tbl_master_menu_category_modifier` → `tbl_menu_category_modifier` (depends on `menu_category` and `modifier_group`)
- `tbl_master_menu_item_modifier_group` → `tbl_menu_item_modifier_group` (depends on `menu_item` and `modifier_group`)
- `tbl_master_menuitem_timeevent` → `tbl_menuitem_timeevent` (depends on `menu_item` and `time_events`)

#### 6. User Management Tables (Individual Sync Only)
- `tbl_user` → `users` (synced individually on create/update, not in full sync)

### Table Dependency Graph

```mermaid
graph TD
    %% Independent Tables
    TAX[tbl_master_tax]
    PRINTER[tbl_master_printer]
    STATION[tbl_master_station]
    DEPT_TYPE[tbl_master_department_type]
    TIME_EVENTS[tbl_master_time_events]
    DISCOUNT[tbl_master_discount_master]
    SUGGESTION[tbl_master_suggestion]
    
    %% Permission System
    PERMISSION[tbl_permission]
    ROLE[tbl_role]
    ROLE_PERM[tbl_role_permission]
    
    %% Menu Hierarchy
    MENU_MASTER[tbl_master_menu_master]
    MENU_CAT[tbl_master_menu_category]
    MENU_ITEM[tbl_master_menu_item]
    
    %% Modifier Hierarchy
    MOD_GROUP[tbl_master_modifier_group]
    MOD_ITEM[tbl_master_modifier_item]
    
    %% Department
    DEPARTMENT[tbl_master_department]
    PREP_ZONE[tbl_master_prep_zone]
    
    %% Junction Tables
    MENU_MASTER_EVENT[tbl_master_menu_master_event]
    MENU_CAT_MOD[tbl_master_menu_category_modifier]
    MENU_ITEM_MOD[tbl_master_menu_item_modifier_group]
    MENU_ITEM_TIME[tbl_master_menuitem_timeevent]
    
    %% Dependencies
    DEPT_TYPE --> DEPARTMENT
    TAX --> DEPARTMENT
    STATION --> PREP_ZONE
    PRINTER --> PREP_ZONE
    
    PERMISSION --> ROLE_PERM
    ROLE --> ROLE_PERM
    
    MENU_MASTER --> MENU_CAT
    MENU_MASTER --> MENU_MASTER_EVENT
    MENU_CAT --> MENU_ITEM
    MENU_CAT --> MENU_CAT_MOD
    MENU_ITEM --> MENU_ITEM_MOD
    MENU_ITEM --> MENU_ITEM_TIME
    
    MOD_GROUP --> MOD_ITEM
    MOD_GROUP --> MENU_CAT_MOD
    MOD_GROUP --> MENU_ITEM_MOD
    
    TIME_EVENTS --> MENU_MASTER_EVENT
    TIME_EVENTS --> MENU_ITEM_TIME
    
    style TAX fill:#e1f5ff
    style PRINTER fill:#e1f5ff
    style STATION fill:#e1f5ff
    style MENU_MASTER fill:#fff4e1
    style MOD_GROUP fill:#e8f5e9
    style MENU_ITEM_TIME fill:#f3e5f5
```

### Sync Order

Tables are synced in the following order to satisfy foreign key constraints:

```mermaid
graph LR
    subgraph "Phase 1: Independent"
        A1[Tax, Printer, Station<br/>Dept Type, Dept, Time Events<br/>Prep Zone, Discount, Suggestion]
    end
    
    subgraph "Phase 2: Permissions"
        A2[Permission → Role → Role Permission]
    end
    
    subgraph "Phase 3: Menu Hierarchy"
        A3[Menu Master → Menu Category → Menu Item]
    end
    
    subgraph "Phase 4: Modifiers"
        A4[Modifier Group → Modifier Item]
    end
    
    subgraph "Phase 5: Relationships"
        A5[Menu Master Event<br/>Menu Category Modifier<br/>Menu Item Modifier Group<br/>Menu Item Time Event]
    end
    
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> A5
    
    style A1 fill:#e1f5ff
    style A2 fill:#fff4e1
    style A3 fill:#e8f5e9
    style A4 fill:#f3e5f5
    style A5 fill:#ffe0e0
```

---

## Sync Implementation Details

### 1. Sync Log Table Structure

The `sync_log` table tracks all changes in master tables:

```sql
CREATE TABLE sync_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,           -- References sync_id in master table
    operation VARCHAR(20) NOT NULL,    -- INSERT, UPDATE, DELETE
    source VARCHAR(50) NOT NULL,       -- server, terminal, website, location
    data JSONB,                         -- Full record data (for INSERT/UPDATE)
    change_time TIMESTAMP NOT NULL,
    sync_status INTEGER DEFAULT 0,     -- 0=pending, 1=processed, 2=failed
    location_code VARCHAR(50),         -- NULL = all locations, specific = one location
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP,
    synced_at TIMESTAMP,
    synced_by INTEGER
);
```

### 2. Sync Status Table Structure

The `sync_status` table tracks sync history per location/table:

```sql
CREATE TABLE sync_status (
    id BIGSERIAL PRIMARY KEY,
    location_code VARCHAR(50) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    last_sync_time TIMESTAMP,
    last_sync_status INTEGER,          -- 0=success, 1=failed
    total_records_synced BIGINT DEFAULT 0,
    last_error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(location_code, table_name)
);
```

### 3. Change Tracking Mechanism

Changes are tracked via database triggers on master tables:

```mermaid
sequenceDiagram
    participant User
    participant MasterDB
    participant Trigger
    participant SyncLog
    participant SyncService
    
    User->>MasterDB: INSERT/UPDATE/DELETE record
    MasterDB->>Trigger: Execute trigger
    Trigger->>SyncLog: Insert sync_log entry
    Note over SyncLog: status = 0 (pending)
    SyncService->>SyncLog: Query pending entries
    SyncService->>SyncService: Process batch
    SyncService->>LocationDB: Apply changes
    SyncService->>SyncLog: Update status = 1 (processed)
```

### 4. Sync ID System

Every syncable record has a `sync_id` (UUID) that uniquely identifies it across databases:

- **Master Database**: `sync_id` is the primary identifier
- **Location Database**: `sync_id` is used to find existing records
- **Matching Logic**: Records are matched by `sync_id`, not by business codes

```mermaid
graph LR
    subgraph "Master Record"
        MR[sync_id: uuid-123<br/>menu_item_code: ITEM001<br/>name: Pizza]
    end
    
    subgraph "Location Record"
        LR[sync_id: uuid-123<br/>menu_item_code: WMSTORE01ITEM001<br/>name: Pizza<br/>store_code: STORE01]
    end
    
    MR -->|Match by sync_id| LR
    
    style MR fill:#e1f5ff
    style LR fill:#fff4e1
```

---

## Sync Service Architecture

### Service Components

```mermaid
classDiagram
    class SyncService {
        -config: SyncConfig
        +syncToLocation(request): SyncResult
        -incrementalSyncTable()
        -fullSyncTable()
        -getPendingSyncEntries()
        -sortTablesByDependencies()
        -updateSyncStatus()
    }
    
    class SyncProcessor {
        +processBatch()
        -processInsert()
        -processUpdate()
        -processDelete()
        -mapFields()
        -handleCodeGeneration()
    }
    
    class SyncValidator {
        +validateRecord()
        -validateRequiredFields()
        -validateForeignKeys()
        -validateDataTypes()
    }
    
    class SyncConfig {
        +batchSize: number
        +maxRetries: number
        +retryDelay: number
        +enableAutoSync: boolean
        +conflictResolution: string
    }
    
    SyncService --> SyncProcessor
    SyncService --> SyncValidator
    SyncService --> SyncConfig
```

### SyncService Flow

```mermaid
flowchart TD
    Start([Sync Request]) --> Validate{Validate<br/>Location}
    Validate -->|Invalid| Error1[Return Error]
    Validate -->|Valid| Determine{Determine<br/>Tables}
    
    Determine -->|Specific Table| Single[Single Table]
    Determine -->|Full Sync| All[All Tables]
    Determine -->|Incremental| Pending[Pending Tables]
    
    Single --> Sort[Sort by Dependencies]
    All --> Sort
    Pending --> Sort
    
    Sort --> Loop{For Each Table}
    Loop -->|Full Sync| FullSync[Full Sync Table]
    Loop -->|Incremental| IncSync[Incremental Sync Table]
    
    FullSync --> Process[Process Records]
    IncSync --> Fetch[Fetch Pending Entries]
    Fetch --> Process
    
    Process --> Batch{Process in Batches}
    Batch --> ValidateRec[Validate Record]
    ValidateRec -->|Invalid| LogError[Log Error]
    ValidateRec -->|Valid| Apply[Apply to Location DB]
    
    Apply -->|Success| UpdateStatus[Update Sync Status]
    Apply -->|Error| Retry{Retry?}
    
    Retry -->|Yes| Apply
    Retry -->|No| LogError
    
    UpdateStatus --> Next{More Tables?}
    Next -->|Yes| Loop
    Next -->|No| Complete[Return Result]
    
    LogError --> Next
    
    style Start fill:#e1f5ff
    style Complete fill:#c8e6c9
    style Error1 fill:#ffcdd2
```

### Incremental Sync Process

```mermaid
sequenceDiagram
    participant API
    participant SyncService
    participant SyncLog
    participant SyncProcessor
    participant LocationDB
    participant SyncStatus
    
    API->>SyncService: syncToLocation(request)
    SyncService->>SyncLog: Query pending entries
    SyncLog-->>SyncService: Return entries
    
    loop For each batch
        SyncService->>SyncProcessor: processBatch(entries)
        
        loop For each entry
            SyncProcessor->>SyncProcessor: Map fields
            SyncProcessor->>LocationDB: Execute operation
            
            alt Success
                LocationDB-->>SyncProcessor: Success
                SyncProcessor->>SyncLog: Update status = 1
            else Error
                LocationDB-->>SyncProcessor: Error
                SyncProcessor->>SyncLog: Update status = 2, retry_count++
            end
        end
        
        SyncProcessor-->>SyncService: Batch result
    end
    
    SyncService->>SyncStatus: Update sync status
    SyncService-->>API: Return result
```

### Full Sync Process

```mermaid
sequenceDiagram
    participant API
    participant SyncService
    participant MasterDB
    participant SyncProcessor
    participant LocationDB
    participant SyncStatus
    
    API->>SyncService: syncToLocation(fullSync=true)
    SyncService->>MasterDB: Query all records from table
    
    loop For each record
        SyncService->>SyncProcessor: Process record
        
        SyncProcessor->>LocationDB: Check if exists (by sync_id)
        
        alt Record exists
            SyncProcessor->>LocationDB: UPDATE record
        else Record not exists
            SyncProcessor->>LocationDB: INSERT record
        end
        
        LocationDB-->>SyncProcessor: Result
    end
    
    SyncService->>SyncStatus: Update sync status
    SyncService-->>API: Return result
```

---

## Sync Flow Diagrams

### Complete Sync Flow

```mermaid
flowchart TB
    subgraph "1. Change Detection"
        A1[User modifies master record] --> A2[Database trigger fires]
        A2 --> A3[Insert into sync_log]
        A3 --> A4[status = 0 pending]
    end
    
    subgraph "2. Sync Initiation"
        B1[API call /sync/manual] --> B2[SyncService.syncToLocation]
        B2 --> B3{Full or Incremental?}
        B3 -->|Incremental| B4[Query sync_log]
        B3 -->|Full| B5[Query master table]
    end
    
    subgraph "3. Dependency Resolution"
        C1[Get tables to sync] --> C2[Sort by SYNC_TABLE_ORDER]
        C2 --> C3[Resolve dependencies]
    end
    
    subgraph "4. Record Processing"
        D1[For each table] --> D2[For each record/batch]
        D2 --> D3[SyncProcessor.process]
        D3 --> D4{Operation type?}
        D4 -->|INSERT| D5[Insert into location]
        D4 -->|UPDATE| D6[Update in location]
        D4 -->|DELETE| D7[Delete from location]
        D5 --> D8[Update sync_log status]
        D6 --> D8
        D7 --> D8
    end
    
    subgraph "5. Status Update"
        E1[Update sync_status] --> E2[Record sync time]
        E2 --> E3[Record success/failure]
    end
    
    A4 --> B1
    B4 --> C1
    B5 --> C1
    C3 --> D1
    D8 --> E1
    
    style A1 fill:#e1f5ff
    style B1 fill:#fff4e1
    style C1 fill:#e8f5e9
    style D1 fill:#f3e5f5
    style E1 fill:#ffe0e0
```

### Menu Item Time Event Special Sync Flow

The `tbl_master_menuitem_timeevent` table has special handling:

```mermaid
flowchart TD
    Start([Sync Menu Item Time Event]) --> Check[Check table exists]
    Check -->|Not exists| Return[Return 0 records]
    Check -->|Exists| Query[Query master table]
    
    Query --> Filter[Filter: isDelete=false, isActive=true]
    Filter --> Loop[For each record]
    
    Loop --> Validate{Validate<br/>Required Fields}
    Validate -->|Invalid| Skip[Skip record]
    Validate -->|Valid| FindMenu[Find location menu item<br/>by sync_id]
    
    FindMenu -->|Found| UseMenu[Use location code]
    FindMenu -->|Not found| GenMenu[Generate WM{storeCode}{code}]
    
    UseMenu --> FindTime[Find location time event<br/>by sync_id]
    GenMenu --> FindTime
    
    FindTime -->|Found| UseTime[Use location code]
    FindTime -->|Not found| GenTime[Generate WM{storeCode}{code}]
    
    UseTime --> CheckExists[Check if record exists<br/>by sync_id + store_code]
    GenTime --> CheckExists
    
    CheckExists -->|Exists| Skip2[Skip - already synced]
    CheckExists -->|Not exists| GenCode[Generate code<br/>WM{storeCode}MT{sequence}]
    
    GenCode --> Insert[Insert into location DB]
    Insert --> Success[Success]
    
    Skip --> Next[Next record]
    Skip2 --> Next
    Success --> Next
    Next -->|More| Loop
    Next -->|Done| Complete[Return count]
    
    style Start fill:#e1f5ff
    style Complete fill:#c8e6c9
    style Skip fill:#ffcdd2
    style Skip2 fill:#ffcdd2
```

---

## API Endpoints

### 1. Manual Sync Endpoint

**POST** `/api/master/sync/manual`

Triggers manual synchronization from Master to Location database.

**Request Body:**
```json
{
  "locationCode": "STORE01",
  "tableName": "tbl_master_menu_item",  // Optional: specific table or omit for all
  "fullSync": false,                     // Optional: true for full sync
  "forceSync": false                      // Optional: force sync even if already synced
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sync completed successfully for location STORE01",
  "data": {
    "locationCode": "STORE01",
    "tableName": "tbl_master_menu_item",
    "recordsProcessed": 150,
    "recordsSucceeded": 148,
    "recordsFailed": 2,
    "duration": 5234,
    "errors": [
      {
        "recordId": "uuid-123",
        "operation": "INSERT",
        "error": "Foreign key constraint violation",
        "tableName": "tbl_master_menu_item"
      }
    ],
    "dependentTables": [
      {
        "tableName": "tbl_master_menu_item_modifier_group",
        "recordsProcessed": 45,
        "recordsSucceeded": 45,
        "recordsFailed": 0
      }
    ]
  }
}
```

### 2. Sync Status Endpoint

**GET** `/api/master/sync/status`

Retrieves sync status for locations and tables.

**Query Parameters:**
- `locationCode` (optional): Filter by location
- `tableName` (optional): Filter by table

**Response:**
```json
{
  "success": true,
  "data": {
    "status": [
      {
        "locationCode": "STORE01",
        "tableName": "tbl_master_menu_item",
        "lastSyncTime": "2026-01-27T10:30:00Z",
        "lastSyncStatus": 0,
        "totalRecordsSynced": 150,
        "lastErrorMessage": null
      }
    ],
    "pendingCount": 5
  }
}
```

### 3. Sync Log Endpoint

**GET** `/api/master/sync/log`

Retrieves sync log entries (pending, processed, or failed).

**Query Parameters:**
- `locationCode` (optional): Filter by location
- `tableName` (optional): Filter by table
- `status` (optional): 0=pending, 1=processed, 2=failed
- `limit` (optional): Number of entries to return

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "123",
        "tableName": "tbl_master_menu_item",
        "recordId": "uuid-123",
        "operation": "INSERT",
        "source": "server",
        "changeTime": "2026-01-27T10:00:00Z",
        "syncStatus": 0,
        "locationCode": null,
        "errorMessage": null,
        "retryCount": 0
      }
    ],
    "total": 50
  }
}
```

### 4. Auto Sync Endpoint

**POST** `/api/master/sync/auto`

Triggers automatic sync for all locations (used by scheduled jobs).

**Request Body:**
```json
{
  "locationCode": "STORE01",  // Optional: specific location or omit for all
  "fullSync": false
}
```

---

## Error Handling and Retry Logic

### Error Types

1. **Validation Errors**: Invalid data format, missing required fields
2. **Foreign Key Errors**: Referenced records don't exist
3. **Constraint Violations**: Unique constraints, check constraints
4. **Database Errors**: Connection issues, timeouts
5. **Code Generation Errors**: Failed to generate unique codes

### Retry Mechanism

```mermaid
flowchart TD
    Start([Process Record]) --> Execute[Execute Operation]
    Execute -->|Success| Success[Mark as Processed]
    Execute -->|Error| CheckType{Error Type}
    
    CheckType -->|Transient| CheckRetry{Retry Count<br/>< Max?}
    CheckType -->|Permanent| LogError[Log Error<br/>Status = 2]
    
    CheckRetry -->|Yes| Wait[Wait: retryDelay * backoffMultiplier^retryCount]
    Wait --> Increment[Increment retry_count]
    Increment --> Execute
    
    CheckRetry -->|No| LogError
    
    Success --> UpdateLog[Update sync_log<br/>status = 1]
    LogError --> UpdateLog
    
    style Start fill:#e1f5ff
    style Success fill:#c8e6c9
    style LogError fill:#ffcdd2
```

### Retry Configuration

```typescript
{
  maxRetries: 3,
  retryDelay: 1000,        // Initial delay: 1 second
  maxRetryDelay: 60000,    // Maximum delay: 60 seconds
  backoffMultiplier: 2     // Exponential backoff
}
```

**Retry Schedule:**
- Attempt 1: Immediate
- Attempt 2: Wait 1 second
- Attempt 3: Wait 2 seconds
- Attempt 4: Wait 4 seconds
- Maximum: 60 seconds

---

## Code Generation and Triggers

### Code Generation Rules

Location-specific codes are generated using patterns:

1. **Menu Item Time Event**: `WM{storeCode}MT{sequence}`
   - Example: `WMSTORE01MT1`, `WMSTORE01MT2`

2. **Menu Items**: `WM{storeCode}{originalCode}`
   - Example: Master `ITEM001` → Location `WMSTORE01ITEM001`

3. **Time Events**: `WM{storeCode}{originalCode}`
   - Example: Master `EVENT001` → Location `WMSTORE01EVENT001`

### Code Generation Flow

```mermaid
sequenceDiagram
    participant Processor
    participant LocationDB
    participant CodeGen
    
    Processor->>LocationDB: Check if code exists
    LocationDB-->>Processor: Not found
    
    Processor->>CodeGen: Generate code
    CodeGen->>LocationDB: Query existing codes
    LocationDB-->>CodeGen: Return codes
    
    CodeGen->>CodeGen: Extract sequence numbers
    CodeGen->>CodeGen: Find max sequence
    CodeGen->>CodeGen: Increment sequence
    CodeGen-->>Processor: Return new code
    
    Processor->>LocationDB: Insert with new code
```

### Database Triggers

Triggers on master tables automatically create `sync_log` entries:

```sql
CREATE OR REPLACE FUNCTION sync_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO sync_log (
        table_name,
        record_id,
        operation,
        source,
        data,
        change_time
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.sync_id, OLD.sync_id),
        TG_OP,
        'server',
        CASE
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
            ELSE row_to_json(NEW)
        END,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Best Practices

### 1. Sync Order

Always sync tables in dependency order:
- Independent tables first
- Parent tables before child tables
- Junction tables last

### 2. Batch Processing

Process records in batches (default: 100 records) to:
- Reduce memory usage
- Improve performance
- Enable progress tracking

### 3. Error Handling

- Log all errors with context
- Retry transient errors
- Skip records with permanent errors
- Continue processing remaining records

### 4. Monitoring

- Monitor `sync_status` table for sync health
- Check `sync_log` for pending entries
- Set up alerts for failed syncs
- Track sync duration and performance

### 5. Data Integrity

- Always validate records before syncing
- Check foreign key constraints
- Handle code generation conflicts
- Preserve `sync_id` for record matching

### 6. Performance Optimization

- Use indexes on `sync_id` columns
- Index `sync_log` table on `sync_status` and `location_code`
- Use connection pooling
- Process in parallel where possible (with caution)

---

## Appendix: Table Field Mappings

### Key Field Mappings

| Master Table | Location Table | Key Fields |
|-------------|---------------|------------|
| `tbl_master_menu_item` | `tbl_menu_item` | `menu_item_code`, `menu_master_code`, `menu_category_code`, `dept_code` |
| `tbl_master_menu_master` | `tbl_menu_master` | `menu_master_code`, `name`, `is_event_menu` |
| `tbl_master_time_events` | `tbl_time_events` | `Event_code`, `EventName`, `dept_code` |
| `tbl_master_menuitem_timeevent` | `tbl_menuitem_timeevent` | `menu_item_code`, `time_event_code`, `formula_value` |

### Sync Metadata Fields

All synced records include:
- `sync_id`: UUID for cross-database matching
- `sync_source`: Origin of sync (server, terminal, website, location)
- `store_code`: Location-specific identifier
- `isSyncToWeb`: Web sync flag
- `isSyncToLocal`: Local sync flag

---

## Conclusion

This documentation provides a comprehensive overview of the sync system architecture, implementation, and best practices. For specific implementation details, refer to the source code in:

- `src/lib/sync/syncService.ts` - Main sync orchestrator
- `src/lib/sync/syncProcessor.ts` - Record processor
- `src/lib/sync/types.ts` - Type definitions and configurations
- `src/services/syncService.ts` - Legacy sync functions
- `src/app/api/master/sync/manual/route.ts` - API endpoint

For UI documentation, see `docs/SYNC_UI_GUIDE.md`.
