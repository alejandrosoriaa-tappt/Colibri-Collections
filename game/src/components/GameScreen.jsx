import StatsPanel from './StatsPanel.jsx';
import NarrativeBox from './NarrativeBox.jsx';
import ActionPanel from './ActionPanel.jsx';

const ZONE_COLORS = {
  'El Barrio': '#f0b429',
  'Centro Histórico': '#4fc3f7',
  'La Industrial': '#9b59b6',
  'Los Álamos': '#25c281',
  'El Bordo': '#e63946',
  'Carretera Federal': '#f39c12',
};

export default function GameScreen({ gameState, narrative, actions, loading, eventType, error, onAction }) {
  const zoneColor = ZONE_COLORS[gameState.location] || '#f0b429';

  return (
    <div className="min-h-screen bg-gta-bg flex flex-col" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Top bar */}
      <header className="bg-gta-card border-b border-gta-border px-4 py-2 flex items-center gap-4 flex-shrink-0">
        <h1
          className="font-display font-bold text-gta-primary text-xl tracking-widest"
          style={{ textShadow: '0 0 15px rgba(240,180,41,0.4)' }}
        >
          CIUDAD LIBRE
        </h1>
        <div className="ml-auto flex items-center gap-4 text-xs font-mono text-gta-muted">
          <span
            className="font-display font-bold text-sm px-2 py-0.5"
            style={{ color: zoneColor, border: `1px solid ${zoneColor}33`, background: `${zoneColor}11` }}
          >
            {gameState.location}
          </span>
          <span>Día {gameState.day} — {gameState.timeOfDay}</span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Stats sidebar */}
        <StatsPanel gameState={gameState} />

        {/* Game content */}
        <main className="flex-1 flex flex-col p-4 overflow-y-auto">
          {/* Narrative */}
          <NarrativeBox narrative={narrative} eventType={eventType} loading={loading} />

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-950 border border-gta-danger text-gta-danger text-sm px-4 py-3 font-mono">
              ⚠️ Error: {error}
            </div>
          )}

          {/* Actions */}
          <ActionPanel actions={actions} loading={loading} onAction={onAction} />

          {/* History */}
          {gameState.history && gameState.history.length > 0 && (
            <div className="mt-6 border-t border-gta-border pt-4">
              <div className="text-gta-muted text-xs uppercase tracking-widest font-display mb-2">
                Historial
              </div>
              <div className="space-y-1">
                {gameState.history.slice().reverse().map((h, i) => (
                  <div key={i} className="text-gta-muted text-xs font-mono truncate">
                    <span className="text-gta-primary mr-2">›</span>
                    <span className="text-gta-text">{h.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
