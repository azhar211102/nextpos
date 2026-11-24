import { expect, test, type Page } from '@playwright/test'
import { hariIni, pilih, tambah } from './helpers'

async function masukSebagai(page: Page, nama: string, pin: string) {
  await page.getByRole('button', { name: /Ganti karyawan/ }).click()
  await page.getByRole('combobox', { name: 'Karyawan' }).click()
  await page.getByRole('option', { name: new RegExp(nama) }).click()
  await page.getByRole('dialog').getByLabel('PIN').fill(pin)
  await page.getByRole('dialog').getByRole('button', { name: 'Masuk' }).click()
}

async function jadiKafe(page: Page) {
  await page.goto('/pengaturan')
  await page.getByRole('radio', { name: /Kafe/ }).click()
  await page.getByRole('button', { name: /Ganti dan pasang data contoh/ }).click()
  await page.waitForURL('**/pengaturan')
  await expect(page.getByLabel('Nama Toko')).toHaveValue('Kedai Kopi Senja', { timeout: 10000 })
}

test.describe('Absensi', () => {
  test('absen masuk dan pulang dengan PIN; PIN salah ditolak; tidak bisa dobel', async ({ page }) => {
    await page.goto('/absensi')
    await expect(page.getByRole('heading', { name: 'Absensi', level: 1 })).toBeVisible()
    await page.locator('#abs-emp').click()
    await page.getByRole('option', { name: /Sari Wulandari/ }).click()
    await expect(page.getByTestId('status-absen')).toHaveText('Belum absen hari ini.')
    await expect(page.getByRole('button', { name: 'Absen Masuk' })).toBeDisabled() // PIN belum diisi
    await page.getByLabel('PIN').fill('0000')
    await page.getByRole('button', { name: 'Absen Masuk' }).click()
    await expect(page.getByText('PIN salah. Coba lagi.')).toBeVisible()
    await page.getByLabel('PIN').fill('3333')
    await page.getByRole('button', { name: 'Absen Masuk' }).click()
    await expect(page.getByTestId('status-absen')).toContainText('Masuk ')
    await expect(page.getByRole('button', { name: 'Absen Masuk' })).toBeDisabled()
    await expect(page.getByTestId('bertugas')).toContainText('Sari Wulandari')
    await page.getByLabel('PIN').fill('3333')
    await page.getByRole('button', { name: 'Absen Pulang' }).click()
    await expect(page.getByTestId('status-absen')).toContainText('pulang')
    await expect(page.getByTestId('bertugas')).not.toContainText('Sari Wulandari')
    await expect(page.getByTestId('tabel-absensi')).toContainText('Sari Wulandari')
    // data tersimpan setelah muat ulang
    await page.reload()
    await expect(page.getByTestId('tabel-absensi')).toContainText('Sari Wulandari')
  })

  test('koreksi manual: validasi, status terlambat, dan hak akses', async ({ page }) => {
    await page.goto('/karyawan')
    await page.getByRole('button', { name: 'Tambah Karyawan' }).click()
    await page.getByLabel('Nama', { exact: true }).fill('Tester Absen')
    await page.getByLabel('PIN').fill('4321')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Tester Absen berhasil ditambahkan.')).toBeVisible()

    await page.goto('/absensi')
    await page.getByRole('button', { name: 'Tambah Koreksi' }).click()
    await page.locator('#ab-emp').click()
    await page.getByRole('option', { name: 'Tester Absen' }).click()
    await page.locator('#ab-date').fill(hariIni(-1))
    await page.locator('#ab-in').fill('09:00')
    await page.locator('#ab-out').fill('08:00')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Jam pulang tidak boleh sebelum jam masuk.')).toBeVisible()
    await page.locator('#ab-out').fill('17:30')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Catatan absensi disimpan.')).toBeVisible()
    const baris = page.getByTestId('baris-absensi').filter({ hasText: 'Tester Absen' })
    await expect(baris).toContainText('Terlambat 50 mnt') // 09:00 − 08:00 − toleransi 10
    await expect(baris).toContainText('(Manual)')
    await expect(baris).toContainText('8 jam 30 mnt')

    // Kasir hanya melihat catatannya sendiri dan tidak bisa mengoreksi
    await masukSebagai(page, 'Dewi Lestari', '1111')
    await expect(page.getByRole('button', { name: 'Tambah Koreksi' })).toHaveCount(0)
    await expect(page.getByTestId('tabel-absensi')).not.toContainText('Tester Absen')
  })

  test('unduh CSV absensi', async ({ page }) => {
    await page.goto('/absensi')
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Unduh CSV' }).click()
    expect((await dl).suggestedFilename()).toMatch(/^absensi-\d{4}-\d{2}-\d{2}-sd-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})

test.describe('Jenis usaha: kafe dan restoran', () => {
  test('toko tidak punya Meja dan Dapur; kafe memilikinya', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Navigasi utama' })
    await expect(nav.getByRole('link', { name: 'Meja' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Dapur' })).toHaveCount(0)
    await page.goto('/meja')
    await expect(page.getByText('Fitur khusus kafe dan restoran')).toBeVisible()
    await jadiKafe(page)
    await expect(nav.getByRole('link', { name: 'Meja' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Dapur' })).toBeVisible()
    await page.goto('/kasir')
    await expect(page.getByRole('button', { name: 'Tambah Americano ke keranjang' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Roti & Kue' })).toBeVisible()
  })

  test('alur kafe: catatan, layanan, meja, dapur, bayar, struk', async ({ page }) => {
    await jadiKafe(page)
    await page.goto('/kasir')
    await tambah(page, 'Americano', 2) // 36.000
    await page.getByRole('button', { name: 'Catatan Americano' }).click()
    await page.getByLabel('Catatan untuk Americano').fill('Tanpa gula')
    await page.getByLabel('Catatan untuk Americano').press('Enter')
    await expect(page.getByText('Catatan: Tanpa gula')).toBeVisible()
    await expect(page.getByTestId('layanan')).toHaveText('Rp 1.800') // 5% x 36.000
    await expect(page.getByTestId('pajak')).toHaveText('Rp 4.158') // 11% x 37.800
    await expect(page.getByTestId('total')).toHaveText('Rp 41.958')

    // makan di tempat wajib memilih meja
    await page.getByRole('button', { name: 'Simpan Pesanan' }).click()
    await expect(page.getByText('Pilih meja untuk pesanan makan di tempat.')).toBeVisible()
    await pilih(page, 'Meja', 'Meja 3')
    await page.getByRole('button', { name: 'Simpan Pesanan' }).click()
    await expect(page.getByText('Pesanan P-001 disimpan dan dikirim ke dapur.')).toBeVisible()
    await expect(page.getByText('Belum ada item')).toBeVisible()

    // meja terisi tidak bisa dipakai pesanan lain
    await tambah(page, 'Cappuccino')
    await pilih(page, 'Meja', /Meja 3 \(terisi\)/)
    await page.getByRole('button', { name: 'Simpan Pesanan' }).click()
    await expect(page.getByText(/Meja 3 sedang dipakai pesanan P-001/)).toBeVisible()
    await page.getByRole('button', { name: 'Kosongkan', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Kosongkan' }).click()

    await page.goto('/meja')
    await expect(page.locator('[data-testid="meja"][data-status="terisi"]')).toHaveCount(1)
    await expect(page.getByRole('button', { name: /Meja 3, terisi pesanan P-001/ })).toBeVisible()

    await page.goto('/dapur')
    const tiket = page.getByTestId('tiket-dapur')
    await expect(tiket).toContainText('2× Americano')
    await expect(tiket).toContainText('Tanpa gula')
    await tiket.getByRole('button', { name: 'Mulai Masak' }).click()
    await expect(page.getByRole('region', { name: 'Kolom Diproses' }).getByTestId('tiket-dapur')).toHaveCount(1)
    await page.getByRole('button', { name: 'Tandai Siap' }).click()
    await expect(page.getByRole('region', { name: 'Kolom Siap Disajikan' }).getByTestId('tiket-dapur')).toHaveCount(1)
    await page.getByRole('button', { name: 'Sudah Disajikan' }).click()
    await expect(page.getByText('Tidak ada pesanan di dapur')).toBeVisible()

    // pesanan tetap terbuka sampai dibayar
    await page.goto('/pesanan')
    await expect(page.getByTestId('baris-pesanan')).toHaveCount(1)
    await expect(page.getByTestId('baris-pesanan')).toContainText('Disajikan')
    await page.getByRole('button', { name: 'Buka pesanan P-001' }).click()
    await expect(page).toHaveURL(/\/kasir$/)
    await expect(page.getByTestId('cart-line')).toHaveCount(1)
    await page.getByRole('button', { name: /^Bayar/ }).click()
    await page.getByRole('button', { name: 'Uang Pas' }).click()
    await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click()
    const struk = page.getByTestId('struk')
    await expect(struk).toContainText('Kedai Kopi Senja')
    await expect(struk).toContainText('Makan di Tempat')
    await expect(struk).toContainText('Meja 3')
    await expect(struk).toContainText('Layanan (5%)')
    await expect(struk).toContainText('Catatan: Tanpa gula')
    await expect(struk).toContainText('Rp 41.958')

    await page.goto('/meja')
    await expect(page.locator('[data-testid="meja"][data-status="terisi"]')).toHaveCount(0)
    await page.goto('/pesanan')
    await expect(page.getByText('Tidak ada pesanan terbuka')).toBeVisible()
  })

  test('bawa pulang tidak butuh meja dan tidak mengunci meja', async ({ page }) => {
    await jadiKafe(page)
    await page.goto('/kasir')
    await tambah(page, 'Cappuccino')
    await pilih(page, 'Tipe pesanan', 'Bawa Pulang')
    await expect(page.getByRole('combobox', { name: 'Meja' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Simpan Pesanan' }).click()
    await expect(page.getByText(/Pesanan P-001 disimpan/)).toBeVisible()
    await page.goto('/meja')
    await expect(page.locator('[data-testid="meja"][data-status="terisi"]')).toHaveCount(0)
  })

  test('restoran: denah bertingkat dan menu utama', async ({ page }) => {
    await page.goto('/pengaturan')
    await page.getByRole('radio', { name: /Restoran/ }).click()
    await page.getByRole('button', { name: /Ganti dan pasang data contoh/ }).click()
    await expect(page.getByLabel('Nama Toko')).toHaveValue('Rumah Makan Selera Nusantara', { timeout: 10000 })
    await page.goto('/meja')
    await expect(page.getByRole('region', { name: 'Area Lantai 1' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Area Ruang VIP' })).toBeVisible()
    await page.goto('/kasir')
    await expect(page.getByRole('button', { name: 'Tambah Nasi Goreng Spesial ke keranjang' })).toBeVisible()
  })

  test('kelola meja: tambah dan hapus', async ({ page }) => {
    await jadiKafe(page)
    await page.goto('/meja')
    await page.getByRole('button', { name: 'Tambah Meja' }).click()
    await page.getByLabel('Nama meja').fill('Meja 1')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Nama meja sudah dipakai.')).toBeVisible()
    await page.getByLabel('Nama meja').fill('Sofa Depan')
    await page.getByLabel('Kursi').fill('3')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Meja ditambahkan.')).toBeVisible()
    await page.getByRole('button', { name: 'Hapus Sofa Depan' }).click({ force: true })
    await page.getByRole('alertdialog').getByRole('button', { name: 'Hapus' }).click()
    await expect(page.getByRole('button', { name: /Sofa Depan/ })).toHaveCount(0)
  })
})

test.describe('Kasir: fitur gaya Moka/ESB untuk semua usaha', () => {
  test('nominal bebas: tanpa stok, ikut pajak', async ({ page }) => {
    await page.goto('/kasir')
    await page.getByRole('tab', { name: 'Nominal Bebas' }).click()
    await page.getByRole('button', { name: 'Tambah ke Pesanan' }).click()
    await expect(page.getByText('Harga harus lebih dari 0.')).toBeVisible()
    await page.getByLabel('Nama item').fill('Jasa Antar')
    await page.getByLabel('Harga (Rp)').fill('12500')
    await page.getByRole('button', { name: 'Tambah ke Pesanan' }).click()
    await expect(page.getByTestId('cart-line')).toContainText('Jasa Antar')
    await expect(page.getByTestId('total')).toHaveText('Rp 13.875') // 12.500 + 11%
    await page.getByRole('button', { name: /^Bayar/ }).click()
    await page.getByRole('button', { name: 'Uang Pas' }).click()
    await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click()
    await expect(page.getByTestId('struk')).toContainText('Jasa Antar')
  })

  test('tab Favorit hanya menampilkan produk favorit', async ({ page }) => {
    await page.goto('/kasir')
    const semua = await page.getByTestId('produk-kartu').count()
    await page.getByRole('tab', { name: 'Favorit' }).click()
    const fav = await page.getByTestId('produk-kartu').count()
    expect(fav).toBeGreaterThan(0)
    expect(fav).toBeLessThan(semua)
  })

  test('simpan pesanan (tahan transaksi) di toko lalu lanjutkan', async ({ page }) => {
    await page.goto('/kasir')
    await tambah(page, 'Aqua 600ml', 2)
    await page.getByRole('button', { name: 'Simpan Pesanan' }).click()
    await expect(page.getByText('Pesanan P-001 disimpan.')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name: /Pesanan/ })).toContainText('1')
    await page.goto('/pesanan')
    await expect(page.getByTestId('baris-pesanan')).toContainText('P-001')
    await page.getByRole('button', { name: 'Buka pesanan P-001' }).click()
    await expect(page.getByRole('textbox', { name: 'Jumlah Aqua 600ml' })).toHaveValue('2')
    await page.getByRole('button', { name: /^Bayar/ }).click()
    await page.getByRole('button', { name: 'Uang Pas' }).click()
    await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click()
    await expect(page).toHaveURL(/\/struk\//)
    await page.goto('/pesanan')
    await expect(page.getByText('Tidak ada pesanan terbuka')).toBeVisible()
  })

  test('cetak tagihan sementara sebelum bayar', async ({ page }) => {
    await page.addInitScript(() => { (window as unknown as { __p: number }).__p = 0; window.print = () => { (window as unknown as { __p: number }).__p++ } })
    await page.goto('/kasir')
    await tambah(page, 'Teh Pucuk')
    await page.getByRole('button', { name: 'Cetak Tagihan' }).click()
    await expect(page.getByRole('dialog').getByTestId('struk')).toContainText('belum dibayar')
    await page.getByRole('dialog').getByRole('button', { name: 'Cetak Tagihan' }).click()
    expect(await page.evaluate(() => (window as unknown as { __p: number }).__p)).toBe(1)
  })

  test('pilih pelanggan lewat dialog dan lepas lagi', async ({ page }) => {
    await page.goto('/kasir')
    await tambah(page, 'Aqua 600ml')
    await page.getByRole('button', { name: 'Tambah pelanggan' }).click()
    await page.getByLabel('Cari pelanggan').fill('Nadia')
    await page.getByRole('button', { name: /Nadia Putri/ }).click()
    await expect(page.getByRole('button', { name: /Pelanggan Nadia Putri/ })).toBeVisible()
    await page.getByRole('button', { name: 'Lepas pelanggan' }).click()
    await expect(page.getByRole('button', { name: 'Tambah pelanggan' })).toBeVisible()
  })
})

test.describe('Kategori produk', () => {
  test('tambah, ubah nama, dan hapus kategori; kategori berisi tidak bisa dihapus', async ({ page }) => {
    await page.goto('/produk')
    await page.getByRole('button', { name: 'Kelola Kategori' }).click()
    await page.getByLabel('Nama kategori baru').fill('Makanan')
    await page.getByRole('button', { name: 'Tambah', exact: true }).click()
    await expect(page.getByText('Kategori sudah ada.')).toBeVisible()
    await page.getByLabel('Nama kategori baru').fill('Frozen Food')
    await page.getByRole('button', { name: 'Tambah', exact: true }).click()
    await expect(page.getByTestId('daftar-kategori')).toContainText('Frozen Food')
    await page.getByRole('button', { name: 'Hapus kategori Minuman' }).click()
    await expect(page.getByText('Masih ada produk di kategori ini.')).toBeVisible()
    await page.getByRole('button', { name: 'Ubah nama Frozen Food' }).click()
    await page.getByLabel('Nama baru untuk Frozen Food').fill('Beku')
    await page.getByRole('button', { name: 'Simpan nama' }).click()
    await expect(page.getByTestId('daftar-kategori')).toContainText('Beku')
    await page.getByRole('button', { name: 'Hapus kategori Beku' }).click()
    await expect(page.getByTestId('daftar-kategori')).not.toContainText('Beku')
    await page.keyboard.press('Escape')
    await page.goto('/kasir')
    await expect(page.getByRole('tab', { name: 'Kebutuhan Harian' })).toBeVisible()
  })
})
