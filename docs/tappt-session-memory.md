# Tappt Backend — Memoria de Sesión
> Pega este archivo completo al inicio de una nueva sesión en `tappt-backend` para retomar sin re-explicar contexto.

## Repo y acceso
- **Repo:** `alejandrosoriaa-tappt/tappt-backend`
- **Branch de trabajo activo:** confirmar con `git branch` al iniciar
- **Deploy:** Railway (confirmar URL del servicio al iniciar)

## Arquitectura general de Tappt
- Backend Node.js/Express en Railway
- WhatsApp Business API (Meta) para envío de mensajes
- Supabase compartido con Colibri-Collections (proyecto Tappt)
- Auth: Supabase JWT — `req.user.id` = tenant_id
- **Usuario de Alejandro:** `asoria@tappt.lat` / UUID `b05f6fb3-e389-4943-a61e-87c189d0ccb5`

## Módulo en progreso: Tappt Business
> Sesión anterior: "Tappt New", ~14 junio 2026 (archivada)

### Qué es Tappt Business
Add-on/tier de pago para funcionalidades avanzadas de negocio. *(Completar con detalle al reanudar)*

### Estado al archivar la sesión
- **Completado:** *(listar aquí lo que ya estaba hecho)*
- **En progreso / pendiente:** *(listar aquí lo que quedó a medias)*
- **Bloqueadores conocidos:** *(listar si los hay)*

## Integración CRM → Tappt (ya implementada en el CRM)
El CRM NKUVO (`colibri-collections/backend`) ya envía eventos HTTP a Tappt para follow-ups:

**Endpoint que Tappt debe exponer:**
```
POST /api/integrations/crm/followups
Authorization: Bearer {TAPPT_API_KEY}
```

**Eventos:**
- `followup.created` — agendar recordatorio WhatsApp para `notify_to` en `fecha_recordatorio`
- `followup.cancelled` — cancelar recordatorio con ese `followup_id`

Spec completa en: `colibri-collections/docs/tappt-crm-integration.md`

**Variables que el CRM espera (Railway "CRM NKUVO"):**
| Variable | Descripción |
|---|---|
| `TAPPT_API_URL` | URL base del backend Tappt |
| `TAPPT_API_KEY` | API key compartida (generar con `openssl rand -hex 32`) |
| `TAPPT_NOTIFY_PHONE` | WhatsApp de Alejandro `521XXXXXXXXXX` |

## Cómo retomar eficientemente

Al abrir la nueva sesión, pega este archivo y agrega al final:

```
Continúa donde quedamos. Revisa los últimos 10 commits del branch activo 
y el diff pendiente, luego dime en 5 líneas qué había en progreso antes de continuar.
```

Esto hace que Claude reconstruya el contexto desde el código real en vez de desde la memoria, evitando alucinaciones y ahorrando tokens en el intercambio inicial.

## Comandos útiles al iniciar sesión
```bash
# Ver en qué branch estamos y últimos commits
git log --oneline -10

# Ver cambios sin commitear
git status && git diff --stat

# Ver variables de entorno disponibles (sin mostrar valores)
printenv | grep -E "TAPPT|SUPABASE|DATABASE|META|RAILWAY" | cut -d= -f1
```
