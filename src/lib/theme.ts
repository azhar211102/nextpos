import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'nextpos:theme'
const listeners = new Set<() => void>()

function read(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }
}

let current: Theme = typeof document === 'undefined' ? 'light' : read()

export function applyTheme(t: Theme) {
  current = t
  document.documentElement.classList.toggle('dark', t === 'dark')
  document.documentElement.style.colorScheme = t
  try { localStorage.setItem(KEY, t) } catch { /* penyimpanan diblokir: tema hanya berlaku untuk sesi ini */ }
  listeners.forEach((l) => l())
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => current,
    () => 'light' as Theme,
  )
  return [theme, () => applyTheme(theme === 'dark' ? 'light' : 'dark')]
}
