import { createContext, useContext, useEffect, useState } from 'react'
import { applyPalette, PALETTES } from '../lib/palettes'

const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('theme.mode') || 'system')
  const [palette, setPalette] = useState(() => {
    const stored = localStorage.getItem('theme.palette')
    return (stored && PALETTES[stored]) ? stored : 'sage'
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

  useEffect(() => { localStorage.setItem('theme.mode', mode) }, [mode])
  useEffect(() => { localStorage.setItem('theme.palette', palette) }, [palette])

  return (
    <ThemeContext.Provider value={{ mode, setMode, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  )
}
