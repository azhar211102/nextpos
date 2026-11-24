import { calcDiscount, calcRate } from './calc'
import { combine } from './attendance'
import { dayKey } from './format'
import {
  ROLE_DEFAULTS, isFnb,
  type AttendanceRecord, type BusinessType, type Customer, type Employee, type OrderType, type PaymentMethod, type Product,
  type Promotion, type Settings, type StockMovement, type Table, type Transaction, type TransactionItem,
} from '@/types'

export const DEFAULT_SETTINGS: Settings = {
  storeName: 'Toko Makmur Jaya',
  address: 'Jl. Melati Raya No. 18, Kebayoran Baru, Jakarta Selatan',
  phone: '(021) 555-0142',
  currency: 'IDR',
  taxRate: 11,
  serviceRate: 0,
  receiptNote: 'Terima kasih telah berbelanja. Barang yang sudah dibeli tidak dapat ditukar.',
  lowStockThreshold: 10,
  businessType: 'toko',
  shiftStart: '08:00',
  shiftEnd: '17:00',
  lateTolerance: 10,
  cashierName: 'Kasir Utama',
}

export function settingsFor(type: BusinessType, base: Settings = DEFAULT_SETTINGS): Settings {
  if (type === 'kafe')
    return { ...base, businessType: type, storeName: 'Kedai Kopi Senja', address: 'Jl. Braga No. 27, Sumur Bandung, Bandung', phone: '(022) 555-0178', serviceRate: 5, receiptNote: 'Terima kasih sudah mampir. Sampai jumpa lagi!' }
  if (type === 'resto')
    return { ...base, businessType: type, storeName: 'Rumah Makan Selera Nusantara', address: 'Jl. Pemuda No. 112, Semarang Tengah, Semarang', phone: '(024) 555-0136', serviceRate: 5, receiptNote: 'Terima kasih telah makan bersama kami. Selamat menikmati!' }
  return { ...base, businessType: 'toko', storeName: DEFAULT_SETTINGS.storeName, address: DEFAULT_SETTINGS.address, phone: DEFAULT_SETTINGS.phone, serviceRate: 0, receiptNote: DEFAULT_SETTINGS.receiptNote }
}

type Seed = Omit<Product, 'id' | 'sku' | 'barcode' | 'active' | 'minStock'> & { minStock?: number }

