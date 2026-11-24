import type { ReactNode } from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@/types'

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-bold">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

export function Panel({
  title, action, children, className, bodyClassName,
}: { title?: string; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('surface flex min-w-0 flex-col', className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 pt-[18px]">
          <h2 className="text-[17px] font-bold">{title}</h2>
          {action}
        </div>
      )}
      <div className={cn('min-h-0 flex-1 p-5', title && 'pt-3.5', bodyClassName)}>{children}</div>
    </section>
  )
}

export interface Option<T extends string> {
  value: T
  label: string
}

/** Select sederhana: label tampil benar di pemicu (Base UI membutuhkan `items`). */
export function SimpleSelect<T extends string>({
  value, onChange, options, className, ariaLabel, size = 'default', id,
}: {
  value: T
  onChange: (v: T) => void
  options: Option<T>[]
  className?: string
  ariaLabel?: string
  size?: 'sm' | 'default'
  id?: string
}) {
  return (
    <Select items={options} value={value} onValueChange={(v) => v != null && onChange(v as T)}>
      <SelectTrigger id={id} size={size} aria-label={ariaLabel} className={cn('h-10 min-w-36 rounded-md bg-card px-3 text-sm', size === 'sm' && 'h-9', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-lg bg-secondary text-muted-foreground">{icon}</div>
      <div>
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = 'Konfirmasi', destructive, onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? 'bg-destructive text-white hover:bg-destructive/85' : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const METHOD_STYLE: Record<PaymentMethod, string> = {
  Tunai: 'bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900',
  QRIS: 'bg-foreground text-background border-foreground',
  Kartu: 'bg-secondary text-foreground/80 border-input',
}
export function MethodBadge({ method }: { method: PaymentMethod }) {
  return (
    <span className={cn('inline-flex h-6 min-w-[68px] items-center justify-center rounded-full border px-3 text-xs font-semibold', METHOD_STYLE[method])}>
      {method}
    </span>
  )
}

const TONES = {
  green: 'bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900',
  amber: 'bg-yellow-50 dark:bg-yellow-950/50 text-yellow-900 dark:text-yellow-300 border-yellow-200',
  red: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900',
  blue: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-900',
  slate: 'bg-secondary text-foreground/80 border-input',
} as const

export function Pill({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return <span className={cn('inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap', TONES[tone])}>{children}</span>
}

export function StockBadge({ stock, min }: { stock: number; min: number }) {
  if (stock <= 0) return <Pill tone="red">Habis</Pill>
  if (stock <= min) return <Pill tone="amber">Menipis</Pill>
  return <Pill tone="green">Tersedia</Pill>
}
