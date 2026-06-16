import { useEffect, useRef, useState } from 'react';

const EVENT_STYLES = {
  positive: { border: '#25c281', glow: 'rgba(37,194,129,0.15)', icon: '✅', label: 'POSITIVO' },
  negative: { border: '#e63946', glow: 'rgba(230,57,70,0.15)', icon: '⚠️', label: 'NEGATIVO' },
  danger:   { border: '#e63946', glow: 'rgba(230,57,70,0.3)',  icon: '🔫', label: 'PELIGRO' },
  mission:  { border: '#4fc3f7', glow: 'rgba(79,195,247,0.15)', icon: '🎯', label: 'MISIÓN' },
  neutral:  { border: '#252525', glow: 'transparent', icon: '📖', label: '' },
};

function useTypewriter(text, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, done };
}

export default function NarrativeBox({ narrative, eventType, loading }) {
  const style = EVENT_STYLES[eventType] || EVENT_STYLES.neutral;
  const { displayed, done } = useTypewriter(narrative, 14);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayed]);

  return (
    <div
      className="flex-1 flex flex-col bg-gta-surface rounded-none transition-all duration-300"
      style={{
        border: `1px solid ${style.border}`,
        boxShadow: style.glow !== 'transparent' ? `inset 0 0 30px ${style.glow}` : 'none',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ borderColor: style.border, background: 'rgba(0,0,0,0.4)' }}
      >
        <span className="text-base">{style.icon}</span>
        <span className="font-display font-bold tracking-widest text-xs" style={{ color: style.border }}>
          {style.label || 'NARRACIÓN'}
        </span>
        <div className="ml-auto">
          {loading && (
            <span className="text-gta-muted text-xs font-mono animate-pulse">
              IA escribiendo...
            </span>
          )}
        </div>
      </div>

      {/* Narrative text */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 narrative-enter"
        style={{ minHeight: '200px', maxHeight: '400px' }}
      >
        {loading && !narrative ? (
          <div className="flex items-center gap-3 text-gta-muted font-mono text-sm">
            <span className="animate-spin">⟳</span>
            <span>La ciudad se mueve...</span>
          </div>
        ) : (
          <div className="font-mono text-sm leading-relaxed text-gta-text whitespace-pre-wrap">
            {displayed}
            {!done && <span className="cursor-blink" />}
          </div>
        )}
      </div>
    </div>
  );
}
