import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { MethodBadge, PageHeader, Panel } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useValidTransactions } from '@/hooks/useData'
import { useMoney } from '@/hooks/useMoney'
import { downloadCsv } from '@/lib/csv'
import { dayKey, formatDate, formatNumber } from '@/lib/format'
import { dailySeries, hourlySeries, kLabel, methodBreakdown } from '@/lib/stats'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { PAYMENT_LABEL, type PaymentMethod } from '@/types'

const PRESETS = [
  { id: 'hari', label: 'Hari Ini' },
  { id: '7', label: '7 Hari' },
  { id: '30', label: '30 Hari' },
  { id: 'bulan', label: 'Bulan Ini' },
] as const

function presetRange(id: string): [string, string] {
  const end = new Date()
  const start = new Date()
  if (id === '7') start.setDate(end.getDate() - 6)
  if (id === '30') start.setDate(end.getDate() - 29)
  if (id === 'bulan') start.setDate(1)
  return [dayKey(start), dayKey(end)]
}

export default function Reports() {
  const rp = useMoney()
  const valid = useValidTransactions()
  const allTx = useStore((s) => s.transactions)
  const products = useStore((s) => s.products)
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange('7'))
  const [preset, setPreset] = useState<string>('7')

  const rangeErr = from && to && from > to ? 'Tanggal awal tidak boleh setelah tanggal akhir.' : ''
  const inRange = (iso: string) => { const k = dayKey(iso); return k >= from && k <= to }
  const txs = useMemo(() => (rangeErr ? [] : valid.filter((t) => inRange(t.createdAt))), [valid, from, to, rangeErr]) // eslint-disable-line react-hooks/exhaustive-deps
  const refunds = useMemo(() => (rangeErr ? [] : allTx.filter((t) => t.status === 'Dikembalikan' && inRange(t.createdAt))), [allTx, from, to, rangeErr]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const costOf = new Map(products.map((p) => [p.id, p.cost]))
    let subtotal = 0, discount = 0, tax = 0, total = 0, cost = 0
    for (const t of txs) {
      subtotal += t.subtotal; discount += t.discount; tax += t.tax; total += t.total
      for (const i of t.items) cost += (costOf.get(i.productId) ?? 0) * i.qty
    }
    const profit = subtotal - discount - cost
    return { subtotal, discount, tax, total, profit, count: txs.length, avg: txs.length ? total / txs.length : 0 }
  }, [txs, products])

  const days = rangeErr ? 0 : Math.round((new Date(`${to}T00:00`).getTime() - new Date(`${from}T00:00`).getTime()) / 86_400_000) + 1
  const series = useMemo(
    () => (days <= 1 ? hourlySeries(txs) : dailySeries(txs, new Date(`${to}T12:00`), Math.min(days, 92))),
    [txs, to, days],
  )

  const top = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number }>()
    for (const t of txs) for (const i of t.items) {
      const x = m.get(i.productId) ?? { name: i.name, qty: 0, revenue: 0 }
      x.qty += i.qty; x.revenue += i.qty * i.price
      m.set(i.productId, x)
    }
    return [...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 10)
  }, [txs])

  const byMethod = methodBreakdown(txs)
  const methodRev = (m: PaymentMethod) => txs.filter((t) => t.method === m).reduce((s, t) => s + t.total, 0)
  const byCashier = useMemo(() => {
    const m = new Map<string, { count: number; total: number }>()
    for (const t of txs) { const x = m.get(t.cashier) ?? { count: 0, total: 0 }; x.count++; x.total += t.total; m.set(t.cashier, x) }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [txs])

  const exportCsv = () => {
    if (!txs.length) return toast.error('Tidak ada transaksi pada rentang ini.')
    downloadCsv(`laporan-penjualan-${from}-sd-${to}.csv`, [
      ['No. Transaksi', 'Tanggal', 'Waktu', 'Kasir', 'Pelanggan', 'Metode', 'Item', 'Subtotal', 'Diskon', 'Pajak', 'Total'],
      ...txs.map((t) => [
        t.id, formatDate(t.createdAt), new Date(t.createdAt).toTimeString().slice(0, 5), t.cashier, t.customerName ?? '',
        PAYMENT_LABEL[t.method], t.items.reduce((n, i) => n + i.qty, 0), t.subtotal, t.discount, t.tax, t.total,
      ]),
    ])
    toast.success('Laporan diunduh.')
  }

  const kpis = [
    { label: 'Total Penjualan', value: rp(stats.total) },
    { label: 'Jumlah Transaksi', value: formatNumber(stats.count) },
    { label: 'Rata-rata Transaksi', value: rp(stats.avg) },
    { label: 'Estimasi Laba Kotor', value: rp(stats.profit), hint: 'Penjualan bersih dikurangi harga modal saat ini' },
  ]

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Laporan"
        description="Analisis penjualan berdasarkan rentang tanggal."
        actions={<Button variant="outline" className="h-10 gap-2" onClick={exportCsv}><Download className="size-4" aria-hidden /> Unduh CSV</Button>}
      />

      <div className="surface mb-4 flex flex-wrap items-end gap-4 p-4">
        <div role="group" aria-label="Rentang cepat" className="flex rounded-md bg-secondary p-1">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => { setPreset(p.id); setRange(presetRange(p.id)) }}
              className={cn('press h-8 rounded px-3.5 text-sm font-medium', preset === p.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{p.label}</button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Dari tanggal
          <Input type="date" value={from} max={to || undefined} onChange={(e) => { setPreset('kustom'); setRange([e.target.value, to]) }} className="h-10 w-[150px]" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Sampai tanggal
          <Input type="date" value={to} min={from || undefined} onChange={(e) => { setPreset('kustom'); setRange([from, e.target.value]) }} className="h-10 w-[150px]" />
        </label>
        {rangeErr && <p role="alert" className="pb-2 text-sm text-red-700 dark:text-red-400">{rangeErr}</p>}
        {!rangeErr && <p className="pb-2 text-sm text-muted-foreground">{formatDate(`${from}T12:00`)} – {formatDate(`${to}T12:00`)}</p>}
      </div>

      <section aria-label="Ringkasan laporan" className="surface grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
        {kpis.map((k, i) => (
          <div key={k.label} className={cn('p-5', i % 2 === 1 && 'sm:border-l sm:border-border xl:border-l-0', i >= 2 && 'sm:border-t sm:border-border xl:border-t-0')}>
            <p className="text-[13px] text-muted-foreground">{k.label}</p>
            <p className="num mt-1.5 truncate text-[26px] leading-tight font-bold" data-testid={`kpi-${i}`}>{k.value}</p>
            {k.hint && <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>}
          </div>
        ))}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title={days <= 1 ? 'Penjualan per Jam' : 'Penjualan per Hari'} bodyClassName="flex pb-3">
          <div className="relative min-h-[260px] flex-1" role="img" aria-label="Grafik penjualan">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--input)' }} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval="preserveStartEnd" minTickGap={14} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={kLabel} width={52} />
                  <Tooltip cursor={{ fill: 'var(--secondary)' }} contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} formatter={(v) => [rp(Number(v)), 'Penjualan']} />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>

        <Panel title="Rincian">
          <dl className="num flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Penjualan kotor</dt><dd>{rp(stats.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Diskon</dt><dd>- {rp(stats.discount)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Pajak</dt><dd>{rp(stats.tax)}</dd></div>
            <div className="flex justify-between border-t border-border pt-2 font-bold"><dt>Total penjualan</dt><dd>{rp(stats.total)}</dd></div>
            <div className="mt-1 flex justify-between text-red-700 dark:text-red-400"><dt>Refund ({refunds.length} transaksi)</dt><dd data-testid="refund-total">- {rp(refunds.reduce((s, t) => s + t.total, 0))}</dd></div>
          </dl>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Produk Terlaris" bodyClassName="px-0 pb-1">
          {top.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada penjualan pada rentang ini.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm" data-testid="tabel-terlaris">
                <thead><tr className="border-y border-border bg-secondary/60 text-[13px] text-muted-foreground">
                  <th className="w-12 px-5 py-2.5 text-left font-medium">#</th><th className="px-3 py-2.5 text-left font-medium">Produk</th>
                  <th className="px-3 py-2.5 text-right font-medium">Terjual</th><th className="px-5 py-2.5 text-right font-medium">Pendapatan</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {top.map((p, i) => (
                    <tr key={p.name} className="hover:bg-secondary/50">
                      <td className="num px-5 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium">{p.name}</td>
                      <td className="num px-3 py-2.5 text-right">{formatNumber(p.qty)} pcs</td>
                      <td className="num px-5 py-2.5 text-right font-semibold">{rp(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <Panel title="Metode Pembayaran">
            <ul className="flex flex-col divide-y divide-border text-sm">
              {(Object.keys(byMethod) as PaymentMethod[]).map((m) => (
                <li key={m} className="flex items-center gap-2 py-2.5">
                  <span className="flex-1"><MethodBadge method={m} /></span>
                  <span className="num text-muted-foreground">{byMethod[m]} trx</span>
                  <span className="num w-28 text-right font-semibold">{rp(methodRev(m))}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Penjualan per Kasir">
            {byCashier.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Belum ada data.</p> : (
              <ul className="flex flex-col divide-y divide-border text-sm">
                {byCashier.map(([name, v]) => (
                  <li key={name} className="flex items-center gap-2 py-2.5">
                    <span className="flex-1 font-medium">{name}</span>
                    <span className="num text-muted-foreground">{v.count} trx</span>
                    <span className="num w-28 text-right font-semibold">{rp(v.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
