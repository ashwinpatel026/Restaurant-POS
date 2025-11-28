-- =====================================================
-- TRUNCATE SYNC TABLES - DASHBOARD/LOCATION DATABASE
-- =====================================================
-- Run these statements one by one in the LOCATION/DASHBOARD database
-- Order: Relationship tables first, then main tables
-- =====================================================

-- =====================================================
-- STEP 1: Truncate Relationship/Junction Tables
-- =====================================================

-- Truncate menu master event relationship table
TRUNCATE TABLE tbl_menu_master_event CASCADE;

-- Truncate menu category modifier relationship table
TRUNCATE TABLE tbl_menu_category_modifier CASCADE;

-- Truncate menu item modifier group relationship table
TRUNCATE TABLE tbl_menu_item_modifier_group CASCADE;

-- =====================================================
-- STEP 2: Truncate Child Tables (depend on parent tables)
-- =====================================================

-- Truncate menu item (depends on menu_master and menu_category)
TRUNCATE TABLE tbl_menu_item CASCADE;

-- Truncate menu category (depends on menu_master)
TRUNCATE TABLE tbl_menu_category CASCADE;

-- Truncate modifier item (depends on modifier_group)
TRUNCATE TABLE tbl_modifier_item CASCADE;

-- Truncate prep zone (depends on station and printer)
TRUNCATE TABLE tbl_prep_zone CASCADE;

-- =====================================================
-- STEP 3: Truncate Parent Tables
-- =====================================================

-- Truncate menu master
TRUNCATE TABLE tbl_menu_master CASCADE;

-- Truncate modifier group
TRUNCATE TABLE tbl_modifier_group CASCADE;

-- Truncate time events
TRUNCATE TABLE tbl_time_events CASCADE;

-- Truncate station
TRUNCATE TABLE tbl_station CASCADE;

-- Truncate printer
TRUNCATE TABLE tbl_printer CASCADE;

-- Truncate tax
TRUNCATE TABLE tbl_tax CASCADE;

-- =====================================================
-- VERIFICATION: Check if tables are empty
-- =====================================================
-- Run these to verify truncation:
-- SELECT COUNT(*) FROM tbl_menu_master_event;
-- SELECT COUNT(*) FROM tbl_menu_category_modifier;
-- SELECT COUNT(*) FROM tbl_menu_item_modifier_group;
-- SELECT COUNT(*) FROM tbl_menu_item;
-- SELECT COUNT(*) FROM tbl_menu_category;
-- SELECT COUNT(*) FROM tbl_modifier_item;
-- SELECT COUNT(*) FROM tbl_prep_zone;
-- SELECT COUNT(*) FROM tbl_menu_master;
-- SELECT COUNT(*) FROM tbl_modifier_group;
-- SELECT COUNT(*) FROM tbl_time_events;
-- SELECT COUNT(*) FROM tbl_station;
-- SELECT COUNT(*) FROM tbl_printer;
-- SELECT COUNT(*) FROM tbl_tax;