const TOKO: Seed[] = [
  { name: 'Indomie Goreng', category: 'Makanan', price: 3500, cost: 2800, stock: 120, art: 'noodle', color: '#E8A317', accent: '#B3261E', favorite: true },
  { name: 'Indomie Soto', category: 'Makanan', price: 3300, cost: 2650, stock: 86, art: 'noodle', color: '#F2C94C', accent: '#1F7A4D' },
  { name: 'Roti Cokelat', category: 'Makanan', price: 6500, cost: 4800, stock: 24, art: 'bread', color: '#C98B4B', accent: '#4A2C1A', minStock: 8 },
  { name: 'Aqua 600ml', category: 'Minuman', price: 4000, cost: 2900, stock: 98, art: 'bottle', color: '#2F8FD8', accent: '#E8F4FC', favorite: true },
  { name: 'Air Mineral 1,5L', category: 'Minuman', price: 7000, cost: 5200, stock: 54, art: 'bigbottle', color: '#3AA0A8', accent: '#E6F6F7' },
  { name: 'Teh Pucuk', category: 'Minuman', price: 5000, cost: 3700, stock: 64, art: 'tea', color: '#2C8A4B', accent: '#D6402B', favorite: true },
  { name: 'Kopi Susu', category: 'Minuman', price: 8500, cost: 5900, stock: 8, art: 'can', color: '#9A6A45', accent: '#F4E6D4', minStock: 12 },
  { name: 'Susu UHT Cokelat', category: 'Minuman', price: 6500, cost: 5000, stock: 40, art: 'carton', color: '#5B3A29', accent: '#F1E2CF' },
  { name: 'Minuman Isotonik', category: 'Minuman', price: 7500, cost: 5600, stock: 0, art: 'sport', color: '#F08A1C', accent: '#FFF1DC' },
  { name: 'Snack Kentang', category: 'Camilan', price: 11000, cost: 8400, stock: 36, art: 'chips', color: '#D8412F', accent: '#FFD66B' },
  { name: 'Biskuit Kelapa', category: 'Camilan', price: 9500, cost: 7000, stock: 5, art: 'biscuit', color: '#3C6FB6', accent: '#F6E7B8', minStock: 10 },
  { name: 'Wafer Cokelat', category: 'Camilan', price: 2500, cost: 1800, stock: 150, art: 'biscuit', color: '#8C2F39', accent: '#F4D9C6', favorite: true },
  { name: 'Gula Pasir 1 Kg', category: 'Kebutuhan Harian', price: 17500, cost: 15200, stock: 32, art: 'sugar', color: '#E9E4D8', accent: '#C0392B' },
  { name: 'Minyak Goreng 1 L', category: 'Kebutuhan Harian', price: 19000, cost: 16500, stock: 28, art: 'oil', color: '#E3B019', accent: '#B8731A' },
  { name: 'Sabun Mandi', category: 'Kebutuhan Harian', price: 4500, cost: 3300, stock: 60, art: 'soap', color: '#2C9C9C', accent: '#F4FFFF' },
  { name: 'Tisu Wajah', category: 'Kebutuhan Harian', price: 12000, cost: 9000, stock: 45, art: 'tissue', color: '#6BA4D8', accent: '#FFFFFF' },
]

const KAFE: Seed[] = [
  { name: 'Americano', category: 'Kopi', price: 18000, cost: 6000, stock: 60, art: 'cup', color: '#3B2A20', accent: '#F4E6D4', favorite: true },
  { name: 'Kopi Susu Gula Aren', category: 'Kopi', price: 22000, cost: 8000, stock: 60, art: 'glass', color: '#9A6A45', accent: '#F4E6D4', favorite: true },
  { name: 'Cappuccino', category: 'Kopi', price: 24000, cost: 9000, stock: 50, art: 'cup', color: '#B98A5E', accent: '#FFF8EE', favorite: true },
  { name: 'Caffe Latte', category: 'Kopi', price: 25000, cost: 9500, stock: 50, art: 'cup', color: '#C9A27A', accent: '#FFFFFF' },
  { name: 'Es Kopi Susu', category: 'Kopi', price: 20000, cost: 7000, stock: 60, art: 'glass', color: '#8A5A3C', accent: '#F6EBDD' },
  { name: 'Matcha Latte', category: 'Non-Kopi', price: 26000, cost: 10000, stock: 40, art: 'glass', color: '#7BA05B', accent: '#EAF4DF' },
  { name: 'Cokelat Panas', category: 'Non-Kopi', price: 22000, cost: 8000, stock: 40, art: 'cup', color: '#5B3A29', accent: '#F1E2CF' },
  { name: 'Teh Tarik', category: 'Non-Kopi', price: 16000, cost: 5000, stock: 40, art: 'cup', color: '#C77D3A', accent: '#FFF1DC' },
  { name: 'Air Mineral', category: 'Non-Kopi', price: 6000, cost: 3000, stock: 80, art: 'bottle', color: '#2F8FD8', accent: '#E8F4FC' },
  { name: 'Croissant Butter', category: 'Roti & Kue', price: 20000, cost: 9000, stock: 18, art: 'bread', color: '#D9A15F', accent: '#8A5A2B', minStock: 6 },
  { name: 'Roti Bakar Cokelat', category: 'Roti & Kue', price: 18000, cost: 7000, stock: 30, art: 'bread', color: '#C98B4B', accent: '#4A2C1A' },
  { name: 'Brownies', category: 'Roti & Kue', price: 19000, cost: 8000, stock: 14, art: 'cake', color: '#4A2C1A', accent: '#F1E2CF', minStock: 5 },
  { name: 'Cheesecake', category: 'Roti & Kue', price: 28000, cost: 13000, stock: 9, art: 'cake', color: '#F2D58A', accent: '#FFF8EE', minStock: 4 },
  { name: 'Kentang Goreng', category: 'Camilan', price: 20000, cost: 8000, stock: 40, art: 'chips', color: '#D8412F', accent: '#FFD66B' },
  { name: 'Pisang Goreng', category: 'Camilan', price: 15000, cost: 6000, stock: 30, art: 'plate', color: '#E3B019', accent: '#FFF1DC' },
]

