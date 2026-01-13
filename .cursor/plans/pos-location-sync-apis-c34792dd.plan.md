---
name: POS Location Sync APIs - Two-Way Sync Architecture
overview: ""
todos: []
---

# POS Location Sync APIs - Two-Way Sync Architecture

Create API modules for POS clients to sync location data store-wise with **two-way synchronization** between Location Database and POS System. This complements the existing one-way sync from Master to Location.

## Sync Architecture Overview

```
Master DB → Location DB (One-way: Already implemented)
            ↓           ↑
          Location DB ↔ POS System (Two-way: To implement)
```

- **Master → Location**: One-way sync (Master DB syncs to Location DB)
- **Location ↔ POS**: Two-way sync (POS pulls from and pushes to Location DB)

## Implementation Plan

### 1. Create POS Location Sync API Routes

All APIs interact with **Location Database** (not Master), filtered by `storeCode`:

#### A. Location Information Sync

**GET `/api/pos/sync/location/[storeCode]`** - Pull location info from Location DB

- Returns location information for the specified store
- Validates storeCode exists and location is active
- Includes location metadata (address, contact, etc.)
- Location: `src/app/api/pos/sync/location/[storeCode]/route.ts`

**POST `/api/pos/sync/location/[storeCode]`** - Push location updates to Location DB

- Accepts location data updates from POS client
- Updates location data in Location database only
- Sets `syncSource = "POS"` to track POS-originated changes
- Updates sync flags appropriately
- Location: `src/app/api/pos/sync/location/[storeCode]/route.ts`

#### B. Store Data Sync (Comprehensive)

**GET `/api/pos/sync/location/[storeCode]/data`** - Pull all store data from Location DB

- Returns comprehensive store data filtered by storeCode:
  - Menu items, modifiers, prep zones
  - Orders, tables, stations
  - Tax, events, printers
- Supports query parameters for incremental sync (since lastSyncAt)
- Returns sync metadata for conflict resolution
- Location: `src/app/api/pos/sync/location/[storeCode]/data/route.ts`

**POST `/api/pos/sync/location/[storeCode]/data`** - Push store data updates to Location DB

- Accepts bulk data updates from POS (orders, inventory, etc.)
- Handles multiple table types in one request
- Sets `syncSource = "POS"` for all POS-originated records
- Updates `isSyncToWeb` flags to indicate changes need web sync
- Handles conflict resolution (if record exists, merge or override based on timestamp)
- Location: `src/app/api/pos/sync/location/[storeCode]/data/route.ts`

#### C. Table-Specific Sync Endpoints

**GET `/api/pos/sync/location/[storeCode]/[tableName]`** - Pull specific table data

- Returns data for a specific table (e.g., menu_items, orders, etc.)
- Supports filtering and pagination
- Location: `src/app/api/pos/sync/location/[storeCode]/[tableName]/route.ts`

**POST `/api/pos/sync/location/[storeCode]/[tableName]`** - Push table-specific updates

- Accepts updates for a specific table
- Bulk insert/update/delete operations
- Location: `src/app/api/pos/sync/location/[storeCode]/[tableName]/route.ts`

### 2. Create POS Authentication Helper

**Location**: `src/lib/posAuthHelper.ts`

- Validate POS client credentials
- Verify storeCode belongs to authenticated POS client
- Support API key/token-based authentication (different from dashboard auth)
- Validate storeCode exists in Location DB and is active
- Check if location allows POS sync

### 3. Create POS Sync Service

**Location**: `src/services/posSyncService.ts`

- **Data Transformation**: Transform POS data format to Location DB schema
- **Conflict Resolution**:
  - Handle conflicts when POS and Master sync overlap
  - Compare timestamps and syncSource
  - Implement merge strategies (last-write-wins, manual merge, etc.)
- **Sync Metadata Management**:
  - Set `syncSource = "POS"` for POS-originated changes
  - Update `isSyncToWeb` flag appropriately
  - Generate/validate `syncId` for tracking
- **Batch Processing**: Handle bulk operations efficiently
- **Validation**: Validate data before insert/update

### 4. Sync Conflict Resolution Strategy

When POS pushes data that conflicts with Master-synced data:

1. **Check syncSource**:

   - If existing record has `syncSource = "server"` (from Master), POS update may override
   - If existing record has `syncSource = "POS"`, allow POS updates
   - If existing record has `syncSource = "location"` (dashboard), apply conflict resolution

2. **Timestamp Comparison**:

   - Compare `updatedAt` timestamps
   - Last-write-wins strategy (configurable)

3. **Conflict Flags**:

   - Mark records with conflicts for manual review
   - Log conflicts for audit trail

### 5. Sync Status Tracking

- Track last sync time per storeCode
- Maintain sync status per table
- Log sync operations for audit
- Support incremental sync queries (get changes since last sync)

## Files to Create/Modify

### New Files:

1. `src/app/api/pos/sync/location/[storeCode]/route.ts` - Location info sync endpoints
2. `src/app/api/pos/sync/location/[storeCode]/data/route.ts` - Store data sync endpoints
3. `src/app/api/pos/sync/location/[storeCode]/[tableName]/route.ts` - Table-specific sync endpoints
4. `src/lib/posAuthHelper.ts` - POS authentication helper
5. `src/services/posSyncService.ts` - POS sync service with conflict resolution

### Files to Review/Reference:

1. `src/lib/databaseManager.ts` - Use `locationPrisma` for all POS operations
2. `src/services/syncService.ts` - Reference Master→Location sync patterns
3. `prisma/schema.prisma` - Understand Location DB schema and sync fields

## API Endpoints Summary

```
# Location Information
GET    /api/pos/sync/location/[storeCode]              - Pull location info
POST   /api/pos/sync/location/[storeCode]              - Push location updates

# Comprehensive Store Data
GET    /api/pos/sync/location/[storeCode]/data         - Pull all store data
POST   /api/pos/sync/location/[storeCode]/data         - Push store data updates

# Table-Specific Data
GET    /api/pos/sync/location/[storeCode]/[tableName]  - Pull table data
POST   /api/pos/sync/location/[storeCode]/[tableName]  - Push table updates
```

## Key Features

- **Two-way sync**: POS can pull from and push to Location DB
- **Store-wise filtering**: All operations filtered by `storeCode`
- **Sync source tracking**: `syncSource = "POS"` for POS-originated changes
- **Conflict resolution**: Handle conflicts between POS and Master sync
- **Incremental sync**: Support syncing only changed records
- **Sync metadata**: Track `syncId`, `syncSource`, `lastSyncAt`
- **Validation**: Comprehensive data validation before sync
- **Authentication**: POS-specific authentication mechanism
- **Audit trail**: Log all sync operations for tracking
