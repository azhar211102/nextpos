import { expect, test, type Page } from '@playwright/test'
import { angka, pilih, tambah, transaksiTunai } from './helpers'

async function masukSebagai(page: Page, nama: string, pin: string) {
  await page.getByRole('button', { name: /Ganti karyawan/ }).click()
  await page.getByRole('combobox', { name: 'Karyawan' }).click()
  await page.getByRole('option', { name: new RegExp(nama) }).click()
  await page.getByLabel('PIN').fill(pin)
  await page.getByRole('button', { name: 'Masuk' }).click()
}

test.describe('Laporan', () => {
  test('rentang cepat, validasi tanggal, dan KPI berubah', async ({ page }) => {
    await page.goto('/laporan')
    await expect(page.getByRole('heading', { name: 'Laporan', level: 1 })).toBeVisible()
    await page.getByRole('button', { name: '7 Hari' }).click()
    const tujuh = angka(await page.getByTestId('kpi-1').textContent())
    await page.getByRole('button', { name: '30 Hari' }).click()
    const tigapuluh = angka(await page.getByTestId('kpi-1').textContent())
    expect(tigapuluh).toBeGreaterThan(tujuh)
    await page.getByRole('button', { name: 'Hari Ini' }).click()
    await expect(page.getByText('Penjualan per Jam')).toBeVisible()
    await page.getByLabel('Dari tanggal').fill('2030-01-02')
    await page.getByLabel('Sampai tanggal').fill('2030-01-01')
    await expect(page.getByText('Tanggal awal tidak boleh setelah tanggal akhir.')).toBeVisible()
    await page.getByRole('button', { name: '30 Hari' }).click()
    await expect(page.getByTestId('tabel-terlaris').locator('tbody tr').first()).toBeVisible()
  })

  test('unduh CSV', async ({ page }) => {
    await page.goto('/laporan')
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Unduh CSV' }).click()
    expect((await dl).suggestedFilename()).toMatch(/^laporan-penjualan-\d{4}-\d{2}-\d{2}-sd-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})

test.describe('Pelanggan', () => {
  test('tambah dengan validasi, profil, riwayat, dan pilih di kasir', async ({ page }) => {
    await page.goto('/pelanggan')
    await page.getByRole('button', { name: 'Tambah Pelanggan' }).click()
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Nama pelanggan wajib diisi.')).toBeVisible()
    await page.getByLabel('Nama', { exact: true }).fill('Toko Sinar')
    await page.getByLabel('Email').fill('salah')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Format email tidak valid.')).toBeVisible()
    await page.getByLabel('Email').fill('sinar@contoh.id')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Toko Sinar berhasil ditambahkan.')).toBeVisible()

    await page.getByLabel('Cari pelanggan').fill('Warung Bu Sri')
    await page.getByRole('button', { name: 'Lihat profil Warung Bu Sri' }).click()
    await expect(page.getByTestId('riwayat-pelanggan')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByLabel('Cari pelanggan').fill('Toko Sinar')
    await page.getByRole('button', { name: 'Lihat profil Toko Sinar' }).click()
    await expect(page.getByText('Belum ada pembelian yang dikaitkan')).toBeVisible()
    await page.getByRole('button', { name: 'Pilih di Kasir' }).click()
    await expect(page).toHaveURL(/\/kasir$/)
    await expect(page.getByRole('button', { name: /Pelanggan Toko Sinar/ })).toBeVisible()
    await tambah(page, 'Aqua 600ml')
    await page.getByRole('button', { name: /^Bayar/ }).click()
    await page.getByRole('button', { name: 'Uang Pas' }).click()
    await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click()
    await expect(page.getByTestId('struk')).toContainText('Toko Sinar')

    await page.goto('/pelanggan')
    await page.getByLabel('Cari pelanggan').fill('Toko Sinar')
    await page.getByRole('button', { name: 'Lihat profil Toko Sinar' }).click()
    await expect(page.getByTestId('riwayat-pelanggan').locator('li')).toHaveCount(1)
  })

  test('hapus pelanggan', async ({ page }) => {
    await page.goto('/pelanggan')
    await page.getByLabel('Cari pelanggan').fill('Agus')
    await page.getByRole('button', { name: 'Lihat profil Agus Prasetyo' }).click()
    await page.getByRole('button', { name: 'Hapus', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Hapus' }).click()
    await expect(page.getByText('Tidak ada pelanggan yang cocok')).toBeVisible()
  })
})

test.describe('Karyawan, PIN, dan hak akses', () => {
  test('tambah karyawan dengan validasi PIN', async ({ page }) => {
    await page.goto('/karyawan')
    await page.getByRole('button', { name: 'Tambah Karyawan' }).click()
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Nama karyawan wajib diisi.')).toBeVisible()
    await expect(page.getByText('PIN wajib diisi untuk karyawan baru.')).toBeVisible()
    await page.getByLabel('Nama', { exact: true }).fill('Tono Wijaya')
    await page.getByLabel('PIN').fill('12')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('PIN harus 4–6 digit angka.')).toBeVisible()
    await page.getByLabel('PIN').fill('4321')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Tono Wijaya berhasil ditambahkan.')).toBeVisible()
    await expect(page.getByTestId('baris-karyawan')).toHaveCount(5)
  })

  test('pemilik terakhir tidak bisa dihapus atau dinonaktifkan', async ({ page }) => {
    await page.goto('/karyawan')
    await page.getByRole('button', { name: 'Hapus Bambang Susilo' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Hapus' }).click()
    await expect(page.getByText('Tidak bisa menghapus akun yang sedang dipakai.')).toBeVisible()
  })

  test('ganti ke Kasir: PIN salah ditolak, menu dan halaman dibatasi', async ({ page }) => {
    await page.goto('/')
    await masukSebagai(page, 'Dewi Lestari', '9999')
    await expect(page.getByText('PIN salah. Coba lagi.')).toBeVisible()
    await page.getByLabel('PIN').fill('1111')
    await page.getByRole('button', { name: 'Masuk' }).click()
    await expect(page.getByText('Masuk sebagai Dewi Lestari.')).toBeVisible()
    const nav = page.getByRole('navigation', { name: 'Navigasi utama' })
    await expect(nav.getByRole('link', { name: 'Kasir (POS)' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Laporan' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Karyawan' })).toHaveCount(0)
    await page.goto('/laporan')
    await expect(page.getByText('Akses ditolak')).toBeVisible()
    await page.goto('/')
    await expect(page).toHaveURL(/\/kasir$/) // diarahkan ke halaman pertama yang boleh dibuka
    // transaksi baru tercatat atas nama kasir ini
    await tambah(page, 'Aqua 600ml')
    await page.getByRole('button', { name: /^Bayar/ }).click()
    await page.getByRole('button', { name: 'Uang Pas' }).click()
    await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click()
    await expect(page.getByTestId('struk')).toContainText('Dewi Lestari')
    // data peran tetap setelah muat ulang
    await page.reload()
    await expect(page.getByRole('button', { name: /Karyawan aktif Dewi Lestari/ })).toBeVisible()
  })

  test('Kasir tidak punya tombol refund', async ({ page }) => {
    await page.goto('/')
    await masukSebagai(page, 'Dewi Lestari', '1111')
    await page.goto('/transaksi')
    await page.getByRole('button', { name: /Lihat detail/ }).first().click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Cetak Ulang Struk' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Refund', exact: true })).toHaveCount(0)
  })
})

test.describe('Promosi', () => {
  test('tambah promo dengan validasi periode, ubah status, hapus', async ({ page }) => {
    await page.goto('/promosi')
    await expect(page.getByTestId('baris-promo')).toHaveCount(4)
    await page.getByRole('button', { name: 'Tambah Promo' }).click()
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Nama promo wajib diisi.')).toBeVisible()
    await expect(page.getByText('Nilai diskon harus lebih dari 0.')).toBeVisible()
    await page.getByLabel('Nama Promo').fill('Diskon Pelajar')
    await page.getByLabel('Nilai Diskon').fill('150')
    await page.getByLabel('Berakhir').fill('2020-01-01')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Diskon persen maksimal 100%.')).toBeVisible()
    await expect(page.getByText('Tanggal berakhir tidak boleh sebelum tanggal mulai.')).toBeVisible()
    await page.getByLabel('Nilai Diskon').fill('5')
    await page.getByLabel('Berakhir').fill('2099-12-31')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Diskon Pelajar berhasil ditambahkan.')).toBeVisible()
    await expect(page.getByTestId('baris-promo')).toHaveCount(5)
    await page.getByRole('switch', { name: 'Aktifkan Diskon Pelajar' }).click()
    await expect(page.getByTestId('baris-promo').first()).toContainText('Nonaktif')
    await page.getByRole('button', { name: 'Hapus Diskon Pelajar' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Hapus' }).click()
    await expect(page.getByTestId('baris-promo')).toHaveCount(4)
  })

  test('promo di kasir: hanya yang berlaku dan memenuhi minimum; total dan struk benar', async ({ page }) => {
    await page.goto('/kasir')
    await tambah(page, 'Aqua 600ml') // 4.000 — di bawah semua minimum
    await page.getByRole('button', { name: /Diskon & Promo/ }).click()
    await page.getByRole('combobox', { name: 'Promo' }).click()
    await expect(page.getByRole('option', { name: /Diskon Belanja Hemat/ })).toHaveCount(0)
    await page.keyboard.press('Escape')
    if (await page.getByRole('dialog').count()) await page.getByRole('button', { name: 'Selesai' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await tambah(page, 'Gula Pasir 1 Kg', 3) // 4.000 + 52.500 = 56.500
    await page.getByRole('button', { name: /Diskon & Promo/ }).click()
    await page.getByRole('combobox', { name: 'Promo' }).click()
    await expect(page.getByRole('option', { name: /Promo Akhir Tahun Lalu/ })).toHaveCount(0) // sudah berakhir
    await expect(page.getByRole('option', { name: /Promo Gajian/ })).toHaveCount(0) // belum mulai
    await page.getByRole('option', { name: /Diskon Belanja Hemat 10%/ }).click()
    await expect(page.getByTestId('diskon-nilai')).toHaveText('- Rp 5.650')
    await expect(page.getByTestId('total')).toHaveText('Rp 56.444') // 50.850 + 11% (5.593,5 dibulatkan naik)
    await page.getByRole('button', { name: 'Selesai' }).click()
    await page.getByRole('button', { name: /^Bayar/ }).click()
    await page.getByRole('button', { name: 'Uang Pas' }).click()
    await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click()
    await expect(page.getByTestId('struk')).toContainText('Diskon Belanja Hemat 10%')
  })

  test('promo gugur bila belanja turun di bawah minimum', async ({ page }) => {
    await page.goto('/kasir')
    await tambah(page, 'Gula Pasir 1 Kg', 3) // 52.500
    await page.getByRole('button', { name: /Diskon & Promo/ }).click()
    await pilih(page, 'Promo', /Diskon Belanja Hemat/)
    await page.getByRole('button', { name: 'Selesai' }).click()
    await page.getByRole('button', { name: 'Kurangi jumlah Gula Pasir 1 Kg' }).click() // 35.000 < 50.000
    await expect(page.getByText(/Promo butuh belanja minimal/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Bayar/ })).toBeDisabled()
  })
})

test.describe('Refund dan inventaris', () => {
  test('refund: validasi alasan, status berubah, stok kembali, tidak dihitung sebagai penjualan', async ({ page }) => {
    await transaksiTunai(page, 'Teh Pucuk', 2, '20000') // stok 64 → 62
    const id = (await page.getByText(/^TRX-\d{6}-\d{4}$/).first().textContent())!.trim()
    await page.goto('/produk')
    await page.getByLabel('Cari produk').fill('Teh Pucuk')
    await expect(page.getByTestId('baris-produk').first()).toContainText('62')

    await page.goto('/transaksi')
    await page.getByLabel('Cari transaksi').fill(id)
    await page.getByRole('button', { name: `Lihat detail ${id}` }).click()
    await page.getByRole('button', { name: 'Refund', exact: true }).click()
    await page.getByRole('button', { name: 'Konfirmasi Refund' }).click()
    await expect(page.getByText('Alasan refund wajib diisi.')).toBeVisible()
    await page.getByLabel('Alasan refund').fill('Barang rusak')
    await page.getByRole('button', { name: 'Konfirmasi Refund' }).click()
    await expect(page.getByTestId('info-refund')).toContainText('Barang rusak')
    await expect(page.getByRole('button', { name: 'Refund', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Tutup' }).click()
    await expect(page.getByTestId('baris-transaksi').first()).toContainText('Dikembalikan')

    await page.goto('/produk')
    await page.getByLabel('Cari produk').fill('Teh Pucuk')
    await expect(page.getByTestId('baris-produk').first()).toContainText('64')
    await page.goto('/inventaris')
    await page.getByRole('tab', { name: 'Riwayat Perubahan' }).click()
    await expect(page.getByTestId('baris-riwayat-stok').first()).toContainText('Pengembalian')

    await page.goto('/laporan')
    await page.getByRole('button', { name: 'Hari Ini' }).click()
    await expect(page.getByTestId('refund-total')).not.toHaveText('- Rp 0')
  })

  test('stok masuk dan stok keluar tercatat dengan jenis yang benar', async ({ page }) => {
    await page.goto('/inventaris')
    await page.getByLabel('Cari inventaris').fill('Sabun Mandi')
    await page.getByRole('button', { name: 'Sesuaikan stok Sabun Mandi' }).click()
    await page.getByRole('radio', { name: 'Stok Keluar' }).click()
    await page.getByLabel('Jumlah', { exact: true }).fill('5')
    await page.getByLabel('Catatan').fill('Rusak')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await page.getByRole('button', { name: 'Sesuaikan stok Sabun Mandi' }).click()
    await page.getByRole('radio', { name: 'Stok Masuk' }).click()
    await page.getByLabel('Jumlah', { exact: true }).fill('20')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await page.getByRole('tab', { name: 'Riwayat Perubahan' }).click()
    const rows = page.getByTestId('baris-riwayat-stok')
    await expect(rows.nth(0)).toContainText('Stok Masuk')
    await expect(rows.nth(1)).toContainText('Stok Keluar')
    await expect(rows.nth(1)).toContainText('Rusak')
  })
})
