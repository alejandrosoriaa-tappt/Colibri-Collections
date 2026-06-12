export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy brand alias (kept for backward compat with existing classes)
        colibri: {
          DEFAULT: '#006C4A',
          light: '#15a374',
          dark: '#00513A',
          50: '#f0faf5',
          100: '#d6f5e8',
          200: '#aeebd2',
          300: '#77d9b5',
          400: '#3fbe93',
          500: '#1da374',
          600: '#0d6e4f',
          700: '#095239',
          800: '#073e2c',
          900: '#052d20'
        },
        // Material Design 3 color roles (green seed #0d6e4f)
        md: {
          // Primary
          primary: '#006C4A',
          'on-primary': '#FFFFFF',
          'primary-container': '#89F8C6',
          'on-primary-container': '#002115',
          // Secondary
          secondary: '#4D6359',
          'on-secondary': '#FFFFFF',
          'secondary-container': '#CFE9D9',
          'on-secondary-container': '#0B1F17',
          // Tertiary (blue accent)
          tertiary: '#3B6471',
          'on-tertiary': '#FFFFFF',
          'tertiary-container': '#BEE9F8',
          'on-tertiary-container': '#001F27',
          // Error
          error: '#BA1A1A',
          'on-error': '#FFFFFF',
          'error-container': '#FFDAD6',
          'on-error-container': '#410002',
          // Surface roles
          surface: '#F6FAF7',
          'on-surface': '#181D19',
          'surface-variant': '#DCE5DC',
          'on-surface-variant': '#404944',
          'surface-container-lowest': '#FFFFFF',
          'surface-container-low': '#F0F4F1',
          'surface-container': '#EAEEE9',
          'surface-container-high': '#E4E8E4',
          'surface-container-highest': '#DFE2DE',
          // Outline
          outline: '#707972',
          'outline-variant': '#C0C9C1',
          // Inverse
          'inverse-surface': '#2C312D',
          'inverse-on-surface': '#EEF2ED',
          'inverse-primary': '#6CDBA7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '28px',
      },
      boxShadow: {
        // MD3 elevation levels
        'md3-1': '0px 1px 2px rgba(0,0,0,0.18), 0px 1px 3px 1px rgba(0,0,0,0.10)',
        'md3-2': '0px 1px 2px rgba(0,0,0,0.18), 0px 2px 6px 2px rgba(0,0,0,0.10)',
        'md3-3': '0px 4px 8px 3px rgba(0,0,0,0.10), 0px 1px 3px rgba(0,0,0,0.18)',
        'md3-4': '0px 6px 10px 4px rgba(0,0,0,0.10), 0px 2px 3px rgba(0,0,0,0.18)',
        'md3-5': '0px 8px 12px 6px rgba(0,0,0,0.10), 0px 4px 4px rgba(0,0,0,0.18)',
      }
    }
  },
  plugins: []
}
