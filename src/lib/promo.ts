import { dayKey } from './format'
import type { Promotion } from '@/types'

export type PromoState = 'aktif' | 'terjadwal' | 'berakhir' | 'nonaktif'

export function promoState(p: Promotion, now = new Date()): PromoState {
  if (!p.active) return 'nonaktif'
  const k = dayKey(now)
  if (k < p.startDate) return 'terjadwal'
  if (k > p.endDate) return 'berakhir'
  return 'aktif'
}

/** Promo dapat dipakai sekarang untuk subtotal tertentu. */
export function promoApplies(p: Promotion, subtotal: number, now = new Date()): boolean {
  return promoState(p, now) === 'aktif' && subtotal >= p.minSubtotal && subtotal > 0
}

export function promoLabel(p: Promotion): string {
  return p.type === 'persen' ? `${p.value}%` : `Rp ${p.value.toLocaleString('id-ID')}`
}
