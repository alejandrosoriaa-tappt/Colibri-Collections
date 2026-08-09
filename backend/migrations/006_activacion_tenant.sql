-- Migración 006: activación de cuenta por el propio director
--
-- Antes: al dar de alta un colegio se creaba el usuario con una contraseña que
-- escribía el admin, y se le mandaba por WhatsApp en texto plano. Eso deja la
-- contraseña para siempre en el historial del chat, y el admin la conoce.
--
-- Ahora: el alta solo captura colegio, director y su WhatsApp. Se le manda una
-- liga de un solo uso y él define su correo (que será su usuario) y su
-- contraseña. El admin nunca sabe la contraseña.
--
-- Se corre a mano en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS activaciones (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Solo el hash. Si alguien lee esta tabla no puede usar las ligas
  -- pendientes: el token en claro solo existe en el WhatsApp del director.
  token_hash       text NOT NULL UNIQUE,

  nombre_director  text NOT NULL,
  telefono         text NOT NULL,          -- a dónde se mandó la liga

  expira_en        timestamptz NOT NULL,
  usado_en         timestamptz,            -- se quema al activar
  recordatorio_en  timestamptz,            -- cuándo se mandó el recordatorio

  created_at       timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activaciones_tenant ON activaciones(tenant_id);
-- Para el barrido de recordatorios: pendientes y sin recordatorio previo
CREATE INDEX IF NOT EXISTS idx_activaciones_pendientes
  ON activaciones(expira_en) WHERE usado_en IS NULL;

COMMENT ON TABLE activaciones IS
  'Ligas de un solo uso para que el director cree su propia contraseña. El token se guarda hasheado.';

-- ── Verificación ────────────────────────────────────────────────────────────
-- Colegios pendientes de activar:
-- SELECT t.display_name, a.nombre_director, a.telefono, a.expira_en, a.recordatorio_en
-- FROM activaciones a JOIN tenants t ON t.id = a.tenant_id
-- WHERE a.usado_en IS NULL ORDER BY a.created_at DESC;
