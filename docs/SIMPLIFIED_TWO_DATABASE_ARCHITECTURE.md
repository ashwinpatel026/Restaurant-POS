# Simplified Two-Database Architecture

## Overview

This approach uses **two databases**:

1. **Master Database**: Stores master data templates and tenant management
2. **Location Database**: Stores all location/store data (all stores in one database, separated by `storeCode`)

---

## Architecture Structure

```
┌─────────────────────────────────────────────────────────┐
│              MASTER DATABASE                            │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │Company   │  │Dealer    │  │Location  │            │
│  │          │  │          │  │          │            │
│  │- Code    │  │- Code    │  │- Code    │            │
│  │- Name    │  │- Name    │  │- Store   │            │
│  │          │  │- Company │  │  Code    │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                         │
│  ┌──────────┐  ┌──────────┐                          │
│  │Master    │  │User      │                          │
│  │Template  │  │          │                          │
│  │          │  │- Access  │                          │
│  │- Menu    │  │  Level   │                          │
│  │  Master  │  │- Company │                          │
│  │- Items   │  │- Dealer  │                          │
│  │- etc.    │  │- Location│                          │
│  └──────────┘  └──────────┘                          │
└─────────────────────────────────────────────────────────┘
                    │
                    │ Sync Master Data
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│           LOCATION DATABASE (All Stores)                │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Store Code: STORE001                             │  │
│  │ - Menu Items (storeCode = STORE001)             │  │
│  │ - Orders (storeCode = STORE001)                 │  │
│  │ - Transactions (storeCode = STORE001)           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Store Code: STORE002                             │  │
│  │ - Menu Items (storeCode = STORE002)             │  │
│  │ - Orders (storeCode = STORE002)                 │  │
│  │ - Transactions (storeCode = STORE002)           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Store Code: STORE003                             │  │
│  │ - Menu Items (storeCode = STORE003)             │  │
│  │ - Orders (storeCode = STORE003)                 │  │
│  │ - Transactions (storeCode = STORE003)           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  All data filtered by storeCode column                 │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema Design

### Master Database Schema

```prisma
// prisma/master-schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("MASTER_DATABASE_URL")
}

model Company {
  companyId        BigInt    @id @default(autoincrement())
  companyCode      String    @unique
  companyName      String
  address          String?
  phone            String?
  email            String?
  isActive         Int       @default(1)
  createdOn        DateTime  @default(now())

  dealers          Dealer[]
  locations        Location[]
  users            User[]

  @@map("tbl_company")
}

model Dealer {
  dealerId         BigInt    @id @default(autoincrement())
  dealerCode       String    @unique
  dealerName       String
  companyId        BigInt
  address          String?
  phone            String?
  email            String?
  isActive         Int       @default(1)
  createdOn        DateTime  @default(now())

  company          Company   @relation(fields: [companyId], references: [companyId])
  locations        Location[]
  users            User[]

  @@map("tbl_dealer")
}

model Location {
  locationId       BigInt    @id @default(autoincrement())
  locationCode     String    @unique
  locationName     String
  companyId        BigInt
  dealerId         BigInt?
  storeCode        String    @unique // Used to filter data in location DB
  address          String?
  phone            String?
  isActive         Int       @default(1)
  syncEnabled      Int       @default(1)
  lastSyncAt       DateTime?
  createdOn        DateTime  @default(now())

  company          Company   @relation(fields: [companyId], references: [companyId])
  dealer           Dealer?   @relation(fields: [dealerId], references: [dealerId])
  users            User[]

  @@map("tbl_location")
}

model User {
  userId          BigInt    @id @default(autoincrement())
  email           String    @unique
  username        String    @unique
  password        String
  firstName       String
  lastName        String
  companyId       BigInt?
  dealerId        BigInt?
  locationId      BigInt?
  role            UserRole
  accessLevel     AccessLevel
  isActive        Boolean   @default(true)
  createdOn       DateTime  @default(now())

  company         Company?  @relation(fields: [companyId], references: [companyId])
  dealer          Dealer?   @relation(fields: [dealerId], references: [dealerId])
  location        Location? @relation(fields: [locationId], references: [locationId])

  @@map("tbl_user")
}

