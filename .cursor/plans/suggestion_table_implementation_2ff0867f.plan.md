---
name: Suggestion Table Implementation
overview: Create tbl_suggestion table in both master and location databases, implement add/edit pages, and integrate with the sync system to sync from master to location.
todos:
  - id: "1"
    content: Add MasterSuggestion model to prisma/master-schema.prisma
    status: completed
  - id: "2"
    content: Add Suggestion model to prisma/schema.prisma
    status: completed
  - id: "3"
    content: Create master database migration SQL file
    status: completed
  - id: "4"
    content: Create location database migration SQL file
    status: completed
  - id: "5"
    content: Update SYNC_TABLE_MAP, SYNC_FIELD_MAP, SYNC_ORDER_BY_COLUMN, and SYNC_TABLE_ORDER in src/lib/sync/types.ts
    status: completed
  - id: "6"
    content: Create src/app/api/master/suggestion/route.ts with GET and POST handlers
    status: completed
  - id: "7"
    content: Create src/app/api/master/suggestion/[id]/route.ts with GET, PUT, and DELETE handlers
    status: completed
  - id: "8"
    content: Create src/app/master/suggestion/page.tsx list page with DataTable
    status: completed
  - id: "9"
    content: Create suggestion form modal component or configure CRUDModal for suggestions
    status: completed
  - id: "10"
    content: Add "Reason/Request Master" navigation link to MasterDashboardLayout
    status: completed
  - id: "11"
    content: Test sync functionality from master to location
    status: completed
---

# Suggestion Table Implementation Plan

## Overview

Implement a complete suggestion management system with:

1. Database schema in both master and location databases
2. Master API routes for CRUD operations
3. Frontend pages for managing suggestions
4. Sync integration to sync suggestions from master to location databases

## Database Schema

### 1. Master Database Schema

Add to `prisma/master-schema.prisma`:

```prisma
model MasterSuggestion {
  suggestionId      BigInt    @id @default(autoincrement()) @map("suggestion_id")
  suggestionCode   String    @unique @map("suggestion_code") @db.VarChar(50)
  suggestionText   String    @map("suggestion_text") @db.VarChar(255)
  category         String?   @map("category") @db.VarChar(100)
  isActive         Int       @default(1) @map("is_active")
  prepZoneCode     String?   @map("prep_zone_code") @db.VarChar(50)
  suggestionDesc   String?   @map("suggestion_desc") @db.VarChar(1000)
  isDelete         Boolean   @default(false) @map("is_delete")
  createdBy        BigInt?   @map("createdby")
  createdOn        DateTime  @default(now()) @map("createdon")
  updatedBy        BigInt?   @map("updatedby")
  updatedOn        DateTime? @map("updatedon")
  syncId           String    @unique @default(uuid()) @map("sync_id") @db.Uuid
  syncSource       String?   @default("server") @map("sync_source") @db.VarChar(20)

  @@index([suggestionCode])
  @@index([category])
  @@index([isActive])
  @@index([syncId])
  @@map("tbl_master_suggestion")
}
```

**Note**:

- Following the pattern of other master tables, this uses `tbl_master_suggestion` as the table name.
- `storeCode` is NOT included in master schema (only in location schema for filtering)
- DateTime columns follow the pattern: `createdby`, `createdon`, `updatedby`, `updatedon` (lowercase)

### 2. Location Database Schema

Add to `prisma/schema.prisma`:

```prisma
model Suggestion {
  suggestionId      BigInt    @id @default(autoincrement()) @map("suggestion_id")
  suggestionCode   String    @unique @map("suggestion_code") @db.VarChar(50)
  suggestionText   String    @map("suggestion_text") @db.VarChar(255)
  category         String?   @map("category") @db.VarChar(100)
  isActive         Int       @default(1) @map("is_active")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @default(now()) @updatedAt @map("updated_at")
  prepZoneCode     String?   @map("prep_zone_code") @db.VarChar(50)
  storeCode        String?   @map("store_code") @db.VarChar(50)
  suggestionDesc   String?   @map("suggestion_desc") @db.VarChar(1000)
  isDelete         Boolean   @default(false) @map("is_delete")
  syncId           String?   @unique @default(uuid()) @map("sync_id") @db.Uuid
  syncSource       String?   @default("server") @map("sync_source") @db.VarChar(20)

  @@index([suggestionCode])
  @@index([category])
  @@index([storeCode])
  @@index([isActive])
  @@index([syncId])
  @@map("tbl_suggestion")
}
```

