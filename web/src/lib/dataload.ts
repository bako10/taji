import { supabase } from './supabase'
import { addDays } from './format'
import type { Tables } from './database.types'

export type Tank = Tables<'tanks'>
export type Nozzle = Tables<'nozzles'>
export type Reading = Tables<'nozzle_readings'>
export type Dip = Tables<'tank_dips'>
export type Delivery = Tables<'deliveries'>
export type Cash = Tables<'cash_entries'>
export type Expense = Tables<'expenses'>
export type Closure = Tables<'day_closures'>

export type Infra = { tanks: Tank[]; nozzles: Nozzle[] }
export type DayData = {
  readings: Reading[]
  dips: Dip[]
  deliveries: Delivery[]
  cash: Cash[]
  expenses: Expense[]
  closure: Closure | null
}

export async function loadInfra(stId: string): Promise<Infra> {
  const [tanks, nozzles] = await Promise.all([
    supabase.from('tanks').select('*').eq('station_id', stId).eq('active', true).order('created_at'),
    supabase.from('nozzles').select('*').eq('station_id', stId).eq('active', true).order('created_at'),
  ])
  return { tanks: tanks.data ?? [], nozzles: nozzles.data ?? [] }
}

export async function loadDay(stId: string, day: string): Promise<DayData> {
  const [readings, dips, deliveries, cash, expenses, closure] = await Promise.all([
    supabase.from('nozzle_readings').select('*').eq('station_id', stId).eq('day', day),
    supabase.from('tank_dips').select('*').eq('station_id', stId).eq('day', day),
    supabase.from('deliveries').select('*').eq('station_id', stId).eq('day', day).order('created_at'),
    supabase.from('cash_entries').select('*').eq('station_id', stId).eq('day', day).order('created_at'),
    supabase.from('expenses').select('*').eq('station_id', stId).eq('day', day).order('created_at'),
    supabase.from('day_closures').select('*').eq('station_id', stId).eq('day', day).maybeSingle(),
  ])
  return {
    readings: readings.data ?? [],
    dips: dips.data ?? [],
    deliveries: deliveries.data ?? [],
    cash: cash.data ?? [],
    expenses: expenses.data ?? [],
    closure: closure.data ?? null,
  }
}

/** Index d'ouverture repris du dernier index de fermeture connu (sinon index initial). */
export async function lastClosingIndexes(
  stId: string,
  day: string,
  nozzles: Nozzle[],
): Promise<Record<string, number>> {
  const since = addDays(day, -60)
  const { data } = await supabase
    .from('nozzle_readings')
    .select('nozzle_id,day,closing_index')
    .eq('station_id', stId)
    .lt('day', day)
    .gte('day', since)
    .not('closing_index', 'is', null)
    .order('day', { ascending: false })
  const rows = data ?? []
  const map: Record<string, number> = {}
  for (const n of nozzles) {
    const r = rows.find((x) => x.nozzle_id === n.id)
    map[n.id] = r ? Number(r.closing_index) : Number(n.initial_index)
  }
  return map
}

/** Stock de départ de chaque cuve : dernier jaugeage (sinon stock initial). */
export async function tankBaseline(
  stId: string,
  day: string,
  tanks: Tank[],
): Promise<Record<string, { stock: number; sinceDay: string | null }>> {
  const since = addDays(day, -60)
  const { data } = await supabase
    .from('tank_dips')
    .select('tank_id,day,dip_l')
    .eq('station_id', stId)
    .lt('day', day)
    .gte('day', since)
    .order('day', { ascending: false })
  const rows = data ?? []
  const map: Record<string, { stock: number; sinceDay: string | null }> = {}
  for (const t of tanks) {
    const r = rows.find((x) => x.tank_id === t.id)
    map[t.id] = r ? { stock: Number(r.dip_l), sinceDay: r.day } : { stock: Number(t.initial_stock_l), sinceDay: null }
  }
  return map
}
