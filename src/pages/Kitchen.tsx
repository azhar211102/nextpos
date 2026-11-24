import { useEffect, useState } from 'react'
import { ChefHat } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { ORDER_TYPE_LABEL, type OpenOrder, type OrderStatus } from '@/types'

const COLUMNS: { status: OrderStatus; title: string; next?: { to: OrderStatus; label: string } }[] = [
  { status: 'Baru', title: 'Baru', next: { to: 'Diproses', label: 'Mulai Masak' } },
  { status: 'Diproses', title: 'Diproses', next: { to: 'Siap', label: 'Tandai Siap' } },
  { status: 'Siap', title: 'Siap Disajikan', next: { to: 'Disajikan', label: 'Sudah Disajikan' } },
]

function elapsed(iso: string, now: number) {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
  return m < 1 ? 'baru saja' : `${m} mnt`
}

/** Layar dapur: pesanan yang dikirim kasir, dari Baru sampai Disajikan. */
export default function Kitchen() {
  const orders = useStore((s) => s.orders)
  const products = useStore((s) => s.products)
  const tables = useStore((s) => s.tables)
  const setOrderStatus = useStore((s) => s.setOrderStatus)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])
  const queue = orders.filter((o) => o.sentToKitchen && o.status !== 'Disajikan').sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const name = (l: OpenOrder['lines'][number]) => l.custom?.name ?? products.find((p) => p.id === l.productId)?.name ?? 'Item'

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Dapur" description={`${queue.length} pesanan dalam antrean.`} />
      {queue.length === 0 ? (
        <div className="surface"><EmptyState icon={<ChefHat className="size-5" />} title="Tidak ada pesanan di dapur" description='Pesanan muncul di sini setelah kasir memilih "Simpan Pesanan".' /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = queue.filter((o) => o.status === col.status)
            return (
              <section key={col.status} aria-label={`Kolom ${col.title}`} className="rounded-lg bg-secondary/70 p-2.5">
                <h2 className="mb-2 flex items-center justify-between px-1.5 text-sm font-bold">{col.title}<span className="num rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">{items.length}</span></h2>
                <ul className="flex flex-col gap-2.5">
                  {items.map((o) => (
                    <li key={o.id} data-testid="tiket-dapur" className={cn('rounded-md border bg-card p-3', now - new Date(o.createdAt).getTime() > 15 * 60000 ? 'border-yellow-300 dark:border-yellow-700' : 'border-border')}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="num text-base font-bold">{o.number}</p>
                        <p className="num text-xs text-muted-foreground">{formatTime(o.createdAt)} · {elapsed(o.createdAt, now)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{ORDER_TYPE_LABEL[o.orderType]}{o.tableId ? ` · ${tables.find((t) => t.id === o.tableId)?.name ?? ''}` : ''}</p>
                      <ul className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2 text-sm">
                        {o.lines.map((l) => (
                          <li key={l.productId}>
                            <p><span className="num font-bold">{l.qty}×</span> {name(l)}</p>
                            {l.note && <p className="ml-5 text-xs font-medium text-yellow-900 dark:text-yellow-300">↳ {l.note}</p>}
                          </li>
                        ))}
                      </ul>
                      {col.next && <Button className="mt-3 h-9 w-full font-semibold" variant={col.status === 'Baru' ? 'default' : 'outline'} onClick={() => setOrderStatus(o.id, col.next!.to)}>{col.next.label}</Button>}
                    </li>
                  ))}
                  {items.length === 0 && <li className="px-1.5 py-6 text-center text-sm text-muted-foreground">Kosong</li>}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
