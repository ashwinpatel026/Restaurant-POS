# Multi-Tenant Architecture - Implementation Suggestions

## Overview

This document outlines different approaches for implementing a multi-tenant system with:

- **Master Data**: Menu master, categories, items, modifiers, prep-zone, time-events, printer, tax, station, tables
- **Multi-Location**: Company-wise and Dealer-wise location management
- **Database Strategy**: Automatic database creation per location
- **Data Sync**: Master data synchronization to locations
- **User Access Control**: Location, Company, and Dealer-level privileges

---

## 1. Architecture Patterns

### Option A: Multi-Database Architecture (Recommended for Isolation)

**Structure:**

```
┌─────────────────────────────────────────────────────────┐
│ Master Database (Central)                               │
│ - Companies                                             │
│ - Dealers                                               │
│ - Locations/Stores                                      │
│ - Users                                                 │
│ - Master Data Templates                                │
│ - Sync Logs                                            │
└─────────────────────────────────────────────────────────┘
                    │
                    │ Sync
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌─────────▼────────┐
│ Location DB 1  │    │ Location DB 2    │
│ (Store Code)   │    │ (Store Code)     │
│                │    │                  │
│ - Menu Items   │    │ - Menu Items     │
│ - Orders       │    │ - Orders         │
│ - Transactions │    │ - Transactions   │
│ - Local Data   │    │ - Local Data     │
└────────────────┘    └──────────────────┘
```

**Pros:**

- ✅ Complete data isolation per location
- ✅ Better performance (smaller databases)
- ✅ Easier backup/restore per location
- ✅ Compliance-friendly (data residency)
- ✅ Scalable (can move databases to different servers)

**Cons:**

- ❌ More complex to manage multiple databases
- ❌ Cross-location queries require API aggregation
- ❌ More infrastructure overhead

---

### Option B: Single Database with Tenant Isolation

**Structure:**

```
┌─────────────────────────────────────────────────────────┐
│ Single Database (All Tenants)                           │
│                                                         │
│ - Companies (tenant_id)                                 │
│ - Dealers (company_id, tenant_id)                       │
│ - Locations/Stores (company_id, dealer_id, store_code)  │
│ - Users (company_id, location_id, role)                │
│ - Menu Items (store_code)                              │
│ - Orders (store_code)                                  │
│ - All data with store_code filter                      │
└─────────────────────────────────────────────────────────┘
```

**Pros:**

- ✅ Simpler to manage (one database)
- ✅ Easy cross-location queries
- ✅ Centralized backup
- ✅ Lower infrastructure cost

**Cons:**

- ❌ Data isolation depends on application logic
- ❌ Risk of data leakage if filters fail
- ❌ Performance issues with large datasets
- ❌ Harder to scale horizontally

---

### Option C: Hybrid Approach (Recommended for Your Case)

**Structure:**

```
┌─────────────────────────────────────────────────────────┐
│ Master Database (Central)                               │
│ - Companies                                             │
│ - Dealers                                               │
│ - Locations/Stores                                      │
│ - Users & Permissions                                   │
│ - Master Data Templates                                 │
│ - Sync Configuration                                    │
└─────────────────────────────────────────────────────────┘
                    │
                    │ Sync (API/Queue)
                    │
        ┌───────────┼───────────┐
        │           │           │
┌───────▼─────┐ ┌──▼──────┐ ┌──▼──────┐
│ Location DB │ │ Location│ │ Location│
│ Store Code  │ │ Store   │ │ Store   │
│             │ │ Code    │ │ Code    │
└─────────────┘ └─────────┘ └─────────┘
```

**Why Hybrid?**

- Master data stays centralized for easy management
- Location-specific data (orders, transactions) isolated
- Best of both worlds

---

## 2. Database Schema Design

### Master Database Schema

```prisma
// Master Database Models

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
  locationCode    String    @unique
  locationName    String
  companyId       BigInt
  dealerId        BigInt?
  storeCode       String    @unique // Used for location database connection
  databaseName    String?   // Location database name
  databaseUrl     String?   // Encrypted connection string
  address         String?
  phone           String?
  isActive        Int       @default(1)
  syncEnabled     Int       @default(1)
  lastSyncAt      DateTime?
  createdOn       DateTime  @default(now())

  company         Company   @relation(fields: [companyId], references: [companyId])
  dealer          Dealer?   @relation(fields: [dealerId], references: [dealerId])
  users           User[]

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
  accessLevel     AccessLevel // COMPANY, DEALER, LOCATION
  isActive        Boolean   @default(true)
  createdOn       DateTime  @default(now())

  company         Company?  @relation(fields: [companyId], references: [companyId])
  dealer          Dealer?   @relation(fields: [dealerId], references: [dealerId])
  location        Location? @relation(fields: [locationId], references: [locationId])

  @@map("tbl_user")
}

enum AccessLevel {
  COMPANY   // Access all locations in company
  DEALER    // Access all locations in dealer
  LOCATION  // Access only specific location
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

model MasterDataTemplate {
  templateId      BigInt    @id @default(autoincrement())
  templateName    String
  templateType    String    // MENU_MASTER, CATEGORIES, ITEMS, etc.
  templateData    Json      // Template configuration
  isActive        Int       @default(1)
  createdOn       DateTime  @default(now())

  @@map("tbl_master_data_template")
}

model SyncLog {
  syncLogId       BigInt    @id @default(autoincrement())
  locationId      BigInt
  storeCode       String
  syncType        String    // FULL, INCREMENTAL
  status          String    // SUCCESS, FAILED, IN_PROGRESS
  recordsSynced   Int?
  errorMessage    String?
  startedAt       DateTime  @default(now())
  completedAt     DateTime?

  location        Location  @relation(fields: [locationId], references: [locationId])

  @@map("tbl_sync_log")
}
```

