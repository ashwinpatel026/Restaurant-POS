-- Remove foreign key constraint for PrepZone.printerCode -> Printer.printerCode
-- This migration removes the relationship between PrepZone and Printer models

DO $$
BEGIN
    -- Drop foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'tbl_prep_zone_printer_code_fkey'
    ) THEN
        -- Drop the foreign key constraint
        ALTER TABLE tbl_prep_zone
        DROP CONSTRAINT tbl_prep_zone_printer_code_fkey;
        
        -- Drop the index if it exists
        DROP INDEX IF EXISTS idx_prep_zone_printer_code;
    END IF;
END $$;

