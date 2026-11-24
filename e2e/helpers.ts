import { expect, type Page } from '@playwright/test'

export async function pilih(page: Page, trigger: string | RegExp, option: string | RegExp) {
  await page.getByRole('combobox', { name: trigger }).click()
  await page.getByRole('option', { name: option }).click()
}

export async function tambah(page: Page, nama: string, kali = 1) {
  for (let i = 0; i < kali; i++) await page.getByRole('button', { name: `Tambah ${nama} ke keranjang` }).click()
}

export async function transaksiTunai(page: Page, nama: string, kali: number, uang: string) {
  await page.goto('/kasir')
  await tambah(page, nama, kali)
  await page.getByRole('button', { name: /^Bayar/ }).click()
  await page.getByLabel('Jumlah uang diterima').fill(uang)
  await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click()
  await expect(page).toHaveURL(/\/struk\/TRX-/)
}

export const angka = (s: string | null) => Number((s ?? '').replace(/[^\d]/g, ''))

export async function bukaDiskon(page: Page) {
  await page.getByRole('button', { name: /Diskon & Promo|Diskon manual|Potongan|Tambah$/ }).first().click()
}
export async function tutupDiskon(page: Page) {
  await page.getByRole('button', { name: 'Selesai' }).click()
}
export const hariIni = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
