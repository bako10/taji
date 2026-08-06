import type { Tables } from './database.types'
import { todayISO } from './format'

type Price = Tables<'prices'>

/** Dernier prix de vente en vigueur à une date (prix historisés). */
export function latestPrice(prices: Price[], orgId: string, product: string, day?: string): number | null {
  const d = day || todayISO()
  const rows = prices
    .filter((p) => p.org_id === orgId && p.product === product && p.effective_date <= d)
    .sort((a, b) => (a.effective_date < b.effective_date ? 1 : -1))
  return rows[0]?.price_fcfa ?? null
}

/** Dernier prix d'achat connu (ignore les lignes sans prix d'achat) — pour la marge. */
export function latestBuyPrice(
  prices: Price[],
  orgId: string,
  product: string,
  day?: string,
): number | null {
  const d = day || todayISO()
  const rows = prices
    .filter(
      (p) =>
        p.org_id === orgId && p.product === product && p.effective_date <= d && p.buy_price_fcfa != null,
    )
    .sort((a, b) => (a.effective_date < b.effective_date ? 1 : -1))
  return rows[0]?.buy_price_fcfa ?? null
}
