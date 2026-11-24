import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { tambah } from './helpers'

test.describe('Tema terang dan gelap', () => {
  test('default terang; tombol mengganti ke gelap, bertahan setelah muat ulang, dan bisa kembali', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    await expect(html).not.toHaveClass(/dark/)
    await page.getByRole('button', { name: 'Ganti ke mode gelap' }).click()
    await expect(html).toHaveClass(/dark/)
    await expect(page.getByRole('button', { name: 'Ganti ke mode terang' })).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(html).toHaveClass(/dark/)
    expect(await page.evaluate(() => localStorage.getItem('nextpos:theme'))).toBe('dark')
    await page.getByRole('button', { name: 'Ganti ke mode terang' }).click()
    await expect(html).not.toHaveClass(/dark/)
  })

  test('warna latar benar-benar berubah dan aksen berupa biru muda', async ({ page }) => {
    await page.goto('/kasir')
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const terang = await bg()
    await page.getByRole('button', { name: 'Ganti ke mode gelap' }).click()
    const gelap = await bg()
    expect(terang).not.toBe(gelap)
    const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim())
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(primary.slice(i, i + 2), 16))
    expect(b).toBeGreaterThan(r + 60) // dominan biru
    expect(b).toBeGreaterThan(g)
  })

  test('mobile: tombol tema ada di header', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Ganti ke mode gelap' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  for (const path of ['/', '/kasir', '/transaksi', '/laporan', '/absensi', '/produk', '/pengaturan']) {
    test(`aksesibilitas mode gelap: ${path}`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('nextpos:theme', 'dark'))
      await page.goto(path)
      await page.waitForTimeout(500)
      await expect(page.locator('html')).toHaveClass(/dark/)
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
    })
  }

  test('aksesibilitas mode gelap: pembayaran dan struk', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nextpos:theme', 'dark'))
    await page.goto('/kasir')
    await tambah(page, 'Aqua 600ml')
    await page.getByRole('button', { name: /^Bayar/ }).click()
    await page.getByLabel('Jumlah uang diterima').fill('1000')
    const check = async () => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
    expect(await check()).toEqual([])
    await page.getByRole('button', { name: 'Uang Pas' }).click()
    await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click()
    await expect(page.getByTestId('struk')).toBeVisible()
    expect(await check()).toEqual([])
  })
})
