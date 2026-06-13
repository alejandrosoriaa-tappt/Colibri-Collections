-- CRM NKUVO Labs — Railway PostgreSQL
-- Ejecutar en el terminal de Railway o con: npm run migrate:crm

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- CRM CLIENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS crm_clients (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID        NOT NULL,
  razon_social    TEXT        NOT NULL,
  nombre_contacto TEXT,
  cargo           TEXT,
  telefono        TEXT,
  email           TEXT,
  website         TEXT,
  direccion       TEXT,
  ciudad          TEXT,
  estado          TEXT,
  giro            TEXT,
  notas           TEXT,
  status          TEXT        NOT NULL DEFAULT 'nuevo_registro'
    CHECK (status IN ('nuevo_registro','prospecto','contactado','negociacion','cliente','perdido','inactivo')),
  prioridad       TEXT        NOT NULL DEFAULT 'media'
    CHECK (prioridad IN ('alta','media','baja')),
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CRM ACTIVITIES
-- ================================================================
CREATE TABLE IF NOT EXISTS crm_activities (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID        NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL,
  tipo        TEXT        NOT NULL
    CHECK (tipo IN ('llamada','email','reunion','whatsapp','visita','otro')),
  descripcion TEXT,
  fecha       TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CRM FOLLOW-UPS
-- ================================================================
CREATE TABLE IF NOT EXISTS crm_followups (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID        NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  tenant_id           UUID        NOT NULL,
  fecha_recordatorio  TIMESTAMPTZ NOT NULL,
  descripcion         TEXT        NOT NULL,
  completado          BOOLEAN     DEFAULT false,
  tappt_enviado       BOOLEAN     DEFAULT false,
  created_by          UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS crm_clients_tenant_idx        ON crm_clients(tenant_id);
CREATE INDEX IF NOT EXISTS crm_clients_status_idx        ON crm_clients(status);
CREATE INDEX IF NOT EXISTS crm_clients_updated_idx       ON crm_clients(updated_at DESC);
CREATE INDEX IF NOT EXISTS crm_activities_client_idx     ON crm_activities(client_id);
CREATE INDEX IF NOT EXISTS crm_activities_tenant_idx     ON crm_activities(tenant_id);
CREATE INDEX IF NOT EXISTS crm_followups_client_idx      ON crm_followups(client_id);
CREATE INDEX IF NOT EXISTS crm_followups_tenant_idx      ON crm_followups(tenant_id);
CREATE INDEX IF NOT EXISTS crm_followups_fecha_idx       ON crm_followups(fecha_recordatorio);
CREATE INDEX IF NOT EXISTS crm_followups_completado_idx  ON crm_followups(completado);
