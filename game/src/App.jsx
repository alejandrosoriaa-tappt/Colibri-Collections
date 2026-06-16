import { useState, useCallback } from 'react';
import StartScreen from './components/StartScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import GameOver from './components/GameOver.jsx';

const TIME_SEQUENCE = ['Mañana', 'Tarde', 'Noche', 'Madrugada'];

function applyStateChanges(current, changes) {
  const next = { ...current };
  if (changes.money !== undefined) next.money = Math.max(0, current.money + changes.money);
  if (changes.health !== undefined) next.health = Math.min(100, Math.max(0, current.health + changes.health));
  if (changes.reputation !== undefined) next.reputation = Math.min(100, Math.max(0, current.reputation + changes.reputation));
  if (changes.wantedLevel !== undefined) next.wantedLevel = Math.min(5, Math.max(0, current.wantedLevel + changes.wantedLevel));
  if (changes.location) next.location = changes.location;
  if (changes.vehicle) next.vehicle = changes.vehicle;

  if (changes.timeAdvance) {
    const idx = TIME_SEQUENCE.indexOf(current.timeOfDay);
    if (idx === TIME_SEQUENCE.length - 1) {
      next.timeOfDay = 'Mañana';
      next.day = current.day + 1;
      if (next.wantedLevel > 0) next.wantedLevel--;
    } else {
      next.timeOfDay = TIME_SEQUENCE[idx + 1];
    }
  }

  return next;
}

export default function App() {
  const [phase, setPhase] = useState('start');
  const [gameState, setGameState] = useState({
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
  });
  const [narrative, setNarrative] = useState('');
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState('neutral');
  const [error, setError] = useState(null);
  const [gameOverReason, setGameOverReason] = useState(null);

  const startGame = useCallback(async (playerName) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al iniciar');

      setGameState(prev => ({
        ...applyStateChanges(prev, result.stateChanges || {}),
        playerName,
        turn: 1,
      }));
      setNarrative(result.narrative);
      setActions(result.actions || []);
      setEventType(result.eventType || 'neutral');
      setPhase('playing');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const doAction = useCallback(async (action) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameState, action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error del servidor');

      const newState = applyStateChanges(gameState, result.stateChanges || {});
      const summary = result.narrative.substring(0, 100) + '...';
      const newHistory = [...(gameState.history || []), { action, summary }].slice(-5);

      setGameState({ ...newState, turn: gameState.turn + 1, history: newHistory });
      setNarrative(result.narrative);
      setActions(result.actions || []);
      setEventType(result.eventType || 'neutral');

      if (result.eventType === 'gameOver' || newState.health <= 0) {
        setGameOverReason(result.gameOverReason || 'Te quedaste sin salud.');
        setPhase('gameOver');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  const restart = useCallback(() => {
    setPhase('start');
    setNarrative('');
    setActions([]);
    setEventType('neutral');
    setError(null);
    setGameOverReason(null);
    setGameState({
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
    });
  }, []);

  if (phase === 'start') {
    return <StartScreen onStart={startGame} loading={loading} error={error} />;
  }

  if (phase === 'gameOver') {
    return <GameOver gameState={gameState} reason={gameOverReason} onRestart={restart} />;
  }

  return (
    <GameScreen
      gameState={gameState}
      narrative={narrative}
      actions={actions}
      loading={loading}
      eventType={eventType}
      error={error}
      onAction={doAction}
    />
  );
}
