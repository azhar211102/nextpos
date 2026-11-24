# NEXTPOS — Design System

Aplikasi kasir dan back-office untuk **toko/sembako, kafe, dan restoran** (gaya ESB/Moka). Mode permukaan: **Operate** — keterbacaan angka, kecepatan, dan konsistensi mengalahkan ekspresi. Tidak ada kode, logo, aset, atau warna merek pihak lain yang disalin.

## Referensi dan apa yang diambil

Halaman produk Moka POS dilihat langsung (tangkapan layar tampilan kasir dan manajemen pesanan). Yang dipakai sebagai **pola**, bukan tampilan:

- Kasir: grid produk padat dengan foto kecil, nama di bawah, harga; panel pesanan di kanan.
- Panel pesanan: "Tambah Pelanggan", tipe pesanan, daftar item, **Simpan Pesanan / Cetak Tagihan**, satu tombol bayar besar.
- Tab Favorit / Katalog / Nominal Bebas.
- Manajemen pesanan, denah meja, detail pesanan, PIN karyawan, diskon dengan periode aktif.

## Warna: biru muda, tampilan putih, dengan mode gelap

Aksen **biru muda** (`#55AEF0`) dengan teks navy di atasnya (kontras tinggi; teks putih di atas biru muda tidak lolos AA). Latar putih dan abu kebiruan sangat muda. Semua warna berasal dari token di `src/index.css`; mode gelap hanya mengganti nilai token (kelas `.dark` pada `<html>`), tidak ada stylesheet kedua.

| Token | Terang | Gelap | Pemakaian |
|---|---|---|---|
| `--background` | `#F5F8FC` | `#0B1220` | latar halaman |
| `--card` | `#FFFFFF` | `#121B2D` | panel, tabel, sidebar |
| `--foreground` | `#0F1B33` | `#E7EDF6` | teks utama |
| `--muted-foreground` | `#566880` | `#98A6BA` | teks sekunder |
| `--primary` / `--primary-foreground` | `#55AEF0` / `#0B2A4A` | `#5DB1F0` / `#08223D` | tombol utama, penanda aktif |
| `--accent` | `#E1F0FD` | `#173352` | menu aktif, baris terpilih |
| `--sky` | `#0B62AD` | `#7CC0F5` | tautan dan teks aktif |
| `--border` | `#DFE6EF` | `#243148` | garis |
| status | hijau/kuning/merah tua | hijau/kuning/merah terang | hanya untuk makna |

Tombol tema (ikon bulan/matahari) ada di bilah atas dan header mobile; pilihan disimpan di browser. Logo diberi pelat putih di mode gelap karena gambarnya berlatar putih. Struk selalu putih. Verifikasi: axe-core WCAG 2.1 AA lulus di mode terang dan gelap.

## Agar terasa dibuat manusia

- Tata letak mengikuti kebiasaan kerja, bukan template: sidebar putih dengan kelompok bergaris, **bilah atas berisi nama outlet, jam, dan status absen**, bukan hero atau kartu seragam.
- Kasir padat dan fungsional: tile 5–6 kolom, stok hanya ditulis bila menipis/habis, tidak ada ikon dekoratif.
- Tidak ada: gradient, glow, glassmorphism, eyebrow huruf kapital, nomor seksi, kartu bersarang, empat kartu statistik berikon.
- Satu strip angka dengan pemisah garis untuk KPI; tabel apa adanya (baris 40–52px, header abu muda).
- Bahasa yang dipakai kasir sungguhan: "Simpan Pesanan", "Cetak Tagihan", "Tandai Siap", "Sudah Disajikan".

## Tipografi

**Plus Jakarta Sans Variable** (self-hosted), angka tabular. Judul halaman 24/700, judul panel 17/700, angka KPI 26/700, tabel 14, keterangan 12–13.

## Bentuk

Radius kontrol 6–8px, panel 10px, lencana penuh. Border 1px, bayangan nyaris tak terlihat. Ikon Lucide stroke 1,8. Gerak hanya menjawab tindakan (tekan = skala 0,97); `prefers-reduced-motion` dihormati.

## Struktur navigasi

Ringkasan · Kasir (POS) · Pesanan · *Meja* · *Dapur* | Produk · Inventaris · Transaksi | Laporan · Pelanggan · Promosi | Karyawan · Absensi | Pengaturan. *Meja* dan *Dapur* hanya untuk kafe/restoran. Menu disaring menurut hak akses karyawan aktif.

## Jenis usaha

`Pengaturan → Jenis Usaha` (Toko / Kafe / Restoran). Kafe dan restoran menambah: tipe pesanan (makan di tempat, bawa pulang, pesan antar), meja, pesanan ke dapur, catatan per item, biaya layanan (dihitung setelah diskon; pajak dihitung atas subtotal + layanan). Memilih jenis dapat sekaligus memasang katalog, meja, dan riwayat contoh yang sesuai.

## Struk

Kertas putih 80mm; `@media print` hanya menampilkan `.print-area`. Struk memuat tipe pesanan, meja, catatan item, dan layanan. "Cetak Tagihan" memakai struk yang sama bertanda "belum dibayar".