const RESTO: Seed[] = [
  { name: 'Nasi Goreng Spesial', category: 'Makanan Utama', price: 28000, cost: 11000, stock: 50, art: 'plate', color: '#C77D3A', accent: '#FFF1DC', favorite: true },
  { name: 'Mie Goreng Seafood', category: 'Makanan Utama', price: 30000, cost: 13000, stock: 40, art: 'plate', color: '#D98F3A', accent: '#FFF1DC' },
  { name: 'Ayam Bakar + Nasi', category: 'Makanan Utama', price: 35000, cost: 15000, stock: 35, art: 'plate', color: '#9A5B2A', accent: '#FFF1DC', favorite: true },
  { name: 'Soto Ayam', category: 'Makanan Utama', price: 25000, cost: 9500, stock: 40, art: 'bowl', color: '#E3B019', accent: '#FFFBEA', favorite: true },
  { name: 'Bakso Urat', category: 'Makanan Utama', price: 24000, cost: 9000, stock: 40, art: 'bowl', color: '#B5651D', accent: '#FFF1DC' },
  { name: 'Sate Ayam 10 Tusuk', category: 'Makanan Utama', price: 32000, cost: 14000, stock: 30, art: 'plate', color: '#8A4B1F', accent: '#FFE9C7' },
  { name: 'Gado-gado', category: 'Makanan Utama', price: 22000, cost: 8000, stock: 30, art: 'plate', color: '#6B9B3A', accent: '#FFF1DC' },
  { name: 'Es Teh Manis', category: 'Minuman', price: 6000, cost: 1500, stock: 100, art: 'glass', color: '#C77D3A', accent: '#FFF1DC', favorite: true },
  { name: 'Es Jeruk', category: 'Minuman', price: 10000, cost: 3500, stock: 80, art: 'glass', color: '#F08A1C', accent: '#FFF1DC' },
  { name: 'Teh Hangat', category: 'Minuman', price: 5000, cost: 1200, stock: 100, art: 'cup', color: '#C77D3A', accent: '#FFF1DC' },
  { name: 'Jus Alpukat', category: 'Minuman', price: 18000, cost: 8000, stock: 30, art: 'glass', color: '#7BA05B', accent: '#EAF4DF' },
  { name: 'Air Mineral', category: 'Minuman', price: 6000, cost: 3000, stock: 100, art: 'bottle', color: '#2F8FD8', accent: '#E8F4FC' },
  { name: 'Kerupuk', category: 'Camilan', price: 5000, cost: 1500, stock: 60, art: 'chips', color: '#E3B019', accent: '#FFF1DC' },
  { name: 'Tahu Crispy', category: 'Camilan', price: 14000, cost: 5000, stock: 40, art: 'plate', color: '#D9A15F', accent: '#FFF1DC' },
  { name: 'Es Campur', category: 'Pencuci Mulut', price: 18000, cost: 7000, stock: 25, art: 'glass', color: '#D8412F', accent: '#FFF1DC' },
  { name: 'Puding Cokelat', category: 'Pencuci Mulut', price: 12000, cost: 4500, stock: 20, art: 'cake', color: '#5B3A29', accent: '#F1E2CF' },
]

