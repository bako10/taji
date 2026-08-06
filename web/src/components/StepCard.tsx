import { useState, type ReactNode } from 'react'

export function StepCard({
  num,
  title,
  hint,
  done,
  defaultOpen,
  children,
}: {
  num: number
  title: string
  hint?: string
  done?: boolean
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="bg-surface border border-grid rounded-2xl mb-3 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3.5 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-[13px] font-bold ${
            done ? 'bg-brand text-white' : 'bg-grid text-ink2'
          }`}
        >
          {done ? '✓' : num}
        </span>
        <span className="flex-1 font-bold text-[15px]">{title}</span>
        {hint && <span className="text-[12px] text-ink3">{hint}</span>}
        <span className="text-ink3">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="p-3.5 pt-0">{children}</div>}
    </div>
  )
}
