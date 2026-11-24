import { formatCurrency, formatDate, formatNumber, formatTime } from '@/lib/format'
import { ORDER_TYPE_LABEL, PAYMENT_LABEL, type Settings, type Transaction } from '@/types'

function Row({ l, r, strong }: { l: string; r: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'text-[15px] font-bold' : ''}`}>
      <span>{l}</span>
      <span className="num whitespace-nowrap">{r}</span>
    </div>
  )
}

/** Struk 80 mm. Satu komponen untuk layar dan cetak (CSS @media print di index.css). `bill` = tagihan sementara. */
export function Receipt({ tx, settings, bill = false }: { tx: Transaction; settings: Settings; bill?: boolean }) {
  const rp = (n: number) => formatCurrency(n, settings.currency)
  const dash = <div className="my-2.5 border-t border-dashed border-neutral-400" aria-hidden />
  return (
    <article
      aria-label={`${bill ? 'Tagihan' : 'Struk'} ${tx.id}`}
      data-testid="struk"
      className="print-area receipt-sheet mx-auto w-full max-w-[340px] rounded-md px-5 py-6 text-[12.5px] leading-relaxed shadow-xl"
    >
      <header className="text-center">
        <h2 className="text-base font-extrabold tracking-wide uppercase">{settings.storeName}</h2>
        <p className="mt-0.5">{settings.address}</p>
        <p>Telp. {settings.phone}</p>
        {bill && <p className="mt-2 font-bold tracking-wide uppercase">Tagihan — belum dibayar</p>}
      </header>
      {dash}
      <div className="flex flex-col gap-0.5">
        <Row l={bill ? 'No. Pesanan' : 'No. Transaksi'} r={tx.orderNumber && !bill ? `${tx.id} (${tx.orderNumber})` : tx.id} />
        <Row l="Tanggal" r={formatDate(tx.createdAt)} />
        <Row l="Waktu" r={formatTime(tx.createdAt)} />
        {!bill && <Row l="Kasir" r={tx.cashier} />}
        {tx.orderType && <Row l="Tipe" r={ORDER_TYPE_LABEL[tx.orderType]} />}
        {tx.tableName && <Row l="Meja" r={tx.tableName} />}
        {tx.customerName && <Row l="Pelanggan" r={tx.customerName} />}
      </div>
      {dash}
      <ul className="flex flex-col gap-2">
        {tx.items.map((i, idx) => (
          <li key={i.productId + idx}>
            <p className="font-semibold">{i.name}</p>
            {i.note && <p className="text-[11.5px] italic">Catatan: {i.note}</p>}
            <Row l={`${formatNumber(i.qty)} x ${rp(i.price)}`} r={rp(i.qty * i.price)} />
          </li>
        ))}
      </ul>
      {dash}
      <div className="flex flex-col gap-0.5">
        <Row l="Subtotal" r={rp(tx.subtotal)} />
        {tx.discount > 0 && <Row l={tx.discountLabel || 'Diskon'} r={`- ${rp(tx.discount)}`} />}
        {!!tx.serviceCharge && <Row l={`Layanan (${(tx.serviceRate ?? 0).toLocaleString('id-ID')}%)`} r={rp(tx.serviceCharge)} />}
        <Row l={`Pajak (${tx.taxRate.toLocaleString('id-ID')}%)`} r={rp(tx.tax)} />
      </div>
      <div className="mt-2 border-t border-neutral-800 pt-2">
        <Row l="Total Pembayaran" r={rp(tx.total)} strong />
      </div>
      {!bill && (
        <>
          {dash}
          <div className="flex flex-col gap-0.5">
            <Row l="Metode Pembayaran" r={PAYMENT_LABEL[tx.method]} />
            <Row l="Uang Diterima" r={rp(tx.received)} />
            <Row l="Uang Kembalian" r={rp(tx.change)} />
          </div>
        </>
      )}
      {dash}
      {tx.status === 'Dikembalikan' && (
        <p className="mb-2 rounded border border-neutral-800 py-1 text-center text-[13px] font-bold tracking-wide uppercase">Transaksi dikembalikan</p>
      )}
      <footer className="text-center">
        <p>{settings.receiptNote}</p>
        <p className="mt-1.5 font-semibold">Terima kasih</p>
      </footer>
    </article>
  )
}
