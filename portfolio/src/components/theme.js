import { useEffect, useState } from 'react'

export function useTheme () {
  const [theme, setTheme] = useState(() => {
    try { const t = localStorage.getItem('smca-theme'); if (t) return t } catch { /* ignore */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('smca-theme', theme) } catch { /* ignore */ }
  }, [theme])
  return [theme, () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))]
}
