# Multi-Tenant System - Quick Start Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MASTER DATABASE                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Company   │  │Dealer    │  │Location  │  │User      │   │
│  │          │  │          │  │          │  │          │   │
│  │- Code    │  │- Code    │  │- Code    │  │- Email   │   │
│  │- Name    │  │- Name    │  │- Name    │  │- Role    │   │
│  │          │  │- Company │  │- Store   │  │- Access  │   │
│  │          │  │  ID      │  │  Code    │  │  Level   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌──────────┐  ┌──────────┐                                │
│  │Master    │  │Sync Log  │                                │
│  │Template  │  │          │                                │
│  └──────────┘  └──────────┘                                │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ Sync Master Data
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│ LOCATION DB  │ │ LOCATION DB │ │ LOCATION DB │
│ Store Code:  │ │ Store Code: │ │ Store Code: │
│ STORE001     │ │ STORE002    │ │ STORE003    │
│              │ │             │ │             │
│ - Menu Items │ │ - Menu Items│ │ - Menu Items│
│ - Orders     │ │ - Orders    │ │ - Orders    │
│ - Trans.     │ │ - Trans.    │ │ - Trans.    │
└──────────────┘ └─────────────┘ └─────────────┘
```

---

## User Access Levels

### 1. COMPANY Level Access

```
User → Company → All Locations in Company
```

- Can access all stores under the company
- Can manage company-wide settings
- Can view cross-location reports

### 2. DEALER Level Access

```
User → Dealer → All Locations in Dealer
```

- Can access all stores under the dealer
- Cannot access other dealers' stores
- Can manage dealer-level settings

### 3. LOCATION Level Access

```
User → Location → Single Store Only
```

- Can access only assigned location
- Cannot see other locations
- Most restricted access

---

## Implementation Checklist

### Step 1: Master Database Schema

```prisma
// Add to master database schema
model Company { ... }
model Dealer { ... }
model Location { ... }
model User { ... }
```

### Step 2: Database Connection Manager

```typescript
// lib/databaseManager.ts
export function getLocationDB(storeCode: string) {
  // Return Prisma client for location database
}
```

### Step 3: Sync Service

```typescript
// services/syncService.ts
export async function syncMasterData(storeCode: string) {
  // Sync all master data to location
}
```

### Step 4: Access Control Middleware

```typescript
// middleware/accessControl.ts
export function checkAccess(user: User, storeCode: string) {
  // Verify user can access this store
}
```

### Step 5: API Route Updates

```typescript
// All API routes need storeCode filtering
export async function GET(request: NextRequest) {
  const storeCode = getStoreCodeFromRequest(request);
  const db = getLocationDB(storeCode);
  // Use location-specific database
}
```

---

## Quick Implementation Steps

### Phase 1: Setup (Week 1)

1. Create master database
2. Add Company/Dealer/Location models
3. Create location creation API

### Phase 2: Multi-DB (Week 2)

1. Database connection manager
2. Dynamic database creation
3. Test with one location

### Phase 3: Sync (Week 3)

1. Master data sync service
2. Initial sync on creation
3. Test sync process

### Phase 4: Access Control (Week 4)

1. User access level system
2. API route protection
3. Test permissions

---

## Key Files to Create/Modify

### New Files:

- `prisma/master-schema.prisma` - Master database schema
- `lib/databaseManager.ts` - Database connection manager
- `services/syncService.ts` - Data synchronization
- `middleware/accessControl.ts` - Access control
- `app/api/locations/route.ts` - Location management
- `app/api/companies/route.ts` - Company management
- `app/api/dealers/route.ts` - Dealer management

### Modified Files:

- All API routes: Add storeCode filtering
- All database queries: Use location-specific DB
- User authentication: Include access level
- UI components: Show based on access level

---

## Example: Location Creation Flow

```typescript
// POST /api/locations
async function createLocation(data: LocationData) {
  // 1. Create location record in master DB
  const location = await masterPrisma.location.create({
    data: {
      locationCode: generateCode(),
      storeCode: generateStoreCode(),
      companyId: data.companyId,
      dealerId: data.dealerId,
      // ...
    },
  });

  // 2. Create location database
  await createLocationDatabase(location.storeCode);

  // 3. Run migrations on location DB
  await runMigrations(location.storeCode);

  // 4. Sync master data
  await syncMasterData(location.storeCode);

  // 5. Return location info
  return location;
}
```

---

## Example: API Route with Access Control

```typescript
// GET /api/menu/items
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getUserWithAccess(session.user.id);

  // Get store codes user can access
  const accessibleStores = getAccessibleStores(user);

  // Get storeCode from query or use first accessible
  const storeCode =
    request.nextUrl.searchParams.get("storeCode") || accessibleStores[0];

  // Verify access
  if (!accessibleStores.includes(storeCode)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get location-specific database
  const db = await getLocationDatabase(storeCode);

  // Query location database
  const items = await db.menuItem.findMany({
    where: { storeCode },
  });

  return NextResponse.json(items);
}
```

---

## Database Connection Pattern

```typescript
// lib/databaseManager.ts

