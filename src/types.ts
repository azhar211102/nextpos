export type Category = string

export type ArtKind =
  | 'noodle' | 'bottle' | 'bigbottle' | 'tea' | 'can' | 'bread' | 'carton'
  | 'chips' | 'biscuit' | 'sport' | 'sugar' | 'oil' | 'soap' | 'tissue'
  | 'cup' | 'glass' | 'plate' | 'bowl' | 'cake'

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string
  category: Category
  price: number
  cost: number
  stock: number
  minStock: number
  active: boolean
  /** Muncul di tab Favorit kasir. */
  favorite?: boolean
  /** Gambar unggahan (data URL) — menggantikan ilustrasi bawaan. */
  image?: string
  art: ArtKind
  color: string
  accent: string
}

export type BusinessType = 'toko' | 'kafe' | 'resto'
export const BUSINESS_LABEL: Record<BusinessType, string> = {
  toko: 'Toko / Sembako',
  kafe: 'Kafe',
  resto: 'Restoran',
}
export const isFnb = (t: BusinessType) => t !== 'toko'

export type OrderType = 'dine-in' | 'take-away' | 'delivery'
export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  'dine-in': 'Makan di Tempat',
  'take-away': 'Bawa Pulang',
  delivery: 'Pesan Antar',
}

export type PaymentMethod = 'Tunai' | 'QRIS' | 'Kartu'
export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  Tunai: 'Tunai',
  QRIS: 'QRIS',
  Kartu: 'Kartu Debit/Kredit',
}

export interface CartLine {
  productId: string
  qty: number
  /** Catatan untuk dapur/kasir, mis. "Tanpa gula". */
  note?: string
  /** Item bebas (bukan dari katalog). productId diawali "custom-". */
  custom?: { name: string; price: number }
}

export type DiscountType = 'persen' | 'nominal'
export interface Discount {
  type: DiscountType
  value: number
  promoId?: string
}

export interface TransactionItem {
  productId: string
  name: string
  sku: string
  qty: number
  price: number
  note?: string
}

export interface Transaction {
  id: string
  createdAt: string
  items: TransactionItem[]
  subtotal: number
  discount: number
  discountLabel: string
  serviceCharge?: number
  serviceRate?: number
  tax: number
  taxRate: number
  total: number
  method: PaymentMethod
  received: number
  change: number
  status: 'Berhasil' | 'Dikembalikan'
  cashier: string
  customerId?: string
  customerName?: string
  orderType?: OrderType
  tableName?: string
  orderNumber?: string
  refundedAt?: string
  refundReason?: string
  refundedBy?: string
}

export type MovementType = 'Stok awal' | 'Penjualan' | 'Stok Masuk' | 'Stok Keluar' | 'Penyesuaian' | 'Pengembalian'
export interface StockMovement {
  id: string
  productId: string
  productName: string
  createdAt: string
  type: MovementType
  delta: number
  before: number
  after: number
  note: string
}

export interface Settings {
  storeName: string
  address: string
  phone: string
  currency: 'IDR' | 'USD' | 'SGD' | 'MYR'
  taxRate: number
  serviceRate: number
  receiptNote: string
  lowStockThreshold: number
  businessType: BusinessType
  /** Jam kerja untuk absensi (HH:MM). */
  shiftStart: string
  shiftEnd: string
  lateTolerance: number
  /** Tidak dipakai lagi; kasir diambil dari karyawan aktif. */
  cashierName: string
}

export type Role = 'Pemilik' | 'Manajer' | 'Kasir' | 'Staf Gudang'
export const ROLES: Role[] = ['Pemilik', 'Manajer', 'Kasir', 'Staf Gudang']

export const PERMISSIONS = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'kasir', label: 'Kasir (POS)' },
  { id: 'pesanan', label: 'Pesanan, Meja & Dapur' },
  { id: 'produk', label: 'Produk' },
  { id: 'inventaris', label: 'Inventaris' },
  { id: 'transaksi', label: 'Transaksi' },
  { id: 'refund', label: 'Refund transaksi' },
  { id: 'laporan', label: 'Laporan' },
  { id: 'pelanggan', label: 'Pelanggan' },
  { id: 'karyawan', label: 'Karyawan' },
  { id: 'absensi', label: 'Absensi (absen sendiri)' },
  { id: 'absensi_kelola', label: 'Kelola absensi' },
  { id: 'promosi', label: 'Promosi' },
  { id: 'pengaturan', label: 'Pengaturan' },
] as const
export type Permission = (typeof PERMISSIONS)[number]['id']

export const ROLE_DEFAULTS: Record<Role, Permission[]> = {
  Pemilik: PERMISSIONS.map((p) => p.id),
  Manajer: ['ringkasan', 'kasir', 'pesanan', 'produk', 'inventaris', 'transaksi', 'refund', 'laporan', 'pelanggan', 'absensi', 'absensi_kelola', 'promosi'],
  Kasir: ['kasir', 'pesanan', 'transaksi', 'pelanggan', 'absensi'],
  'Staf Gudang': ['produk', 'inventaris', 'absensi'],
}

export interface Employee {
  id: string
  name: string
  role: Role
  /** SHA-256 dari PIN. Hanya penyamaran sederhana di LocalStorage — bukan keamanan sungguhan. */
  pinHash: string
  permissions: Permission[]
  active: boolean
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  note: string
  createdAt: string
}

export interface Promotion {
  id: string
  name: string
  type: DiscountType
  value: number
  /** Minimum subtotal belanja agar promo berlaku (0 = tanpa minimum). */
  minSubtotal: number
  startDate: string // YYYY-MM-DD
  endDate: string
  active: boolean
}

export interface Table {
  id: string
  name: string
  area: string
  seats: number
}

export type OrderStatus = 'Baru' | 'Diproses' | 'Siap' | 'Disajikan'
export interface OpenOrder {
  id: string
  /** Nomor pendek untuk dapur, mis. P-014. */
  number: string
  orderType: OrderType
  tableId: string | null
  customerId: string | null
  lines: CartLine[]
  discount: Discount
  createdAt: string
  status: OrderStatus
  /** Dikirim ke dapur (kafe/restoran). */
  sentToKitchen: boolean
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  /** YYYY-MM-DD */
  date: string
  clockIn: string
  clockOut?: string
  note: string
  /** Dibuat/diubah manual oleh pengelola. */
  manual: boolean
}
