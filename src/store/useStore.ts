import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { calcChange, calcTotals, clampQty, validateDiscount } from '@/lib/calc'
import { dayKey } from '@/lib/format'
import { makeTransactionId, uid } from '@/lib/ids'
import { promoApplies } from '@/lib/promo'
import { safeStorage, STORAGE_KEY } from '@/lib/storage'
import {
  DEFAULT_SETTINGS, seedAttendance, seedCatalog, seedCustomers, seedEmployees, seedMovements, seedPromotions,
  seedTransactions, settingsFor,
} from '@/lib/seed'
import {
  isFnb, ROLE_DEFAULTS,
  type AttendanceRecord, type BusinessType, type CartLine, type Customer, type Discount, type Employee, type OpenOrder,
  type OrderStatus, type OrderType, type PaymentMethod, type Permission, type Product, type Promotion, type Settings,
  type StockMovement, type Table, type Transaction,
} from '@/types'

export type CheckoutResult = { ok: true; transaction: Transaction } | { ok: false; error: string }
type Res = { ok: boolean; error?: string }

interface State {
  products: Product[]
  categories: string[]
  tables: Table[]
  transactions: Transaction[]
  movements: StockMovement[]
  settings: Settings
  customers: Customer[]
  employees: Employee[]
  promotions: Promotion[]
  orders: OpenOrder[]
  attendance: AttendanceRecord[]
  activeEmployeeId: string
  orderSeq: { date: string; n: number }

  // keranjang (tidak disimpan)
  cart: CartLine[]
  discount: Discount
  cartCustomerId: string | null
  orderType: OrderType
  tableId: string | null
  activeOrderId: string | null

  addToCart: (productId: string) => Res
  addCustomItem: (name: string, price: number) => Res
  setQty: (productId: string, qty: number) => Res
  setNote: (productId: string, note: string) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  setDiscount: (d: Discount) => void
  setCartCustomer: (id: string | null) => void
  setOrderMeta: (m: { orderType?: OrderType; tableId?: string | null }) => void
  checkout: (method: PaymentMethod, received: number) => CheckoutResult

  saveOrder: () => { ok: true; order: OpenOrder } | { ok: false; error: string }
  resumeOrder: (id: string) => Res
  cancelOrder: (id: string) => void
  setOrderStatus: (id: string, status: OrderStatus) => void

  addTable: (t: Omit<Table, 'id'>) => Res
  updateTable: (id: string, patch: Partial<Table>) => void
  deleteTable: (id: string) => Res

  refundTransaction: (id: string, reason: string) => Res

  addProduct: (p: Omit<Product, 'id'>) => Product
  updateProduct: (id: string, patch: Partial<Product>) => void
  deleteProduct: (id: string) => void
  adjustStock: (id: string, mode: 'masuk' | 'keluar' | 'setel', qty: number, note: string) => Res
  addCategory: (name: string) => Res
  renameCategory: (oldName: string, newName: string) => Res
  deleteCategory: (name: string) => Res

  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => Customer
  updateCustomer: (id: string, patch: Partial<Customer>) => void
  deleteCustomer: (id: string) => void

  addEmployee: (e: Omit<Employee, 'id'>) => Employee
  updateEmployee: (id: string, patch: Partial<Employee>) => Res
  deleteEmployee: (id: string) => Res
  switchEmployee: (id: string) => void

  clockIn: (employeeId: string) => Res
  clockOut: (employeeId: string) => Res
  saveAttendance: (rec: Omit<AttendanceRecord, 'id' | 'employeeName' | 'manual'> & { id?: string }) => Res
  deleteAttendance: (id: string) => void

  addPromotion: (p: Omit<Promotion, 'id'>) => void
  updatePromotion: (id: string, patch: Partial<Promotion>) => void
  deletePromotion: (id: string) => void

  updateSettings: (patch: Partial<Settings>) => void
  setBusinessType: (type: BusinessType, applyDemo: boolean) => void
  resetDemoData: () => void
  clearTransactions: () => void
}

