# Colibrí 360 — Life360 con WhatsApp como canal

> Documento de concepto. Nombre "Colibrí 360" es de trabajo.
> Estado: idea inicial, nada implementado todavía.

## La idea en una frase

Una app de ubicación familiar tipo Life360, pero donde **nadie tiene que abrir la app
para enterarse**: las alertas llegan al WhatsApp de quien le importa, y desde la app
puedes disparar mensajes de WhatsApp al círculo.

## Por qué WhatsApp cambia el producto (y no es un simple "canal más")

Life360 pierde a la mitad de la familia en el onboarding: hay que instalar app,
crear cuenta, aceptar permisos y —lo peor— **mantener las notificaciones activas**.
En México eso no pasa: la abuela no instala Life360, pero contesta WhatsApp.

De ahí sale la asimetría que define el producto:

| Rol | Necesita la app | Recibe por WhatsApp |
|-----|-----------------|---------------------|
| **Portador** (hijo, adolescente, empleado) | Sí — la app manda ubicación en background | Opcional |
| **Observador** (mamá, papá, abuela, tíos) | No | Sí — todo llega al chat |

Un solo instalador (el papá que arma el círculo) + el portador con app.
Todos los demás entran con solo dar su número. Ese es el gancho comercial.

## Funcionalidades, mapeadas desde Life360

### Fase 1 — MVP (lo que hace que la idea exista)

| Life360 | Colibrí 360 | Cómo llega por WhatsApp |
|---------|-------------|-------------------------|
| Mapa en vivo del círculo | Igual, en la app | `¿dónde está Sofía?` → responde con pin de ubicación |
| Llegadas y salidas de lugares | Geocercas ("Casa", "Escuela", "Oficina") | Alerta automática: *"Sofía llegó a Escuela · 7:42 am"* |
| Alertas de batería baja | Igual | *"El teléfono de Sofía está al 8%"* |
| Botón de pánico / SOS | Igual | Mensaje inmediato a **todo** el círculo con ubicación + link de mapa |
| Historial de ubicación | 7 días en el MVP | `historial Sofía hoy` → resumen de lugares y horas |
| Check-in manual | "Ya llegué" desde la app | Mensaje al círculo con el pin |

### Fase 2 — Lo que engancha

- **Mensajería del círculo desde la app**: escribes una vez en la app y sale a los
  WhatsApp de todos los miembros. Esta es literalmente la segunda mitad de tu idea:
  *"desde la app piden enviar msjs de WhatsApp"*.
- **Comandos entrantes**: el observador responde en el chat y el bot contesta
  (`dónde están todos`, `batería`, `silencio 2h`).
- **Preferencias por persona**: la abuela solo recibe llegadas a casa; la mamá recibe todo.
- **ETA en vivo**: *"Sofía va camino a Casa, llega en ~12 min"*.
- **Alertas de velocidad** al ir en coche.

### Fase 3 — Lo que se cobra caro

- Detección de accidente (heurística de acelerómetro + confirmación).
- Asistencia en carretera / botón de emergencia con operador.
- Círculos no familiares: **flotillas y equipos de campo** — mismo motor, cliente que paga.
- Integración con Kollybry: el colegio ve que el alumno llegó (esto vende la app a
  toda una escuela de golpe, no a una familia a la vez).

## Arquitectura

```
┌────────────────────┐
│  App móvil (Expo)  │  el portador — ubicación en background
│  React Native      │  el organizador — mapa, círculo, mandar mensajes
└─────────┬──────────┘
          │ POST /api/360/ping  (lote de posiciones, cada 30-60s)
          ▼
┌──────────────────────────────────────────────┐
│  backend/ (Express, ya existe)               │
│  ├── routes/app360.js      ← nuevo           │
│  ├── services/geofence.js  ← nuevo           │
│  ├── services/whatsapp.js  ← YA EXISTE       │
│  ├── utils/phone.js        ← YA EXISTE       │
│  └── routes/webhooks.js    ← extender        │
└─────────┬────────────────────────────┬───────┘
          │                            │
          ▼                            ▼
  Railway Postgres            WhatsApp Cloud API (Meta)
  (mismo pool railwayPg.js)   (WABA ya configurada)
```

**Lo que ya está resuelto en el repo** y no hay que volver a construir:

- `backend/src/services/whatsapp.js` — envío de texto y de plantillas, con
  remitente por tenant (`resolverRemitente`). Un círculo grande puede tener su propio número.
