---
name: User access level filtering
overview: Implement role-based user filtering in the /api/dashboard/users endpoint so users only see other users based on their access level and storeCode access. SUPER_ADMIN sees all users, COMPANY_ADMIN sees company users, DEALER sees dealer users, and LOCATION users with single storeCode see only themselves.
todos:
  - id: "1"
    content: Update GET handler in /api/dashboard/users/route.ts to import getUserAccessInfo and masterPrisma
    status: completed
  - id: "2"
    content: Implement SUPER_ADMIN filter (return all users)
    status: in_progress
  - id: "3"
    content: Implement COMPANY access level filter (by companyId)
    status: in_progress
  - id: "4"
    content: Implement DEALER access level filter (by dealerId)
    status: in_progress
  - id: "5"
    content: Implement LOCATION access level filter (single storeCode = own user, multiple = query master DB for syncIds)
    status: in_progress
  - id: "6"
    content: Implement selectedStoreCode filtering - query master UserStoreAccess to find users with access to selectedStoreCode
    status: in_progress
  - id: "7"
    content: Combine access level filter and storeCode filter in the Prisma query
    status: in_progress
  - id: "8"
    content: Test the filtering logic with different user roles, access levels, and selectedStoreCode values
    status: pending
---

# User Access Level Filtering for Dashboard Users

## Overview

Modify the `/api/dashboard/users` GET endpoint to filter users based on the logged-in user's role and storeCode access. Additionally, filter by `selectedStoreCode` (from query parameter or default) to show only users who have access to that specific store. The filtering logic follows the access control hierarchy already implemented in `getUserAccessInfo`, similar to how the employee route works.

## Implementation Details

### File to Modify

- `src/app/api/dashboard/users/route.ts` - Update the GET handler to implement access-based filtering

### Filtering Logic

The filtering works in two layers:

1. **Access Level Filtering** - Based on user's role and access level
2. **StoreCode Filtering** - Based on `selectedStoreCode` (from query param or default)

#### Access Level Filtering:

1. **SUPER_ADMIN Role**

   - Can see all users (no access level restriction)

2. **COMPANY Access Level**

   - Filter users by `companyId` matching the logged-in user's `companyId`

3. **DEALER Access Level**

   - Filter users by `dealerId` matching the logged-in user's `dealerId`

4. **LOCATION Access Level**

   - If user has only **one** `storeCode` in `accessibleStoreCodes`: Return only the logged-in user's own record
   - If user has **multiple** `storeCodes`: Query master database to find users with access to those storeCodes

#### StoreCode Filtering (Applied to all access levels):

- Get `selectedStoreCode` using `getSelectedStoreCode(accessInfo, queryStoreCode)` (similar to employee route)
- Filter users to only include those who have access to the `selectedStoreCode`:
  - Query master database `UserStoreAccess` table to find all `userId`s that have access to `selectedStoreCode`
  - Get their `syncId` values from master `User` table
  - Filter location database users where `syncId` is in the list of found `syncIds`

### Implementation Steps

1. Import required utilities:

   - `getUserAccessInfo`, `getSelectedStoreCode` from `@/lib/auth/accessControl`
   - `masterPrisma` from `@/lib/databaseManager`

2. In the GET handler:

   - Get user session and validate
   - Call `getUserAccessInfo(parseInt(session.user.id))` to get access information
   - Get `selectedStoreCode` from query params using `getSelectedStoreCode(accessInfo, queryStoreCode)`
   - Validate that `selectedStoreCode` is accessible by the user
   - Build access level filter conditions:
     - `SUPER_ADMIN`: No access level filter
     - `COMPANY`: `{ companyId: accessInfo.companyId }`
     - `DEALER`: `{ dealerId: accessInfo.dealerId }`
     - `LOCATION`:
       - Single storeCode: `{ id: parseInt(session.user.id) }` (only own user)
       - Multiple storeCodes: No additional access level filter (will be filtered by storeCode)
   - Build storeCode filter:
     - Query master `UserStoreAccess` to find all `userId`s with access to `selectedStoreCode`
     - Get their `syncId`s from master `User` table
     - Add `syncId: { in: [...] }` to the where clause
   - Combine both filters and apply to Prisma query

3. Apply the combined filters to the Prisma query and return filtered results

### Key Considerations

- Users in location database are linked to master database via `syncId` field
- For LOCATION level with multiple storeCodes, we need to cross-reference master `UserStoreAccess` table
- Maintain existing password removal and response formatting
- Keep existing permission check (`users.view`) before applying filters

### Example Query Structure

```typescript
// Get selected storeCode
const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode);
if (!selectedStoreCode) {
  return NextResponse.json(
    { error: "No accessible store selected" },
    { status: 403 }
  );
}

// Step 1: Find all users with access to selectedStoreCode (from master DB)
const storeAccesses = await masterPrisma.userStoreAccess.findMany({
  where: { storeCode: selectedStoreCode },
  select: { userId: true },
});

const masterUserIds = storeAccesses.map((sa) => sa.userId);
const masterUsers = await masterPrisma.user.findMany({
  where: { userId: { in: masterUserIds } },
  select: { syncId: true },
});
const syncIds = masterUsers.map((u) => u.syncId).filter(Boolean);

// Step 2: Build access level filter
let accessLevelFilter: any = {};
if (accessInfo.accessLevel === "COMPANY" && accessInfo.companyId) {
  accessLevelFilter.companyId = BigInt(accessInfo.companyId);
} else if (accessInfo.accessLevel === "DEALER" && accessInfo.dealerId) {
  accessLevelFilter.dealerId = BigInt(accessInfo.dealerId);
} else if (
  accessInfo.accessLevel === "LOCATION" &&
  accessInfo.accessibleStoreCodes.length === 1
) {
  // Single storeCode: only own user
  accessLevelFilter.id = parseInt(session.user.id);
}

// Step 3: Combine filters
const whereClause = {
  ...accessLevelFilter,
  syncId: { in: syncIds }, // Filter by selectedStoreCode
};

// Step 4: Query location users
const users = await prisma.user.findMany({
  where: whereClause,
  include: { outlet: true },
  orderBy: { createdAt: "desc" },
});
```
