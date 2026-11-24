import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pencil, Plus, Search, ShoppingCart, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, EmptyState, MethodBadge, PageHeader, Pill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useMoney } from '@/hooks/useMoney'
import { formatDate, formatDateTime, formatNumber } from '@/lib/format'
import { can, useActiveEmployee, useStore } from '@/store/useStore'
import type { Customer } from '@/types'

type Draft = { name: string; phone: string; email: string; note: string }
type Errors = Partial<Record<keyof Draft, string>>

function CustomerForm({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const customers = useStore((s) => s.customers)
  const addCustomer = useStore((s) => s.addCustomer)
  const updateCustomer = useStore((s) => s.updateCustomer)
  const [d, setD] = useState<Draft>({ name: customer?.name ?? '', phone: customer?.phone ?? '', email: customer?.email ?? '', note: customer?.note ?? '' })
  const [err, setErr] = useState<Errors>({})
  const set = (k: keyof Draft, v: string) => { setD((x) => ({ ...x, [k]: v })); setErr((e) => ({ ...e, [k]: undefined })) }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Errors = {}
    if (!d.name.trim()) er.name = 'Nama pelanggan wajib diisi.'
    if (d.phone.trim() && !/^[\d\s()+-]{6,20}$/.test(d.phone.trim())) er.phone = 'Nomor telepon tidak valid.'
    else if (d.phone.trim() && customers.some((c) => c.id !== customer?.id && c.phone.replace(/\D/g, '') === d.phone.replace(/\D/g, ''))) er.phone = 'Nomor telepon sudah terdaftar.'
    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) er.email = 'Format email tidak valid.'
    setErr(er)
    if (Object.keys(er).length) return
    const data = { name: d.name.trim(), phone: d.phone.trim(), email: d.email.trim(), note: d.note.trim() }
    if (customer) { updateCustomer(customer.id, data); toast.success(`${data.name} berhasil diubah.`) }
    else { addCustomer(data); toast.success(`${data.name} berhasil ditambahkan.`) }
    onClose()
  }
  const f = (k: keyof Draft, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`cu-${k}`}>{label}</Label>
      <Input id={`cu-${k}`} value={d[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!err[k]} aria-describedby={err[k] ? `cu-e-${k}` : undefined} className="h-10" {...props} />
      {err[k] && <p id={`cu-e-${k}`} role="alert" className="text-xs text-red-700 dark:text-red-400">{err[k]}</p>}
    </div>
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{customer ? 'Ubah Pelanggan' : 'Tambah Pelanggan'}</DialogTitle>
            <DialogDescription>Data pelanggan hanya tersimpan di perangkat ini.</DialogDescription>
          </DialogHeader>
          {f('name', 'Nama', { autoFocus: true })}
          <div className="grid gap-4 sm:grid-cols-2">
            {f('phone', 'Nomor Telepon', { inputMode: 'tel' })}
            {f('email', 'Email', { type: 'email' })}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cu-note">Catatan</Label>
            <Textarea id="cu-note" rows={2} value={d.note} onChange={(e) => set('note', e.target.value)} />
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

export default function Customers() {
  const rp = useMoney()
  const navigate = useNavigate()
  const emp = useActiveEmployee()
  const customers = useStore((s) => s.customers)
  const transactions = useStore((s) => s.transactions)
  const deleteCustomer = useStore((s) => s.deleteCustomer)
  const setCartCustomer = useStore((s) => s.setCartCustomer)
  const [q, setQ] = useState('')
  const [form, setForm] = useState<{ customer: Customer | null } | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [del, setDel] = useState<Customer | null>(null)

  const stats = useMemo(() => {
    const m = new Map<string, { count: number; total: number; last?: string }>()
    for (const t of transactions) {
      if (!t.customerId || t.status !== 'Berhasil') continue
      const x = m.get(t.customerId) ?? { count: 0, total: 0 }
      x.count++; x.total += t.total
      if (!x.last || t.createdAt > x.last) x.last = t.createdAt
      m.set(t.customerId, x)
    }
    return m
  }, [transactions])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return customers.filter((c) => !s || c.name.toLowerCase().includes(s) || c.phone.replace(/\D/g, '').includes(s.replace(/\D/g, '') || '§') || c.email.toLowerCase().includes(s))
  }, [customers, q])

  const detail = customers.find((c) => c.id === detailId)
  const history = detail ? transactions.filter((t) => t.customerId === detail.id) : []
  const dStats = detail ? stats.get(detail.id) : undefined

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Pelanggan" description={`${formatNumber(customers.length)} pelanggan terdaftar.`}
        actions={<Button className="h-10 gap-2 px-4 font-semibold" onClick={() => setForm({ customer: null })}><Plus className="size-4" aria-hidden /> Tambah Pelanggan</Button>} />

      <div className="surface">
        <div className="border-b border-border p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input type="search" aria-label="Cari pelanggan" placeholder="Cari nama, telepon, atau email" value={q} onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25" />
          </div>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={<Users className="size-5" />} title={customers.length ? 'Tidak ada pelanggan yang cocok' : 'Belum ada pelanggan'} description="Tambahkan pelanggan agar riwayat belanjanya tercatat." />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm" data-testid="tabel-pelanggan">
              <thead><tr className="text-left text-[13px] text-muted-foreground">
                <th className="px-5 py-3 font-medium">Nama</th><th className="px-3 py-3 font-medium">Kontak</th>
                <th className="px-3 py-3 text-right font-medium">Transaksi</th><th className="px-3 py-3 text-right font-medium">Total Belanja</th>
                <th className="px-3 py-3 font-medium">Terakhir Belanja</th><th className="px-5 py-3"><span className="sr-only">Aksi</span></th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {list.map((c) => {
                  const s = stats.get(c.id)
                  return (
                    <tr key={c.id} className="hover:bg-secondary/50" data-testid="baris-pelanggan">
                      <td className="px-5 py-3 font-semibold">{c.name}</td>
                      <td className="px-3 py-3 text-muted-foreground"><div className="num">{c.phone || '—'}</div><div className="text-xs">{c.email}</div></td>
                      <td className="num px-3 py-3 text-right">{s?.count ?? 0}</td>
                      <td className="num px-3 py-3 text-right font-semibold">{rp(s?.total ?? 0)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{s?.last ? formatDate(s.last) : 'Belum pernah'}</td>
                      <td className="px-5 py-3 text-right"><Button variant="outline" className="h-9" onClick={() => setDetailId(c.id)} aria-label={`Lihat profil ${c.name}`}>Profil</Button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
          {detail && (
            <>
              <SheetHeader className="border-b border-border p-5 pr-12">
                <SheetTitle className="text-lg">{detail.name}</SheetTitle>
                <SheetDescription>Pelanggan sejak {formatDate(detail.createdAt)}</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-5 p-5">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Telepon</dt><dd className="num">{detail.phone || '—'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="break-all">{detail.email || '—'}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-muted-foreground">Catatan</dt><dd>{detail.note || '—'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Jumlah transaksi</dt><dd className="num text-lg font-bold">{dStats?.count ?? 0}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Total belanja</dt><dd className="num text-lg font-bold">{rp(dStats?.total ?? 0)}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  {can(emp, 'kasir') && (
                    <Button className="h-10 gap-2 font-semibold" onClick={() => { setCartCustomer(detail.id); navigate('/kasir'); toast.success(`${detail.name} dipilih untuk transaksi berikutnya.`) }}>
                      <ShoppingCart className="size-4" aria-hidden /> Pilih di Kasir
                    </Button>
                  )}
                  <Button variant="outline" className="h-10 gap-2" onClick={() => setForm({ customer: detail })}><Pencil className="size-4" aria-hidden /> Ubah</Button>
                  <Button variant="outline" className="h-10 gap-2 text-red-700 dark:text-red-400" onClick={() => setDel(detail)}><Trash2 className="size-4" aria-hidden /> Hapus</Button>
                </div>
                <div>
                  <h3 className="mb-2 text-[15px] font-bold">Riwayat Pembelian</h3>
                  {history.length === 0 ? (
                    <p className="rounded-md bg-secondary/60 p-4 text-sm text-muted-foreground">Belum ada pembelian yang dikaitkan dengan pelanggan ini.</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-md border border-border" data-testid="riwayat-pelanggan">
                      {history.slice(0, 30).map((t) => (
                        <li key={t.id} className="flex items-center gap-3 p-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <Link to={`/struk/${t.id}`} className="num font-medium text-sky hover:underline">{t.id}</Link>
                            <p className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)} · {t.items.reduce((n, i) => n + i.qty, 0)} item</p>
                          </div>
                          <MethodBadge method={t.method} />
                          <div className="text-right"><p className="num font-semibold">{rp(t.total)}</p>{t.status === 'Dikembalikan' && <Pill tone="red">Refund</Pill>}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {form && <CustomerForm key={form.customer?.id ?? 'baru'} customer={form.customer} onClose={() => setForm(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Hapus ${del?.name ?? 'pelanggan'}?`}
        description="Profil pelanggan dihapus. Transaksi lama tetap tersimpan dengan nama pelanggan saat itu." confirmLabel="Hapus" destructive
        onConfirm={() => { if (del) { deleteCustomer(del.id); setDetailId(null); toast.success(`${del.name} dihapus.`) } }} />
    </div>
  )
}
