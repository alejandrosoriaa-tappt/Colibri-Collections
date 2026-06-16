import { useState } from 'react';

export default function StartScreen({ onStart, loading, error }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onStart(name.trim());
  };

  return (
    <div className="min-h-screen bg-gta-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(#f0b429 1px, transparent 1px), linear-gradient(90deg, #f0b429 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gta-primary opacity-5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="font-display font-bold text-gta-primary tracking-widest text-sm mb-3 uppercase">
            — Un RPG de Texto con IA —
          </div>
          <h1
            className="font-display font-bold text-gta-primary leading-none select-none"
            style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', textShadow: '0 0 30px rgba(240,180,41,0.5)' }}
          >
            CIUDAD
          </h1>
          <h1
            className="font-display font-bold leading-none select-none"
            style={{
              fontSize: 'clamp(3rem, 12vw, 5rem)',
              color: '#fff',
              textShadow: '0 0 30px rgba(255,255,255,0.2)',
              WebkitTextStroke: '1px rgba(240,180,41,0.3)',
            }}
          >
            LIBRE
          </h1>
        </div>

        {/* Description */}
        <p className="text-gta-muted text-sm text-center mb-8 leading-relaxed font-mono">
          Un RPG de texto estilo GTA ambientado en una ciudad mexicana.<br />
          La IA narra tu historia. Cada decisión tiene consecuencias.
        </p>

        {/* Stats preview */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: '💰', label: '$500 MXN', sub: 'Inicio' },
            { icon: '🚗', label: 'Tsuru', sub: 'Oxidado' },
            { icon: '🏙️', label: '6 Zonas', sub: 'Ciudad' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="bg-gta-card border border-gta-border rounded p-3 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-gta-primary font-display font-bold text-sm">{label}</div>
              <div className="text-gta-muted text-xs">{sub}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gta-muted text-xs uppercase tracking-widest mb-2 font-display">
              Tu nombre, carnal
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: El Patas, La Ramona..."
              maxLength={30}
              disabled={loading}
              className="w-full bg-gta-card border border-gta-border text-gta-text font-mono text-base px-4 py-3
                         outline-none focus:border-gta-primary focus:shadow-[0_0_0_1px_#f0b429]
                         placeholder-gta-muted transition-all duration-200 rounded-none"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-950 border border-gta-danger text-gta-danger text-sm px-4 py-3 font-mono">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full bg-gta-primary text-black font-display font-bold text-xl py-4 uppercase tracking-widest
                       hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-200 active:scale-98"
          >
            {loading ? '🌆 Cargando Ciudad Libre...' : '▶  COMENZAR'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gta-muted text-xs font-mono">
            CLI disponible: <span className="text-gta-primary">node cli.js</span>
          </p>
        </div>
      </div>
    </div>
  );
}
