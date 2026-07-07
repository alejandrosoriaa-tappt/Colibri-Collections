# Kollybry — Documento Comercial Maestro
> Plataforma de comunicación masiva por WhatsApp para comunidades organizadas

---

## ¿Qué es Kollybry?

Kollybry es una plataforma SaaS que permite a colegios, condominios y gimnasios enviar comunicados, recordatorios de pago y avisos a toda su comunidad por **WhatsApp**, sin que los administradores necesiten un teléfono dedicado, sin grupos de WhatsApp caóticos, y sin que los destinatarios necesiten instalar ninguna app.

**Modelo de comunicación:** Outbound masivo → cada mensaje llega de forma personalizada al número personal del receptor.  
**Canal:** WhatsApp Business API (Meta) — el canal donde ya vive la vida diaria de sus usuarios.

---

## Por qué WhatsApp y no correo ni app nativa

| Métrica | WhatsApp | Correo electrónico | App nativa |
|---|---|---|---|
| Tasa de apertura | **95–98 %** | 20–30 % | 20–40 % |
| Tiempo al abrirlo | **< 3 minutos** | 6–12 horas | variable |
| Requiere descarga | No | No | **Sí** |
| Tasa de instalación de app | N/A | N/A | 20–40 % |
| Ya lo usa el receptor | **Sí, diario** | En ocasiones | Casi nunca |
| Sensación de spam | Baja (canal personal) | Alta (carpeta promo) | Alta (notificación ignorada) |

**Fuentes de benchmark:** Meta Business, Gartner Digital Markets, Klaviyo Email Benchmarks 2024, Liftoff Mobile Report 2024.

> WhatsApp tiene más de **100 millones de usuarios activos en México**. En Querétaro y ciudades del Bajío, es la aplicación de mensajería de facto de padres de familia, residentes y socios de gimnasio. No hay fricción de adopción porque el canal ya existe en su teléfono.

---

## Kollybry para Colegios

### El problema que resuelven hoy (sin Kollybry)

- Grupos de WhatsApp por salón → caos, respuestas fuera de tema, privacidad de maestros expuesta
- Correos que nadie abre o que caen en spam
- App propia del colegio → padres no la instalan o la desinstalan al mes
- Circulares en papel → pérdida garantizada, costo de impresión
- Llamadas para recordar pagos → tiempo del personal administrativo

### Cómo funciona Kollybry en un colegio

```
Administrador del colegio
        ↓
  Sube directorio Excel (una vez)
  AI Import detecta columnas, salones, familias automáticamente
        ↓
  Crea comunicado o campaña de cobranza
        ↓
  Kollybry envía mensaje personalizado a cada papá/mamá
  vía WhatsApp Business API
        ↓
  Papá recibe en su WhatsApp personal: "Hola María, recordatorio de pago de Colegio Las Américas..."
```

### Casos de uso — Colegios

#### Cobranza mensual (caso bandera)
- Administrador sube reporte de cuentas por cobrar (Excel con semáforo de colores o columna de estatus)
- Kollybry lee el color de cada celda: verde = al corriente, naranja = próximo a vencer, rojo = vencido
- Genera automáticamente 3 campañas (una por color) con mensaje personalizado: nombre del alumno, monto, concepto, link de pago
- Cada papá recibe el recordatorio exacto de su adeudo, no un mensaje genérico
- Template aprobado por Meta: `kollybry_recordatorio_pago` → funciona aunque el papá nunca haya escrito al colegio

**Reducción de fricción:**
- Sin el sistema: llamadas manuales, correos ignorados, deuda acumulada
- Con Kollybry: 3 clics → 300 mensajes enviados en 2 minutos → tasa de pago ~3x mayor vs correo

#### Comunicados generales
- Suspensión de clases, cambio de horario, evento escolar, emergencia
- Un mensaje, todos los padres lo reciben en < 3 minutos
- Segmentación por salón, grado o sección (Primaria, Secundaria, etc.)

#### Bienvenida a familias nuevas
- Al dar de alta a un alumno, Kollybry puede enviar automáticamente el mensaje de bienvenida con instrucciones del colegio

#### Confirmación de pago
- Cuando el pago es registrado: "Hemos recibido tu pago de $X por concepto de…" → reduce llamadas de "¿ya les llegó mi pago?"

### Diferenciadores vs la competencia — Colegios

