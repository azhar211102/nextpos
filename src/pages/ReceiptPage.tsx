import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CircleCheck, FilePlus2, Printer, ReceiptText } from 'lucide-react'
import { EmptyState } from '@/components/common'
import { Receipt } from '@/components/Receipt'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'

export default function ReceiptPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fresh = (useLocation().state as { fresh?: boolean } | null)?.fresh
  const tx = useStore((s) => s.transactions.find((t) => t.id === id))
  const settings = useStore((s) => s.settings)

  if (!tx) {
    return (
      <div className="px-4 py-10">
        <EmptyState
          icon={<ReceiptText className="size-5" />}
          title="Struk tidak ditemukan"
          description="Nomor transaksi ini tidak ada di perangkat ini."
          action={<Button onClick={() => navigate('/transaksi')}>Lihat Riwayat Transaksi</Button>}
        />
      </div>
    )
  }

  return (
    <div className="min-h-dvh px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="no-print mx-auto mb-6 flex max-w-[640px] flex-col items-center gap-4 text-center">
        <div>
          {fresh ? (
            <p className="flex items-center justify-center gap-2 text-lg font-bold text-green-700 dark:text-green-400" role="status">
              <CircleCheck className="size-5" aria-hidden /> Pembayaran Berhasil
            </p>
          ) : (
            <h1 className="text-[26px] font-bold">Struk</h1>
          )}
          <p className="num text-sm text-muted-foreground">{tx.id}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Button variant="outline" className="h-11 gap-2 px-4" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4" aria-hidden /> Kembali ke Ringkasan
          </Button>
          <Button variant="outline" className="h-11 gap-2 px-4" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden /> Cetak Struk
          </Button>
          <Button className="h-11 gap-2 px-4 font-semibold" onClick={() => navigate('/kasir')}>
            <FilePlus2 className="size-4" aria-hidden /> Transaksi Baru
          </Button>
        </div>
      </div>
      <Receipt tx={tx} settings={settings} />
      <p className="no-print mx-auto mt-6 max-w-[340px] text-center text-xs text-muted-foreground">
        Pencetakan memakai dialog cetak browser. Untuk printer termal 80 mm, pilih printer tersebut di dialog cetak.{' '}
        <Link to="/transaksi" className="text-sky underline underline-offset-2">Riwayat transaksi</Link>
      </p>
    </div>
  )
}
