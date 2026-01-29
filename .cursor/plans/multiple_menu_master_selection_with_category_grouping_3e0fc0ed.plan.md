---
name: Multiple Menu Master Selection with Category Grouping
overview: Transform the menu item form to support multiple menu master selection with one required category per master, displayed in an enhanced modal with grouped category selection.
todos:
  - id: update-modal
    content: Update MenuMasterCategorySelectionModal to support multiple master selection and grouped category display
    status: in_progress
  - id: update-master-form-state
    content: Update MasterMenuItemTabbedForm state to handle multiple masters and category map structure
    status: pending
  - id: update-master-form-ui
    content: Update MasterMenuItemTabbedForm UI to display multiple masters and grouped categories
    status: pending
  - id: update-dashboard-form-state
    content: Update MenuItemTabbedForm (dashboard) state to handle multiple masters and category map structure
    status: pending
  - id: update-dashboard-form-ui
    content: Update MenuItemTabbedForm (dashboard) UI to display multiple masters and grouped categories
    status: pending
  - id: update-master-api-routes
    content: Update master API routes to handle menuMasterCode as array and validate one category per master
    status: pending
  - id: update-dashboard-api-routes
    content: Update dashboard API routes to handle menuMasterCode as array and validate one category per master
    status: pending
  - id: update-validation
    content: Update validation schema to handle array inputs and ensure category count matches master count
    status: pending
  - id: handle-backward-compat
    content: Add backward compatibility handling for existing single-master items in both master and dashboard
    status: pending
isProject: false
---

# Multiple Menu Master Selection with Category Grouping

## Overview

Update both **master** and **dashboard** menu item add/edit pages to support multiple menu master selection, where each selected menu master requires exactly one category selection. Categories will be displayed grouped by menu master for better UX. The same pattern will be applied to both master and dashboard menu item pages.

## Data Structure Changes

### Form State Updates

- Change `formData.menuMasterCode` from `string` to `string[]` (array)
- Keep `formData.menuCategoryCode` as `string[]` (already array)
- Update state to track category selection per master: `Map<menuMasterCode, categoryCode>` or object structure

### Database Schema

- `menuMasterCode` field currently supports single value (`String?`)
- `menuCategoryCode` already supports JSON array
- **Decision needed**: Update schema to support `menuMasterCode` as JSON array, or keep as single value and store mapping differently

## Component Changes

### 1. MenuMasterCategorySelectionModal (`src/components/modals/MenuMasterCategorySelectionModal.tsx`)

**Current behavior:**

- Single menu master selection
- Multiple categories per master

**New behavior:**

- Step 1: Select multiple menu masters (multi-select with checkboxes)
- Step 2: For each selected master, show grouped category sections
- Require exactly one category per selected master
- Display validation errors if any master lacks a category

**Key changes:**

- Add `selectedMasters` state (Set<string>)
- Update UI to show master selection with checkboxes
- Group categories by master in step 2
- Add validation: one category required per master
- Update `onConfirm` callback signature to return: `{ masters: MenuMaster[], categoryMap: Map<masterCode, categoryCode> }`

### 2. MasterMenuItemTabbedForm (`src/components/forms/MasterMenuItemTabbedForm.tsx`)

**State updates:**

- Change `selectedMenuMaster` from `any | null` to `MenuMaster[]`
- Change `selectedCategories` from `Set<string>` to `Map<string, string>` (masterCode -> categoryCode)
- Update `formData.menuMasterCode` to array

**Effect hooks updates:**

- Update `useEffect` that filters categories to handle multiple masters
- Update department auto-selection logic for multiple masters
- Update modifier inheritance logic for multiple categories

**UI updates:**

- Display multiple selected menu masters with badges/chips
- Show categories grouped by master
- Update validation to ensure one category per master
- Update `handleMenuMasterCategorySelect` to handle new data structure

**Form submission:**

- Convert category map to array format: `[categoryCode1, categoryCode2, ...]`
- Ensure array order matches master order
- Update validation schema if needed

### 3. MenuItemTabbedForm - Dashboard (`src/components/forms/MenuItemTabbedForm.tsx`)

**Same updates as MasterMenuItemTabbedForm:**

- Change `selectedMenuMaster` from `any | null` to `MenuMaster[]`
- Change `selectedCategories` from `Set<string>` to `Map<string, string>` (masterCode -> categoryCode)
- Update `formData.menuMasterCode` to array
- Update all effect hooks for multiple masters
- Update UI to display multiple masters and grouped categories
- Update `handleMenuMasterCategorySelect` to handle new data structure
- Note: Uses `useApiWithStore` hook for store-specific API calls

### 4. Master API Route Updates (`src/app/api/master/menu-items/route.ts`)

**POST handler:**

- Accept `menuMasterCode` as array
- Accept `menuCategoryCode` as array
- Validate: arrays must have same length, one category per master
- Store `menuMasterCode` as JSON array (or update schema)

**PUT handler:**

- Same updates as POST
- Handle existing items with single master (backward compatibility)

### 5. Dashboard API Route Updates (`src/app/api/dashboard/menu-items/route.ts`)

**POST handler:**

- Accept `menuMasterCode` as array
- Accept `menuCategoryCode` as array
- Validate: arrays must have same length, one category per master
- Store `menuMasterCode` as JSON array (or update schema)
- Note: Uses store-specific Prisma client via `useApiWithStore`

