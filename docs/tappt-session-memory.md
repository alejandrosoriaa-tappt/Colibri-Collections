# Tappt Backend — Memoria de Sesión
> Pega este archivo completo al inicio de una nueva sesión en `tappt-backend` para retomar sin re-explicar contexto.

## Repo y acceso
- **Repo:** `alejandrosoriaa-tappt/tappt-backend`
- **El dashboard de Tappt Business está dentro de este mismo repo** (no es repo separado)
- **Branch de trabajo activo:** confirmar con `git branch` al iniciar
- **Deploy:** Railway (confirmar URL del servicio al iniciar)

## Arquitectura general de Tappt
- Backend Node.js/Express en Railway
- WhatsApp Business API (Meta) para envío y recepción de mensajes
- Supabase compartido con Colibri-Collections (proyecto Tappt)
- Auth: Supabase JWT — `req.user.id` = tenant_id
- **Usuario de Alejandro:** `asoria@tappt.lat` / UUID `b05f6fb3-e389-4943-a61e-87c189d0ccb5`

---

## Ecosistema de productos Tappt

Todos los tiers usan el mismo motor: **100% WhatsApp, sin app, sin web, sin humanos del otro lado.**

| Tier | Para quién | Core |
|------|-----------|------|
| **Tappt** | Persona individual | Agenda y recordatorios personales |
| **Tappt Pro** | Profesionistas independientes (plomero, carpintero, lavacoches…) | Citas con clientes, recordatorios de trabajos |
| **Tappt Team** | Equipos pequeños | Agenda compartida, coordinación por WhatsApp |
| **Tappt Family** | Familias | Calendario familiar, recordatorios para todos |
| **Tappt Business** | Negocios de servicios (ver abajo) | SaaS completo de agendamiento autónomo |

---

## Tappt Business — Definición del producto

### Qué es
SaaS construido sobre el motor de Tappt dirigido a **negocios de servicios por cita**: doctores, clínicas, barberías, spas, estéticas.

Permite que el **cliente final agende, pague, confirme, cambie y reprograme su cita — todo por WhatsApp, sin ningún humano del lado del negocio.**

### Flujo completo (only WhatsApp)
1. **Cliente escribe al WhatsApp del negocio**
2. El bot de Tappt Business responde, muestra disponibilidad y servicios
3. **Cliente agenda** — elige fecha, hora y servicio
4. **Cliente prepaga** — integración de pagos dentro del chat
5. **Confirmación automática** — el cliente recibe su resumen de cita
6. **Recordatorio** — Tappt le avisa N horas antes
7. **Si el cliente quiere cambiar** — puede reagendar o cancelar por WhatsApp sin llamar
8. **Follow-up post-cita** — Tappt le escribe después (reseña, próxima cita, promoción)

### Propuesta de valor
> *"Tu negocio llena su agenda solo, cobra por adelantado y nunca pierde una cita — sin contratar recepcionista, sin app, solo WhatsApp."*

### Segmento objetivo
- Barberías / peluquerías
- Spas y estéticas
- Consultorios (médicos, dentistas, psicólogos)
- Clínicas pequeñas
- Nail studios, lash bars, masajistas

### Diferenciadores clave
- Sin app que descargar (el cliente ya tiene WhatsApp)
- Sin humano gestionando la agenda
- Prepago elimina no-shows
- El negocio lo configura una vez y funciona solo

---

## Módulo Tappt Business — Estado de desarrollo
> Última sesión activa: "Tappt New", ~14 junio 2026 (archivada en Mac)
> Última actualización de este archivo: 13 julio 2026

### Estado confirmado al 13 julio 2026
- **Completado:**
  - Dashboard de Tappt Business con **tema claro (light colors)** implementado ✅
  - **Acceso demo/fake** funcionando — permite ver el producto sin login real ✅
- **Próximo a implementar (sesión siguiente):**
  - Integración **MercadoPago** para generación de links de cobro dentro del flujo de agendamiento
    - OAuth para conectar cuenta MP del negocio
    - Llamada a API MP para crear link de pago al confirmar cita
    - Webhook de MP para confirmar pago → confirmar cita → notificar cliente
- **Bloqueadores conocidos:** ninguno

---

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

---

## Cómo retomar eficientemente

Al abrir la nueva sesión en `tappt-backend`, pega este archivo y agrega:

```
Continúa donde quedamos con Tappt Business. 
Revisa los últimos 15 commits y el diff pendiente, 
luego dime en 5 líneas qué había en progreso antes de continuar.
```

## Comandos útiles al iniciar sesión
```bash
git log --oneline -15
git status && git diff --stat
printenv | grep -E "TAPPT|SUPABASE|DATABASE|META|RAILWAY" | cut -d= -f1
```
