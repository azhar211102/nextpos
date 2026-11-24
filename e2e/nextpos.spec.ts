import { expect, test } from '@playwright/test'
import { angka, pilih, tambah, transaksiTunai } from './helpers'

type W = { __print: number }
const stubPrint = () => {
  ;(window as unknown as W).__print = 0
  window.print = () => {
    ;(window as unknown as W).__print++
  }
}
const printCount = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as W).__print)

test.describe('Navigasi dan Dasbor', () => {
  test('semua menu sidebar berfungsi', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Ringkasan', level: 1 })).toBeVisible()
    const nav = page.getByRole('navigation', { name: 'Navigasi utama' })
    for (const [menu, judul] of [
      ['Kasir (POS)', 'Kasir'], ['Produk', 'Produk'], ['Inventaris', 'Inventaris'],
      ['Transaksi', 'Transaksi'], ['Laporan', 'Laporan'], ['Pelanggan', 'Pelanggan'], ['Karyawan', 'Karyawan'], ['Promosi', 'Promosi'], ['Pengaturan', 'Pengaturan'], ['Ringkasan', 'Ringkasan'],
    ] as const) {
      await nav.getByRole('link', { name: menu }).click()
      await expect(page.getByRole('heading', { name: judul, level: 1 })).toBeVisible()
    }
  })

  test('dasbor menampilkan data dinamis dan pemilih tanggal', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Total Penjualan Hari Ini')).toBeVisible()
    await expect(page.getByText('Produk Terlaris')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Metode Pembayaran' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Stok Perlu Perhatian' })).toBeVisible()
    await page.getByRole('combobox', { name: 'Pilih tanggal' }).click()
    await page.getByRole('option').nth(1).click()
    await expect(page.getByText('Performa penjualan pada tanggal terpilih.')).toBeVisible()
  })
})

