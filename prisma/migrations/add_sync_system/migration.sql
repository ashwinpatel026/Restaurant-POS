-- ============================================
-- SYNC SYSTEM MIGRATION
-- Adds UUID-based sync fields to Master Database
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. SYNC LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sync_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,         -- matches sync_id from master tables
    operation TEXT NOT NULL,          -- INSERT / UPDATE / DELETE
    source TEXT NOT NULL,             -- server, terminal, website
    data JSONB,                       -- full row data snapshot
    change_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status SMALLINT DEFAULT 0,   -- 0=pending, 1=processed, 2=failed
    location_code VARCHAR(100),       -- which location to sync to (NULL = all)
    error_message TEXT,              -- error details if sync failed
    retry_count SMALLINT DEFAULT 0,
    last_retry_at TIMESTAMP,
    synced_at TIMESTAMP,             -- when sync was completed
    synced_by INT                    -- user/admin who triggered sync
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(sync_status, change_time);
CREATE INDEX IF NOT EXISTS idx_sync_log_table_record ON sync_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_location ON sync_log(location_code);
CREATE INDEX IF NOT EXISTS idx_sync_log_pending ON sync_log(sync_status, location_code, table_name) WHERE sync_status = 0;

-- ============================================
-- 2. SYNC STATUS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sync_status (
    id BIGSERIAL PRIMARY KEY,
    location_code VARCHAR(100) NOT NULL,
    table_name TEXT NOT NULL,
    last_sync_time TIMESTAMP,
    last_sync_status SMALLINT DEFAULT 0,  -- 0=success, 1=failed
    total_records_synced BIGINT DEFAULT 0,
    last_error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_code, table_name)
);

CREATE INDEX IF NOT EXISTS idx_sync_status_location ON sync_status(location_code);
CREATE INDEX IF NOT EXISTS idx_sync_status_table ON sync_status(table_name);

-- ============================================
-- 3. ADD SYNC FIELDS TO MASTER TABLES
-- ============================================

-- Printer Master
ALTER TABLE tbl_printer_master 
ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_printer_master_sync_id ON tbl_printer_master(sync_id);

-- Menu Master
ALTER TABLE tbl_menu_master 
ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_master_sync_id ON tbl_menu_master(sync_id);

-- Menu Category
ALTER TABLE tbl_menu_category 
ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_category_sync_id ON tbl_menu_category(sync_id);

-- Menu Item
ALTER TABLE tbl_menu_item 
ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_item_sync_id ON tbl_menu_item(sync_id);

-- Modifier Group
ALTER TABLE tbl_modifier_group 
ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_modifier_group_sync_id ON tbl_modifier_group(sync_id);

-- Modifier Item
ALTER TABLE tbl_modifier_item 
ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_modifier_item_sync_id ON tbl_modifier_item(sync_id);

-- Prep Zone
ALTER TABLE tbl_prep_zone 
ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_prep_zone_sync_id ON tbl_prep_zone(sync_id);

-- Station
ALTER TABLE tbl_station 
ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_station_sync_id ON tbl_station(sync_id);

-- Tax
ALTER TABLE tbl_tax 
ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_sync_id ON tbl_tax(sync_id);

-- Time Events
ALTER TABLE tbl_Time_Events 
ADD COLUMN IF NOT EXISTS sync_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(20) DEFAULT 'server';

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_events_sync_id ON tbl_Time_Events(sync_id);

