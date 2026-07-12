// Each palette defines light and dark variants.
// Values are "R G B" (space-separated) for use with Tailwind's rgb(var(--x) / <alpha>)

export const PALETTES = {
  sage: {
    label: 'Sage',
    swatch: '#7a9471',
    light: {
      bg:            '250 247 242',   // #faf7f2 cream
      surface:       '255 255 255',
      surface2:      '243 237 226',   // subtle surface
      border:        '232 220 199',
      text:          '45 60 42',      // deep sage
      textMuted:     '95 122 88',
      textSubtle:    '147 173 134',
      primary:       '122 148 113',   // #7a9471
      primaryHover:  '95 122 88',
      primaryFg:     '255 255 255',
      danger:        '184 94 64',     // terracotta
      dangerFg:      '255 255 255',
      warn:          '196 138 46',    // amber
    },
    dark: {
      bg:            '31 42 29',
      surface:       '45 60 42',
      surface2:      '58 77 54',
      border:        '58 77 54',
      text:          '221 229 216',
      textMuted:     '184 201 175',
      textSubtle:    '147 173 134',
      primary:       '147 173 134',
      primaryHover:  '184 201 175',
      primaryFg:     '31 42 29',
      danger:        '209 122 90',
      dangerFg:      '31 42 29',
      warn:          '224 169 76',
    },
  },
  terracotta: {
    label: 'Terracotta',
    swatch: '#c56b4b',
    light: {
      bg:            '250 243 236',   // warm cream
      surface:       '255 251 246',
      surface2:      '240 226 210',
      border:        '224 200 178',
      text:          '58 30 20',
      textMuted:     '122 74 55',
      textSubtle:    '178 130 105',
      primary:       '197 107 75',    // #c56b4b
      primaryHover:  '160 79 51',
      primaryFg:     '255 255 255',
      danger:        '139 58 44',
      dangerFg:      '255 255 255',
      warn:          '196 138 46',
    },
    dark: {
      bg:            '43 30 24',
      surface:       '58 42 34',
      surface2:      '74 55 45',
      border:        '89 65 51',
      text:          '240 224 211',
      textMuted:     '211 178 152',
      textSubtle:    '164 130 104',
      primary:       '214 137 105',
      primaryHover:  '235 168 138',
      primaryFg:     '43 30 24',
      danger:        '210 100 80',
      dangerFg:      '43 30 24',
      warn:          '224 169 76',
    },
  },
  ocean: {
    label: 'Ocean',
    swatch: '#2c6b7a',
    light: {
      bg:            '242 246 247',
      surface:       '255 255 255',
      surface2:      '223 234 236',
      border:        '198 216 220',
      text:          '15 40 51',
      textMuted:     '55 100 116',
      textSubtle:    '118 154 168',
      primary:       '44 107 122',    // #2c6b7a
      primaryHover:  '26 82 96',
      primaryFg:     '255 255 255',
      danger:        '199 107 82',    // warm coral for contrast
      dangerFg:      '255 255 255',
      warn:          '212 162 76',
    },
    dark: {
      bg:            '14 30 36',
      surface:       '25 48 56',
      surface2:      '38 66 76',
      border:        '52 82 92',
      text:          '220 231 234',
      textMuted:     '158 190 200',
      textSubtle:    '108 145 158',
      primary:       '74 157 176',
      primaryHover:  '116 189 205',
      primaryFg:     '14 30 36',
      danger:        '217 133 108',
      dangerFg:      '14 30 36',
      warn:          '224 178 96',
    },
  },
  honey: {
    label: 'Honey',
    swatch: '#c88a1a',
    light: {
      bg:            '253 248 237',
      surface:       '255 252 244',
      surface2:      '244 228 191',
      border:        '224 204 158',
      text:          '58 45 21',
      textMuted:     '122 96 42',
      textSubtle:    '178 148 84',
      primary:       '200 138 26',    // #c88a1a
      primaryHover:  '166 111 16',
      primaryFg:     '255 255 255',
      danger:        '160 58 42',
      dangerFg:      '255 255 255',
      warn:          '210 156 44',
    },
    dark: {
      bg:            '37 29 14',
      surface:       '56 46 28',
      surface2:      '76 62 38',
      border:        '92 76 46',
      text:          '240 229 207',
      textMuted:     '208 187 138',
      textSubtle:    '160 138 90',
      primary:       '224 169 64',
      primaryHover:  '240 198 116',
      primaryFg:     '37 29 14',
      danger:        '217 118 92',
      dangerFg:      '37 29 14',
      warn:          '224 178 90',
    },
  },
  wine: {
    label: 'Wine',
    swatch: '#7d2c3f',
    light: {
      bg:            '251 245 245',
      surface:       '255 251 251',
      surface2:      '237 216 220',
      border:        '218 189 195',
      text:          '44 21 24',
      textMuted:     '109 51 65',
      textSubtle:    '176 124 138',
      primary:       '125 44 63',     // #7d2c3f
      primaryHover:  '96 32 47',
      primaryFg:     '255 255 255',
      danger:        '168 62 48',
      dangerFg:      '255 255 255',
      warn:          '196 138 46',
    },
    dark: {
      bg:            '34 20 26',
      surface:       '51 33 42',
      surface2:      '71 47 58',
      border:        '89 60 74',
      text:          '236 214 220',
      textMuted:     '204 168 178',
      textSubtle:    '164 122 138',
      primary:       '168 84 106',
      primaryHover:  '200 116 138',
      primaryFg:     '34 20 26',
      danger:        '210 116 96',
      dangerFg:      '34 20 26',
      warn:          '224 169 76',
    },
  },
  slate: {
    label: 'Slate',
    swatch: '#4a5a6e',
    light: {
      bg:            '245 246 248',
      surface:       '255 255 255',
      surface2:      '227 231 237',
      border:        '203 210 220',
      text:          '30 38 50',
      textMuted:     '74 90 110',
      textSubtle:    '132 148 168',
      primary:       '74 90 110',     // #4a5a6e
      primaryHover:  '54 68 86',
      primaryFg:     '255 255 255',
      danger:        '184 90 68',     // copper/warm accent
      dangerFg:      '255 255 255',
      warn:          '196 138 46',
    },
    dark: {
      bg:            '22 26 34',
      surface:       '34 41 58',
      surface2:      '48 58 78',
      border:        '64 78 100',
      text:          '213 218 228',
      textMuted:     '168 178 198',
      textSubtle:    '132 148 168',
      primary:       '120 137 160',
      primaryHover:  '160 178 200',
      primaryFg:     '22 26 34',
      danger:        '210 132 100',
      dangerFg:      '22 26 34',
      warn:          '224 169 76',
    },
  },
}

export const PALETTE_ORDER = ['sage', 'terracotta', 'ocean', 'honey', 'wine', 'slate']

/**
 * Apply a palette and mode by writing CSS variables onto the document root
 * and toggling the 'dark' class. Called by ThemeContext whenever settings
 * change.
 */
export function applyPalette(paletteKey, isDark) {
  const p = PALETTES[paletteKey] || PALETTES.sage
  const vars = isDark ? p.dark : p.light
  const root = document.documentElement
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(`--${camelToKebab(k)}`, v)
  }
  root.classList.toggle('dark', isDark)
  root.setAttribute('data-palette', paletteKey)
}

function camelToKebab(s) {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase()
}
