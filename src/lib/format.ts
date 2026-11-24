import type { Settings } from '@/types'

const NF = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

export function formatNumber(n: number): string {
  return NF.format(Math.round(n))
}

/** "Rp 25.000" — mata uang lain memakai penanda di depan. */
export function formatCurrency(n: number, currency: Settings['currency'] = 'IDR'): string {
  const v = Math.round(n)
  const sign = v < 0 ? '-' : ''
  const abs = NF.format(Math.abs(v))
  switch (currency) {
    case 'USD': return `${sign}US$ ${abs}`
    case 'SGD': return `${sign}S$ ${abs}`
    case 'MYR': return `${sign}RM ${abs}`
    default: return `${sign}Rp ${abs}`
  }
}

/** "24 November 2026" */
export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** "Selasa, 24 November 2026" */
export function formatDateLong(d: Date | string): string {
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** "14:37" */
export function formatTime(d: Date | string): string {
  const x = new Date(d)
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`
}

export function formatDateTime(d: Date | string): string {
  return `${formatDate(d)}, ${formatTime(d)}`
}

/** Kunci tanggal lokal "2026-11-24" (bukan UTC). */
export function dayKey(d: Date | string): string {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

/** Parse "12.500" / "12500" / "Rp 12.500" → 12500. Kosong → 0. */
export function parseMoney(s: string): number {
  const digits = s.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

export function pct(n: number): string {
  return `${n.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`
}