// Master Data Templates (for syncing to locations)
model MasterDataTemplate {
  templateId      BigInt    @id @default(autoincrement())
  templateName    String
  templateType    String    // MENU_MASTER, CATEGORIES, ITEMS, MODIFIERS, etc.
  templateData    Json      // Template configuration/data
  isActive        Int       @default(1)
  createdOn       DateTime  @default(now())

  @@map("tbl_master_data_template")
}

enum AccessLevel {
  COMPANY
  DEALER
  LOCATION
}

enum UserRole {
  SUPER_ADMIN
  COMPANY_ADMIN
  DEALER_ADMIN
  OUTLET_MANAGER
  CAPTAIN
  CASHIER
  KITCHEN_STAFF
}
```

### Location Database Schema (Current Schema + storeCode)

```prisma
// prisma/schema.prisma (Your current schema)

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL") // Location database
}

// All existing models stay the same, but ensure storeCode is in all tables
model MenuItem {
  // ... existing fields ...
  storeCode       String    @map("store_code") @db.VarChar(100)
  // ... rest of fields ...

  @@index([storeCode]) // Important: Index for performance
}

model Order {
  // ... existing fields ...
  storeCode       String    @map("store_code") @db.VarChar(100)
  // ... rest of fields ...

  @@index([storeCode])
}

model OrderItem {
  // ... existing fields ...
  storeCode       String?   @map("store_code") @db.VarChar(100)
  // ... rest of fields ...

  @@index([storeCode])
}

// Add storeCode to ALL tables that need tenant isolation
// MenuMaster, MenuCategory, ModifierGroup, Tax, Station, Table, etc.
```

---

## Implementation Approach

### 1. Database Connection Setup

```typescript
// lib/database.ts

import { PrismaClient as MasterPrismaClient } from "@prisma/master-client";
import { PrismaClient as LocationPrismaClient } from "@prisma/client";

// Master database client (for tenant management)
export const masterPrisma = new MasterPrismaClient({
  datasources: {
    db: { url: process.env.MASTER_DATABASE_URL },
  },
});

// Location database client (shared by all stores)
export const locationPrisma = new LocationPrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

// Helper to get location DB with storeCode filter
export function getLocationDB(storeCode: string) {
  return locationPrisma;
}
```

### 2. Access Control Middleware

```typescript
// middleware/accessControl.ts

import { masterPrisma } from "@/lib/database";

export async function getAccessibleStores(userId: number): Promise<string[]> {
  const user = await masterPrisma.user.findUnique({
    where: { userId },
    include: {
      company: { include: { locations: true } },
      dealer: { include: { locations: true } },
      location: true,
    },
  });

  if (!user) return [];

  if (user.accessLevel === "COMPANY" && user.company) {
    return user.company.locations
      .filter((loc) => loc.isActive === 1)
      .map((loc) => loc.storeCode);
  }

  if (user.accessLevel === "DEALER" && user.dealer) {
    return user.dealer.locations
      .filter((loc) => loc.isActive === 1)
      .map((loc) => loc.storeCode);
  }

  if (user.accessLevel === "LOCATION" && user.location) {
    return [user.location.storeCode];
  }

  return [];
}

