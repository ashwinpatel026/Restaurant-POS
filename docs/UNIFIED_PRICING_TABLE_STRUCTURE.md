# Unified Pricing Strategy Table Structure

## Overview

This document explains the unified `tbl_menu_item_pricestrategy` table structure that handles all pricing strategies (current and future) in one place.

---

## Table Structure

### Main Table: `tbl_menu_item_pricestrategy`

```
┌─────────────────────────────────────────────────────────────┐
│ tbl_menu_item_pricestrategy                                  │
├─────────────────────────────────────────────────────────────┤
│ id (BigInt, PK)                                             │
│ menu_item_code (String, UNIQUE)                             │
│ price_strategy (Int) ← Strategy type: 1,2,3,4+              │
│ card_price (Decimal?) ← Used for Base Price                 │
│ case_price (Decimal?) ← Used for Base Price                │
│ created_by, created_on, updated_by, updated_on             │
│ is_sync_to_web, is_sync_to_local, store_code               │
└─────────────────────────────────────────────────────────────┘
```

**One record per menu item** - Each menu item has exactly one pricing strategy record.

### Detail Table: `tbl_menu_item_pricestrategy_size`

```
┌─────────────────────────────────────────────────────────────┐
│ tbl_menu_item_pricestrategy_size                            │
├─────────────────────────────────────────────────────────────┤
│ id (BigInt, PK)                                             │
│ menu_item_code (String, FK → pricestrategy.menu_item_code)  │
│ size_name (String)                                          │
│ size_prefix (String?)                                       │
│ price (Decimal)                                             │
│ display_order (Int?)                                        │
│ is_active (Int)                                             │
│ created_by, created_on, updated_by, updated_on              │
│ is_sync_to_web, is_sync_to_local, store_code               │
│                                                             │
│ UNIQUE(menu_item_code, size_name)                          │
└─────────────────────────────────────────────────────────────┘
```

**Multiple records per menu item** - Used when `price_strategy = 2` (Size Price).

---

## How Each Strategy Works

### Strategy 1: Base Price

```
tbl_menu_item_pricestrategy:
┌──────────────┬──────────────────┬─────────────┬─────────────┐
│ menu_item_   │ price_strategy   │ card_price  │ case_price  │
│ code         │                  │             │             │
├──────────────┼──────────────────┼─────────────┼─────────────┤
│ PIZZA001     │ 1                │ 10.50      │ 9.50        │
└──────────────┴──────────────────┴─────────────┴─────────────┘

tbl_menu_item_pricestrategy_size:
(No records - empty)
```

**Usage:**

- `cardPrice` and `casePrice` fields are populated
- No records in size table

---

### Strategy 2: Size Price

```
tbl_menu_item_pricestrategy:
┌──────────────┬──────────────────┬─────────────┬─────────────┐
│ menu_item_   │ price_strategy   │ card_price  │ case_price  │
│ code         │                  │             │             │
├──────────────┼──────────────────┼─────────────┼─────────────┤
│ COFFEE001    │ 2                │ NULL        │ NULL        │
└──────────────┴──────────────────┴─────────────┴─────────────┘

tbl_menu_item_pricestrategy_size:
┌──────────────┬──────────────┬──────────────┬─────────────┐
│ menu_item_   │ size_name    │ size_prefix  │ price      │
│ code         │              │              │            │
├──────────────┼──────────────┼──────────────┼─────────────┤
│ COFFEE001    │ Small        │ S            │ 3.50       │
│ COFFEE001    │ Medium       │ M            │ 4.50       │
│ COFFEE001    │ Large        │ L            │ 5.50       │
└──────────────┴──────────────┴──────────────┴─────────────┘
```

**Usage:**

- `cardPrice` and `casePrice` are NULL
- Multiple records in size table (one per size)

---

### Strategy 3: Open Price

```
tbl_menu_item_pricestrategy:
┌──────────────┬──────────────────┬─────────────┬─────────────┐
│ menu_item_   │ price_strategy   │ card_price  │ case_price  │
│ code         │                  │             │             │
├──────────────┼──────────────────┼─────────────┼─────────────┤
│ CUSTOM001    │ 3                │ 0.00        │ 0.00        │
└──────────────┴──────────────────┴─────────────┴─────────────┘

tbl_menu_item_pricestrategy_size:
(No records - empty)
```

