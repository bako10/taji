// Cœur de la réconciliation — fonction PURE (aucun accès réseau), donc testable.
// computeDay() prépare les données (baseline + jours intermédiaires) puis appelle reconcile().
import { PRODUITS } from './constants'
import { latestPrice, latestBuyPrice } from './prices'
import type { Tables } from './database.types'

type Price = Tables<'prices'>
type Tank = Tables<'tanks'>
type Nozzle = Tables<'nozzles'>
type Reading = Pick<Tables<'nozzle_readings'>, 'nozzle_id' | 'opening_index' | 'closing_index' | 'staff_id'>
type Dip = Pick<Tables<'tank_dips'>, 'tank_id' | 'dip_l'>
type Delivery = Pick<Tables<'deliveries'>, 'tank_id' | 'volume_invoiced_l' | 'volume_received_l'>
type Cash = Pick<Tables<'cash_entries'>, 'method' | 'amount_fcfa'>
type Expense = Pick<Tables<'expenses'>, 'amount_fcfa'>

export type Ligne = {
  produit: string
  ventes: number
  prix: number
  prixAchat: number | null
  marge: number | null
  ca: number
  stockAttendu: number
  jauge: number | null
  ecart: number
  livraisons: number
}

export type Summary = {
  ventesL: number
  caTheo: number
  enc: number
  encParMode: Record<string, number>
  ecartCaisse: number
  ecartCuve: number
  margeBrute: number | null
  depenses: number
  margeNette: number | null
  margeDispo: boolean
  lignes: Ligne[]
  parPompiste: Record<string, number>
  readingsOk: boolean
  dipsOk: boolean
  cashOk: boolean
  complet: boolean
  statut?: string
}

export type ReconcileInput = {
  orgId: string
  day: string
  tanks: Tank[]
  nozzles: Nozzle[]
  readings: Reading[]
  dips: Dip[]
  deliveries: Delivery[]
  cash: Cash[]
  expenses: Expense[]
  prices: Price[]
  /** Stock de départ par cuve. */
  baseline: Record<string, { stock: number; sinceDay: string | null }>
  /** Ventes/livraisons des jours intermédiaires non jaugés, par cuve (0 si aucun). */
  inter: Record<string, { ventes: number; livr: number }>
}

export function reconcile(inp: ReconcileInput): Summary {
  const { tanks, nozzles, readings, dips, deliveries, cash, expenses, prices, baseline, inter } = inp

  const readingsOk =
    nozzles.length > 0 &&
    nozzles.every((n) => readings.some((r) => r.nozzle_id === n.id && r.closing_index != null))
  const dipsOk = tanks.length > 0 && tanks.every((t) => dips.some((d) => d.tank_id === t.id))
  const cashOk = cash.length > 0

  const parCuve: Record<string, number> = {}
  tanks.forEach((t) => (parCuve[t.id] = 0))
  const parPompiste: Record<string, number> = {}
  nozzles.forEach((n) => {
    const r = readings.find((x) => x.nozzle_id === n.id)
    if (!r || r.closing_index == null) return
    const v = Math.max(0, Number(r.closing_index) - Number(r.opening_index))
    if (n.tank_id in parCuve) parCuve[n.tank_id] += v
    if (r.staff_id) parPompiste[r.staff_id] = (parPompiste[r.staff_id] || 0) + v
  })

  let ventesL = 0,
    caTheo = 0,
    ecartCuve = 0,
    margeBrute = 0,
    margeDispo = false
  const lignes: Ligne[] = []

  for (const t of tanks) {
    const ventes = parCuve[t.id]
    const prix = latestPrice(prices, inp.orgId, t.product, inp.day) || 0
    const prixAchat = latestBuyPrice(prices, inp.orgId, t.product, inp.day)
    const livraisons = deliveries
      .filter((d) => d.tank_id === t.id)
      .reduce((s, d) => s + (d.volume_received_l ?? d.volume_invoiced_l), 0)
    const it = inter[t.id] ?? { ventes: 0, livr: 0 }
    const b = baseline[t.id]
    const stockAttendu = b.stock + it.livr - it.ventes + livraisons - ventes
    const dipRow = dips.find((d) => d.tank_id === t.id)
    const jauge = dipRow ? Number(dipRow.dip_l) : null
    const ec = jauge !== null ? jauge - stockAttendu : 0
    const marge = prixAchat != null ? ventes * (prix - prixAchat) : null
    if (marge != null) {
      margeBrute += marge
      margeDispo = true
    }
    ventesL += ventes
    caTheo += ventes * prix
    ecartCuve += ec
    lignes.push({
      produit: PRODUITS[t.product] ?? t.product,
      ventes,
      prix,
      prixAchat,
      marge,
      ca: ventes * prix,
      stockAttendu,
      jauge,
      ecart: ec,
      livraisons,
    })
  }

  const enc = cash.reduce((s, c) => s + (Number(c.amount_fcfa) || 0), 0)
  const encParMode: Record<string, number> = {}
  cash.forEach((c) => {
    encParMode[c.method] = (encParMode[c.method] || 0) + (Number(c.amount_fcfa) || 0)
  })
  const ecartCaisse = enc - caTheo
  const depenses = expenses.reduce((s, e) => s + (Number(e.amount_fcfa) || 0), 0)
  const margeNette = margeDispo ? margeBrute - depenses : null

  const summary: Summary = {
    ventesL,
    caTheo,
    enc,
    encParMode,
    ecartCaisse,
    ecartCuve,
    margeBrute: margeDispo ? margeBrute : null,
    depenses,
    margeNette,
    margeDispo,
    lignes,
    parPompiste,
    readingsOk,
    dipsOk,
    cashOk,
    complet: readingsOk && dipsOk,
  }
  summary.statut = statutOf(summary)
  return summary
}

/** Statut de conformité — identique v1 (avec garde-fou prix manquant). */
export function statutOf(c: {
  ventesL: number
  caTheo: number
  ecartCaisse: number
  ecartCuve: number
}): string {
  if (c.ventesL > 0 && !(c.caTheo > 0)) return 'warn'
  const pc = c.caTheo ? Math.abs(c.ecartCaisse) / c.caTheo : 0
  const pv = c.ventesL ? Math.abs(c.ecartCuve) / c.ventesL : 0
  if (pc <= 0.005 && pv <= 0.005) return 'ok'
  if (pc <= 0.015 && pv <= 0.02) return 'warn'
  return 'crit'
}
