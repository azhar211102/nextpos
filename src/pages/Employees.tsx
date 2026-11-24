import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, PageHeader, Pill, SimpleSelect } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { hashPin, validPin } from '@/lib/pin'
import { useActiveEmployee, useStore } from '@/store/useStore'
import { PERMISSIONS, ROLE_DEFAULTS, ROLES, type Employee, type Permission, type Role } from '@/types'

type Errors = { name?: string; pin?: string }

function EmployeeForm({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const employees = useStore((s) => s.employees)
  const addEmployee = useStore((s) => s.addEmployee)
  const updateEmployee = useStore((s) => s.updateEmployee)
  const [name, setName] = useState(employee?.name ?? '')
  const [role, setRole] = useState<Role>(employee?.role ?? 'Kasir')
  const [perms, setPerms] = useState<Permission[]>(employee?.permissions ?? ROLE_DEFAULTS.Kasir)
  const [active, setActive] = useState(employee?.active ?? true)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const owner = role === 'Pemilik'

  const changeRole = (r: Role) => { setRole(r); setPerms(ROLE_DEFAULTS[r]) }
  const toggle = (p: Permission) => setPerms((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const er: Errors = {}
    if (!name.trim()) er.name = 'Nama karyawan wajib diisi.'
    else if (employees.some((x) => x.id !== employee?.id && x.name.toLowerCase() === name.trim().toLowerCase())) er.name = 'Nama sudah dipakai karyawan lain.'
    if (!employee && !pin) er.pin = 'PIN wajib diisi untuk karyawan baru.'
    else if (pin && !validPin(pin)) er.pin = 'PIN harus 4–6 digit angka.'
    setErr(er)
    if (Object.keys(er).length) return
    setBusy(true)
    const permissions = owner ? ROLE_DEFAULTS.Pemilik : perms
    if (employee) {
      const patch: Partial<Employee> = { name: name.trim(), role, permissions, active }
      if (pin) patch.pinHash = await hashPin(pin)
      const r = updateEmployee(employee.id, patch)
      setBusy(false)
      if (!r.ok) return toast.error(r.error)
      toast.success(`${name.trim()} berhasil diubah.`)
    } else {
      addEmployee({ name: name.trim(), role, permissions, active, pinHash: await hashPin(pin) })
      setBusy(false)
      toast.success(`${name.trim()} berhasil ditambahkan.`)
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{employee ? 'Ubah Karyawan' : 'Tambah Karyawan'}</DialogTitle>
            <DialogDescription>Atur akun, PIN, peran, dan halaman yang boleh dibuka.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="em-name">Nama</Label>
              <Input id="em-name" autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr((x) => ({ ...x, name: undefined })) }} aria-invalid={!!err.name} aria-describedby={err.name ? 'em-e-name' : undefined} className="h-10" />
              {err.name && <p id="em-e-name" role="alert" className="text-xs text-red-700 dark:text-red-400">{err.name}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="em-role">Peran</Label>
              <SimpleSelect<Role> id="em-role" value={role} onChange={changeRole} options={ROLES.map((r) => ({ value: r, label: r }))} className="h-10 w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="em-pin">PIN {employee && <span className="font-normal text-muted-foreground">(kosongkan bila tidak diubah)</span>}</Label>
              <Input id="em-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr((x) => ({ ...x, pin: undefined })) }} aria-invalid={!!err.pin} aria-describedby={err.pin ? 'em-e-pin' : undefined} className="num h-10" />
              {err.pin && <p id="em-e-pin" role="alert" className="text-xs text-red-700 dark:text-red-400">{err.pin}</p>}
            </div>
          </div>
          <fieldset className="rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-semibold">Hak akses</legend>
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {PERMISSIONS.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-[var(--chart-1)]" checked={owner || perms.includes(p.id)} disabled={owner} onChange={() => toggle(p.id)} />
                  {p.label}
                </label>
              ))}
            </div>
            {owner && <p className="mt-2 text-xs text-muted-foreground">Pemilik selalu memiliki seluruh hak akses.</p>}
          </fieldset>
          <div className="flex items-center gap-3">
            <Switch id="em-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="em-active">Akun aktif</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10" onClick={onClose}>Batal</Button>
            <Button type="submit" className="h-10 px-5 font-semibold" disabled={busy}>Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Employees() {
  const employees = useStore((s) => s.employees)
  const deleteEmployee = useStore((s) => s.deleteEmployee)
  const me = useActiveEmployee()
  const [form, setForm] = useState<{ employee: Employee | null } | null>(null)
  const [del, setDel] = useState<Employee | null>(null)

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Karyawan" description="Kelola akun, PIN, peran, dan hak akses."
        actions={<Button className="h-10 gap-2 px-4 font-semibold" onClick={() => setForm({ employee: null })}><Plus className="size-4" aria-hidden /> Tambah Karyawan</Button>} />
      <p className="mb-4 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        PIN dan hak akses berlaku di perangkat ini dan dipakai untuk mengganti karyawan di kasir. Data tersimpan di LocalStorage, jadi ini bukan pengganti keamanan server.
      </p>
      <div className="surface">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm" data-testid="tabel-karyawan">
            <thead><tr className="text-left text-[13px] text-muted-foreground">
              <th className="px-5 py-3 font-medium">Nama</th><th className="px-3 py-3 font-medium">Peran</th>
              <th className="px-3 py-3 font-medium">Hak akses</th><th className="px-3 py-3 font-medium">Status</th><th className="px-5 py-3"><span className="sr-only">Aksi</span></th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-secondary/50" data-testid="baris-karyawan">
                  <td className="px-5 py-3 font-semibold whitespace-nowrap">{e.name}{e.id === me?.id && <span className="ml-2 text-xs font-normal text-muted-foreground">(Anda)</span>}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{e.role}</td>
                  <td className="px-3 py-3 text-muted-foreground">{e.role === 'Pemilik' ? 'Semua halaman' : PERMISSIONS.filter((p) => e.permissions.includes(p.id)).map((p) => p.label).join(', ') || '—'}</td>
                  <td className="px-3 py-3">{e.active ? <Pill tone="green">Aktif</Pill> : <Pill tone="slate">Nonaktif</Pill>}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label={`Ubah ${e.name}`} onClick={() => setForm({ employee: e })}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Hapus ${e.name}`} className="text-red-700 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" onClick={() => setDel(e)}><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {form && <EmployeeForm key={form.employee?.id ?? 'baru'} employee={form.employee} onClose={() => setForm(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Hapus ${del?.name ?? 'karyawan'}?`}
        description="Akun dihapus permanen. Transaksi lama tetap mencatat nama kasirnya." confirmLabel="Hapus" destructive
        onConfirm={() => { if (del) { const r = deleteEmployee(del.id); if (r.ok) toast.success(`${del.name} dihapus.`); else toast.error(r.error) } }} />
    </div>
  )
}
