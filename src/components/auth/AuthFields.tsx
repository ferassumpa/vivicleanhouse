'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import {
  ButtonHTMLAttributes,
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  useState,
} from 'react'

export function Field({
  label,
  hint,
  error,
  rightSlot,
  children,
}: {
  label: string
  hint?: string
  error?: string
  rightSlot?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {rightSlot}
      </div>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-[var(--danger)]">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  invalid?: boolean
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ icon, invalid, className = '', ...props }, ref) => (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        {...props}
        className={`w-full rounded-2xl border bg-slate-50 py-3 text-sm text-[var(--navy)] outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
          icon ? 'pl-11 pr-4' : 'px-4'
        } ${
          invalid
            ? 'border-orange-300 focus:border-orange-400 focus:ring-orange-100'
            : 'border-slate-200 focus:border-[var(--teal)] focus:ring-teal-100'
        } ${className}`}
      />
    </div>
  )
)
TextInput.displayName = 'TextInput'

export function PasswordInput({
  icon,
  invalid,
  className = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  icon?: ReactNode
  invalid?: boolean
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
      )}
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`w-full rounded-2xl border bg-slate-50 py-3 pr-12 text-sm text-[var(--navy)] outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
          icon ? 'pl-11' : 'pl-4'
        } ${
          invalid
            ? 'border-orange-300 focus:border-orange-400 focus:ring-orange-100'
            : 'border-slate-200 focus:border-[var(--teal)] focus:ring-teal-100'
        } ${className}`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function PrimaryButton({
  loading,
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  variant?: 'primary' | 'secondary'
}) {
  const base =
    'group relative inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60'
  const variants = {
    primary:
      'bg-[var(--navy)] text-white shadow-[0_10px_25px_-12px_rgba(12,42,38,0.5)] hover:bg-[#163f39] active:scale-[0.98]',
    secondary:
      'border border-slate-200 bg-white text-[var(--navy)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]',
  }

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

export function Alert({
  kind,
  children,
}: {
  kind: 'error' | 'success' | 'info'
  children: ReactNode
}) {
  const styles = {
    error: 'border-orange-200 bg-orange-50 text-[var(--danger)]',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border-teal-200 bg-teal-50 text-[var(--teal-dark)]',
  }
  const Icon = kind === 'success' ? CheckCircle2 : AlertCircle

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm ${styles[kind]}`}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">{children}</div>
      </motion.div>
    </AnimatePresence>
  )
}
