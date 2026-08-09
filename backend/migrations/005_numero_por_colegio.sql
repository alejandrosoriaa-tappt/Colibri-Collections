-- Migración 005: un número de WhatsApp por colegio
--
-- Por qué: hoy TODOS los colegios envían desde el mismo número
-- (WABA_PHONE_NUMBER_ID en variables de entorno). Meta califica la calidad
-- POR NÚMERO, así que si los papás de un colegio bloquean o reportan, la
-- entrega se degrada para todos los demás. Un número por colegio aísla eso.
--
-- Modelo: el COLEGIO compra y mantiene su propio chip; Kollybry registra ese
-- número en su WABA. Así el colegio es dueño de su número y se lo lleva si
-- termina el servicio, y las plantillas se siguen aprobando una sola vez.
--
-- Se corre a mano en el SQL Editor de Supabase.

-- ── Registro de números de colegio ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waba_numeros (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            uuid REFERENCES tenants(id) ON DELETE SET NULL,
  phone_number_id      text NOT NULL UNIQUE,          -- id de Meta, el que usa la API
  display_phone        text NOT NULL,                 -- +52 442 ... como lo ve el papá
  display_name         text,                          -- nombre que aparece como remitente
  display_name_estado  text NOT NULL DEFAULT 'pendiente'
                         CHECK (display_name_estado IN ('pendiente','aprobado','rechazado')),
  estado               text NOT NULL DEFAULT 'activo'
                         CHECK (estado IN ('activo','suspendido','retirado')),

  -- El chip es del colegio y es prepago: si se vence la recarga, la compañía
  -- recicla el número y se pierde para siempre —incluso puede reasignarse a un
  -- desconocido—. Esta fecha existe para avisarle al colegio ANTES.
  recarga_vence_en     date,
  responsable_chip     text,                          -- quién resguarda el chip físico

  notas                text,
  created_at           timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waba_numeros_tenant  ON waba_numeros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waba_numeros_recarga ON waba_numeros(recarga_vence_en);

COMMENT ON TABLE waba_numeros IS
  'Números de WhatsApp de cada colegio. El chip lo compra y mantiene el colegio; Kollybry lo registra en su WABA.';
COMMENT ON COLUMN waba_numeros.recarga_vence_en IS
  'Prepago: pasada esta fecha la compañía puede reciclar el número. Avisar al colegio antes.';

-- ── El colegio ya tiene dónde guardar su número ─────────────────────────────
-- NO se agrega columna: tenants.waba_phone_id YA EXISTE (la usa settings.js
-- en su TENANT_SELECT). La infraestructura de número por colegio estaba en el
-- esquema desde antes; lo que faltaba era conectarla al envío, que es lo que
-- hace este cambio en el código.
--
-- Solo se documenta para que quede claro qué significa ahora:
COMMENT ON COLUMN tenants.waba_phone_id IS
  'Número desde el que este colegio envía sus comunicados. NULL = usa el número compartido de Kollybry. Solo editable desde el panel de Admin.';

-- ── Verificación ────────────────────────────────────────────────────────────
-- SELECT t.display_name AS colegio, n.display_phone, n.display_name,
--        n.display_name_estado, n.recarga_vence_en
-- FROM waba_numeros n LEFT JOIN tenants t ON t.id = n.tenant_id
-- ORDER BY n.recarga_vence_en NULLS LAST;

-- Números con la recarga por vencer en los próximos 30 días:
-- SELECT display_phone, recarga_vence_en, responsable_chip
-- FROM waba_numeros
-- WHERE estado = 'activo' AND recarga_vence_en < CURRENT_DATE + 30;
