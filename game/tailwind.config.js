/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gta: {
          bg: '#080808',
          surface: '#111111',
          card: '#181818',
          border: '#252525',
          primary: '#f0b429',
          danger: '#e63946',
          money: '#25c281',
          blue: '#4fc3f7',
          text: '#e0e0e0',
          muted: '#6b7280',
          wanted: '#ef4444',
        },
      },
      fontFamily: {
        display: ['Oswald', 'Impact', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s step-end infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        blink: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glow: { from: { boxShadow: '0 0 5px #f0b42933' }, to: { boxShadow: '0 0 20px #f0b42966' } },
      },
    },
  },
  plugins: [],
};
