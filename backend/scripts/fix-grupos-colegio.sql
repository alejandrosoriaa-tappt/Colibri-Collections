-- ============================================================================
-- Corrección de nombres de grupo ya guardados (Kollybry / colegios)
--
-- NO es una migración: se corre A MANO y por tenant. Los grupos del selector
-- de destinatarios no son una lista configurable — se calculan con un DISTINCT
-- sobre contacts.grupo (ver getContactGroupsByTenant). Para que un grupo
-- desaparezca o cambie de nombre hay que corregir los contactos.
--
-- Sustituye :tenant_id por el UUID del colegio antes de correr nada.
-- ============================================================================


-- ── 1. DIAGNÓSTICO — correr SIEMPRE primero ────────────────────────────────
-- Cuántos contactos cuelgan de cada grupo. Sirve para saber si un grupo
-- "sobrante" tiene gente real detrás o quedó de una importación mala.
SELECT grupo, seccion, grado, salon, count(*) AS contactos
FROM contacts
WHERE tenant_id = :tenant_id
  AND status <> 'inactive'
GROUP BY grupo, seccion, grado, salon
ORDER BY grupo;


-- ── 2. Casa de Niños: quitar el nombre de la guía ──────────────────────────
-- "CASA DE NIÑOS A - LAURA" → "CNA". Revisa primero qué va a cambiar:
SELECT id, nombre, apellido, grupo, salon
FROM contacts
WHERE tenant_id = :tenant_id
  AND (grupo ILIKE '%casa de ni%' OR grupo ILIKE 'CN %' OR salon ILIKE '%casa de ni%');

-- Y cuando el listado de arriba se vea correcto:
UPDATE contacts
SET salon = 'CN' || upper(substring(
      regexp_replace(salon, '^\s*(INGRESO\s+)?(CASA\s*DE\s*NI[ÑN]OS|CN)\s*[-–—]?\s*', '', 'i')
      FROM 1 FOR 1)),
    grupo = 'CN' || upper(substring(
      regexp_replace(salon, '^\s*(INGRESO\s+)?(CASA\s*DE\s*NI[ÑN]OS|CN)\s*[-–—]?\s*', '', 'i')
      FROM 1 FOR 1))
WHERE tenant_id = :tenant_id
  AND (salon ILIKE '%casa de ni%' OR salon ILIKE 'CN%')
  AND regexp_replace(salon, '^\s*(INGRESO\s+)?(CASA\s*DE\s*NI[ÑN]OS|CN)\s*[-–—]?\s*', '', 'i') ~ '^[A-Ea-e]';


-- ── 3. Grupos que no deberían existir (p. ej. "Primaria 3B", "Primaria 4B") ──
-- OJO: no borres a ciegas. Primero mira QUIÉN está ahí:
SELECT id, nombre, apellido, nombre_familia, nombre_alumno, grupo, telefono
FROM contacts
WHERE tenant_id = :tenant_id
  AND grupo IN ('Primaria 3B', 'Primaria 4B');

-- Caso A — el salón sí existe pero está mal escrito o los alumnos van en otro:
-- reasignarlos al grupo correcto (ajusta el destino).
-- UPDATE contacts
-- SET salon = 'A', grupo = 'Primaria 3ro A'
-- WHERE tenant_id = :tenant_id AND grupo = 'Primaria 3B';

-- Caso B — el grupo quedó de una importación equivocada y esos contactos no
-- deben existir: darlos de baja (reversible) en vez de borrarlos.
-- UPDATE contacts
-- SET status = 'inactive', inactive_since = NOW()
-- WHERE tenant_id = :tenant_id AND grupo IN ('Primaria 3B', 'Primaria 4B');

-- Caso C — borrado definitivo. Irreversible y se lleva el historial del
-- contacto. Úsalo solo si ya confirmaste con el colegio.
-- DELETE FROM contacts
-- WHERE tenant_id = :tenant_id AND grupo IN ('Primaria 3B', 'Primaria 4B');


-- ── 4. Verificación — el selector debe reflejar esto ───────────────────────
SELECT DISTINCT grupo
FROM contacts
WHERE tenant_id = :tenant_id
  AND status <> 'inactive'
  AND grupo IS NOT NULL AND grupo <> ''
ORDER BY grupo;