| Funcionalidad | Kollybry | App de colegio | Correo masivo | WhatsApp manual |
|---|---|---|---|---|
| Cero instalación para papás | ✅ | ❌ | ✅ | ✅ |
| Mensajes personalizados por familia | ✅ | Parcial | Parcial | ❌ manual |
| Semáforo de cobranza con IA | ✅ | ❌ | ❌ | ❌ |
| Segmentación por salón/grado | ✅ | ✅ | Parcial | ❌ |
| Tasa de apertura >95% | ✅ | ❌ | ❌ | ✅ caótico |
| Privacidad del maestro (no expone celular) | ✅ | ✅ | ✅ | ❌ |
| Sin grupos de WhatsApp caóticos | ✅ | ✅ | ✅ | ❌ |
| AI Import de directorio Excel | ✅ | ❌ | ❌ | ❌ |

---

## Kollybry para Condominios

### El problema que resuelven hoy (sin Kollybry)

- Grupo de WhatsApp del condominio: quejas, peleas, mensajes fuera de tema, privacidad de administrador
- Correos que el residente nunca abre
- Volantes físicos bajo la puerta → ignorados, costo, ineficiente
- Sin forma de saber quién recibió el aviso de cuota de mantenimiento

### Cómo funciona en un condominio

```
Administrador o mesa directiva
        ↓
  Sube padrón de residentes (Excel o captura manual)
  Una entrada por unidad (departamento/casa)
        ↓
  Redacta comunicado o genera campaña de cuotas
        ↓
  Cada residente recibe mensaje personalizado en WhatsApp
  "Hola Juan, tu cuota de mantenimiento de Residencial Bosques de junio es de $X..."
```

### Casos de uso — Condominios

#### Cobro de cuota de mantenimiento
- Mismo flujo que cobranza escolar: sube reporte, Kollybry detecta quién debe, quién pagó
- Mensaje personalizado por unidad (o por familia propietaria)
- Link de pago incluido (SPEI, tarjeta, CoDi)

#### Avisos urgentes
- Corte de agua, falla en elevador, suspensión de luz, visita de fumigación
- Mensaje masivo en segundos → todos los residentes enterados antes de llegar a casa

#### Convocatoria a asamblea
- "Hola [nombre], te convocamos a la Asamblea Ordinaria del [fecha] en el salón de usos múltiples"
- Recordatorio automático 24h antes

#### Comunicados de seguridad
- Alerta de incidente, instrucciones al personal de vigilancia, comunicado a residentes

#### Bienvenida a nuevos residentes
- Al dar de alta una unidad: mensaje automático con reglamento, contactos de emergencia, link de pago

### Diferenciadores vs la competencia — Condominios

| Funcionalidad | Kollybry | Grupo WhatsApp | App de condominios | Correo |
|---|---|---|---|---|
| Sin caos de respuestas en grupo | ✅ | ❌ | ✅ | ✅ |
| Sin instalar app | ✅ | ✅ | ❌ | ✅ |
| Cobro personalizado por unidad | ✅ | ❌ | Parcial | Parcial |
| Avisos urgentes en < 3 min | ✅ | ✅ caótico | Parcial | ❌ |
| Privacidad del administrador | ✅ | ❌ | ✅ | ✅ |
| Tasa de apertura >95% | ✅ | ✅ | ❌ | ❌ |
| Semáforo de morosidad con IA | ✅ | ❌ | ❌ | ❌ |

---

## Kollybry para Gimnasios

### El problema que resuelven hoy (sin Kollybry)

- Mensajes manuales por WhatsApp desde el celular del dueño → no escala, se mezcla con lo personal
- Correos con bajo open rate → miembros no se enteran de eventos o cambios de horario
- Membresías vencidas no cobradas → pérdida de ingresos
- Sin canal para vender pases adicionales o promociones de forma masiva

### Cómo funciona en un gimnasio

```
Dueño / recepcionista
        ↓
  Sube lista de socios (Excel o CRM)
  Segmentados por tipo de membresía, fecha de vencimiento, etc.
        ↓
  Crea campaña de renovación o comunicado
        ↓
  Cada socio recibe mensaje personalizado
  "Hola Carlos, tu membresía en Iron Gym vence el [fecha]. Renueva hoy con 10% de descuento: [link]"
```

### Casos de uso — Gimnasios

#### Renovación de membresía
- 7 días antes del vencimiento: recordatorio con link de pago
- Día del vencimiento: segundo recordatorio
- 3 días después: aviso de suspensión y oferta de recuperación

#### Comunicados operativos
- Cierre por mantenimiento, cambio de horarios, nuevo instructor, clase especial
- Todos los socios enterados en minutos

