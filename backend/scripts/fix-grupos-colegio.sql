-- ============================================================================
-- Corrección de nombres de grupo ya guardados (Kollybry / colegios)
--
-- NO es una migración: se corre A MANO desde el SQL Editor de Supabase.
--
-- Los grupos del selector de destinatarios no son una lista configurable —
-- se calculan con un DISTINCT sobre contacts.grupo (ver
-- getContactGroupsByTenant). Para que un grupo desaparezca o cambie de
-- nombre hay que corregir los CONTACTOS.
--
-- Las consultas hacen JOIN con tenants para no depender de pegar un UUID.
-- (El SQL Editor de Supabase NO soporta parámetros tipo :tenant_id — si ves
-- 'syntax error at or near ":"' es por eso.)
-- ============================================================================


-- ── 1. DIAGNÓSTICO — correr SIEMPRE primero ────────────────────────────────
-- Cuántos contactos cuelgan de cada grupo, por colegio. Sirve para saber si un
-- grupo sobrante tiene gente real detrás o quedó de una importación mala.
SELECT t.name AS colegio, c.grupo, c.seccion, c.grado, c.salon, count(*) AS contactos
FROM contacts c
JOIN tenants t ON t.id = c.tenant_id
WHERE c.status <> 'inactive'
GROUP BY t.name, c.grupo, c.seccion, c.grado, c.salon
ORDER BY t.name, c.grupo;


-- ── 2. Grupos que no deberían existir (p. ej. "Primaria 3B", "Primaria 4B") ──
-- Primero mira QUIÉN está ahí. No borres a ciegas.
SELECT t.name AS colegio, c.id, c.nombre, c.apellido,
       c.nombre_familia, c.nombre_alumno, c.grupo, c.telefono
FROM contacts c
JOIN tenants t ON t.id = c.tenant_id
WHERE c.grupo IN ('Primaria 3B', 'Primaria 4B')
ORDER BY t.name, c.grupo, c.nombre_familia;

-- Según lo que salga, elige UNA de las tres salidas y descoméntala.
-- Cambia 'NOMBRE DEL COLEGIO' por el valor real de la columna colegio.

-- Caso A — el salón existe pero está mal escrito: reasignar al grupo correcto.
-- UPDATE contacts c
-- SET salon = 'A', grupo = 'Primaria 3ro A'
-- FROM tenants t
-- WHERE t.id = c.tenant_id AND t.name = 'NOMBRE DEL COLEGIO'
--   AND c.grupo = 'Primaria 3B';

-- Caso B — quedó de una importación equivocada: dar de baja (REVERSIBLE).
-- UPDATE contacts c
-- SET status = 'inactive', inactive_since = NOW()
-- FROM tenants t
-- WHERE t.id = c.tenant_id AND t.name = 'NOMBRE DEL COLEGIO'
--   AND c.grupo IN ('Primaria 3B', 'Primaria 4B');

-- Caso C — borrado definitivo. IRREVERSIBLE, se lleva el historial del
-- contacto. Solo si ya lo confirmaste con el colegio.
-- DELETE FROM contacts c
-- USING tenants t
-- WHERE t.id = c.tenant_id AND t.name = 'NOMBRE DEL COLEGIO'
--   AND c.grupo IN ('Primaria 3B', 'Primaria 4B');


-- ── 3. Casa de Niños: quitar el nombre de la guía ──────────────────────────
-- "CASA DE NIÑOS A - LAURA" → "CNA".
-- Solo hace falta para lo YA importado: las importaciones nuevas toman el
-- nombre de la columna GRUPO del archivo ("CNA", "TI D").
--
-- Revisa primero qué cambiaría:
SELECT t.name AS colegio, c.id, c.nombre, c.apellido, c.grupo, c.salon,
       'CN' || upper(substring(
         regexp_replace(c.salon, '^\s*(INGRESO\s+)?(CASA\s*DE\s*NI[ÑN]OS|CN)\s*[-–—]?\s*', '', 'i')
         FROM 1 FOR 1)) AS grupo_nuevo
FROM contacts c
JOIN tenants t ON t.id = c.tenant_id
WHERE (c.salon ILIKE '%casa de ni%' OR c.salon ILIKE 'CN%')
  AND regexp_replace(c.salon, '^\s*(INGRESO\s+)?(CASA\s*DE\s*NI[ÑN]OS|CN)\s*[-–—]?\s*', '', 'i') ~ '^[A-Ea-e]';

-- Y cuando la columna grupo_nuevo se vea correcta:
-- UPDATE contacts
-- SET salon = 'CN' || upper(substring(
--       regexp_replace(salon, '^\s*(INGRESO\s+)?(CASA\s*DE\s*NI[ÑN]OS|CN)\s*[-–—]?\s*', '', 'i')
--       FROM 1 FOR 1)),
--     grupo = 'CN' || upper(substring(
--       regexp_replace(salon, '^\s*(INGRESO\s+)?(CASA\s*DE\s*NI[ÑN]OS|CN)\s*[-–—]?\s*', '', 'i')
--       FROM 1 FOR 1))
-- WHERE (salon ILIKE '%casa de ni%' OR salon ILIKE 'CN%')
--   AND regexp_replace(salon, '^\s*(INGRESO\s+)?(CASA\s*DE\s*NI[ÑN]OS|CN)\s*[-–—]?\s*', '', 'i') ~ '^[A-Ea-e]';


-- ── 4. Acentos rotos por el bug viejo de titleCase ─────────────────────────
-- 'GARCÍA LÓPEZ' se guardaba como 'GarcÍA LÓPez'. Ya está corregido para
-- importaciones nuevas; esto detecta lo que quedó mal guardado antes.
SELECT t.name AS colegio, c.id, c.nombre, c.apellido, c.nombre_familia
FROM contacts c
JOIN tenants t ON t.id = c.tenant_id
WHERE c.nombre_familia ~ '[a-záéíóúñ][A-ZÁÉÍÓÚÑ]'
   OR c.nombre        ~ '[a-záéíóúñ][A-ZÁÉÍÓÚÑ]'
ORDER BY t.name, c.nombre_familia;
-- Si salen muchos, lo más limpio es volver a importar ese padrón.


-- ── 5. Verificación final — el selector debe reflejar esto ─────────────────
SELECT t.name AS colegio, c.grupo
FROM contacts c
JOIN tenants t ON t.id = c.tenant_id
WHERE c.status <> 'inactive'
  AND c.grupo IS NOT NULL AND c.grupo <> ''
GROUP BY t.name, c.grupo
ORDER BY t.name, c.grupo;
