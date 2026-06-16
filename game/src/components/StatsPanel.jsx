function RepLabel({ rep }) {
  if (rep <= 20) return <span className="text-gta-muted">Desconocido</span>;
  if (rep <= 40) return <span className="text-blue-400">Conocido</span>;
  if (rep <= 60) return <span className="text-gta-primary">Respetado</span>;
  if (rep <= 80) return <span className="text-orange-400">Temido</span>;
  return <span className="text-gta-danger">Leyenda</span>;
}

function WantedStars({ level }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`text-base transition-colors ${i < level ? 'text-gta-wanted' : 'text-gta-border'}`}
          style={i < level ? { textShadow: '0 0 8px #ef4444' } : {}}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function HealthBar({ health }) {
  const color = health > 50 ? '#25c281' : health > 25 ? '#f0b429' : '#e63946';
  return (
    <div className="health-bar mt-1">
      <div
        style={{ width: `${health}%`, height: '100%', backgroundColor: color, transition: 'all 0.5s ease' }}
      />
    </div>
  );
}

function StatBlock({ label, children }) {
  return (
    <div className="py-3 border-b border-gta-border last:border-0">
      <div className="stat-label mb-1">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function TimeIndicator({ timeOfDay }) {
  const icons = { 'Mañana': '🌅', 'Tarde': '☀️', 'Noche': '🌙', 'Madrugada': '🌃' };
  return <span>{icons[timeOfDay] || '🌆'} {timeOfDay}</span>;
}

export default function StatsPanel({ gameState }) {
  const { playerName, location, money, health, reputation, wantedLevel, day, timeOfDay, vehicle } = gameState;

  return (
    <div className="bg-gta-surface border-r border-gta-border h-full overflow-y-auto flex-shrink-0" style={{ width: '220px' }}>
      {/* Header */}
      <div className="bg-gta-card border-b border-gta-border px-4 py-3">
        <div className="text-gta-primary font-display font-bold text-lg leading-tight truncate">
          {playerName}
        </div>
        <div className="text-gta-muted text-xs font-mono mt-0.5">
          Día {day} · <TimeIndicator timeOfDay={timeOfDay} />
        </div>
      </div>

      <div className="px-4">
        {/* Location */}
        <StatBlock label="📍 Ubicación">
          <div className="text-gta-primary font-mono text-sm font-bold">{location}</div>
        </StatBlock>

        {/* Money */}
        <StatBlock label="💰 Dinero">
          <div className="text-gta-money font-display font-bold text-2xl">
            ${money.toLocaleString('es-MX')}
            <span className="text-gta-muted text-xs font-mono ml-1">MXN</span>
          </div>
        </StatBlock>

        {/* Health */}
        <StatBlock label="❤️ Salud">
          <div
            className="font-display font-bold text-xl"
            style={{ color: health > 50 ? '#25c281' : health > 25 ? '#f0b429' : '#e63946' }}
          >
            {health}%
          </div>
          <HealthBar health={health} />
        </StatBlock>

        {/* Reputation */}
        <StatBlock label="⭐ Reputación">
          <div className="font-display font-bold text-xl text-gta-text">{reputation}</div>
          <RepLabel rep={reputation} />
        </StatBlock>

        {/* Wanted Level */}
        <StatBlock label="🔴 Búsqueda">
          <WantedStars level={wantedLevel} />
          {wantedLevel >= 3 && (
            <div className="text-gta-danger text-xs font-mono mt-1 animate-pulse">¡ALERTA POLICIAL!</div>
          )}
        </StatBlock>

        {/* Vehicle */}
        <StatBlock label="🚗 Vehículo">
          <div className="text-gta-text font-mono text-sm">{vehicle}</div>
        </StatBlock>
      </div>

      {/* Turn counter */}
      <div className="px-4 py-3 mt-auto border-t border-gta-border">
        <div className="text-gta-muted text-xs font-mono text-center">
          TURNO #{gameState.turn}
        </div>
      </div>
    </div>
  );
}
