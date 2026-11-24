import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Armchair, CalendarCheck, ChartColumn, ChefHat, ChevronsUpDown, ClipboardList, Layers, LayoutDashboard, Menu, Package,
  ReceiptText, Settings as SettingsIcon, ShoppingCart, Tag, UserCog, Users,
} from 'lucide-react'
import { EmptyState } from '@/components/common'
import { Logo } from '@/components/Logo'
import { SwitchEmployeeDialog } from '@/components/SwitchEmployee'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { hhmm } from '@/lib/attendance'
import { dayKey, formatDateLong } from '@/lib/format'
import { cn } from '@/lib/utils'
import { can, useActiveEmployee, useIsFnb, useStore } from '@/store/useStore'
import { BUSINESS_LABEL, type Permission } from '@/types'

interface NavItem { to: string; label: string; icon: typeof Menu; perm: Permission; end?: boolean; fnbOnly?: boolean }
const GROUPS: NavItem[][] = [
  [
    { to: '/', label: 'Ringkasan', icon: LayoutDashboard, perm: 'ringkasan', end: true },
    { to: '/kasir', label: 'Kasir (POS)', icon: ShoppingCart, perm: 'kasir' },
    { to: '/pesanan', label: 'Pesanan', icon: ClipboardList, perm: 'pesanan' },
    { to: '/meja', label: 'Meja', icon: Armchair, perm: 'pesanan', fnbOnly: true },
    { to: '/dapur', label: 'Dapur', icon: ChefHat, perm: 'pesanan', fnbOnly: true },
  ],
  [
    { to: '/produk', label: 'Produk', icon: Package, perm: 'produk' },
    { to: '/inventaris', label: 'Inventaris', icon: Layers, perm: 'inventaris' },
    { to: '/transaksi', label: 'Transaksi', icon: ReceiptText, perm: 'transaksi' },
  ],
  [
    { to: '/laporan', label: 'Laporan', icon: ChartColumn, perm: 'laporan' },
    { to: '/pelanggan', label: 'Pelanggan', icon: Users, perm: 'pelanggan' },
    { to: '/promosi', label: 'Promosi', icon: Tag, perm: 'promosi' },
  ],
  [
    { to: '/karyawan', label: 'Karyawan', icon: UserCog, perm: 'karyawan' },
    { to: '/absensi', label: 'Absensi', icon: CalendarCheck, perm: 'absensi' },
  ],
  [{ to: '/pengaturan', label: 'Pengaturan', icon: SettingsIcon, perm: 'pengaturan' }],
]
const ALL = GROUPS.flat()