test.describe('Kasir', () => {
  test('pencarian dan filter kategori', async ({ page }) => {
    await page.goto('/kasir')
    const kartu = page.getByTestId('produk-kartu')
    const semua = await kartu.count()
    expect(semua).toBeGreaterThan(10)
    await page.getByRole('tab', { name: 'Minuman' }).click()
    expect(await kartu.count()).toBeLessThan(semua)
    await expect(page.getByRole('button', { name: /Tambah Indomie/ })).toHaveCount(0)
    await page.getByRole('tab', { name: 'Semua' }).click()
    await page.getByLabel('Cari produk').fill('teh pucuk')
    await expect(kartu).toHaveCount(1)
    await page.getByLabel('Cari produk').fill('zzzz')
    await expect(page.getByText('Produk tidak ditemukan')).toBeVisible()
  })

  test('keranjang: tambah, ubah qty, hapus, kosongkan', async ({ page }) => {
    await page.goto('/kasir')
    await tambah(page, 'Indomie Goreng', 2)
    await tambah(page, 'Aqua 600ml')
    const baris = page.getByTestId('cart-line')
    await expect(baris).toHaveCount(2)
    await page.getByRole('button', { name: 'Tambah jumlah Indomie Goreng' }).click()
    await expect(page.getByRole('textbox', { name: 'Jumlah Indomie Goreng' })).toHaveValue('3')
    await page.getByRole('button', { name: 'Kurangi jumlah Indomie Goreng' }).click()
    await expect(page.getByRole('textbox', { name: 'Jumlah Indomie Goreng' })).toHaveValue('2')
    await expect(page.getByTestId('subtotal')).toHaveText('Rp 11.000') // 2x3.500 + 4.000
    await page.getByRole('button', { name: 'Hapus Aqua 600ml dari keranjang' }).click()
    await expect(baris).toHaveCount(1)
    await page.getByRole('button', { name: 'Kosongkan', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Kosongkan' }).click()
    await expect(page.getByText('Belum ada item')).toBeVisible()
  })

  test('kuantitas tidak negatif dan tidak melebihi stok', async ({ page }) => {
    await page.goto('/kasir')
    await tambah(page, 'Kopi Susu', 8) // stok 8
    await expect(page.getByRole('textbox', { name: 'Jumlah Kopi Susu' })).toHaveValue('8')
    await page.getByRole('button', { name: 'Tambah Kopi Susu ke keranjang' }).click()
    await expect(page.getByText('Stok Kopi Susu hanya 8.').first()).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Jumlah Kopi Susu' })).toHaveValue('8')
    await page.getByRole('textbox', { name: 'Jumlah Kopi Susu' }).fill('99')
    await page.getByRole('textbox', { name: 'Jumlah Kopi Susu' }).blur()
    await expect(page.getByRole('textbox', { name: 'Jumlah Kopi Susu' })).toHaveValue('8')
    await page.getByRole('textbox', { name: 'Jumlah Kopi Susu' }).fill('0')
    await page.getByRole('textbox', { name: 'Jumlah Kopi Susu' }).blur()
    await expect(page.getByTestId('cart-line')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Minuman Isotonik, stok habis/ })).toBeDisabled()
  })

  test('perhitungan diskon dan pajak', async ({ page }) => {
    await page.goto('/kasir')
    await tambah(page, 'Indomie Goreng', 2) // 7.000
    await page.getByRole('button', { name: /Diskon & Promo/ }).click()
    await page.getByLabel('Diskon manual').fill('10')
    await expect(page.getByTestId('diskon-nilai')).toHaveText('- Rp 700')
    await expect(page.getByTestId('pajak')).toHaveText('Rp 693') // 11% x 6.300
    await expect(page.getByTestId('total')).toHaveText('Rp 6.993')
    await pilih(page, 'Jenis diskon', 'Rp')
    await page.getByLabel('Diskon manual').fill('1000')
    await expect(page.getByTestId('total')).toHaveText('Rp 6.660') // (7000-1000)*1.11
    await page.getByLabel('Diskon manual').fill('9999')
    await expect(page.getByText('Diskon melebihi subtotal belanja.').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Selesai' })).toBeDisabled()
  })
})

test.describe('Pembayaran dan struk', () => {
  test('tunai: uang kurang, kembalian, struk, stok berkurang, dasbor dan riwayat terbarui', async ({ page }) => {
    await page.goto('/')
    const jumlah = page.getByText('Jumlah Transaksi').locator('xpath=following-sibling::p[1]')
    const jumlahAwal = angka(await jumlah.textContent())
    await page.goto('/kasir')
    await tambah(page, 'Indomie Goreng', 2)
    await page.getByRole('button', { name: /^Bayar/ }).click()
    await expect(page).toHaveURL(/pembayaran/)
    await expect(page.getByTestId('total-bayar')).toHaveText('Rp 7.770') // 7000 + 11%
    await page.getByLabel('Jumlah uang diterima').fill('5000')
    await expect(page.getByTestId('uang-kurang')).toContainText('Uang kurang Rp 2.770')
    await page.getByLabel('Jumlah uang diterima').fill('10000')
    await expect(page.getByTestId('kembalian')).toHaveText('Rp 2.230')
    await page.getByRole('button', { name: 'Uang Pas' }).click()
    await expect(page.getByTestId('kembalian')).toHaveText('Rp 0')
    await page.getByLabel('Jumlah uang diterima').fill('10000')
    await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click()

    await expect(page).toHaveURL(/\/struk\/TRX-\d{6}-\d{4}/)
    const struk = page.getByTestId('struk')
    await expect(page.getByText('Pembayaran Berhasil')).toBeVisible()
    await expect(struk).toContainText('Toko Makmur Jaya')
    await expect(struk).toContainText('Indomie Goreng')
    await expect(struk).toContainText('Pajak (11%)')
    await expect(struk).toContainText('Rp 7.770')
    await expect(struk).toContainText('Uang Diterima')
    await expect(struk).toContainText('Rp 2.230')

    await page.goto('/produk')
    await page.getByLabel('Cari produk').fill('Indomie Goreng')
    await expect(page.getByTestId('baris-produk').first()).toContainText('118') // 120 - 2
    await page.goto('/inventaris')
    await page.getByRole('tab', { name: 'Riwayat Perubahan' }).click()
    await expect(page.getByTestId('baris-riwayat-stok').first()).toContainText('Penjualan')
    await page.goto('/')
    const jumlahAkhir = angka(await jumlah.textContent())
    expect(jumlahAkhir).toBe(jumlahAwal + 1)
    await page.goto('/transaksi')
    await expect(page.getByTestId('baris-transaksi').first()).toContainText('Rp 7.770')
  })

  test('QRIS: halaman simulasi lalu pembayaran diterima', async ({ page }) => {
    await page.goto('/kasir')
    await tambah(page, 'Teh Pucuk')
    await page.getByRole('button', { name: /^Bayar/ }).click()
    await page.getByRole('radio', { name: /QRIS/ }).click()
    await page.getByRole('button', { name: 'Lanjut ke QRIS' }).click()
    await expect(page.getByText('Pindai untuk Membayar')).toBeVisible()
    await expect(page.getByTestId('status-bayar')).toHaveText('Menunggu pembayaran')
    await expect(page.getByText(/bukan kode QR sungguhan/)).toBeVisible()
    await page.getByRole('button', { name: 'Simulasikan Pembayaran Diterima' }).click()
    await expect(page).toHaveURL(/\/struk\/TRX-/)
    await expect(page.getByTestId('struk')).toContainText('QRIS')
  })

  test('kartu debit/kredit: simulasi EDC', async ({ page }) => {
    await page.goto('/kasir')
    await tambah(page, 'Aqua 600ml')
    await page.getByRole('button', { name: /^Bayar/ }).click()
    await page.getByRole('radio', { name: /Kartu Debit\/Kredit/ }).click()
    await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click()
    await expect(page.getByText('Menunggu persetujuan mesin EDC')).toBeVisible()
    await expect(page).toHaveURL(/\/struk\/TRX-/, { timeout: 8000 })
    await expect(page.getByTestId('struk')).toContainText('Kartu Debit/Kredit')
  })

  test('tidak ada transaksi ganda saat klik berulang', async ({ page }) => {
    await page.goto('/transaksi')
    const sebelum = angka((await page.getByText(/transaksi · Total/).textContent())!.split('·')[0])
    await page.goto('/kasir')
    await tambah(page, 'Aqua 600ml')
    await page.getByRole('button', { name: /^Bayar/ }).click()
    await page.getByRole('button', { name: 'Uang Pas' }).click()
    await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).dblclick()
    await expect(page).toHaveURL(/\/struk\/TRX-/)
    await page.goto('/transaksi')
    const sesudah = angka((await page.getByText(/transaksi · Total/).textContent())!.split('·')[0])
    expect(sesudah).toBe(sebelum + 1)
  })

  test('cetak struk memanggil dialog cetak; transaksi baru; kembali ke dasbor', async ({ page }) => {
    await page.addInitScript(stubPrint)
    await transaksiTunai(page, 'Aqua 600ml', 1, '10000')
    await page.getByRole('button', { name: 'Cetak Struk' }).click()
    expect(await printCount(page)).toBe(1)
    await page.getByRole('button', { name: 'Kembali ke Ringkasan' }).click()
    await expect(page.getByRole('heading', { name: 'Ringkasan', level: 1 })).toBeVisible()
    await page.goBack()
    await page.getByRole('button', { name: 'Transaksi Baru' }).click()
    await expect(page).toHaveURL(/\/kasir$/)
    await expect(page.getByText('Belum ada item')).toBeVisible()
  })

  test('CSS cetak hanya menampilkan struk', async ({ page }) => {
    await transaksiTunai(page, 'Aqua 600ml', 1, '10000')
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByTestId('struk')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Cetak Struk' })).toBeHidden()
  })
})

