# Code Generation Pattern - Prompt Template

Use this template to apply the same code generation logic to other tables and APIs.

## Prompt Template

```
I need to implement code generation for [TABLE_NAME] similar to the tax code generation pattern.

**Table Information:**
- Master Table: `[MASTER_TABLE_NAME]` (e.g., `tbl_master_printer`)
- Dashboard Table: `[DASHBOARD_TABLE_NAME]` (e.g., `tbl_printer`)
- Code Field Name: `[CODE_FIELD_NAME]` (e.g., `printer_code`, `prep_zone_code`, `menu_master_code`)

**Code Generation Requirements:**
- Master API: Generate codes as `[BASE_CODE][NUMBER]` (e.g., `PRT1`, `PRT2` or `PZ1`, `PZ2`)
- Dashboard API (when creating locally): Generate codes as `WL` + `STORE_CODE` + `[BASE_CODE]` + `[NUMBER]` (e.g., `WLLOC01PRT1`)
- Sync from Master to Dashboard: Transform `[BASE_CODE][NUMBER]` → `WM` + `STORE_CODE` + `[BASE_CODE]` + `[NUMBER]` (e.g., `PRT1` → `WMLOC01PRT1`)

**API Routes:**
- Master API: `src/app/api/master/[table]/route.ts`
- Dashboard API: `src/app/api/dashboard/[table]/route.ts`

**Additional Context:**
- STORE_CODE is obtained from `process.env.STORE_CODE`
- The sync processor is at `src/lib/sync/syncProcessor.ts`
- The sync field mapping is in `src/lib/sync/types.ts`

Please update:
1. The `generate[Table]Code()` function in master API
2. The `generate[Table]Code()` function in dashboard API
3. The sync processor to transform codes when syncing from master to dashboard
4. Update the sync field mapping if needed
```

## Information I Need From You

When you provide the prompt above, please fill in:

### Required Information:

1. **Table Name**:

   - Master table name (e.g., `tbl_master_printer`)
   - Dashboard table name (e.g., `tbl_printer`)

2. **Code Field Name**:

   - The field that stores the code (e.g., `printer_code`, `prep_zone_code`, `menu_master_code`)

3. **Base Code Prefix**:

   - What prefix to use in master (e.g., `PRT` for printer, `PZ` for prep zone, `MM` for menu master)
   - This will be combined with numbers: `PRT1`, `PRT2`, etc.

4. **API Route Paths**:
   - Master API path (e.g., `/api/master/printer`)
   - Dashboard API path (e.g., `/api/dashboard/printer`)

### Optional Information:

5. **Special Requirements**:
   - Any special formatting needed?
   - Different number padding? (e.g., 3 digits: `PRT001` vs 1 digit: `PRT1`)
   - Any existing code patterns to preserve?

## Example Prompts

### Example 1: Printer Code Generation

```
I need to implement code generation for printers similar to the tax code generation pattern.

**Table Information:**
- Master Table: `tbl_master_printer`
- Dashboard Table: `tbl_printer`
- Code Field Name: `printer_code`

**Code Generation Requirements:**
- Master API: Generate codes as `PRT1`, `PRT2`, `PRT3`, etc.
- Dashboard API (when creating locally): Generate codes as `WL` + `STORE_CODE` + `PRT` + `NUMBER` (e.g., `WLLOC01PRT1`)
- Sync from Master to Dashboard: Transform `PRT1` → `WM` + `STORE_CODE` + `PRT1` (e.g., `PRT1` → `WMLOC01PRT1`)

**API Routes:**
- Master API: `src/app/api/master/printer/route.ts`
- Dashboard API: `src/app/api/dashboard/printer/route.ts`
```

### Example 2: Prep Zone Code Generation

