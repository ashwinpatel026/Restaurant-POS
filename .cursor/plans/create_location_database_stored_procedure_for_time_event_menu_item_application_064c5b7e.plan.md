---
name: Create Location Database Stored Procedure for Time Event Menu Item Application
overview: ""
todos:
  - id: create_sql_file
    content: Create SQL file scripts/create_location_sp_apply_time_event_to_menuitems.sql with the stored procedure definition
    status: completed
  - id: implement_code_generation
    content: Implement SQL-based code generation logic (WL{storeCode}MT{number}) within the stored procedure
    status: completed
    dependencies:
      - create_sql_file
  - id: add_store_filtering
    content: Add store_code parameter and filter all queries (time events, menu items, menuitem_timeevent) by store_code
    status: completed
    dependencies:
      - create_sql_file
  - id: update_api_routes
    content: Update location database API routes to call the new stored procedure when applying time events to menu items
    status: completed
    dependencies:
      - create_sql_file
  - id: test_procedure
    content: Test the stored procedure with sample data to ensure it works correctly
    status: completed
    dependencies:
      - create_sql_file
      - implement_code_generation
      - add_store_filtering
---

# Create Location Database Stored Procedure for Time Event Menu Item Application

## Overview

Create a stored procedure `sp_apply_time_event_to_menuitems_location` for the location database that mirrors the master database procedure `sp_apply_time_event_to_menuitems_webmaster`, but adapted for store-wise operations with `store_code` filtering.

## Key Differences from Master SP

1. **Table Names**: Use location tables (`tbl_menuitem_timeevent`, `tbl_menu_item`, `tbl_time_events`) instead of master tables
2. **Store Filtering**: Add `store_code` parameter and filter all operations by `store_code`
3. **Code Generation**: Generate codes using SQL logic with pattern `WL{storeCode}MT{number}` instead of using `get_next_counter` function
4. **Department Filtering**: Filter menu items by both `store_code` AND `dept_code` (scoped to the store)

## Implementation Details

### Stored Procedure Signature

```sql
sp_apply_time_event_to_menuitems_location(
    IN p_time_event_code VARCHAR,
    IN p_store_code VARCHAR,
    IN p_dept_code_list VARCHAR,
    IN p_is_fixed_value BOOLEAN,
    IN p_price_adjust_value NUMERIC,
    IN p_is_override BOOLEAN
)
```

### Key Changes from Master SP

1. **Soft Delete**: Update `tbl_menuitem_timeevent` WHERE `time_event_code = p_time_event_code AND store_code = p_store_code`

2. **Time Event Lookup**: Read from `tbl_time_events` WHERE `Event_code = p_time_event_code AND store_code = p_store_code`

3. **Menu Item Loop**: Filter `tbl_menu_item` WHERE `store_code = p_store_code AND dept_code = ANY(string_to_array(...))`

4. **Code Generation**: 

   - Find max existing code with pattern `WL{p_store_code}MT{number}`
   - Extract number and increment
   - Generate new code: `WL{p_store_code}MT{next_number}`

5. **Insert**: Include `store_code` in INSERT statement

### Files to Create/Modify

1. **Create SQL file**: `scripts/create_location_sp_apply_time_event_to_menuitems.sql`

   - Contains the complete stored procedure definition
   - Includes proper error handling
   - Uses SQL-based code generation logic

2. **Update API route** (if needed): `src/app/api/dashboard/events/[id]/route.ts` or similar

   - Add call to the new stored procedure when creating/updating time events in location database
   - Pass `store_code` parameter along with other parameters

## Implementation Steps

1. Create the SQL file with the stored procedure
2. Test the procedure manually in the database
3. Update any API routes that create/update time events to call this procedure for location database operations
4. Ensure proper error handling and logging

## Notes

- The procedure should maintain the same logic flow as the master version
- Code generation uses SQL pattern matching instead of database counter function
- All operations are scoped to a specific `store_code` for multi-tenant isolation
- The procedure handles both fixed value and calculated formula values based on time event price rules