test.describe('Manajemen produk', () => {
  test('tambah (dengan validasi), ubah, hapus; katalog kasir ikut berubah', async ({ page }) => {
    await page.goto('/produk')
    await page.getByRole('button', { name: 'Tambah Produk' }).click()
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Nama produk wajib diisi.')).toBeVisible()
    await expect(page.getByText('Harga jual harus lebih dari 0.')).toBeVisible()
    await page.getByRole('dialog').getByLabel('Nama Produk', { exact: true }).fill('Kerupuk Udang')
    await page.getByRole('dialog').getByLabel('SKU', { exact: true }).fill('NXP-001') // duplikat
    await page.getByRole('dialog').getByLabel('Harga Jual (Rp)', { exact: true }).fill('8500')
    await page.getByRole('dialog').getByLabel('Harga Modal (Rp)', { exact: true }).fill('6000')
    await page.getByRole('dialog').getByLabel('Jumlah Stok', { exact: true }).fill('30')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('SKU sudah dipakai produk lain.')).toBeVisible()
    await page.getByRole('dialog').getByLabel('SKU', { exact: true }).fill('KRP-001')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Kerupuk Udang berhasil ditambahkan.')).toBeVisible()
    await page.getByLabel('Cari produk').fill('Kerupuk')
    await expect(page.getByTestId('baris-produk')).toHaveCount(1)

    await page.getByRole('button', { name: 'Ubah Kerupuk Udang' }).click()
    await page.getByRole('dialog').getByLabel('Harga Jual (Rp)', { exact: true }).fill('9000')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByTestId('baris-produk').first()).toContainText('Rp 9.000')

    await page.goto('/kasir')
    await page.getByLabel('Cari produk').fill('Kerupuk')
    await expect(page.getByTestId('produk-kartu')).toContainText('Rp 9.000')

    await page.goto('/produk')
    await page.getByLabel('Cari produk').fill('Kerupuk')
    await page.getByRole('button', { name: 'Hapus Kerupuk Udang' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Hapus' }).click()
    await expect(page.getByText('Tidak ada produk yang cocok')).toBeVisible()
  })

  test('filter dan urutkan produk', async ({ page }) => {
    await page.goto('/produk')
    await pilih(page, 'Filter kategori', 'Camilan')
    await expect(page.getByTestId('baris-produk')).toHaveCount(3)
    await pilih(page, 'Filter kategori', 'Semua Kategori')
    await pilih(page, 'Filter status', 'Stok Habis')
    await expect(page.getByTestId('baris-produk')).toHaveCount(1)
    await pilih(page, 'Filter status', 'Semua Status')
    await pilih(page, 'Urutkan', 'Urut: Harga Termahal')
    await expect(page.getByTestId('baris-produk').first()).toContainText('Minyak Goreng')
  })
})

