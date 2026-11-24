import { useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { SimpleSelect } from '@/components/common'
import { ProductArt } from '@/components/ProductArt'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { fileToThumbnail } from '@/lib/images'
import { formatNumber, parseMoney } from '@/lib/format'
import { useStore } from '@/store/useStore'
import { type ArtKind, type Category, type Product } from '@/types'

/** Ilustrasi bawaan menurut nama kategori (tebakan sederhana); foto unggahan menggantikannya. */
function artFor(category: string): { art: ArtKind; color: string; accent: string } {
  const c = category.toLowerCase()
  if (/kopi|minum|jus|teh|susu/.test(c)) return { art: 'glass', color: '#9A6A45', accent: '#F4E6D4' }
  if (/roti|kue|dessert|pencuci/.test(c)) return { art: 'cake', color: '#C98B4B', accent: '#4A2C1A' }
  if (/camil|snack/.test(c)) return { art: 'chips', color: '#D8412F', accent: '#FFD66B' }
  if (/utama|makan|nasi|lauk/.test(c)) return { art: 'plate', color: '#C77D3A', accent: '#FFF1DC' }
  if (/harian|kebutuhan|rumah/.test(c)) return { art: 'sugar', color: '#E9E4D8', accent: '#C0392B' }
  return { art: 'bread', color: '#C98B4B', accent: '#4A2C1A' }
}

interface Draft {
  name: string; sku: string; barcode: string; category: Category
  price: string; cost: string; stock: string; minStock: string
  active: boolean; favorite: boolean; image?: string
}
type Errors = Partial<Record<keyof Draft, string>>

function toDraft(p: Product | null, nextSku: string, defMin: number, firstCat: string): Draft {
  return p
    ? {
        name: p.name, sku: p.sku, barcode: p.barcode, category: p.category,
        price: formatNumber(p.price), cost: formatNumber(p.cost), stock: String(p.stock), minStock: String(p.minStock),
        active: p.active, favorite: !!p.favorite, image: p.image,
      }
    : { name: '', sku: nextSku, barcode: '', category: firstCat, price: '', cost: '', stock: '0', minStock: String(defMin), active: true, favorite: false }
}

export function ProductFormDialog({ product, open, onOpenChange }: { product: Product | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const products = useStore((s) => s.products)
  const lowDefault = useStore((s) => s.settings.lowStockThreshold)
  const categories = useStore((s) => s.categories)
  const addProduct = useStore((s) => s.addProduct)
  const updateProduct = useStore((s) => s.updateProduct)
  const nextSku = `NXP-${String(products.length + 1).padStart(3, '0')}`
  // Draft diinisialisasi ulang setiap dialog dibuka (komponen di-remount via `key` dari pemanggil).
  const [d, setD] = useState<Draft>(() => toDraft(product, nextSku, lowDefault, categories[0] ?? "Umum"))
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const validate = (): Errors => {
    const e: Errors = {}
    if (!d.name.trim()) e.name = 'Nama produk wajib diisi.'
    if (!d.sku.trim()) e.sku = 'SKU wajib diisi.'
    else if (products.some((p) => p.id !== product?.id && p.sku.toLowerCase() === d.sku.trim().toLowerCase())) e.sku = 'SKU sudah dipakai produk lain.'
    if (d.barcode.trim() && !/^\d{6,14}$/.test(d.barcode.trim())) e.barcode = 'Barcode harus 6–14 digit angka.'
    else if (d.barcode.trim() && products.some((p) => p.id !== product?.id && p.barcode === d.barcode.trim())) e.barcode = 'Barcode sudah dipakai produk lain.'
    if (parseMoney(d.price) <= 0) e.price = 'Harga jual harus lebih dari 0.'
    if (d.cost.trim() === '') e.cost = 'Harga modal wajib diisi (boleh 0).'
    if (!/^\d+$/.test(d.stock)) e.stock = 'Stok harus bilangan bulat ≥ 0.'
    if (!/^\d+$/.test(d.minStock)) e.minStock = 'Stok minimum harus bilangan bulat ≥ 0.'
    return e
  }

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    const base = artFor(d.category)
    const data = {
      name: d.name.trim(), sku: d.sku.trim(), barcode: d.barcode.trim(), category: d.category,
      price: parseMoney(d.price), cost: parseMoney(d.cost), stock: Number(d.stock), minStock: Number(d.minStock),
      active: d.active, favorite: d.favorite, image: d.image,
    }
    if (product) {
      updateProduct(product.id, data)
      toast.success(`${data.name} berhasil diubah.`)
    } else {
      addProduct({ ...data, ...base })
      toast.success(`${data.name} berhasil ditambahkan.`)
    }
    onOpenChange(false)
  }

  const onFile = async (f?: File) => {
    if (!f) return
    setBusy(true)
    try {
      set('image', await fileToThumbnail(f))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memproses gambar.')
    } finally {
      setBusy(false)
    }
  }

  const field = (id: keyof Draft, label: string, input: React.ReactNode, hint?: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`f-${id}`}>{label}</Label>
      {input}
      {errors[id] ? <p id={`e-${id}`} role="alert" className="text-xs text-red-700 dark:text-red-400">{errors[id]}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
  const txt = (id: keyof Draft, props: React.ComponentProps<typeof Input> = {}) => (
    <Input
      id={`f-${id}`}
      value={String(d[id] ?? '')}
      aria-invalid={!!errors[id]}
      aria-describedby={errors[id] ? `e-${id}` : undefined}
      onChange={(e) => set(id, e.target.value as never)}
      className="h-10"
      {...props}
    />
  )
  const money = (id: 'price' | 'cost') =>
    txt(id, {
      inputMode: 'numeric',
      placeholder: '0',
      onChange: (e) => { const n = parseMoney(e.target.value); set(id, (e.target.value === '' ? '' : formatNumber(n)) as never) },
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="text-lg">{product ? 'Ubah Produk' : 'Tambah Produk'}</DialogTitle>
            <DialogDescription>{product ? 'Perubahan langsung tampil di katalog Kasir.' : 'Produk baru langsung tampil di katalog Kasir.'}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
            <div className="flex items-center gap-4 sm:col-span-2">
              <ProductArt product={{ ...artFor(d.category), name: d.name || 'Produk', image: d.image }} className="size-20 shrink-0" />
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-9 gap-2" disabled={busy} render={<label htmlFor="f-foto" />} nativeButton={false}>
                    <ImagePlus className="size-4" aria-hidden /> {d.image ? 'Ganti Foto' : 'Unggah Foto'}
                  </Button>
                  {d.image && (
                    <Button type="button" variant="ghost" className="h-9 gap-2 text-red-700 dark:text-red-400" onClick={() => set('image', undefined)}>
                      <Trash2 className="size-4" aria-hidden /> Hapus Foto
                    </Button>
                  )}
                </div>
                <input id="f-foto" type="file" accept="image/*" className="sr-only" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
                <p className="text-xs text-muted-foreground">JPG, PNG, atau WebP. Diperkecil otomatis dan disimpan di perangkat ini.</p>
              </div>
            </div>

            <div className="sm:col-span-2">{field('name', 'Nama Produk', txt('name', { autoFocus: true, placeholder: 'Contoh: Indomie Goreng' }))}</div>
            {field('sku', 'SKU', txt('sku'))}
            {field('barcode', 'Barcode', txt('barcode', { inputMode: 'numeric', placeholder: 'Opsional' }))}
            {field('category', 'Kategori', (
              <SimpleSelect<Category> id="f-category" value={d.category} onChange={(v) => set('category', v)} options={categories.map((c) => ({ value: c, label: c }))} className="h-10 w-full" />
            ))}
            <div className="flex items-end gap-3 pb-1.5">
              <Switch id="f-active" checked={d.active} onCheckedChange={(v) => set('active', v)} />
              <Label htmlFor="f-active">Produk aktif (tampil di Kasir)</Label>
            </div>
            <div className="flex items-center gap-3 pb-1.5 sm:col-span-2">
              <Switch id="f-favorite" checked={d.favorite} onCheckedChange={(v) => set('favorite', v)} />
              <Label htmlFor="f-favorite">Tampilkan di tab Favorit kasir</Label>
            </div>
            {field('price', 'Harga Jual (Rp)', money('price'))}
            {field('cost', 'Harga Modal (Rp)', money('cost'))}
            {field('stock', 'Jumlah Stok', txt('stock', { inputMode: 'numeric' }))}
            {field('minStock', 'Stok Minimum', txt('minStock', { inputMode: 'numeric' }), 'Status Menipis muncul saat stok ≤ nilai ini.')}
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t border-border bg-secondary/40 p-4">
            <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" className="h-10 px-5 font-semibold">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
