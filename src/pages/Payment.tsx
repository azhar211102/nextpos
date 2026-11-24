import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Banknote, CircleCheck, CreditCard, LoaderCircle, QrCode, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState, PageHeader } from '@/components/common'
import { ProductArt } from '@/components/ProductArt'
import { Button } from '@/components/ui/button'
import { useCartTotals, useMoney } from '@/hooks/useMoney'
import { calcChange, quickCashOptions } from '@/lib/calc'
import { formatNumber, parseMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import type { PaymentMethod } from '@/types'

const METHODS: { id: PaymentMethod; label: string; hint: string; icon: typeof Banknote }[] = [
  { id: 'Tunai', label: 'Tunai', hint: 'Terima uang, hitung kembalian', icon: Banknote },
  { id: 'Kartu', label: 'Kartu Debit/Kredit', hint: 'Simulasi mesin EDC', icon: CreditCard },
  { id: 'QRIS', label: 'QRIS', hint: 'Simulasi pindai kode QR', icon: QrCode },
]

/** Pola QR tiruan (bukan kode QR sungguhan) — deterministik dari nilai transaksi. */
const QR_N = 29

function makeQrGrid(seed: number): boolean[][] {
  const st = { a: seed || 1 }
  const next = () => ((st.a = (Math.imul(st.a, 1664525) + 1013904223) >>> 0) / 4294967296)
  const grid: boolean[][] = Array.from({ length: QR_N }, () => Array.from({ length: QR_N }, () => next() > 0.52))
  const finder = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y++)
      for (let x = -1; x <= 7; x++) {
        const gx = ox + x, gy = oy + y
        if (gx < 0 || gy < 0 || gx >= QR_N || gy >= QR_N) continue
        const edge = x === 0 || x === 6 || y === 0 || y === 6
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4
        grid[gy][gx] = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (edge || core)
      }
  }
  finder(0, 0); finder(QR_N - 7, 0); finder(0, QR_N - 7)
  return grid
}

