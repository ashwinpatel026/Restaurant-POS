-- ============================================
-- SYNC SYSTEM MIGRATION - LOCATION DATABASE
-- Adds UUID-based sync fields to Location Database tables
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ADD SYNC FIELDS TO LOCATION TABLES
-- ============================================

-- Printer
ALTER TABLE tbl_printer 
ADD COLUMN IF NOT EXISTS sync_id UUID,
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_printer_sync_id ON tbl_printer(sync_id) WHERE sync_id IS NOT NULL;

-- Menu Master
ALTER TABLE tbl_menu_master 
ADD COLUMN IF NOT EXISTS sync_id UUID,
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_master_sync_id ON tbl_menu_master(sync_id) WHERE sync_id IS NOT NULL;

-- Menu Category
ALTER TABLE tbl_menu_category 
ADD COLUMN IF NOT EXISTS sync_id UUID,
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_category_sync_id ON tbl_menu_category(sync_id) WHERE sync_id IS NOT NULL;

-- Menu Item
ALTER TABLE tbl_menu_item 
ADD COLUMN IF NOT EXISTS sync_id UUID,
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_item_sync_id ON tbl_menu_item(sync_id) WHERE sync_id IS NOT NULL;

-- Modifier Group
ALTER TABLE tbl_modifier_group 
ADD COLUMN IF NOT EXISTS sync_id UUID,
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_modifier_group_sync_id ON tbl_modifier_group(sync_id) WHERE sync_id IS NOT NULL;

-- Modifier Item
ALTER TABLE tbl_modifier_item 
ADD COLUMN IF NOT EXISTS sync_id UUID,
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_modifier_item_sync_id ON tbl_modifier_item(sync_id) WHERE sync_id IS NOT NULL;

-- Prep Zone
ALTER TABLE tbl_prep_zone 
ADD COLUMN IF NOT EXISTS sync_id UUID,
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_prep_zone_sync_id ON tbl_prep_zone(sync_id) WHERE sync_id IS NOT NULL;

-- Station
ALTER TABLE tbl_station 
ADD COLUMN IF NOT EXISTS sync_id UUID,
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_station_sync_id ON tbl_station(sync_id) WHERE sync_id IS NOT NULL;

-- Tax
ALTER TABLE tbl_tax 
ADD COLUMN IF NOT EXISTS sync_id UUID,
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_sync_id ON tbl_tax(sync_id) WHERE sync_id IS NOT NULL;

-- Time Events
ALTER TABLE "tbl_Time_Events" 
ADD COLUMN IF NOT EXISTS sync_id UUID,
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_events_sync_id ON "tbl_Time_Events"(sync_id) WHERE sync_id IS NOT NULL;

