# Database Functions Reference

## Table of Contents

1. [Overview](#overview)
2. [Location Database Functions](#location-database-functions)
3. [Stored Procedures](#stored-procedures)
4. [Trigger Functions](#trigger-functions)
5. [Helper Functions](#helper-functions)

## Overview

This document provides detailed reference for all PostgreSQL functions, stored procedures, and triggers used in the Restaurant POS System.

## Location Database Functions

### fn_get_event_price

Calculates event-based pricing for menu items.

**Function Signature**:
```sql
CREATE OR REPLACE FUNCTION public.fn_get_event_price(
    p_dept_code text,
    p_base_price numeric,
    p_store_code text DEFAULT NULL
)
RETURNS TABLE(event_name text, final_price numeric)
LANGUAGE 'plpgsql'
COST 100
VOLATILE PARALLEL UNSAFE
ROWS 1000
```

**Parameters**:

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `p_dept_code` | text | Department code to filter events | Yes |
| `p_base_price` | numeric | Base price to calculate from | Yes |
| `p_store_code` | text | Store code (optional, filters by store) | No |

**Returns**:

| Column | Type | Description |
|--------|------|-------------|
| `event_name` | text | Name of the time event |
| `final_price` | numeric | Calculated final price (rounded to 2 decimals) |

**Function Logic**:

1. Filters events where `is_active = 1` and `is_delete = FALSE`
2. If `p_store_code` provided, filters by `store_code`
3. Includes events where:
   - `override_all_events = TRUE` OR
   - `dept_code` JSONB array contains `p_dept_code`
4. Calculates price based on `by_fixed_value` flag:
   - **Fixed Value Mode**: `base_price + amount_add - amount_disc`
   - **Percentage/Amount Mode**: `base_price + (amount_add OR percentage_add) - (amount_disc OR percentage_disc)`
5. Rounds result to 2 decimal places

**Example Usage**:
```sql
-- Get event prices for department DEPT001 with base price $10.00 for store STORE001
SELECT * FROM fn_get_event_price('DEPT001', 10.00, 'STORE001');

-- Get event prices for all stores (p_store_code is NULL)
SELECT * FROM fn_get_event_price('DEPT001', 10.00, NULL);
```

**Performance Notes**:
- Uses indexes on `is_active`, `is_delete`, `store_code`, and `dept_code`
- Consider adding composite index on `(store_code, is_active, is_delete)` for better performance

**Error Handling**:
- Returns empty result set if no matching events found
- Returns NULL for `final_price` if calculation results in NULL (should not occur)

## Stored Procedures

### sp_apply_time_event_to_menuitems_location

Applies time events to menu items for a specific store.

**Procedure Signature**:
```sql
CREATE OR REPLACE PROCEDURE public.sp_apply_time_event_to_menuitems_location(
    IN p_time_event_code character varying,
    IN p_store_code character varying,
    IN p_dept_code_list character varying,
    IN p_is_fixed_value boolean,
    IN p_price_adjust_value numeric,
    IN p_is_override boolean
)
LANGUAGE 'plpgsql'
```

**Parameters**:

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `p_time_event_code` | varchar | Time event code to apply | Yes |
| `p_store_code` | varchar | Store code | Yes |
| `p_dept_code_list` | varchar | Comma-separated department codes | Yes |
| `p_is_fixed_value` | boolean | Fixed value mode flag | Yes |
| `p_price_adjust_value` | numeric | Price adjustment value | Yes |
| `p_is_override` | boolean | Override flag | Yes |

**Procedure Logic**:

1. **Code Generation**: Generates unique codes with prefix `WL{storeCode}MT`
2. **Soft Delete**: Marks existing menu item time event records as deleted
3. **Read Event Rules**: Retrieves pricing rules from `tbl_time_events`
4. **Loop Menu Items**: Iterates through menu items matching department codes
5. **Calculate Formula**: Calculates `formula_value` based on pricing rules
6. **Insert Mappings**: Creates new menu item time event records

**Formula Calculation**:

```sql
IF p_is_fixed_value = TRUE THEN
    v_formula_value := 0;
ELSE
    IF v_amt_disc > 0 THEN
        v_formula_value := base_price - v_amt_disc;
    ELSIF v_amt_add > 0 THEN
        v_formula_value := base_price + v_amt_add;
    ELSIF v_per_disc > 0 THEN
        v_formula_value := base_price - (base_price * v_per_disc / 100.0);
    ELSIF v_per_add > 0 THEN
        v_formula_value := base_price + (base_price * v_per_add / 100.0);
    END IF;
END IF;
```

**Example Usage**:
```sql
CALL sp_apply_time_event_to_menuitems_location(
    'EVENT001',           -- Time event code
    'STORE001',           -- Store code
    'DEPT001,DEPT002',    -- Department codes
    false,                -- Not fixed value
    0,                    -- Price adjust value
    false                 -- Not override
);
```

**Error Handling**:
- Raises exception on error with error message
- Uses `EXCEPTION WHEN OTHERS` block to catch and re-raise errors

**Performance Considerations**:
- Processes menu items in a loop (consider batch processing for large datasets)
- Uses indexes on `store_code`, `dept_code`, and `time_event_code`

## Trigger Functions

### log_sync_change

Automatically logs changes to syncable tables for synchronization.

**Function Signature**:
```sql
CREATE OR REPLACE FUNCTION log_sync_change()
RETURNS TRIGGER
LANGUAGE plpgsql
```

**Trigger Logic**:

1. **Detects Operation Type**:
   - `TG_OP = 'INSERT'`: New record inserted
   - `TG_OP = 'UPDATE'`: Record updated
   - `TG_OP = 'DELETE'`: Record deleted

2. **Captures Data**:
   - For INSERT/UPDATE: Stores full row data as JSONB
   - For DELETE: Stores old row data as JSONB

3. **Logs to sync_log**:
   - `table_name`: Table name from `TG_TABLE_NAME`
   - `record_id`: UUID from `sync_id` column or generated UUID
   - `operation`: INSERT/UPDATE/DELETE
   - `source`: 'server' (default)
   - `data`: Full row data as JSONB
   - `change_time`: Current timestamp
   - `sync_status`: 0 (pending)

**Trigger Definition**:
```sql
CREATE TRIGGER trigger_name
AFTER INSERT OR UPDATE OR DELETE ON table_name
FOR EACH ROW
EXECUTE FUNCTION log_sync_change();
```

**Tables with Triggers**:

**Master Database**:
- `tbl_master_menu_item`
- `tbl_master_time_events`
- `tbl_master_modifier_group`
- `tbl_master_modifier_item`
- All other `tbl_master_*` tables

**Location Database**:
- `tbl_menu_item`
- `tbl_time_events`
- `tbl_modifier_group`
- `tbl_modifier_item`
- All other `tbl_*` tables with `sync_id` column

**Performance Considerations**:
- Triggers execute synchronously (may impact INSERT/UPDATE/DELETE performance)
- Consider async processing for high-volume tables
- Index on `sync_log(sync_status, change_time)` for efficient querying

## Helper Functions

### UUID Generation

PostgreSQL's built-in UUID functions:

**Generate UUID v4**:
```sql
SELECT uuid_generate_v4();
```

**Used For**:
- `sync_id` column default values
- Unique identifier generation

### JSONB Operations

**Check if JSONB array contains value**:
```sql
dept_code @> to_jsonb('DEPT001'::text)
```

**Used In**:
- `fn_get_event_price` function for department code filtering

### String Operations

**String to Array Conversion**:
```sql
string_to_array(REPLACE(p_dept_code_list, ' ', ''), ',')
```

**Used In**:
- `sp_apply_time_event_to_menuitems_location` for parsing department codes

**Code Extraction**:
```sql
SUBSTRING(menuitem_timeevent_code FROM LENGTH(v_prefix) + 1)
```

**Used In**:
- Code generation logic in stored procedures

## Function Maintenance

### Creating Functions

Functions are created via SQL scripts in the `scripts/` directory:

- `scripts/create_location_fn_get_event_price.sql`
- `scripts/create_location_sp_apply_time_event_to_menuitems.sql`

### Updating Functions

To update a function:

1. Modify the SQL script
2. Run the script against the database
3. Test the function
4. Document changes

### Dropping Functions

```sql
DROP FUNCTION IF EXISTS public.fn_get_event_price(text, numeric, text);
DROP PROCEDURE IF EXISTS public.sp_apply_time_event_to_menuitems_location(...);
```

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md) - Database structure
- [Event Pricing System](./EVENT_PRICING_SYSTEM.md) - Event pricing details
- [Sync System](./SYNC_SYSTEM_COMPLETE.md) - Sync system details