### Location Database Schema (Per Store)

```prisma
// Location Database Models (Same as current, but with storeCode)

model MenuItem {
  // ... existing fields ...
  storeCode       String    @map("store_code")
  // ... rest of fields ...
}

model Order {
  // ... existing fields ...
  storeCode       String    @map("store_code")
  // ... rest of fields ...
}

// All tables include storeCode for filtering
```

---

## 3. Implementation Approaches

### Approach 1: Database Per Location (Recommended)

**Implementation Steps:**

1. **Location Creation Flow:**

   ```
   User creates location →
   Generate storeCode →
   Create new database →
   Run migrations →
   Sync master data →
   Store connection info in master DB
   ```

2. **Database Connection Management:**

   ```typescript
   // lib/database.ts
   export async function getLocationDatabase(storeCode: string) {
     // Fetch location config from master DB
     const location = await masterPrisma.location.findUnique({
       where: { storeCode },
       select: { databaseUrl: true, databaseName: true },
     });

     // Return Prisma client for location database
     return new PrismaClient({
       datasources: {
         db: { url: location.databaseUrl },
       },
     });
   }
   ```

3. **Master Data Sync Service:**

   ```typescript
   // services/syncService.ts
   export async function syncMasterData(storeCode: string) {
     const locationDb = await getLocationDatabase(storeCode);

     // Sync menu master
     await syncMenuMaster(storeCode, locationDb);

     // Sync categories
     await syncCategories(storeCode, locationDb);

     // Sync items
     await syncMenuItems(storeCode, locationDb);

     // Sync modifiers
     await syncModifiers(storeCode, locationDb);

     // Sync other master data...

     // Update sync log
     await updateSyncLog(storeCode, "SUCCESS");
   }
   ```

---

### Approach 2: Single Database with Row-Level Security

**Implementation:**

1. **Add Tenant Columns:**

   ```prisma
   model MenuItem {
     // ... existing fields ...
     companyId     BigInt?
     dealerId      BigInt?
     storeCode      String
     // ... rest of fields ...
   }
   ```

2. **Middleware for Tenant Filtering:**
   ```typescript
   // middleware/tenantMiddleware.ts
   export function withTenantFilter(prisma: PrismaClient, user: User) {
     // Apply filters based on user access level
     if (user.accessLevel === "LOCATION") {
       return prisma.$extends({
         query: {
           menuItem: {
             findMany: ({ args, query }) => {
               args.where = {
                 ...args.where,
                 storeCode: user.location.storeCode,
               };
               return query(args);
             },
           },
         },
       });
     }
     // ... handle COMPANY and DEALER levels
   }
   ```

---

## 4. User Access Control System

### Access Level Matrix

| Access Level | Can Access               | Scope                   |
| ------------ | ------------------------ | ----------------------- |
| **COMPANY**  | All locations in company | Company-wide operations |
| **DEALER**   | All locations in dealer  | Dealer's locations only |
| **LOCATION** | Single location only     | One store only          |

### Permission Structure

```typescript
interface UserPermissions {
  userId: number;
  companyId?: number;
  dealerId?: number;
  locationId?: number;
  accessLevel: "COMPANY" | "DEALER" | "LOCATION";
  role: UserRole;

  // Computed access
  accessibleStoreCodes: string[]; // Calculated based on access level
}

function calculateAccessibleStores(user: User): string[] {
  if (user.accessLevel === "COMPANY") {
    // Get all store codes for company
    return getAllStoreCodesForCompany(user.companyId);
  } else if (user.accessLevel === "DEALER") {
    // Get all store codes for dealer
    return getAllStoreCodesForDealer(user.dealerId);
  } else {
    // Single location
    return [user.location.storeCode];
  }
}
```

---

## 5. Data Synchronization Strategy

### Sync Types

1. **Initial Sync (Location Creation):**

   - Copy all master data templates
   - Create location-specific records
   - Set up initial configuration

2. **Incremental Sync:**

   - Sync only changed master data
   - Use timestamps or version numbers
   - Queue-based sync for reliability

