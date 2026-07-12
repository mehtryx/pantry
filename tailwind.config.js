/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:            'rgb(var(--bg) / <alpha-value>)',
        surface:       'rgb(var(--surface) / <alpha-value>)',
        surface2:      'rgb(var(--surface2) / <alpha-value>)',
        border:        'rgb(var(--border) / <alpha-value>)',
        body:          'rgb(var(--text) / <alpha-value>)',
        muted:         'rgb(var(--text-muted) / <alpha-value>)',
        subtle:        'rgb(var(--text-subtle) / <alpha-value>)',
        primary: {
          DEFAULT:     'rgb(var(--primary) / <alpha-value>)',
          hover:       'rgb(var(--primary-hover) / <alpha-value>)',
          fg:          'rgb(var(--primary-fg) / <alpha-value>)',
        },
        danger: {
          DEFAULT:     'rgb(var(--danger) / <alpha-value>)',
          fg:          'rgb(var(--danger-fg) / <alpha-value>)',
        },
        warn:          'rgb(var(--warn) / <alpha-value>)',
        // Universal status colors (same across all palettes)
        status: {
          green:       '#4a8a3f',
          yellow:      '#d4a24c',
          redUnder:    '#c94a3a',
          redOver:     '#d97757',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
