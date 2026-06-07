# SIRAH — Guía de Desarrollo

## Arquitectura

```
sirah/
├── backend/              ← Node.js + Express API
│   ├── index.js          ← Entry point, CORS, middleware
│   ├── db.js             ← Supabase client + fallback memoria
│   ├── scraper.js        ← Estimador valor + PJV + parser CSV
│   ├── middleware.js     ← Logger + error handler
│   └── routes/api.js     ← Endpoints REST
│
└── frontend/             ← React 18 + Vite
    └── src/
        ├── App.jsx            ← Root component
        ├── components/
        │   ├── Dashboard.jsx  ← Layout principal
        │   ├── UploadForm.jsx ← Upload CSV
        │   ├── ResultTable.jsx← Tabla resultados
        │   └── StatsCards.jsx ← KPI cards
        ├── hooks/useAPI.js    ← Llamadas HTTP
        ├── store/appStore.js  ← Estado global (Zustand)
        └── styles/sirah-theme.css ← Variables CSS
```

## Flujo de datos

```
Usuario sube CSV
    ↓
UploadForm → useAPI.procesarCartera()
    ↓
POST /api/procesar-cartera (multer)
    ↓
ParsearCSV() → array de expedientes
    ↓
EstimadorValorComercial.estimarValor() (por expediente)
    ↓
PJVQuery.buscarExpediente() (concurrente, máx 5)
    ↓
insertExpedientes() → Supabase o memoria
    ↓
Respuesta JSON → store.setExpedientes()
    ↓
ResultTable + StatsCards re-renderizan
```

## Agregar una nueva feature

### Nuevo endpoint backend

1. Añadir ruta en `backend/routes/api.js`
2. Si necesita acceso a BD, añadir función en `backend/db.js`
3. Documentar en README.md

### Nuevo componente frontend

1. Crear en `frontend/src/components/NombreComponente.jsx`
2. Usar inline styles con variables CSS (`var(--sirah-primary)`, etc.)
3. Consumir estado via `useAppStore()` y API via `useAPI()`
4. Importar en `Dashboard.jsx`

### Agregar zona al estimador

En `backend/scraper.js`, en el objeto `FACTORES`:

```js
'nombre-de-zona': 2.3,  // factor multiplicador
```

Convención: usar el nombre en minúsculas sin acentos para matching parcial.

## Troubleshooting

### Backend no inicia

```bash
# Verificar variables de entorno
cat backend/.env

# Verificar Node version
node --version   # debe ser >= 18

# Limpiar e instalar
rm -rf backend/node_modules && npm install --prefix backend
```

### "Tabla expedientes no encontrada"

Ejecutar el SQL de creación manualmente en Supabase → SQL Editor.
El backend seguirá funcionando con almacenamiento en memoria.

### CORS error en frontend

Verificar que `ALLOWED_ORIGINS` en `.env` incluye `http://localhost:5173`.
En desarrollo, el proxy de Vite (`/api → :3000`) evita CORS en el navegador.

### CSV no parsea correctamente

- Verificar que la columna identificadora se llame `numero_expediente`, `expediente` o `folio`
- Revisar el separador (coma, punto y coma, tab)
- Probar con `ejemplo-cartera-banco.csv` para confirmar que el servidor funciona

## Variables CSS (frontend)

Todas las variables están en `src/styles/sirah-theme.css`:

| Variable               | Valor      | Uso                      |
|------------------------|------------|--------------------------|
| `--sirah-primary`      | `#1a3a52`  | Botones, headers, bordes |
| `--sirah-accent`       | `#d97a3a`  | CTAs, énfasis, hover     |
| `--sirah-success`      | `#2ecc71`  | Éxito, rentabilidad+     |
| `--sirah-warning`      | `#e74c3c`  | Error, rentabilidad-     |
| `--font-display`       | JetBrains Mono | Títulos, código    |
| `--font-data`          | Courier New | Números, expedientes |

## Scripts útiles

```bash
# Backend dev con hot-reload
npm run dev --prefix sirah/backend

# Frontend dev
npm run dev --prefix sirah/frontend

# Build frontend para producción
npm run build --prefix sirah/frontend

# Ver logs de la API
curl http://localhost:3000/health
curl http://localhost:3000/api/estadisticas
```
