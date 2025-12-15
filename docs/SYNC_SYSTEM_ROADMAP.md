# Master to Location Database Sync System - Implementation Roadmap

## Overview

This document outlines the complete roadmap for implementing a UUID-based synchronization system between Master Database and Location Database(s). The system supports both **manual** and **automatic** full sync capabilities.

---

## Architecture Overview

```
┌─────────────────┐
│   Master DB     │  (Source of Truth)
│  (PostgreSQL)   │
│                 │
│ - sync_id (UUID)│
│ - sync_source   │
│ - sync_log      │
└────────┬────────┘
         │
         │ Sync Process
         │ (INSERT/UPDATE/DELETE)
         ▼
┌─────────────────┐
│  Location DB     │  (Target)
│  (PostgreSQL)   │
│                 │
│ - sync_id (UUID)│
│ - sync_source   │
└─────────────────┘
```

---

## Phase 1: Database Schema Updates

### 1.1 Enable UUID Extension in PostgreSQL

**Priority: Critical**

Both Master and Location databases need UUID extension enabled.

```sql
-- Run on both Master and Location databases
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 1.2 Update Master Database Tables

**Priority: Critical**

Add sync fields to all master tables that need synchronization:

**Tables to Update:**

- `tbl_printer_master` (or `tbl_printer` in master)
- `tbl_menu_master`
- `tbl_menu_category`
- `tbl_menu_item`
- `tbl_modifier_group`
- `tbl_modifier_item`
- `tbl_prep_zone`
- `tbl_station`
- `tbl_tax`
- `tbl_time_events`
- Any other master data tables

**Fields to Add:**

```sql
-- Add to each table
ALTER TABLE tbl_printer_master
ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_printer_master_sync_id ON tbl_printer_master(sync_id);
```

### 1.3 Update Location Database Tables

**Priority: Critical**

Add the same sync fields to corresponding location tables:

```sql
-- Example for location printer table
ALTER TABLE tbl_printer
ADD COLUMN IF NOT EXISTS sync_id UUID,
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

-- Create unique index to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_printer_sync_id ON tbl_printer(sync_id);
```

### 1.4 Create Sync Log Table

**Priority: Critical**

Create `sync_log` table in **Master Database** to track all changes:

```sql
CREATE TABLE IF NOT EXISTS sync_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,         -- matches sync_id
    operation TEXT NOT NULL,          -- INSERT / UPDATE / DELETE
    source TEXT NOT NULL,             -- server, terminal, website
    data JSONB,                       -- full row data snapshot
    change_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status SMALLINT DEFAULT 0,   -- 0=pending, 1=processed, 2=failed
    location_code VARCHAR(100),      -- which location to sync to (NULL = all)
    error_message TEXT,              -- error details if sync failed
    retry_count SMALLINT DEFAULT 0,
    last_retry_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(sync_status, change_time);
CREATE INDEX IF NOT EXISTS idx_sync_log_table_record ON sync_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_location ON sync_log(location_code);
```

### 1.5 Create Sync Status Table

**Priority: High**

Track sync status per location:

```sql
CREATE TABLE IF NOT EXISTS sync_status (
    id BIGSERIAL PRIMARY KEY,
    location_code VARCHAR(100) NOT NULL,
    table_name TEXT NOT NULL,
    last_sync_time TIMESTAMP,
    last_sync_status SMALLINT DEFAULT 0,  -- 0=success, 1=failed
    total_records_synced BIGINT DEFAULT 0,
    last_error_message TEXT,
    UNIQUE(location_code, table_name)
);

