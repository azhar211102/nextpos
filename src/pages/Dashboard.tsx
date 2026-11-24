import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChartColumn } from 'lucide-react'
import { MethodBadge, PageHeader, Panel, SimpleSelect, StockBadge } from '@/components/common'
import { ProductArt } from '@/components/ProductArt'
import { Button } from '@/components/ui/button'
import { useValidTransactions } from '@/hooks/useData'
import { useMoney } from '@/hooks/useMoney'
import { dayKey, formatDateLong, formatNumber, formatTime, pct } from '@/lib/format'
import { change, hourlySeries, kLabel, methodBreakdown, summarize, topProducts, txOnDay } from '@/lib/stats'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import type { PaymentMethod } from '@/types'

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">Belum ada pembanding</span>
  const up = value >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('num inline-flex items-center gap-0.5 text-xs font-semibold', up ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
      <Icon className="size-3.5" aria-hidden />
      {pct(Math.abs(value))}
      <span className="sr-only"> {up ? 'naik' : 'turun'} dibanding kemarin pada jam yang sama</span>
      <span className="ml-1 font-normal text-muted-foreground" aria-hidden>vs kemarin</span>
    </span>
  )
}

const METHOD_COLOR: Record<PaymentMethod, string> = { Tunai: 'var(--chart-1)', QRIS: 'var(--chart-2)', Kartu: 'var(--chart-3)' }
const METHOD_NAME: Record<PaymentMethod, string> = { Tunai: 'Tunai', QRIS: 'QRIS', Kartu: 'Kartu Debit/Kredit' }

