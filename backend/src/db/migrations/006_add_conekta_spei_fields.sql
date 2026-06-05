-- Migration 006: Add Conekta SPEI payment fields to invoices table
-- Adds columns to track SPEI orders and charges for payment reconciliation

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS conekta_order_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS conekta_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS conekta_clabe VARCHAR(18),
  ADD COLUMN IF NOT EXISTS conekta_expires_at BIGINT;

-- Index for fast lookup of invoices by Conekta order ID (for webhook processing)
CREATE INDEX IF NOT EXISTS idx_invoices_conekta_order_id
ON invoices(conekta_order_id);