#### Campañas de reactivación
- Socios que llevan 30+ días sin asistir: "Te extrañamos, vuelve esta semana y obtén una clase gratis"
- Segmentado por tipo de membresía o fecha de última visita

#### Lanzamiento de servicios
- Nuevo servicio, nuevo horario, nueva clase grupal → campaña masiva a todos los socios
- Con imagen adjunta (template `komunikado_imagen`) para mayor impacto visual

#### Inscripciones y eventos
- Torneo interno, evento especial, reto de 21 días → invitación masiva con formulario o link de registro

### Diferenciadores vs la competencia — Gimnasios

| Funcionalidad | Kollybry | CRM de gym (Mindbody, etc.) | Correo | WhatsApp manual |
|---|---|---|---|---|
| Cero fricción para el socio | ✅ | ❌ app | ✅ | ✅ |
| Personalización por nombre/membresía | ✅ | ✅ caro | Parcial | ❌ escala |
| Cobranza automatizada con semáforo | ✅ | Parcial | ❌ | ❌ |
| Tasa de apertura >95% | ✅ | ❌ push 20% | ❌ | ✅ |
| Costo de implementación | Bajo | Alto ($$$) | Bajo | Cero pero caótico |
| Segmentación por tipo de membresía | ✅ | ✅ | Parcial | ❌ |
| Sin instalar app para el socio | ✅ | ❌ | ✅ | ✅ |

---

## Propuesta de valor central (para todas las verticales)

> **"El mensaje llega donde la gente ya está, en menos de 3 minutos, personalizado, sin que tengan que instalar nada."**

### Los 5 pilares de Kollybry

1. **Canal correcto** — WhatsApp es el canal de mayor apertura del mundo. No es nuevo para el receptor, no requiere onboarding.

2. **Personalización real** — Cada mensaje incluye el nombre, el monto, el concepto específico de esa familia/unidad/socio. No es un blast genérico.

3. **Cero fricción operativa** — El administrador sube un Excel, la IA interpreta columnas y salones, Kollybry crea las campañas. No requiere conocimientos técnicos.

4. **Templates aprobados por Meta** — Los mensajes llegan aunque el receptor nunca haya escrito al número. Colegios, condominios y gimnasios son comunicación outbound — Kollybry está diseñado exactamente para eso.

5. **Memoria institucional** — Una vez que el tenant configura sus mensajes de cobranza, Kollybry los recuerda para el siguiente mes. El proceso se vuelve 1 clic.

---

## Arquitectura y Stack Técnico

### Infraestructura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Railway (cloud)                           │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │  Dashboard SaaS  │    │      Backend API (Node.js)        │   │
│  │  React + Vite    │◄──►│      Express + Supabase           │   │
│  │  Tailwind CSS    │    │      Pool → Railway PostgreSQL    │   │
│  └──────────────────┘    └──────────────────────────────────┘   │
│                                    │                             │
└────────────────────────────────────│─────────────────────────────┘
                                     │
                    ┌────────────────▼──────────────────┐
                    │         Supabase                   │
                    │  Auth (JWT) · DB principal         │
                    │  tenants, contacts, campaigns,     │
                    │  invoices, messages, broadcasts    │
                    └────────────────┬──────────────────┘
                                     │
                    ┌────────────────▼──────────────────┐
                    │    Meta WhatsApp Business API      │
                    │  Templates aprobados (UTILITY +    │
                    │  MARKETING) · Webhooks entrantes   │
                    └───────────────────────────────────┘