/** Pembatas hak akses halaman. Dari "/" mengarahkan ke halaman pertama yang boleh dibuka. */
export function Guard({ perm, fnb, children }: { perm: Permission; fnb?: boolean; children: React.ReactNode }) {
  const emp = useActiveEmployee()
  const isFnb = useIsFnb()
  const { pathname } = useLocation()
  if (fnb && !isFnb) {
    return (
      <div className="surface mx-auto mt-10 max-w-lg">
        <EmptyState icon={<Armchair className="size-5" />} title="Fitur khusus kafe dan restoran" description="Ubah jenis usaha di Pengaturan untuk memakai meja dan dapur." />
      </div>
    )
  }
  if (can(emp, perm)) return <>{children}</>
  const first = ALL.find((n) => can(emp, n.perm))
  if (pathname === '/' && first && first.to !== '/') return <Navigate to={first.to} replace />
  return (
    <div className="surface mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={<UserCog className="size-5" />}
        title="Akses ditolak"
        description={`Akun ${emp?.name ?? ''} (${emp?.role ?? ''}) tidak punya hak untuk membuka halaman ini. Ganti karyawan atau ubah hak akses di menu Karyawan.`}
      />
    </div>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const emp = useActiveEmployee()
  const fnb = useIsFnb()
  const cartCount = useStore((s) => s.cart.reduce((n, l) => n + l.qty, 0))
  const orderCount = useStore((s) => s.orders.length)
  const [switching, setSwitching] = useState(false)
  return (
    <div className="flex h-full flex-col text-sidebar-foreground">
      <div className="px-5 pt-5 pb-4">
        <Logo />
      </div>
      <nav aria-label="Navigasi utama" className="flex flex-1 flex-col overflow-y-auto px-3 pb-2">
        {GROUPS.map((g, gi) => {
          const items = g.filter((n) => can(emp, n.perm) && (!n.fnbOnly || fnb))
          if (!items.length) return null
          return (
            <div key={gi} className={cn('flex flex-col gap-0.5', gi > 0 && 'mt-2 border-t border-sidebar-border pt-2')}>
              {items.map(({ to, label, icon: Icon, end }) => {
                const badge = to === '/kasir' ? cartCount : to === '/pesanan' ? orderCount : 0
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'press flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium',
                        isActive ? 'bg-accent font-semibold text-sky' : 'hover:bg-sidebar-accent hover:text-foreground',
                      )
                    }
                  >
                    <Icon className="size-[17px] shrink-0" strokeWidth={1.8} aria-hidden />
                    <span className="flex-1">{label}</span>
                    {badge > 0 && (
                      <span aria-label={`${badge} ${to === '/kasir' ? 'barang di keranjang' : 'pesanan terbuka'}`} className="num grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                        {badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => setSwitching(true)}
          className="press flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-sidebar-accent"
          aria-label={`Karyawan aktif ${emp?.name}. Ganti karyawan`}
        >
          <span className="grid size-8 place-items-center rounded-full bg-secondary text-sm font-bold text-foreground/80">{emp?.name.slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-foreground">{emp?.name}</span>
            <span className="block text-xs text-muted-foreground">{emp?.role}</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </div>
      <SwitchEmployeeDialog open={switching} onOpenChange={setSwitching} onDone={onNavigate} />
    </div>
  )
}

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/** Bilah atas: identitas outlet, jam, dan status absen karyawan aktif. */
function TopBar() {
  const store = useStore((s) => s.settings)
  const emp = useActiveEmployee()
  const rec = useStore((s) => s.attendance.find((a) => a.employeeId === emp?.id && a.date === dayKey(new Date())))
  const now = useNow()
  const time = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`
  return (
    <div className="no-print sticky top-0 z-20 hidden h-12 items-center justify-between border-b border-border bg-card px-8 lg:flex">
      <p className="text-sm">
        <span className="font-semibold">{store.storeName}</span>
        <span className="ml-2 text-muted-foreground">{BUSINESS_LABEL[store.businessType]}</span>
      </p>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="num">{formatDateLong(now)} · {time}</span>
        <ThemeToggle />
        {can(emp, 'absensi') && (
          <Link to="/absensi" className={cn('press inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold', !rec ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/50 text-yellow-900 dark:text-yellow-300' : rec.clockOut ? 'border-input bg-secondary text-foreground/80' : 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300')}>
            <CalendarCheck className="size-3.5" aria-hidden />
            {!rec ? 'Belum absen' : rec.clockOut ? `Pulang ${hhmm(rec.clockOut)}` : `Masuk ${hhmm(rec.clockIn)}`}
          </Link>
        )}
      </div>
    </div>
  )
}

export function AppShell() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const immersive = pathname.startsWith('/struk')
  return (
    <div className="min-h-dvh lg:pl-[224px]">
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Lewati ke konten
      </a>
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[224px] border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody />
      </aside>

      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card px-3 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Buka menu navigasi" className="press grid size-10 place-items-center rounded-md hover:bg-secondary">
          <Menu className="size-5" />
        </button>
        <Logo compact />
        <span className="ml-auto"><ThemeToggle /></span>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[260px] max-w-[85vw] border-0 bg-sidebar p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
          <SheetDescription className="sr-only">Pilih halaman NEXTPOS</SheetDescription>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {!immersive && <TopBar />}
      <main id="konten" tabIndex={-1} className={cn('min-w-0 outline-none', immersive ? 'p-0' : 'px-4 py-5 sm:px-6 lg:px-8 lg:py-6')}>
        <Outlet />
      </main>
    </div>
  )
}
