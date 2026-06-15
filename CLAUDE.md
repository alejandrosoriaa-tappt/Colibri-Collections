# Colibri-Collections — Contexto para Claude

## Arquitectura general

Monorepo con tres proyectos independientes:

| Carpeta | Proyecto | Dominio | Infra |
|---------|----------|---------|-------|
| `backend/` | API compartida (Kollybry + CRM) | — | Railway "zestful-embrace" servicio CRM NKUVO |
| `dashboard/` | Kollybry SaaS (escuelas/condos) | — | Railway "Colibri" |
| `crm/` | NKUVO CRM (personal de Alejandro) | crm.nkuvo.com | Railway "zestful-embrace" servicio Colibri-Collections |

- **Auth**: Supabase (proyecto compartido con Tappt). JWT validado en backend. `tenant_id = req.user.id`.
- **CRM data**: Railway PostgreSQL propio (NO Supabase DB). Pool en `backend/src/services/railwayPg.js`.
- **CRM access guard**: `CRM_ALLOWED_EMAILS` env var restringe acceso.
- **Supabase user de Alejandro**: `asoria@tappt.lat` / `b05f6fb3-e389-4943-a61e-87c189d0ccb5`

## NKUVO CRM — Estado actual (Jun 2026)

### Commits mergeados a main (esta sesión, Jun 15 2026)
- PR #8 (sesión anterior): Industry tabs, pipeline ordering, `nuevo_registro` status, sort toggle, dashboard actualizado
- Quick filters + relative time en tarjetas → luego refactorizado a sistema más simple
- Fix race condition en `setFilter` (doble llamada pisaba la primera)
- Simplificación total de filtros: 3 capas independientes + barra "Filtrando por:"
- Filtros status y prioridad mutuamente excluyentes al hacer click
- Chips de filtro con alto contraste: sólido+blanco cuando activo, ghost cuando inactivo
- Botones Pipeline/Reciente con fondo `bg-crm-primary` cuando activo
- Chips de status en detalle de cliente: mismo estilo alto contraste + spinner + sin requerir modo editar
- Fix texto invisible en chips de detalle (era `text-white/80` sobre fondo claro)

### Base de datos (Railway Postgres — zestful-embrace)
Tablas: `crm_clients`, `crm_activities`, `crm_followups`

**Migración aplicada** (`crm_001_nuevo_registro_status.sql`):
```sql
ALTER TABLE crm_clients DROP CONSTRAINT IF EXISTS crm_clients_status_check;
ALTER TABLE crm_clients ADD CONSTRAINT crm_clients_status_check
  CHECK (status IN ('nuevo_registro','prospecto','contactado','negociacion','cliente','perdido','inactivo'));
ALTER TABLE crm_clients ALTER COLUMN status SET DEFAULT 'nuevo_registro';
```

**Datos importados**:
- 35 colegios particulares Querétaro (giro=Colegio, status=nuevo_registro)
- 21 administradoras/asociaciones de condominios Querétaro (giro=Condominio, status=nuevo_registro)
- Total: ~58 registros
- Nota: clientes creados manualmente pueden tener giro no estándar (ej. "Educacion" en vez de "Colegio") — corregir desde la pantalla de edición

### Pipeline de status
```
Nuevo registro → Prospecto → Contactado → Negociación → Cliente
                                                        ↘ Perdido / Inactivo
```
- Los imports masivos entran como `nuevo_registro`
- Se avanza manualmente haciendo click en el chip de status en la pantalla de detalle (sin necesidad de entrar a modo Editar)

### Sistema de filtros en CrmClientsPage.jsx (estado final)
Tres capas independientes que combinan con AND:
1. **Tabs de industria** — Todos / Colegio / Condominio / Gimnasio / Academia / Estudio / Otro (con conteos)
2. **Chips de status** — Nuevo registro / Prospecto / Contactado… (con conteos según tab activo). Al hacer click se limpia la prioridad.
3. **Búsqueda + Prioridad + Sort** — dentro de una card. Al hacer click en prioridad se limpia el status.

Barra "Filtrando por:" aparece solo cuando hay filtros activos. Cada tag tiene su propio ✕ para quitarlo individualmente.

Chips activos: fondo sólido saturado + texto blanco + ✓
Chips inactivos: ghost/outline + texto gris

### Features implementados en CRM
- Login con Google OAuth + email/password
- Lista de clientes con tabs por industria (Colegio, Condominio, etc.)
- Status bar clickeable con conteos (filtro limpia prioridad y viceversa)
- Sort: Pipeline (por etapa + prioridad) / Reciente (updated_at DESC)
- Tiempo relativo en cada tarjeta ("Hace 2 días", "Ayer", etc.)
- Barra "Filtrando por:" con tags individuales removibles
- Detalle de cliente: cambio de status con un click (sin modo editar), spinner de carga
- Actividades rápidas (llamada, correo, reunión, WhatsApp, visita)
- Follow-ups con integración Tappt (WhatsApp reminders)
- Dashboard: pipeline 5 etapas, stat "Por contactar", próximos follow-ups

### Supabase service role key
La key anterior fue rotada en esta sesión. La nueva está en Supabase → Settings → API → Secret keys.
Actualizar `SUPABASE_SERVICE_ROLE_KEY` en Railway backend (zestful-embrace) con la nueva key.

### Integración Tappt (pendiente activar)
Archivo: `backend/src/services/tappt.js`
Endpoint Tappt a implementar: `POST /api/integrations/crm/followups`
Doc: `docs/tappt-crm-integration.md`

Variables a configurar en Railway (CRM NKUVO backend) cuando Tappt esté listo:
- `TAPPT_API_URL` — URL base del backend Tappt
- `TAPPT_API_KEY` — API key compartida
- `TAPPT_NOTIFY_PHONE` — WhatsApp de Alejandro en formato `521XXXXXXXXXX`

### Variables de entorno Railway (zestful-embrace — Colibri-Collections frontend)
- `VITE_API_BASE_URL=https://crm-nkuvo-production.up.railway.app`
- `VITE_SUPABASE_URL` — proyecto Supabase compartido
- `VITE_SUPABASE_ANON_KEY` — anon key del mismo proyecto

### Pendientes
- Actualizar `SUPABASE_SERVICE_ROLE_KEY` en Railway backend con la nueva key rotada
- Verificar `CRM_ALLOWED_EMAILS=asoria@tappt.lat` en Railway CRM NKUVO backend
- Configurar vars Tappt cuando el equipo Tappt implemente su endpoint
- Subir más archivos de prospectos (gimnasios, academias, estudios) con el mismo flujo
- Corregir giro de clientes creados manualmente que tengan valores no estándar (ej. "Educacion" → "Colegio")

## Flujo para importar nuevos prospectos
1. Recibir Excel → extraer con Python (openpyxl)
2. Generar SQL INSERT con `status='nuevo_registro'`, `giro=` el tipo correspondiente (debe ser exactamente: Colegio, Condominio, Gimnasio, Academia, Estudio u Otro)
3. En Railway Console: `psql $DATABASE_URL` → pegar SQL
4. Los registros aparecen en el tab correspondiente ordenados por prioridad

## Comandos útiles
```bash
# Conectar a la DB de Railway (desde la consola del servicio Postgres)
psql $DATABASE_URL

# Ver todos los clientes por status
SELECT status, count(*) FROM crm_clients GROUP BY status;

# Ver distribución por giro
SELECT giro, status, count(*) FROM crm_clients GROUP BY giro, status ORDER BY giro, status;

# Corregir giros no estándar
UPDATE crm_clients SET giro = 'Colegio' WHERE giro = 'Educacion';
```
