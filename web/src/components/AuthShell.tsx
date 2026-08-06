import type { ReactNode } from 'react'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen max-w-[520px] mx-auto px-4 pt-10 pb-12">
      <div className="text-center mb-4">
        <div className="text-5xl">⛽</div>
        <h1 className="text-4xl font-extrabold mt-1">Taji</h1>
        <p className="text-ink2 mt-2 leading-snug">
          La gestion claire de vos stations-service.
          <br />
          Pompes · Cuves · Caisse · Écarts
        </p>
      </div>
      <div className="bg-surface border border-grid rounded-2xl p-4 mt-3.5">{children}</div>
    </div>
  )
}
