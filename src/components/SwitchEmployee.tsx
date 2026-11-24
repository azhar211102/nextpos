import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SimpleSelect } from '@/components/common'
import { hashPin } from '@/lib/pin'
import { useStore } from '@/store/useStore'

/** Ganti karyawan aktif dengan PIN. PIN hanya membedakan akun di perangkat ini; bukan keamanan sungguhan. */
export function SwitchEmployeeDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone?: () => void }) {
  const employees = useStore((s) => s.employees)
  const activeId = useStore((s) => s.activeEmployeeId)
  const switchEmployee = useStore((s) => s.switchEmployee)
  const candidates = employees.filter((e) => e.active)
  const [target, setTarget] = useState(activeId)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const emp = employees.find((x) => x.id === target)
    if (!emp) return
    setBusy(true)
    const h = await hashPin(pin)
    setBusy(false)
    if (h !== emp.pinHash) {
      setError('PIN salah. Coba lagi.')
      setPin('')
      return
    }
    switchEmployee(emp.id)
    toast.success(`Masuk sebagai ${emp.name}.`)
    setPin('')
    setError('')
    onOpenChange(false)
    onDone?.()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setPin(''); setError('') } }}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Ganti Karyawan</DialogTitle>
            <DialogDescription>Pilih akun lalu masukkan PIN 4–6 digit.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sw-emp">Karyawan</Label>
            <SimpleSelect id="sw-emp" value={target} onChange={(v) => { setTarget(v); setError('') }} className="h-10 w-full"
              options={candidates.map((c) => ({ value: c.id, label: `${c.name} — ${c.role}` }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sw-pin">PIN</Label>
            <Input id="sw-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} aria-invalid={!!error}
              aria-describedby={error ? 'sw-err' : undefined}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError('') }} className="num h-10 tracking-[0.4em]" />
            {error && <p id="sw-err" role="alert" className="text-xs text-red-700 dark:text-red-400">{error}</p>}
            <p className="text-xs text-muted-foreground">PIN contoh: Pemilik 1234, Kasir 1111, Manajer 2222, Gudang 3333.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" className="h-10 px-5 font-semibold" disabled={pin.length < 4 || busy}>Masuk</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
