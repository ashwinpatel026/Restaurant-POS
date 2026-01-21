-- FUNCTION: public.fn_get_event_price(text, numeric, text)
-- Location Database Function with storeCode support

-- DROP FUNCTION IF EXISTS public.fn_get_event_price(text, numeric, text);

CREATE OR REPLACE FUNCTION public.fn_get_event_price(
	p_dept_code text,
	p_base_price numeric,
	p_store_code text DEFAULT NULL)
    RETURNS TABLE(event_name text, final_price numeric) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
    RETURN QUERY
    SELECT
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
    WHERE te.is_active = 1
      AND te.is_delete = FALSE
      AND (p_store_code IS NULL OR te.store_code = p_store_code)
      AND (
           te.override_all_events = TRUE
           OR te.dept_code @> to_jsonb(p_dept_code::text)  -- for jsonb array
          );
END;
$BODY$;

ALTER FUNCTION public.fn_get_event_price(text, numeric, text)
    OWNER TO postgres;
