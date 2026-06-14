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

### PRs mergeados a main
- PR #4: CORS + tenant fix + Google OAuth login + CRM_ALLOWED_EMAILS
- PR #5: Tappt integration (fire-and-forget webhooks para follow-ups)
- PR #6: Mobile sticky save bar
- PR #7: Giro/Industria dropdown (Colegio, Condominio, Gimnasio, Academia, Estudio, Otro)
- PR #8: Industry tabs, pipeline ordering, `nuevo_registro` status, sort toggle, dashboard actualizado

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

### Pipeline de status
```
Nuevo registro → Prospecto → Contactado → Negociación → Cliente
                                                        ↘ Perdido / Inactivo
```
- Los imports masivos entran como `nuevo_registro`
- Se avanza a `prospecto` manualmente al hacer primer contacto real

### Features implementados en CRM
- Login con Google OAuth + email/password
- Lista de clientes con tabs por industria (Colegio, Condominio, etc.)
- Pipeline status bar clickeable con conteos
- Sort: Pipeline (por etapa + prioridad) / Reciente (updated_at DESC)
- Detalle de cliente: cambio de status sin entrar a modo editar
- Actividades rápidas (llamada, correo, reunión, WhatsApp, visita)
- Follow-ups con integración Tappt (WhatsApp reminders)
- Dashboard: pipeline 5 etapas, stat "Por contactar", próximos follow-ups

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
- Rotar Supabase service role key (fue compartida en chat en sesión anterior)
- Agregar `CRM_ALLOWED_EMAILS=asoria@tappt.lat` en Railway CRM NKUVO backend (si no está)
- Configurar vars Tappt cuando el equipo Tappt implemente su endpoint
- Subir más archivos de prospectos (gimnasios, academias, etc.) con el mismo flujo

## Flujo para importar nuevos prospectos
1. Recibir Excel → extraer con Python (openpyxl)
2. Generar SQL INSERT con `status='nuevo_registro'`, `giro=` el tipo correspondiente
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
```
