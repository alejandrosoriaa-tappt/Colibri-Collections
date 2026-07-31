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


-- ── 2. Grupos sobrantes ────────────────────────────────────────────────────
-- Estado observado en colegio-americas (jul 2026): los grupos reales tienen
-- entre 19 y 35 contactos, mientras que estos dos tienen 1 cada uno, lo que
-- delata una importación mala y no un salón de verdad.
--   Primaria 3ro B → 1 contacto
--   Primaria 4to B → 1 contacto
-- OJO con el nombre exacto: es "Primaria 3ro B", NO "Primaria 3B".
--
-- Primero mira QUIÉN está ahí. No borres a ciegas.
SELECT c.id, c.relationship_type, c.nombre, c.apellido, c.nombre_familia,
       c.nombre_alumno, c.grupo, c.seccion, c.grado, c.salon, c.telefono
FROM contacts c
JOIN tenants t ON t.id = c.tenant_id
WHERE c.grupo IN ('Primaria 3ro B', 'Primaria 4to B');

-- Según lo que salga, elige UNA de las tres salidas y descoméntala.

-- Caso A — es un alumno real mal clasificado: reasignar al grupo correcto.
-- UPDATE contacts SET salon = 'A', grupo = 'Primaria 3ro A'
-- WHERE grupo = 'Primaria 3ro B';

-- Caso B — quedó de una importación equivocada: dar de baja (REVERSIBLE).
-- UPDATE contacts SET status = 'inactive', inactive_since = NOW()
-- WHERE grupo IN ('Primaria 3ro B', 'Primaria 4to B');

-- Caso C — borrado definitivo. IRREVERSIBLE, se lleva el historial del
-- contacto. Solo si ya lo confirmaste con el colegio.
-- DELETE FROM contacts
-- WHERE grupo IN ('Primaria 3ro B', 'Primaria 4to B');


-- ── 3. Casa de Niños: quitar el nombre de la guía ──────────────────────────
-- Los grupos traían pegada a la guía. Valores reales encontrados y su destino:
--   CN A ROSY  (19 contactos) → CNA
--   CN B SOFIA (22 contactos) → CNB
--   CN C BETY  (20 contactos) → CNC
--
-- Solo hace falta para lo YA importado: las importaciones nuevas toman el
-- nombre de la columna GRUPO del archivo ("CNA", "TI D").
--
-- Es un rename: no borra nada y es reversible.
UPDATE contacts SET grupo = 'CNA', salon = 'CNA' WHERE grupo = 'CN A ROSY';
UPDATE contacts SET grupo = 'CNB', salon = 'CNB' WHERE grupo = 'CN B SOFIA';
UPDATE contacts SET grupo = 'CNC', salon = 'CNC' WHERE grupo = 'CN C BETY';


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