**Note**: Location table includes `storeCode` for filtering by location, following the multi-tenant pattern.

### 3. Create Migration Files

- Create SQL migration for master database: `prisma/migrations/XXXXX_add_suggestion_master/migration.sql`
- Create SQL migration for location database: `prisma/migrations/XXXXX_add_suggestion_location/migration.sql`

## Sync System Integration

### 4. Update Sync Types

Update `src/lib/sync/types.ts`:

**Add to SYNC_TABLE_MAP:**

```typescript
'tbl_master_suggestion': 'tbl_suggestion',
```

**Add to SYNC_FIELD_MAP:**

```typescript
'tbl_master_suggestion': {
  'suggestion_code': 'suggestion_code',
  'suggestion_text': 'suggestion_text',
  'category': 'category',
  'is_active': 'is_active',
  'prep_zone_code': 'prep_zone_code',
  'suggestion_desc': 'suggestion_desc',
  'is_delete': 'is_delete',
},
```

**Note**: `store_code` is NOT in the sync field map because it's not in the master schema. The sync processor will set `store_code` in the location database during sync based on the target location.

**Add to SYNC_ORDER_BY_COLUMN:**

```typescript
'tbl_master_suggestion': 'createdon',
```

**Add to SYNC_TABLE_ORDER:**

Add `'tbl_master_suggestion'` to the appropriate position (likely with independent tables like tax, station, etc.)

## API Routes

### 5. Master API Routes

Create `src/app/api/master/suggestion/route.ts`:

- **GET** `/api/master/suggestion` - List all suggestions

  - Query params: `category`, `isActive`, `prepZoneCode`, `storeCode`
  - Returns array of suggestions

- **POST** `/api/master/suggestion` - Create new suggestion
  - Body: `{ suggestionCode?, suggestionText, category?, isActive?, prepZoneCode?, storeCode?, suggestionDesc? }`
  - Auto-generates `suggestionCode` if not provided
  - Validates required fields
  - Creates sync log entry for syncing to locations

Create `src/app/api/master/suggestion/[id]/route.ts`:

- **GET** `/api/master/suggestion/[id]` - Get single suggestion by ID
- **PUT** `/api/master/suggestion/[id]` - Update suggestion
  - Body: Same as POST (all fields optional except those being updated)
  - Creates sync log entry for syncing updates
- **DELETE** `/api/master/suggestion/[id]` - Soft delete suggestion
  - Sets `isDelete` to true
  - Creates sync log entry

**Implementation Notes:**

- Use `verifyMasterAdmin` for authentication
- Use `checkMasterPermission` for permission checks (if permission system is in use)
- Follow pattern from `src/app/api/master/prep-zone/route.ts`
- Auto-generate `suggestionCode` if not provided (e.g., "SUG001", "SUG002")
- Include `syncId` and `syncSource` in create/update operations
- Trigger sync after create/update/delete operations

## Frontend Pages

### 6. Master Suggestion List Page

Create `src/app/master/suggestion/page.tsx`:

- Display suggestions in a DataTable
- Columns: Suggestion Code, Suggestion Text, Category, Prep Zone, Store Code, Status, Actions
- Filters: Category, Prep Zone, Store Code, Active/Inactive
- Actions: Add, Edit, Delete, Toggle Status
- Uses `MasterDashboardLayout`
- Follows pattern from `src/app/master/prep-zone/page.tsx`

### 6b. Add Navigation Link

Update `src/components/layouts/MasterDashboardLayout.tsx`:

Add to the `navigation` array:

```typescript
{
  name: "Reason/Request Master",
  href: "/master/suggestion",
  icon: DocumentTextIcon, // or ChatBubbleLeftRightIcon, LightBulbIcon, etc.
  roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "DEALER_ADMIN"],
},
```

**Note**: The navigation name will display as "Reason/Request Master" in the sidebar, while the route remains `/master/suggestion` for consistency with the API routes.

### 7. Suggestion Form Modal

Create `src/components/master/SuggestionModal.tsx` or use `CRUDModal`:

- Form fields:
  - Suggestion Code (auto-generated, editable)
  - Suggestion Text (required)
  - Category (optional, dropdown or text input)
  - Prep Zone Code (optional, dropdown from prep zones)
  - Store Code (optional, dropdown from stores)
  - Suggestion Description (optional, textarea)
  - Active Status (toggle)