3. **Bidirectional Sync (Optional):**
   - Location can push changes back to master
   - For reporting/analytics
   - Requires conflict resolution

### Sync Implementation

```typescript
// services/syncService.ts

export class SyncService {
  async syncToLocation(storeCode: string, dataType: string) {
    const locationDb = await getLocationDatabase(storeCode);
    const masterData = await this.getMasterData(dataType);

    // Transform and insert
    for (const item of masterData) {
      await locationDb[dataType].upsert({
        where: { code: item.code, storeCode },
        update: this.transformData(item, storeCode),
        create: this.transformData(item, storeCode),
      });
    }
  }

  private transformData(item: any, storeCode: string) {
    return {
      ...item,
      storeCode,
      isSyncToWeb: 0,
      isSyncToLocal: 0,
    };
  }
}
```

---

## 6. Recommended Implementation Plan

### Phase 1: Master Database Setup (Week 1-2)

- [ ] Create master database schema
- [ ] Implement Company, Dealer, Location models
- [ ] Create user management with access levels
- [ ] Build location creation API

### Phase 2: Multi-Database Infrastructure (Week 3-4)

- [ ] Database connection manager
- [ ] Dynamic database creation service
- [ ] Migration automation
- [ ] Connection pooling

### Phase 3: Data Synchronization (Week 5-6)

- [ ] Master data sync service
- [ ] Initial sync on location creation
- [ ] Incremental sync scheduler
- [ ] Sync logging and monitoring

### Phase 4: Access Control (Week 7-8)

- [ ] User permission middleware
- [ ] API route protection
- [ ] Store code filtering
- [ ] Access level validation

### Phase 5: UI Updates (Week 9-10)

- [ ] Company/Dealer/Location management UI
- [ ] User assignment interface
- [ ] Sync status dashboard
- [ ] Multi-tenant navigation

---

## 7. Best Practices

### Security

- ✅ Encrypt database connection strings
- ✅ Use row-level security where possible
- ✅ Implement API rate limiting per tenant
- ✅ Audit logs for all tenant operations

### Performance

- ✅ Connection pooling per location
- ✅ Cache frequently accessed tenant data
- ✅ Use read replicas for reporting
- ✅ Optimize sync operations (batch processing)

### Scalability

- ✅ Design for horizontal scaling
- ✅ Use message queues for sync operations
- ✅ Implement database sharding if needed
- ✅ Monitor database sizes per location

### Data Integrity

- ✅ Transaction management for syncs
- ✅ Idempotent sync operations
- ✅ Conflict resolution strategies
- ✅ Backup strategy per location

---

## 8. Technology Stack Recommendations

### Database

- **Master DB**: PostgreSQL (current)
- **Location DBs**: PostgreSQL (consistent)
- **Connection**: Prisma with dynamic datasources

### Sync Mechanism

- **Option 1**: Direct API calls (simpler)
- **Option 2**: Message Queue (RabbitMQ/Kafka) - better for scale
- **Option 3**: Event-driven (Redis Pub/Sub)

### Caching

- Redis for tenant metadata
- Cache store codes per user
- Cache connection strings (encrypted)

---

## 9. Cost Considerations

### Multi-Database Approach

- **Infrastructure**: Higher (multiple databases)
- **Management**: More complex
- **Scaling**: Better (can scale per location)
- **Compliance**: Better (data isolation)

### Single Database Approach

- **Infrastructure**: Lower (one database)
- **Management**: Simpler
- **Scaling**: Limited (vertical scaling)
- **Compliance**: Requires careful implementation

---

## 10. Migration Strategy

### Existing Data Migration

1. Create master database
2. Migrate existing stores to Location table
3. Assign default company/dealer
4. Create location databases gradually
5. Sync existing data to location databases
6. Switch application to use location databases

---

## Summary & Recommendation

**Recommended Approach: Hybrid Multi-Database Architecture**

**Why?**

1. ✅ Best data isolation and security
2. ✅ Scalable per location
3. ✅ Compliance-friendly
4. ✅ Better performance (smaller DBs)
5. ✅ Easier backup/restore

**Key Components:**

1. Master database for tenant management
2. Separate database per location/store
3. Centralized sync service
4. Role-based access control
5. Dynamic database connection management

**Next Steps:**

1. Review and approve architecture
2. Start with Phase 1 (Master DB setup)
3. Implement incrementally
4. Test with one location first
5. Scale gradually

---

## Questions to Consider

1. **Database Hosting**: Cloud (AWS RDS, Azure) or On-Premise?
2. **Sync Frequency**: Real-time or scheduled?
3. **Backup Strategy**: Per location or centralized?
4. **Reporting**: Cross-location analytics needed?
5. **Budget**: Infrastructure costs acceptable?

---

This architecture provides a solid foundation for a scalable multi-tenant restaurant POS system! 🚀
