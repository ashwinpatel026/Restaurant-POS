-- Soft-delete flag for modifier tables (POS sync excludes is_delete = true)
ALTER TABLE tbl_modifier_group
  ADD COLUMN IF NOT EXISTS is_delete BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE tbl_modifier_item
  ADD COLUMN IF NOT EXISTS is_delete BOOLEAN NOT NULL DEFAULT false;
