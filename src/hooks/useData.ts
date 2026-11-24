import { useMemo } from 'react'
import { useStore } from '@/store/useStore'

/** Transaksi yang dihitung sebagai penjualan (refund dikecualikan). */
export function useValidTransactions() {
  const transactions = useStore((s) => s.transactions)
  return useMemo(() => transactions.filter((t) => t.status === 'Berhasil'), [transactions])
}
