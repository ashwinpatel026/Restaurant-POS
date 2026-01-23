-- PROCEDURE: public.sp_apply_time_event_to_menuitems_location(character varying, character varying, character varying, boolean, numeric, boolean)
-- Location Database Stored Procedure for applying time events to menu items store-wise

-- DROP PROCEDURE IF EXISTS public.sp_apply_time_event_to_menuitems_location(character varying, character varying, character varying, boolean, numeric, boolean);

CREATE OR REPLACE PROCEDURE public.sp_apply_time_event_to_menuitems_location(
	IN p_time_event_code character varying,
	IN p_store_code character varying,
	IN p_dept_code_list character varying,
	IN p_is_fixed_value boolean,
	IN p_price_adjust_value numeric,
	IN p_is_override boolean)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    rec_menu_item RECORD;
    v_amt_add   NUMERIC := 0;
    v_amt_disc  NUMERIC := 0;
    v_per_add   NUMERIC := 0;
    v_per_disc  NUMERIC := 0;
	v_is_active BOOLEAN := TRUE;
    v_formula_value NUMERIC := 0;
    v_menuitem_timeevent_code VARCHAR;
    v_prefix VARCHAR;
    v_current_code BIGINT := 0;
BEGIN
    -- Set prefix for code generation: WL{storeCode}MT
    v_prefix := 'WL' || p_store_code || 'MT';

    -- Step 0: Find the maximum existing code number for this store (once, before the loop)
    SELECT COALESCE(MAX(
        CASE 
            WHEN menuitem_timeevent_code LIKE v_prefix || '%' 
                 AND LENGTH(menuitem_timeevent_code) > LENGTH(v_prefix)
                 AND SUBSTRING(menuitem_timeevent_code FROM LENGTH(v_prefix) + 1) ~ '^\d+$' THEN
                -- Extract the numeric part after the prefix (only if it's all digits)
                CAST(SUBSTRING(menuitem_timeevent_code FROM LENGTH(v_prefix) + 1) AS BIGINT)
            ELSE 0
        END
    ), 0)
    INTO v_current_code
    FROM tbl_menuitem_timeevent
    WHERE store_code = p_store_code
      AND menuitem_timeevent_code LIKE v_prefix || '%';

    -- Step 1: Soft delete existing records for this time_event_code and store_code
    UPDATE tbl_menuitem_timeevent
    SET is_delete = TRUE, is_active = false
    WHERE time_event_code = p_time_event_code
      AND store_code = p_store_code;

    -- Step 2: Read Time Event price rules from location database
    SELECT
        COALESCE("GlobalPrice_Amount_Add", 0),
        COALESCE("GlobalPrice_Amount_Disc", 0),
        COALESCE("GlobalPrice_Per_Add", 0),
        COALESCE("GlobalPrice_Per_Disc", 0),
		(COALESCE(is_active, 1) = 1) 
    INTO
        v_amt_add,
        v_amt_disc,
        v_per_add,
        v_per_disc,
		v_is_active
    FROM public."tbl_time_events"
    WHERE "Event_code" = p_time_event_code
      AND store_code = p_store_code;

    -- Step 3: Loop menu items based on dept_code list and store_code
    FOR rec_menu_item IN
        SELECT *
        FROM tbl_menu_item
        WHERE store_code = p_store_code
          AND dept_code = ANY(string_to_array(REPLACE(p_dept_code_list,' ',''), ','))
    LOOP
        -- Step 3a: Generate unique menuitem_timeevent_code for each row
        -- Increment the counter for each menu item
        v_current_code := v_current_code + 1;
        v_menuitem_timeevent_code := v_prefix || v_current_code;

        -- Step 4: Fixed price logic
        v_formula_value := 0;
        IF p_is_fixed_value = TRUE THEN
            v_formula_value := 0;
        ELSE
            IF v_amt_disc > 0 THEN
                v_formula_value := rec_menu_item.base_price - v_amt_disc;
            ELSIF v_amt_add > 0 THEN
                v_formula_value := rec_menu_item.base_price + v_amt_add;
            ELSIF v_per_disc > 0 THEN
                v_formula_value := rec_menu_item.base_price - (rec_menu_item.base_price * v_per_disc / 100.0);
            ELSIF v_per_add > 0 THEN
                v_formula_value := rec_menu_item.base_price + (rec_menu_item.base_price * v_per_add / 100.0);
            END IF;
        END IF;

        -- Step 5: Insert into time event table with unique code and store_code
        INSERT INTO tbl_menuitem_timeevent (
            menuitem_timeevent_code,
            time_event_code,
            menu_item_code,
            formula_value,
            is_fixed_value,
            createdby,            
            is_delete,
            is_override,
			createdon,
			sync_id,
			is_active,
			store_code
        )
        VALUES (
            v_menuitem_timeevent_code,
            p_time_event_code,
            rec_menu_item.menu_item_code,
            v_formula_value,
            p_is_fixed_value,
            1,            
            FALSE,
            p_is_override,
			Now(),
			uuid_generate_v4(),
			v_is_active,
			p_store_code
        );
    END LOOP;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in sp_apply_time_event_to_menuitems_location: %', SQLERRM;
        RAISE;
END;
$BODY$;

ALTER PROCEDURE public.sp_apply_time_event_to_menuitems_location(character varying, character varying, character varying, boolean, numeric, boolean)
    OWNER TO postgres;
