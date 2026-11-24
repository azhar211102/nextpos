/** Memperkecil foto unggahan agar muat di LocalStorage (maks. 320px, JPEG). */
export async function fileToThumbnail(file: File, max = 320): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar.')
  if (file.size > 8 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 8 MB.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('Gambar tidak dapat dibaca.'))
      i.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.width * scale))
    c.height = Math.max(1, Math.round(img.height * scale))
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Gambar tidak dapat diproses.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}
