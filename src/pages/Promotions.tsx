import { useState } from 'react'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, EmptyState, PageHeader, Pill, SimpleSelect } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useMoney } from '@/hooks/useMoney'
import { dayKey, formatDate, formatNumber, parseMoney } from '@/lib/format'
import { promoLabel, promoState, type PromoState } from '@/lib/promo'
import { useStore } from '@/store/useStore'
import type { DiscountType, Promotion } from '@/types'

type Draft = { name: string; type: DiscountType; value: string; min: string; start: string; end: string; active: boolean }
type Errors = Partial<Record<keyof Draft, string>>

const STATE_PILL: Record<PromoState, { tone: 'green' | 'blue' | 'slate'; label: string }> = {
  aktif: { tone: 'green', label: 'Berlaku' },
  terjadwal: { tone: 'blue', label: 'Terjadwal' },
  berakhir: { tone: 'slate', label: 'Berakhir' },
  nonaktif: { tone: 'slate', label: 'Nonaktif' },
}

function PromoForm({ promo, onClose }: { promo: Promotion | null; onClose: () => void }) {
  const addPromotion = useStore((s) => s.addPromotion)
  const updatePromotion = useStore((s) => s.updatePromotion)
  const today = dayKey(new Date())
  const [d, setD] = useState<Draft>({
    name: promo?.name ?? '', type: promo?.type ?? 'persen', value: promo ? String(promo.value) : '',
    min: promo ? formatNumber(promo.minSubtotal) : '', start: promo?.startDate ?? today, end: promo?.endDate ?? '', active: promo?.active ?? true,
  })
  const [err, setErr] = useState<Errors>({})
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((x) => ({ ...x, [k]: v })); setErr((e) => ({ ...e, [k]: undefined })) }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Errors = {}
    const value = Number(d.value.replace(',', '.'))
    if (!d.name.trim()) er.name = 'Nama promo wajib diisi.'
    if (d.value.trim() === '' || !Number.isFinite(value) || value <= 0) er.value = 'Nilai diskon harus lebih dari 0.'
    else if (d.type === 'persen' && value > 100) er.value = 'Diskon persen maksimal 100%.'
    if (!d.start) er.start = 'Tanggal mulai wajib diisi.'
    if (!d.end) er.end = 'Tanggal berakhir wajib diisi.'
    else if (d.start && d.end < d.start) er.end = 'Tanggal berakhir tidak boleh sebelum tanggal mulai.'
    setErr(er)
    if (Object.keys(er).length) return
    const data = { name: d.name.trim(), type: d.type, value, minSubtotal: parseMoney(d.min), startDate: d.start, endDate: d.end, active: d.active }
    if (promo) { updatePromotion(promo.id, data); toast.success(`${data.name} berhasil diubah.`) }
    else { addPromotion(data); toast.success(`${data.name} berhasil ditambahkan.`) }
    onClose()
  }
  const e1 = (k: keyof Draft) => err[k] && <p id={`pr-e-${k}`} role="alert" className="text-xs text-red-700 dark:text-red-400">{err[k]}</p>
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{promo ? 'Ubah Promo' : 'Tambah Promo'}</DialogTitle>
            <DialogDescription>Promo yang sedang berlaku bisa dipilih kasir di keranjang.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pr-name">Nama Promo</Label>
            <Input id="pr-name" autoFocus value={d.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!err.name} aria-describedby={err.name ? 'pr-e-name' : undefined} className="h-10" />
            {e1('name')}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pr-type">Jenis Diskon</Label>
              <SimpleSelect<DiscountType> id="pr-type" value={d.type} onChange={(v) => set('type', v)} className="h-10 w-full" options={[{ value: 'persen', label: 'Persen (%)' }, { value: 'nominal', label: 'Nominal (Rp)' }]} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pr-value">Nilai Diskon</Label>
              <Input id="pr-value" inputMode="decimal" value={d.value} onChange={(e) => set('value', e.target.value)} aria-invalid={!!err.value} aria-describedby={err.value ? 'pr-e-value' : undefined} className="num h-10" />
              {e1('value')}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="pr-min">Minimum Belanja (Rp)</Label>
              <Input id="pr-min" inputMode="numeric" placeholder="0 = tanpa minimum" value={d.min} onChange={(e) => { const n = parseMoney(e.target.value); set('min', e.target.value === '' ? '' : formatNumber(n)) }} className="num h-10" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pr-start">Mulai</Label>
              <Input id="pr-start" type="date" value={d.start} onChange={(e) => set('start', e.target.value)} aria-invalid={!!err.start} className="h-10" />
              {e1('start')}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pr-end">Berakhir</Label>
              <Input id="pr-end" type="date" value={d.end} onChange={(e) => set('end', e.target.value)} aria-invalid={!!err.end} aria-describedby={err.end ? 'pr-e-end' : undefined} className="h-10" />
              {e1('end')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="pr-active" checked={d.active} onCheckedChange={(v) => set('active', v)} />
            <Label htmlFor="pr-active">Promo aktif</Label>
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

export default function Promotions() {
  const rp = useMoney()
  const promotions = useStore((s) => s.promotions)
  const updatePromotion = useStore((s) => s.updatePromotion)
  const deletePromotion = useStore((s) => s.deletePromotion)
  const [form, setForm] = useState<{ promo: Promotion | null } | null>(null)
  const [del, setDel] = useState<Promotion | null>(null)

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Promosi" description="Atur diskon dan periode berlakunya."
        actions={<Button className="h-10 gap-2 px-4 font-semibold" onClick={() => setForm({ promo: null })}><Plus className="size-4" aria-hidden /> Tambah Promo</Button>} />
      <div className="surface">
        {promotions.length === 0 ? (
          <EmptyState icon={<Tag className="size-5" />} title="Belum ada promo" description="Buat promo agar kasir bisa memberi diskon sesuai aturan." />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm" data-testid="tabel-promo">
              <thead><tr className="text-left text-[13px] text-muted-foreground">
                <th className="px-5 py-3 font-medium">Promo</th><th className="px-3 py-3 text-right font-medium">Diskon</th>
                <th className="px-3 py-3 text-right font-medium">Min. Belanja</th><th className="px-3 py-3 font-medium">Periode</th>
                <th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Aktif</th><th className="px-5 py-3"><span className="sr-only">Aksi</span></th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {promotions.map((p) => {
                  const st = STATE_PILL[promoState(p)]
                  return (
                    <tr key={p.id} className="hover:bg-secondary/50" data-testid="baris-promo">
                      <td className="px-5 py-3 font-semibold">{p.name}</td>
                      <td className="num px-3 py-3 text-right font-semibold">{promoLabel(p)}</td>
                      <td className="num px-3 py-3 text-right text-muted-foreground">{p.minSubtotal ? rp(p.minSubtotal) : '—'}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{formatDate(`${p.startDate}T12:00`)} – {formatDate(`${p.endDate}T12:00`)}</td>
                      <td className="px-3 py-3"><Pill tone={st.tone}>{st.label}</Pill></td>
                      <td className="px-3 py-3"><Switch checked={p.active} onCheckedChange={(v) => updatePromotion(p.id, { active: v })} aria-label={`Aktifkan ${p.name}`} /></td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label={`Ubah ${p.name}`} onClick={() => setForm({ promo: p })}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" size="icon" aria-label={`Hapus ${p.name}`} className="text-red-700 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" onClick={() => setDel(p)}><Trash2 className="size-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {form && <PromoForm key={form.promo?.id ?? 'baru'} promo={form.promo} onClose={() => setForm(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Hapus ${del?.name ?? 'promo'}?`} description="Promo dihapus dan tidak bisa dipakai lagi di kasir." confirmLabel="Hapus" destructive
        onConfirm={() => { if (del) { deletePromotion(del.id); toast.success(`${del.name} dihapus.`) } }} />
    </div>
  )
}
