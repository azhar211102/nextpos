import type { StateStorage } from 'zustand/middleware'

export const STORAGE_KEY = 'nextpos:v1'

/** LocalStorage yang aman: tidak melempar error saat kosong, rusak, penuh, atau diblokir. */
export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name)
      if (raw == null) return null
      JSON.parse(raw) // validasi — jika rusak, buang dan mulai dari data awal
      return raw
    } catch {
      try { localStorage.removeItem(name) } catch { /* diabaikan */ }
      return null
    }
  },
  setItem: (name, value) => {
    try { localStorage.setItem(name, value) } catch { /* penyimpanan penuh/diblokir */ }
  },
  removeItem: (name) => {
    try { localStorage.removeItem(name) } catch { /* diabaikan */ }
  },
}
