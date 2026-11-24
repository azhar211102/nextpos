import { useEffect, useMemo, useState } from 'react'
import { Download, LogIn, LogOut, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, EmptyState, PageHeader, Panel, Pill, SimpleSelect } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { attendanceStatus, combine, formatDuration, hhmm, lateMinutes, minutesOfDay, todayKey, workedMinutes } from '@/lib/attendance'
import { downloadCsv } from '@/lib/csv'
import { dayKey, formatDate, formatDateLong } from '@/lib/format'
import { hashPin } from '@/lib/pin'
import { cn } from '@/lib/utils'
import { can, useActiveEmployee, useStore } from '@/store/useStore'
import type { AttendanceRecord } from '@/types'

const PRESETS = [{ id: 'hari', label: 'Hari Ini' }, { id: '7', label: '7 Hari' }, { id: 'bulan', label: 'Bulan Ini' }] as const
function presetRange(id: string): [string, string] {
  const end = new Date(), start = new Date()
  if (id === '7') start.setDate(end.getDate() - 6)
  if (id === 'bulan') start.setDate(1)
  return [dayKey(start), dayKey(end)]
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  return now
}

function ClockCard() {
  const now = useClock()
  const me = useActiveEmployee()
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const settings = useStore((s) => s.settings)
  const clockIn = useStore((s) => s.clockIn)
  const clockOut = useStore((s) => s.clockOut)
  const [target, setTarget] = useState(me?.id ?? '')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const emp = employees.find((e) => e.id === target)
  const rec = attendance.find((a) => a.employeeId === target && a.date === todayKey())
  const t = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`

  const act = async (kind: 'in' | 'out') => {
    if (!emp || busy) return
    setBusy(true)
    const ok = (await hashPin(pin)) === emp.pinHash
    setBusy(false)
    if (!ok) { setErr('PIN salah. Coba lagi.'); setPin(''); return }
    const r = kind === 'in' ? clockIn(emp.id) : clockOut(emp.id)
    if (!r.ok) return setErr(r.error ?? 'Gagal.')
    toast.success(kind === 'in' ? `${emp.name} absen masuk pukul ${t}.` : `${emp.name} absen pulang pukul ${t}.`)
    setPin(''); setErr('')
  }

  return (
    <Panel title="Absen" className="h-full">
      <p className="num text-4xl leading-none font-bold" aria-live="off">{t}<span className="ml-1 text-lg font-medium text-muted-foreground">.{String(now.getSeconds()).padStart(2, '0')}</span></p>
      <p className="mt-1 text-sm text-muted-foreground">{formatDateLong(now)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Jam kerja {settings.shiftStart.replace(':', '.')}–{settings.shiftEnd.replace(':', '.')}, toleransi {settings.lateTolerance} menit.</p>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="abs-emp">Karyawan</Label>
          <SimpleSelect id="abs-emp" value={target} onChange={(v) => { setTarget(v); setErr(''); setPin('') }} className="h-10 w-full"
            options={employees.filter((e) => e.active).map((e) => ({ value: e.id, label: `${e.name} — ${e.role}` }))} />
        </div>
        <div className="rounded-md bg-secondary/70 px-3 py-2 text-sm" data-testid="status-absen" aria-live="polite">
          {!rec ? 'Belum absen hari ini.' : rec.clockOut ? `Masuk ${hhmm(rec.clockIn)}, pulang ${hhmm(rec.clockOut)} (${formatDuration(workedMinutes(rec))}).` : `Masuk ${hhmm(rec.clockIn)}${lateMinutes(rec, settings) ? `, terlambat ${lateMinutes(rec, settings)} menit` : ', tepat waktu'}.`}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="abs-pin">PIN</Label>
          <Input id="abs-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} aria-invalid={!!err} aria-describedby={err ? 'abs-err' : undefined}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr('') }} className="num h-10 tracking-[0.4em]" />
          {err && <p id="abs-err" role="alert" className="text-xs text-red-700 dark:text-red-400">{err}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-11 gap-2 font-semibold" disabled={pin.length < 4 || busy || !!rec} onClick={() => act('in')}><LogIn className="size-4" aria-hidden /> Absen Masuk</Button>
          <Button variant="outline" className="h-11 gap-2 font-semibold" disabled={pin.length < 4 || busy || !rec || !!rec.clockOut} onClick={() => act('out')}><LogOut className="size-4" aria-hidden /> Absen Pulang</Button>
        </div>
        <p className="text-xs text-muted-foreground">Absensi memakai PIN dan jam perangkat ini. Tidak ada foto atau lokasi, dan data tidak dikirim ke server.</p>
      </div>
    </Panel>
  )
}

function RecordForm({ rec, onClose }: { rec: AttendanceRecord | null; onClose: () => void }) {
  const employees = useStore((s) => s.employees)
  const saveAttendance = useStore((s) => s.saveAttendance)
  const [empId, setEmpId] = useState(rec?.employeeId ?? employees.find((e) => e.active)?.id ?? '')
  const [date, setDate] = useState(rec?.date ?? todayKey())
  const [tin, setTin] = useState(rec ? hhmm(rec.clockIn).replace('.', ':') : '08:00')
  const [tout, setTout] = useState(rec?.clockOut ? hhmm(rec.clockOut).replace('.', ':') : '')
  const [note, setNote] = useState(rec?.note ?? '')
  const [err, setErr] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return setErr('Tanggal wajib diisi.')
    if (!tin) return setErr('Jam masuk wajib diisi.')
    const r = saveAttendance({ id: rec?.id, employeeId: empId, date, clockIn: combine(date, tin), clockOut: tout ? combine(date, tout) : undefined, note: note.trim() })
    if (!r.ok) return setErr(r.error ?? 'Gagal menyimpan.')
    toast.success('Catatan absensi disimpan.')
    onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader><DialogTitle>{rec ? 'Ubah Absensi' : 'Tambah Koreksi Absensi'}</DialogTitle><DialogDescription>Catatan manual ditandai "Manual" pada riwayat.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-1.5"><Label htmlFor="ab-emp">Karyawan</Label>
            <SimpleSelect id="ab-emp" value={empId} onChange={(v) => { setEmpId(v); setErr('') }} className="h-10 w-full" options={employees.map((e) => ({ value: e.id, label: e.name }))} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 flex flex-col gap-1.5 sm:col-span-1"><Label htmlFor="ab-date">Tanggal</Label><Input id="ab-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setErr('') }} className="h-10" /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="ab-in">Jam masuk</Label><Input id="ab-in" type="time" value={tin} onChange={(e) => { setTin(e.target.value); setErr('') }} className="h-10" /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="ab-out">Jam pulang</Label><Input id="ab-out" type="time" value={tout} onChange={(e) => { setTout(e.target.value); setErr('') }} className="h-10" /></div>
          </div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="ab-note">Catatan</Label><Input id="ab-note" value={note} placeholder="mis. lupa absen, izin sakit" onChange={(e) => setNote(e.target.value)} className="h-10" /></div>
          {err && <p role="alert" className="text-xs text-red-700 dark:text-red-400">{err}</p>}
          <DialogFooter><Button type="button" variant="outline" className="h-10" onClick={onClose}>Batal</Button><Button type="submit" className="h-10 px-5 font-semibold">Simpan</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Attendance() {
  const me = useActiveEmployee()
  const manage = can(me, 'absensi_kelola')
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const settings = useStore((s) => s.settings)
  const deleteAttendance = useStore((s) => s.deleteAttendance)
  const [preset, setPreset] = useState('7')
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange('7'))
  const [who, setWho] = useState('semua')
  const [form, setForm] = useState<{ rec: AttendanceRecord | null } | null>(null)
  const [del, setDel] = useState<AttendanceRecord | null>(null)

  const today = todayKey()
  const todayRecs = attendance.filter((a) => a.date === today)
  const onDuty = employees.filter((e) => e.active && todayRecs.some((a) => a.employeeId === e.id && !a.clockOut))
  const notYet = employees.filter((e) => e.active && !todayRecs.some((a) => a.employeeId === e.id))
  const rangeErr = from > to ? 'Tanggal awal tidak boleh setelah tanggal akhir.' : ''

  const rows = useMemo(
    () => attendance.filter((a) => !rangeErr && a.date >= from && a.date <= to && (manage ? who === 'semua' || a.employeeId === who : a.employeeId === me?.id)),
    [attendance, from, to, who, manage, me?.id, rangeErr],
  )

  const recap = useMemo(() => {
    const list = (manage ? employees.filter((e) => e.active) : employees.filter((e) => e.id === me?.id))
    // hari kerja = Senin–Sabtu sampai hari ini dalam rentang
    let workdays = 0
    const end = to < today ? to : today
    for (let d = new Date(`${from}T12:00`); dayKey(d) <= end; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) workdays++
    return list.map((e) => {
      const mine = rows.filter((r) => r.employeeId === e.id)
      const minutes = mine.reduce((s, r) => s + (workedMinutes(r) ?? 0), 0)
      const late = mine.filter((r) => attendanceStatus(r, settings) === 'Terlambat').length
      const avgIn = mine.length ? Math.round(mine.reduce((s, r) => s + minutesOfDay(r.clockIn), 0) / mine.length) : null
      return { e, present: mine.length, minutes, late, avgIn, absent: e.role === 'Pemilik' ? null : Math.max(0, workdays - mine.length) }
    })
  }, [rows, employees, manage, me?.id, from, to, today, settings])

  const exportCsv = () => {
    if (!rows.length) return toast.error('Tidak ada data absensi pada rentang ini.')
    downloadCsv(`absensi-${from}-sd-${to}.csv`, [
      ['Tanggal', 'Karyawan', 'Masuk', 'Pulang', 'Durasi (menit)', 'Status', 'Terlambat (menit)', 'Catatan'],
      ...rows.map((r) => [r.date, r.employeeName, hhmm(r.clockIn), r.clockOut ? hhmm(r.clockOut) : '', workedMinutes(r) ?? '', attendanceStatus(r, settings), lateMinutes(r, settings), r.note]),
    ])
    toast.success('Absensi diunduh.')
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Absensi" description="Catat jam masuk dan pulang karyawan di perangkat ini."
        actions={manage ? <Button className="h-10 gap-2 px-4 font-semibold" onClick={() => setForm({ rec: null })}><Plus className="size-4" aria-hidden /> Tambah Koreksi</Button> : undefined} />

      <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <ClockCard />
        <Panel title="Hari Ini">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Sedang bertugas <span className="num text-muted-foreground">({onDuty.length})</span></h3>
              {onDuty.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada yang bertugas.</p> : (
                <ul className="flex flex-col divide-y divide-border text-sm" data-testid="bertugas">
                  {onDuty.map((e) => { const r = todayRecs.find((a) => a.employeeId === e.id)!; return (
                    <li key={e.id} className="flex items-center gap-2 py-2"><span className="size-2 rounded-full bg-green-600" aria-hidden /><span className="flex-1 font-medium">{e.name}</span><span className="num text-muted-foreground">sejak {hhmm(r.clockIn)}</span></li>
                  ) })}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Belum absen <span className="num text-muted-foreground">({notYet.length})</span></h3>
              {notYet.length === 0 ? <p className="text-sm text-muted-foreground">Semua karyawan sudah absen.</p> : (
                <ul className="flex flex-col divide-y divide-border text-sm">
                  {notYet.map((e) => <li key={e.id} className="flex items-center gap-2 py-2"><span className="size-2 rounded-full bg-stone-300" aria-hidden /><span className="flex-1 font-medium">{e.name}</span><span className="text-muted-foreground">{e.role}</span></li>)}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <div className="surface mt-4 flex flex-wrap items-end gap-4 p-4">
        <div role="group" aria-label="Rentang cepat" className="flex rounded-md bg-secondary p-1">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => { setPreset(p.id); setRange(presetRange(p.id)) }}
              className={cn('press h-8 rounded px-3.5 text-sm font-medium', preset === p.id ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{p.label}</button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Dari tanggal<Input type="date" value={from} max={to} onChange={(e) => { setPreset('kustom'); setRange([e.target.value, to]) }} className="h-10 w-[150px]" /></label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Sampai tanggal<Input type="date" value={to} min={from} onChange={(e) => { setPreset('kustom'); setRange([from, e.target.value]) }} className="h-10 w-[150px]" /></label>
        {manage && <SimpleSelect ariaLabel="Filter karyawan" value={who} onChange={setWho} options={[{ value: 'semua', label: 'Semua Karyawan' }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />}
        <Button variant="outline" className="ml-auto h-10 gap-2" onClick={exportCsv}><Download className="size-4" aria-hidden /> Unduh CSV</Button>
        {rangeErr && <p role="alert" className="w-full text-sm text-red-700 dark:text-red-400">{rangeErr}</p>}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="surface min-w-0">
          <h2 className="px-5 pt-4 pb-2 text-[17px] font-bold">Riwayat Absensi</h2>
          {rows.length === 0 ? <EmptyState icon={<Pencil className="size-5" />} title="Tidak ada catatan absensi" description="Ubah rentang tanggal atau filter karyawan." /> : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm" data-testid="tabel-absensi">
                <thead><tr className="border-y border-border bg-secondary/60 text-left text-[13px] text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Tanggal</th><th className="px-3 py-2.5 font-medium">Karyawan</th><th className="px-3 py-2.5 font-medium">Masuk</th>
                  <th className="px-3 py-2.5 font-medium">Pulang</th><th className="px-3 py-2.5 font-medium">Durasi</th><th className="px-3 py-2.5 font-medium">Status</th>{manage && <th className="px-5 py-2.5"><span className="sr-only">Aksi</span></th>}
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {rows.slice(0, 120).map((r) => {
                    const st = attendanceStatus(r, settings)
                    const lm = lateMinutes(r, settings)
                    return (
                      <tr key={r.id} className="hover:bg-secondary/50" data-testid="baris-absensi">
                        <td className="px-5 py-2.5 whitespace-nowrap">{formatDate(`${r.date}T12:00`)}</td>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.employeeName}{r.manual && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Manual)</span>}</td>
                        <td className="num px-3 py-2.5">{hhmm(r.clockIn)}</td>
                        <td className="num px-3 py-2.5">{r.clockOut ? hhmm(r.clockOut) : <span className="whitespace-nowrap text-muted-foreground">Belum pulang</span>}</td>
                        <td className="num px-3 py-2.5 whitespace-nowrap text-muted-foreground">{formatDuration(workedMinutes(r))}</td>
                        <td className="px-3 py-2.5">{st === 'Terlambat' ? <Pill tone="amber">Terlambat {lm} mnt</Pill> : <Pill tone="green">Tepat Waktu</Pill>}</td>
                        {manage && (
                          <td className="px-5 py-2.5"><div className="flex justify-end gap-0.5">
                            <Button variant="ghost" size="icon" aria-label={`Ubah absensi ${r.employeeName} ${r.date}`} onClick={() => setForm({ rec: r })}><Pencil className="size-4" /></Button>
                            <Button variant="ghost" size="icon" aria-label={`Hapus absensi ${r.employeeName} ${r.date}`} className="text-red-700 dark:text-red-400" onClick={() => setDel(r)}><Trash2 className="size-4" /></Button>
                          </div></td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Panel title="Rekap" bodyClassName="px-0 pb-1">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[380px] text-sm" data-testid="tabel-rekap">
              <thead><tr className="border-y border-border bg-secondary/60 text-left text-[13px] text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Karyawan</th><th className="px-2 py-2.5 text-right font-medium">Hadir</th><th className="px-2 py-2.5 text-right font-medium">Jam</th><th className="px-2 py-2.5 text-right font-medium">Telat</th><th className="px-5 py-2.5 text-right font-medium">Absen</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {recap.map(({ e, present, minutes, late, absent }) => (
                  <tr key={e.id}><td className="px-5 py-2.5 font-medium">{e.name}</td><td className="num px-2 py-2.5 text-right">{present}</td>
                    <td className="num px-2 py-2.5 text-right">{(minutes / 60).toLocaleString('id-ID', { maximumFractionDigits: 1 })}</td>
                    <td className={cn('num px-2 py-2.5 text-right', late > 0 && 'font-semibold text-yellow-900 dark:text-yellow-300')}>{late}</td>
                    <td className={cn('num px-5 py-2.5 text-right', absent ? 'font-semibold text-red-700 dark:text-red-400' : '')}>{absent ?? '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 pt-2 pb-3 text-xs text-muted-foreground">Absen = hari kerja (Senin–Sabtu) tanpa catatan masuk, sampai hari ini.</p>
        </Panel>
      </div>

      {form && <RecordForm key={form.rec?.id ?? 'baru'} rec={form.rec} onClose={() => setForm(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Hapus catatan absensi?" description={del ? `Catatan ${del.employeeName} tanggal ${del.date} akan dihapus.` : ''} confirmLabel="Hapus" destructive
        onConfirm={() => { if (del) { deleteAttendance(del.id); toast.success('Catatan absensi dihapus.') } }} />
    </div>
  )
}