```
I need to implement code generation for prep zones similar to the tax code generation pattern.

**Table Information:**
- Master Table: `tbl_master_prep_zone`
- Dashboard Table: `tbl_prep_zone`
- Code Field Name: `prep_zone_code`

**Code Generation Requirements:**
- Master API: Generate codes as `PZ1`, `PZ2`, `PZ3`, etc.
- Dashboard API (when creating locally): Generate codes as `WL` + `STORE_CODE` + `PZ` + `NUMBER` (e.g., `WLLOC01PZ1`)
- Sync from Master to Dashboard: Transform `PZ1` → `WM` + `STORE_CODE` + `PZ1` (e.g., `PZ1` → `WMLOC01PZ1`)

**API Routes:**
- Master API: `src/app/api/master/prep-zone/route.ts`
- Dashboard API: `src/app/api/dashboard/menu/prep-zone/route.ts`
```

### Example 3: Station Code Generation

```
I need to implement code generation for station similar to the tax code generation pattern.

**Table Information:**
- Master Table: `tbl_master_station`
- Dashboard Table: `tbl_station`
- Code Field Name: `station_code`

**Code Generation Requirements:**
- Master API: Generate codes as `STA1`, `STA2`, `STA3`, etc.
- Dashboard API (when creating locally): Generate codes as `WL` + `STORE_CODE` + `STA` + `NUMBER` (e.g., `WLLOC01STA1`)
- Sync from Master to Dashboard: Transform `STA1` → `WM` + `STORE_CODE` + `STA1` (e.g., `STA1` → `WMLOC01STA1`)

**API Routes:**
- Master API: `src/app/api/master/station/route.ts`
- Dashboard API: `src/app/api/dashboard/station/route.ts`
```

### Example 4: Time Event Code Generation

```
I need to implement code generation for time event similar to the tax code generation pattern.

**Table Information:**
- Master Table: `tbl_master_time_events`
- Dashboard Table: `tbl_time_events`
- Code Field Name: `Event_code`

**Code Generation Requirements:**
- Master API: Generate codes as `TE1`, `TE2`, `TE3`, etc.
- Dashboard API (when creating locally): Generate codes as `WL` + `STORE_CODE` + `TE` + `NUMBER` (e.g., `WLLOC01TE1`)
- Sync from Master to Dashboard: Transform `TE1` → `WM` + `STORE_CODE` + `TE1` (e.g., `TE1` → `WMLOC01TE1`)

**API Routes:**
- Master API: `src/app/api/master/time-event/route.ts`
- Dashboard API: `src/app/api/dashboard/events/route.ts`
```

### Example 5: Menu Master Code Generation

```
I need to implement code generation for Menu Master similar to the tax code generation pattern.

**Table Information:**
- Master Table: `tbl_master_menu_master`
- Dashboard Table: `tbl_menu_master`
- Code Field Name: `menu_master_code`

**Code Generation Requirements:**
- Master API: Generate codes as `MM1`, `MM2`, `MM3`, etc.
- Dashboard API (when creating locally): Generate codes as `WL` + `STORE_CODE` + `MM` + `NUMBER` (e.g., `WLLOC01MM1`)
- Sync from Master to Dashboard: Transform `MM1` → `WM` + `STORE_CODE` + `MM1` (e.g., `TE1` → `WMLOC01MM1`)

**API Routes:**
- Master API: `src/app/api/master/menu-masters/route.ts`
- Dashboard API: `src/app/api/dashboard/menu/masters/route.ts`
```

### Example 6: Menu Category Code Generation

```
I need to implement code generation for Menu Category similar to the tax code generation pattern.

**Table Information:**
- Master Table: `tbl_master_menu_category`
- Dashboard Table: `tbl_menu_category`
- Code Field Name: `menu_category_code`

**Code Generation Requirements:**
- Master API: Generate codes as `MC1`, `MC2`, `MC3`, etc.
- Dashboard API (when creating locally): Generate codes as `WL` + `STORE_CODE` + `MC` + `NUMBER` (e.g., `WLLOC01MC1`)
- Sync from Master to Dashboard: Transform `MC1` → `WM` + `STORE_CODE` + `MC1` (e.g., `TE1` → `WMLOC01MC1`)

**API Routes:**
- Master API: `src/app/api/master/menu-categories/route.ts`
- Dashboard API: `src/app/api/dashboard/menu/categories/route.ts`
```