-- ============================================
-- 4. TRIGGER FUNCTION FOR CHANGE DETECTION
-- ============================================
CREATE OR REPLACE FUNCTION log_sync_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO sync_log (table_name, record_id, operation, source, data)
        VALUES (
            TG_TABLE_NAME, 
            NEW.sync_id, 
            'INSERT', 
            COALESCE(NEW.sync_source, 'server'), 
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if actual data changed (exclude sync fields)
        IF (row_to_json(OLD)::jsonb - 'sync_id' - 'sync_source') IS DISTINCT FROM 
           (row_to_json(NEW)::jsonb - 'sync_id' - 'sync_source') THEN
            INSERT INTO sync_log (table_name, record_id, operation, source, data)
            VALUES (
                TG_TABLE_NAME, 
                NEW.sync_id, 
                'UPDATE', 
                COALESCE(NEW.sync_source, 'server'), 
                row_to_json(NEW)
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO sync_log (table_name, record_id, operation, source, data)
        VALUES (
            TG_TABLE_NAME, 
            OLD.sync_id, 
            'DELETE', 
            COALESCE(OLD.sync_source, 'server'), 
            row_to_json(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. ATTACH TRIGGERS TO MASTER TABLES
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_printer_master_sync ON tbl_printer_master;
DROP TRIGGER IF EXISTS trigger_menu_master_sync ON tbl_menu_master;
DROP TRIGGER IF EXISTS trigger_menu_category_sync ON tbl_menu_category;
DROP TRIGGER IF EXISTS trigger_menu_item_sync ON tbl_menu_item;
DROP TRIGGER IF EXISTS trigger_modifier_group_sync ON tbl_modifier_group;
DROP TRIGGER IF EXISTS trigger_modifier_item_sync ON tbl_modifier_item;
DROP TRIGGER IF EXISTS trigger_prep_zone_sync ON tbl_prep_zone;
DROP TRIGGER IF EXISTS trigger_station_sync ON tbl_station;
DROP TRIGGER IF EXISTS trigger_tax_sync ON tbl_tax;
DROP TRIGGER IF EXISTS trigger_time_events_sync ON tbl_Time_Events;

-- Create triggers
CREATE TRIGGER trigger_printer_master_sync
AFTER INSERT OR UPDATE OR DELETE ON tbl_printer_master
FOR EACH ROW EXECUTE FUNCTION log_sync_change();

CREATE TRIGGER trigger_menu_master_sync
AFTER INSERT OR UPDATE OR DELETE ON tbl_menu_master
FOR EACH ROW EXECUTE FUNCTION log_sync_change();

CREATE TRIGGER trigger_menu_category_sync
AFTER INSERT OR UPDATE OR DELETE ON tbl_menu_category
FOR EACH ROW EXECUTE FUNCTION log_sync_change();

CREATE TRIGGER trigger_menu_item_sync
AFTER INSERT OR UPDATE OR DELETE ON tbl_menu_item
FOR EACH ROW EXECUTE FUNCTION log_sync_change();

CREATE TRIGGER trigger_modifier_group_sync
AFTER INSERT OR UPDATE OR DELETE ON tbl_modifier_group
FOR EACH ROW EXECUTE FUNCTION log_sync_change();

CREATE TRIGGER trigger_modifier_item_sync
AFTER INSERT OR UPDATE OR DELETE ON tbl_modifier_item
FOR EACH ROW EXECUTE FUNCTION log_sync_change();

CREATE TRIGGER trigger_prep_zone_sync
AFTER INSERT OR UPDATE OR DELETE ON tbl_prep_zone
FOR EACH ROW EXECUTE FUNCTION log_sync_change();

CREATE TRIGGER trigger_station_sync
AFTER INSERT OR UPDATE OR DELETE ON tbl_station
FOR EACH ROW EXECUTE FUNCTION log_sync_change();

CREATE TRIGGER trigger_tax_sync
AFTER INSERT OR UPDATE OR DELETE ON tbl_tax
FOR EACH ROW EXECUTE FUNCTION log_sync_change();

CREATE TRIGGER trigger_time_events_sync
AFTER INSERT OR UPDATE OR DELETE ON tbl_Time_Events
FOR EACH ROW EXECUTE FUNCTION log_sync_change();

-- ============================================
-- 6. HELPER FUNCTION TO UPDATE SYNC STATUS
-- ============================================
CREATE OR REPLACE FUNCTION update_sync_status(
    p_location_code VARCHAR(100),
    p_table_name TEXT,
    p_status SMALLINT,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO sync_status (location_code, table_name, last_sync_time, last_sync_status, last_error_message, updated_at)
    VALUES (p_location_code, p_table_name, CURRENT_TIMESTAMP, p_status, p_error_message, CURRENT_TIMESTAMP)
    ON CONFLICT (location_code, table_name) 
    DO UPDATE SET
        last_sync_time = CURRENT_TIMESTAMP,
        last_sync_status = p_status,
        last_error_message = p_error_message,
        updated_at = CURRENT_TIMESTAMP,
        total_records_synced = sync_status.total_records_synced + 1;
END;
$$ LANGUAGE plpgsql;