CREATE INDEX IF NOT EXISTS idx_sync_status_location ON sync_status(location_code);
```

---

## Phase 2: Database Triggers (Change Detection)

### 2.1 Create Trigger Function for Master Tables

**Priority: High**

Automatically log changes when data is inserted/updated/deleted:

```sql
-- Function to log changes
CREATE OR REPLACE FUNCTION log_sync_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO sync_log (table_name, record_id, operation, source, data)
        VALUES (TG_TABLE_NAME, NEW.sync_id, 'INSERT', COALESCE(NEW.sync_source, 'server'), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO sync_log (table_name, record_id, operation, source, data)
        VALUES (TG_TABLE_NAME, NEW.sync_id, 'UPDATE', COALESCE(NEW.sync_source, 'server'), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO sync_log (table_name, record_id, operation, source, data)
        VALUES (TG_TABLE_NAME, OLD.sync_id, 'DELETE', COALESCE(OLD.sync_source, 'server'), row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 Attach Triggers to Master Tables

**Priority: High**

```sql
-- Example for printer_master table
CREATE TRIGGER trigger_printer_master_sync
AFTER INSERT OR UPDATE OR DELETE ON tbl_master_printer
FOR EACH ROW EXECUTE FUNCTION log_sync_change();

-- Repeat for all master tables that need syncing
```

---

## Phase 3: Sync Service Implementation

### 3.1 Sync Service Structure

**Priority: Critical**

Create sync service with the following components:

```
src/lib/sync/
├── syncService.ts          # Main sync orchestrator
├── syncProcessor.ts        # Process sync_log entries
├── syncValidator.ts       # Validate data before sync
├── syncConflictResolver.ts # Handle conflicts
└── types.ts               # TypeScript types
```

### 3.2 Sync Process Flow

```
1. Manual Sync Trigger
   └─> API Endpoint: POST /api/master/sync/manual
       └─> SyncService.syncToLocation(locationCode, tableName?, fullSync?)

2. Auto Sync (Scheduled)
   └─> Cron Job / Background Worker
       └─> SyncService.processPendingSyncs()

3. Sync Execution
   ├─> Fetch pending sync_log entries
   ├─> Group by table_name and location_code
   ├─> Process in batches
   ├─> Apply INSERT/UPDATE/DELETE to Location DB
   ├─> Update sync_log status
   └─> Update sync_status table
```

### 3.3 Sync Strategies

**A. Incremental Sync (Default)**

- Process only pending entries from `sync_log` where `sync_status = 0`
- Fast and efficient
- Use for regular auto-sync

**B. Full Sync**

- Re-sync all records from master tables
- Useful for initial setup or recovery
- Can be filtered by table or location

**C. Table-Specific Sync**

- Sync only specific table(s)
- Useful for targeted updates

---

## Phase 4: API Endpoints

### 4.1 Manual Sync Endpoints

**Priority: High**

```
POST /api/master/sync/manual
Body: {
  locationCode: string,
  tableName?: string,      // Optional: sync specific table
  fullSync?: boolean       // Optional: full sync vs incremental
}

GET /api/master/sync/status
Query: ?locationCode=xxx&tableName=xxx

GET /api/master/sync/log
Query: ?locationCode=xxx&status=0&limit=100
```

### 4.2 Sync Status Endpoints

**Priority: Medium**

```
GET /api/master/sync/history
GET /api/master/sync/errors
POST /api/master/sync/retry
```

---

## Phase 5: Auto Sync Implementation

### 5.1 Background Worker / Cron Job

**Priority: High**

Options:

1. **Next.js API Route with Cron** (using Vercel Cron or external service)
2. **Node.js Background Worker** (using BullMQ, Agenda, etc.)
3. **Database Scheduled Jobs** (PostgreSQL pg_cron)

### 5.2 Sync Schedule Configuration

**Priority: Medium**

```typescript
// Configurable sync intervals
const SYNC_CONFIG = {
  incremental: "*/5 * * * *", // Every 5 minutes
  full: "0 2 * * *", // Daily at 2 AM
  priority: "*/1 * * * *", // Every minute for critical tables
};
```

---

## Phase 6: Conflict Resolution

### 6.1 Conflict Detection

**Priority: Medium**

Detect when:

- Same record modified in both Master and Location
- Location has newer timestamp than Master
- Data integrity violations

### 6.2 Resolution Strategies

**Priority: Medium**

1. **Master Wins** (Default)

   - Always overwrite Location with Master data

2. **Timestamp Wins**

   - Compare `updated_at` timestamps
   - Keep the newer version

3. **Manual Resolution**
   - Flag conflicts for admin review
   - Store in `sync_conflicts` table

---

## Phase 7: Error Handling & Retry Logic

### 7.1 Error Categories

**Priority: High**

- Network errors → Retry with exponential backoff
- Data validation errors → Log and skip
- Constraint violations → Flag for manual review
- Connection errors → Queue for later

### 7.2 Retry Mechanism

**Priority: High**

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 60000, // 60 seconds
  backoffMultiplier: 2,
};
```

---

## Phase 8: Monitoring & Logging

### 8.1 Sync Metrics

**Priority: Medium**

Track:

- Sync success/failure rates
- Sync duration
- Records synced per table
- Error rates by type

### 8.2 Logging

**Priority: Medium**

- Log all sync operations
- Log errors with stack traces
- Log performance metrics
- Store in database for historical analysis

---

## Phase 9: UI Components

### 9.1 Sync Management Dashboard

**Priority: Low**

- View sync status per location
- Trigger manual syncs
- View sync history
- View and resolve conflicts
- Configure auto-sync schedules

### 9.2 Sync Status Indicators

**Priority: Low**

- Real-time sync status
- Last sync time
- Pending sync count
- Error notifications

---

## Implementation Order

### Week 1: Foundation

- [ ] Phase 1: Database schema updates
- [ ] Phase 2: Database triggers
- [ ] Basic sync service structure

### Week 2: Core Sync

- [ ] Phase 3: Sync service implementation
- [ ] Phase 4: Manual sync API endpoints
- [ ] Testing with single table

### Week 3: Automation & Reliability

- [ ] Phase 5: Auto sync implementation
- [ ] Phase 6: Conflict resolution
- [ ] Phase 7: Error handling & retry

### Week 4: Polish & Monitoring

- [ ] Phase 8: Monitoring & logging
- [ ] Phase 9: UI components
- [ ] Documentation
- [ ] Performance optimization

---

## Testing Strategy

### Unit Tests

- Sync service functions
- Conflict resolution logic
- Data validation

### Integration Tests

- End-to-end sync process
- Error scenarios
- Conflict scenarios

### Performance Tests

- Large batch syncs
- Concurrent syncs
- Database load

---

## Security Considerations

1. **Authentication**: All sync endpoints require master admin authentication
2. **Authorization**: Verify location access permissions
3. **Data Validation**: Validate all data before syncing
4. **Audit Trail**: Log all sync operations with user info
5. **Rate Limiting**: Prevent sync abuse

---

## Rollout Plan

1. **Development**: Implement and test in dev environment
2. **Staging**: Test with staging databases
3. **Pilot**: Enable for one location first
4. **Gradual Rollout**: Enable for more locations
5. **Full Rollout**: Enable for all locations

---

## Maintenance & Support

- Regular monitoring of sync logs
- Performance optimization as data grows
- Handle edge cases and errors
- Update sync logic as schema evolves

---

## Notes

- UUID ensures uniqueness across databases
- `sync_log` provides audit trail
- Incremental sync is more efficient than full sync
- Auto-sync can be disabled per location if needed
- Sync can be paused/resumed via configuration
