import { useState } from 'react'
import { Coffee, Database, RotateCcw, Store, Trash2, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, PageHeader, Panel, SimpleSelect } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { BUSINESS_LABEL, isFnb, type BusinessType, type Settings } from '@/types'

type Errors = Partial<Record<keyof Settings, string>>

export default function SettingsPage() {
  const saved = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const updateProduct = useStore((s) => s.updateProduct)
  const products = useStore((s) => s.products)
  const resetDemoData = useStore((s) => s.resetDemoData)
  const setBusinessType = useStore((s) => s.setBusinessType)
  const [pendingType, setPendingType] = useState<BusinessType | null>(null)
  const clearTransactions = useStore((s) => s.clearTransactions)
  const txCount = useStore((s) => s.transactions.length)
  const [d, setD] = useState({
    ...saved, taxRate: String(saved.taxRate), lowStockThreshold: String(saved.lowStockThreshold), serviceRate: String(saved.serviceRate), lateTolerance: String(saved.lateTolerance),
  })
  const [errors, setErrors] = useState<Errors>({})
  const [confirm, setConfirm] = useState<null | 'reset' | 'clear'>(null)
  const set = (k: keyof typeof d, v: string) => { setD((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })) }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Errors = {}
    if (!d.storeName.trim()) er.storeName = 'Nama toko wajib diisi.'
    if (!d.address.trim()) er.address = 'Alamat toko wajib diisi.'
    if (!d.phone.trim()) er.phone = 'Nomor telepon wajib diisi.'
    else if (!/^[\d\s()+-]{6,20}$/.test(d.phone.trim())) er.phone = 'Nomor telepon tidak valid.'
    const tax = Number(d.taxRate.replace(',', '.'))
    if (d.taxRate.trim() === '' || !Number.isFinite(tax) || tax < 0 || tax > 100) er.taxRate = 'Pajak harus antara 0 dan 100.'
    const svc = Number(String(d.serviceRate).replace(',', '.'))
    if (!Number.isFinite(svc) || svc < 0 || svc > 100) er.serviceRate = 'Biaya layanan harus antara 0 dan 100.'
    if (!/^\d+$/.test(String(d.lateTolerance))) er.lateTolerance = 'Toleransi harus bilangan bulat ≥ 0.'
    if (!d.shiftStart || !d.shiftEnd) er.shiftStart = 'Jam masuk dan pulang wajib diisi.'
    else if (d.shiftEnd <= d.shiftStart) er.shiftEnd = 'Jam pulang harus setelah jam masuk.'
    if (!/^\d+$/.test(d.lowStockThreshold)) er.lowStockThreshold = 'Batas stok harus bilangan bulat ≥ 0.'
    setErrors(er)
    if (Object.keys(er).length) return
    updateSettings({
      storeName: d.storeName.trim(), address: d.address.trim(), phone: d.phone.trim(), currency: d.currency,
      taxRate: tax, serviceRate: svc, shiftStart: d.shiftStart, shiftEnd: d.shiftEnd, lateTolerance: Number(d.lateTolerance), receiptNote: d.receiptNote.trim(), lowStockThreshold: Number(d.lowStockThreshold),
    })
    toast.success('Pengaturan berhasil disimpan.')
  }

  const err = (k: keyof Settings) => errors[k] && <p id={`er-${k}`} role="alert" className="text-xs text-red-700 dark:text-red-400">{errors[k]}</p>
  const inp = (k: keyof typeof d, label: string, extra: React.ComponentProps<typeof Input> = {}) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`s-${k}`}>{label}</Label>
      <Input id={`s-${k}`} value={String(d[k])} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k as keyof Settings]} aria-describedby={errors[k as keyof Settings] ? `er-${k}` : undefined} className="h-10" {...extra} />
      {err(k as keyof Settings)}
    </div>
  )

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader title="Pengaturan" description="Informasi toko dan aturan transaksi. Tersimpan di LocalStorage perangkat ini." />
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Panel title="Jenis Usaha">
          <div role="radiogroup" aria-label="Jenis usaha" className="grid gap-3 sm:grid-cols-3">
            {([
              ['toko', 'Toko / Sembako', 'Barcode, stok barang, tanpa meja.', Store],
              ['kafe', 'Kafe', 'Meja, pesanan ke dapur, biaya layanan.', Coffee],
              ['resto', 'Restoran', 'Denah meja bertingkat, dapur, tagihan.', Utensils],
            ] as const).map(([id, label, hint, Icon]) => (
              <button key={id} type="button" role="radio" aria-checked={saved.businessType === id} onClick={() => saved.businessType !== id && setPendingType(id)}
                className={cn('press flex flex-col items-start gap-2 rounded-lg border p-4 text-left', saved.businessType === id ? 'border-primary bg-accent ring-1 ring-primary' : 'border-border hover:bg-secondary')}>
                <Icon className={cn('size-5', saved.businessType === id ? 'text-sky' : 'text-muted-foreground')} aria-hidden />
                <span><span className="block text-[15px] font-semibold">{label}</span><span className="block text-xs text-muted-foreground">{hint}</span></span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Informasi Toko">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{inp('storeName', 'Nama Toko')}</div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="s-address">Alamat Toko</Label>
              <Textarea id="s-address" rows={2} value={d.address} onChange={(e) => set('address', e.target.value)} aria-invalid={!!errors.address} aria-describedby={errors.address ? 'er-address' : undefined} />
              {err('address')}
            </div>
            {inp('phone', 'Nomor Telepon', { inputMode: 'tel' })}
          </div>
        </Panel>

        <Panel title="Transaksi dan Struk">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-currency">Mata Uang</Label>
              <SimpleSelect<Settings['currency']> id="s-currency" value={d.currency} onChange={(v) => setD((x) => ({ ...x, currency: v }))} className="h-10 w-full"
                options={[{ value: 'IDR', label: 'IDR — Rupiah (Rp)' }, { value: 'USD', label: 'USD — Dolar AS' }, { value: 'SGD', label: 'SGD — Dolar Singapura' }, { value: 'MYR', label: 'MYR — Ringgit' }]} />
              <p className="text-xs text-muted-foreground">Hanya mengubah penanda mata uang; harga tidak dikonversi.</p>
            </div>
            {inp('taxRate', 'Persentase Pajak (%)', { inputMode: 'decimal' })}
            {isFnb(saved.businessType) && inp('serviceRate', 'Biaya Layanan (%)', { inputMode: 'decimal' })}
            <div className="flex flex-col gap-1.5">
              {inp('lowStockThreshold', 'Batas Minimum Stok Bawaan', { inputMode: 'numeric' })}
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-muted-foreground">Dipakai untuk produk baru.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  const n = Number(d.lowStockThreshold)
                  if (!/^\d+$/.test(d.lowStockThreshold)) return setErrors({ lowStockThreshold: 'Batas stok harus bilangan bulat ≥ 0.' })
                  products.forEach((p) => updateProduct(p.id, { minStock: n }))
                  toast.success(`Stok minimum ${n} diterapkan ke ${products.length} produk.`)
                }}>Terapkan ke semua produk</Button>
              </div>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="s-receiptNote">Catatan Bagian Bawah Struk</Label>
              <Textarea id="s-receiptNote" rows={2} value={d.receiptNote} onChange={(e) => set('receiptNote', e.target.value)} />
            </div>
          </div>
        </Panel>

        <Panel title="Jam Kerja (Absensi)">
          <div className="grid gap-4 sm:grid-cols-3">
            {inp('shiftStart', 'Jam masuk', { type: 'time' })}
            {inp('shiftEnd', 'Jam pulang', { type: 'time' })}
            {inp('lateTolerance', 'Toleransi terlambat (menit)', { inputMode: 'numeric' })}
          </div>
        </Panel>

        <div className="flex justify-end">
          <Button type="submit" className="h-11 px-6 font-semibold">Simpan</Button>
        </div>
      </form>

      <Panel title="Data" className="mt-4">
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Database className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden />
          <p>
            Semua data (produk, stok, transaksi, pengaturan) tersimpan hanya di browser ini lewat LocalStorage dan tidak tersinkron ke perangkat lain atau server.
            Riwayat penjualan 30 hari, pelanggan, karyawan, dan promo saat pertama dibuka adalah <b className="text-foreground">data contoh</b>. Saat ini tercatat <b className="num text-foreground">{txCount}</b> transaksi.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button variant="outline" className="h-10 gap-2" onClick={() => setConfirm('clear')}><Trash2 className="size-4" aria-hidden /> Hapus Semua Transaksi</Button>
          <Button variant="outline" className="h-10 gap-2" onClick={() => setConfirm('reset')}><RotateCcw className="size-4" aria-hidden /> Kembalikan Data Contoh</Button>
        </div>
      </Panel>

      <Dialog open={!!pendingType} onOpenChange={(o) => !o && setPendingType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ganti jenis usaha ke {pendingType ? BUSINESS_LABEL[pendingType] : ''}?</DialogTitle>
            <DialogDescription>Pilih apakah katalog, meja, dan riwayat contoh ikut diganti. Pengaturan toko Anda yang lain tidak berubah.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button className="h-auto flex-col items-start gap-0.5 py-2.5 text-left font-semibold" onClick={() => { if (pendingType) { setBusinessType(pendingType, true); toast.success(`Data contoh ${BUSINESS_LABEL[pendingType]} dipasang.`); setPendingType(null); setTimeout(() => window.location.reload(), 400) } }}>
              Ganti dan pasang data contoh
              <span className="text-xs font-normal opacity-90">Produk, meja, nama toko, dan riwayat penjualan diganti. Data yang Anda ubah akan hilang.</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start gap-0.5 py-2.5 text-left font-semibold" onClick={() => { if (pendingType) { setBusinessType(pendingType, false); toast.success(`Jenis usaha: ${BUSINESS_LABEL[pendingType]}.`); setPendingType(null) } }}>
              Hanya ganti jenis usaha
              <span className="text-xs font-normal text-muted-foreground">Produk dan data Anda tetap. Fitur meja dan dapur menyesuaikan.</span>
            </Button>
          </div>
          <DialogFooter><Button variant="ghost" className="h-10" onClick={() => setPendingType(null)}>Batal</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirm === 'clear'} onOpenChange={(o) => !o && setConfirm(null)} title="Hapus semua transaksi?"
        description="Seluruh riwayat transaksi dan Dasbor akan kosong. Stok produk tidak dikembalikan. Tindakan ini tidak dapat dibatalkan." confirmLabel="Hapus Semua" destructive
        onConfirm={() => { clearTransactions(); toast.success('Semua transaksi dihapus.') }} />
      <ConfirmDialog open={confirm === 'reset'} onOpenChange={(o) => !o && setConfirm(null)} title="Kembalikan data contoh?"
        description="Produk, stok, transaksi, dan pengaturan akan diganti dengan data contoh bawaan. Perubahan Anda akan hilang." confirmLabel="Kembalikan" destructive
        onConfirm={() => { resetDemoData(); toast.success('Data contoh dikembalikan.'); setTimeout(() => window.location.reload(), 400) }} />
    </div>
  )
}
