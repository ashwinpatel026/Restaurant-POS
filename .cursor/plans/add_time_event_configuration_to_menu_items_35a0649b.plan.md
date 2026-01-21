---
name: Add Time Event Configuration to Menu Items
overview: Add a "Time Event Configuration" section to both the add and edit menu item pages that displays department-filtered time events with editable formula values when Fixed Value is enabled.
todos:
  - id: create-api-endpoint-time-events-by-dept
    content: Create or update API endpoint to fetch time events filtered by department code
    status: pending
  - id: create-api-endpoint-update-formula
    content: Create API endpoint to update menu item time event formula value (PUT /api/master/menu-items/[id]/time-events/[eventCode])
    status: pending
  - id: add-time-event-state-management
    content: Add state management for time events and formula values in MasterMenuItemTabbedForm
    status: pending
  - id: add-fetch-time-events-effect
    content: Add useEffect hook to fetch time events when department is selected
    status: pending
    dependencies:
      - create-api-endpoint-time-events-by-dept
  - id: add-time-event-config-section
    content: Add Time Event Configuration section UI with table (Event Name, Formula Value, Actions) after Prep-Zone section
    status: pending
    dependencies:
      - add-time-event-state-management
  - id: implement-update-formula-handler
    content: Implement Update button handler to call API and update formula value
    status: pending
    dependencies:
      - create-api-endpoint-update-formula
      - add-time-event-config-section
  - id: handle-edit-mode-formula-values
    content: Fetch and populate existing formula values when editing a menu item
    status: pending
    dependencies:
      - add-fetch-time-events-effect
---

# Add Time Event Configuration Section to Menu Item Pages

## Overview

Add a "Time Event Configuration" section to both `/master/menu/items/add` and `/master/menu/items/[id]/edit` pages. This section will display time events filtered by the selected department and allow editing of formula values when Fixed Value is enabled.

## Implementation Details

### 1. API Endpoint for Fetching Department Time Events

- **File**: `src/app/api/master/time-event/route.ts` or create new endpoint
- Add query parameter support to filter time events by `deptCode`
- Filter logic: Check if the selected department code exists in the time event's `deptCode` JSON array field
- Return time events with their `byFixedValue` flag and current `formulaValue` from `MasterMenuItemTimeEvent` if relationship exists

### 2. API Endpoint for Updating Menu Item Time Event Formula Value

- **File**: Create `src/app/api/master/menu-items/[id]/time-events/route.ts` or add to existing menu items API
- Endpoint: `PUT /api/master/menu-items/[menuItemId]/time-events/[eventCode]`
- Update or create `MasterMenuItemTimeEvent` record with:
  - `menuItemCode` (from menu item)
  - `timeEventCode` (from time event)
  - `formulaValue` (from request body)
  - `isFixedValue` (from time event's `byFixedValue`)

### 3. Update MasterMenuItemTabbedForm Component

- **File**: `src/components/forms/MasterMenuItemTabbedForm.tsx`
- Add state management:
  - `timeEvents`: Array of time events filtered by department
  - `timeEventFormulas`: Map of eventCode -> formulaValue for current menu item
  - `loadingTimeEvents`: Loading state
  - `updatingEventCode`: Track which event is being updated
- Add `useEffect` hook that triggers when `formData.deptCode` changes:
  - Fetch time events filtered by department
  - If editing, also fetch existing `MasterMenuItemTimeEvent` relationships to populate formula values
- Add new section after "Prep-Zone & Prep Time" section:
  - Title: "Time Event Configuration"
  - Subtitle: "Menu Item Time Events"
  - Table with columns:
    - Event Name
    - Formula Value (input field, disabled unless `byFixedValue` is true)
    - Actions (Update button, disabled unless `byFixedValue` is true and value changed)
  - Note below table: "Note: Formula value can only be edited when 'Fixed Value' is enabled. Use the Update button to save changes."
- Handle Update button click:
  - Call API to update formula value
  - Show loading state on button
  - Update local state on success
  - Show toast notification

### 4. Data Flow

```
Department Selected → Fetch Time Events (filtered by deptCode)
                   → If editing: Fetch existing MasterMenuItemTimeEvent records
                   → Display in table
                   → User edits formula value (if byFixedValue = true)
                   → Click Update → API call → Update MasterMenuItemTimeEvent
```

### 5. Key Considerations

- Section should only be visible when `formData.deptCode` is set
- Formula value inputs should be disabled when `byFixedValue` is false
- Update buttons should be disabled when:
  - `byFixedValue` is false
  - Formula value hasn't changed
  - Currently updating
- Handle empty state when no time events found for department
- Preserve existing formula values when editing a menu item

## Files to Modify

1. `src/components/forms/MasterMenuItemTabbedForm.tsx` - Add Time Event Configuration section
2. `src/app/api/master/time-event/route.ts` - Add department filtering (or create new endpoint)
3. `src/app/api/master/menu-items/[id]/time-events/route.ts` - Create endpoint for updating formula values

## Database Schema Reference

- `MasterTimeEvent`: Contains time events with `deptCode` (JSON array), `byFixedValue` (Boolean)
- `MasterMenuItemTimeEvent`: Junction table linking menu items to time events with `formulaValue` (Decimal)