# Pricing Strategy Implementation - Quick Summary

## Overview

This document provides a quick reference for implementing the three-tier pricing strategy system.

---

## Requirements Recap

1. **Price Strategy Options:**

   - Base Price (value: 1)
   - Size Price (value: 2)
   - Open Price (value: 3)

2. **Base Price Strategy:**

   - Two price fields: Card Price and Case Price
   - At least one must be provided

3. **Size Price Strategy:**

   - Multiple sizes per item
   - Each size: Name, Prefix (optional), Price
   - At least one size required

4. **Open Price Strategy:**
   - Card Price = 0
   - Case Price = 0
   - No user input required

---

## Database Changes Required

### Unified Pricing Strategy Table (Recommended):

**Main Table: `tbl_menu_item_pricestrategy`**

- One record per menu item
- Stores: priceStrategy type, cardPrice, casePrice
- Handles all current and future pricing strategies

**Detail Table: `tbl_menu_item_pricestrategy_size`**

- Stores size-wise pricing (for Size Price strategy)
- One-to-many relationship with main table
- Fields: sizeName, sizePrefix, price, displayOrder

### Prisma Schema Addition:

```prisma
model MenuItemPriceStrategy {
  id              BigInt    @id @default(autoincrement())
  menuItemCode    String    @unique
  priceStrategy    Int       // 1=Base, 2=Size, 3=Open, 4+=Future
  cardPrice        Decimal?
  casePrice        Decimal?
  sizePrices       MenuItemPriceStrategySize[]
  // ... standard fields ...
}

model MenuItemPriceStrategySize {
  id              BigInt    @id @default(autoincrement())
  menuItemCode    String
  sizeName        String
  sizePrefix       String?
  price            Decimal
  displayOrder     Int?
  // ... standard fields ...
  @@unique([menuItemCode, sizeName])
}
```

**Benefits:**

- ✅ All pricing strategies in one unified table
- ✅ Easy to add new strategies without new tables
- ✅ Future-proof and extensible

---

## Form Component Changes

### Key Modifications:

1. **Add to formData state:**

   ```typescript
   cardPrice: 0,
   casePrice: 0,
   sizePrices: []
   ```

2. **Conditional Rendering:**

   - Show Card/Case inputs when `priceStrategy === 1`
   - Show Size list when `priceStrategy === 2`
   - Show info message when `priceStrategy === 3`

3. **Validation:**
   - Base Price: Require at least one price
   - Size Price: Require at least one size with name and price
   - Open Price: No validation needed

---

## API Changes Required

### POST/PUT Endpoints:

1. **Save Base Price:**

   ```typescript
   if (priceStrategy === 1) {
     await upsertBasePrice(menuItemCode, { cardPrice, casePrice });
   }
   ```

2. **Save Size Prices:**

   ```typescript
   if (priceStrategy === 2) {
     await deleteOldSizes(menuItemCode);
     await createSizePrices(menuItemCode, sizePrices);
   }
   ```

3. **Open Price:**
   ```typescript
   if (priceStrategy === 3) {
     await setPricesToZero(menuItemCode);
   }
   ```

### GET Endpoints:

Include related pricing data:

```typescript
const menuItem = await prisma.menuItem.findUnique({
  where: { menuItemCode },
  include: {
    basePrice: true,
    sizePrices: { orderBy: { displayOrder: "asc" } },
  },
});
```

---

## Implementation Checklist

### Phase 1: Database

- [ ] Create migration for `tbl_menu_item_pricestrategy` (main table)
- [ ] Create migration for `tbl_menu_item_pricestrategy_size` (detail table)
- [ ] Update Prisma schema with unified models
- [ ] Run migrations
- [ ] Test database relationships
- [ ] Migrate existing data to new unified structure

### Phase 2: Backend API

- [ ] Update GET endpoint to include `priceStrategyData` with nested `sizePrices`
- [ ] Update POST endpoint to upsert unified pricing strategy record
- [ ] Handle Base Price: save cardPrice/casePrice, clear sizes
- [ ] Handle Size Price: save sizes, set cardPrice/casePrice to null
- [ ] Handle Open Price: set prices to 0, clear sizes
- [ ] Update PUT endpoint to handle strategy switching
- [ ] Add validation logic for each strategy type
- [ ] Test API endpoints for all three strategies

### Phase 3: Frontend Form

- [ ] Add pricing state to formData
- [ ] Implement conditional rendering
- [ ] Add Card/Case price inputs
- [ ] Add dynamic size list component
- [ ] Add validation functions
- [ ] Update submit handler
- [ ] Update data loading for edit mode
- [ ] Test all three strategies

### Phase 4: Testing

- [ ] Test Base Price creation
- [ ] Test Size Price creation (multiple sizes)
- [ ] Test Open Price creation
- [ ] Test editing existing items
- [ ] Test switching between strategies
- [ ] Test validation errors
- [ ] Test data persistence

---

## Important Notes

1. **Data Migration:**

   - Existing items with `priceStrategy = 1` need base price migration
   - Consider default values for existing data

2. **Validation:**

   - Size names must be unique per item
   - Prices cannot be negative
   - At least one price/size required based on strategy

3. **UI/UX:**

   - Clear visual distinction between strategies
   - Helpful error messages
   - Prevent data loss when switching strategies

4. **Performance:**
   - Index `menuItemCode` in new tables
   - Use transactions for related operations
   - Consider caching for frequently accessed items

---

## Files to Modify

### Database:

- `prisma/schema.prisma` - Add unified `MenuItemPriceStrategy` and `MenuItemPriceStrategySize` models
- Create migration files for unified table structure

### Backend:

- `src/app/api/menu/items/route.ts` - Update GET/POST/PUT
- Create new API routes if needed for pricing CRUD

### Frontend:

- `src/components/forms/MenuItemTabbedForm.tsx` - Main form component
- Potentially create separate components:
  - `BasePriceInput.tsx`
  - `SizePriceList.tsx`
  - `OpenPriceDisplay.tsx`

---

## Questions to Resolve

1. ✅ **Confirmed:** "Case Price" is correct (not "Cash Price")?
2. ❓ **Size Display Order:** Should sizes be sortable/reorderable?
3. ❓ **Default Size:** Should one size be marked as default?
4. ❓ **Price History:** Need audit trail for price changes?
5. ❓ **Bulk Operations:** Need bulk price update functionality?

---

## Next Steps

1. **Review** the detailed suggestions in `PRICING_STRATEGY_SUGGESTIONS.md`
2. **Review** the form examples in `PRICING_FORM_EXAMPLE.md`
3. **Confirm** the approach and answer any questions
4. **Start** with database migration
5. **Implement** backend API changes
6. **Update** frontend form component
7. **Test** thoroughly before deployment

---

## Support Documents

- `PRICING_STRATEGY_SUGGESTIONS.md` - Detailed architecture and database design
- `PRICING_FORM_EXAMPLE.md` - Complete form component code examples
- `PRICING_IMPLEMENTATION_SUMMARY.md` - This quick reference guide

---

**Ready to proceed?** Once you confirm the approach and answer any questions, we can start implementing the changes step by step.
