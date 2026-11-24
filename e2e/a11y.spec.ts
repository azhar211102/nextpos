import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { tambah } from './helpers'

const PAGES = ['/', '/kasir', '/pesanan', '/produk', '/inventaris', '/transaksi', '/laporan', '/pelanggan', '/karyawan', '/absensi', '/promosi', '/pengaturan']

for (const path of PAGES) {
  test(`aksesibilitas WCAG AA: ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForTimeout(500)
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
  })
}

test('aksesibilitas: pembayaran, QRIS, struk, dialog', async ({ page }) => {
  await page.goto('/kasir')
  await tambah(page, 'Aqua 600ml')
  await page.getByRole('button', { name: /^Bayar/ }).click()
  const check = async () => {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
  }
  await page.getByLabel('Jumlah uang diterima').fill('1000')
  expect(await check()).toEqual([])
  await page.getByRole('radio', { name: /QRIS/ }).click()
  await page.getByRole('button', { name: 'Lanjut ke QRIS' }).click()
  expect(await check()).toEqual([])
  await page.getByRole('button', { name: 'Simulasikan Pembayaran Diterima' }).click()
  await expect(page.getByTestId('struk')).toBeVisible()
  expect(await check()).toEqual([])
  await page.goto('/produk')
  await page.getByRole('button', { name: 'Tambah Produk' }).click()
  expect(await check()).toEqual([])
})
