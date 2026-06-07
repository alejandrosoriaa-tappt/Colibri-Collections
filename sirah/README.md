# SIRAH — Sistema de Información de Remates y Activos Hipotecarios

Plataforma para procesar, valuar y analizar carteras de expedientes hipotecarios.
Diseñada para inversionistas que adquieren carteras de remate.

---

## Stack

| Capa       | Tecnología                              |
|------------|-----------------------------------------|
| Backend    | Node.js 18 + Express                    |
| Frontend   | React 18 + Vite + Zustand               |
| Base datos | Supabase (PostgreSQL)                   |
| Deploy     | Railway (backend) + Vercel (frontend)   |

---

## Setup local (5 minutos)

### Prerrequisitos

- Node.js ≥ 18
- npm ≥ 9

### 1. Backend

```bash
cd sirah/backend
npm install
cp .env.example .env      # Editar con tus credenciales Supabase
npm run dev               # Escucha en http://localhost:3000
```

### 2. Frontend

```bash
cd sirah/frontend
npm install
npm run dev               # Escucha en http://localhost:5173
```

### 3. Test rápido

1. Abre http://localhost:5173
2. Sube `ejemplo-cartera-banco.csv` (incluido en este repo)
3. Verifica la tabla de resultados con valores estimados

---

## Variables de entorno (backend)

| Variable          | Descripción                          | Requerido |
|-------------------|--------------------------------------|-----------|
| `SUPABASE_URL`    | URL de tu proyecto Supabase          | Sí*       |
| `SUPABASE_KEY`    | Anon key o service role key          | Sí*       |
| `PORT`            | Puerto del servidor (default: 3000)  | No        |
| `NODE_ENV`        | `development` o `production`         | No        |
| `ALLOWED_ORIGINS` | Orígenes CORS separados por coma     | No        |

> *Sin Supabase el sistema funciona con almacenamiento **en memoria** (los datos se pierden al reiniciar el servidor).

---

## API Reference

### `POST /api/procesar-cartera`

Procesa un CSV de cartera bancaria.

**Body:** `multipart/form-data` con campo `archivo` (CSV).

**Respuesta:**
```json
{
  "success": true,
  "total": 15,
  "expedientes": [...],
  "estadisticas": {
    "total": 15,
    "valor_total": 45000000,
    "promedio_rentabilidad": 38.2
  }
}
```

### `GET /api/expedientes`

Retorna todos los expedientes. Filtros opcionales: `?ubicacion=CDMX&banco=BBVA&status=...`

### `GET /api/expedientes/:id`

Detalle de un expediente específico.

### `GET /api/estadisticas`

Totales, promedios y distribución por banco / ubicación.

### `GET /api/health` — `GET /health`

Health check del servidor.

---

## Formato CSV aceptado

El parser acepta CSV con separador `,`, `;` o `\t`. Las comillas dobles son opcionales.

### Columnas

| Columna                | Alias aceptados                         | Tipo    |
|------------------------|-----------------------------------------|---------|
| `numero_expediente`    | expediente, folio, numero               | texto   |
| `banco`                | institucion, acreedor                   | texto   |
| `ubicacion`            | direccion, colonia, municipio, ciudad   | texto   |
| `valor_catastral`      | catastral, avaluo, valor_fiscal         | número  |
| `monto_adeudo`         | monto, deuda, saldo, credito            | número  |
| `fecha_inicio`         | fecha, fecha_apertura                   | fecha   |
| `status_juridico`      | status, estatus, etapa                  | texto   |
| `antiguedad_inmueble`  | antiguedad, anos                        | número  |
| `contacto`             | telefono, email, responsable            | texto   |
| `notas`                | observaciones, comentarios              | texto   |

---

## Estimación de valor comercial

SIRAH usa un modelo de factores de zona multiplicados sobre el valor catastral:

```
Valor estimado = Catastral × Factor_zona × (1 - Depreciación) × (1 ± Varianza_mercado)
```

- **Factor zona:** 1.4× (genérico) hasta 3.2× (Polanco, CDMX)
- **Depreciación:** 2 % anual, máximo 50 %
- **Varianza:** ±5 % aleatorio para reflejar condiciones de mercado

---

## Deploy

### Backend → Railway

1. Conecta este repo a Railway
2. Set root directory: `sirah/backend`
3. Variables: `SUPABASE_URL`, `SUPABASE_KEY`, `NODE_ENV=production`
4. Start command: `npm start`

### Frontend → Vercel

1. Set root directory: `sirah/frontend`
2. Framework: Vite
3. Variable: `VITE_API_URL=https://tu-backend.railway.app`
4. Actualiza `vite.config.js` proxy target con la URL de Railway

---

## Supabase — Crear tabla manualmente

Ejecuta en **Supabase Dashboard → SQL Editor**:

```sql
CREATE TABLE expedientes (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_expediente   TEXT        NOT NULL,
  banco               TEXT,
  ubicacion           TEXT,
  valor_catastral     NUMERIC,
  monto_adeudo        NUMERIC,
  fecha_inicio        DATE,
  status_juridico     TEXT,
  antiguedad_inmueble INTEGER,
  contacto            TEXT,
  notas               TEXT,
  valor_estimado      NUMERIC,
  rentabilidad        NUMERIC,
  factores            JSONB,
  status_pjv          TEXT,
  detalles_pjv        JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expedientes_banco      ON expedientes (banco);
CREATE INDEX idx_expedientes_ubicacion  ON expedientes (ubicacion);
CREATE INDEX idx_expedientes_status     ON expedientes (status_juridico);
```
