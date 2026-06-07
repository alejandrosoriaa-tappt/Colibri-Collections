/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sirah: {
          primary: '#1a3a52',
          accent:  '#d97a3a',
          light:   '#f5f5f5',
          success: '#2ecc71',
          warning: '#e74c3c'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        data: ['"Courier New"', 'Courier', 'monospace']
      }
    }
  },
  plugins: []
};
