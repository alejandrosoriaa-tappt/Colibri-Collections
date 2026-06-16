export default function GameOver({ gameState, reason, onRestart }) {
  const repLabel =
    gameState.reputation <= 20 ? 'Desconocido' :
    gameState.reputation <= 40 ? 'Conocido' :
    gameState.reputation <= 60 ? 'Respetado' :
    gameState.reputation <= 80 ? 'Temido' : 'Leyenda';

  return (
    <div className="min-h-screen bg-gta-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Red glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gta-danger opacity-10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="text-6xl mb-6">💀</div>

        <h1
          className="font-display font-bold text-gta-danger text-5xl mb-2 tracking-widest"
          style={{ textShadow: '0 0 30px rgba(230,57,70,0.6)' }}
        >
          GAME OVER
        </h1>

        <p className="text-gta-muted font-mono text-sm mb-8">
          {reason || 'Tu historia en Ciudad Libre terminó.'}
        </p>

        {/* Stats summary */}
        <div className="bg-gta-card border border-gta-border p-6 mb-8 text-left">
          <div className="font-display font-bold text-gta-primary text-lg mb-4">
            {gameState.playerName} — Resumen
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Días sobrevividos', value: gameState.day },
              { label: 'Turnos jugados', value: gameState.turn },
              { label: 'Dinero final', value: `$${gameState.money.toLocaleString('es-MX')} MXN` },
              { label: 'Reputación', value: `${gameState.reputation} — ${repLabel}` },
              { label: 'Ubicación final', value: gameState.location },
              { label: 'Vehículo', value: gameState.vehicle },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-gta-muted text-xs uppercase tracking-widest font-display">{label}</div>
                <div className="text-gta-text font-mono text-sm mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full bg-gta-primary text-black font-display font-bold text-xl py-4 uppercase tracking-widest
                     hover:bg-yellow-400 transition-all duration-200 active:scale-98"
        >
          ▶  NUEVA PARTIDA
        </button>

        <p className="text-gta-muted text-xs font-mono mt-4">
          Ciudad Libre siempre da otra oportunidad.
        </p>
      </div>
    </div>
  );
}
