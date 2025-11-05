-- ============================================================
-- Database Indexes for Restaurant POS System
-- ============================================================
-- This file contains indexes to optimize query performance
-- Execute these queries manually in your PostgreSQL database
-- ============================================================

-- ============================================================
-- Menu Master Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_menu_master_code ON tbl_menu_master(menu_master_code);
CREATE INDEX IF NOT EXISTS idx_menu_master_prep_zone ON tbl_menu_master(prep_zone_code);
CREATE INDEX IF NOT EXISTS idx_menu_master_active ON tbl_menu_master(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_master_created_on ON tbl_menu_master(createdon);
CREATE INDEX IF NOT EXISTS idx_menu_master_store_code ON tbl_menu_master(store_code);

-- ============================================================
-- Menu Category Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_menu_category_code ON tbl_menu_category(menu_category_code);
CREATE INDEX IF NOT EXISTS idx_menu_category_master_code ON tbl_menu_category(menu_master_code);
CREATE INDEX IF NOT EXISTS idx_menu_category_active ON tbl_menu_category(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_category_created_on ON tbl_menu_category(createdon);
CREATE INDEX IF NOT EXISTS idx_menu_category_store_code ON tbl_menu_category(store_code);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_menu_category_master_active ON tbl_menu_category(menu_master_code, is_active);

-- ============================================================
-- Menu Item Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_menu_item_code ON tbl_menu_item(menu_item_code);
CREATE INDEX IF NOT EXISTS idx_menu_item_category_code ON tbl_menu_item(menu_category_code);
CREATE INDEX IF NOT EXISTS idx_menu_item_active ON tbl_menu_item(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_item_created_on ON tbl_menu_item(createdon);
CREATE INDEX IF NOT EXISTS idx_menu_item_store_code ON tbl_menu_item(store_code);
CREATE INDEX IF NOT EXISTS idx_menu_item_sku_plu ON tbl_menu_item(sku_plu);
CREATE INDEX IF NOT EXISTS idx_menu_item_pos_visible ON tbl_menu_item(is_pos_visible);
CREATE INDEX IF NOT EXISTS idx_menu_item_kiosk_order ON tbl_menu_item(is_kiosk_order_pay);
CREATE INDEX IF NOT EXISTS idx_menu_item_online_ordering ON tbl_menu_item(is_online_ordering);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_menu_item_category_active ON tbl_menu_item(menu_category_code, is_active);
CREATE INDEX IF NOT EXISTS idx_menu_item_category_created ON tbl_menu_item(menu_category_code, createdon);

-- ============================================================
-- Modifier Group Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_modifier_group_code ON tbl_modifier_group(modifier_group_code);
CREATE INDEX IF NOT EXISTS idx_modifier_group_active ON tbl_modifier_group(is_active);
CREATE INDEX IF NOT EXISTS idx_modifier_group_created_on ON tbl_modifier_group(createdon);
CREATE INDEX IF NOT EXISTS idx_modifier_group_store_code ON tbl_modifier_group(store_code);

-- ============================================================
-- Modifier Item Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_modifier_item_code ON tbl_modifier_item(modifier_item_code);
CREATE INDEX IF NOT EXISTS idx_modifier_item_group_code ON tbl_modifier_item(modifier_group_code);
CREATE INDEX IF NOT EXISTS idx_modifier_item_active ON tbl_modifier_item(is_active);
CREATE INDEX IF NOT EXISTS idx_modifier_item_display_order ON tbl_modifier_item(display_order);
CREATE INDEX IF NOT EXISTS idx_modifier_item_created_on ON tbl_modifier_item(createdon);
CREATE INDEX IF NOT EXISTS idx_modifier_item_store_code ON tbl_modifier_item(store_code);

-- Composite index for ordering
CREATE INDEX IF NOT EXISTS idx_modifier_item_group_order ON tbl_modifier_item(modifier_group_code, display_order, createdon);

-- ============================================================
-- Menu Category Modifier Junction Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_menu_category_modifier_category ON tbl_menu_category_modifier(menu_category_code);
CREATE INDEX IF NOT EXISTS idx_menu_category_modifier_group ON tbl_menu_category_modifier(modifier_group_code);
CREATE INDEX IF NOT EXISTS idx_menu_category_modifier_created_on ON tbl_menu_category_modifier(createdon);
CREATE INDEX IF NOT EXISTS idx_menu_category_modifier_store_code ON tbl_menu_category_modifier(store_code);

-- Composite index for common join patterns
CREATE INDEX IF NOT EXISTS idx_menu_category_modifier_composite ON tbl_menu_category_modifier(menu_category_code, modifier_group_code);

-- ============================================================
-- Menu Item Modifier Group Junction Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_menu_item_modifier_item_code ON tbl_menu_item_modifier_group(menu_item_code);
CREATE INDEX IF NOT EXISTS idx_menu_item_modifier_group_code ON tbl_menu_item_modifier_group(modifier_group_code);
CREATE INDEX IF NOT EXISTS idx_menu_item_modifier_created_on ON tbl_menu_item_modifier_group(createdon);
CREATE INDEX IF NOT EXISTS idx_menu_item_modifier_store_code ON tbl_menu_item_modifier_group(store_code);

-- Composite index for common join patterns
CREATE INDEX IF NOT EXISTS idx_menu_item_modifier_composite ON tbl_menu_item_modifier_group(menu_item_code, modifier_group_code);

-- ============================================================
-- Menu Master Event Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_menu_master_event_master_code ON tbl_menu_master_event(menu_master_code);
CREATE INDEX IF NOT EXISTS idx_menu_master_event_code ON tbl_menu_master_event(event_code);
CREATE INDEX IF NOT EXISTS idx_menu_master_event_created_on ON tbl_menu_master_event(createdon);
CREATE INDEX IF NOT EXISTS idx_menu_master_event_store_code ON tbl_menu_master_event(store_code);

-- Composite index for common join patterns
CREATE INDEX IF NOT EXISTS idx_menu_master_event_composite ON tbl_menu_master_event(menu_master_code, event_code);

-- ============================================================
-- Prep Zone Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_prep_zone_code ON tbl_prep_zone(prep_zone_code);
CREATE INDEX IF NOT EXISTS idx_prep_zone_active ON tbl_prep_zone(is_active);
CREATE INDEX IF NOT EXISTS idx_prep_zone_printer_code ON tbl_prep_zone(printer_code);
CREATE INDEX IF NOT EXISTS idx_prep_zone_created_on ON tbl_prep_zone(createdon);
CREATE INDEX IF NOT EXISTS idx_prep_zone_store_code ON tbl_prep_zone(store_code);

-- ============================================================
-- Time Events Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_time_event_code ON tbl_Time_Events(Event_code);
CREATE INDEX IF NOT EXISTS idx_time_event_active ON tbl_Time_Events(is_active);
CREATE INDEX IF NOT EXISTS idx_time_event_created_date ON tbl_Time_Events(Created_date);
CREATE INDEX IF NOT EXISTS idx_time_event_store_code ON tbl_Time_Events(Store_code);
CREATE INDEX IF NOT EXISTS idx_time_event_start_date ON tbl_Time_Events(Event_Start_Date);
CREATE INDEX IF NOT EXISTS idx_time_event_end_date ON tbl_Time_Events(Event_End_Date);

-- Composite index for date range queries
CREATE INDEX IF NOT EXISTS idx_time_event_date_range ON tbl_Time_Events(Event_Start_Date, Event_End_Date);

-- ============================================================
-- Tax Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tax_code ON tbl_tax(tax_code);
CREATE INDEX IF NOT EXISTS idx_tax_created_date ON tbl_tax(created_date);
CREATE INDEX IF NOT EXISTS idx_tax_store_code ON tbl_tax(store_code);

-- ============================================================
-- Orders Table Indexes (if exists)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_order_status ON tbl_order(status);
CREATE INDEX IF NOT EXISTS idx_order_type ON tbl_order(order_type);
CREATE INDEX IF NOT EXISTS idx_order_created_at ON tbl_order(created_at);
CREATE INDEX IF NOT EXISTS idx_order_table_id ON tbl_order(table_id);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_order_status_type ON tbl_order(status, order_type);
CREATE INDEX IF NOT EXISTS idx_order_created_status ON tbl_order(created_at, status);

-- ============================================================
-- Order Items Table Indexes (if exists)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_order_item_order_id ON tbl_order_item(order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_menu_item_code ON tbl_order_item(menu_item_code);

-- ============================================================
-- Tables Table Indexes (if exists)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_table_number ON tbl_table(table_number);
CREATE INDEX IF NOT EXISTS idx_table_status ON tbl_table(status);
CREATE INDEX IF NOT EXISTS idx_table_created_date ON tbl_table(created_date);

-- ============================================================
-- Users Table Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_active ON users("isActive");

-- ============================================================
-- Notes:
-- ============================================================
-- 1. These indexes are designed to optimize the most common
--    query patterns in the Restaurant POS system.
--
-- 2. Indexes on foreign key columns (codes) improve JOIN
--    performance significantly.
--
-- 3. Composite indexes are created for common query patterns
--    where multiple columns are used together in WHERE or
--    ORDER BY clauses.
--
-- 4. Indexes on created_on/created_date columns help with
--    time-based sorting queries.
--
-- 5. Indexes on is_active/isActive columns help with filtering
--    active records.
--
-- 6. After creating indexes, you may want to run ANALYZE on
--    the tables to update statistics:
--    ANALYZE tbl_menu_master;
--    ANALYZE tbl_menu_category;
--    ANALYZE tbl_menu_item;
--    ANALYZE tbl_modifier_group;
--    ANALYZE tbl_modifier_item;
--    ANALYZE tbl_menu_category_modifier;
--    ANALYZE tbl_menu_item_modifier_group;
--
-- 7. Monitor index usage with:
--    SELECT * FROM pg_stat_user_indexes;
--
-- 8. If indexes are not being used, consider dropping them
--    to reduce write overhead.
-- ============================================================

