-- Migration 001: Add nombre_alumno field to contacts
-- Run this in the Supabase SQL Editor
-- https://supabase.com/dashboard/project/jklqukssyxbfzefwpgaw/editor

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS nombre_alumno TEXT;

-- Add index for search performance
CREATE INDEX IF NOT EXISTS idx_contacts_nombre_alumno ON contacts(nombre_alumno);
