import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'

/** Ganti tampilan terang/gelap. Pilihan diingat di browser ini. */
export function ThemeToggle() {
  const [theme, toggle] = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
      title={dark ? 'Mode terang' : 'Mode gelap'}
      className="press grid size-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  )
}
