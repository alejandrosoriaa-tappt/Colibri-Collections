-- Migration: Normalize grade/section/salon structure
-- Purpose: Add seccion and salon fields to contacts table for proper grouping
-- Date: 2026-06-09

-- Add new columns if they don't exist
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS seccion TEXT,
ADD COLUMN IF NOT EXISTS salon TEXT;

-- ============================================================================
-- DATA MIGRATION: Parse existing grupo/grado values
-- ============================================================================

-- Parse "Primaria 1ro A" → seccion="Primaria", grado="1ro", salon="A"
-- Parse "Secundaria 3ro A" → seccion="Secundaria", grado="3ro", salon="A"
-- Parse "Universidad 9no A" → seccion="Universidad", grado="9no", salon="A"

UPDATE contacts
SET
  seccion = CASE
    WHEN grupo ~ '^Primaria' THEN 'Primaria'
    WHEN grupo ~ '^Secundaria' THEN 'Secundaria'
    WHEN grupo ~ '^Universidad' THEN 'Universidad'
    WHEN grupo ~ '^Preescolar' THEN 'Preescolar'
    WHEN grupo ~ '^Preparatoria' THEN 'Preparatoria'
    ELSE NULL
  END,
  salon = CASE
    -- Extract last character (A, B, C, etc.) from grupo like "Primaria 1ro A"
    WHEN grupo ~ '[A-Z]$' THEN RIGHT(grupo, 1)
    ELSE NULL
  END
WHERE grupo IS NOT NULL AND grupo != '';

-- Also handle grado-only structure (where grado = "1ro" but no seccion set)
-- These should get grado kept as-is, and we'll display them as "{grado}" if no seccion
UPDATE contacts
SET
  seccion = CASE
    WHEN seccion IS NULL AND grado ~ '^[0-9]+(ro|do|er|to)' THEN 'Sin Sección'
    ELSE seccion
  END
WHERE grado IS NOT NULL AND grado != '' AND seccion IS NULL;

-- ============================================================================
-- Create a computed group name for backward compatibility
-- This will be used in broadcasts dropdown
-- ============================================================================

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_contacts_seccion ON contacts(tenant_id, seccion);
CREATE INDEX IF NOT EXISTS idx_contacts_salon ON contacts(tenant_id, salon);
CREATE INDEX IF NOT EXISTS idx_contacts_grado ON contacts(tenant_id, grado);

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify the migration)
-- ============================================================================

-- See all unique sections by tenant
-- SELECT tenant_id, seccion, COUNT(*) FROM contacts WHERE seccion IS NOT NULL GROUP BY tenant_id, seccion;

-- See all unique grados by tenant
-- SELECT tenant_id, grado, COUNT(*) FROM contacts WHERE grado IS NOT NULL GROUP BY tenant_id, grado;

-- See all unique salons by tenant
-- SELECT tenant_id, salon, COUNT(*) FROM contacts WHERE salon IS NOT NULL GROUP BY tenant_id, salon;

-- See sample groups after migration
-- SELECT DISTINCT
--   CONCAT_WS(' ', seccion, grado, salon) as group_name,
--   COUNT(*) as contact_count
-- FROM contacts
-- WHERE seccion IS NOT NULL OR grado IS NOT NULL
-- GROUP BY seccion, grado, salon
-- ORDER BY group_name;
