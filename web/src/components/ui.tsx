import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}
export function Button({ variant = 'primary', className = '', ...p }: BtnProps) {
  const base =
    'w-full rounded-xl px-4 py-3 text-[15px] font-bold transition active:scale-[.99] disabled:opacity-50 disabled:pointer-events-none'
  const styles: Record<string, string> = {
    primary: 'bg-brand text-white',
    ghost: 'bg-surface text-ink1 border border-grid',
    danger: 'bg-crit text-white',
  }
  return <button className={`${base} ${styles[variant]} ${className}`} {...p} />
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block mb-3">
      <span className="block text-[13px] font-semibold text-ink2 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink3 mt-1">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full rounded-[10px] border border-grid bg-page text-ink1 px-3 py-3 text-[15px] outline-none focus:border-brand'

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputCls} ${p.className ?? ''}`} {...p} />
}
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${inputCls} ${p.className ?? ''}`} {...p} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-grid rounded-2xl p-4 ${className}`}>{children}</div>
  )
}

export function Tile({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: ReactNode
  unit?: string
  tone?: 'neg' | 'pos' | 'brand'
}) {
  const color = tone === 'neg' ? 'text-crit' : tone === 'pos' ? 'text-good-text' : ''
  return (
    <div
      className={`bg-surface border rounded-2xl p-3 ${tone === 'brand' ? 'border-brand bg-brand-soft' : 'border-grid'}`}
    >
      <div className={`text-[10.5px] font-bold tracking-wide mb-1 ${tone === 'brand' ? 'text-brand' : 'text-ink3'}`}>
        {label}
      </div>
      <div className={`text-[19px] font-extrabold leading-tight ${color}`}>{value}</div>
      {unit && <div className="text-[11px] text-ink2 font-semibold">{unit}</div>}
    </div>
  )
}

const chipMap: Record<string, { cls: string; label: string }> = {
  ok: { cls: 'bg-brand-soft text-good-text', label: '✔ Conforme' },
  warn: { cls: 'bg-[#fff4d6] text-[#8a6100]', label: '⚠ À surveiller' },
  crit: { cls: 'bg-[#fde2e2] text-crit', label: '✖ Écart important' },
  wait: { cls: 'bg-grid text-ink2', label: '⏳ En attente' },
}
export function Chip({ statut }: { statut: string }) {
  const c = chipMap[statut] ?? chipMap.wait
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${c.cls}`}>
      {c.label}
    </span>
  )
}
