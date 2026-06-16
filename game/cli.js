#!/usr/bin/env node
import readline from 'readline';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
  gold: '\x1b[38;5;220m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgBlack: '\x1b[40m',
  bgDark: '\x1b[48;5;232m',
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres el Game Master de "CIUDAD LIBRE" — un juego RPG de texto estilo Grand Theft Auto ambientado en una ciudad mexicana ficticia.

ZONAS: El Barrio | Centro Histórico | La Industrial | Los Álamos | El Bordo | Carretera Federal

PERSONAJES: El Chivo (mecánico) | La Sra. Carmen (fonda/chismes) | El Guero (narco) | Teniente Rojas (policía corrupto) | Don Armando (empresario)

TONO: Cinematográfico, español mexicano informal, segunda persona, jerga callejera.

ESTADÍSTICAS: Dinero (MXN), Salud (0-100), Reputación (0-100), Nivel Búsqueda (0-5 estrellas), Vehículo

ECONOMÍA: Trabajo legal $200-800 | Robo $500-2000 | Misión narco $5000-20000 | Soborno $500-2000/estrella

Responde SOLO con JSON válido (sin markdown):
{
  "narrative": "2-4 párrafos dramáticos...",
  "stateChanges": {
    "money": <delta>,
    "health": <delta>,
    "reputation": <delta>,
    "wantedLevel": <delta -5 a 5>,
    "location": "<nueva zona o null>",
    "vehicle": "<nuevo vehículo o null>",
    "timeAdvance": <true/false>
  },
  "actions": ["Acción 1", "Acción 2", "Acción 3", "Acción 4"],
  "eventType": "neutral|positive|negative|danger|mission|gameOver",
  "gameOverReason": "<razón o null>"
}`;

let gameState = {
  playerName: '',
  location: 'El Barrio',
  money: 500,
  health: 100,
  reputation: 0,
  wantedLevel: 0,
  day: 1,
  timeOfDay: 'Mañana',
  vehicle: 'Tsuru oxidado',
  history: [],
  turn: 0,
};

let currentActions = [];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

function clearScreen() {
  process.stdout.write('\x1Bc');
}

function printTitle() {
  console.log(`${c.gold}${c.bold}`);
  console.log('  ██████╗██╗██╗   ██╗██████╗  █████╗ ██████╗     ██╗     ██╗██████╗ ██████╗ ███████╗');
  console.log(' ██╔════╝██║██║   ██║██╔══██╗██╔══██╗██╔══██╗    ██║     ██║██╔══██╗██╔══██╗██╔════╝');
  console.log(' ██║     ██║██║   ██║██║  ██║███████║██║  ██║    ██║     ██║██████╔╝██████╔╝█████╗  ');
  console.log(' ██║     ██║██║   ██║██║  ██║██╔══██║██║  ██║    ██║     ██║██╔══██╗██╔══██╗██╔══╝  ');
  console.log(' ╚██████╗██║╚██████╔╝██████╔╝██║  ██║██████╔╝    ███████╗██║██████╔╝██║  ██║███████╗');
  console.log('  ╚═════╝╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝     ╚══════╝╚═╝╚═════╝ ╚═╝  ╚═╝╚══════╝');
  console.log(`${c.reset}`);
}

function printStats() {
  const repLabel =
    gameState.reputation <= 20 ? 'Desconocido' :
    gameState.reputation <= 40 ? 'Conocido' :
    gameState.reputation <= 60 ? 'Respetado' :
    gameState.reputation <= 80 ? 'Temido' : 'Leyenda';

  const stars = '★'.repeat(gameState.wantedLevel) + '☆'.repeat(5 - gameState.wantedLevel);
  const healthBar = '█'.repeat(Math.floor(gameState.health / 10)) + '░'.repeat(10 - Math.floor(gameState.health / 10));
  const healthColor = gameState.health > 50 ? c.green : gameState.health > 25 ? c.yellow : c.red;

  console.log(`${c.bgDark}${c.bold}${'─'.repeat(70)}${c.reset}`);
  console.log(
    `${c.gold}📍 ${gameState.location.padEnd(20)}${c.reset}` +
    `${c.cyan}📅 Día ${gameState.day} — ${gameState.timeOfDay}${c.reset}`
  );
  console.log(`${c.bgDark}${'─'.repeat(70)}${c.reset}`);
  console.log(
    `${c.green}💰 $${gameState.money.toLocaleString('es-MX').padEnd(12)}${c.reset}` +
    `${healthColor}❤️  ${healthBar} ${gameState.health}%${c.reset}`
  );
  console.log(
    `${c.blue}⭐ Rep: ${gameState.reputation}/100 (${repLabel})${c.reset}`.padEnd(45) +
    `${c.red}🔴 Búsqueda: ${stars}${c.reset}`
  );
  console.log(`${c.yellow}🚗 ${gameState.vehicle}${c.reset}`);
  console.log(`${c.bgDark}${'─'.repeat(70)}${c.reset}`);
}

async function callAI(userMessage) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }]
  });

  const text = response.content[0].text.trim();
  const jsonText = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonText);
}

function buildMessage(action) {
  const repLabel =
    gameState.reputation <= 20 ? 'Desconocido' :
    gameState.reputation <= 40 ? 'Conocido' :
    gameState.reputation <= 60 ? 'Respetado' :
    gameState.reputation <= 80 ? 'Temido' : 'Leyenda';

  const stars = '★'.repeat(gameState.wantedLevel) + '☆'.repeat(5 - gameState.wantedLevel);
  const historyText = gameState.history.length > 0
    ? gameState.history.slice(-3).map((h, i) => `${i + 1}. [${h.action}] → ${h.summary}`).join('\n')
    : 'Ninguno — inicio del juego.';

  return `ESTADO ACTUAL:
Jugador: ${gameState.playerName}
Ubicación: ${gameState.location}
Dinero: $${gameState.money.toLocaleString('es-MX')} MXN
Salud: ${gameState.health}/100
Reputación: ${gameState.reputation}/100 (${repLabel})
Nivel de Búsqueda: ${stars} (${gameState.wantedLevel}/5)
Vehículo: ${gameState.vehicle}
Tiempo: Día ${gameState.day}, ${gameState.timeOfDay}

HISTORIAL:
${historyText}

ACCIÓN: ${action}

Responde SOLO con JSON válido.`;
}

function applyStateChanges(changes) {
  if (changes.money) gameState.money = Math.max(0, gameState.money + changes.money);
  if (changes.health) gameState.health = Math.min(100, Math.max(0, gameState.health + changes.health));
  if (changes.reputation) gameState.reputation = Math.min(100, Math.max(0, gameState.reputation + changes.reputation));
  if (changes.wantedLevel) gameState.wantedLevel = Math.min(5, Math.max(0, gameState.wantedLevel + changes.wantedLevel));
  if (changes.location) gameState.location = changes.location;
  if (changes.vehicle) gameState.vehicle = changes.vehicle;

  if (changes.timeAdvance) {
    const times = ['Mañana', 'Tarde', 'Noche', 'Madrugada'];
    const idx = times.indexOf(gameState.timeOfDay);
    if (idx === times.length - 1) {
      gameState.timeOfDay = 'Mañana';
      gameState.day++;
      if (gameState.wantedLevel > 0) gameState.wantedLevel--;
    } else {
      gameState.timeOfDay = times[idx + 1];
    }
  }
}

function printNarrative(text) {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  for (const p of paragraphs) {
    const words = p.trim().split(' ');
    let line = '';
    console.log();
    for (const word of words) {
      if (line.length + word.length + 1 > 68) {
        console.log(`  ${c.white}${line}${c.reset}`);
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) console.log(`  ${c.white}${line}${c.reset}`);
  }
  console.log();
}

function printActions(actions) {
  console.log(`${c.gold}${c.bold}  ¿Qué haces?${c.reset}`);
  console.log();
  actions.forEach((action, i) => {
    console.log(`  ${c.yellow}[${i + 1}]${c.reset} ${c.white}${action}${c.reset}`);
  });
  console.log(`  ${c.gray}[0] Salir del juego${c.reset}`);
  console.log();
}

async function gameTurn(action) {
  process.stdout.write(`\n  ${c.cyan}${c.bold}[Narrando escena...]${c.reset}\n`);

  const message = buildMessage(action);
  const result = await callAI(message);

  applyStateChanges(result.stateChanges);
  gameState.turn++;

  const summary = result.narrative.substring(0, 80) + '...';
  gameState.history.push({ action, summary });
  if (gameState.history.length > 5) gameState.history.shift();

  clearScreen();
  printStats();

  const eventColors = {
    positive: c.green,
    negative: c.red,
    danger: c.red + c.bold,
    mission: c.cyan,
    neutral: c.white,
    gameOver: c.red + c.bold,
  };
  const color = eventColors[result.eventType] || c.white;

  console.log(`\n${color}`);
  printNarrative(result.narrative);
  console.log(c.reset);

  if (result.eventType === 'gameOver') {
    console.log(`${c.red}${c.bold}  💀 GAME OVER — ${result.gameOverReason}${c.reset}\n`);
    return false;
  }

  if (gameState.health <= 0) {
    console.log(`${c.red}${c.bold}  💀 GAME OVER — Quedaste sin salud.${c.reset}\n`);
    return false;
  }

  currentActions = result.actions;
  printActions(currentActions);
  return true;
}

async function main() {
  clearScreen();
  printTitle();

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(`${c.red}❌ ERROR: ANTHROPIC_API_KEY no encontrada.`);
    console.log(`   Crea un archivo .env con tu API key de Anthropic.${c.reset}\n`);
    rl.close();
    return;
  }

  console.log(`${c.gray}  Un RPG de texto estilo GTA. Cada decisión tiene consecuencias.${c.reset}\n`);

  const name = await ask(`  ${c.gold}¿Cómo te llamas, carnal? ${c.reset}`);
  gameState.playerName = name.trim() || 'Desconocido';

  clearScreen();
  printTitle();
  console.log(`\n  ${c.cyan}Bienvenido, ${gameState.playerName}. Iniciando Ciudad Libre...${c.reset}\n`);

  const startMsg = `Inicia nueva partida para "${gameState.playerName}". Día 1, Mañana, El Barrio. $500 MXN. Tsuru oxidado. Narra el inicio con 2-4 párrafos y ofrece 4 acciones variadas para comenzar.

ESTADO INICIAL: Jugador: ${gameState.playerName}, Ubicación: El Barrio, Dinero: $500, Salud: 100, Reputación: 0, Búsqueda: 0, Vehículo: Tsuru oxidado, Día 1 Mañana.

ACCIÓN: INICIO DEL JUEGO

Responde SOLO con JSON válido.`;

  process.stdout.write(`  ${c.cyan}[Cargando Ciudad Libre...]${c.reset}\n`);
  const startResult = await callAI(startMsg);
  currentActions = startResult.actions;

  clearScreen();
  printStats();
  console.log(`\n${c.gold}`);
  printNarrative(startResult.narrative);
  console.log(c.reset);
  printActions(currentActions);

  while (true) {
    const input = await ask(`  ${c.gold}> ${c.reset}`);
    const num = parseInt(input.trim());

    if (num === 0 || input.toLowerCase() === 'salir') {
      console.log(`\n  ${c.yellow}Hasta la próxima, ${gameState.playerName}. Ciudad Libre te espera.${c.reset}\n`);
      break;
    }

    if (isNaN(num) || num < 1 || num > currentActions.length) {
      console.log(`  ${c.red}Elige un número del 1 al ${currentActions.length}${c.reset}`);
      continue;
    }

    const chosenAction = currentActions[num - 1];
    const continues = await gameTurn(chosenAction);
    if (!continues) {
      await ask(`\n  ${c.gray}Presiona Enter para salir...${c.reset}`);
      break;
    }
  }

  rl.close();
}

main().catch((err) => {
  console.error(`\n${c.red}Error fatal: ${err.message}${c.reset}\n`);
  process.exit(1);
});
