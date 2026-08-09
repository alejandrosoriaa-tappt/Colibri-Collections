import { createClient } from '@supabase/supabase-js'

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Railway inyecta estas variables en todos sus despliegues. Sirven para
// detectar producción de forma confiable: NODE_ENV no vale aquí porque el
// servicio corre con NODE_ENV=development (se ve en los logs de arranque).
const EN_SERVIDOR = !!(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID)

// El bypass salta la autenticación por completo: sin él, cualquiera que
// llegue al API sin token entraría como el tenant configurado y podría leer
// el padrón entero (alumnos, papás, teléfonos). Solo se permite fuera del
// servidor.
export const bypassPermitido = !!process.env.DEV_BYPASS_TENANT_ID && !EN_SERVIDOR

if (process.env.DEV_BYPASS_TENANT_ID && EN_SERVIDOR) {
  console.error(
    '\n🚨 DEV_BYPASS_TENANT_ID está configurada en un despliegue de Railway y fue IGNORADA.\n' +
    '   Esa variable desactiva la autenticación. Bórrala de las variables del servicio.\n'
  )
}

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    const bypassTenantId = bypassPermitido ? process.env.DEV_BYPASS_TENANT_ID : null

    // Dev bypass: solo en local, nunca en un despliegue
    if (bypassTenantId && (!authHeader || authHeader === 'Bearer ')) {
      req.user = { id: 'dev-bypass', email: 'dev@colibri.local' }
      req.devBypassTenantId = bypassTenantId
      return next()
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.split(' ')[1]

    const { data: { user }, error } = await supabaseAnon.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = user
    req.token = token
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}
