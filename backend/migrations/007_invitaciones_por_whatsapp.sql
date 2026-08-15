-- Migración 007: el personal del colegio también entra por WhatsApp
--
-- Antes: el director activaba su cuenta con una liga por WhatsApp, pero cuando
-- él invitaba a su secretaria salía un CORREO (inviteUserByEmail de Supabase).
-- Dos caminos distintos para lo mismo, y el de correo es el frágil: va con el
-- SMTP por defecto de Supabase —limitado a unos pocos envíos por hora y no
-- pensado para producción—, y sus correos caen en spam seguido. La secretaria
-- de un colegio ve WhatsApp cien veces al día; su correo institucional, tal vez
-- nunca. El resultado práctico era una invitación que nunca llega.
--
-- Ahora: la misma liga de un solo uso sirve para todos. Lo único que cambia
-- entre el director y el resto es el ROL con el que entran.
--
-- Se corre a mano en el SQL Editor de Supabase. Requiere la 006.

ALTER TABLE activaciones
  ADD COLUMN IF NOT EXISTS rol text NOT NULL DEFAULT 'owner';

-- Los mismos tres roles que reparte el panel del colegio (settings.js).
ALTER TABLE activaciones DROP CONSTRAINT IF EXISTS activaciones_rol_check;
ALTER TABLE activaciones ADD CONSTRAINT activaciones_rol_check
  CHECK (rol IN ('owner', 'billing', 'comms'));

-- Quién invitó. Sirve para dos cosas: que el director solo pueda cancelar o
-- reenviar SUS invitaciones, y saber de dónde salió una liga si algo se ve raro.
ALTER TABLE activaciones
  ADD COLUMN IF NOT EXISTS invitado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Una invitación cancelada no debe poder activarse aunque alguien conserve la
-- liga. Se marca en vez de borrarse para que quede el rastro.
ALTER TABLE activaciones
  ADD COLUMN IF NOT EXISTS cancelada_en timestamptz;

COMMENT ON COLUMN activaciones.rol IS
  'Rol con el que entra quien usa la liga. owner = el director en el alta del colegio.';
COMMENT ON COLUMN activaciones.nombre_director IS
  'Nombre de quien recibe la liga. Se llama así por historia: hoy también son miembros del equipo.';
COMMENT ON COLUMN activaciones.cancelada_en IS
  'Invitación revocada. La liga deja de servir aunque no haya vencido.';

-- ── Verificación ────────────────────────────────────────────────────────────
-- Invitaciones vivas, por colegio:
-- SELECT t.display_name AS colegio, a.nombre_director, a.telefono, a.rol, a.expira_en
-- FROM activaciones a JOIN tenants t ON t.id = a.tenant_id
-- WHERE a.usado_en IS NULL AND a.cancelada_en IS NULL AND a.expira_en > NOW()
-- ORDER BY a.created_at DESC;
