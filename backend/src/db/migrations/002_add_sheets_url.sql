-- Migration 002: Add Google Sheets URL to tenants
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jklqukssyxbfzefwpgaw/editor

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sheets_url TEXT;

-- Optional: add a comment for documentation
COMMENT ON COLUMN tenants.sheets_url IS 'Google Sheets public URL for automatic contact import';