const PREFIX: Record<BusinessType, string> = { toko: 'p', kafe: 'k', resto: 'r' }

export function seedCatalog(type: BusinessType): { categories: string[]; products: Product[]; tables: Table[] } {
  const list = type === 'kafe' ? KAFE : type === 'resto' ? RESTO : TOKO
  const products: Product[] = list.map((s, i) => ({
    ...s,
    id: `${PREFIX[type]}${String(i + 1).padStart(2, '0')}`,
    sku: `NXP-${String(i + 1).padStart(3, '0')}`,
    barcode: `89912345${String(10000 + i * 137).padStart(5, '0')}`,
    active: true,
    minStock: s.minStock ?? (type === 'toko' ? 10 : 5),
  }))
  const categories = [...new Set(products.map((p) => p.category))]
  const mk = (names: string[], area: string, seats: number): Table[] =>
    names.map((n) => ({ id: `t-${area}-${n}`.toLowerCase().replace(/\s+/g, ''), name: n, area, seats }))
  const tables =
    type === 'kafe'
      ? [...mk(['Meja 1', 'Meja 2', 'Meja 3', 'Meja 4', 'Meja 5', 'Meja 6'], 'Dalam', 2), ...mk(['Meja 7', 'Meja 8', 'Meja 9', 'Meja 10'], 'Teras', 4)]
      : type === 'resto'
        ? [...mk(['A1', 'A2', 'A3', 'A4', 'A5', 'A6'], 'Lantai 1', 4), ...mk(['B1', 'B2', 'B3', 'B4'], 'Lantai 2', 6), ...mk(['VIP 1', 'VIP 2'], 'Ruang VIP', 10)]
        : []
  return { categories, products, tables }
}

export function seedProducts(): Product[] {
  return seedCatalog('toko').products
}

function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HOUR_WEIGHT: Record<number, number> = { 8: 3, 9: 4, 10: 5, 11: 5, 12: 7, 13: 6, 14: 5, 15: 4, 16: 5, 17: 7, 18: 7, 19: 6, 20: 4, 21: 2 }

/**
 * Riwayat penjualan contoh (30 hari) agar Ringkasan tidak kosong saat pertama dibuka.
 * Ini data demo yang dibuat di perangkat ini; transaksi baru dicatat berdampingan dengannya.
 * Pengguna dapat menghapusnya lewat Pengaturan → Data.
 */