**PUT handler:**

- Same updates as POST
- Handle existing items with single master (backward compatibility)

### 6. Master Edit Page Updates (`src/app/master/menu/items/[id]/edit/page.tsx`)

**Data loading:**

- Parse `menuMasterCode` from JSON if it's an array
- Handle backward compatibility for single master items
- Map existing data to new structure

### 7. Dashboard Edit Page Updates (`src/app/dashboard/menu/items/[id]/edit/page.tsx`)

**Data loading:**

- Parse `menuMasterCode` from JSON if it's an array
- Handle backward compatibility for single master items
- Map existing data to new structure
- Uses `useApiWithStore` for store-specific API calls

### 8. Master Add Page Updates (`src/app/master/menu/items/add/page.tsx`)

**Initialization:**

- Ensure form initializes with empty arrays for menuMasterCode
- Handle cloned item data structure conversion

### 9. Dashboard Add Page Updates (`src/app/dashboard/menu/items/add/page.tsx`)

**Initialization:**

- Ensure form initializes with empty arrays for menuMasterCode
- Handle cloned item data structure conversion
- Uses `useApiWithStore` for store-specific API calls

## Implementation Steps

### Phase 1: Shared Components

1. **Update MenuMasterCategorySelectionModal**

- Add multi-select for menu masters
- Implement grouped category display
- Add per-master category validation
- Update callback interface
- This modal is shared between master and dashboard forms

### Phase 2: Master Menu Items

2. **Update MasterMenuItemTabbedForm state management**

- Convert single master state to array
- Convert category Set to Map structure
- Update all related useEffect hooks

3. **Update MasterMenuItemTabbedForm UI**

- Display multiple masters with remove buttons
- Show categories grouped by master
- Update validation messages

4. **Update Master API routes** (`src/app/api/master/menu-items/route.ts`)

- Handle array inputs for menuMasterCode
- Add validation for one category per master
- Update database writes (consider schema change)

5. **Update Master Edit Page** (`src/app/master/menu/items/[id]/edit/page.tsx`)

- Parse menuMasterCode from JSON array
- Handle backward compatibility
- Map existing data to new structure

6. **Update Master Add Page** (`src/app/master/menu/items/add/page.tsx`)

- Initialize form with empty arrays
- Handle cloned item data conversion

### Phase 3: Dashboard Menu Items

7. **Update MenuItemTabbedForm (Dashboard) state management**

- Convert single master state to array
- Convert category Set to Map structure
- Update all related useEffect hooks
- Ensure `useApiWithStore` integration works correctly

8. **Update MenuItemTabbedForm (Dashboard) UI**

- Display multiple masters with remove buttons
- Show categories grouped by master
- Update validation messages

9. **Update Dashboard API routes** (`src/app/api/dashboard/menu-items/route.ts`)

- Handle array inputs for menuMasterCode
- Add validation for one category per master
- Update database writes (consider schema change)
- Ensure store-specific Prisma client usage

10. **Update Dashboard Edit Page** (`src/app/dashboard/menu/items/[id]/edit/page.tsx`)

- Parse menuMasterCode from JSON array
- Handle backward compatibility
- Map existing data to new structure
- Ensure `useApiWithStore` integration

11. **Update Dashboard Add Page** (`src/app/dashboard/menu/items/add/page.tsx`)

- Initialize form with empty arrays
- Handle cloned item data conversion
- Ensure `useApiWithStore` integration

### Phase 4: Validation & Compatibility

12. **Update validation schema** (`src/validation/menuItemSchema.ts`)

- Update menuMasterCode validation for array
- Ensure category array length matches master array length
- Apply to both master and dashboard forms

13. **Handle backward compatibility**

- Support existing items with single master in both master and dashboard
- Migration logic if schema changes
- Ensure edit pages handle both old and new data formats

## Database Schema Consideration

**Option A:** Keep `menuMasterCode` as `String?` and store as JSON string

- Pros: No schema migration needed
- Cons: Less type-safe, requires JSON parsing

**Option B:** Change `menuMasterCode` to `Json?` in schema

- Pros: Type-safe, consistent with menuCategoryCode
- Cons: Requires schema migration

**Recommendation:** Start with Option A (JSON string) for faster implementation, can migrate to Option B later if needed.

## Testing Considerations

### Master Menu Items Testing

- Test with 0, 1, and multiple menu masters
- Test category selection/removal per master
- Test form validation (missing category per master)
- Test backward compatibility with existing single-master items
- Test master API with array inputs
- Test master edit flow with existing data
- Test master add flow with new items
- Test master form submission and data persistence

### Dashboard Menu Items Testing

- Test with 0, 1, and multiple menu masters (same pattern as master)
- Test category selection/removal per master
- Test form validation (missing category per master)
- Test backward compatibility with existing single-master items
- Test dashboard API with array inputs (store-specific)
- Test dashboard edit flow with existing data
- Test dashboard add flow with new items
- Test dashboard form submission and data persistence
- Test store-specific API integration (`useApiWithStore`)
- Test with different store codes

### Cross-Cutting Testing

- Test modal component works correctly for both master and dashboard
- Test validation schema applies correctly to both forms
- Test data consistency between master and dashboard
- Test that both forms handle the same data structure
- Test error handling in both master and dashboard flows
- Test loading states in both forms
- Test form reset/clear functionality in both forms