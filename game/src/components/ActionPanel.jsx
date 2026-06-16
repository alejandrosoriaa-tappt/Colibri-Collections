export default function ActionPanel({ actions, loading, onAction }) {
  if (loading) {
    return (
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="btn-action opacity-30 animate-pulse pointer-events-none h-14 flex items-center"
          >
            <span className="text-gta-muted">· · ·</span>
          </div>
        ))}
      </div>
    );
  }

  if (!actions.length) return null;

  return (
    <div className="mt-4">
      <div className="text-gta-muted text-xs uppercase tracking-widest font-display mb-3">
        ¿Qué haces?
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => onAction(action)}
            disabled={loading}
            className="btn-action text-left"
          >
            <span className="text-gta-muted font-display mr-2">{i + 1}.</span>
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}