test.describe('Inventaris', () => {
  test('penyesuaian stok tercatat di riwayat dan tidak bisa melebihi stok', async ({ page }) => {
    await page.goto('/inventaris')
    await page.getByLabel('Cari inventaris').fill('Biskuit Kelapa')
    await page.getByRole('button', { name: 'Sesuaikan stok Biskuit Kelapa' }).click()
    await page.getByRole('radio', { name: 'Stok Keluar' }).click()
    await page.getByLabel('Jumlah', { exact: true }).fill('50')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Stok hanya 5; tidak bisa dikeluarkan 50.')).toBeVisible()
    await page.getByRole('radio', { name: 'Stok Masuk' }).click()
    await page.getByLabel('Jumlah', { exact: true }).fill('20')
    await page.getByLabel('Catatan').fill('Barang datang')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByTestId('baris-inventaris').first()).toContainText('25')
    await page.getByRole('tab', { name: 'Riwayat Perubahan' }).click()
    await expect(page.getByTestId('baris-riwayat-stok').first()).toContainText('Barang datang')
  })
})

test.describe('Riwayat transaksi', () => {
  test('cari, filter, detail, dan cetak ulang', async ({ page }) => {
    await page.addInitScript(stubPrint)
    await transaksiTunai(page, 'Teh Pucuk', 1, '10000')
    const id = (await page.getByText(/^TRX-\d{6}-\d{4}$/).first().textContent())!.trim()
    await page.goto('/transaksi')
    await page.getByLabel('Cari transaksi').fill(id)
    await expect(page.getByTestId('baris-transaksi')).toHaveCount(1)
    await page.getByLabel('Cari transaksi').fill('')
    await pilih(page, 'Filter metode pembayaran', 'QRIS')
    for (const r of await page.getByTestId('baris-transaksi').all()) await expect(r).toContainText('QRIS')
    await pilih(page, 'Filter metode pembayaran', 'Semua Metode')
    await page.getByLabel('Cari transaksi').fill(id)
    await page.getByRole('button', { name: `Lihat detail ${id}` }).click()
    await expect(page.getByRole('dialog').getByTestId('struk')).toContainText('Teh Pucuk')
    await page.getByRole('button', { name: 'Cetak Ulang Struk' }).click()
    expect(await printCount(page)).toBe(1)
    await page.getByRole('button', { name: 'Tutup' }).click()
    await page.getByLabel('Cari transaksi').fill('')
    await page.getByLabel('Dari tanggal').fill('2000-01-01')
    await page.getByLabel('Sampai tanggal').fill('2000-01-02')
    await expect(page.getByText('Tidak ada transaksi yang cocok')).toBeVisible()
  })
})

