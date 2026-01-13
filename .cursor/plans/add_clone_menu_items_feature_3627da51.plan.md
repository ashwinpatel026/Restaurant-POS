---
name: Add Clone Menu Items Feature
overview: Add a "Clone" button to the menu items list page that redirects to the add page with pre-populated data from the selected item. The add page will fetch the item data, transform it (append "Copy" to name), and allow the user to edit before saving.
todos:
  - id: "1"
    content: Add DocumentDuplicateIcon import and handleClone function to master menu items page
    status: completed
  - id: "2"
    content: Add Clone button to table view actions column in master menu items page
    status: completed
  - id: "3"
    content: Add Clone button to grid view action buttons in master menu items page
    status: completed
  - id: "4"
    content: Modify add page to handle cloneId query parameter and fetch item data
    status: completed
  - id: "5"
    content: Transform cloned data (remove IDs, append Copy to name, clear unique fields)
    status: completed
  - id: "6"
    content: Add clone functionality to dashboard menu items page (if needed)
    status: pending
  - id: "7"
    content: Test clone functionality with items that have modifiers, prep time, and images
    status: pending
---

# Add Clone Menu Items Feature

## Overview

Add a clone functionality to the menu items page that redirects users to the add page with pre-populated data from the selected item. The add page will fetch the full item data, transform it (appending "Copy" to the name and removing IDs), and allow the user to review/edit before saving.

## Implementation Details

### 1. UI Changes - Master Menu Items Page

**File**: `src/app/master/menu/items/page.tsx`

- Add `DocumentDuplicateIcon` import from `@heroicons/react/24/outline`
- Add a `handleClone` function that:
  - Takes the item ID as parameter
  - Navigates to `/master/menu/items/add?cloneId=[id]` using router.push()
- Add Clone button in both views:
  - **Table view**: Add button in the Actions column (around line 650-672)
  - **Grid view**: Add button in the action buttons section (around line 858-879)
- Use `DocumentDuplicateIcon` for the clone button with appropriate styling (similar to Edit/Delete buttons)

### 2. Modify Add Page to Handle Clone

**File**: `src/app/master/menu/items/add/page.tsx`

- Import `useSearchParams` from `next/navigation` to read query parameters
- Add state to store cloned item data: `const [clonedItem, setClonedItem] = useState<any>(null)`
- Add state for loading cloned data: `const [loadingClone, setLoadingClone] = useState(false)`
- In `useEffect`, check for `cloneId` query parameter:

  ```typescript
  const searchParams = useSearchParams();
  const cloneId = searchParams.get("cloneId");
  ```

- If `cloneId` exists:
  - Set `loadingClone` to true
  - Fetch item data from `/api/master/menu-items/[cloneId]` with authentication token
  - Transform the fetched data:
    - Remove `menuItemId`, `tblMenuItemId`, `menuItemCode` (let API generate new code)
    - Append " (Copy)" to `name` and `labelName` (if exists)
    - Clear `barcode` (should be unique)
    - Optionally clear `skuPlu` or keep it (user can modify)
    - Keep all other fields (modifiers, prep time, pricing, categories, tax settings, etc.)
  - Set transformed data to `clonedItem` state
  - Set `loadingClone` to false
  - Handle errors with toast notifications
- Pass `clonedItem` to `MasterMenuItemTabbedForm` as `menuItem` prop
- The form component already has a `useEffect` (line 207-257) that populates form data when `menuItem` prop is provided

### 3. Data Transformation Logic

When cloning, transform the fetched item data:

**Fields to preserve:**

- All basic fields (name, description, prices, etc.) - with name modified
- Modifier group assignments (`assignedModifiers`, `inheritModifiers`, `modifierAssignments`)
- Prep time data (`prepZoneCode`, `dimension`, `weight`, `prepTimeMinutes`)
- Category assignments (`menuCategoryCode`)
- Tax settings (`taxCode`, `inheritTaxInclusion`, `isTaxIncluded`, etc.)
- All boolean flags and settings
- Image (`menuImg`)
- Department code (`deptCode`)

**Fields to remove/modify:**

- `menuItemId` / `tblMenuItemId` - remove (new ID will be generated on save)
- `menuItemCode` - remove (API will generate new code on save)
- `name` - append " (Copy)" to existing name
- `labelName` - append " (Copy)" if exists
- `barcode` - clear (should be unique)
- `skuPlu` - keep or clear (user decision - can modify later)

### 4. Error Handling

- Handle cases where `cloneId` is invalid or item not found
- Show error toast: "Failed to load item for cloning"
- Handle network errors gracefully
- Show loading state while fetching cloned data

### 5. User Experience

- User clicks clone button → redirects to add page
- Add page shows loading state while fetching cloned data
- Form is pre-populated with cloned data (name has " (Copy)" appended)
- User can review and edit all fields before saving
- User saves normally - creates new item with new unique code
- Success message: "Menu item created successfully!" (existing behavior)

### 6. Dashboard Menu Items (Optional)

**File**: `src/app/dashboard/menu/items/page.tsx` and `src/app/dashboard/menu/items/add/page.tsx`

- Apply the same changes as master pages
- Use `/api/dashboard/menu/items/[id]` for fetching
- Include `storeCode` in API calls if needed

## Files to Modify

1. `src/app/master/menu/items/page.tsx` - Add clone button and navigation
2. `src/app/master/menu/items/add/page.tsx` - Handle cloneId query parameter and fetch/transform data
3. `src/app/dashboard/menu/items/page.tsx` - Add clone functionality (if needed)
4. `src/app/dashboard/menu/items/add/page.tsx` - Handle clone functionality (if needed)

## API Endpoints Used

- **Master**:
  - GET `/api/master/menu-items/[id]` - Fetch item to clone (returns full item with modifiers, prep time, etc.)
  - POST `/api/master/menu-items` - Create new item (existing endpoint, used when user saves)
- **Dashboard**:
  - GET `/api/dashboard/menu/items/[id]` - Fetch item to clone
  - POST `/api/dashboard/menu/items` - Create new item (existing endpoint)

## Data Flow

1. User clicks Clone button on item list
2. `handleClone(itemId)` navigates to `/master/menu/items/add?cloneId=[id]`
3. Add page reads `cloneId` from query params
4. Add page fetches full item data from API
5. Add page transforms data (removes IDs, appends "Copy" to name, clears barcode)
6. Transformed data passed to `MasterMenuItemTabbedForm` as `menuItem` prop
7. Form's existing `useEffect` populates form fields with cloned data
8. User reviews/edits and saves
9. Form submits to POST endpoint, creating new item with new unique code

## Testing Considerations

- Test cloning items with modifiers (verify modifiers are preserved)
- Test cloning items with prep time data (verify prep time fields are preserved)
- Test cloning items with images (verify image is preserved)
- Test with items that have multiple categories
- Test navigation flow (clone → add page → form populated)
- Test that user can edit cloned data before saving
- Test error handling (invalid cloneId, network errors)
- Test in both table and grid views
- Verify all relationships are preserved (modifiers, categories, tax settings, etc.)
