import { createContext, useContext, useEffect, useState } from 'react'
import { applyPalette, PALETTES } from '../lib/palettes'

const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)

export const FONT_SIZES = {
  small:  { label: 'Small',  rootPx: 16 },
  medium: { label: 'Medium', rootPx: 18 },
  large:  { label: 'Large',  rootPx: 20 },
}
export const FONT_SIZE_ORDER = ['small', 'medium', 'large']

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('theme.mode') || 'system')
  const [palette, setPalette] = useState(() => {
    const stored = localStorage.getItem('theme.palette')
    return (stored && PALETTES[stored]) ? stored : 'sage'
  })
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem('theme.fontSize')
    return FONT_SIZES[stored] ? stored : 'small'
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const isDark = mode === 'dark' || (mode === 'system' && mq.matches)
      applyPalette(palette, isDark)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [mode, palette])

  // Apply font size by scaling the root html element. All rem-based Tailwind
  // sizes (text-*, w-*, h-*, p-*, m-*) will scale proportionally.
  useEffect(() => {
    const px = FONT_SIZES[fontSize]?.rootPx || 16
    document.documentElement.style.fontSize = `${px}px`
  }, [fontSize])

  useEffect(() => { localStorage.setItem('theme.mode', mode) }, [mode])
  useEffect(() => { localStorage.setItem('theme.palette', palette) }, [palette])
  useEffect(() => { localStorage.setItem('theme.fontSize', fontSize) }, [fontSize])

  return (
    <ThemeContext.Provider value={{ mode, setMode, palette, setPalette, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  )
}