function FauxQr({ seed }: { seed: number }) {
  const cells = useMemo(() => makeQrGrid(seed), [seed])
  return (
    <svg viewBox={`-2 -2 ${QR_N + 4} ${QR_N + 4}`} className="size-full" role="img" aria-label="Kode QRIS simulasi" shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={QR_N + 4} height={QR_N + 4} fill="#fff" />
      {cells.flatMap((row, y) => row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0b1220" /> : null)))}
    </svg>
  )
}

/** Hitung mundur berbasis tenggat waktu (tidak bergeser saat tab di latar belakang). */
function useCountdown(deadline: number | null, total: number) {
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (deadline === null) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [deadline])
  if (deadline === null) return total
  return Math.max(0, Math.ceil((deadline - Math.max(now, deadline - total * 1000)) / 1000))
}

export default function Payment() {
  const navigate = useNavigate()
  const rp = useMoney()
  const cart = useStore((s) => s.cart)
  const products = useStore((s) => s.products)
  const checkout = useStore((s) => s.checkout)
  const totals = useCartTotals()
  const [method, setMethod] = useState<PaymentMethod>('Tunai')
  const [cashText, setCashText] = useState('')
  const [step, setStep] = useState<'pilih' | 'qris' | 'proses'>('pilih')
  const [touched, setTouched] = useState(false)
  const busy = useRef(false) // pencegah klik ganda
  const [deadline, setDeadline] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const qrLeft = useCountdown(deadline, 300)

  const received = parseMoney(cashText)
  const change = calcChange(received, totals.total)
  const cashValid = method !== 'Tunai' || received >= totals.total
  const quick = quickCashOptions(totals.total)
  const lines = cart.map((l) => ({ l, p: products.find((x) => x.id === l.productId) })).filter((x) => x.p)

  const finish = (m: PaymentMethod, paid: number) => {
    if (busy.current) return
    busy.current = true
    const r = checkout(m, paid)
    if (!r.ok) {
      busy.current = false
      setStep('pilih')
      toast.error(r.error)
      return
    }
    setDone(true)
    navigate(`/struk/${r.transaction.id}`, { replace: true, state: { fresh: true } })
  }

  const confirm = () => {
    if (busy.current) return
    if (method === 'Tunai') {
      setTouched(true)
      if (received < totals.total) return
      finish('Tunai', received)
    } else if (method === 'QRIS') {
      setDeadline(Date.now() + 300_000)
      setStep('qris')
    } else {
      setStep('proses')
      window.setTimeout(() => finish('Kartu', totals.total), 1600)
    }
  }

  if (cart.length === 0 && !done) {
    return (
      <div className="surface mx-auto max-w-xl">
        <EmptyState
          icon={<ShoppingCart className="size-5" />}
          title="Tidak ada yang perlu dibayar"
          description="Keranjang kosong. Tambahkan produk di halaman Kasir terlebih dahulu."
          action={<Button onClick={() => navigate('/kasir')}>Kembali ke Kasir</Button>}
        />
      </div>
    )
  }

  const mm = String(Math.floor(qrLeft / 60)).padStart(2, '0')
  const ss = String(qrLeft % 60).padStart(2, '0')

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Pembayaran"
        description="Pilih metode pembayaran dan konfirmasi transaksi."
        actions={
          <Button variant="outline" className="h-11 gap-2 px-4" onClick={() => navigate('/kasir')} disabled={step === 'proses'}>
            <ArrowLeft className="size-4" aria-hidden /> Kembali ke Kasir
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          {step === 'pilih' && (
            <>
              <section className="surface p-5" aria-labelledby="metode-h">
                <h2 id="metode-h" className="mb-3.5 text-[17px] font-bold">Metode Pembayaran</h2>
                <div role="radiogroup" aria-label="Metode pembayaran" className="grid gap-3 sm:grid-cols-3">
                  {METHODS.map(({ id, label, hint, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={method === id}
                      onClick={() => setMethod(id)}
                      className={cn(
                        'press flex flex-col items-start gap-2.5 rounded-xl border p-4 text-left',
                        method === id ? 'border-primary bg-primary/12 ring-1 ring-primary' : 'border-border bg-secondary/40 hover:bg-secondary',
                      )}
                    >
                      <Icon className={cn('size-6', method === id ? 'text-sky' : 'text-muted-foreground')} aria-hidden />
                      <span>
                        <span className="block text-[15px] font-semibold">{label}</span>
                        <span className="block text-xs text-muted-foreground">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {method === 'Tunai' && (
                <section className="surface p-5" aria-labelledby="tunai-h">
                  <h2 id="tunai-h" className="mb-3.5 text-[17px] font-bold">Uang Diterima</h2>
                  <label htmlFor="uang" className="sr-only">Jumlah uang diterima</label>
                  <div className="flex items-center rounded-xl border border-input bg-secondary/50 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
                    <span className="pl-4 text-lg font-semibold text-muted-foreground">Rp</span>
                    <input
                      id="uang"
                      inputMode="numeric"
                      autoFocus
                      autoComplete="off"
                      placeholder="0"
                      value={cashText}
                      aria-invalid={touched && !cashValid}
                      aria-describedby="uang-info"
                      onChange={(e) => {
                        const n = parseMoney(e.target.value)
                        setCashText(n ? formatNumber(n) : '')
                        setTouched(true)
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && confirm()}
                      className="num h-14 min-w-0 flex-1 bg-transparent px-3 text-2xl font-bold outline-none"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2" aria-label="Nominal uang cepat">
                    {quick.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => { setCashText(formatNumber(q)); setTouched(true) }}
                        className="press num h-11 rounded-lg border border-border bg-secondary/60 px-4 text-sm font-semibold hover:bg-secondary"
                      >
                        {q === totals.total ? 'Uang Pas' : rp(q)}
                      </button>
                    ))}
                  </div>
                  <div id="uang-info" className="mt-4 rounded-xl bg-background/60 p-4" aria-live="polite">
                    {touched && !cashValid ? (
                      <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400" data-testid="uang-kurang">
                        Uang kurang {rp(totals.total - received)}. Total pembayaran {rp(totals.total)}.
                      </p>
                    ) : (
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">Kembalian</span>
                        <span className="num text-2xl font-bold text-green-700 dark:text-green-400" data-testid="kembalian">{rp(Math.max(0, change))}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {method === 'Kartu' && (
                <section className="surface p-5">
                  <h2 className="mb-2 text-[17px] font-bold">Kartu Debit/Kredit</h2>
                  <p className="text-sm text-muted-foreground">
                    Ini simulasi mesin EDC. Aplikasi tidak membaca atau menyimpan data kartu. Tekan Konfirmasi Pembayaran untuk mensimulasikan persetujuan.
                  </p>
                </section>
              )}
              {method === 'QRIS' && (
                <section className="surface p-5">
                  <h2 className="mb-2 text-[17px] font-bold">QRIS</h2>
                  <p className="text-sm text-muted-foreground">
                    Halaman berikutnya menampilkan kode QR simulasi untuk dipindai pelanggan. Tidak terhubung ke penyedia pembayaran mana pun.
                  </p>
                </section>
              )}
            </>
          )}

          {step === 'qris' && (
            <section className="surface flex flex-col items-center gap-5 p-6 text-center" aria-labelledby="qris-h">
              <h2 id="qris-h" className="text-xl font-bold">Pindai untuk Membayar</h2>
              <div className="size-60 rounded-xl bg-white p-2"><FauxQr seed={totals.total} /></div>
              <div>
                <p className="num text-3xl font-bold">{rp(totals.total)}</p>
                <p className="mt-1 text-sm text-muted-foreground">Status: <span className="font-semibold text-yellow-900 dark:text-yellow-300" data-testid="status-bayar">Menunggu pembayaran</span></p>
                <p className="num mt-1 text-sm text-muted-foreground">Berlaku {mm}:{ss}</p>
              </div>
              <p className="max-w-sm rounded-lg bg-yellow-50 dark:bg-yellow-950/50 px-3 py-2 text-xs text-yellow-900 dark:text-yellow-300">
                Simulasi: ini bukan kode QR sungguhan dan tidak ada uang yang berpindah.
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                <Button variant="outline" className="h-11 px-4" onClick={() => { setStep('pilih'); setDeadline(null) }}>Ganti Metode</Button>
                <Button className="h-11 gap-2 px-5 font-semibold" disabled={qrLeft === 0} onClick={() => finish('QRIS', totals.total)}>
                  <CircleCheck className="size-4" aria-hidden /> Simulasikan Pembayaran Diterima
                </Button>
              </div>
              {qrLeft === 0 && <p role="alert" className="text-sm text-red-700 dark:text-red-400">Kode kedaluwarsa. Pilih Ganti Metode lalu coba lagi.</p>}
            </section>
          )}

          {step === 'proses' && (
            <section className="surface flex flex-col items-center gap-4 p-10 text-center" role="status" aria-live="polite">
              <LoaderCircle className="size-10 animate-spin text-sky" aria-hidden />
              <p className="text-lg font-bold">Menunggu persetujuan mesin EDC…</p>
              <p className="text-sm text-muted-foreground">Jangan tutup halaman ini.</p>
            </section>
          )}
        </div>

        <aside className="surface h-fit p-5 lg:sticky lg:top-7" aria-labelledby="ringkasan-h">
          <h2 id="ringkasan-h" className="mb-3 text-[17px] font-bold">Ringkasan Belanja</h2>
          <ul className="max-h-[320px] divide-y divide-border overflow-y-auto">
            {lines.map(({ l, p }) => (
              <li key={l.productId} className="flex items-center gap-3 py-2.5">
                <ProductArt product={p!} className="size-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p!.name}</p>
                  <p className="num text-xs text-muted-foreground">{l.qty} x {rp(p!.price)}</p>
                </div>
                <p className="num text-sm font-semibold">{rp(l.qty * p!.price)}</p>
              </li>
            ))}
          </ul>
          <dl className="num mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{rp(totals.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Diskon</dt><dd className={totals.discount ? 'text-green-700 dark:text-green-400' : ''}>{totals.discount ? `- ${rp(totals.discount)}` : rp(0)}</dd></div>
            {totals.service > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Layanan</dt><dd>{rp(totals.service)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">Pajak</dt><dd>{rp(totals.tax)}</dd></div>
            <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-semibold">Total Pembayaran</dt>
              <dd className="text-2xl font-bold" data-testid="total-bayar">{rp(totals.total)}</dd>
            </div>
          </dl>
          {step === 'pilih' && (
            <Button
              size="lg"
              onClick={confirm}
              disabled={method === 'Tunai' && received < totals.total && touched}
              className="press mt-4 h-12 w-full rounded-[10px] text-base font-semibold"
            >
              {method === 'QRIS' ? 'Lanjut ke QRIS' : 'Konfirmasi Pembayaran'}
            </Button>
          )}
        </aside>
      </div>
    </div>
  )
}
