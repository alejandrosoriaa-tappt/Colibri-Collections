# Kollybry — Database Migrations

Migrations run in filename order. Each runs once.

## Aplicar migraciones

**Automático (recomendado):**
```bash
node -r dotenv/config scripts/run-migrations.js
```

**Manual (si el script falla):**
Copia y pega el contenido del archivo `.sql` en el SQL Editor de Supabase.

---

## Historial

| # | Archivo | Qué hace | Estado |
|---|---------|----------|--------|
| 001 | `001_add_nombre_alumno.sql` | Agrega columna `nombre_alumno` a `contacts` | ✅ Aplicada |
| 002 | `002_add_sheets_url.sql` | Agrega `sheets_url` a `campaigns` para importación desde Google Sheets | ✅ Aplicada |
| 003 | `003_add_extra_data.sql` | Agrega `extra_data JSONB` a `contacts` para campos específicos por org type | ✅ Aplicada |
| 004 | `004_add_whatsapp_confirmed_at.sql` | Agrega `whatsapp_confirmed_at` a `tenants` para rastrear confirmación de onboarding | ✅ Aplicada |

---

## Cómo agregar una nueva migración

1. Crea el archivo: `005_descripcion_corta.sql`
2. Escribe SQL idempotente (usa `IF NOT EXISTS`, `IF EXISTS`)
3. Corre el script o pégalo en Supabase
4. Actualiza este README

## Conexión a producción

- **URL**: ver `SUPABASE_URL` en Railway
- **Service Role Key**: ver `SUPABASE_SERVICE_ROLE_KEY` en Railway
- **Dashboard**: https://supabase.com → proyecto `jklqukssyxbfzefwpgaw`
