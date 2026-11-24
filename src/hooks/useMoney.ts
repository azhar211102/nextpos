import { useMemo } from 'react'
import { calcTotals } from '@/lib/calc'
import { formatCurrency } from '@/lib/format'
import { useStore } from '@/store/useStore'
import { isFnb } from '@/types'

/** Fungsi format mata uang yang mengikuti Pengaturan. */
export function useMoney() {
  const currency = useStore((s) => s.settings.currency)
  return useMemo(() => (n: number) => formatCurrency(n, currency), [currency])
}

export function useCartTotals() {
  const cart = useStore((s) => s.cart)
  const products = useStore((s) => s.products)
  const discount = useStore((s) => s.discount)
  const taxRate = useStore((s) => s.settings.taxRate)
  const serviceRate = useStore((s) => (isFnb(s.settings.businessType) ? s.settings.serviceRate : 0))
  return useMemo(() => calcTotals(cart, products, discount, taxRate, serviceRate), [cart, products, discount, taxRate, serviceRate])
}
