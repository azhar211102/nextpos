# NEXTPOS — Sistem Kasir & Penjualan

Aplikasi kasir (POS) dan back-office untuk **toko/sembako, kafe, dan restoran**, seluruh antarmuka berbahasa Indonesia. **Frontend-only**: semua data tersimpan di LocalStorage browser.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm run lint
npx playwright install chromium   # sekali saja
npm test           # 77 uji E2E + aksesibilitas (terang dan gelap)
```

## Modul

| Menu | Isi |
|---|---|
| Ringkasan | angka penjualan harian, grafik per jam, produk terlaris, stok perlu perhatian |
| Kasir (POS) | tab Favorit/Katalog/Nominal Bebas, cari/scan barcode, pelanggan, tipe pesanan & meja, catatan item, diskon & promo, layanan, pajak, **Simpan Pesanan**, **Cetak Tagihan** |
| Pembayaran | Tunai (uang cepat, kembalian), Kartu dan QRIS (simulasi), struk 80 mm |
| Pesanan | pesanan tersimpan (di toko: transaksi ditahan); buka lagi, tambah item, bayar, batalkan |
| Meja *(kafe/resto)* | denah per area, status kosong/terisi, kelola meja |
| Dapur *(kafe/resto)* | tiket Baru → Diproses → Siap → Disajikan, dengan catatan item |
| Produk | CRUD, foto, SKU, barcode, favorit, **kelola kategori** |
| Inventaris | Stok Masuk, Stok Keluar, Penyesuaian, riwayat |
| Transaksi | cari, filter, detail, cetak ulang, refund (simulasi) |
| Laporan | rentang tanggal, grafik, rincian, produk terlaris, per metode/kasir, CSV |
| Pelanggan | profil dan riwayat pembelian |
| Promosi | diskon, minimum belanja, periode berlaku |
| Karyawan | akun, PIN, peran, hak akses |
| **Absensi** | absen masuk/pulang dengan PIN, siapa yang bertugas, riwayat, rekap (hadir, jam, terlambat, tidak hadir), koreksi manual, CSV |
| Pengaturan | **jenis usaha** (tombol mode terang/gelap ada di bilah atas), toko, pajak, biaya layanan, jam kerja, struk, data |

PIN contoh: Pemilik 1234 · Kasir 1111 · Manajer 2222 · Staf Gudang 3333.

## Struktur

```
src/
  components/   Cart, Receipt, ProductForm, CategoryManager, SwitchEmployee, ProductArt, common, layout/AppShell, ui/ (shadcn)
  pages/        Dashboard, Pos, Payment, ReceiptPage, Orders, Tables, Kitchen, Products, Inventory, Transactions,
                Reports, Customers, Promotions, Employees, Attendance, SettingsPage
  store/        useStore.ts  (Zustand + persist ke LocalStorage, migrasi versi)
  lib/          calc, attendance, format (id-ID), ids, promo, pin, csv, seed, stats, storage, images
  hooks/        useMoney, useCartTotals, useData, useMediaQuery
e2e/            Playwright: nextpos, redesign, fnb, a11y
```

## Keterbatasan (penting)

- Data **hanya** ada di browser dan perangkat ini; tidak tersinkron, tidak ada server/database.
- **Absensi** memakai jam perangkat dan PIN. Tidak ada foto, lokasi, atau verifikasi biometrik, dan perangkat yang jamnya diubah akan mencatat jam yang salah. Cocok untuk satu terminal bersama di toko, bukan sebagai bukti kehadiran yang tahan manipulasi.
- **PIN dan hak akses bukan keamanan sungguhan** (hash PIN ada di LocalStorage).
- **Dapur dan meja hanya bekerja di perangkat yang sama.** Tidak ada layar dapur terpisah di perangkat lain, karena tidak ada server untuk menyinkronkan pesanan antarperangkat. Layar Dapur dibuka di tab/perangkat yang sama dengan kasir.
- Stok dipotong saat **pembayaran**, bukan saat pesanan disimpan, sehingga pesanan terbuka tidak mencadangkan stok.
- Tidak ada: split bill, gabung/pindah meja, modifier berharga (hanya catatan teks), integrasi GoFood/GrabFood, printer ESC/POS atau laci kas, pesanan antar dengan alamat/ongkir.
- Pembayaran Kartu/QRIS dan refund adalah simulasi; tidak ada uang atau data kartu yang diproses.
- Riwayat penjualan 30 hari, pelanggan, karyawan, absensi, dan promo awal adalah **data contoh**; kembalikan/hapus lewat Pengaturan → Data.
- Gambar produk bawaan adalah ilustrasi SVG; unggah foto sendiri di form produk (disimpan di LocalStorage, kuota ±5 MB).
- Pajak dan biaya layanan dihitung eksklusif, dibulatkan ke rupiah penuh.

Dokumen desain: [DESIGN.md](./DESIGN.md).
