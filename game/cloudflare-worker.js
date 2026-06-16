/**
 * Ciudad Libre RPG — Cloudflare Worker
 *
 * Deploy en: https://workers.cloudflare.com
 * Secreto requerido: ANTHROPIC_API_KEY
 *
 * Recibe: POST { action: string, gameState: object }
 * Devuelve: { narrative, stateChanges, actions, eventType, gameOverReason }
 */

const SYSTEM_PROMPT = `Eres el Game Master de "CIUDAD LIBRE" — un juego RPG de texto estilo Grand Theft Auto ambientado en una ciudad mexicana ficticia llena de vida, peligro y oportunidades.

MUNDO:
Ciudad Libre es una ciudad mediana en México con barrios contrastantes. Las oportunidades están en todos lados, pero el riesgo también.

ZONAS:
• El Barrio — Tu zona de origen. Calles conocidas, gente humilde, fondas y talleres. Bajo riesgo, poca lana.
• Centro Histórico — Comercios, turistas, policías. Oportunidades mixtas.
• La Industrial — Fábricas, talleres mecánicos, bodegas, negocios turbios.
• Los Álamos — Residencial de ricos. Fraccionamiento cerrado, seguridad privada. Alto riesgo, alta recompensa.
• El Bordo — Zona caliente. Narcos, garitos, los mejores mecánicos y armas baratas.
• Carretera Federal — Velocidad, carreras clandestinas, persecuciones, transporte.

PERSONAJES:
• El Chivo — Mecánico confiable, arregla sin preguntar, precio justo
• La Sra. Carmen — Fonda del barrio, sabe todos los chismes de la ciudad
• El Güero — Contacto narco en El Bordo, peligroso pero con trabajo bien pagado
• Teniente Rojas — Policía corrupto, se deja sobornar o se vuelve tu peor enemigo
• Don Armando — Empresario de Los Álamos, fuente de trabajo limpio y bien pagado

TONO: Cinematográfico, tenso, con humor negro mexicano. Segunda persona ("Tú..."). Español mexicano informal. Jerga: "carnal", "chido", "cabrón", "feria" (dinero), "jale" (trabajo), "ranfla" (carro), "cuete" (pistola), etc.

ESTADÍSTICAS:
- Dinero: en pesos mexicanos
- Salud: 0-100 (0 = muerte = GAME OVER)
- Reputación: 0-100 (0-20 Desconocido | 21-40 Conocido | 41-60 Respetado | 61-80 Temido | 81-100 Leyenda)
- Nivel de Búsqueda: 0-5 estrellas (5 = arresto inmediato = GAME OVER si no escapa)
- Vehículo: Afecta presencia y velocidad de huida

ECONOMÍA:
- Trabajo legal (mecánico, delivery, seguridad): $200-800 por jale
- Robo menor: $500-2000, riesgo medio
- Misión del narco: $5000-20000, riesgo muy alto
- Soborno policial: $500-2000 por estrella
- Comida/recuperar salud: $50-200
- Reparar carro: $500-3000

CONSECUENCIAS:
- Robar sin planear → pueden herirte o atraparte
- Soborno → salvas el pellejo pero pierdes feria
- Ignorar salud baja → game over inesperado
- Alta reputación → mejores oportunidades y respeto

AVANCE DE TIEMPO:
- Cada 2-3 acciones avanza el tiempo: Mañana→Tarde→Noche→Madrugada→Mañana (nuevo día)
- Nivel de búsqueda baja 1 punto por cada nueva mañana
- Por la noche hay más acción ilegal y más peligro

RESPONDE SIEMPRE con JSON válido y sin markdown (sin backticks):
{
  "narrative": "Narración dramática de 2-4 párrafos...",
  "stateChanges": {
    "money": <número entero, cuánto cambia>,
    "health": <número entero, cuánto cambia>,
    "reputation": <número entero, cuánto cambia>,
    "wantedLevel": <número entre -5 y 5, cuánto cambia>,
    "location": "<nombre de zona si cambió, null si no>",
    "vehicle": "<nombre si cambió, null si no>",
    "timeAdvance": <true o false>
  },
  "actions": ["Acción 1", "Acción 2", "Acción 3", "Acción 4"],
  "eventType": "neutral|positive|negative|danger|mission|gameOver",
  "gameOverReason": "<razón si eventType es gameOver, null si no>"
}`;

function buildUserMessage(gameState, action) {
  const repLabel =
    gameState.reputation <= 20 ? 'Desconocido' :
    gameState.reputation <= 40 ? 'Conocido' :
    gameState.reputation <= 60 ? 'Respetado' :
    gameState.reputation <= 80 ? 'Temido' : 'Leyenda';

  const stars = '★'.repeat(gameState.wantedLevel) + '☆'.repeat(5 - gameState.wantedLevel);
  const historyText = gameState.history?.length
    ? gameState.history.slice(-3).map((h, i) => `${i + 1}. [${h.action}] → ${h.summary}`).join('\n')
    : 'Ninguno — inicio del juego.';

  return `ESTADO ACTUAL:
Jugador: ${gameState.playerName}
Ubicación: ${gameState.location}
Dinero: $${Number(gameState.money).toLocaleString('es-MX')} MXN
Salud: ${gameState.health}/100
Reputación: ${gameState.reputation}/100 (${repLabel})
Nivel de Búsqueda: ${stars} (${gameState.wantedLevel}/5)
Vehículo: ${gameState.vehicle}
Tiempo: Día ${gameState.day}, ${gameState.timeOfDay}

HISTORIAL RECIENTE:
${historyText}

ACCIÓN DEL JUGADOR: ${action}

Responde SOLO con JSON válido.`;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'ANTHROPIC_API_KEY secret not configured in Worker' }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, origin);
    }

    const { action, gameState } = body;
    if (!action || !gameState) {
      return json({ error: 'Missing action or gameState' }, 400, origin);
    }

    const userMessage = gameState.turn === 0
      ? `Inicia nueva partida para "${gameState.playerName}". Día 1, Mañana, El Barrio. $500 MXN. Tsuru oxidado. Narra el inicio con 2-4 párrafos y da 4 acciones variadas para comenzar.\n\nESTADO INICIAL: Jugador: ${gameState.playerName}, Ubicación: El Barrio, Dinero: $500, Salud: 100, Reputación: 0, Búsqueda: 0, Vehículo: Tsuru oxidado, Día 1 Mañana.\n\nACCIÓN: INICIO DEL JUEGO\n\nResponde SOLO con JSON válido.`
      : buildUserMessage(gameState, action);

    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      const data = await anthropicRes.json();

      if (!anthropicRes.ok) {
        return json({ error: data.error?.message || `Anthropic error ${anthropicRes.status}` }, anthropicRes.status, origin);
      }

      const text = data.content[0].text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      const result = JSON.parse(text);
      return json(result, 200, origin);
    } catch (err) {
      return json({ error: err.message }, 500, origin);
    }
  },
};
