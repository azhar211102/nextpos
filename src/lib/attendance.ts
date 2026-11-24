import { dayKey } from './format'
import type { AttendanceRecord, Settings } from '@/types'

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
export const minutesOfDay = (iso: string) => {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

export type AttendanceStatus = 'Tepat Waktu' | 'Terlambat'

export function lateMinutes(rec: AttendanceRecord, s: Pick<Settings, 'shiftStart' | 'lateTolerance'>): number {
  return Math.max(0, minutesOfDay(rec.clockIn) - toMin(s.shiftStart) - s.lateTolerance)
}

export function attendanceStatus(rec: AttendanceRecord, s: Pick<Settings, 'shiftStart' | 'lateTolerance'>): AttendanceStatus {
  return lateMinutes(rec, s) > 0 ? 'Terlambat' : 'Tepat Waktu'
}

/** Durasi kerja dalam menit; null bila belum absen pulang. */
export function workedMinutes(rec: AttendanceRecord): number | null {
  if (!rec.clockOut) return null
  return Math.max(0, Math.round((new Date(rec.clockOut).getTime() - new Date(rec.clockIn).getTime()) / 60000))
}

export function formatDuration(min: number | null): string {
  if (min === null) return '—'
  return `${Math.floor(min / 60)} jam ${String(min % 60).padStart(2, '0')} mnt`
}

export const todayKey = () => dayKey(new Date())
export const hhmm = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
}

/** Gabungkan tanggal (YYYY-MM-DD) dan jam (HH:MM) menjadi ISO lokal. */
export function combine(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, h || 0, mi || 0).toISOString()
}
