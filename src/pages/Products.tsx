import { useMemo, useState } from 'react'
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, Pill, EmptyState, PageHeader, SimpleSelect, StockBadge } from '@/components/common'
import { CategoryManager } from '@/components/CategoryManager'
import { ProductFormDialog } from '@/components/ProductForm'
import { ProductArt } from '@/components/ProductArt'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useMoney } from '@/hooks/useMoney'
import { formatNumber } from '@/lib/format'
import { useStore } from '@/store/useStore'
import type { Product } from '@/types'

type Sort = 'nama' | 'harga-naik' | 'harga-turun' | 'stok-naik' | 'stok-turun'

export default function Products() {
  const rp = useMoney()
  const wide = useMediaQuery('(min-width: 768px)')
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const deleteProduct = useStore((s) => s.deleteProduct)
  const [catOpen, setCatOpen] = useState(false)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('semua')
  const [status, setStatus] = useState<string>('semua')
  const [sort, setSort] = useState<Sort>('nama')
  const [form, setForm] = useState<{ open: boolean; product: Product | null; key: number }>({ open: false, product: null, key: 0 })
  const [del, setDel] = useState<Product | null>(null)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const out = products.filter((p) => {
      if (s && !(p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || p.barcode.includes(s))) return false
      if (cat !== 'semua' && p.category !== cat) return false
      if (status === 'aktif' && !p.active) return false
      if (status === 'nonaktif' && p.active) return false
      if (status === 'menipis' && !(p.stock > 0 && p.stock <= p.minStock)) return false
      if (status === 'habis' && p.stock > 0) return false
      return true
    })
    const cmp: Record<Sort, (a: Product, b: Product) => number> = {
      nama: (a, b) => a.name.localeCompare(b.name, 'id'),
      'harga-naik': (a, b) => a.price - b.price,
      'harga-turun': (a, b) => b.price - a.price,
      'stok-naik': (a, b) => a.stock - b.stock,
      'stok-turun': (a, b) => b.stock - a.stock,
    }
    return out.sort(cmp[sort])
  }, [products, q, cat, status, sort])

  const openForm = (product: Product | null) => setForm((f) => ({ open: true, product, key: f.key + 1 }))

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Produk"
        description={`${formatNumber(products.length)} produk terdaftar. Perubahan langsung tampil di katalog Kasir.`}
        actions={
          <>
            <Button variant="outline" className="h-10" onClick={() => setCatOpen(true)}>Kelola Kategori</Button>
            <Button className="h-10 gap-2 px-4 font-semibold" onClick={() => openForm(null)}>
              <Plus className="size-4" aria-hidden /> Tambah Produk
            </Button>
          </>
        }
      />

      <div className="surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              aria-label="Cari produk"
              placeholder="Cari nama, SKU, atau barcode"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-secondary/50 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </div>
          <SimpleSelect ariaLabel="Filter kategori" value={cat} onChange={setCat} options={[{ value: 'semua', label: 'Semua Kategori' }, ...categories.map((c) => ({ value: c, label: c }))]} />
          <SimpleSelect
            ariaLabel="Filter status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'semua', label: 'Semua Status' },
              { value: 'aktif', label: 'Aktif' },
              { value: 'nonaktif', label: 'Nonaktif' },
              { value: 'menipis', label: 'Stok Menipis' },
              { value: 'habis', label: 'Stok Habis' },
            ]}
          />
          <SimpleSelect<Sort>
            ariaLabel="Urutkan"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'nama', label: 'Urut: Nama A–Z' },
              { value: 'harga-naik', label: 'Urut: Harga Termurah' },
              { value: 'harga-turun', label: 'Urut: Harga Termahal' },
              { value: 'stok-naik', label: 'Urut: Stok Tersedikit' },
              { value: 'stok-turun', label: 'Urut: Stok Terbanyak' },
            ]}
            className="min-w-48"
          />
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={<Package className="size-5" />}
            title={products.length === 0 ? 'Belum ada produk' : 'Tidak ada produk yang cocok'}
            description={products.length === 0 ? 'Tambahkan produk pertama Anda untuk mulai berjualan.' : 'Ubah kata kunci atau filter.'}
            action={products.length === 0 ? <Button onClick={() => openForm(null)}>Tambah Produk</Button> : undefined}
          />
        ) : (
          wide ? (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm" data-testid="tabel-produk">
                <thead>
                  <tr className="text-left text-[13px] text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Produk</th>
                    <th className="px-3 py-3 font-medium">SKU</th>
                    <th className="px-3 py-3 font-medium">Kategori</th>
                    <th className="px-3 py-3 text-right font-medium">Harga Jual</th>
                    <th className="px-3 py-3 text-right font-medium">Modal</th>
                    <th className="px-3 py-3 text-right font-medium">Stok</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((p) => (
                    <tr key={p.id} className="hover:bg-secondary/40" data-testid="baris-produk">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductArt product={p} className="size-11 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold">{p.name}</p>
                            <p className="num text-xs text-muted-foreground">{p.barcode || 'Tanpa barcode'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="num px-3 py-3 text-muted-foreground">{p.sku}</td>
                      <td className="px-3 py-3 text-muted-foreground">{p.category}</td>
                      <td className="num px-3 py-3 text-right font-semibold">{rp(p.price)}</td>
                      <td className="num px-3 py-3 text-right text-muted-foreground">{rp(p.cost)}</td>
                      <td className="num px-3 py-3 text-right font-semibold">{formatNumber(p.stock)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StockBadge stock={p.stock} min={p.minStock} />
                          {!p.active && <Pill tone="slate">Nonaktif</Pill>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label={`Ubah ${p.name}`} onClick={() => openForm(p)}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" size="icon" aria-label={`Hapus ${p.name}`} className="text-red-700 dark:text-red-400 hover:text-red-600" onClick={() => setDel(p)}><Trash2 className="size-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((p) => (
                <li key={p.id} className="flex gap-3 p-4" data-testid="baris-produk">
                  <ProductArt product={p} className="size-16 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className="num text-xs text-muted-foreground">{p.sku} · {p.category}</p>
                    <p className="num mt-1 text-sm font-semibold">{rp(p.price)} <span className="font-normal text-muted-foreground">· Stok {formatNumber(p.stock)}</span></p>
                    <div className="mt-2 flex items-center justify-between">
                      <StockBadge stock={p.stock} min={p.minStock} />
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" aria-label={`Ubah ${p.name}`} onClick={() => openForm(p)}><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon" aria-label={`Hapus ${p.name}`} className="text-red-700 dark:text-red-400" onClick={() => setDel(p)}><Trash2 className="size-4" /></Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      <CategoryManager open={catOpen} onOpenChange={setCatOpen} />
      <ProductFormDialog key={form.key} product={form.product} open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))} />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Hapus ${del?.name ?? 'produk'}?`}
        description="Produk akan dihapus dari katalog. Riwayat transaksi yang sudah tercatat tidak berubah."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          if (del) {
            deleteProduct(del.id)
            toast.success(`${del.name} dihapus.`)
          }
        }}
      />
    </div>
  )
}
