import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Boxes, Search, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState, PageHeader, SimpleSelect, StockBadge } from '@/components/common'
import { ProductArt } from '@/components/ProductArt'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import type { Product } from '@/types'

type Mode = 'masuk' | 'keluar' | 'setel'

function AdjustDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const adjustStock = useStore((s) => s.adjustStock)
  const [mode, setMode] = useState<Mode>('masuk')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const n = qty === '' ? NaN : Number(qty)
  const preview = Number.isInteger(n) ? (mode === 'masuk' ? product.stock + n : mode === 'keluar' ? product.stock - n : n) : null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (qty === '' || !/^\d+$/.test(qty)) return setError('Masukkan jumlah berupa bilangan bulat ≥ 0.')
    const r = adjustStock(product.id, mode, Number(qty), note)
    if (!r.ok) return setError(r.error ?? 'Gagal menyesuaikan stok.')
    toast.success(`Stok ${product.name} diperbarui.`)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Ubah Stok</DialogTitle>
            <DialogDescription>{product.name} — stok saat ini <b className="num text-foreground">{formatNumber(product.stock)}</b></DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label="Jenis penyesuaian" className="grid grid-cols-3 gap-1.5 rounded-lg bg-secondary p-1">
            {([['masuk', 'Stok Masuk'], ['keluar', 'Stok Keluar'], ['setel', 'Penyesuaian']] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => { setMode(v); setError('') }}
                className={cn('press h-9 rounded-md text-sm font-medium', mode === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}>{l}</button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-qty">{mode === 'setel' ? 'Stok sebenarnya' : 'Jumlah'}</Label>
            <Input id="adj-qty" inputMode="numeric" autoFocus value={qty} aria-invalid={!!error} aria-describedby={error ? 'adj-err' : undefined}
              onChange={(e) => { setQty(e.target.value.replace(/[^\d]/g, '')); setError('') }} className="num h-10" />
            {preview !== null && <p className="num text-xs text-muted-foreground">Stok setelah penyesuaian: <b className={cn(preview < 0 ? 'text-red-700 dark:text-red-400' : 'text-foreground')}>{formatNumber(preview)}</b></p>}
            {error && <p id="adj-err" role="alert" className="text-xs text-red-700 dark:text-red-400">{error}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-note">Catatan</Label>
            <Textarea id="adj-note" rows={2} placeholder="Contoh: barang datang, rusak, hasil stok opname" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10" onClick={onClose}>Batal</Button>
            <Button type="submit" className="h-10 px-5 font-semibold">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Inventory() {
  const products = useStore((s) => s.products)
  const movements = useStore((s) => s.movements)
  const [tab, setTab] = useState<'stok' | 'riwayat'>('stok')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('semua')
  const [adjusting, setAdjusting] = useState<Product | null>(null)

  const totalStok = products.reduce((s, p) => s + p.stock, 0)
  const habis = products.filter((p) => p.stock <= 0)
  const menipis = products.filter((p) => p.stock > 0 && p.stock <= p.minStock)
  const tersedia = products.length - habis.length - menipis.length

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products
      .filter((p) => !s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
      .filter((p) => status === 'semua' || (status === 'habis' ? p.stock <= 0 : status === 'menipis' ? p.stock > 0 && p.stock <= p.minStock : p.stock > p.minStock))
      .sort((a, b) => a.stock - b.stock)
  }, [products, q, status])

  const hist = useMemo(() => {
    const s = q.trim().toLowerCase()
    return movements.filter((m) => !s || m.productName.toLowerCase().includes(s) || m.note.toLowerCase().includes(s))
  }, [movements, q])

  const cards = [
    { label: 'Total Stok', value: formatNumber(totalStok), sub: 'unit semua produk', tone: '' },
    { label: 'Stok Tersedia', value: String(tersedia), sub: 'produk aman', tone: 'text-green-700 dark:text-green-400' },
    { label: 'Stok Menipis', value: String(menipis.length), sub: 'perlu segera diisi', tone: 'text-yellow-900 dark:text-yellow-300' },
    { label: 'Produk Habis', value: String(habis.length), sub: 'tidak bisa dijual', tone: 'text-red-700 dark:text-red-400' },
  ]

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Inventaris" description="Pantau stok, sesuaikan jumlah, dan lihat riwayat perubahannya." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface p-4 sm:p-5">
            <p className="text-[13px] text-muted-foreground">{c.label}</p>
            <p className={cn('num mt-1.5 text-[28px] leading-none font-bold', c.tone)}>{c.value}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="surface mt-4">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div role="tablist" aria-label="Tampilan inventaris" className="flex rounded-lg bg-secondary p-1">
            {([['stok', 'Daftar Stok'], ['riwayat', 'Riwayat Perubahan']] as const).map(([v, l]) => (
              <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
                className={cn('press h-9 rounded-md px-4 text-sm font-medium', tab === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}>{l}</button>
            ))}
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input type="search" aria-label="Cari inventaris" placeholder={tab === 'stok' ? 'Cari produk atau SKU' : 'Cari produk atau catatan'} value={q} onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-secondary/50 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30" />
          </div>
          {tab === 'stok' && (
            <SimpleSelect ariaLabel="Filter status stok" value={status} onChange={setStatus}
              options={[{ value: 'semua', label: 'Semua Status' }, { value: 'tersedia', label: 'Tersedia' }, { value: 'menipis', label: 'Menipis' }, { value: 'habis', label: 'Habis' }]} />
          )}
        </div>

        {tab === 'stok' ? (
          list.length === 0 ? (
            <EmptyState icon={<Boxes className="size-5" />} title="Tidak ada produk yang cocok" description="Ubah kata kunci atau filter status." />
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm" data-testid="tabel-inventaris">
                <thead>
                  <tr className="text-left text-[13px] text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Produk</th>
                    <th className="px-3 py-3 text-right font-medium">Stok</th>
                    <th className="px-3 py-3 text-right font-medium">Minimum</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((p) => (
                    <tr key={p.id} className="hover:bg-secondary/40" data-testid="baris-inventaris">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductArt product={p} className="size-10 shrink-0" />
                          <div><p className="font-semibold">{p.name}</p><p className="num text-xs text-muted-foreground">{p.sku}</p></div>
                        </div>
                      </td>
                      <td className="num px-3 py-3 text-right text-base font-bold">{formatNumber(p.stock)}</td>
                      <td className="num px-3 py-3 text-right text-muted-foreground">{formatNumber(p.minStock)}</td>
                      <td className="px-3 py-3"><StockBadge stock={p.stock} min={p.minStock} /></td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" className="h-9 gap-2" onClick={() => setAdjusting(p)} aria-label={`Sesuaikan stok ${p.name}`}>
                          <SlidersHorizontal className="size-3.5" aria-hidden /> Sesuaikan
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : hist.length === 0 ? (
          <EmptyState icon={<Boxes className="size-5" />} title="Belum ada riwayat" description="Perubahan stok dari penjualan dan penyesuaian akan tercatat di sini." />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm" data-testid="tabel-riwayat-stok">
              <thead>
                <tr className="text-left text-[13px] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Waktu</th>
                  <th className="px-3 py-3 font-medium">Produk</th>
                  <th className="px-3 py-3 font-medium">Jenis</th>
                  <th className="px-3 py-3 text-right font-medium">Perubahan</th>
                  <th className="px-3 py-3 text-right font-medium">Stok</th>
                  <th className="px-4 py-3 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hist.slice(0, 100).map((m) => (
                  <tr key={m.id} className="hover:bg-secondary/40" data-testid="baris-riwayat-stok">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(m.createdAt)}</td>
                    <td className="px-3 py-3 font-medium">{m.productName}</td>
                    <td className="px-3 py-3">{m.type}</td>
                    <td className={cn('num px-3 py-3 text-right font-bold', m.delta < 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400')}>
                      <span className="inline-flex items-center gap-1">{m.delta < 0 ? <ArrowDownRight className="size-3.5" aria-hidden /> : <ArrowUpRight className="size-3.5" aria-hidden />}{m.delta > 0 ? '+' : ''}{formatNumber(m.delta)}</span>
                    </td>
                    <td className="num px-3 py-3 text-right text-muted-foreground">{formatNumber(m.before)} → {formatNumber(m.after)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjusting && <AdjustDialog product={products.find((p) => p.id === adjusting.id) ?? adjusting} onClose={() => setAdjusting(null)} />}
    </div>
  )
}
