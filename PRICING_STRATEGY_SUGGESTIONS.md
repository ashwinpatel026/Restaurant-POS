# Menu Item Pricing Strategy - Implementation Suggestions

## Overview

This document outlines the suggested approach for implementing the enhanced pricing strategy system for menu items with three pricing options: Base Price, Size Price, and Open Price.

---

## 1. Database Schema Changes

### Unified Pricing Strategy Table (Recommended)

This approach uses a single unified table `tbl_menu_item_pricestrategy` that can handle all current and future pricing strategies. This provides maximum flexibility and extensibility without requiring new tables for each strategy type.

#### Main Table: `tbl_menu_item_pricestrategy`

Stores the pricing strategy configuration for each menu item. One record per menu item.

```prisma
model MenuItemPriceStrategy {
  id              BigInt    @id @default(autoincrement()) @map("id")
  menuItemCode    String    @unique @map("menu_item_code") @db.VarChar(100)
  priceStrategy    Int       @map("price_strategy") // 1=Base Price, 2=Size Price, 3=Open Price, 4+=Future strategies

  // Base Price Strategy fields (nullable, used when priceStrategy = 1)
  cardPrice        Decimal?  @map("card_price") @db.Decimal(10, 2)
  casePrice        Decimal?  @map("case_price") @db.Decimal(10, 2)

  // Common fields for all strategies
  createdBy        Int?      @map("createdby")
  createdOn        DateTime  @default(now()) @map("createdon")
  updatedBy        Int?      @map("updatedby")
  updatedOn        DateTime? @map("updatedon")
  isSyncToWeb      Int       @default(0) @map("is_sync_to_web")
  isSyncToLocal    Int       @default(0) @map("is_sync_to_local")
  storeCode        String?   @map("store_code") @db.VarChar(100)

  // Relationships
  sizePrices       MenuItemPriceStrategySize[]

  @@map("tbl_menu_item_pricestrategy")
}
```

#### Detail Table: `tbl_menu_item_pricestrategy_size`

Stores size-wise pricing details for Size Price strategy (and potentially other multi-option strategies in the future).

```prisma
model MenuItemPriceStrategySize {
  id              BigInt    @id @default(autoincrement()) @map("id")
  menuItemCode    String    @map("menu_item_code") @db.VarChar(100)
  sizeName        String    @map("size_name") @db.VarChar(100)
  sizePrefix       String?   @map("size_prefix") @db.VarChar(50)
  price            Decimal   @map("price") @db.Decimal(10, 2)
  displayOrder     Int?      @map("display_order")
  isActive         Int       @default(1) @map("is_active")
  createdBy        Int?      @map("createdby")
  createdOn        DateTime  @default(now()) @map("createdon")
  updatedBy        Int?      @map("updatedby")
  updatedOn        DateTime? @map("updatedon")
  isSyncToWeb      Int       @default(0) @map("is_sync_to_web")
  isSyncToLocal    Int       @default(0) @map("is_sync_to_local")
  storeCode        String?   @map("store_code") @db.VarChar(100)

  // Relationship
  priceStrategy    MenuItemPriceStrategy @relation(fields: [menuItemCode], references: [menuItemCode], onDelete: Cascade)

  @@unique([menuItemCode, sizeName])
  @@map("tbl_menu_item_pricestrategy_size")
}
```

#### Update MenuItem Model

Add relationship reference:

```prisma
model MenuItem {
  // ... existing fields ...

  // Relationship
  priceStrategyData  MenuItemPriceStrategy?

  // ... rest of fields ...
}
```

### How It Works:

1. **Base Price Strategy (priceStrategy = 1)**:

   - Uses `cardPrice` and `casePrice` fields in main table
   - No records in size detail table

2. **Size Price Strategy (priceStrategy = 2)**:

   - `cardPrice` and `casePrice` are null
   - Multiple records in `tbl_menu_item_pricestrategy_size` table

3. **Open Price Strategy (priceStrategy = 3)**:

   - `cardPrice` and `casePrice` are set to 0 or null
   - No records in size detail table

4. **Future Strategies (priceStrategy = 4+)**:
   - Can add new nullable columns to main table if needed
   - Or use the size detail table for multi-option strategies
   - Or add a JSON field for flexible data storage

### Benefits of This Approach:

✅ **Single Source of Truth**: All pricing strategies in one main table  
✅ **Extensible**: Easy to add new strategies without creating new tables  
✅ **Normalized**: Size details in separate table (one-to-many relationship)  
✅ **Query Efficient**: Can query all pricing data with one join  
✅ **Future-Proof**: Can accommodate new strategy types without schema changes  
✅ **Clean Migration**: Simple to migrate existing data

### Alternative: JSON Storage for Future Flexibility

If you want even more flexibility for future strategies, you could add a JSON field:

```prisma
model MenuItemPriceStrategy {
  // ... existing fields ...

  // For future strategies or complex configurations
  strategyData      Json?     @map("strategy_data")

  // ... rest of fields ...
}
```

