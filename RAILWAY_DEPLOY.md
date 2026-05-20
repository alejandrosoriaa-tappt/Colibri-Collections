# Despliegue en Railway

## Pasos para publicar Colibrí Collections

### 1. Crear cuenta en Railway
Ve a https://railway.app y crea tu cuenta (puedes conectar con GitHub).

### 2. Subir el código a GitHub
Si aún no tienes el repo en GitHub:
```bash
cd /Users/alejandrosoria/colibri-collections
git remote add origin https://github.com/TU_USUARIO/colibri-collections.git
git push -u origin main
```

### 3. Crear dos servicios en Railway

En railway.app → New Project → Deploy from GitHub repo → elige `colibri-collections`

Railway detectará los dos `railway.toml` automáticamente. Crea un servicio para cada carpeta:

**Servicio 1 — Backend**
- Root directory: `backend`
- Variables de entorno a configurar:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Tu URL de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu service role key de Supabase |
| `SUPABASE_ANON_KEY` | Tu anon key de Supabase |
| `WABA_PHONE_NUMBER_ID` | ID del número de WhatsApp Business |
| `WABA_ACCESS_TOKEN` | Token de Meta Cloud API |
| `META_WEBHOOK_VERIFY_TOKEN` | Token que tú defines para el webhook |
| `FRONTEND_URL` | URL del dashboard (la obtienes después de crear el servicio 2) |
| `COLIBRI_INTERNAL_TENANT_ID` | `e0f963f2-becb-46ab-9bad-84f7fc1d171e` |

**Servicio 2 — Dashboard**
- Root directory: `dashboard`
- Variables de entorno a configurar:

| Variable | Valor |
|---|---|
| `VITE_API_BASE_URL` | URL del backend (la obtienes del servicio 1, ej. `https://colibri-backend.up.railway.app`) |
| `VITE_SUPABASE_URL` | Tu URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Tu anon key de Supabase |

### 4. Obtener las URLs de Railway

Después del deploy, Railway asigna dominios automáticamente:
- Backend: `https://NOMBRE-backend.up.railway.app`
- Dashboard: `https://NOMBRE-dashboard.up.railway.app`

Puedes cambiarlos a un dominio personalizado en Settings → Domains.

### 5. Configurar dominio personalizado (opcional)

En Railway → tu servicio → Settings → Domains → Add Custom Domain
- Ejemplo: `app.colibricollections.mx` para el dashboard
- Ejemplo: `api.colibricollections.mx` para el backend

Railway te dará un registro CNAME para agregar en tu DNS.

### 6. Actualizar FRONTEND_URL en el backend

Una vez tengas la URL del dashboard, actualiza la variable `FRONTEND_URL` del servicio backend en Railway.

---

## Acceso local (Mac Mini)

Para seguir usando localmente mientras configuras Railway:

```bash
# Terminal 1 — Backend
cd /Users/alejandrosoria/colibri-collections/backend
npm run dev

# Terminal 2 — Dashboard  
cd /Users/alejandrosoria/colibri-collections/dashboard
npm run dev
```

Dashboard local: http://localhost:5173
