-- CRM NKUVO — add 'nuevo_registro' as the initial pipeline status.
-- Imported prospects land in 'nuevo_registro' and move to 'prospecto'
-- after the first real contact/update.
--
-- Run in Railway Postgres console:  psql $DATABASE_URL -f this_file
-- or paste the statements below.

-- 1. Replace the status CHECK constraint to allow 'nuevo_registro'.
ALTER TABLE crm_clients DROP CONSTRAINT IF EXISTS crm_clients_status_check;
ALTER TABLE crm_clients ADD CONSTRAINT crm_clients_status_check
  CHECK (status IN ('nuevo_registro','prospecto','contactado','negociacion','cliente','perdido','inactivo'));

-- 2. New default for future inserts.
ALTER TABLE crm_clients ALTER COLUMN status SET DEFAULT 'nuevo_registro';
