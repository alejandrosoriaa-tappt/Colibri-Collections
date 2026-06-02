-- Migration 004: Track WhatsApp onboarding confirmation
-- When a tenant admin taps "Recibido" on the welcome template,
-- the webhook sets this timestamp automatically.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS whatsapp_confirmed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN tenants.whatsapp_confirmed_at IS
  'Set when the tenant admin replies "Recibido" to the onboarding WhatsApp template.';
