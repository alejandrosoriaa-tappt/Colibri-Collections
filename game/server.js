import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
• El Guero — Contacto narco en El Bordo, peligroso pero con trabajo bien pagado
• Teniente Rojas — Policía corrupto, se deja sobornar o se vuelve tu peor enemigo
• Don Armando — Empresario de Los Álamos, fuente de trabajo limpio y bien pagado

TONO: Cinematográfico, tenso, con humor negro mexicano. Segunda persona ("Tú..."). Español mexicano informal. Jerga: "carnal", "chido", "cabrón", "feria" (dinero), "jale" (trabajo), "ranfla" (carro), "cuete" (pistola), etc.

ESTADÍSTICAS DEL JUGADOR:
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
- Armas: $2000-15000

CONSECUENCIAS:
- Robar sin planear → pueden herirte o atraparse
- Soborno → salvas el pellejo pero pierdes feria
- Ignorar salud baja → game over inesperado
- Alta reputación → mejores oportunidades y respeto
- Nivel búsqueda alto + no huir → arresto

AVANCE DE TIEMPO:
- Cada 2-3 acciones avanza el tiempo: Mañana→Tarde→Noche→Madrugada→Mañana (nuevo día)
- Nivel de búsqueda baja 1 punto por cada transición de tiempo (la policía se distrae)
- Por la noche hay más acción ilegal y más peligro

RESPONDE SIEMPRE con JSON válido y sin markdown (sin backticks, sin bloques de código), exactamente en este formato:
{
  "narrative": "Narración dramática de 2-4 párrafos vívidos y cinematográficos...",
  "stateChanges": {
    "money": <número entero, cuánto cambia (positivo o negativo)>,
    "health": <número entero, cuánto cambia>,
    "reputation": <número entero, cuánto cambia>,
    "wantedLevel": <número entero entre -5 y 5, cuánto cambia>,
    "location": "<nombre de zona si cambió, null si no cambió>",
    "vehicle": "<nombre de vehículo si cambió, null si no cambió>",
    "timeAdvance": <true si avanza el tiempo del día, false si no>
  },
  "actions": ["Acción contextual 1", "Acción contextual 2", "Acción contextual 3", "Acción contextual 4"],
  "eventType": "neutral|positive|negative|danger|mission|gameOver",
  "gameOverReason": "<razón breve si eventType es gameOver, null en cualquier otro caso>"
}`;

function buildUserMessage(gameState, playerAction) {
  const repLabel =
    gameState.reputation <= 20 ? 'Desconocido' :
    gameState.reputation <= 40 ? 'Conocido' :
    gameState.reputation <= 60 ? 'Respetado' :
    gameState.reputation <= 80 ? 'Temido' : 'Leyenda';

  const stars = '★'.repeat(gameState.wantedLevel) + '☆'.repeat(5 - gameState.wantedLevel);

  const historyText = gameState.history.length > 0
    ? gameState.history.slice(-3).map((h, i) => `${i + 1}. [${h.action}] → ${h.summary}`).join('\n')
    : 'Ninguno — es el inicio del juego.';

  return `ESTADO ACTUAL:
Jugador: ${gameState.playerName}
Ubicación: ${gameState.location}
Dinero: $${gameState.money.toLocaleString('es-MX')} MXN
Salud: ${gameState.health}/100
Reputación: ${gameState.reputation}/100 (${repLabel})
Nivel de Búsqueda: ${stars} (${gameState.wantedLevel}/5)
Vehículo: ${gameState.vehicle}
Tiempo: Día ${gameState.day}, ${gameState.timeOfDay}
Turno: ${gameState.turn}

HISTORIAL RECIENTE:
${historyText}

ACCIÓN DEL JUGADOR: ${playerAction}

Recuerda: responde SOLO con JSON válido, sin texto adicional.`;
}

app.post('/api/game/action', async (req, res) => {
  const { gameState, action } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurado. Crea un archivo .env con tu API key.' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildUserMessage(gameState, action) }
      ]
    });

    const text = response.content[0].text.trim();
    const jsonText = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/game/start', async (req, res) => {
  const { playerName } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurado.' });
  }

  const startMessage = `Inicia una nueva partida para el jugador "${playerName}".

ESTADO INICIAL:
Jugador: ${playerName}
Ubicación: El Barrio
Dinero: $500 MXN
Salud: 100/100
Reputación: 0/100 (Desconocido)
Nivel de Búsqueda: ☆☆☆☆☆ (0/5)
Vehículo: Tsuru oxidado
Tiempo: Día 1, Mañana
Turno: 0

Narra la escena de inicio: ${playerName} se despierta en su cuarto del Barrio, con $500 en la bolsa y un Tsuru oxidado en la calle. Es su primer día tratando de hacerla en Ciudad Libre. Describe el ambiente del barrio, el estado del Tsuru, el estado de su cuarto, y establece el tono de aventura.

Ofrece 4 acciones iniciales interesantes y variadas para comenzar.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: startMessage }
      ]
    });

    const text = response.content[0].text.trim();
    const jsonText = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🌆 CIUDAD LIBRE — Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📝 API disponible en http://localhost:${PORT}/api/game/action`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('\n⚠️  ADVERTENCIA: ANTHROPIC_API_KEY no encontrada. Crea un archivo .env\n');
  }
});