This allows storing any custom pricing configuration without schema changes, but makes querying more complex.

**Recommendation**: Use the unified table approach above for the best balance of structure and flexibility.

---

## 2. Form UI Changes

### Conditional Rendering Based on Price Strategy

The pricing section should dynamically show/hide fields based on the selected `priceStrategy`:

#### When `priceStrategy === 1` (Base Price):

- Show: Card Price input field
- Show: Case Price input field
- Hide: Size Price section
- Hide: Base Price field (or keep it as a fallback/display only)

#### When `priceStrategy === 2` (Size Price):

- Show: Dynamic list of sizes (with Add/Remove buttons)
- Each size row: Size Name, Prefix, Price
- Hide: Base Price, Card Price, Case Price fields

#### When `priceStrategy === 3` (Open Price):

- Show: Message indicating "Open Price - No fixed pricing"
- Set: Card Price = 0, Case Price = 0 (or null)
- Hide: All price input fields
- Display: Read-only message

### Form State Structure

```typescript
const [formData, setFormData] = useState({
  // ... existing fields ...
  priceStrategy: 1, // 1=Base Price, 2=Size Price, 3=Open Price

  // Base Price fields
  cardPrice: 0,
  casePrice: 0,

  // Size Price fields (array)
  sizePrices: [
    {
      id: null, // for new items
      sizeName: "",
      sizePrefix: "",
      price: 0,
      displayOrder: 0,
    },
  ],
});
```

---

## 3. Implementation Flow

### Step 1: Database Migration

1. Create new tables: `tbl_menu_item_base_price` and `tbl_menu_item_size_price`
2. Update Prisma schema
3. Run migration: `npx prisma migrate dev --name add_pricing_strategy_tables`

### Step 2: Update Form Component

1. Add state management for new pricing fields
2. Implement conditional rendering based on `priceStrategy`
3. Add validation logic:
   - Base Price: Require at least Card Price OR Case Price
   - Size Price: Require at least one size with name and price
   - Open Price: No validation needed

### Step 3: Update API Endpoints

1. Modify POST/PUT endpoints to handle:
   - Upsert `MenuItemPriceStrategy` record (one per menu item)
   - For Base Price: Set `cardPrice` and `casePrice`, clear size prices
   - For Size Price: Set `cardPrice` and `casePrice` to null, save/update size prices
   - For Open Price: Set `cardPrice` and `casePrice` to 0, clear size prices
   - Delete old size prices when switching strategies
2. Modify GET endpoints to include:
   - Related `priceStrategyData` with nested `sizePrices` array
   - Use Prisma `include` to fetch related size prices

### Step 4: Data Loading

When editing an existing item:

- Load `priceStrategyData` which contains:
  - `cardPrice` and `casePrice` if `priceStrategy === 1` (Base Price)
  - `sizePrices` array if `priceStrategy === 2` (Size Price)
  - Prices set to 0 if `priceStrategy === 3` (Open Price)
- Use Prisma query with `include` to fetch related size prices in one query

---

## 4. UI Component Structure

### Pricing Section Layout:

```
┌─────────────────────────────────────────┐
│ Pricing                                 │
├─────────────────────────────────────────┤
│ Price Strategy: [Dropdown]              │
│   - Base Price                          │
│   - Size Price                          │
│   - Open Price                          │
├─────────────────────────────────────────┤
│ [Conditional Content Based on Strategy] │
│                                         │
│ IF Base Price:                          │
│   Card Price: [input]                   │
│   Case Price: [input]                   │
│                                         │
│ IF Size Price:                          │
│   [Add Size Button]                     │
│   ┌─────────────────────────────────┐ │
│   │ Size Name | Prefix | Price | [X] │ │
│   └─────────────────────────────────┘ │
│   ┌─────────────────────────────────┐ │
│   │ Size Name | Prefix | Price | [X] │ │
│   └─────────────────────────────────┘ │
│                                         │
│ IF Open Price:                          │
│   ℹ️ Open Price - No fixed pricing     │
│   Card Price: 0.00 (read-only)         │
│   Case Price: 0.00 (read-only)         │
└─────────────────────────────────────────┘
```

---

## 5. Validation Rules

### Base Price Strategy:

- At least one of Card Price or Case Price must be provided
- Both prices must be >= 0
- If only one is provided, the other can be null/0

### Size Price Strategy:

- At least one size must be added
- Each size must have:
  - Size Name (required, unique per item)
  - Price (required, >= 0)
  - Prefix (optional)
- Size names must be unique within the same menu item

### Open Price Strategy:

- No validation required
- Prices automatically set to 0

---

## 6. API Response Structure

### GET /api/menu/items/:id

With unified table structure, the response includes `priceStrategyData`:

**Base Price Strategy (priceStrategy = 1):**

```json
{
  "menuItemId": 1,
  "name": "Pizza",
  "priceStrategy": 1,
  "priceStrategyData": {
    "id": 1,
    "menuItemCode": "PIZZA001",
    "priceStrategy": 1,
    "cardPrice": 10.5,
    "casePrice": 9.5,
    "sizePrices": [] // empty for Base Price strategy
  }
}
```

