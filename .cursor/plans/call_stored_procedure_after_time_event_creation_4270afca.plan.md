---
name: Call stored procedure after time event creation
overview: After successfully creating a time event in the master database, call the stored procedure `sp_apply_time_event_to_menuitems_webmaster` with the event code, department codes (as comma-separated string), fixed value flag, price adjustment value, and override flag.
todos:
  - id: add-sp-call
    content: Add stored procedure call after time event creation in POST handler
    status: completed
  - id: convert-dept-codes
    content: Convert deptCode JSON array to comma-separated string format for SP parameter
    status: completed
  - id: error-handling
    content: Add error handling for stored procedure call with appropriate logging
    status: completed
    dependencies:
      - add-sp-call
---

# Call Stored Procedure After Time Event Creation

## Overview

Modify the POST handler in [`src/app/api/master/time-event/route.ts`](src/app/api/master/time-event/route.ts) to call `sp_apply_time_event_to_menuitems_webmaster` immediately after successfully creating a time event. The stored procedure will apply the time event to all menu items matching the specified department codes.

## Stored Procedure Details

**Procedure Name:** `sp_apply_time_event_to_menuitems_webmaster`

**Parameters:**

- `p_time_event_code` (VARCHAR) - The event code
- `p_dept_code_list` (VARCHAR) - Comma-separated list of department codes (e.g., "DEPT1,DEPT2")
- `p_is_fixed_value` (BOOLEAN) - Whether price is fixed value
- `p_price_adjust_value` (NUMERIC) - Price adjustment value (note: SP reads prices from time event table, this param may be unused)
- `p_is_override` (BOOLEAN) - Override flag

**What the SP does:**

1. Soft-deletes existing records for the time event code
2. Reads price rules from `tbl_master_time_Events` table
3. Loops through menu items matching department codes
4. Calculates `formula_value` based on price rules
5. Inserts records into `tbl_master_menuitem_timeevent`

## Implementation Steps

### 1. Add Helper Function to Convert DeptCode to Comma-Separated String

- Create a helper function that converts the JSON array `deptCode` to comma-separated string
- Handle cases where `deptCode` is null, empty array, or already a string
- Example: `["DEPT1", "DEPT2"]` → `"DEPT1,DEPT2"`

### 2. Add Stored Procedure Call After Event Creation

- In the POST function, after the `masterPrisma.masterTimeEvent.create()` call succeeds (around line 161)
- Use `masterPrisma.$executeRawUnsafe()` to call the stored procedure
- PostgreSQL syntax: `CALL sp_apply_time_event_to_menuitems_webmaster($1, $2, $3, $4, $5)`
- Use parameterized query to prevent SQL injection

### 3. Prepare Parameters

- `p_time_event_code`: Use `eventCode` from the created event
- `p_dept_code_list`: Convert normalized `deptCode` (JSON array) to comma-separated string
  - If `deptCode` is null or empty, pass empty string or handle appropriately
  - Use helper function from step 1
- `p_is_fixed_value`: Use `Boolean(body.byFixedValue)`
- `p_price_adjust_value`:
  - Since SP reads prices directly from time event table, this parameter may not be critical
  - Pass `0` or calculate based on which price field is set (for logging/debugging purposes)
- `p_is_override`:
  - Check if `body.isOverride` exists, otherwise default to `false`

### 4. Error Handling

- Wrap SP call in try-catch block
- Log errors with context (event code, dept codes, etc.)
- **Decision needed**: Should SP failure:
  - **Option A**: Rollback the event creation (use transaction)
  - **Option B**: Continue and return success (event created but SP failed - log error)
  - **Option C**: Return partial success response indicating event created but SP failed

### 5. Database Transaction (Recommended)

- Consider wrapping both operations in a transaction for atomicity
- If SP fails, rollback the event creation
- Use `masterPrisma.$transaction()` to wrap both operations

## Files to Modify

- [`src/app/api/master/time-event/route.ts`](src/app/api/master/time-event/route.ts) - Add stored procedure call after line 161

## Implementation Details

### Helper Function Example

```typescript
function deptCodeToCommaSeparated(deptCode: any): string {
  if (!deptCode) return "";

  let deptArray: string[] = [];

  if (Array.isArray(deptCode)) {
    deptArray = deptCode;
  } else if (typeof deptCode === "string") {
    try {
      const parsed = JSON.parse(deptCode);
      deptArray = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      deptArray = [deptCode];
    }
  }

  return deptArray.filter(Boolean).join(",");
}
```

### Stored Procedure Call Example

```typescript
// After event creation
const deptCodeList = deptCodeToCommaSeparated(event.deptCode);
const priceAdjustValue = 0; // SP reads from table, but pass 0 for now
const isOverride = body.isOverride ?? false;

await masterPrisma.$executeRawUnsafe(
  `CALL sp_apply_time_event_to_menuitems_webmaster($1, $2, $3, $4, $5)`,
  eventCode,
  deptCodeList,
  body.byFixedValue,
  priceAdjustValue,
  isOverride
);
```

## Notes

- The stored procedure will be called on the master database (using `masterPrisma`)
- The `deptCode` is stored as JSON array in the database but SP expects comma-separated string
- The SP reads price values directly from the time event table, so `p_price_adjust_value` may not be used
- The SP handles its own transaction management (commented out BEGIN/COMMIT in SP code)
- If no department codes are provided, the SP will not process any menu items