```

### Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js 20, Express, ESM modules |
| Base de datos principal | Supabase PostgreSQL (tenants, contactos, campañas) |
| Base de datos CRM | Railway PostgreSQL (NKUVO CRM — separado) |
| Auth | Supabase Auth — JWT, Google OAuth, email/password |
| Mensajería | Meta WhatsApp Business API (WABA 948092824711194) |
| IA — Mapeo de columnas | Anthropic Claude Sonnet 4.6 (`claude-sonnet-4-6`) |
| IA — CRM NKUVO | Anthropic Claude Sonnet 4.6 |
| Pagos / SPEI | Conekta (integración CLABE por familia) |
| Deploy | Railway (backend + frontend) |
| Storage / Webhooks | Supabase Storage + Edge Functions |
| Tiempo real | Socket.IO (actualizaciones de mensajes en vivo) |

### Modelo de multi-tenancy

- Cada colegio/condominio/gimnasio es un **tenant** con su UUID
- Todos los datos están aislados por `tenant_id`
- El administrador del tenant solo ve sus contactos, campañas y mensajes
- Un mismo número de WhatsApp Business puede atender múltiples tenants (enrutamiento por `tenant_id` en webhook)

### Templates Meta registrados (WABA Kollybry)

| Template | Categoría | Uso |
|---|---|---|
| `kollybry_bienvenida_credenciales` | UTILITY | Onboarding del administrador |
| `kollybry_bienvenida_comunidad` | UTILITY | Primera bienvenida al contacto |
| `kollybry_comunicado_util` | UTILITY | Comunicados generales (sin límite de frecuencia) |
| `kollybry_comunicado` | MARKETING | Comunicados con contenido promocional |
| `kollybry_comunicado_imagen` | MARKETING | Comunicado con imagen adjunta |
| `kollybry_recordatorio_pago` | UTILITY | Recordatorio de pago con link |
| `kollybry_aviso_vencido` | UTILITY | Aviso de pago vencido |
| `kollybry_confirmacion_pago` | UTILITY | Confirmación de pago recibido |
| `kollybry_recordatorio_spei` | UTILITY | Recordatorio con CLABE SPEI |

> Los templates UTILITY no están sujetos al límite de frecuencia de marketing de Meta → siempre llegan, nunca se bloquean por "demasiados mensajes de marketing".

### Flujo de cobranza con IA

```
1. Admin sube Excel (.xlsx)
2. exceljs lee colores de celda (ARGB → verde/naranja/rojo)
   + Claude detecta columnas (alumno, monto, estatus)
3. Kollybry normaliza nombres de alumnos → busca en contactos del tenant
4. Resuelve nombre_familia → trae papás con teléfono
5. Agrupa por color/estatus → preview con sumatorias
6. Admin configura nombre + concepto + mensaje por color
7. Kollybry guarda config en cobranza_color_templates (memoria del tenant)
8. Al confirmar: crea campañas en borrador + invoices por destinatario
9. Admin activa → sendWhatsAppTemplate a cada papá/residente/socio
```

### Flujo de AI Import de directorio

```
1. Admin sube Excel multi-hoja (.xlsx)
2. Claude recibe 3 hojas de muestra (8 filas c/u)
   → detecta columna nombre, apellido, teléfono, grado, salón
3. Código infiere sección desde nombre de la hoja (inferSeccion)
   → Casa de Niños, Taller I/II, Primaria, Secundaria, etc.
4. Hojas INGRESO*, BAJAS, EGRESADOS, GRADUADOS → saltadas automáticamente
5. Por cada fila: crea contacto + vincula siblings (nombre_familia)
6. Resultado: directorio completo importado con jerarquía familiar
```

---

## Modelo de negocio (referencia interna)

- **SaaS por tenant** — pago mensual/anual según volumen de contactos o mensajes
- **Sin costo por instalar**: el receptor no paga, no instala, no hace nada
- **Costo de mensajes Meta**: incluido en el plan o pass-through (Meta cobra por conversación iniciada por negocio)
- **Add-on SPEI**: para colegios que quieren CLABE individual por familia (integración Conekta)
- **Add-on IA**: análisis de cobranza con semáforo de Excel (requiere `ANTHROPIC_API_KEY`)

---

## Objeciones frecuentes y respuestas

**"Ya tenemos un grupo de WhatsApp con los papás"**
> Los grupos de WhatsApp mezclan mensajes de padres, quejas, noticias irrelevantes y exponen el celular del maestro. Kollybry envía solo mensajes institucionales, de forma unidireccional, con el nombre del colegio como remitente — sin ruido, sin pérdida de privacidad.

**"Usamos correo electrónico"**
> La tasa de apertura de correo es 20–30% y puede tardar 6–12 horas. WhatsApp tiene 95–98% de apertura en < 3 minutos. Para avisos urgentes o cobros vencidos, el correo no basta.

**"¿Los papás tienen que instalar algo?"**
> No. Reciben el mensaje en su WhatsApp personal, el que ya usan todos los días. Cero fricción de adopción.

**"¿Qué pasa si alguien responde?"**
> Kollybry es una plataforma de comunicación outbound. Los mensajes van del colegio/condominio/gym a su comunidad. Si alguien responde, la respuesta llega a la bandeja de WhatsApp Business del administrador — igual que hoy con cualquier número de WA Business.

**"¿Es legal enviar mensajes masivos por WhatsApp?"**
> Sí, siempre que se usen templates aprobados por Meta y el receptor haya dado consentimiento (implícito al ser alumno/residente/socio activo). Kollybry usa exclusivamente la API oficial de WhatsApp Business de Meta.

---

*Documento interno — Nkuvo Labs / Kollybry — Actualizado Jun 2026*
