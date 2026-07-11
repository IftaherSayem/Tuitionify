/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefdf6',
          100: '#d6f8e7',
          200: '#b0efd2',
          300: '#7be0b7',
          400: '#40c994',
          500: '#1baf78',
          600: '#0f8f62',
          700: '#0d7250',
          800: '#0e5b42',
          900: '#0c4a37',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