**Usage:**

- `cardPrice` and `casePrice` are set to 0
- No records in size table

---

### Future Strategy 4+: Example - Time-Based Pricing

```
tbl_menu_item_pricestrategy:
┌──────────────┬──────────────────┬─────────────┬─────────────┐
│ menu_item_   │ price_strategy   │ card_price  │ case_price  │
│ code         │                  │             │             │
├──────────────┼──────────────────┼─────────────┼─────────────┤
│ HAPPY001     │ 4                │ NULL        │ NULL        │
└──────────────┴──────────────────┴─────────────┴─────────────┘

tbl_menu_item_pricestrategy_size:
┌──────────────┬──────────────┬──────────────┬─────────────┐
│ menu_item_   │ size_name    │ size_prefix  │ price      │
│ code         │              │              │            │
├──────────────┼──────────────┼──────────────┼─────────────┤
│ HAPPY001     │ Regular      │ R            │ 10.00      │
│ HAPPY001     │ Happy Hour   │ HH           │ 7.00       │
└──────────────┴──────────────┴──────────────┴─────────────┘
```

**Usage:**

- Can reuse size table for time-based options
- Or add new nullable columns to main table if needed
- Or use JSON field for complex configurations

---

## Database Relationships

```
tbl_menu_item
    │
    │ (one-to-one)
    │
    ▼
tbl_menu_item_pricestrategy (main table)
    │
    │ (one-to-many)
    │
    ▼
tbl_menu_item_pricestrategy_size (detail table)
```

**Key Points:**

- Each `MenuItem` has exactly one `MenuItemPriceStrategy` record
- Each `MenuItemPriceStrategy` can have zero or more `MenuItemPriceStrategySize` records
- Cascade delete: Deleting a pricing strategy deletes all related sizes

---

## Query Examples

### Get Menu Item with Pricing Data

```typescript
const menuItem = await prisma.menuItem.findUnique({
  where: { menuItemCode: "PIZZA001" },
  include: {
    priceStrategyData: {
      include: {
        sizePrices: {
          orderBy: { displayOrder: "asc" },
        },
      },
    },
  },
});
```

### Get All Items with Base Price Strategy

```typescript
const basePriceItems = await prisma.menuItemPriceStrategy.findMany({
  where: {
    priceStrategy: 1,
    cardPrice: { not: null },
  },
  include: {
    // ... menu item data
  },
});
```

### Get All Items with Size Prices

```typescript
const sizePriceItems = await prisma.menuItemPriceStrategy.findMany({
  where: {
    priceStrategy: 2,
  },
  include: {
    sizePrices: {
      where: { isActive: 1 },
      orderBy: { displayOrder: "asc" },
    },
  },
});
```

---

## Benefits of Unified Structure

### ✅ Single Source of Truth

- All pricing strategies in one main table
- Easy to query and manage

### ✅ Extensible

- Add new strategy types (4, 5, 6...) without new tables
- Use existing columns or add nullable columns as needed

### ✅ Normalized

- Size details properly separated in detail table
- No data redundancy

### ✅ Query Efficient

- Single join to get all pricing data
- Indexed on `menu_item_code` for fast lookups

### ✅ Future-Proof

- Can accommodate new strategies without breaking changes
- Flexible enough for complex pricing models

---

## Migration Path

### Step 1: Create Tables

```sql
CREATE TABLE tbl_menu_item_pricestrategy (...);
CREATE TABLE tbl_menu_item_pricestrategy_size (...);
```

### Step 2: Migrate Existing Data

```sql
-- Migrate all menu items to unified table
INSERT INTO tbl_menu_item_pricestrategy
SELECT menu_item_code, price_strategy, base_price, base_price, ...
FROM tbl_menu_item;
```

### Step 3: Update Application Code

- Update Prisma schema
- Update API endpoints
- Update form components
- Test all strategies

---

## Summary

The unified `tbl_menu_item_pricestrategy` table provides:

1. **One table** for all pricing strategies
2. **One record** per menu item
3. **Flexible structure** for current and future needs
4. **Clean relationships** with detail table for sizes
5. **Easy to extend** without schema changes

This approach is **future-proof** and **maintainable**! 🚀
