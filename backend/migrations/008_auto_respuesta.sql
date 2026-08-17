-- Migración 008: respuesta automática cuando un papá escribe al número del colegio
--
-- Un número de WhatsApp no se puede cerrar a recibir: no existe ese ajuste, ni
-- en Cloud API ni en el WhatsApp Manager. El papá SIEMPRE va a poder escribir.
-- Y lo va a hacer: recibe un aviso de la junta y contesta "¿a qué hora?".
--
-- Sin respuesta, ese mensaje cae en un buzón que nadie lee. El papá cree que el
-- colegio lo ignoró, y ahí se pierde la confianza que el canal necesita.
--
-- Con esto el colegio contesta al instante diciendo a dónde sí dirigirse.
--
-- Se corre a mano en el SQL Editor de Supabase.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS auto_respuesta_activa boolean NOT NULL DEFAULT true;

-- NULL = usar el texto por defecto que arma el código con el nombre del colegio.
-- Se guarda solo si el colegio lo personaliza.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS auto_respuesta text;

COMMENT ON COLUMN tenants.auto_respuesta_activa IS
  'Contestar automáticamente a quien escriba al número del colegio. Encendido por default: el silencio es peor que una respuesta genérica.';
COMMENT ON COLUMN tenants.auto_respuesta IS
  'Texto de la respuesta automática. NULL = el texto por defecto con el nombre del colegio.';

-- ── Verificación ────────────────────────────────────────────────────────────
-- SELECT display_name, auto_respuesta_activa, auto_respuesta FROM tenants;
