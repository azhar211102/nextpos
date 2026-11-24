import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell, Guard } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
const Dashboard = lazy(() => import('@/pages/Dashboard'))
import Pos from '@/pages/Pos'

const Payment = lazy(() => import('@/pages/Payment'))
const ReceiptPage = lazy(() => import('@/pages/ReceiptPage'))
const Products = lazy(() => import('@/pages/Products'))
const Inventory = lazy(() => import('@/pages/Inventory'))
const Transactions = lazy(() => import('@/pages/Transactions'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const Reports = lazy(() => import('@/pages/Reports'))
const Customers = lazy(() => import('@/pages/Customers'))
const Employees = lazy(() => import('@/pages/Employees'))
const Promotions = lazy(() => import('@/pages/Promotions'))
const Orders = lazy(() => import('@/pages/Orders'))
const Tables = lazy(() => import('@/pages/Tables'))
const Kitchen = lazy(() => import('@/pages/Kitchen'))
const Attendance = lazy(() => import('@/pages/Attendance'))

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Suspense fallback={<div className="p-8 text-sm text-muted-foreground" role="status">Memuat…</div>}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Guard perm="ringkasan"><Dashboard /></Guard>} />
              <Route path="kasir" element={<Guard perm="kasir"><Pos /></Guard>} />
              <Route path="kasir/pembayaran" element={<Guard perm="kasir"><Payment /></Guard>} />
              <Route path="struk/:id" element={<Guard perm="transaksi"><ReceiptPage /></Guard>} />
              <Route path="pesanan" element={<Guard perm="pesanan"><Orders /></Guard>} />
              <Route path="meja" element={<Guard perm="pesanan" fnb><Tables /></Guard>} />
              <Route path="dapur" element={<Guard perm="pesanan" fnb><Kitchen /></Guard>} />
              <Route path="absensi" element={<Guard perm="absensi"><Attendance /></Guard>} />
              <Route path="produk" element={<Guard perm="produk"><Products /></Guard>} />
              <Route path="inventaris" element={<Guard perm="inventaris"><Inventory /></Guard>} />
              <Route path="transaksi" element={<Guard perm="transaksi"><Transactions /></Guard>} />
              <Route path="laporan" element={<Guard perm="laporan"><Reports /></Guard>} />
              <Route path="pelanggan" element={<Guard perm="pelanggan"><Customers /></Guard>} />
              <Route path="karyawan" element={<Guard perm="karyawan"><Employees /></Guard>} />
              <Route path="promosi" element={<Guard perm="promosi"><Promotions /></Guard>} />
              <Route path="pengaturan" element={<Guard perm="pengaturan"><SettingsPage /></Guard>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" />
    </>
  )
}
