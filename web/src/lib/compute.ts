import { supabase } from './supabase'
import { addDays } from './format'
import { tankBaseline } from './dataload'
import type { DayData, Infra } from './dataload'
import type { Tables } from './database.types'
import { reconcile } from './reconcile'
export { statutOf } from './reconcile'
export type { Summary, Ligne } from './reconcile'

type Price = Tables<'prices'>

/** Réconciliation d'une journée — prépare baseline + jours intermédiaires puis délègue au calcul pur. */
export async function computeDay(
  st: { id: string; org_id: string },
  day: string,
  dayData: DayData,
  infra: Infra,
  prices: Price[],
) {
  const { tanks, nozzles } = infra
  const baseline = await tankBaseline(st.id, day, tanks)

  // ventes/livraisons des jours intermédiaires non jaugés (trou de plusieurs jours)
  const inter: Record<string, { ventes: number; livr: number }> = {}
  for (const t of tanks) {
    const b = baseline[t.id]
    inter[t.id] = { ventes: 0, livr: 0 }
    if (b.sinceDay !== null && addDays(b.sinceDay, 1) < day) {
      const nozzleIds = nozzles.filter((n) => n.tank_id === t.id).map((n) => n.id)
      const [interReads, interDeliv] = await Promise.all([
        supabase
          .from('nozzle_readings')
          .select('nozzle_id,opening_index,closing_index')
          .eq('station_id', st.id)
          .gt('day', b.sinceDay)
          .lt('day', day)
          .in('nozzle_id', nozzleIds),
        supabase
          .from('deliveries')
          .select('tank_id,volume_received_l,volume_invoiced_l')
          .eq('station_id', st.id)
          .gt('day', b.sinceDay)
          .lt('day', day)
          .eq('tank_id', t.id),
      ])
      inter[t.id].ventes = (interReads.data ?? []).reduce(
        (s, r) => s + Math.max(0, (Number(r.closing_index) || 0) - (Number(r.opening_index) || 0)),
        0,
      )
      inter[t.id].livr = (interDeliv.data ?? []).reduce(
        (s, d) => s + (d.volume_received_l ?? d.volume_invoiced_l),
        0,
      )
    }
  }

  return reconcile({
    orgId: st.org_id,
    day,
    tanks,
    nozzles,
    readings: dayData.readings,
    dips: dayData.dips,
    deliveries: dayData.deliveries,
    cash: dayData.cash,
    expenses: dayData.expenses,
    prices,
    baseline,
    inter,
  })
}