export function seedTransactions(products: Product[], settings: Settings, customers: Customer[], tables: Table[] = [], now = new Date()): Transaction[] {
  const rand = rng(20261124)
  const out: Transaction[] = []
  const fnb = isFnb(settings.businessType)
  const weighted = products.filter((p) => p.stock > 0).flatMap((p, i) => Array(p.favorite ? 8 : i < 6 ? 4 : 2).fill(p) as Product[])
  const cashiers = ['Dewi Lestari', 'Rudi Hartono']

  for (let back = 29; back >= 0; back--) {
    const day = new Date(now)
    day.setDate(now.getDate() - back)
    day.setHours(0, 0, 0, 0)
    const target = back === 0 ? 0 : back > 6 ? 16 + Math.floor(rand() * 14) : 38 + Math.floor(rand() * 22)
    const slots: Date[] = []
    if (back === 0) {
      for (let h = 8; h <= 21; h++) {
        const n = Math.round((HOUR_WEIGHT[h] ?? 3) * 1.1)
        for (let i = 0; i < n; i++) {
          const t = new Date(day)
          t.setHours(h, Math.floor(rand() * 60), Math.floor(rand() * 60))
          if (t.getTime() < now.getTime() - 60_000) slots.push(t)
        }
      }
    } else {
      const hours = Object.keys(HOUR_WEIGHT).flatMap((h) => Array(HOUR_WEIGHT[Number(h)]).fill(Number(h)) as number[])
      for (let i = 0; i < target; i++) {
        const t = new Date(day)
        t.setHours(hours[Math.floor(rand() * hours.length)], Math.floor(rand() * 60), Math.floor(rand() * 60))
        slots.push(t)
      }
    }
    slots.sort((a, b) => a.getTime() - b.getTime())
    const k = dayKey(day).replace(/-/g, '').slice(2)
    slots.forEach((t, idx) => {
      const lineCount = 1 + Math.floor(rand() * rand() * (fnb ? 4 : 5))
      const chosen = new Map<string, TransactionItem>()
      for (let i = 0; i < lineCount; i++) {
        const p = weighted[Math.floor(rand() * weighted.length)]
        const qty = 1 + Math.floor(rand() * rand() * (fnb ? 3 : 4))
        const ex = chosen.get(p.id)
        if (ex) ex.qty += qty
        else chosen.set(p.id, { productId: p.id, name: p.name, sku: p.sku, qty, price: p.price })
      }
      const items = [...chosen.values()]
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
      const r = rand()
      const hasDisc = rand() < 0.08
      const discount = hasDisc ? calcDiscount(subtotal, { type: 'persen', value: 5 }) : 0
      const service = fnb ? calcRate(subtotal - discount, settings.serviceRate) : 0
      const tax = calcRate(subtotal - discount + service, settings.taxRate)
      const total = subtotal - discount + service + tax
      const method: PaymentMethod = r < 0.64 ? 'Tunai' : r < 0.89 ? 'QRIS' : 'Kartu'
      const received = method === 'Tunai' ? Math.ceil(total / 5000) * 5000 + (rand() < 0.3 ? 5000 : 0) : total
      const cust = rand() < 0.3 ? customers[Math.floor(rand() * customers.length)] : undefined
      const ot: OrderType | undefined = fnb ? (rand() < 0.55 ? 'dine-in' : rand() < 0.85 ? 'take-away' : 'delivery') : undefined
      const table = ot === 'dine-in' && tables.length ? tables[Math.floor(rand() * tables.length)] : undefined
      out.push({
        id: `TRX-${k}-${String(idx + 1).padStart(4, '0')}`,
        createdAt: t.toISOString(),
        items, subtotal, discount,
        discountLabel: hasDisc ? 'Diskon 5%' : '',
        serviceCharge: service, serviceRate: fnb ? settings.serviceRate : 0,
        tax, taxRate: settings.taxRate, total, method, received, change: received - total, status: 'Berhasil',
        cashier: cashiers[rand() < 0.7 ? 0 : 1],
        customerId: cust?.id, customerName: cust?.name,
        orderType: ot, tableName: table?.name,
      })
    })
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function seedMovements(products: Product[], now = new Date()): StockMovement[] {
  return products.map((p) => ({
    id: `m-seed-${p.id}`, productId: p.id, productName: p.name, createdAt: now.toISOString(),
    type: 'Stok awal' as const, delta: p.stock, before: 0, after: p.stock, note: 'Data awal aplikasi',
  }))
}

export function seedEmployees(): Employee[] {
  return [
    { id: 'e1', name: 'Bambang Susilo', role: 'Pemilik', pinHash: '54aca9248524e413472121ead8deea3b93b9f82355df195ff03db020bc487e6e', permissions: ROLE_DEFAULTS.Pemilik, active: true },
    { id: 'e2', name: 'Dewi Lestari', role: 'Kasir', pinHash: 'f4b8629bde77a1e89081cfe9438a76101f27d1aaac281c5e8a03836897eda9b4', permissions: ROLE_DEFAULTS.Kasir, active: true },
    { id: 'e3', name: 'Rudi Hartono', role: 'Manajer', pinHash: '2f4b0328bf90e781e61f6c3d0484d175db44c0779295385a4fd27ef7e490b179', permissions: ROLE_DEFAULTS.Manajer, active: true },
    { id: 'e4', name: 'Sari Wulandari', role: 'Staf Gudang', pinHash: '74eba5d6f383053f8ca9f8fc5b2d636faf7390cf5db281b6dc7a29b61f3e0508', permissions: ROLE_DEFAULTS['Staf Gudang'], active: true },
  ]
}

export function seedCustomers(now = new Date()): Customer[] {
  const d = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()
  return [
    { id: 'c1', name: 'Ibu Ratna Wijaya', phone: '0812-3456-7801', email: 'ratna.w@contoh.id', note: 'Pelanggan langganan', createdAt: d(80) },
    { id: 'c2', name: 'Pak Heru Santoso', phone: '0813-2211-9045', email: '', note: '', createdAt: d(60) },
    { id: 'c3', name: 'Warung Bu Sri', phone: '0857-7788-1203', email: 'warungbusri@contoh.id', note: 'Pelanggan grosir, ambil dalam jumlah banyak', createdAt: d(45) },
    { id: 'c4', name: 'Nadia Putri', phone: '0821-6600-4417', email: 'nadia.p@contoh.id', note: '', createdAt: d(30) },
    { id: 'c5', name: 'Kos Melati', phone: '0896-1020-3344', email: '', note: 'Pesan rutin tiap minggu', createdAt: d(20) },
    { id: 'c6', name: 'Agus Prasetyo', phone: '0838-9012-5566', email: '', note: '', createdAt: d(9) },
  ]
}

export function seedPromotions(now = new Date()): Promotion[] {
  const add = (days: number) => { const x = new Date(now); x.setDate(x.getDate() + days); return dayKey(x) }
  return [
    { id: 'pr1', name: 'Diskon Belanja Hemat 10%', type: 'persen', value: 10, minSubtotal: 50000, startDate: add(-10), endDate: add(60), active: true },
    { id: 'pr2', name: 'Potongan Rp 5.000', type: 'nominal', value: 5000, minSubtotal: 30000, startDate: add(-30), endDate: add(30), active: true },
    { id: 'pr3', name: 'Promo Gajian', type: 'persen', value: 15, minSubtotal: 100000, startDate: add(5), endDate: add(8), active: true },
    { id: 'pr4', name: 'Promo Akhir Tahun Lalu', type: 'persen', value: 20, minSubtotal: 0, startDate: add(-120), endDate: add(-60), active: true },
  ]
}

/** Absensi contoh 14 hari terakhir; hari ini hanya karyawan yang "sudah masuk" sebelum sekarang. */
export function seedAttendance(employees: Employee[], settings: Settings, now = new Date()): AttendanceRecord[] {
  const rand = rng(777)
  const out: AttendanceRecord[] = []
  const [sh, sm] = settings.shiftStart.split(':').map(Number)
  const [eh, em] = settings.shiftEnd.split(':').map(Number)
  const t = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  for (let back = 14; back >= 0; back--) {
    const d = new Date(now)
    d.setDate(now.getDate() - back)
    const date = dayKey(d)
    for (const e of employees) {
      if (!e.active || (e.role !== 'Pemilik' && d.getDay() === 0)) continue
      if (back > 0 && rand() < 0.07) continue // tidak hadir
      if (e.role === 'Pemilik' && rand() < 0.4) continue
      const inMin = sh * 60 + sm - 15 + Math.floor(rand() * 40)
      const outMin = eh * 60 + em - 5 + Math.floor(rand() * 40)
      const clockIn = combine(date, t(inMin))
      const clockOut = combine(date, t(outMin))
      if (back === 0) {
        if (new Date(clockIn).getTime() > now.getTime() || e.role === 'Staf Gudang') continue
        out.push({ id: `a-${date}-${e.id}`, employeeId: e.id, employeeName: e.name, date, clockIn, note: '', manual: false })
      } else {
        out.push({ id: `a-${date}-${e.id}`, employeeId: e.id, employeeName: e.name, date, clockIn, clockOut, note: '', manual: false })
      }
    }
  }
  return out.sort((a, b) => b.clockIn.localeCompare(a.clockIn))
}
