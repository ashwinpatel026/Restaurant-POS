-- Add SUPER_ADMIN to AccessLevel enum in both master and dashboard databases
-- This script updates the enum type to include SUPER_ADMIN value
-- Note: PostgreSQL doesn't support adding enum values in a specific position,
-- so we add it at the end. The order in Prisma schema is what matters.

-- For Master Database
DO $$
BEGIN
    -- Check if SUPER_ADMIN already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'SUPER_ADMIN' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AccessLevel')
    ) THEN
        -- Add SUPER_ADMIN to the AccessLevel enum
        -- Note: PostgreSQL adds new enum values at the end
        ALTER TYPE "AccessLevel" ADD VALUE 'SUPER_ADMIN';
    END IF;
END $$;

-- For Dashboard Database (if using separate database)
-- Run this in your dashboard database connection
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_enum 
--         WHERE enumlabel = 'SUPER_ADMIN' 
--         AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AccessLevel')
--     ) THEN
--         ALTER TYPE "AccessLevel" ADD VALUE 'SUPER_ADMIN';
--     END IF;
-- END $$;

-- Verify the enum values
SELECT enumlabel, enumsortorder 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AccessLevel')
ORDER BY enumsortorder;

