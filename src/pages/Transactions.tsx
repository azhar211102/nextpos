import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Printer, ReceiptText, RotateCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState, MethodBadge, Pill, PageHeader, SimpleSelect } from '@/components/common'
import { Receipt } from '@/components/Receipt'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useMoney } from '@/hooks/useMoney'
import { dayKey, formatDate, formatNumber, formatTime } from '@/lib/format'
import { can, useActiveEmployee, useStore } from '@/store/useStore'
import { PAYMENT_LABEL, type PaymentMethod, type Transaction } from '@/types'

const PAGE = 25

export default function Transactions() {
  const rp = useMoney()
  const wide = useMediaQuery('(min-width: 768px)')
  const transactions = useStore((s) => s.transactions)
  const settings = useStore((s) => s.settings)
  const emp = useActiveEmployee()
  const refundTransaction = useStore((s) => s.refundTransaction)
  const [status, setStatus] = useState<'semua' | 'Berhasil' | 'Dikembalikan'>('semua')
  const [refunding, setRefunding] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonErr, setReasonErr] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [method, setMethod] = useState<'semua' | PaymentMethod>('semua')
  const [shown, setShown] = useState(PAGE)
  const [detail, setDetail] = useState<Transaction | null>(null)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return transactions.filter((t) => {
      const k = dayKey(t.createdAt)
      if (from && k < from) return false
      if (to && k > to) return false
      if (method !== 'semua' && t.method !== method) return false
      if (status !== 'semua' && t.status !== status) return false
      if (s && !(t.id.toLowerCase().includes(s) || t.items.some((i) => i.name.toLowerCase().includes(s)))) return false
      return true
    })
  }, [transactions, q, from, to, method, status])

  const sum = list.filter((t) => t.status === 'Berhasil').reduce((n, t) => n + t.total, 0)
  const live = detail ? transactions.find((t) => t.id === detail.id) ?? detail : null
  const filtered = q || from || to || method !== 'semua' || status !== 'semua'

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Transaksi" description="Riwayat semua transaksi yang tercatat di perangkat ini." />

      <div className="surface">
        <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <div className="relative min-w-[220px] flex-1">
            <label htmlFor="cari-trx" className="sr-only">Cari transaksi</label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input id="cari-trx" type="search" placeholder="Cari nomor transaksi atau produk" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE) }}
              className="h-10 w-full rounded-lg border border-input bg-secondary/50 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30" />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">Dari tanggal
              <Input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setShown(PAGE) }} className="h-10 w-[150px] " />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">Sampai tanggal
              <Input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setShown(PAGE) }} className="h-10 w-[150px] " />
            </label>
          </div>
          <SimpleSelect<'semua' | PaymentMethod> ariaLabel="Filter metode pembayaran" value={method} onChange={(v) => { setMethod(v); setShown(PAGE) }}
            options={[{ value: 'semua', label: 'Semua Metode' }, { value: 'Tunai', label: 'Tunai' }, { value: 'QRIS', label: 'QRIS' }, { value: 'Kartu', label: 'Kartu Debit/Kredit' }]} />
          <SimpleSelect<'semua' | 'Berhasil' | 'Dikembalikan'> ariaLabel="Filter status transaksi" value={status} onChange={(v) => { setStatus(v); setShown(PAGE) }}
            options={[{ value: 'semua', label: 'Semua Status' }, { value: 'Berhasil', label: 'Berhasil' }, { value: 'Dikembalikan', label: 'Dikembalikan' }]} />
          {filtered && (
            <Button variant="ghost" className="h-10" onClick={() => { setQ(''); setFrom(''); setTo(''); setMethod('semua'); setStatus('semua') }}>Atur Ulang Filter</Button>
          )}
        </div>

        <p className="num border-b border-border px-5 py-2.5 text-sm text-muted-foreground" aria-live="polite">
          {formatNumber(list.length)} transaksi · Total <b className="text-foreground">{rp(sum)}</b>
        </p>

        {list.length === 0 ? (
          <EmptyState icon={<ReceiptText className="size-5" />} title={transactions.length === 0 ? 'Belum ada transaksi' : 'Tidak ada transaksi yang cocok'}
            description={transactions.length === 0 ? 'Transaksi dari halaman Kasir akan muncul di sini.' : 'Ubah kata kunci atau filter.'}
            action={transactions.length === 0 ? <Link to="/kasir" className="text-sm font-semibold text-sky hover:underline">Buka Kasir</Link> : undefined} />
        ) : (
          <>
            {wide ? (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm" data-testid="tabel-transaksi">
                <thead>
                  <tr className="text-left text-[13px] text-muted-foreground">
                    <th className="px-4 py-3 font-medium">No. Transaksi</th>
                    <th className="px-3 py-3 font-medium">Tanggal &amp; Waktu</th>
                    <th className="px-3 py-3 text-center font-medium">Item</th>
                    <th className="px-3 py-3 text-right font-medium">Subtotal</th>
                    <th className="px-3 py-3 text-right font-medium">Diskon</th>
                    <th className="px-3 py-3 text-right font-medium">Pajak</th>
                    <th className="px-3 py-3 text-right font-medium">Total</th>
                    <th className="px-3 py-3 text-center font-medium">Metode</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-4 py-3"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.slice(0, shown).map((t) => (
                    <tr key={t.id} className="hover:bg-secondary/40" data-testid="baris-transaksi">
                      <td className="num px-4 py-3 font-medium">{t.id}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{formatDate(t.createdAt)}, {formatTime(t.createdAt)}</td>
                      <td className="num px-3 py-3 text-center">{t.items.reduce((n, i) => n + i.qty, 0)}</td>
                      <td className="num px-3 py-3 text-right text-muted-foreground">{rp(t.subtotal)}</td>
                      <td className="num px-3 py-3 text-right text-muted-foreground">{t.discount ? `- ${rp(t.discount)}` : '—'}</td>
                      <td className="num px-3 py-3 text-right text-muted-foreground">{rp(t.tax)}</td>
                      <td className="num px-3 py-3 text-right font-semibold">{rp(t.total)}</td>
                      <td className="px-3 py-3 text-center"><MethodBadge method={t.method} /></td>
                      <td className="px-3 py-3"><Pill tone={t.status === 'Berhasil' ? 'green' : 'red'}>{t.status}</Pill></td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" className="h-9 gap-2" onClick={() => setDetail(t)} aria-label={`Lihat detail ${t.id}`}><Eye className="size-3.5" aria-hidden /> Detail</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
            <ul className="divide-y divide-border">
              {list.slice(0, shown).map((t) => (
                <li key={t.id} className="p-4" data-testid="baris-transaksi">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="num font-semibold">{t.id}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.createdAt)}, {formatTime(t.createdAt)}</p>
                    </div>
                    <MethodBadge method={t.method} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="num text-sm text-muted-foreground">{t.items.reduce((n, i) => n + i.qty, 0)} item · <b className="text-foreground">{rp(t.total)}</b></p>
                    <Button variant="outline" className="h-9 gap-2" onClick={() => setDetail(t)} aria-label={`Lihat detail ${t.id}`}><Eye className="size-3.5" aria-hidden /> Detail</Button>
                  </div>
                </li>
              ))}
            </ul>
            )}

            {shown < list.length && (
              <div className="border-t border-border p-4 text-center">
                <Button variant="outline" className="h-10" onClick={() => setShown((n) => n + PAGE)}>Tampilkan Lebih Banyak ({formatNumber(list.length - shown)})</Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!live} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[92dvh] gap-3 overflow-y-auto p-5 sm:max-w-[420px]">
          <DialogTitle>Detail Transaksi</DialogTitle>
          <DialogDescription>{live && `${live.id} · ${PAYMENT_LABEL[live.method]} · ${live.status}`}</DialogDescription>
          {live?.status === 'Dikembalikan' && (
            <p className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3 py-2 text-sm text-red-700 dark:text-red-400" data-testid="info-refund">
              Di-refund {live.refundedAt && formatDate(live.refundedAt)} oleh {live.refundedBy}. Alasan: {live.refundReason}
            </p>
          )}
          {live && <Receipt tx={live} settings={settings} />}
          <div className="no-print flex flex-wrap justify-end gap-2">
            <Button variant="outline" className="h-10" onClick={() => setDetail(null)}>Tutup</Button>
            {live?.status === 'Berhasil' && can(emp, 'refund') && (
              <Button variant="outline" className="h-10 gap-2 text-red-700 dark:text-red-400" onClick={() => { setReason(''); setReasonErr(''); setRefunding(true) }}><RotateCcw className="size-4" aria-hidden /> Refund</Button>
            )}
            <Button className="h-10 gap-2 font-semibold" onClick={() => window.print()}><Printer className="size-4" aria-hidden /> Cetak Ulang Struk</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={refunding} onOpenChange={setRefunding}>
        <DialogContent className="sm:max-w-md">
          <form noValidate className="flex flex-col gap-4" onSubmit={(e) => {
            e.preventDefault()
            if (!live) return
            const r = refundTransaction(live.id, reason)
            if (!r.ok) return setReasonErr(r.error ?? 'Refund gagal.')
            toast.success(`${live.id} di-refund; stok dikembalikan.`)
            setRefunding(false)
          }}>
            <DialogHeader>
              <DialogTitle>Refund Transaksi</DialogTitle>
              <DialogDescription>Simulasi: status berubah menjadi Dikembalikan dan stok barang ditambahkan kembali. Tidak ada uang yang diproses.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="alasan-refund">Alasan refund</Label>
              <Textarea id="alasan-refund" rows={3} autoFocus value={reason} aria-invalid={!!reasonErr} aria-describedby={reasonErr ? 'alasan-err' : undefined} onChange={(e) => { setReason(e.target.value); setReasonErr('') }} />
              {reasonErr && <p id="alasan-err" role="alert" className="text-xs text-red-700 dark:text-red-400">{reasonErr}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="h-10" onClick={() => setRefunding(false)}>Batal</Button>
              <Button type="submit" className="h-10 bg-red-600 px-5 font-semibold text-white hover:bg-red-700">Konfirmasi Refund</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
