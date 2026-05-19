export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        colibri: {
          DEFAULT: '#0d6e4f',
          light: '#15a374',
          dark: '#095239',
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
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
