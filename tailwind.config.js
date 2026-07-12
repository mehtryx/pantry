/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fefdfb',
          100: '#faf7f2',
          200: '#f3ede2',
          300: '#e8dcc7',
        },
        sage: {
          50: '#f2f5f0',
          100: '#dde5d8',
          200: '#b8c9af',
          300: '#93ad86',
          400: '#7a9471',
          500: '#5f7a58',
          600: '#4a6144',
          700: '#3a4d36',
          800: '#2d3c2a',
          900: '#1f2a1d',
        },
        terracotta: {
          400: '#d17a5a',
          500: '#b85e40',
          600: '#994a30',
        },
        amber_warn: {
          400: '#e0a94c',
          500: '#c48a2e',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
