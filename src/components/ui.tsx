import { STATUS_LABELS, type CleaningStatus } from '@/lib/types'

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick()
            }
          : undefined
      }
      className={`rounded-2xl border border-[var(--line)] bg-white/95 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] ${className}`}
    >
      {children}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}) {
  const styles = {
    primary: 'bg-[var(--navy)] text-white hover:bg-[#163f39]',
    secondary: 'bg-[var(--soft)] text-[var(--ink)] hover:bg-[var(--line)]',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'bg-transparent text-[var(--muted)] hover:bg-[var(--soft)]',
  }[variant]

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none ring-[var(--teal)] transition focus:ring-2 ${props.className || ''}`}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2 ${props.className || ''}`}
    />
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none ring-[var(--teal)] focus:ring-2 ${props.className || ''}`}
    />
  )
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
      {children}
    </label>
  )
}

export function StatusBadge({ status }: { status: CleaningStatus }) {
  const colors: Record<CleaningStatus, string> = {
    requested: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-sky-100 text-sky-800',
    in_progress: 'bg-teal-100 text-teal-800',
    done: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-slate-200 text-slate-600',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/60 px-4 py-12 text-center text-sm text-[var(--muted)]">
      {text}
    </div>
  )
}
