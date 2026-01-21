---
name: Add storeCode support to fn_get_event_price function
overview: Create separate PostgreSQL functions for master and location databases. The master function remains unchanged (no storeCode). The location function will accept an optional storeCode parameter and filter time events by storeCode when provided.
todos:
  - id: "1"
    content: Create location database function fn_get_event_price with storeCode parameter in PostgreSQL
    status: completed
  - id: "2"
    content: Update location dashboard API endpoint to pass storeCode as third parameter to function
    status: completed
    dependencies:
      - "1"
  - id: "3"
    content: Verify master dashboard API endpoint continues to work with 2-parameter function
    status: completed
---

# Add storeCode Support to fn_get_event_price Function

## Overview

Create separate PostgreSQL functions for master and location databases. The master function (`fn_get_event_price`) remains unchanged for backward compatibility. A new location-specific function (`fn_get_event_price`) will be created in the location database that accepts an optional `storeCode` parameter and filters by it.

## Implementation Plan

### 1. Master Database Function (Keep Existing)

- **File**: Master database (PostgreSQL)
- **Action**: Keep the existing `fn_get_event_price(text, numeric)` function unchanged
- **Reason**: Master time events table (`tbl_master_time_events`) doesn't have `storeCode` column, and master dashboard doesn't need storeCode filtering

### 2. Location Database Function (Create New)

- **File**: Location database (PostgreSQL)
- **Action**: Create new `fn_get_event_price(text, numeric, text)` function with optional `p_store_code` parameter
- **Function Signature**:
  ```sql
  CREATE OR REPLACE FUNCTION public.fn_get_event_price(
      p_dept_code text,
      p_base_price numeric,
      p_store_code text DEFAULT NULL
  )
  ```

- **Key Changes**:
        - Add `p_store_code text DEFAULT NULL` as third parameter
        - Update WHERE clause to filter by `store_code` when `p_store_code` is provided:
    ```sql
    WHERE te.is_active = 1
      AND te.is_delete = FALSE
      AND (p_store_code IS NULL OR te.store_code = p_store_code)
      AND (
           te.dept_code @> to_jsonb(p_dept_code::text)
           OR te.override_all_events = TRUE
      )
    ```

        - Query from `tbl_time_events` (location table) instead of `tbl_master_time_events`

### 3. Update Location Dashboard API Endpoint

- **File**: `src/app/api/dashboard/menu-items/time-events/route.ts`
- **Changes**:
        - Update the function call to pass `storeCode` as third parameter:
    ```typescript
    const results = await prisma.$queryRawUnsafe<Array<{
        event_name: string
        final_price: number | string
    }>>(
        `SELECT * FROM fn_get_event_price($1, $2, $3)`,
        deptCode,
        basePriceNum,
        selectedStoreCode  // Add storeCode parameter
    )
    ```


### 4. Keep Master Dashboard API Endpoint Unchanged

- **File**: `src/app/api/master/menu-items/time-events/route.ts`
- **Action**: No changes needed - continues to call function with 2 parameters (deptCode, basePrice)

## Function Implementation Details

### Location Database Function Structure:

```sql
CREATE OR REPLACE FUNCTION public.fn_get_event_price(
    p_dept_code text,
    p_base_price numeric,
    p_store_code text DEFAULT NULL
)
RETURNS TABLE(event_name text, final_price numeric) 
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    RETURN QUERY
    SELECT
        te."EventName"::TEXT AS event_name,
        ROUND(
            CASE
                WHEN te.by_fixed_value = TRUE THEN
                    p_base_price
          + COALESCE(te."GlobalPrice_Amount_Add", 0)
          - COALESCE(te."GlobalPrice_Amount_Disc", 0)
                ELSE
                    p_base_price
          + CASE
                        WHEN COALESCE(te."GlobalPrice_Amount_Add", 0) > 0
                            THEN te."GlobalPrice_Amount_Add"
                        WHEN COALESCE(te."GlobalPrice_Per_Add", 0) > 0
                            THEN (p_base_price * te."GlobalPrice_Per_Add" / 100)
                        ELSE 0
                      END
          - CASE
                        WHEN COALESCE(te."GlobalPrice_Amount_Disc", 0) > 0
                            THEN te."GlobalPrice_Amount_Disc"
                        WHEN COALESCE(te."GlobalPrice_Per_Disc", 0) > 0
                            THEN (p_base_price * te."GlobalPrice_Per_Disc" / 100)
                        ELSE 0
                      END
            END
            , 2) AS final_price
    FROM public."tbl_time_events" te
    WHERE te.is_active = 1
      AND te.is_delete = FALSE
      AND (p_store_code IS NULL OR te.store_code = p_store_code)
      AND (
           te.dept_code @> to_jsonb(p_dept_code::text)
           OR te.override_all_events = TRUE
      );
END;
$BODY$;
```

## Notes

- The function uses `DEFAULT NULL` for `p_store_code` to maintain backward compatibility
- When `p_store_code` is NULL, the function returns events for all stores (useful for testing or admin views)
- When `p_store_code` is provided, it filters events specific to that store
- The `override_all_events` flag still works - events with this flag will be included regardless of storeCode

## Testing Considerations

- Test with `storeCode` provided - should return only events for that store
- Test with `storeCode` as NULL - should return events for all stores (if needed)
- Verify `override_all_events` events are included regardless of storeCode
- Ensure master dashboard continues to work with existing 2-parameter function