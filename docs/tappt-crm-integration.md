# Integración NKUVO CRM → Tappt (recordatorios de follow-up por WhatsApp)

> **Instrucciones:** copia este documento completo y pégaselo a Claude en la sesión
> del proyecto Tappt. Contiene todo lo que necesita para implementar su lado.

## Contexto

El NKUVO CRM (CRM personal de Alejandro Soria, repo `Colibri-Collections`, carpeta
`backend/`) ya envía eventos HTTP a Tappt cada vez que se crea, completa o elimina
un follow-up (recordatorio de seguimiento de un cliente).

Tappt debe:

1. **Al recibir `followup.created`**: enviar de inmediato un WhatsApp al número
   `notify_to` confirmando que el recordatorio quedó agendado. Ejemplo:
   > 🗓️ *NKUVO CRM*: Se agendó un follow-up para **{cliente.razon_social}**
   > el **{fecha_recordatorio formateada}**: "{descripcion}". Te lo recordaré
   > por aquí cuando llegue el momento.
2. **Guardar el recordatorio** y, cuando llegue `fecha_recordatorio`, enviar el
   recordatorio por WhatsApp al mismo número:
   > ⏰ *NKUVO CRM*: Es momento de dar seguimiento a **{cliente.razon_social}**:
   > "{descripcion}". Tel. del cliente: {cliente.telefono}
3. **Al recibir `followup.cancelled`**: cancelar el recordatorio pendiente con ese
   `followup_id` (el usuario lo completó o lo eliminó antes de la fecha).

## Endpoint que Tappt debe exponer

```
POST /api/integrations/crm/followups
```

### Autenticación

Header `Authorization: Bearer {TAPPT_API_KEY}` — una API key compartida.
Generar una key segura (ej. `openssl rand -hex 32`), guardarla como variable de
entorno en Tappt y dársela a Alejandro para configurarla también en el CRM
(variable `TAPPT_API_KEY` en Railway, servicio "CRM NKUVO").

Rechazar con `401` cualquier petición sin la key correcta.
El CRM también envía el header `X-Source: nkuvo-crm` (informativo).

### Payload — evento `followup.created`

```json
{
  "event": "followup.created",
  "followup_id": "b3f1c2e4-...uuid del followup en el CRM",
  "descripcion": "Llamar para presentar propuesta",
  "fecha_recordatorio": "2026-06-20T10:00:00.000Z",
  "notify_to": "5215512345678",
  "cliente": {
    "id": "uuid",
    "razon_social": "Colegio de la Mora",
    "nombre_contacto": "María Pérez",
    "telefono": "+52 55 1234 5678"
  }
}
```

- `fecha_recordatorio` viene en ISO 8601 (UTC). Convertir a hora de México para
  los mensajes.
- `notify_to` es el WhatsApp del dueño del CRM (Alejandro), no el del cliente.
- Los campos de `cliente` pueden venir `null` excepto `razon_social`.

### Payload — evento `followup.cancelled`

```json
{
  "event": "followup.cancelled",
  "followup_id": "b3f1c2e4-..."
}
```

Si no existe un recordatorio con ese ID, responder `200` igualmente (idempotente).

### Respuestas esperadas

- `200`/`201` — procesado correctamente
- `401` — API key inválida
- Cualquier error de Tappt **no afecta al CRM** (el CRM hace fire-and-forget),
  pero loguear los fallos para depurar.

## Sugerencia de implementación en Tappt

- Tabla `crm_reminders`: `followup_id (unique)`, `notify_to`, `mensaje`,
  `fecha_envio`, `enviado boolean`, `cancelado boolean`.
- Un cron (cada minuto o cada 5) que busque recordatorios con
  `fecha_envio <= NOW() AND enviado = false AND cancelado = false`,
  envíe el WhatsApp con la infraestructura existente de Tappt y marque `enviado`.
- Reutilizar el sender de WhatsApp que Tappt ya tiene para sus mensajes normales.

## Variables que el CRM ya espera (lado CRM, Railway "CRM NKUVO")

| Variable | Valor |
|---|---|
| `TAPPT_API_URL` | URL base del backend de Tappt (ej. `https://api.tappt.lat`) |
| `TAPPT_API_KEY` | la API key compartida generada por Tappt |
| `TAPPT_NOTIFY_PHONE` | WhatsApp de Alejandro en formato `521XXXXXXXXXX` |

Cuando termines, dile a Alejandro la URL exacta del endpoint y la API key para
configurar estas variables en el CRM.