export default function Dashboard() {
  const rp = useMoney()
  const valid = useValidTransactions()
  const products = useStore((s) => s.products)
  const [selected, setSelected] = useState(() => dayKey(new Date()))

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return { value: dayKey(d), label: formatDateLong(d) } }),
    [],
  )
  const isToday = selected === dayKey(new Date())
  const dayTx = useMemo(() => txOnDay(valid, selected), [valid, selected])
  const prevTx = useMemo(() => {
    const prev = new Date(`${selected}T12:00:00`)
    prev.setDate(prev.getDate() - 1)
    const all = txOnDay(valid, dayKey(prev))
    if (!isToday) return all
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    return all.filter((t) => { const x = new Date(t.createdAt); return x.getHours() * 60 + x.getMinutes() <= nowMin })
  }, [valid, selected, isToday])
  const cur = summarize(dayTx)
  const prev = summarize(prevTx)
  const series = useMemo(() => hourlySeries(dayTx), [dayTx])
  const breakdown = methodBreakdown(dayTx)
  const best = topProducts(dayTx, products, 5)
  const maxQty = Math.max(1, ...best.map((b) => b.qty))
  const recent = dayTx.slice(0, 5)

  const active = products.filter((p) => p.active)
  const attention = active.filter((p) => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock)
  const habis = attention.filter((p) => p.stock <= 0).length

  const kpis = [
    { label: isToday ? 'Total Penjualan Hari Ini' : 'Total Penjualan', value: rp(cur.revenue), delta: change(cur.revenue, prev.revenue) },
    { label: 'Jumlah Transaksi', value: formatNumber(cur.count), delta: change(cur.count, prev.count) },
    { label: 'Rata-rata Transaksi', value: rp(cur.avg), delta: change(cur.avg, prev.avg) },
    { label: 'Total Produk', value: formatNumber(products.length), hint: `${active.length} aktif · ${habis} habis` },
  ]

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Ringkasan"
        description={isToday ? 'Performa penjualan toko Anda hari ini.' : 'Performa penjualan pada tanggal terpilih.'}
        actions={
          <>
            <div className="flex items-center rounded-md border border-input bg-card pl-3">
              <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
              <SimpleSelect ariaLabel="Pilih tanggal" value={selected} onChange={setSelected} options={days} className="h-10 min-w-[230px] border-0" />
            </div>
            <Button variant="outline" className="h-10 gap-2" render={<Link to="/laporan" />} nativeButton={false}>
              <ChartColumn className="size-4" aria-hidden /> Lihat Laporan
            </Button>
          </>
        }
      />

      <section aria-label="Ringkasan angka" className="surface grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
        {kpis.map((k, i) => (
          <div key={k.label} className={cn('p-5', i % 2 === 1 && 'sm:border-l sm:border-border xl:border-l-0', i >= 2 && 'sm:border-t sm:border-border xl:border-t-0')}>
            <p className="text-[13px] text-muted-foreground">{k.label}</p>
            <p className="num mt-1.5 truncate text-[26px] leading-tight font-bold">{k.value}</p>
            <div className="mt-1 h-5">{'delta' in k ? <Delta value={k.delta ?? null} /> : <span className="text-xs text-muted-foreground">{k.hint}</span>}</div>
          </div>
        ))}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Penjualan per Jam" bodyClassName="flex pb-3">
          <div className="relative min-h-[260px] flex-1" role="img" aria-label="Grafik penjualan per jam">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--input)' }} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval="preserveStartEnd" minTickGap={18} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={kLabel} width={52} />
                  <Tooltip cursor={{ stroke: 'var(--chart-3)' }} contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, boxShadow: '0 4px 12px rgba(23,32,46,.08)' }} labelStyle={{ color: 'var(--muted-foreground)' }} formatter={(v) => [rp(Number(v)), 'Penjualan']} />
                  <Area type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} fill="var(--chart-1)" fillOpacity={0.1} dot={false} activeDot={{ r: 4, fill: 'var(--card)', stroke: 'var(--chart-1)', strokeWidth: 2 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>

        <Panel title="Produk Terlaris" action={<Link to="/laporan" className="text-[13px] font-medium text-sky hover:underline">Lihat Semua</Link>}>
          {best.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada penjualan pada tanggal ini.</p>
          ) : (
            <ol className="flex flex-col gap-3.5">
              {best.map(({ product, qty }) => (
                <li key={product.id} className="flex items-center gap-3">
                  <ProductArt product={product} className="size-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{product.name}</p>
                      <p className="num text-sm font-semibold">{formatNumber(qty)} pcs</p>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-secondary" aria-hidden><div className="h-full rounded-full bg-primary" style={{ width: `${(qty / maxQty) * 100}%` }} /></div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Transaksi Terbaru" action={<Link to="/transaksi" className="text-[13px] font-medium text-sky hover:underline">Lihat Semua</Link>} bodyClassName="px-0 pb-1">
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada transaksi pada tanggal ini.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-y border-border bg-secondary/60 text-[13px] text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-medium">No. Transaksi</th>
                    <th className="px-3 py-2.5 text-left font-medium">Waktu</th>
                    <th className="px-3 py-2.5 text-center font-medium">Item</th>
                    <th className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th className="px-5 py-2.5 text-center font-medium">Metode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recent.map((t) => (
                    <tr key={t.id} className="hover:bg-secondary/50">
                      <td className="px-5 py-3"><Link to={`/struk/${t.id}`} className="num font-medium text-sky hover:underline">{t.id}</Link></td>
                      <td className="num px-3 py-3">{formatTime(t.createdAt)}</td>
                      <td className="num px-3 py-3 text-center">{t.items.reduce((n, i) => n + i.qty, 0)}</td>
                      <td className="num px-3 py-3 text-right font-semibold">{rp(t.total)}</td>
                      <td className="px-5 py-3 text-center"><MethodBadge method={t.method} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <Panel title="Metode Pembayaran">
            {dayTx.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Belum ada pembayaran.</p>
            ) : (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-secondary" role="img" aria-label="Komposisi metode pembayaran">
                  {(Object.keys(breakdown) as PaymentMethod[]).map((m) => (
                    <span key={m} style={{ width: `${(breakdown[m] / dayTx.length) * 100}%`, background: METHOD_COLOR[m] }} />
                  ))}
                </div>
                <ul className="mt-4 flex flex-col divide-y divide-border text-sm">
                  {(Object.keys(breakdown) as PaymentMethod[]).map((m) => (
                    <li key={m} className="flex items-center gap-2.5 py-2">
                      <span className="size-2.5 rounded-full" style={{ background: METHOD_COLOR[m] }} aria-hidden />
                      <span className="flex-1">{METHOD_NAME[m]}</span>
                      <span className="num text-muted-foreground">{breakdown[m]} trx</span>
                      <span className="num w-12 text-right font-semibold">{Math.round((breakdown[m] / dayTx.length) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          <Panel title="Stok Perlu Perhatian" action={<Link to="/inventaris" className="text-[13px] font-medium text-sky hover:underline">Kelola</Link>}>
            {attention.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Semua stok aman.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border text-sm">
                {attention.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center gap-2 py-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <span className="num text-muted-foreground">{formatNumber(p.stock)} pcs</span>
                    <StockBadge stock={p.stock} min={p.minStock} />
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
