import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, EmptyState, PageHeader, Pill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { useMoney } from '@/hooks/useMoney'
import { calcTotals } from '@/lib/calc'
import { formatTime } from '@/lib/format'
import { can, useActiveEmployee, useIsFnb, useStore } from '@/store/useStore'
import { ORDER_TYPE_LABEL, type OpenOrder, type OrderStatus } from '@/types'

export const STATUS_TONE: Record<OrderStatus, 'blue' | 'amber' | 'green' | 'slate'> = { Baru: 'blue', Diproses: 'amber', Siap: 'green', Disajikan: 'slate' }

/** Daftar pesanan yang sudah disimpan tetapi belum dibayar (di toko: transaksi yang ditahan). */
export default function Orders() {
  const rp = useMoney()
  const navigate = useNavigate()
  const fnb = useIsFnb()
  const emp = useActiveEmployee()
  const orders = useStore((s) => s.orders)
  const products = useStore((s) => s.products)
  const tables = useStore((s) => s.tables)
  const customers = useStore((s) => s.customers)
  const settings = useStore((s) => s.settings)
  const resumeOrder = useStore((s) => s.resumeOrder)
  const cancelOrder = useStore((s) => s.cancelOrder)
  const [del, setDel] = useState<OpenOrder | null>(null)

  const open = (o: OpenOrder) => {
    const r = resumeOrder(o.id)
    if (!r.ok) return toast.error(r.error)
    navigate('/kasir')
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Pesanan" description={fnb ? 'Pesanan yang sudah disimpan dan belum dibayar. Buka untuk menambah item atau membayar.' : 'Transaksi yang ditahan dan belum dibayar.'} />
      <div className="surface">
        {orders.length === 0 ? (
          <EmptyState icon={<ClipboardList className="size-5" />} title="Tidak ada pesanan terbuka" description='Pilih "Simpan Pesanan" di halaman Kasir untuk menyimpan pesanan yang belum dibayar.' />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm" data-testid="tabel-pesanan">
              <thead>
                <tr className="border-b border-border bg-secondary/60 text-left text-[13px] text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">No.</th>
                  <th className="px-3 py-2.5 font-medium">Waktu</th>
                  {fnb && <th className="px-3 py-2.5 font-medium">Tipe / Meja</th>}
                  <th className="px-3 py-2.5 font-medium">Pelanggan</th>
                  <th className="px-3 py-2.5 text-center font-medium">Item</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  {fnb && <th className="px-3 py-2.5 font-medium">Status</th>}
                  <th className="px-5 py-2.5"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => {
                  const t = calcTotals(o.lines, products, o.discount, settings.taxRate, fnb ? settings.serviceRate : 0)
                  return (
                    <tr key={o.id} className="hover:bg-secondary/50" data-testid="baris-pesanan">
                      <td className="num px-5 py-3 font-semibold">{o.number}</td>
                      <td className="num px-3 py-3 text-muted-foreground">{formatTime(o.createdAt)}</td>
                      {fnb && <td className="px-3 py-3">{ORDER_TYPE_LABEL[o.orderType]}{o.tableId && <span className="text-muted-foreground"> · {tables.find((x) => x.id === o.tableId)?.name ?? '—'}</span>}</td>}
                      <td className="px-3 py-3 text-muted-foreground">{customers.find((c) => c.id === o.customerId)?.name ?? '—'}</td>
                      <td className="num px-3 py-3 text-center">{t.itemCount}</td>
                      <td className="num px-3 py-3 text-right font-semibold">{rp(t.total)}</td>
                      {fnb && <td className="px-3 py-3"><Pill tone={STATUS_TONE[o.status]}>{o.status}</Pill></td>}
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          {can(emp, 'kasir') && <Button className="h-9 gap-1.5" onClick={() => open(o)} aria-label={`Buka pesanan ${o.number}`}><Play className="size-3.5" aria-hidden /> Buka</Button>}
                          <Button variant="ghost" size="icon" aria-label={`Batalkan pesanan ${o.number}`} className="text-red-700 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" onClick={() => setDel(o)}><Trash2 className="size-4" /></Button>
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
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Batalkan pesanan ${del?.number ?? ''}?`} description="Pesanan dihapus dari daftar dan dapur. Belum ada stok yang terpotong, jadi stok tidak berubah." confirmLabel="Batalkan Pesanan" destructive
        onConfirm={() => { if (del) { cancelOrder(del.id); toast.success(`Pesanan ${del.number} dibatalkan.`) } }} />
    </div>
  )
}
