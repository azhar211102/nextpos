import { useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store/useStore'

/** Tambah, ubah nama, dan hapus kategori produk. Kategori yang masih berisi produk tidak bisa dihapus. */
export function CategoryManager({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const categories = useStore((s) => s.categories)
  const products = useStore((s) => s.products)
  const addCategory = useStore((s) => s.addCategory)
  const renameCategory = useStore((s) => s.renameCategory)
  const deleteCategory = useStore((s) => s.deleteCategory)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')

  const report = (r: { ok: boolean; error?: string }, ok: string) => {
    if (!r.ok) { setErr(r.error ?? 'Gagal.'); return false }
    setErr(''); toast.success(ok); return true
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kelola Kategori</DialogTitle>
          <DialogDescription>Kategori dipakai di katalog kasir dan filter produk.</DialogDescription>
        </DialogHeader>
        <form className="flex gap-2" noValidate onSubmit={(e) => { e.preventDefault(); if (report(addCategory(name), `Kategori ${name.trim()} ditambahkan.`)) setName('') }}>
          <Input aria-label="Nama kategori baru" placeholder="Nama kategori baru" value={name} onChange={(e) => { setName(e.target.value); setErr('') }} className="h-10" />
          <Button type="submit" className="h-10 px-4 font-semibold">Tambah</Button>
        </form>
        {err && <p role="alert" className="text-xs text-red-700 dark:text-red-400">{err}</p>}
        <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border" data-testid="daftar-kategori">
          {categories.map((c) => {
            const count = products.filter((p) => p.category === c).length
            return (
              <li key={c} className="flex items-center gap-2 px-3 py-2 text-sm">
                {editing === c ? (
                  <>
                    <Input aria-label={`Nama baru untuk ${c}`} autoFocus value={draft} onChange={(e) => { setDraft(e.target.value); setErr('') }} onKeyDown={(e) => e.key === 'Enter' && report(renameCategory(c, draft), 'Kategori diubah.') && setEditing(null)} className="h-8" />
                    <Button size="icon" variant="ghost" aria-label="Simpan nama" onClick={() => report(renameCategory(c, draft), 'Kategori diubah.') && setEditing(null)}><Check className="size-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Batal ubah" onClick={() => { setEditing(null); setErr('') }}><X className="size-4" /></Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{c}</span>
                    <span className="num text-xs text-muted-foreground">{count} produk</span>
                    <Button size="icon" variant="ghost" aria-label={`Ubah nama ${c}`} onClick={() => { setEditing(c); setDraft(c); setErr('') }}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Hapus kategori ${c}`} className="text-red-700 dark:text-red-400" onClick={() => report(deleteCategory(c), `Kategori ${c} dihapus.`)}><Trash2 className="size-4" /></Button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