- `backend/src/routes/webhooks.js` — verificación de Meta y recepción de mensajes
  entrantes ya montada; ahí se enganchan los comandos.
- `backend/src/utils/phone.js` — normalización a E.164 con los formatos mexicanos reales.
- `backend/src/services/railwayPg.js` — pool de Postgres.
- `backend/src/services/scheduler.js` — node-cron, para barridos de batería y resúmenes diarios.

**Lo que NO se puede reutilizar:** la app tiene que ser **nativa**. Una web app no
puede mandar ubicación con la pantalla apagada; el navegador mata el proceso.
Se necesita Expo con `expo-location` en modo background task (`startLocationUpdatesAsync`)
y los permisos "Always" de iOS/Android. Esto es un proyecto nuevo (`mobile/`), no
una pantalla más en `dashboard/`.

## Modelo de datos (propuesta)

```sql
-- Círculo: la familia, la flotilla, el equipo
CREATE TABLE t360_circles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL,              -- supabase user del organizador
  nombre        TEXT NOT NULL,
  waba_phone_id TEXT,                       -- número propio; null = compartido
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Miembro: puede ser portador, observador o ambos
CREATE TABLE t360_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id    UUID NOT NULL REFERENCES t360_circles(id) ON DELETE CASCADE,
  user_id      UUID,                        -- null si es observador puro (solo WhatsApp)
  nombre       TEXT NOT NULL,
  telefono     TEXT NOT NULL,               -- E.164, normalizado con phone.js
  es_portador  BOOLEAN DEFAULT false,       -- ¿su teléfono manda ubicación?
  es_observador BOOLEAN DEFAULT true,       -- ¿recibe alertas por WhatsApp?
  consent_at   TIMESTAMPTZ,                 -- CLAVE: sin esto no se rastrea
  opt_out_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (circle_id, telefono)
);

-- Última posición conocida (una fila por miembro, se sobrescribe)
CREATE TABLE t360_positions (
  member_id  UUID PRIMARY KEY REFERENCES t360_members(id) ON DELETE CASCADE,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  precision_m INTEGER,
  bateria    SMALLINT,
  movimiento TEXT,                          -- quieto | caminando | vehiculo
  ts         TIMESTAMPTZ NOT NULL
);

-- Historial (particionado por mes cuando crezca; retención 7-30 días según plan)
CREATE TABLE t360_position_log (
  id         BIGSERIAL PRIMARY KEY,
  member_id  UUID NOT NULL REFERENCES t360_members(id) ON DELETE CASCADE,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  bateria    SMALLINT,
  ts         TIMESTAMPTZ NOT NULL
);
CREATE INDEX ON t360_position_log (member_id, ts DESC);

-- Geocercas
CREATE TABLE t360_places (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES t360_circles(id) ON DELETE CASCADE,
  nombre    TEXT NOT NULL,                  -- "Casa", "Escuela"
  lat       DOUBLE PRECISION NOT NULL,
  lng       DOUBLE PRECISION NOT NULL,
  radio_m   INTEGER NOT NULL DEFAULT 150,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Estado dentro/fuera, para no repetir alertas en cada ping
CREATE TABLE t360_place_state (
  member_id UUID NOT NULL REFERENCES t360_members(id) ON DELETE CASCADE,
  place_id  UUID NOT NULL REFERENCES t360_places(id) ON DELETE CASCADE,
  dentro    BOOLEAN NOT NULL,
  desde     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (member_id, place_id)
);

-- Eventos generados (llegada, salida, batería, SOS) y su entrega por WhatsApp
CREATE TABLE t360_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id  UUID NOT NULL REFERENCES t360_circles(id) ON DELETE CASCADE,
  member_id  UUID REFERENCES t360_members(id) ON DELETE SET NULL,
  tipo       TEXT NOT NULL,                 -- llegada|salida|bateria|sos|checkin|mensaje
  payload    JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quién recibe qué
CREATE TABLE t360_alert_prefs (
  member_id  UUID NOT NULL REFERENCES t360_members(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL,
  sobre_member_id UUID REFERENCES t360_members(id) ON DELETE CASCADE, -- null = todos
  activo     BOOLEAN DEFAULT true,
  PRIMARY KEY (member_id, tipo, sobre_member_id)
);
```

## API (propuesta)

