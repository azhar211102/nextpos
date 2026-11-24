import { useMemo, useState } from 'react'
import { PackageSearch, Search, ShoppingCart, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { Cart } from '@/components/Cart'
import { EmptyState } from '@/components/common'
import { ProductArt } from '@/components/ProductArt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useCartTotals, useMoney } from '@/hooks/useMoney'
import { formatNumber, parseMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

type Tab = 'favorit' | 'katalog' | 'bebas'

function CustomItemForm() {
  const addCustomItem = useStore((s) => s.addCustomItem)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [err, setErr] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const r = addCustomItem(name || 'Item bebas', parseMoney(price))
    if (!r.ok) return setErr(r.error ?? 'Gagal menambah item.')
    toast.success('Item bebas ditambahkan.')
    setName(''); setPrice(''); setErr('')
  }
  return (
    <form onSubmit={submit} noValidate className="surface mt-4 flex max-w-lg flex-col gap-4 p-5">
      <div>
        <h2 className="text-base font-bold">Nominal Bebas</h2>
        <p className="text-sm text-muted-foreground">Untuk barang atau jasa yang tidak ada di katalog. Item bebas tidak mengurangi stok.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bebas-nama">Nama item</Label>
        <Input id="bebas-nama" value={name} placeholder="Item bebas" onChange={(e) => setName(e.target.value)} className="h-10" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bebas-harga">Harga (Rp)</Label>
        <Input id="bebas-harga" inputMode="numeric" value={price} placeholder="0" aria-invalid={!!err} aria-describedby={err ? 'bebas-err' : undefined}
          onChange={(e) => { const n = parseMoney(e.target.value); setPrice(e.target.value === '' ? '' : formatNumber(n)); setErr('') }} className="num h-10" />
        {err && <p id="bebas-err" role="alert" className="text-xs text-red-700 dark:text-red-400">{err}</p>}
      </div>
      <Button type="submit" className="h-10 self-start px-5 font-semibold">Tambah ke Pesanan</Button>
    </form>
  )
}

export default function Pos() {
  const rp = useMoney()
  const wide = useMediaQuery('(min-width: 768px)')
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const cart = useStore((s) => s.cart)
  const addToCart = useStore((s) => s.addToCart)
  const totals = useCartTotals()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('katalog')
  const [cat, setCat] = useState<string>('Semua')
  const [sheetOpen, setSheetOpen] = useState(false)

  const base = useMemo(() => products.filter((p) => p.active), [products])
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    let src = base
    if (tab === 'favorit' && !q) {
      const fav = base.filter((p) => p.favorite)
      src = fav.length ? fav : base
    } else if (cat !== 'Semua') src = base.filter((p) => p.category === cat)
    return src.filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q))
  }, [base, query, tab, cat])

  const add = (id: string) => {
    const r = addToCart(id)
    if (!r.ok && r.error) toast.error(r.error)
  }

  // Enter di kolom cari: tambahkan hasil tunggal / cocok barcode atau SKU persis (seperti pemindai).
  const onSearchEnter = () => {
    const q = query.trim().toLowerCase()
    if (!q) return
    const exact = base.find((p) => p.barcode === q || p.sku.toLowerCase() === q)
    const target = exact ?? (list.length === 1 ? list[0] : undefined)
    if (target) {
      add(target.id)
      setQuery('')
    }
  }

  const countOf = (id: string) => cart.find((l) => l.productId === id)?.qty ?? 0
  const TABS: { id: Tab; label: string }[] = [{ id: 'favorit', label: 'Favorit' }, { id: 'katalog', label: 'Katalog' }, { id: 'bebas', label: 'Nominal Bebas' }]

  return (
    <div className="mx-auto max-w-[1500px] md:grid md:grid-cols-[minmax(0,1fr)_350px] md:items-start md:gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
      <div className="min-w-0 pb-24 md:pb-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-2xl leading-tight font-bold">Kasir</h1>
          <div role="tablist" aria-label="Tampilan produk" className="flex rounded-md bg-secondary p-1">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={cn('press inline-flex h-8 items-center gap-1.5 rounded px-3.5 text-sm font-medium', tab === t.id ? 'bg-card font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {t.id === 'favorit' && <Star className="size-3.5" aria-hidden />}{t.label}
              </button>
            ))}
          </div>
        </div>

        {tab !== 'bebas' && (
          <>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input type="search" aria-label="Cari produk" placeholder="Cari nama, SKU, atau scan barcode" value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearchEnter()}
                className="h-10 w-full rounded-md border border-input bg-card pr-9 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25" />
              {query && (
                <button type="button" aria-label="Hapus pencarian" onClick={() => setQuery('')} className="press absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-secondary"><X className="size-4" /></button>
              )}
            </div>

            {tab === 'katalog' && (
              <div role="tablist" aria-label="Kategori produk" className="-mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {['Semua', ...categories].map((c) => (
                  <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
                    className={cn('press h-8 shrink-0 rounded-md border px-3.5 text-sm font-medium', cat === c ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground/80 hover:bg-secondary')}>{c}</button>
                ))}
              </div>
            )}

            {list.length === 0 ? (
              <div className="surface mt-3">
                <EmptyState icon={<PackageSearch className="size-5" />} title="Produk tidak ditemukan" description="Coba kata kunci lain atau pilih kategori Semua." />
              </div>
            ) : (
              <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" data-testid="katalog">
                {list.map((p) => {
                  const out = p.stock <= 0
                  const low = !out && p.stock <= p.minStock
                  const n = countOf(p.id)
                  return (
                    <li key={p.id}>
                      <button type="button" disabled={out} onClick={() => add(p.id)}
                        aria-label={out ? `${p.name}, stok habis` : `Tambah ${p.name} ke keranjang`} data-testid="produk-kartu"
                        className={cn('press group relative flex w-full flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50', n > 0 ? 'border-primary' : 'border-border')}>
                        <ProductArt product={p} rounded={false} className="aspect-square w-full" />
                        {n > 0 && <span className="num absolute top-1.5 right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">{n}</span>}
                        {(out || low) && (
                          <span className={cn('absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold', out ? 'bg-red-600 text-white' : 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-900 dark:text-yellow-300')}>
                            {out ? 'Habis' : `Sisa ${formatNumber(p.stock)}`}
                          </span>
                        )}
                        <div className="p-2">
                          <p className="line-clamp-2 min-h-[2.25rem] text-[13px] leading-[1.15rem] font-medium">{p.name}</p>
                          <p className="num mt-0.5 text-sm font-bold">{rp(p.price)}</p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
        {tab === 'bebas' && <CustomItemForm />}
      </div>

      {wide && (
        <aside aria-label="Keranjang belanja" className="surface sticky top-[3.75rem] h-[calc(100dvh-4.5rem)] overflow-hidden">
          <Cart />
        </aside>
      )}

      {!wide && (
        <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card p-3">
          <button type="button" onClick={() => setSheetOpen(true)} className="press flex h-12 w-full items-center justify-between rounded-md bg-primary px-4 text-primary-foreground" aria-label={`Buka keranjang, ${totals.itemCount} barang`}>
            <span className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="size-5" aria-hidden /> Pesanan
              <span className="num rounded-full bg-white/25 px-2 text-sm">{totals.itemCount}</span>
            </span>
            <span className="num font-bold">{rp(totals.total)}</span>
          </button>
        </div>
      )}
      {!wide && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="h-[90dvh] gap-0 rounded-t-xl border-border bg-card p-0">
            <SheetTitle className="sr-only">Keranjang belanja</SheetTitle>
            <SheetDescription className="sr-only">Daftar produk yang akan dibayar</SheetDescription>
            <Cart inSheet onProceed={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
