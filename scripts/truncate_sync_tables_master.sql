-- =====================================================
-- TRUNCATE SYNC TABLES - MASTER DATABASE
-- =====================================================
-- Run these statements one by one in the MASTER database
-- Order: Relationship tables first, then main tables
-- =====================================================

-- =====================================================
-- STEP 1: Truncate Sync Log Tables (if exists)
-- =====================================================

-- Truncate sync_log table (tracks all sync operations)
TRUNCATE TABLE sync_log CASCADE;

-- Truncate sync_status table (tracks sync status per location/table)
TRUNCATE TABLE sync_status CASCADE;

-- =====================================================
-- STEP 2: Truncate Relationship/Junction Tables
-- =====================================================

-- Truncate menu master event relationship table
TRUNCATE TABLE tbl_master_menu_master_event CASCADE;

-- Truncate menu category modifier relationship table
TRUNCATE TABLE tbl_master_menu_category_modifier CASCADE;

-- Truncate menu item modifier group relationship table
TRUNCATE TABLE tbl_master_menu_item_modifier_group CASCADE;

-- =====================================================
-- STEP 3: Truncate Child Tables (depend on parent tables)
-- =====================================================

-- Truncate menu item (depends on menu_master and menu_category)
TRUNCATE TABLE tbl_master_menu_item CASCADE;

-- Truncate menu category (depends on menu_master)
TRUNCATE TABLE tbl_master_menu_category CASCADE;

-- Truncate modifier item (depends on modifier_group)
TRUNCATE TABLE tbl_master_modifier_item CASCADE;

-- Truncate prep zone (depends on station and printer)
TRUNCATE TABLE tbl_master_prep_zone CASCADE;

-- =====================================================
-- STEP 4: Truncate Parent Tables
-- =====================================================

-- Truncate menu master
TRUNCATE TABLE tbl_master_menu_master CASCADE;

-- Truncate modifier group
TRUNCATE TABLE tbl_master_modifier_group CASCADE;

-- Truncate time events
TRUNCATE TABLE tbl_master_time_events CASCADE;

-- Truncate station
TRUNCATE TABLE tbl_master_station CASCADE;

-- Truncate printer
TRUNCATE TABLE tbl_master_printer CASCADE;

-- Truncate tax
TRUNCATE TABLE tbl_master_tax CASCADE;

-- =====================================================
-- VERIFICATION: Check if tables are empty
-- =====================================================
-- Run these to verify truncation:
-- SELECT COUNT(*) FROM sync_log;
-- SELECT COUNT(*) FROM tbl_master_menu_master_event;
-- SELECT COUNT(*) FROM tbl_master_menu_category_modifier;
-- SELECT COUNT(*) FROM tbl_master_menu_item_modifier_group;
-- SELECT COUNT(*) FROM tbl_master_menu_item;
-- SELECT COUNT(*) FROM tbl_master_menu_category;
-- SELECT COUNT(*) FROM tbl_master_modifier_item;
-- SELECT COUNT(*) FROM tbl_master_prep_zone;
-- SELECT COUNT(*) FROM tbl_master_menu_master;
-- SELECT COUNT(*) FROM tbl_master_modifier_group;
-- SELECT COUNT(*) FROM tbl_master_time_events;
-- SELECT COUNT(*) FROM tbl_master_station;
-- SELECT COUNT(*) FROM tbl_master_printer;
-- SELECT COUNT(*) FROM tbl_master_tax;

