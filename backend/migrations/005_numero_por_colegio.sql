-- Migración 005: un número de WhatsApp por colegio
--
-- Por qué: hoy TODOS los colegios envían desde un mismo número
-- (WABA_PHONE_NUMBER_ID en variables de entorno). Meta califica la calidad
-- POR NÚMERO, así que si los papás de un colegio bloquean o reportan, la
-- entrega se degrada para todos los demás. Un número por colegio aísla eso.
--
-- Los números viven bajo la MISMA WABA de Kollybry, no una WABA por colegio:
-- así las plantillas se aprueban una sola vez y el colegio no hace trámites
-- con Meta.
--
-- Se corre a mano en el SQL Editor de Supabase.

-- ── Bolsa de números disponibles ────────────────────────────────────────────
-- Meta no permite crear y verificar un número al instante: hay que pedir
-- código de verificación y esperar la aprobación del nombre para mostrar.
-- Por eso se mantienen números ya registrados esperando, y al dar de alta un
-- colegio se le asigna uno de inmediato.
CREATE TABLE IF NOT EXISTS waba_numeros (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number_id      text NOT NULL UNIQUE,          -- id de Meta, el que usa la API
  display_phone        text NOT NULL,                 -- +52 442 ... (para verlo en el panel)
  display_name         text,                          -- nombre que ve el papá
  display_name_estado  text NOT NULL DEFAULT 'pendiente'
                         CHECK (display_name_estado IN ('pendiente','aprobado','rechazado')),
  estado               text NOT NULL DEFAULT 'libre'
                         CHECK (estado IN ('libre','asignado','retirado')),
  tenant_id            uuid REFERENCES tenants(id) ON DELETE SET NULL,
  asignado_en          timestamptz,
  notas                text,
  created_at           timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waba_numeros_estado ON waba_numeros(estado);
CREATE INDEX IF NOT EXISTS idx_waba_numeros_tenant ON waba_numeros(tenant_id);

-- ── El colegio guarda su número ─────────────────────────────────────────────
-- Se deja nullable a propósito: si un colegio todavía no tiene número
-- asignado, el envío cae al número compartido en vez de fallar.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS waba_phone_number_id text;

COMMENT ON COLUMN tenants.waba_phone_number_id IS
  'Número desde el que este colegio envía. NULL = usa el número compartido de Kollybry.';

-- ── Verificación ────────────────────────────────────────────────────────────
-- SELECT display_phone, display_name, estado, display_name_estado FROM waba_numeros ORDER BY estado;
-- SELECT name, waba_phone_number_id FROM tenants;
