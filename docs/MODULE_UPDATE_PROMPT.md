# Module Update Prompt Template

Use this prompt template to update any module to support storeCode filtering and location syncSource.

## Instructions

Copy and paste this prompt, replacing `[MODULE_NAME]` with your module name (e.g., "station", "printer", "prep-zone", "events", etc.):

---

**Update the [MODULE_NAME] module to:**

1. **API Level Store Filtering:**

   - Update GET route to filter by `storeCode` from query parameters
   - Use `getUserAccessInfo`, `getSelectedStoreCode`, and `buildStoreFilter` from `@/lib/auth/accessControl`
   - Only return records for the selected store (not all stores)
   - Apply the same filtering pattern as the stats route

2. **Frontend Store Code Support:**

   - Update the page component to read `storeCode` from URL query parameters using `useSearchParams`
   - Pass `storeCode` to all API calls (GET, POST, PUT, DELETE)
   - Add `storeCode` as a dependency in `useEffect` so data refreshes when store changes

3. **Sync Source Update:**

   - When creating records from dashboard (POST route), set `syncSource: 'location'` instead of default 'server'
   - When updating records from dashboard (PUT route), set `syncSource: 'location'`
   - Ensure the syncSource field is included in create/update operations

4. **Access Control:**
   - Update all routes (GET, POST, PUT, DELETE) to validate user access to the selected store
   - Use `canAccessStore` to verify permissions for individual record operations

**Files to update:**

- `src/app/api/dashboard/[MODULE_NAME]/route.ts` (GET and POST)
- `src/app/api/dashboard/[MODULE_NAME]/[id]/route.ts` (GET, PUT, DELETE)
- `src/app/dashboard/[MODULE_NAME]/page.tsx` (frontend component)

**Reference Implementation:**

- See `src/app/api/dashboard/tax/route.ts` for GET/POST pattern
- See `src/app/api/dashboard/tax/[id]/route.ts` for GET/PUT/DELETE pattern
- See `src/app/dashboard/tax/page.tsx` for frontend pattern

---

## Example Usage

For example, to update the "station" module, you would say:

**Update the station module to:**

1. **API Level Store Filtering:**

   - Update GET route to filter by `storeCode` from query parameters
   - Use `getUserAccessInfo`, `getSelectedStoreCode`, and `buildStoreFilter` from `@/lib/auth/accessControl`
   - Only return records for the selected store (not all stores)
   - Apply the same filtering pattern as the stats route

2. **Frontend Store Code Support:**

   - Update the page component to read `storeCode` from URL query parameters using `useSearchParams`
   - Pass `storeCode` to all API calls (GET, POST, PUT, DELETE)
   - Add `storeCode` as a dependency in `useEffect` so data refreshes when store changes

3. **Sync Source Update:**

   - When creating records from dashboard (POST route), set `syncSource: 'location'` instead of default 'server'
   - When updating records from dashboard (PUT route), set `syncSource: 'location'`
   - Ensure the syncSource field is included in create/update operations

4. **Access Control:**
   - Update all routes (GET, POST, PUT, DELETE) to validate user access to the selected store
   - Use `canAccessStore` to verify permissions for individual record operations

**Files to update:**

- `src/app/api/dashboard/station/route.ts` (GET and POST)
- `src/app/api/dashboard/station/[id]/route.ts` (GET, PUT, DELETE)
- `src/app/dashboard/station/page.tsx` (frontend component)

**Reference Implementation:**

- See `src/app/api/dashboard/tax/route.ts` for GET/POST pattern
- See `src/app/api/dashboard/tax/[id]/route.ts` for GET/PUT/DELETE pattern
- See `src/app/dashboard/tax/page.tsx` for frontend pattern

**Update the printer module to:**

1. **API Level Store Filtering:**

   - Update GET route to filter by `storeCode` from query parameters
   - Use `getUserAccessInfo`, `getSelectedStoreCode`, and `buildStoreFilter` from `@/lib/auth/accessControl`
   - Only return records for the selected store (not all stores)
   - Apply the same filtering pattern as the stats route

2. **Frontend Store Code Support:**

   - Update the page component to read `storeCode` from URL query parameters using `useSearchParams`
   - Pass `storeCode` to all API calls (GET, POST, PUT, DELETE)
   - Add `storeCode` as a dependency in `useEffect` so data refreshes when store changes

3. **Sync Source Update:**

   - When creating records from dashboard (POST route), set `syncSource: 'location'` instead of default 'server'
   - When updating records from dashboard (PUT route), set `syncSource: 'location'`
   - Ensure the syncSource field is included in create/update operations

4. **Access Control:**
   - Update all routes (GET, POST, PUT, DELETE) to validate user access to the selected store
   - Use `canAccessStore` to verify permissions for individual record operations

**Files to update:**

- `src/app/api/dashboard/printer/route.ts` (GET and POST)
- `src/app/api/dashboard/printer/[id]/route.ts` (GET, PUT, DELETE)
- `src/app/dashboard/printer/page.tsx` (frontend component)

**Reference Implementation:**

- See `src/app/api/dashboard/printer/route.ts` for GET/POST pattern
- See `src/app/api/dashboard/printer/[id]/route.ts` for GET/PUT/DELETE pattern
- See `src/app/dashboard/printer/page.tsx` for frontend pattern
