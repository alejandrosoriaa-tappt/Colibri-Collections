-- Migration 004: Broadcast support in message_logs
-- Why: broadcasts.js logs each send with broadcast_id + type, but those columns
-- never existed — inserts failed silently, so delivery/read KPIs stayed at 0.
-- Date: 2026-06-10

ALTER TABLE message_logs
  ADD COLUMN IF NOT EXISTS broadcast_id uuid REFERENCES broadcasts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'campaign';

-- Fast lookups: per-broadcast aggregation and webhook status updates
CREATE INDEX IF NOT EXISTS idx_message_logs_broadcast ON message_logs(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_wa_id ON message_logs(wa_message_id);

-- ============================================================
-- VERIFICACIÓN (opcional)
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'message_logs' ORDER BY column_name;