### Example 7: Menu Item Code Generation

```
I need to implement code generation for Menu Item similar to the tax code generation pattern.

**Table Information:**
- Master Table: `tbl_master_menu_item`
- Dashboard Table: `tbl_menu_item`
- Code Field Name: `menu_item_code`

**Code Generation Requirements:**
- Master API: Generate codes as `MI1`, `MI2`, `MI3`, etc.
- Dashboard API (when creating locally): Generate codes as `WL` + `STORE_CODE` + `MI` + `NUMBER` (e.g., `WLLOC01MI1`)
- Sync from Master to Dashboard: Transform `MI1` → `WM` + `STORE_CODE` + `MI1` (e.g., `TE1` → `WMLOC01MI1`)

**API Routes:**
- Master API: `src/app/api/master/menu-items/route.ts`
- Dashboard API: `src/app/api/dashboard/menu/items/route.ts`
```

### Example 8: Modifiers Code Generation

```
I need to implement code generation for Modifiers similar to the tax code generation pattern.

**Table Information:**
- Master Table: `tbl_master_modifier_group`
- Dashboard Table: `tbl_modifier_group`
- Code Field Name: `modifier_group_code`

**Code Generation Requirements:**
- Master API: Generate codes as `MOD1`, `MOD2`, `MOD3`, etc.
- Dashboard API (when creating locally): Generate codes as `WL` + `STORE_CODE` + `MOD` + `NUMBER` (e.g., `WLLOC01MOD1`)
- Sync from Master to Dashboard: Transform `MOD1` → `WM` + `STORE_CODE` + `MOD1` (e.g., `TE1` → `WMLOC01MOD1`)

**API Routes:**
- Master API: `src/app/api/master/modifier-groups/route.ts`
- Dashboard API: `src/app/api/dashboard/modifier-groups/route.ts`
```

### Example 9: Modifiers Item Code Generation

```
I need to implement code generation for Modifiers Item similar to the tax code generation pattern.

**Table Information:**
- Master Table: `tbl_master_modifier_item`
- Dashboard Table: `tbl_modifier_item`
- Code Field Name: `modifier_item_code`

**Code Generation Requirements:**
- Master API: Generate codes as `MOI1`, `MOI2`, `MOI3`, etc.
- Dashboard API (when creating locally): Generate codes as `WL` + `STORE_CODE` + `MOI` + `NUMBER` (e.g., `WLLOC01MOI1`)
- Sync from Master to Dashboard: Transform `MOI1` → `WM` + `STORE_CODE` + `MOI1` (e.g., `TE1` → `WMLOC01MOI1`)

**API Routes:**
- Master API: `src/app/api/master/modifier-items/route.ts`
- Dashboard API: `src/app/api/dashboard/modifier-items/route.ts`
```

## Quick Reference

### Prefixes Used:

- **WM** = Web Master (synced from master to dashboard)
- **WL** = Web Location (created directly in dashboard)

### Pattern:

- **Master**: `[BASE_CODE][NUMBER]` → `PRT1`
- **Dashboard (local)**: `WL[STORE_CODE][BASE_CODE][NUMBER]` → `WLLOC01PRT1`
- **Dashboard (synced)**: `WM[STORE_CODE][BASE_CODE][NUMBER]` → `WMLOC01PRT1`

### Files to Update:

1. `src/app/api/master/[table]/route.ts` - Master API code generation
2. `src/app/api/dashboard/[table]/route.ts` - Dashboard API code generation
3. `src/lib/sync/syncProcessor.ts` - Sync transformation logic
4. `src/lib/sync/types.ts` - Sync field mapping (if code field needs to be added)
