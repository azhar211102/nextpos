import { dayKey } from './format'
import type { PaymentMethod, Product, Transaction } from '@/types'

export function txOnDay(txs: Transaction[], key: string) {
  return txs.filter((t) => dayKey(t.createdAt) === key)
}

export function summarize(txs: Transaction[]) {
  const revenue = txs.reduce((s, t) => s + t.total, 0)
  return { revenue, count: txs.length, avg: txs.length ? revenue / txs.length : 0 }
}

/** Persentase perubahan; null bila pembanding 0. */
export function change(now: number, before: number): number | null {
  if (before <= 0) return null
  return ((now - before) / before) * 100
}

export function hourlySeries(txs: Transaction[], from = 8, to = 21) {
  const rows = Array.from({ length: to - from + 1 }, (_, i) => ({ label: `${String(from + i).padStart(2, '0')}.00`, value: 0 }))
  for (const t of txs) {
    const h = new Date(t.createdAt).getHours()
    const idx = Math.min(Math.max(h, from), to) - from
    rows[idx].value += t.total
  }
  return rows
}

export function dailySeries(txs: Transaction[], endKey: Date, days: number) {
  const rows: { label: string; value: number; key: string }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endKey)
    d.setDate(d.getDate() - i)
    rows.push({ key: dayKey(d), label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), value: 0 })
  }
  const idx = new Map(rows.map((r, i) => [r.key, i]))
  for (const t of txs) {
    const i = idx.get(dayKey(t.createdAt))
    if (i != null) rows[i].value += t.total
  }
  return rows
}

export function methodBreakdown(txs: Transaction[]) {
  const m: Record<PaymentMethod, number> = { Tunai: 0, QRIS: 0, Kartu: 0 }
  for (const t of txs) m[t.method]++
  return m
}

export function topProducts(txs: Transaction[], products: Product[], limit = 5) {
  const qty = new Map<string, number>()
  for (const t of txs) for (const i of t.items) qty.set(i.productId, (qty.get(i.productId) ?? 0) + i.qty)
  const byId = new Map(products.map((p) => [p.id, p]))
  return [...qty.entries()]
    .map(([id, q]) => ({ qty: q, product: byId.get(id) }))
    .filter((r): r is { qty: number; product: Product } => !!r.product)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit)
}

export function kLabel(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`
  if (v >= 1000) return `${Math.round(v / 1000)}K`
  return String(v)
}