const locationClients = new Map<string, PrismaClient>();

export async function getLocationDatabase(
  storeCode: string
): Promise<PrismaClient> {
  // Check cache
  if (locationClients.has(storeCode)) {
    return locationClients.get(storeCode)!;
  }

  // Get connection info from master DB
  const location = await masterPrisma.location.findUnique({
    where: { storeCode },
    select: { databaseUrl: true },
  });

  if (!location) {
    throw new Error(`Location ${storeCode} not found`);
  }

  // Create new Prisma client
  const client = new PrismaClient({
    datasources: {
      db: { url: decrypt(location.databaseUrl) },
    },
  });

  // Cache client
  locationClients.set(storeCode, client);

  return client;
}
```

---

## Sync Service Pattern

```typescript
// services/syncService.ts

export async function syncMasterData(storeCode: string) {
  const locationDb = await getLocationDatabase(storeCode);

  // Sync Menu Master
  const menuMasters = await masterPrisma.menuMaster.findMany();
  for (const master of menuMasters) {
    await locationDb.menuMaster.upsert({
      where: { menuMasterCode: master.menuMasterCode, storeCode },
      update: { ...master, storeCode },
      create: { ...master, storeCode },
    });
  }

  // Sync Categories
  // Sync Items
  // Sync Modifiers
  // ... etc

  // Log sync
  await masterPrisma.syncLog.create({
    data: {
      storeCode,
      status: "SUCCESS",
      recordsSynced: menuMasters.length,
      completedAt: new Date(),
    },
  });
}
```

---

## Access Level Calculation

```typescript
// lib/accessControl.ts

export function getAccessibleStores(user: User): string[] {
  if (user.accessLevel === "COMPANY") {
    // Get all stores for company
    return await masterPrisma.location
      .findMany({
        where: { companyId: user.companyId, isActive: 1 },
        select: { storeCode: true },
      })
      .then((locs) => locs.map((l) => l.storeCode));
  } else if (user.accessLevel === "DEALER") {
    // Get all stores for dealer
    return await masterPrisma.location
      .findMany({
        where: { dealerId: user.dealerId, isActive: 1 },
        select: { storeCode: true },
      })
      .then((locs) => locs.map((l) => l.storeCode));
  } else {
    // Single location
    return [user.location.storeCode];
  }
}
```

---

## Environment Variables

```env
# Master Database
MASTER_DATABASE_URL=postgresql://...

# Location Database Template
LOCATION_DB_TEMPLATE=postgresql://user:pass@host/{STORE_CODE}?schema=public

# Encryption Key for DB URLs
DB_ENCRYPTION_KEY=your-secret-key

# Default Company/Dealer
DEFAULT_COMPANY_ID=1
```

---

## Next Steps

1. **Review Architecture**: Read `MULTI_TENANT_ARCHITECTURE_SUGGESTIONS.md`
2. **Choose Approach**: Multi-DB vs Single-DB
3. **Start Implementation**: Begin with Phase 1
4. **Test Incrementally**: One location at a time
5. **Scale Gradually**: Add locations as needed

---

**Ready to start?** Begin with creating the master database schema and location management APIs! 🚀
