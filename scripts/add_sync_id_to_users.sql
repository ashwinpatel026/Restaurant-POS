-- Add sync_id to existing users in master database
-- This script generates sync_id for users that don't have one

-- First, ensure the column exists (if migration hasn't run yet)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tbl_user' 
        AND column_name = 'sync_id'
    ) THEN
        ALTER TABLE tbl_user 
        ADD COLUMN sync_id UUID UNIQUE DEFAULT gen_random_uuid(),
        ADD COLUMN sync_source VARCHAR(20) DEFAULT 'server';
        
        CREATE INDEX IF NOT EXISTS idx_tbl_user_sync_id ON tbl_user(sync_id);
    END IF;
END $$;

-- Generate sync_id for users that don't have one
UPDATE tbl_user
SET 
    sync_id = gen_random_uuid(),
    sync_source = 'server'
WHERE sync_id IS NULL;

-- Verify all users have sync_id
SELECT 
    COUNT(*) as total_users,
    COUNT(sync_id) as users_with_sync_id,
    COUNT(*) - COUNT(sync_id) as users_without_sync_id
FROM tbl_user;

