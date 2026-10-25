import { useCallback, useEffect, useState } from 'react'

const THEME_KEY = 'wee:theme'

/** Dark mode by default; the choice persists in localStorage. */
export function useTheme(): { dark: boolean; toggle: () => void } {
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem(THEME_KEY) !== 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
  }, [dark])

  const toggle = useCallback(() => setDark((d) => !d), [])
  return { dark, toggle }
}
