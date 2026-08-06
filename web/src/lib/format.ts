// Formatage fr-FR + helpers de date (portés de la PWA v1).

export const fmt = (n: number | string | null | undefined): string =>
  Math.round(Number(n) || 0).toLocaleString('fr-FR')

/** Nombre signé : +1 234 / −1 234 (tiret typographique). */
export const fmtS = (n: number | string | null | undefined): string => {
  const v = Number(n) || 0
  return (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v))
}

export const todayISO = (): string => new Date().toISOString().slice(0, 10)

export const frDate = (iso: string): string =>
  new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

export const frDateShort = (iso: string): string =>
  new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  })

export const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
