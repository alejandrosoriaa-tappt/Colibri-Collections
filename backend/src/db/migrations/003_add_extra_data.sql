-- Migration 003: Add extra_data JSONB to contacts
-- For org-type-specific fields that don't belong in dedicated columns.
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jklqukssyxbfzefwpgaw/editor

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}';

COMMENT ON COLUMN contacts.extra_data IS
  'Org-type-specific fields. Examples:
   Club/Gym: { "plan": "Gold", "vencimiento": "2025-12-31" }
   Future fields go here instead of new columns.';

-- Index for JSONB key lookups (optional, add when queries on specific keys become common)
-- CREATE INDEX IF NOT EXISTS idx_contacts_extra_data ON contacts USING GIN (extra_data);