const MAX_MOVEMENTS = 500
const NO_DISCOUNT: Discount = { type: 'persen', value: 0 }
const CART_RESET = { cart: [] as CartLine[], discount: NO_DISCOUNT, cartCustomerId: null, activeOrderId: null, tableId: null as string | null, orderType: 'dine-in' as OrderType }

function freshData(type: BusinessType = 'toko') {
  const settings = settingsFor(type, DEFAULT_SETTINGS)
  const { categories, products, tables } = seedCatalog(type)
  const customers = seedCustomers()
  const employees = seedEmployees()
  return {
    settings, products, categories, tables, customers, employees,
    promotions: seedPromotions(),
    orders: [] as OpenOrder[],
    orderSeq: { date: '', n: 0 },
    activeEmployeeId: 'e1',
    transactions: seedTransactions(products, settings, customers, tables),
    movements: seedMovements(products),
    attendance: seedAttendance(employees, settings),
  }
}

const hasPerm = (e: Employee | undefined, p: Permission) => !!e && e.active && e.permissions.includes(p)
const activeOwners = (list: Employee[]) => list.filter((e) => e.role === 'Pemilik' && e.active)

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...freshData(),
      ...CART_RESET,

      addToCart: (productId) => {
        const { products, cart } = get()
        const p = products.find((x) => x.id === productId)
        if (!p || !p.active) return { ok: false, error: 'Produk tidak tersedia.' }
        const line = cart.find((l) => l.productId === productId)
        const next = (line?.qty ?? 0) + 1
        if (p.stock <= 0) return { ok: false, error: `${p.name} sedang habis.` }
        if (next > p.stock) return { ok: false, error: `Stok ${p.name} hanya ${p.stock}.` }
        set({ cart: line ? cart.map((l) => (l.productId === productId ? { ...l, qty: next } : l)) : [...cart, { productId, qty: 1 }] })
        return { ok: true }
      },

      addCustomItem: (name, price) => {
        if (!name.trim()) return { ok: false, error: 'Nama item wajib diisi.' }
        if (!Number.isFinite(price) || price <= 0) return { ok: false, error: 'Harga harus lebih dari 0.' }
        set({ cart: [...get().cart, { productId: uid('custom'), qty: 1, custom: { name: name.trim(), price: Math.round(price) } }] })
        return { ok: true }
      },

      setQty: (productId, qty) => {
        const { products, cart } = get()
        const line = cart.find((l) => l.productId === productId)
        if (!line) return { ok: false, error: 'Item tidak ada di keranjang.' }
        if (qty <= 0) {
          set({ cart: cart.filter((l) => l.productId !== productId) })
          return { ok: true }
        }
        if (line.custom) {
          set({ cart: cart.map((l) => (l.productId === productId ? { ...l, qty: Math.min(Math.floor(qty), 999) } : l)) })
          return { ok: true }
        }
        const p = products.find((x) => x.id === productId)
        if (!p) return { ok: false, error: 'Produk tidak ditemukan.' }
        const allowed = clampQty(qty, p.stock)
        set({ cart: cart.map((l) => (l.productId === productId ? { ...l, qty: Math.max(1, allowed) } : l)) })
        if (allowed < Math.floor(qty)) return { ok: false, error: `Stok ${p.name} hanya ${p.stock}.` }
        return { ok: true }
      },

      setNote: (productId, note) => set({ cart: get().cart.map((l) => (l.productId === productId ? { ...l, note: note.trim() || undefined } : l)) }),
      removeFromCart: (productId) => set({ cart: get().cart.filter((l) => l.productId !== productId) }),
      clearCart: () => set({ ...CART_RESET }),
      setDiscount: (discount) => set({ discount }),
      setCartCustomer: (cartCustomerId) => set({ cartCustomerId }),
      setOrderMeta: (m) => set({ ...(m.orderType ? { orderType: m.orderType } : {}), ...(m.tableId !== undefined ? { tableId: m.tableId } : {}) }),

      checkout: (method, received) => {
        const { cart, products, discount, settings, transactions, movements, employees, activeEmployeeId, customers, cartCustomerId, promotions, orderType, tableId, tables, orders, activeOrderId } = get()
        // Pencegah transaksi ganda: keranjang dikosongkan secara sinkron di bawah,
        // sehingga panggilan kedua selalu melihat keranjang kosong.
        if (cart.length === 0) return { ok: false, error: 'Keranjang kosong.' }
        const emp = employees.find((e) => e.id === activeEmployeeId)
        if (!hasPerm(emp, 'kasir')) return { ok: false, error: 'Akun ini tidak punya akses Kasir.' }
        const fnb = isFnb(settings.businessType)

        for (const l of cart) {
          if (l.custom) continue
          const p = products.find((x) => x.id === l.productId)
          if (!p) return { ok: false, error: 'Ada produk dalam keranjang yang sudah dihapus.' }
          if (l.qty > p.stock) return { ok: false, error: `Stok ${p.name} tidak mencukupi (tersisa ${p.stock}).` }
        }
        const serviceRate = fnb ? settings.serviceRate : 0
        const t = calcTotals(cart, products, discount, settings.taxRate, serviceRate)
        const dErr = validateDiscount(discount, t.subtotal)
        if (dErr) return { ok: false, error: dErr }
        let discountLabel = t.discount > 0 ? (discount.type === 'persen' ? `Diskon ${discount.value}%` : 'Diskon') : ''
        if (discount.promoId) {
          const promo = promotions.find((p) => p.id === discount.promoId)
          if (!promo || !promoApplies(promo, t.subtotal)) return { ok: false, error: 'Promo tidak berlaku lagi untuk belanja ini.' }
          discountLabel = promo.name
        }
        if (t.total <= 0) return { ok: false, error: 'Total pembayaran tidak valid.' }
        const paid = method === 'Tunai' ? received : t.total
        if (method === 'Tunai' && paid < t.total) return { ok: false, error: 'Uang diterima kurang dari total.' }

        const now = new Date()
        const id = makeTransactionId(now, transactions.map((x) => x.id))
        const byId = new Map(products.map((p) => [p.id, p]))
        const items = cart.map((l) => {
          if (l.custom) return { productId: l.productId, name: l.custom.name, sku: '—', qty: l.qty, price: l.custom.price, note: l.note }
          const p = byId.get(l.productId)!
          return { productId: p.id, name: p.name, sku: p.sku, qty: l.qty, price: p.price, note: l.note }
        })
        const cust = customers.find((c) => c.id === cartCustomerId)
        const order = orders.find((o) => o.id === activeOrderId)
        const table = fnb && orderType === 'dine-in' ? tables.find((x) => x.id === tableId) : undefined
        const tx: Transaction = {
          id, createdAt: now.toISOString(), items,
          subtotal: t.subtotal, discount: t.discount, discountLabel, serviceCharge: t.service, serviceRate, tax: t.tax, taxRate: settings.taxRate, total: t.total,
          method, received: paid, change: calcChange(paid, t.total), status: 'Berhasil',
          cashier: emp!.name, customerId: cust?.id, customerName: cust?.name,
          orderType: fnb ? orderType : undefined, tableName: table?.name, orderNumber: order?.number,
        }
        const newMovements: StockMovement[] = []
        const nextProducts = products.map((p) => {
          const l = cart.find((x) => x.productId === p.id && !x.custom)
          if (!l) return p
          newMovements.push({
            id: uid('m'), productId: p.id, productName: p.name, createdAt: now.toISOString(), type: 'Penjualan',
            delta: -l.qty, before: p.stock, after: p.stock - l.qty, note: id,
          })
          return { ...p, stock: p.stock - l.qty }
        })
        set({
          products: nextProducts,
          transactions: [tx, ...transactions],
          movements: [...newMovements, ...movements].slice(0, MAX_MOVEMENTS),
          orders: orders.filter((o) => o.id !== activeOrderId),
          ...CART_RESET,
        })
        return { ok: true, transaction: tx }
      },

      /** Simpan keranjang sebagai pesanan terbuka. Di kafe/restoran sekaligus dikirim ke dapur. */
      saveOrder: () => {
        const { cart, discount, cartCustomerId, orderType, tableId, orders, activeOrderId, settings, tables, orderSeq } = get()
        if (cart.length === 0) return { ok: false, error: 'Keranjang kosong.' }
        const fnb = isFnb(settings.businessType)
        if (fnb && orderType === 'dine-in') {
          if (!tableId) return { ok: false, error: 'Pilih meja untuk pesanan makan di tempat.' }
          const busy = orders.find((o) => o.tableId === tableId && o.id !== activeOrderId)
          if (busy) return { ok: false, error: `${tables.find((x) => x.id === tableId)?.name ?? 'Meja'} sedang dipakai pesanan ${busy.number}.` }
        }
        const existing = orders.find((o) => o.id === activeOrderId)
        const today = dayKey(new Date())
        const seq = existing ? orderSeq.n : (orderSeq.date === today ? orderSeq.n : 0) + 1
        const order: OpenOrder = {
          id: existing?.id ?? uid('o'),
          number: existing?.number ?? `P-${String(seq).padStart(3, '0')}`,
          orderType, tableId: fnb && orderType === 'dine-in' ? tableId : null, customerId: cartCustomerId,
          lines: cart.map((l) => ({ ...l })), discount,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          status: existing?.status ?? 'Baru',
          sentToKitchen: fnb,
        }
        // item baru ditambahkan ke pesanan yang sudah di dapur → kembali ke "Baru"
        if (existing && fnb) {
          const before = new Map(existing.lines.map((l) => [l.productId, l.qty]))
          if (order.lines.some((l) => (before.get(l.productId) ?? 0) < l.qty)) order.status = 'Baru'
        }
        set({ orders: existing ? orders.map((o) => (o.id === order.id ? order : o)) : [order, ...orders], orderSeq: existing ? orderSeq : { date: today, n: seq }, ...CART_RESET })
        return { ok: true, order }
      },

      resumeOrder: (id) => {
        const { orders, cart } = get()
        const o = orders.find((x) => x.id === id)
        if (!o) return { ok: false, error: 'Pesanan tidak ditemukan.' }
        if (cart.length > 0 && get().activeOrderId !== id) return { ok: false, error: 'Keranjang masih berisi item. Simpan atau kosongkan dulu.' }
        set({ cart: o.lines.map((l) => ({ ...l })), discount: o.discount, cartCustomerId: o.customerId, orderType: o.orderType, tableId: o.tableId, activeOrderId: o.id })
        return { ok: true }
      },

      cancelOrder: (id) => set({ orders: get().orders.filter((o) => o.id !== id), ...(get().activeOrderId === id ? CART_RESET : {}) }),
      setOrderStatus: (id, status) => set({ orders: get().orders.map((o) => (o.id === id ? { ...o, status } : o)) }),

      addTable: (t) => {
        const { tables } = get()
        if (!t.name.trim()) return { ok: false, error: 'Nama meja wajib diisi.' }
        if (tables.some((x) => x.name.toLowerCase() === t.name.trim().toLowerCase())) return { ok: false, error: 'Nama meja sudah dipakai.' }
        set({ tables: [...tables, { ...t, name: t.name.trim(), area: t.area.trim() || 'Utama', id: uid('t') }] })
        return { ok: true }
      },
      updateTable: (id, patch) => set({ tables: get().tables.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
      deleteTable: (id) => {
        if (get().orders.some((o) => o.tableId === id)) return { ok: false, error: 'Meja sedang dipakai pesanan terbuka.' }
        set({ tables: get().tables.filter((t) => t.id !== id) })
        return { ok: true }
      },

      /** Refund penuh (simulasi): status berubah, stok barang dikembalikan. Tidak ada uang yang bergerak. */
      refundTransaction: (id, reason) => {
        const { transactions, products, movements, employees, activeEmployeeId } = get()
        const emp = employees.find((e) => e.id === activeEmployeeId)
        if (!hasPerm(emp, 'refund')) return { ok: false, error: 'Akun ini tidak punya hak refund.' }
        const tx = transactions.find((t) => t.id === id)
        if (!tx) return { ok: false, error: 'Transaksi tidak ditemukan.' }
        if (tx.status === 'Dikembalikan') return { ok: false, error: 'Transaksi ini sudah di-refund.' }
        if (!reason.trim()) return { ok: false, error: 'Alasan refund wajib diisi.' }
        const now = new Date().toISOString()
        const back: StockMovement[] = []
        const nextProducts = products.map((p) => {
          const item = tx.items.find((i) => i.productId === p.id)
          if (!item) return p
          back.push({
            id: uid('m'), productId: p.id, productName: p.name, createdAt: now, type: 'Pengembalian',
            delta: item.qty, before: p.stock, after: p.stock + item.qty, note: `Refund ${tx.id}`,
          })
          return { ...p, stock: p.stock + item.qty }
        })
        set({
          products: nextProducts,
          transactions: transactions.map((t) => (t.id === id ? { ...t, status: 'Dikembalikan' as const, refundedAt: now, refundReason: reason.trim(), refundedBy: emp!.name } : t)),
          movements: [...back, ...movements].slice(0, MAX_MOVEMENTS),
        })
        return { ok: true }
      },

      addProduct: (p) => {
        const product: Product = { ...p, id: uid('p') }
        set({
          products: [product, ...get().products],
          categories: get().categories.includes(product.category) ? get().categories : [...get().categories, product.category],
          movements: [
            { id: uid('m'), productId: product.id, productName: product.name, createdAt: new Date().toISOString(), type: 'Stok awal' as const, delta: product.stock, before: 0, after: product.stock, note: 'Produk baru ditambahkan' },
            ...get().movements,
          ].slice(0, MAX_MOVEMENTS),
        })
        return product
      },

      updateProduct: (id, patch) => {
        const { products, movements, cart } = get()
        const old = products.find((p) => p.id === id)
        if (!old) return
        const merged = { ...old, ...patch }
        const extra: StockMovement[] = []
        if (merged.stock !== old.stock) {
          extra.push({
            id: uid('m'), productId: id, productName: merged.name, createdAt: new Date().toISOString(), type: 'Penyesuaian',
            delta: merged.stock - old.stock, before: old.stock, after: merged.stock, note: 'Diubah dari formulir produk',
          })
        }
        set({
          products: products.map((p) => (p.id === id ? merged : p)),
          categories: get().categories.includes(merged.category) ? get().categories : [...get().categories, merged.category],
          movements: [...extra, ...movements].slice(0, MAX_MOVEMENTS),
          cart: cart.map((l) => (l.productId === id ? { ...l, qty: Math.min(l.qty, merged.stock) } : l)).filter((l) => !(l.productId === id && (!merged.active || l.qty <= 0))),
        })
      },

      deleteProduct: (id) => set({ products: get().products.filter((p) => p.id !== id), cart: get().cart.filter((l) => l.productId !== id) }),

      adjustStock: (id, mode, qty, note) => {
        const { products, movements } = get()
        const p = products.find((x) => x.id === id)
        if (!p) return { ok: false, error: 'Produk tidak ditemukan.' }
        if (!Number.isInteger(qty) || qty < 0) return { ok: false, error: 'Jumlah harus bilangan bulat ≥ 0.' }
        if (mode !== 'setel' && qty === 0) return { ok: false, error: 'Jumlah harus lebih dari 0.' }
        let after = p.stock
        if (mode === 'masuk') after = p.stock + qty
        if (mode === 'keluar') {
          if (qty > p.stock) return { ok: false, error: `Stok hanya ${p.stock}; tidak bisa dikeluarkan ${qty}.` }
          after = p.stock - qty
        }
        if (mode === 'setel') after = qty
        if (after === p.stock) return { ok: false, error: 'Stok tidak berubah.' }
        const m: StockMovement = {
          id: uid('m'), productId: id, productName: p.name, createdAt: new Date().toISOString(),
          type: mode === 'masuk' ? 'Stok Masuk' : mode === 'keluar' ? 'Stok Keluar' : 'Penyesuaian',
          delta: after - p.stock, before: p.stock, after, note: note.trim() || '—',
        }
        set({
          products: products.map((x) => (x.id === id ? { ...x, stock: after } : x)),
          movements: [m, ...movements].slice(0, MAX_MOVEMENTS),
          cart: get().cart.map((l) => (l.productId === id ? { ...l, qty: Math.min(l.qty, after) } : l)).filter((l) => l.qty > 0),
        })
        return { ok: true }
      },

      addCategory: (name) => {
        const n = name.trim()
        if (!n) return { ok: false, error: 'Nama kategori wajib diisi.' }
        if (get().categories.some((c) => c.toLowerCase() === n.toLowerCase())) return { ok: false, error: 'Kategori sudah ada.' }
        set({ categories: [...get().categories, n] })
        return { ok: true }
      },
      renameCategory: (oldName, newName) => {
        const n = newName.trim()
        if (!n) return { ok: false, error: 'Nama kategori wajib diisi.' }
        if (n.toLowerCase() !== oldName.toLowerCase() && get().categories.some((c) => c.toLowerCase() === n.toLowerCase())) return { ok: false, error: 'Kategori sudah ada.' }
        set({ categories: get().categories.map((c) => (c === oldName ? n : c)), products: get().products.map((p) => (p.category === oldName ? { ...p, category: n } : p)) })
        return { ok: true }
      },
      deleteCategory: (name) => {
        if (get().products.some((p) => p.category === name)) return { ok: false, error: 'Masih ada produk di kategori ini. Pindahkan produknya dulu.' }
        set({ categories: get().categories.filter((c) => c !== name) })
        return { ok: true }
      },

      addCustomer: (c) => {
        const customer: Customer = { ...c, id: uid('c'), createdAt: new Date().toISOString() }
        set({ customers: [customer, ...get().customers] })
        return customer
      },
      updateCustomer: (id, patch) => set({ customers: get().customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),
      deleteCustomer: (id) => set({ customers: get().customers.filter((c) => c.id !== id), cartCustomerId: get().cartCustomerId === id ? null : get().cartCustomerId }),

      addEmployee: (e) => {
        const emp: Employee = { ...e, id: uid('e') }
        set({ employees: [...get().employees, emp] })
        return emp
      },
      updateEmployee: (id, patch) => {
        const { employees } = get()
        const old = employees.find((e) => e.id === id)
        if (!old) return { ok: false, error: 'Karyawan tidak ditemukan.' }
        const next = { ...old, ...patch }
        const after = employees.map((e) => (e.id === id ? next : e))
        if (activeOwners(after).length === 0) return { ok: false, error: 'Harus ada minimal satu Pemilik yang aktif.' }
        if (id === get().activeEmployeeId && !next.active) return { ok: false, error: 'Tidak bisa menonaktifkan akun yang sedang dipakai.' }
        set({ employees: after })
        return { ok: true }
      },
      deleteEmployee: (id) => {
        const { employees, activeEmployeeId } = get()
        if (id === activeEmployeeId) return { ok: false, error: 'Tidak bisa menghapus akun yang sedang dipakai.' }
        const after = employees.filter((e) => e.id !== id)
        if (activeOwners(after).length === 0) return { ok: false, error: 'Harus ada minimal satu Pemilik yang aktif.' }
        set({ employees: after })
        return { ok: true }
      },
      switchEmployee: (id) => {
        const e = get().employees.find((x) => x.id === id)
        if (e && e.active) set({ activeEmployeeId: id })
      },

      clockIn: (employeeId) => {
        const { employees, attendance } = get()
        const emp = employees.find((e) => e.id === employeeId)
        if (!emp || !emp.active) return { ok: false, error: 'Karyawan tidak ditemukan atau nonaktif.' }
        const today = dayKey(new Date())
        const rec = attendance.find((a) => a.employeeId === employeeId && a.date === today)
        if (rec) return { ok: false, error: rec.clockOut ? `${emp.name} sudah menyelesaikan absensi hari ini.` : `${emp.name} sudah absen masuk hari ini.` }
        const now = new Date().toISOString()
        set({ attendance: [{ id: uid('a'), employeeId, employeeName: emp.name, date: today, clockIn: now, note: '', manual: false }, ...attendance] })
        return { ok: true }
      },
      clockOut: (employeeId) => {
        const { employees, attendance } = get()
        const emp = employees.find((e) => e.id === employeeId)
        const today = dayKey(new Date())
        const rec = attendance.find((a) => a.employeeId === employeeId && a.date === today)
        if (!emp || !rec) return { ok: false, error: 'Belum ada absen masuk hari ini.' }
        if (rec.clockOut) return { ok: false, error: 'Sudah absen pulang hari ini.' }
        set({ attendance: attendance.map((a) => (a.id === rec.id ? { ...a, clockOut: new Date().toISOString() } : a)) })
        return { ok: true }
      },
      saveAttendance: (r) => {
        const { employees, attendance, activeEmployeeId } = get()
        if (!hasPerm(employees.find((e) => e.id === activeEmployeeId), 'absensi_kelola')) return { ok: false, error: 'Akun ini tidak punya hak mengelola absensi.' }
        const emp = employees.find((e) => e.id === r.employeeId)
        if (!emp) return { ok: false, error: 'Pilih karyawan.' }
        if (r.clockOut && r.clockOut < r.clockIn) return { ok: false, error: 'Jam pulang tidak boleh sebelum jam masuk.' }
        if (attendance.some((a) => a.employeeId === r.employeeId && a.date === r.date && a.id !== r.id)) return { ok: false, error: `${emp.name} sudah punya catatan absensi pada tanggal itu.` }
        const rec: AttendanceRecord = { id: r.id ?? uid('a'), employeeId: emp.id, employeeName: emp.name, date: r.date, clockIn: r.clockIn, clockOut: r.clockOut, note: r.note, manual: true }
        set({ attendance: (r.id ? attendance.map((a) => (a.id === r.id ? rec : a)) : [rec, ...attendance]).sort((a, b) => b.clockIn.localeCompare(a.clockIn)) })
        return { ok: true }
      },
      deleteAttendance: (id) => {
        const { employees, activeEmployeeId } = get()
        if (!hasPerm(employees.find((e) => e.id === activeEmployeeId), 'absensi_kelola')) return
        set({ attendance: get().attendance.filter((a) => a.id !== id) })
      },

      addPromotion: (p) => set({ promotions: [{ ...p, id: uid('pr') }, ...get().promotions] }),
      updatePromotion: (id, patch) => {
        const promotions = get().promotions.map((p) => (p.id === id ? { ...p, ...patch } : p))
        const d = get().discount
        set({ promotions, discount: d.promoId === id ? NO_DISCOUNT : d })
      },
      deletePromotion: (id) => {
        const d = get().discount
        set({ promotions: get().promotions.filter((p) => p.id !== id), discount: d.promoId === id ? NO_DISCOUNT : d })
      },

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      setBusinessType: (type, applyDemo) => {
        if (!applyDemo) {
          set({ settings: { ...get().settings, businessType: type, serviceRate: isFnb(type) && !isFnb(get().settings.businessType) ? 5 : get().settings.serviceRate } })
          return
        }
        const d = freshData(type)
        set({
          settings: { ...d.settings, currency: get().settings.currency },
          products: d.products, categories: d.categories, tables: d.tables, transactions: d.transactions, movements: d.movements,
          orders: [], orderSeq: { date: '', n: 0 }, attendance: d.attendance, ...CART_RESET,
        })
      },

      resetDemoData: () => set({ ...freshData(get().settings.businessType), ...CART_RESET }),
      clearTransactions: () => set({ transactions: [], movements: get().movements.filter((m) => m.type !== 'Penjualan' && m.type !== 'Pengembalian') }),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        products: s.products, categories: s.categories, tables: s.tables, transactions: s.transactions, movements: s.movements,
        settings: s.settings, customers: s.customers, employees: s.employees, promotions: s.promotions, orders: s.orders,
        attendance: s.attendance, activeEmployeeId: s.activeEmployeeId, orderSeq: s.orderSeq,
      }),
      // Versi lama: tambahkan hak akses baru ke karyawan yang sudah ada.
      migrate: (persisted, version) => {
        const p = persisted as { employees?: Employee[] } | undefined
        if (p && Array.isArray(p.employees) && version < 3) {
          p.employees = p.employees.map((e) => {
            const perms = new Set(e.permissions ?? [])
            for (const x of ROLE_DEFAULTS[e.role] ?? []) if (e.role === 'Pemilik' || ['pesanan', 'absensi', 'absensi_kelola'].includes(x)) perms.add(x)
            return { ...e, permissions: [...perms] as Permission[] }
          })
        }
        return p as never
      },
      // Data tersimpan yang rusak/tidak lengkap/berasal dari versi lama tidak boleh merusak aplikasi.
      merge: (persisted, current) => {
        const p = persisted as Partial<State> | undefined
        if (!p || typeof p !== 'object') return current
        const arr = <T,>(v: unknown, fb: T[], ok: (x: T) => boolean): T[] => (Array.isArray(v) ? (v as T[]).filter((x) => x && ok(x)) : fb)
        const employees = arr<Employee>(p.employees, current.employees, (x) => typeof x.id === 'string' && Array.isArray(x.permissions))
        const safeEmployees = activeOwners(employees).length ? employees : current.employees
        const active = safeEmployees.find((e) => e.id === p.activeEmployeeId && e.active) ? (p.activeEmployeeId as string) : safeEmployees.find((e) => e.active)!.id
        const products = arr<Product>(p.products, current.products, (x) => typeof x.id === 'string' && typeof x.price === 'number')
        const cats = Array.isArray(p.categories) ? (p.categories as string[]).filter((c) => typeof c === 'string') : []
        return {
          ...current,
          products,
          categories: [...new Set([...cats, ...products.map((x) => x.category)])],
          tables: arr<Table>(p.tables, current.tables, (x) => typeof x.id === 'string'),
          orders: arr<OpenOrder>(p.orders, [], (x) => typeof x.id === 'string' && Array.isArray(x.lines)),
          orderSeq: p.orderSeq && typeof p.orderSeq.n === 'number' ? p.orderSeq : current.orderSeq,
          attendance: arr<AttendanceRecord>(p.attendance, current.attendance, (x) => typeof x.id === 'string'),
          transactions: arr<Transaction>(p.transactions, current.transactions, (x) => typeof x.id === 'string' && Array.isArray(x.items)),
          movements: arr<StockMovement>(p.movements, current.movements, () => true),
          customers: arr<Customer>(p.customers, current.customers, (x) => typeof x.id === 'string'),
          promotions: arr<Promotion>(p.promotions, current.promotions, (x) => typeof x.id === 'string'),
          employees: safeEmployees,
          activeEmployeeId: active,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings && typeof p.settings === 'object' ? p.settings : {}) },
        }
      },
    },
  ),
)

export const useActiveEmployee = () => useStore((s) => s.employees.find((e) => e.id === s.activeEmployeeId) ?? s.employees[0])
export const can = (e: Employee | undefined, p: Permission) => hasPerm(e, p)
export const useIsFnb = () => useStore((s) => isFnb(s.settings.businessType))
