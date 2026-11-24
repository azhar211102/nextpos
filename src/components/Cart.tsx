import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquarePlus, Minus, Plus, Printer, Save, ShoppingCart, Trash2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, EmptyState, SimpleSelect } from '@/components/common'
import { Receipt } from '@/components/Receipt'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCartTotals, useMoney } from '@/hooks/useMoney'
import { validateDiscount } from '@/lib/calc'
import { promoApplies, promoLabel } from '@/lib/promo'
import { cn } from '@/lib/utils'
import { useIsFnb, useStore } from '@/store/useStore'
import { ORDER_TYPE_LABEL, type DiscountType, type OrderType, type Transaction } from '@/types'

function QtyStepper({ productId, qty, max, name }: { productId: string; qty: number; max: number; name: string }) {
  const setQty = useStore((s) => s.setQty)
  const [draft, setDraft] = useState<string | null>(null)
  const commit = (raw: string) => {
    setDraft(null)
    const n = Number(raw)
    if (raw.trim() === '' || !Number.isFinite(n)) return
    const r = setQty(productId, Math.floor(n))
    if (!r.ok && r.error) toast.error(r.error)
  }
  return (
    <div className="flex items-center rounded-md border border-input bg-card">
      <button type="button" aria-label={`Kurangi jumlah ${name}`} onClick={() => setQty(productId, qty - 1)} className="press grid size-8 place-items-center rounded-l-md hover:bg-secondary">
        <Minus className="size-3.5" />
      </button>
      <input
        aria-label={`Jumlah ${name}`}
        inputMode="numeric"
        value={draft ?? String(qty)}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={(e) => draft !== null && commit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="num h-8 w-9 bg-transparent text-center text-sm font-semibold outline-none focus-visible:outline-none"
      />
      <button
        type="button"
        aria-label={`Tambah jumlah ${name}`}
        disabled={qty >= max}
        onClick={() => {
          const r = setQty(productId, qty + 1)
          if (!r.ok && r.error) toast.error(r.error)
        }}
        className="press grid size-8 place-items-center rounded-r-md hover:bg-secondary disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}

/** Pilih pelanggan untuk pesanan ini. */
function CustomerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const customers = useStore((s) => s.customers)
  const current = useStore((s) => s.cartCustomerId)
  const setCartCustomer = useStore((s) => s.setCartCustomer)
  const [q, setQ] = useState('')
  const list = customers.filter((c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()) || c.phone.includes(q.trim()))
  const pick = (id: string | null) => { setCartCustomer(id); onOpenChange(false); setQ('') }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pilih Pelanggan</DialogTitle>
          <DialogDescription>Riwayat belanja akan tercatat di profil pelanggan.</DialogDescription>
        </DialogHeader>
        <Input aria-label="Cari pelanggan" placeholder="Cari nama atau nomor telepon" value={q} onChange={(e) => setQ(e.target.value)} className="h-10" autoFocus />
        <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
          <li>
            <button type="button" onClick={() => pick(null)} className={cn('flex w-full items-center px-3 py-2.5 text-left text-sm hover:bg-secondary', current === null && 'bg-accent font-semibold')}>Tanpa pelanggan</button>
          </li>
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => pick(c.id)} className={cn('flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-secondary', current === c.id && 'bg-accent')}>
                <span className="font-semibold">{c.name}</span>
                <span className="num text-xs text-muted-foreground">{c.phone || 'Tanpa nomor telepon'}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">Pelanggan tidak ditemukan.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

/** Diskon manual dan promo. */
function DiscountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const promotions = useStore((s) => s.promotions)
  const discount = useStore((s) => s.discount)
  const setDiscount = useStore((s) => s.setDiscount)
  const totals = useCartTotals()
  const rp = useMoney()
  const [draft, setDraft] = useState(discount.promoId || !discount.value ? '' : String(discount.value))
  const [type, setType] = useState<DiscountType>(discount.type)
  const applicable = promotions.filter((p) => promoApplies(p, totals.subtotal) || p.id === discount.promoId)
  const manual = draft === '' ? 0 : Number(draft.replace(',', '.'))
  const err = draft !== '' ? validateDiscount({ type, value: Number.isFinite(manual) ? manual : -1 }, totals.subtotal) : null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Diskon & Promo</DialogTitle>
          <DialogDescription>Subtotal saat ini {rp(totals.subtotal)}.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="promo-kasir">Promo</Label>
          <SimpleSelect
            id="promo-kasir"
            ariaLabel="Promo"
            value={discount.promoId ?? '-'}
            onChange={(v) => {
              if (v === '-') { setDiscount({ type: 'persen', value: 0 }); return }
              const p = promotions.find((x) => x.id === v)
              if (p) { setDiscount({ type: p.type, value: p.value, promoId: p.id }); setDraft('') }
            }}
            options={[{ value: '-', label: 'Tanpa promo' }, ...applicable.map((p) => ({ value: p.id, label: `${p.name} (${promoLabel(p)})` }))]}
            className="h-10 w-full"
          />
          <p className="text-xs text-muted-foreground">Hanya promo yang sedang berlaku dan memenuhi minimum belanja.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="diskon">Diskon manual</Label>
          <div className="flex gap-2">
            <Input id="diskon" inputMode="decimal" placeholder="0" value={draft} aria-invalid={!!err} aria-describedby={err ? 'diskon-error' : undefined}
              onChange={(e) => { setDraft(e.target.value); const n = e.target.value === '' ? 0 : Number(e.target.value.replace(',', '.')); setDiscount({ type, value: Number.isFinite(n) ? n : 0 }) }}
              className="num h-10 flex-1" />
            <SimpleSelect<DiscountType> ariaLabel="Jenis diskon" value={type} onChange={(t) => { setType(t); setDiscount({ type: t, value: Number.isFinite(manual) ? manual : 0 }) }}
              options={[{ value: 'persen', label: '%' }, { value: 'nominal', label: 'Rp' }]} className="h-10 min-w-[72px]" />
          </div>
          {err && <p id="diskon-error" role="alert" className="text-xs text-red-700 dark:text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-10" onClick={() => { setDiscount({ type: 'persen', value: 0 }); setDraft('') }}>Hapus Diskon</Button>
          <Button type="button" className="h-10 px-5 font-semibold" disabled={!!err} onClick={() => onOpenChange(false)}>Selesai</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Cart({ onProceed, inSheet }: { onProceed?: () => void; inSheet?: boolean }) {
  const navigate = useNavigate()
  const rp = useMoney()
  const fnb = useIsFnb()
  const cart = useStore((s) => s.cart)
  const products = useStore((s) => s.products)
  const discount = useStore((s) => s.discount)
  const customers = useStore((s) => s.customers)
  const customerId = useStore((s) => s.cartCustomerId)
  const setCartCustomer = useStore((s) => s.setCartCustomer)
  const promotions = useStore((s) => s.promotions)
  const tables = useStore((s) => s.tables)
  const orders = useStore((s) => s.orders)
  const orderType = useStore((s) => s.orderType)
  const tableId = useStore((s) => s.tableId)
  const activeOrderId = useStore((s) => s.activeOrderId)
  const setOrderMeta = useStore((s) => s.setOrderMeta)
  const setNote = useStore((s) => s.setNote)
  const removeFromCart = useStore((s) => s.removeFromCart)
  const clearCart = useStore((s) => s.clearCart)
  const saveOrder = useStore((s) => s.saveOrder)
  const settings = useStore((s) => s.settings)
  const totals = useCartTotals()
  const [confirmClear, setConfirmClear] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [billOpen, setBillOpen] = useState(false)
  const [noteFor, setNoteFor] = useState<string | null>(null)

  const customer = customers.find((c) => c.id === customerId)
  const activeOrder = orders.find((o) => o.id === activeOrderId)
  const discError = validateDiscount(discount, totals.subtotal)
  const activePromo = promotions.find((p) => p.id === discount.promoId)
  const promoError = activePromo && !promoApplies(activePromo, totals.subtotal)
    ? activePromo.active && totals.subtotal < activePromo.minSubtotal ? `Promo butuh belanja minimal ${rp(activePromo.minSubtotal)}.` : 'Promo tidak berlaku saat ini.'
    : ''
  const lines = cart
    .map((l) => ({ line: l, p: products.find((x) => x.id === l.productId) }))
    .filter((x) => x.line.custom || x.p)
  const busyTables = new Set(orders.filter((o) => o.tableId && o.id !== activeOrderId).map((o) => o.tableId))

  const bill: Transaction = {
    id: activeOrder?.number ?? 'TAGIHAN', createdAt: new Date().toISOString(),
    items: lines.map(({ line, p }) => ({ productId: line.productId, name: line.custom?.name ?? p!.name, sku: p?.sku ?? '—', qty: line.qty, price: line.custom?.price ?? p!.price, note: line.note })),
    subtotal: totals.subtotal, discount: totals.discount, discountLabel: activePromo?.name ?? (totals.discount ? 'Diskon' : ''),
    serviceCharge: totals.service, serviceRate: fnb ? settings.serviceRate : 0, tax: totals.tax, taxRate: settings.taxRate, total: totals.total,
    method: 'Tunai', received: 0, change: 0, status: 'Berhasil', cashier: '—', customerName: customer?.name,
    orderType: fnb ? orderType : undefined, tableName: tables.find((t) => t.id === tableId)?.name, orderNumber: activeOrder?.number,
  }

  const onSave = () => {
    const r = saveOrder()
    if (!r.ok) return toast.error(r.error)
    toast.success(fnb ? `Pesanan ${r.order.number} disimpan dan dikirim ke dapur.` : `Pesanan ${r.order.number} disimpan.`)
    onProceed?.()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn('flex items-center justify-between gap-2 border-b border-border px-4 py-3', inSheet && 'pr-14')}>
        <h2 className="flex items-center gap-2 text-base font-bold">
          Pesanan
          {activeOrder && <span className="num rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-sky">{activeOrder.number}</span>}
        </h2>
        <button type="button" disabled={cart.length === 0} onClick={() => setConfirmClear(true)}
          className="press inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:pointer-events-none disabled:opacity-40">
          <Trash2 className="size-3.5" aria-hidden /> Kosongkan
        </button>
      </div>

      <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <button type="button" onClick={() => setCustomerOpen(true)} aria-label={customer ? `Pelanggan ${customer.name}, ganti` : 'Tambah pelanggan'}
          className="press flex h-9 w-full items-center gap-2 rounded-md border border-dashed border-input px-3 text-left text-sm hover:bg-secondary">
          <UserPlus className="size-4 text-muted-foreground" aria-hidden />
          <span className={cn('flex-1 truncate', customer ? 'font-semibold' : 'text-muted-foreground')}>{customer ? customer.name : 'Tambah Pelanggan'}</span>
          {customer && (
            <span role="button" tabIndex={0} aria-label="Lepas pelanggan" onClick={(e) => { e.stopPropagation(); setCartCustomer(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setCartCustomer(null) } }} className="grid size-5 place-items-center rounded hover:bg-secondary"><X className="size-3.5" /></span>
          )}
        </button>
        {fnb && (
          <div className="grid grid-cols-2 gap-2">
            <SimpleSelect<OrderType> ariaLabel="Tipe pesanan" value={orderType} onChange={(v) => setOrderMeta({ orderType: v, tableId: v === 'dine-in' ? tableId : null })}
              options={(Object.keys(ORDER_TYPE_LABEL) as OrderType[]).map((k) => ({ value: k, label: ORDER_TYPE_LABEL[k] }))} className="h-9 w-full" size="sm" />
            {orderType === 'dine-in' ? (
              <SimpleSelect ariaLabel="Meja" value={tableId ?? '-'} onChange={(v) => setOrderMeta({ tableId: v === '-' ? null : v })}
                options={[{ value: '-', label: 'Pilih meja' }, ...tables.map((t) => ({ value: t.id, label: busyTables.has(t.id) ? `${t.name} (terisi)` : t.name }))]} className="h-9 w-full" size="sm" />
            ) : <span />}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4" data-testid="cart-lines">
        {lines.length === 0 ? (
          <EmptyState icon={<ShoppingCart className="size-5" />} title="Belum ada item" description="Pilih produk dari daftar untuk memulai pesanan." />
        ) : (
          <ul className="divide-y divide-border">
            {lines.map(({ line, p }) => {
              const name = line.custom?.name ?? p!.name
              const price = line.custom?.price ?? p!.price
              return (
                <li key={line.productId} className="py-3" data-testid="cart-line">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm leading-snug font-semibold">{name}</p>
                      <p className="num text-xs text-muted-foreground">{rp(price)}{line.custom ? ' · item bebas' : ''}</p>
                    </div>
                    <button type="button" aria-label={`Hapus ${name} dari keranjang`} onClick={() => removeFromCart(line.productId)}
                      className="press -mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300"><Trash2 className="size-3.5" /></button>
                  </div>
                  {line.note && noteFor !== line.productId && <p className="mt-1 text-xs text-muted-foreground italic">Catatan: {line.note}</p>}
                  {noteFor === line.productId && (
                    <Input autoFocus aria-label={`Catatan untuk ${name}`} defaultValue={line.note ?? ''} placeholder="mis. tanpa gula, pedas sedang" maxLength={80} className="mt-2 h-8 text-sm"
                      onBlur={(e) => { setNote(line.productId, e.target.value); setNoteFor(null) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setNoteFor(null) }} />
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <QtyStepper productId={line.productId} qty={line.qty} max={line.custom ? 999 : p!.stock} name={name} />
                      <button type="button" aria-label={`Catatan ${name}`} onClick={() => setNoteFor(line.productId)} className="press grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary"><MessageSquarePlus className="size-4" /></button>
                    </div>
                    <p className="num text-sm font-bold">{rp(price * line.qty)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
        <button type="button" onClick={() => setDiscountOpen(true)} disabled={cart.length === 0}
          className="press mb-2 flex h-8 w-full items-center justify-between rounded-md px-2 text-[13px] font-medium text-sky hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
          <span>{totals.discount > 0 ? (activePromo?.name ?? 'Diskon manual') : 'Diskon & Promo'}</span>
          <span className="num">{totals.discount > 0 ? `- ${rp(totals.discount)}` : 'Tambah'}</span>
        </button>
        {(discError || promoError) && <p role="alert" className="mb-2 px-2 text-xs text-red-700 dark:text-red-400">{discError ?? promoError}</p>}

        <dl className="num flex flex-col gap-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd data-testid="subtotal">{rp(totals.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Diskon</dt><dd data-testid="diskon-nilai" className={totals.discount ? 'text-green-700 dark:text-green-400' : ''}>{totals.discount ? `- ${rp(totals.discount)}` : rp(0)}</dd></div>
          {fnb && settings.serviceRate > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Layanan ({settings.serviceRate.toLocaleString('id-ID')}%)</dt><dd data-testid="layanan">{rp(totals.service)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted-foreground">Pajak ({settings.taxRate.toLocaleString('id-ID')}%)</dt><dd data-testid="pajak">{rp(totals.tax)}</dd></div>
          <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2">
            <dt className="text-[15px] font-semibold">Total</dt>
            <dd data-testid="total" className="text-xl font-bold">{rp(totals.total)}</dd>
          </div>
        </dl>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-10 gap-1.5" disabled={cart.length === 0} onClick={onSave}><Save className="size-4" aria-hidden /> Simpan Pesanan</Button>
          <Button variant="outline" className="h-10 gap-1.5" disabled={cart.length === 0} onClick={() => setBillOpen(true)}><Printer className="size-4" aria-hidden /> Cetak Tagihan</Button>
        </div>
        <Button size="lg" disabled={cart.length === 0 || !!discError || !!promoError}
          onClick={() => { onProceed?.(); navigate('/kasir/pembayaran') }}
          className="press mt-2 h-12 w-full rounded-md bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90">
          Bayar {cart.length > 0 && <span className="num">{rp(totals.total)}</span>}
        </Button>
      </div>

      <CustomerDialog open={customerOpen} onOpenChange={setCustomerOpen} />
      {discountOpen && <DiscountDialog open onOpenChange={setDiscountOpen} />}
      <Dialog open={billOpen} onOpenChange={setBillOpen}>
        <DialogContent className="max-h-[92dvh] gap-3 overflow-y-auto p-5 sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Tagihan Sementara</DialogTitle>
            <DialogDescription>Belum dibayar. Cetak untuk ditunjukkan kepada pelanggan.</DialogDescription>
          </DialogHeader>
          <Receipt tx={bill} settings={settings} bill />
          <div className="no-print flex justify-end gap-2">
            <Button variant="outline" className="h-10" onClick={() => setBillOpen(false)}>Tutup</Button>
            <Button className="h-10 gap-2 font-semibold" onClick={() => window.print()}><Printer className="size-4" aria-hidden /> Cetak Tagihan</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirmClear} onOpenChange={setConfirmClear} title="Kosongkan keranjang?"
        description={activeOrder ? `Keranjang dikosongkan, tetapi pesanan ${activeOrder.number} yang tersimpan tidak dihapus.` : 'Semua item di keranjang akan dihapus. Tindakan ini tidak dapat dibatalkan.'}
        confirmLabel="Kosongkan" destructive onConfirm={() => clearCart()} />
    </div>
  )
}