export async function checkStoreAccess(
  userId: number,
  storeCode: string
): Promise<boolean> {
  const accessibleStores = await getAccessibleStores(userId);
  return accessibleStores.includes(storeCode);
}
```

### 3. API Route Pattern

```typescript
// app/api/menu/items/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { locationPrisma } from "@/lib/database";
import {
  checkStoreAccess,
  getAccessibleStores,
} from "@/middleware/accessControl";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get storeCode from query or use first accessible store
    const storeCodeParam = request.nextUrl.searchParams.get("storeCode");
    const accessibleStores = await getAccessibleStores(
      parseInt(session.user.id)
    );

    if (accessibleStores.length === 0) {
      return NextResponse.json(
        { error: "No accessible stores" },
        { status: 403 }
      );
    }

    // Use provided storeCode or first accessible
    const storeCode = storeCodeParam || accessibleStores[0];

    // Verify access
    if (!accessibleStores.includes(storeCode)) {
      return NextResponse.json(
        { error: "Unauthorized store access" },
        { status: 403 }
      );
    }

    // Query location database with storeCode filter
    const items = await locationPrisma.menuItem.findMany({
      where: {
        storeCode: storeCode,
        isActive: 1,
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const storeCode = body.storeCode;

    // Verify access
    const hasAccess = await checkStoreAccess(
      parseInt(session.user.id),
      storeCode
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized store access" },
        { status: 403 }
      );
    }

    // Create in location database with storeCode
    const item = await locationPrisma.menuItem.create({
      data: {
        ...body,
        storeCode: storeCode, // Always include storeCode
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 4. Master Data Sync Service

```typescript
// services/syncService.ts

import { masterPrisma, locationPrisma } from "@/lib/database";

export async function syncMasterDataToLocation(storeCode: string) {
  try {
    // Sync Menu Master
    const menuMasters = await masterPrisma.masterDataTemplate.findMany({
      where: {
        templateType: "MENU_MASTER",
        isActive: 1,
      },
    });

    for (const template of menuMasters) {
      const masterData = template.templateData as any;

      await locationPrisma.menuMaster.upsert({
        where: {
          menuMasterCode_storeCode: {
            menuMasterCode: masterData.menuMasterCode,
            storeCode: storeCode,
          },
        },
        update: {
          ...masterData,
          storeCode: storeCode,
          isSyncToWeb: 0,
          isSyncToLocal: 0,
        },
        create: {
          ...masterData,
          storeCode: storeCode,
          isSyncToWeb: 0,
          isSyncToLocal: 0,
        },
      });
    }

    // Sync Categories
    // Sync Items
    // Sync Modifiers
    // ... etc

    // Update location sync timestamp
    await masterPrisma.location.update({
      where: { storeCode },
      data: { lastSyncAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error("Sync error:", error);
    throw error;
  }
}
```

---

## Benefits of This Approach

### ✅ Advantages

1. **Simpler Architecture**: Only 2 databases instead of N+1
2. **Easier Management**: One location database to maintain
3. **Cross-Location Queries**: Easy to query across stores
4. **Lower Infrastructure Cost**: Fewer databases
5. **Centralized Backup**: One location database to backup
6. **Better for Reporting**: Can aggregate data across locations easily
7. **Easier Migrations**: One migration for all locations

### ⚠️ Considerations

1. **Data Isolation**: Depends on application-level filtering (storeCode)
2. **Performance**: Need proper indexing on storeCode
3. **Security**: Must ensure storeCode filtering in ALL queries
4. **Scalability**: Single database may become bottleneck at very large scale

---

## Security Best Practices

### 1. Always Filter by storeCode

```typescript
// ✅ GOOD - Always include storeCode in WHERE clause
const items = await locationPrisma.menuItem.findMany({
  where: { storeCode: userStoreCode },
});

// ❌ BAD - Missing storeCode filter
const items = await locationPrisma.menuItem.findMany();
```

### 2. Use Prisma Middleware for Safety

```typescript
// lib/database.ts

locationPrisma.$use(async (params, next) => {
  // Automatically add storeCode filter if not present
  if (
    params.model &&
    ["MenuItem", "Order", "OrderItem"].includes(params.model)
  ) {
    if (params.action === "findMany" || params.action === "findFirst") {
      if (!params.args.where?.storeCode) {
        // Get storeCode from context (set in middleware)
        const storeCode = getStoreCodeFromContext();
        if (storeCode) {
          params.args.where = {
            ...params.args.where,
            storeCode: storeCode,
          };
        }
      }
    }
  }
  return next(params);
});
```

### 3. Database-Level Constraints

```sql
-- Add check constraints (if supported)
ALTER TABLE tbl_menu_item
ADD CONSTRAINT check_store_code
CHECK (store_code IS NOT NULL AND store_code != '');

-- Add indexes for performance
CREATE INDEX idx_menu_item_store_code ON tbl_menu_item(store_code);
CREATE INDEX idx_order_store_code ON tbl_order(store_code);
```

---

## Migration Strategy

### Step 1: Add storeCode to Existing Data

```sql
-- Add storeCode column to all tables
ALTER TABLE tbl_menu_item ADD COLUMN store_code VARCHAR(100);
ALTER TABLE tbl_order ADD COLUMN store_code VARCHAR(100);
-- ... etc

-- Set default storeCode for existing data (if you have a default)
UPDATE tbl_menu_item SET store_code = 'DEFAULT_STORE' WHERE store_code IS NULL;
UPDATE tbl_order SET store_code = 'DEFAULT_STORE' WHERE store_code IS NULL;

-- Make storeCode NOT NULL after setting defaults
ALTER TABLE tbl_menu_item ALTER COLUMN store_code SET NOT NULL;
ALTER TABLE tbl_order ALTER COLUMN store_code SET NOT NULL;

-- Add indexes
CREATE INDEX idx_menu_item_store_code ON tbl_menu_item(store_code);
CREATE INDEX idx_order_store_code ON tbl_order(store_code);
```

### Step 2: Create Master Database

```bash
# Create new database for master data
createdb restaurant_pos_master

# Run master schema migration
npx prisma migrate dev --schema=prisma/master-schema.prisma --name init_master
```

### Step 3: Update Application Code

1. Add storeCode to all API routes
2. Implement access control middleware
3. Update all database queries to include storeCode
4. Test with one store first

---

## Performance Optimization

### 1. Indexing Strategy

```prisma
model MenuItem {
  // ... fields ...
  storeCode       String    @map("store_code")

  @@index([storeCode])
  @@index([storeCode, isActive])
  @@index([storeCode, menuCategoryCode])
}

model Order {
  // ... fields ...
  storeCode       String    @map("store_code")

  @@index([storeCode])
  @@index([storeCode, status])
  @@index([storeCode, createdAt])
}
```

### 2. Query Optimization

```typescript
// ✅ GOOD - Indexed query
const items = await locationPrisma.menuItem.findMany({
  where: { storeCode: "STORE001" },
  take: 100,
});

// ✅ GOOD - Compound index usage
const orders = await locationPrisma.order.findMany({
  where: {
    storeCode: "STORE001",
    status: "PENDING",
  },
});
```

---

## Comparison: Two-DB vs Multi-DB

| Aspect                     | Two-DB Approach       | Multi-DB Approach          |
| -------------------------- | --------------------- | -------------------------- |
| **Databases**              | 2 (Master + Location) | N+1 (Master + N Locations) |
| **Complexity**             | Lower                 | Higher                     |
| **Cost**                   | Lower                 | Higher                     |
| **Data Isolation**         | Application-level     | Database-level             |
| **Cross-Location Queries** | Easy                  | Requires aggregation       |
| **Performance**            | Good (with indexes)   | Excellent (smaller DBs)    |
| **Scalability**            | Vertical scaling      | Horizontal scaling         |
| **Backup**                 | Simpler               | More complex               |

---

## Recommended Implementation

**For Your Use Case: Two-Database Approach is Perfect!**

**Why?**

1. ✅ Simpler to implement and maintain
2. ✅ Lower infrastructure costs
3. ✅ Easier cross-location reporting
4. ✅ Good performance with proper indexing
5. ✅ Easier migrations and updates

**When to Consider Multi-DB:**

- If you need strict data isolation (compliance)
- If you have 100+ locations
- If you need to scale databases independently
- If you need geographic data distribution

---

## Implementation Checklist

### Phase 1: Database Setup

- [ ] Create master database
- [ ] Add storeCode to all location database tables
- [ ] Create indexes on storeCode columns
- [ ] Migrate existing data with storeCode

### Phase 2: Master Database Schema

- [ ] Create Company, Dealer, Location models
- [ ] Create User model with access levels
- [ ] Create MasterDataTemplate model
- [ ] Run migrations

### Phase 3: Access Control

- [ ] Implement getAccessibleStores function
- [ ] Create access control middleware
- [ ] Add storeCode validation to all APIs

### Phase 4: Sync Service

- [ ] Create master data sync service
- [ ] Implement initial sync on location creation
- [ ] Add sync logging

### Phase 5: API Updates

- [ ] Update all API routes to filter by storeCode
- [ ] Add storeCode to all create/update operations
- [ ] Test with multiple stores

---

## Summary

**Yes, you can absolutely use this approach!**

**Two-Database Architecture:**

- ✅ Master Database: Tenant management + Master data templates
- ✅ Location Database: All store data (filtered by storeCode)
- ✅ Simpler than multi-DB approach
- ✅ Good performance with proper indexing
- ✅ Easier to manage and maintain

This is a **great choice** for most restaurant POS systems! 🚀
