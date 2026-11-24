import type { CartLine, Discount, Product } from '@/types'

export interface Totals {
  subtotal: number
  discount: number
  service: number
  taxable: number
  tax: number
  total: number
  itemCount: number
}

/** Pembulatan ke rupiah penuh (setengah naik). */
export const round = (n: number) => Math.round(n)

export const isCustomLine = (l: CartLine) => !!l.custom

export function calcDiscount(subtotal: number, d: Discount): number {
  if (subtotal <= 0 || !Number.isFinite(d.value) || d.value <= 0) return 0
  const raw = d.type === 'persen' ? (subtotal * Math.min(d.value, 100)) / 100 : d.value
  return Math.min(round(raw), subtotal)
}

export function calcRate(base: number, ratePercent: number): number {
  if (base <= 0 || ratePercent <= 0) return 0
  return round((base * ratePercent) / 100)
}
export const calcTax = calcRate

export function linePrice(l: CartLine, byId: Map<string, Product>): number {
  if (l.custom) return l.custom.price
  return byId.get(l.productId)?.price ?? 0
}

/**
 * Urutan hitung: subtotal → diskon → biaya layanan (atas subtotal setelah diskon)
 * → pajak (atas subtotal setelah diskon + biaya layanan).
 */
export function calcTotals(
  lines: CartLine[],
  products: Product[],
  discount: Discount,
  taxRate: number,
  serviceRate = 0,
): Totals {
  const byId = new Map(products.map((p) => [p.id, p]))
  let subtotal = 0
  let itemCount = 0
  for (const l of lines) {
    if (!l.custom && !byId.has(l.productId)) continue
    subtotal += linePrice(l, byId) * l.qty
    itemCount += l.qty
  }
  const disc = calcDiscount(subtotal, discount)
  const service = calcRate(subtotal - disc, serviceRate)
  const taxable = subtotal - disc + service
  const tax = calcRate(taxable, taxRate)
  return { subtotal, discount: disc, service, taxable, tax, total: taxable + tax, itemCount }
}

/** Validasi kuantitas terhadap stok. Mengembalikan jumlah yang diizinkan (0..stok). */
export function clampQty(qty: number, stock: number): number {
  if (!Number.isFinite(qty)) return 0
  return Math.max(0, Math.min(Math.floor(qty), Math.max(0, stock)))
}

export function validateDiscount(d: Discount, subtotal: number): string | null {
  if (!Number.isFinite(d.value) || d.value < 0) return 'Diskon tidak boleh negatif.'
  if (d.type === 'persen' && d.value > 100) return 'Diskon persen maksimal 100%.'
  if (d.type === 'nominal' && d.value > subtotal) return 'Diskon melebihi subtotal belanja.'
  return null
}

/** Pecahan uang cepat: uang pas + pecahan rupiah umum yang ≥ total. */
export function quickCashOptions(total: number): number[] {
  if (total <= 0) return []
  const set = new Set<number>([total])
  for (const s of [5000, 10000, 20000, 50000, 100000]) set.add(Math.ceil(total / s) * s)
  for (const n of [50000, 100000, 200000]) if (n >= total) set.add(n)
  return [...set].sort((a, b) => a - b).slice(0, 5)
}

export const calcChange = (received: number, total: number) => received - total
