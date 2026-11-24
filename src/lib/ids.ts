import { dayKey } from './format'

/** TRX-261124-0042 : tanggal (yymmdd) + nomor urut harian. */
export function makeTransactionId(date: Date, existingIds: Iterable<string>): string {
  const k = dayKey(date).replace(/-/g, '').slice(2)
  const prefix = `TRX-${k}-`
  let max = 0
  for (const id of existingIds) {
    if (id.startsWith(prefix)) {
      const n = Number(id.slice(prefix.length))
      if (n > max) max = n
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