```
POST   /api/360/circles                    crear círculo
POST   /api/360/circles/:id/members        invitar (manda WhatsApp de consentimiento)
POST   /api/360/ping                       lote de posiciones desde la app  ← el caliente
GET    /api/360/circles/:id/live           posiciones actuales del círculo
POST   /api/360/circles/:id/places         crear geocerca
POST   /api/360/circles/:id/message        ← "desde la app mandar WhatsApp al círculo"
POST   /api/360/sos                        pánico: dispara a todos, sin filtros
GET    /api/360/members/:id/history?d=1    historial
PATCH  /api/360/members/:id/prefs          qué alertas quiere
```

`POST /api/360/ping` es el endpoint que define los costos: si 1,000 portadores mandan
cada 60s son ~1.4M requests/día. Mitigación desde el día uno: la app **acumula en el
teléfono y manda en lote cada 3-5 min**, y sube la frecuencia solo si detecta movimiento.

## Las tres restricciones reales (léelas antes de invertir)

### 1. La ventana de 24 horas de WhatsApp

Fuera de una conversación abierta, Meta solo permite enviar **plantillas aprobadas**.
Una alerta de "Sofía llegó a la escuela" es proactiva → es plantilla, categoría *utility*,
y se aprueba una sola vez con variables.

```
Plantilla: alerta_llegada_360
"🏫 {{1}} llegó a {{2}} a las {{3}}.
Ver en el mapa: {{4}}"
```

Implicación de costo: las plantillas *utility* se cobran por mensaje salvo que caigan
dentro de una ventana de servicio abierta. Un círculo activo puede generar 6-10 alertas
diarias por portador. **Hay que modelar esto antes de poner precio** — es el gasto
variable que puede comerse el margen. Verificar tarifas vigentes de México en el
pricing de Meta, que las han cambiado varias veces.

Palanca de diseño para bajarlo: **agrupar**. En vez de una alerta por evento, un
resumen ("Sofía: escuela 7:42 → salió 14:10 → casa 14:35") y alertas inmediatas solo
para lo que de verdad urge (SOS, batería crítica, salida de zona a deshoras).

### 2. Consentimiento — esto no es opcional

Rastrear la ubicación de una persona y mandarla a terceros por WhatsApp es tratamiento
de datos personales sensibles bajo la LFPDPPP, y además choca con las políticas de Meta
si el destinatario no dio opt-in.

Reglas duras del producto:
- Todo miembro observador da opt-in **en WhatsApp** antes del primer mensaje
  (por eso `consent_at` en el modelo). Sin eso, no se manda nada.
- Todo portador ve en su teléfono, siempre, quién puede ver su ubicación.
- Menores de edad: consentimiento del tutor, y el adolescente debe **ver** que está
  siendo ubicado. Life360 se ha ganado mucha prensa mala por esto; no lo repitas.
- Rastreo encubierto: no se soporta, y hay que decirlo en el copy. Es la diferencia
  entre una app familiar y una app de acoso.

### 3. La app tiene que ser nativa

No hay atajo web. Expo + `expo-location` background, permiso "Always", y el trámite
de justificación ante App Store / Play Store por uso de ubicación en segundo plano
(les toma días y rechazan si la justificación es floja). Presupuesta esa fricción.

## Modelo de negocio (borrador)

| Plan | Precio/mes | Qué incluye |
|------|-----------|-------------|
| Gratis | $0 | 1 círculo, 3 miembros, 2 geocercas, resumen diario (1 msj) |
| Familiar | ~$99 MXN | 8 miembros, geocercas ilimitadas, alertas en vivo, historial 30 días |
| Flotilla | por unidad | Círculos de trabajo, reportes, panel web |

El plan gratis se limita **por mensajes de WhatsApp**, no por features: es exactamente
donde está tu costo marginal.

## Por dónde empezar (orden sugerido)

1. **Prueba de humo, sin app** (1-2 días): endpoint `/api/360/ping` + geocercas +
   alerta por WhatsApp, alimentado con curl simulando posiciones. Comprueba que el
   flujo completo funciona con la WABA que ya tienes.
2. **Plantilla aprobada** en Meta: mándala a revisión de inmediato, tarda.
3. **App Expo mínima**: login, un botón "compartir ubicación", background task.
4. **Círculo real**: tu familia durante dos semanas. Aquí es donde se ve si las
   alertas ayudan o se vuelven ruido — esa es la única pregunta que importa.
5. Solo entonces: onboarding, planes, cobro.

El paso 1 se puede construir sobre este repo tal cual está.
