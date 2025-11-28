-- =====================================================
-- TRUNCATE ALL SYNC TABLES - BOTH DATABASES
-- =====================================================
-- This file contains all truncate statements for reference
-- Run MASTER database statements first, then DASHBOARD database
-- =====================================================

-- =====================================================
-- PART 1: MASTER DATABASE
-- =====================================================
-- Connect to MASTER database and run these:

-- Sync log tables
TRUNCATE TABLE sync_log CASCADE;
TRUNCATE TABLE sync_status CASCADE;

-- Relationship tables
TRUNCATE TABLE tbl_master_menu_master_event CASCADE;
TRUNCATE TABLE tbl_master_menu_category_modifier CASCADE;
TRUNCATE TABLE tbl_master_menu_item_modifier_group CASCADE;

-- Child tables
TRUNCATE TABLE tbl_master_menu_item CASCADE;
TRUNCATE TABLE tbl_master_menu_category CASCADE;
TRUNCATE TABLE tbl_master_modifier_item CASCADE;
TRUNCATE TABLE tbl_master_prep_zone CASCADE;

-- Parent tables
TRUNCATE TABLE tbl_master_menu_master CASCADE;
TRUNCATE TABLE tbl_master_modifier_group CASCADE;
TRUNCATE TABLE tbl_master_time_events CASCADE;
TRUNCATE TABLE tbl_master_station CASCADE;
TRUNCATE TABLE tbl_master_printer CASCADE;
TRUNCATE TABLE tbl_master_tax CASCADE;

-- =====================================================
-- PART 2: DASHBOARD/LOCATION DATABASE
-- =====================================================
-- Connect to DASHBOARD/LOCATION database and run these:

-- Relationship tables
TRUNCATE TABLE tbl_menu_master_event CASCADE;
TRUNCATE TABLE tbl_menu_category_modifier CASCADE;
TRUNCATE TABLE tbl_menu_item_modifier_group CASCADE;

-- Child tables
TRUNCATE TABLE tbl_menu_item CASCADE;
TRUNCATE TABLE tbl_menu_category CASCADE;
TRUNCATE TABLE tbl_modifier_item CASCADE;
TRUNCATE TABLE tbl_prep_zone CASCADE;

-- Parent tables
TRUNCATE TABLE tbl_menu_master CASCADE;
TRUNCATE TABLE tbl_modifier_group CASCADE;
TRUNCATE TABLE tbl_time_events CASCADE;
TRUNCATE TABLE tbl_station CASCADE;
TRUNCATE TABLE tbl_printer CASCADE;
TRUNCATE TABLE tbl_tax CASCADE;

-- =====================================================
-- QUICK VERIFICATION QUERIES
-- =====================================================
-- Run these in MASTER database:
SELECT 'MASTER - sync_log' as table_name, COUNT(*) as count FROM sync_log
UNION ALL
SELECT 'MASTER - menu_master_event', COUNT(*) FROM tbl_master_menu_master_event
UNION ALL
SELECT 'MASTER - menu_category_modifier', COUNT(*) FROM tbl_master_menu_category_modifier
UNION ALL
SELECT 'MASTER - menu_item_modifier_group', COUNT(*) FROM tbl_master_menu_item_modifier_group
UNION ALL
SELECT 'MASTER - menu_item', COUNT(*) FROM tbl_master_menu_item
UNION ALL
SELECT 'MASTER - menu_category', COUNT(*) FROM tbl_master_menu_category
UNION ALL
SELECT 'MASTER - modifier_item', COUNT(*) FROM tbl_master_modifier_item
UNION ALL
SELECT 'MASTER - prep_zone', COUNT(*) FROM tbl_master_prep_zone
UNION ALL
SELECT 'MASTER - menu_master', COUNT(*) FROM tbl_master_menu_master
UNION ALL
SELECT 'MASTER - modifier_group', COUNT(*) FROM tbl_master_modifier_group
UNION ALL
SELECT 'MASTER - time_events', COUNT(*) FROM tbl_master_time_events
UNION ALL
SELECT 'MASTER - station', COUNT(*) FROM tbl_master_station
UNION ALL
SELECT 'MASTER - printer', COUNT(*) FROM tbl_master_printer
UNION ALL
SELECT 'MASTER - tax', COUNT(*) FROM tbl_master_tax;

-- Run these in DASHBOARD database:
SELECT 'DASHBOARD - menu_master_event' as table_name, COUNT(*) as count FROM tbl_menu_master_event
UNION ALL
SELECT 'DASHBOARD - menu_category_modifier', COUNT(*) FROM tbl_menu_category_modifier
UNION ALL
SELECT 'DASHBOARD - menu_item_modifier_group', COUNT(*) FROM tbl_menu_item_modifier_group
UNION ALL
SELECT 'DASHBOARD - menu_item', COUNT(*) FROM tbl_menu_item
UNION ALL
SELECT 'DASHBOARD - menu_category', COUNT(*) FROM tbl_menu_category
UNION ALL
SELECT 'DASHBOARD - modifier_item', COUNT(*) FROM tbl_modifier_item
UNION ALL
SELECT 'DASHBOARD - prep_zone', COUNT(*) FROM tbl_prep_zone
UNION ALL
SELECT 'DASHBOARD - menu_master', COUNT(*) FROM tbl_menu_master
UNION ALL
SELECT 'DASHBOARD - modifier_group', COUNT(*) FROM tbl_modifier_group
UNION ALL
SELECT 'DASHBOARD - time_events', COUNT(*) FROM tbl_time_events
UNION ALL
SELECT 'DASHBOARD - station', COUNT(*) FROM tbl_station
UNION ALL
SELECT 'DASHBOARD - printer', COUNT(*) FROM tbl_printer
UNION ALL
SELECT 'DASHBOARD - tax', COUNT(*) FROM tbl_tax;