**Size Price Strategy (priceStrategy = 2):**

```json
{
  "menuItemId": 2,
  "name": "Coffee",
  "priceStrategy": 2,
  "priceStrategyData": {
    "id": 2,
    "menuItemCode": "COFFEE001",
    "priceStrategy": 2,
    "cardPrice": null,
    "casePrice": null,
    "sizePrices": [
      {
        "id": 1,
        "sizeName": "Small",
        "sizePrefix": "S",
        "price": 3.5,
        "displayOrder": 1
      },
      {
        "id": 2,
        "sizeName": "Large",
        "sizePrefix": "L",
        "price": 5.5,
        "displayOrder": 2
      }
    ]
  }
}
```

**Open Price Strategy (priceStrategy = 3):**

```json
{
  "menuItemId": 3,
  "name": "Custom Item",
  "priceStrategy": 3,
  "priceStrategyData": {
    "id": 3,
    "menuItemCode": "CUSTOM001",
    "priceStrategy": 3,
    "cardPrice": 0,
    "casePrice": 0,
    "sizePrices": [] // empty for Open Price strategy
  }
}
```

---

## 7. Migration Considerations

### Existing Data Migration:

**Migration Script Example:**

```sql
-- Step 1: Create the unified pricing strategy table
-- (Done via Prisma migration)

-- Step 2: Migrate existing menu items to new table
INSERT INTO tbl_menu_item_pricestrategy (menu_item_code, price_strategy, card_price, case_price, createdon, is_sync_to_web, is_sync_to_local)
SELECT
  menu_item_code,
  COALESCE(price_strategy, 1) as price_strategy,
  CASE
    WHEN COALESCE(price_strategy, 1) = 1 THEN base_price
    WHEN COALESCE(price_strategy, 1) = 3 THEN 0
    ELSE NULL
  END as card_price,
  CASE
    WHEN COALESCE(price_strategy, 1) = 1 THEN base_price
    WHEN COALESCE(price_strategy, 1) = 3 THEN 0
    ELSE NULL
  END as case_price,
  createdon,
  is_sync_to_web,
  is_sync_to_local
FROM tbl_menu_item
WHERE menu_item_code IS NOT NULL;

-- Step 3: Migrate size prices if they exist elsewhere
-- (Adjust based on your existing data structure)
```

**Migration Notes:**

- Items with `priceStrategy = 1`: Migrate `basePrice` to both `cardPrice` and `casePrice` (or set `casePrice` to null if different pricing needed)
- Items with `priceStrategy = 2`: Create size entries in `tbl_menu_item_pricestrategy_size` table
- Items with `priceStrategy = 3`: Set both prices to 0
- All items get one record in the unified table

---

## 8. Benefits of This Approach

1. **Normalized Data**: Separate tables prevent data redundancy
2. **Scalability**: Easy to add more pricing types in future
3. **Flexibility**: Can support multiple sizes per item
4. **Data Integrity**: Foreign key relationships ensure data consistency
5. **Query Performance**: Can efficiently query prices by strategy type

---

## 9. Alternative: JSON Storage (Not Recommended)

You could store size prices as JSON in MenuItem table, but this approach:

- ❌ Makes querying difficult
- ❌ No referential integrity
- ❌ Harder to maintain
- ❌ Less flexible for reporting

**Recommendation**: Use separate tables (Option A).

---

## 10. Next Steps

1. Review and approve this approach
2. Create database migration scripts
3. Update Prisma schema
4. Modify form component with conditional rendering
5. Update API endpoints for CRUD operations
6. Add validation and error handling
7. Test all three pricing strategies
8. Update documentation

---

## Questions to Consider

1. **Card vs Cash**: You mentioned "Card Price" and "Case Price" - is "Case Price" meant to be "Cash Price"? Please confirm.

2. **Size Display Order**: Should sizes have a specific display order in POS/Kiosk?

3. **Default Size**: Should one size be marked as default for Size Price strategy?

4. **Price History**: Do you need to track price changes over time? (Would require additional audit table)

5. **Bulk Operations**: Do you need to bulk update prices for multiple items?

---

## Summary

**Recommended Approach:**

- ✅ Create unified table: `tbl_menu_item_pricestrategy` (main table)
- ✅ Create detail table: `tbl_menu_item_pricestrategy_size` (for size prices)
- ✅ One record per menu item in main table, multiple size records when needed
- ✅ Update form to conditionally render based on `priceStrategy`
- ✅ Update API to handle CRUD operations for unified table structure
- ✅ Set Card/Case prices to 0 when Open Price is selected
- ✅ Validate inputs based on selected strategy
- ✅ Future-proof: Easy to add new strategy types without new tables

This unified approach provides a clean, scalable solution that maintains data integrity, allows for future enhancements, and keeps all pricing strategies in one place for easier management and querying.
