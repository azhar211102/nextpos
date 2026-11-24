/** Hash PIN (SHA-256, garam tetap). Hanya penyamaran sederhana — data tetap di LocalStorage perangkat. */
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`nextpos:${pin}`)
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  let h = 5381
  for (const b of data) h = ((h << 5) + h + b) | 0
  return `x${(h >>> 0).toString(16)}`
}

export const validPin = (pin: string) => /^\d{4,6}$/.test(pin)
