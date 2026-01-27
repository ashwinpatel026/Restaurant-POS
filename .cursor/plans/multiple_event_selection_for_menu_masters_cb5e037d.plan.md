---
name: Multiple Event Selection for Menu Masters
overview: Replace single dropdown event selection with multiple button-based selection in menu master add/edit pages for both master and dashboard sections, and update APIs and sync process to handle multiple events.
todos:
  - id: "1"
    content: "Update master add page: Replace dropdown with button-based multiple event selection"
    status: completed
  - id: "2"
    content: "Update master edit page: Replace dropdown with button-based multiple event selection and load existing events"
    status: completed
  - id: "3"
    content: "Update dashboard add page: Replace dropdown with button-based multiple event selection"
    status: completed
  - id: "4"
    content: "Update dashboard edit page: Replace dropdown with button-based multiple event selection and load existing events"
    status: completed
  - id: "5"
    content: "Update master POST API: Accept eventCodes array and create multiple event associations"
    status: completed
  - id: "6"
    content: "Update master PUT API: Accept eventCodes array and replace all event associations"
    status: completed
  - id: "7"
    content: "Update dashboard POST API: Accept eventCodes array and create multiple event associations"
    status: completed
  - id: "8"
    content: "Update dashboard PUT API: Accept eventCodes array and replace all event associations"
    status: completed
isProject: false
---

# Multiple Event Selection for Menu Masters

## Overview

Currently, menu master pages use a single dropdown for event selection. This plan implements multiple button-based event selection (similar to prep zones and stations) across all menu master pages and updates the backend to handle multiple events.

## Current State

- Single dropdown (`eventCode`) in add/edit pages
- Events stored in `MasterMenuMasterEvent` and `MenuMasterEvent` tables (many-to-many)
- Sync process already handles multiple events
- Edit pages fetch only the first event

## Changes Required

### 1. Frontend Changes - Master Pages

#### `src/app/master/menu/masters/add/page.tsx`

- Remove single `eventCode` dropdown
- Add `selectedEvents` state (Set<string>)
- Add button-based event selection UI (similar to prep zones/stations)
- Add "Select All" / "Deselect All" button
- Update form submission to send `eventCodes` array
- Update `isEventMenu` logic: set to 1 if any events selected

#### `src/app/master/menu/masters/[id]/edit/page.tsx`

- Remove single `eventCode` dropdown and `currentEventCode` state
- Add `selectedEvents` state (Set<string>)
- Fetch all events from `/api/master/menu-masters/[id]/events`
- Initialize `selectedEvents` with fetched event codes
- Add button-based event selection UI
- Update form submission to send `eventCodes` array
- Update `isEventMenu` logic based on selected events

### 2. Frontend Changes - Dashboard Pages

#### `src/app/dashboard/menu/masters/add/page.tsx`

- Same changes as master add page
- Use `buildApiUrl` for API calls

#### `src/app/dashboard/menu/masters/[id]/edit/page.tsx`

- Same changes as master edit page
- Use `buildApiUrl` for API calls

### 3. Backend API Changes - Master

#### `src/app/api/master/menu-masters/route.ts` (POST)

- Change `eventCode` to `eventCodes` (array)
- Create multiple `MasterMenuMasterEvent` records for each event code
- Set `isEventMenu: 1` if `eventCodes.length > 0`

#### `src/app/api/master/menu-masters/[id]/route.ts` (PUT)

- Change `eventCode` and `currentEventCode` to `eventCodes` (array)
- Delete all existing event associations
- Create new associations for all provided event codes
- Set `isEventMenu: 1` if `eventCodes.length > 0`

### 4. Backend API Changes - Dashboard

#### `src/app/api/dashboard/menu/masters/route.ts` (POST)

- Change `eventCode` to `eventCodes` (array)
- Create multiple `MenuMasterEvent` records
- Set `isEventMenu: 1` if `eventCodes.length > 0`

#### `src/app/api/dashboard/menu/masters/[id]/route.ts` (PUT)

- Change `eventCode` and `currentEventCode` to `eventCodes` (array)
- Delete all existing event associations
- Create new associations for all provided event codes
- Set `isEventMenu: 1` if `eventCodes.length > 0`

### 5. Sync Process

#### `src/services/syncService.ts`

- Already handles multiple events correctly (loops through all events)
- No changes needed - sync process already supports multiple events

## Implementation Details

### UI Pattern (Similar to Prep Zones/Stations)

```typescript
// State
const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())

// Toggle handler
const handleEventToggle = (eventCode: string) => {
  const updated = new Set(selectedEvents)
  if (updated.has(eventCode)) {
    updated.delete(eventCode)
  } else {
    updated.add(eventCode)
  }
  setSelectedEvents(updated)
}

// Select All handler
const handleSelectAllEvents = () => {
  if (selectedEvents.size === timeEvents.length) {
    setSelectedEvents(new Set())
  } else {
    const allCodes = new Set(timeEvents.map(e => e.eventCode))
    setSelectedEvents(allCodes)
  }
}
```

### Form Submission

```typescript
// Instead of: eventCode: values.eventCode || null
eventCodes: Array.from(selectedEvents),
isEventMenu: selectedEvents.size > 0 ? 1 : 0
```

### API Request Body

```typescript
// Old: { eventCode: "EVENT1", isEventMenu: 1 }
// New: { eventCodes: ["EVENT1", "EVENT2"], isEventMenu: 1 }
```

## Files to Modify

1. `src/app/master/menu/masters/add/page.tsx`
2. `src/app/master/menu/masters/[id]/edit/page.tsx`
3. `src/app/dashboard/menu/masters/add/page.tsx`
4. `src/app/dashboard/menu/masters/[id]/edit/page.tsx`
5. `src/app/api/master/menu-masters/route.ts`
6. `src/app/api/master/menu-masters/[id]/route.ts`
7. `src/app/api/dashboard/menu/masters/route.ts`
8. `src/app/api/dashboard/menu/masters/[id]/route.ts`

## Testing Checklist

- [ ] Add menu master with multiple events (master)
- [ ] Edit menu master to add/remove events (master)
- [ ] Add menu master with multiple events (dashboard)
- [ ] Edit menu master to add/remove events (dashboard)
- [ ] Verify sync process syncs all events correctly
- [ ] Verify `isEventMenu` flag is set correctly
- [ ] Test with no events selected (should set `isEventMenu: 0`)
- [ ] Test "Select All" / "Deselect All" functionality