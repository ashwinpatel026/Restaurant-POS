-- FUNCTION: public.fn_get_event_price(numeric, text, text, text[])
-- Location Database Function with storeCode and menu_master_code support

-- DROP FUNCTION IF EXISTS public.fn_get_event_price(numeric, text, text, text[]);

-- FUNCTION: public.fn_get_event_price(numeric, text, text, text[])

-- DROP FUNCTION IF EXISTS public.fn_get_event_price(numeric, text, text, text[]);

CREATE OR REPLACE FUNCTION public.fn_get_event_price(
	p_base_price numeric,
	p_dept_code text DEFAULT NULL::text,
	p_store_code text DEFAULT NULL::text,
	p_menu_master_code text[] DEFAULT NULL::text[])
    RETURNS TABLE(event_name text, final_price numeric) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        te."EventName"::TEXT AS event_name,

        ROUND(
			CASE
			    /* FIXED VALUE MODE */
			    WHEN te.by_fixed_value = TRUE THEN
			        p_base_price
			        + COALESCE(te."GlobalPrice_Amount_Add", 0)
			        - COALESCE(te."GlobalPrice_Amount_Disc", 0)
			
			    /* PERCENTAGE / AMOUNT MIXED MODE */
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
    LEFT JOIN public."tbl_menu_master_event" mme 
        ON te."Event_code" = mme.event_code
    WHERE te.is_active = 1
      AND te.is_delete = FALSE
      AND (p_store_code IS NULL OR te.store_code = p_store_code)
      AND (
           -- Department-based filtering (existing logic)
           (
               (p_dept_code IS NOT NULL AND p_dept_code != '')
               AND (
                   te.override_all_events = TRUE
                   OR (te.dept_code IS NOT NULL AND te.dept_code @> to_jsonb(p_dept_code::text))
               )
           )
           -- Menu master-based filtering (new logic)
           OR (
               p_menu_master_code IS NOT NULL 
               AND array_length(p_menu_master_code, 1) > 0
               AND mme.menu_master_code = ANY(p_menu_master_code)
           )
          );
END;
$BODY$;

ALTER FUNCTION public.fn_get_event_price(numeric, text, text, text[])
    OWNER TO postgres;

