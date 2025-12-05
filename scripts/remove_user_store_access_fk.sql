-- ============================================
-- Remove Foreign Key Constraint from tbl_user_store_access
-- This allows sync to work without foreign key violations
-- ============================================

-- Drop the foreign key constraint if it exists
-- The constraint name might vary, so we'll try common names

-- First, find the constraint name
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the foreign key constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'tbl_user_store_access'::regclass
      AND contype = 'f'
      AND confrelid = 'users'::regclass;
    
    -- Drop the constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE tbl_user_store_access DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped foreign key constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found to drop';
    END IF;
END $$;

-- Alternative: Try dropping by common constraint names
ALTER TABLE tbl_user_store_access DROP CONSTRAINT IF EXISTS tbl_user_store_access_user_id_fkey;
ALTER TABLE tbl_user_store_access DROP CONSTRAINT IF EXISTS tbl_user_store_access_user_id_users_id_fk;
ALTER TABLE tbl_user_store_access DROP CONSTRAINT IF EXISTS user_store_access_user_id_fkey;

-- Verify the constraint is removed
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'tbl_user_store_access'::regclass
  AND contype = 'f';