test.describe('Pengaturan dan LocalStorage', () => {
  test('simpan pengaturan, validasi, dan bertahan setelah muat ulang', async ({ page }) => {
    await page.goto('/pengaturan')
    await page.getByLabel('Nama Toko').fill('')
    await page.getByLabel('Persentase Pajak (%)').fill('150')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Nama toko wajib diisi.')).toBeVisible()
    await expect(page.getByText('Pajak harus antara 0 dan 100.')).toBeVisible()
    await page.getByLabel('Nama Toko').fill('Warung Berkah')
    await page.getByLabel('Persentase Pajak (%)').fill('10')
    await page.getByLabel('Catatan Bagian Bawah Struk').fill('Sampai jumpa lagi')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Pengaturan berhasil disimpan.')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nama Toko')).toHaveValue('Warung Berkah')
    const raw = await page.evaluate(() => localStorage.getItem('nextpos:v1'))
    expect(raw).toContain('Warung Berkah')
    await transaksiTunai(page, 'Indomie Goreng', 2, '10000')
    const struk = page.getByTestId('struk')
    await expect(struk).toContainText('Warung Berkah')
    await expect(struk).toContainText('Pajak (10%)')
    await expect(struk).toContainText('Sampai jumpa lagi')
  })

  test('data transaksi dan stok bertahan setelah muat ulang', async ({ page }) => {
    await transaksiTunai(page, 'Aqua 600ml', 3, '20000')
    await page.reload()
    await page.goto('/produk')
    await page.getByLabel('Cari produk').fill('Aqua')
    await expect(page.getByTestId('baris-produk').first()).toContainText('95')
  })

  test('LocalStorage rusak tidak merusak aplikasi', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nextpos:v1', '{rusak:::'))
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Ringkasan', level: 1 })).toBeVisible()
    await page.goto('/kasir')
    expect(await page.getByTestId('produk-kartu').count()).toBeGreaterThan(10)
  })

  test('LocalStorage dengan struktur salah tetap aman', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('nextpos:v1', JSON.stringify({ state: { products: 'x', transactions: null, settings: 5 }, version: 1 })),
    )
    await page.goto('/kasir')
    expect(await page.getByTestId('produk-kartu').count()).toBeGreaterThan(10)
  })

  test('hapus semua transaksi mengosongkan riwayat', async ({ page }) => {
    await page.goto('/pengaturan')
    await page.getByRole('button', { name: 'Hapus Semua Transaksi' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Hapus Semua' }).click()
    await page.goto('/transaksi')
    await expect(page.getByText('Belum ada transaksi')).toBeVisible()
  })
})

test.describe('Responsif', () => {
  for (const [w, h] of [[390, 844], [768, 1024], [1024, 768]] as const) {
    test(`tanpa overflow horizontal pada ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h })
      for (const path of ['/', '/kasir', '/pesanan', '/produk', '/inventaris', '/transaksi', '/laporan', '/pelanggan', '/karyawan', '/absensi', '/promosi', '/pengaturan']) {
        await page.goto(path)
        await page.waitForTimeout(250)
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(over, `${path} @${w}`).toBeLessThanOrEqual(0)
      }
    })
  }

  test('mobile: keranjang lewat panel bawah dan menu navigasi', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/kasir')
    await tambah(page, 'Aqua 600ml')
    await page.getByRole('button', { name: /Buka keranjang/ }).click()
    await expect(page.getByTestId('cart-line')).toHaveCount(1)
    await page.getByRole('dialog').getByRole('button', { name: /^Bayar/ }).click()
    await expect(page).toHaveURL(/pembayaran/)
    await page.getByRole('button', { name: 'Buka menu navigasi' }).click()
    await page.getByRole('dialog').getByRole('link', { name: 'Produk' }).click()
    await expect(page.getByRole('heading', { name: 'Produk', level: 1 })).toBeVisible()
  })
})

test('tidak ada error di console saat menjelajahi aplikasi', async ({ page }) => {
  const errs: string[] = []
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  page.on('pageerror', (e) => errs.push(String(e)))
  for (const p of ['/', '/kasir', '/produk', '/inventaris', '/transaksi', '/pengaturan']) {
    await page.goto(p)
    await page.waitForTimeout(300)
  }
  expect(errs).toEqual([])
})