- Validation:
  - Suggestion Text is required
  - Suggestion Code must be unique
- Handles both create and edit modes

### 8. Edit Page (Optional)

Create `src/app/master/suggestion/[id]/edit/page.tsx`:

- Full-page edit form (alternative to modal)
- Same fields as modal
- Uses `MasterDashboardLayout`
- Follows pattern from `src/app/master/time-event/[id]/edit/page.tsx`

## Sync Integration Details

### 9. Sync Behavior

- **Master to Location Sync:**

  - When suggestion is created/updated in master, sync log entry is created
  - Sync processor copies data to location database with `storeCode` filtering
  - Location database maintains read-only copy (or location-specific overrides if needed)

- **Sync Fields:**

  - All business fields are synced
  - `syncId` is used to track synced records
  - `storeCode` in location DB filters suggestions by location

- **Sync Order:**
  - Suggestions are independent tables (no foreign key dependencies)
  - Can be synced early in the sync order

## Implementation Checklist

1. **Database Schema**

   - [ ] Add `MasterSuggestion` model to `prisma/master-schema.prisma`
   - [ ] Add `Suggestion` model to `prisma/schema.prisma`
   - [ ] Create master database migration SQL
   - [ ] Create location database migration SQL
   - [ ] Run migrations on both databases

2. **Sync System**

   - [ ] Update `SYNC_TABLE_MAP` in `src/lib/sync/types.ts`
   - [ ] Update `SYNC_FIELD_MAP` in `src/lib/sync/types.ts`
   - [ ] Update `SYNC_ORDER_BY_COLUMN` in `src/lib/sync/types.ts`
   - [ ] Update `SYNC_TABLE_ORDER` in `src/lib/sync/types.ts`
   - [ ] Test sync functionality

3. **API Routes**

   - [ ] Create `src/app/api/master/suggestion/route.ts` (GET, POST)
   - [ ] Create `src/app/api/master/suggestion/[id]/route.ts` (GET, PUT, DELETE)
   - [ ] Add authentication and permission checks
   - [ ] Add validation and error handling
   - [ ] Test all API endpoints

4. **Frontend**

   - [ ] Create `src/app/master/suggestion/page.tsx` (list page)
   - [ ] Create suggestion form modal or use CRUDModal
   - [ ] Add "Reason/Request Master" navigation link in MasterDashboardLayout
   - [ ] Test add/edit/delete functionality
   - [ ] Test filtering and search

5. **Testing**

   - [ ] Test creating suggestion in master
   - [ ] Test editing suggestion in master
   - [ ] Test deleting suggestion in master
   - [ ] Test sync from master to location
   - [ ] Verify suggestions appear in location database with correct `storeCode`

## Files to Create/Modify

**New Files:**

- `prisma/migrations/XXXXX_add_suggestion_master/migration.sql`
- `prisma/migrations/XXXXX_add_suggestion_location/migration.sql`
- `src/app/api/master/suggestion/route.ts`
- `src/app/api/master/suggestion/[id]/route.ts`
- `src/app/master/suggestion/page.tsx`
- `src/components/master/SuggestionModal.tsx` (optional, can use CRUDModal)

**Modified Files:**

- `prisma/master-schema.prisma` - Add MasterSuggestion model
- `prisma/schema.prisma` - Add Suggestion model
- `src/lib/sync/types.ts` - Add suggestion to sync mappings
- `src/components/layouts/MasterDashboardLayout.tsx` - Add "Reason/Request Master" navigation link

## Notes

- The table name in the user's SQL is `tbl_suggestion`, but following the codebase pattern, master tables use `tbl_master_suggestion` prefix
- `is_active` is `smallint` in SQL but Prisma uses `Int` type
- `is_delete` is `boolean` in SQL, which matches Prisma's `Boolean` type
- Master schema uses `createdby`, `createdon`, `updatedby`, `updatedon` (lowercase) following the pattern of other master tables
- Location schema uses `created_at` and `updated_at` (snake_case) following the pattern of other location tables
- `storeCode` is NOT in master schema (only in location schema for filtering by location)
- The sequence `tbl_suggestion_suggestion_id_seq` will be auto-created by PostgreSQL
- Sync system will handle the master-to-location synchronization automatically once configured
