/** Logo resmi NEXTPOS (gambar berlatar putih; di mode gelap diberi pelat putih agar terbaca). */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <img
      src="/logo.png"
      alt="NEXTPOS, Sistem Kasir & Penjualan"
      width={720}
      height={138}
      className={compact ? 'h-8 w-auto dark:rounded dark:bg-white dark:p-1' : 'h-auto w-full dark:rounded-md dark:bg-white dark:p-2'}
    />
  )
}
