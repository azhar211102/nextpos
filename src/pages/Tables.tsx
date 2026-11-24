import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Armchair, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, EmptyState, PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMoney } from '@/hooks/useMoney'
import { calcTotals } from '@/lib/calc'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { can, useActiveEmployee, useStore } from '@/store/useStore'
import type { Table } from '@/types'

function TableForm({ table, onClose }: { table: Table | null; onClose: () => void }) {
  const addTable = useStore((s) => s.addTable)
  const updateTable = useStore((s) => s.updateTable)
  const tables = useStore((s) => s.tables)
  const [name, setName] = useState(table?.name ?? '')
  const [area, setArea] = useState(table?.area ?? tables[0]?.area ?? 'Utama')
  const [seats, setSeats] = useState(String(table?.seats ?? 4))
  const [err, setErr] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(seats)
    if (!Number.isInteger(n) || n < 1 || n > 50) return setErr('Jumlah kursi harus 1–50.')
    if (table) {
      if (!name.trim()) return setErr('Nama meja wajib diisi.')
      if (tables.some((x) => x.id !== table.id && x.name.toLowerCase() === name.trim().toLowerCase())) return setErr('Nama meja sudah dipakai.')
      updateTable(table.id, { name: name.trim(), area: area.trim() || 'Utama', seats: n })
    } else {
      const r = addTable({ name, area, seats: n })
      if (!r.ok) return setErr(r.error ?? 'Gagal menambah meja.')
    }
    toast.success(table ? 'Meja diperbarui.' : 'Meja ditambahkan.')
    onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader><DialogTitle>{table ? 'Ubah Meja' : 'Tambah Meja'}</DialogTitle><DialogDescription>Atur nama, area, dan kapasitas meja.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-1.5"><Label htmlFor="mj-nama">Nama meja</Label><Input id="mj-nama" autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr('') }} className="h-10" aria-invalid={!!err} aria-describedby={err ? 'mj-err' : undefined} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label htmlFor="mj-area">Area</Label><Input id="mj-area" value={area} onChange={(e) => setArea(e.target.value)} className="h-10" /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="mj-kursi">Kursi</Label><Input id="mj-kursi" inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, ''))} className="num h-10" /></div>
          </div>
          {err && <p id="mj-err" role="alert" className="text-xs text-red-700 dark:text-red-400">{err}</p>}
          <DialogFooter><Button type="button" variant="outline" className="h-10" onClick={onClose}>Batal</Button><Button type="submit" className="h-10 px-5 font-semibold">Simpan</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Denah meja: kosong atau terisi, dengan pesanan yang sedang berjalan. */
export default function Tables() {
  const rp = useMoney()
  const navigate = useNavigate()
  const emp = useActiveEmployee()
  const tables = useStore((s) => s.tables)
  const orders = useStore((s) => s.orders)
  const products = useStore((s) => s.products)
  const settings = useStore((s) => s.settings)
  const resumeOrder = useStore((s) => s.resumeOrder)
  const setOrderMeta = useStore((s) => s.setOrderMeta)
  const deleteTable = useStore((s) => s.deleteTable)
  const [form, setForm] = useState<{ table: Table | null } | null>(null)
  const [del, setDel] = useState<Table | null>(null)
  const areas = [...new Set(tables.map((t) => t.area))]
  const used = tables.filter((t) => orders.some((o) => o.tableId === t.id)).length

  const open = (t: Table) => {
    const o = orders.find((x) => x.tableId === t.id)
    if (o) {
      const r = resumeOrder(o.id)
      if (!r.ok) return toast.error(r.error)
    } else {
      setOrderMeta({ orderType: 'dine-in', tableId: t.id })
    }
    navigate('/kasir')
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Meja" description={`${used} dari ${tables.length} meja terisi.`}
        actions={<Button className="h-10 gap-2 px-4 font-semibold" onClick={() => setForm({ table: null })}><Plus className="size-4" aria-hidden /> Tambah Meja</Button>} />
      {tables.length === 0 ? (
        <div className="surface"><EmptyState icon={<Armchair className="size-5" />} title="Belum ada meja" description="Tambahkan meja agar pesanan makan di tempat bisa dikaitkan ke meja." /></div>
      ) : (
        <div className="flex flex-col gap-6">
          {areas.map((area) => (
            <section key={area} aria-label={`Area ${area}`}>
              <h2 className="mb-2.5 text-[15px] font-bold">{area}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {tables.filter((t) => t.area === area).map((t) => {
                  const o = orders.find((x) => x.tableId === t.id)
                  const total = o ? calcTotals(o.lines, products, o.discount, settings.taxRate, settings.serviceRate).total : 0
                  return (
                    <li key={t.id} data-testid="meja" data-status={o ? 'terisi' : 'kosong'} className={cn('group relative rounded-lg border p-3', o ? 'border-primary/60 bg-accent' : 'border-border bg-card')}>
                      <button type="button" onClick={() => open(t)} aria-label={o ? `${t.name}, terisi pesanan ${o.number}` : `${t.name}, kosong. Buka pesanan baru`} className="press block w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-base font-bold">{t.name}</p>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5" aria-hidden />{t.seats}</span>
                        </div>
                        {o ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-sky">Terisi · {o.number} · {formatTime(o.createdAt)}</p>
                            <p className="num mt-0.5 text-sm font-bold">{rp(total)}</p>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-muted-foreground">Kosong</p>
                        )}
                      </button>
                      {can(emp, 'pesanan') && !o && (
                        <div className="absolute right-1.5 bottom-1.5 flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                          <button type="button" aria-label={`Ubah ${t.name}`} onClick={() => setForm({ table: t })} className="grid size-7 place-items-center rounded hover:bg-secondary"><Pencil className="size-3.5" /></button>
                          <button type="button" aria-label={`Hapus ${t.name}`} onClick={() => setDel(t)} className="grid size-7 place-items-center rounded text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"><Trash2 className="size-3.5" /></button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      {form && <TableForm key={form.table?.id ?? 'baru'} table={form.table} onClose={() => setForm(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Hapus ${del?.name ?? 'meja'}?`} description="Meja dihapus dari denah." confirmLabel="Hapus" destructive
        onConfirm={() => { if (del) { const r = deleteTable(del.id); if (r.ok) toast.success(`${del.name} dihapus.`); else toast.error(r.error) } }} />
    </div>
  )
}
