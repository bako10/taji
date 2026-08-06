import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../context/Session'
import { supabase } from '../lib/supabase'
import { todayISO, fmt, fmtS } from '../lib/format'
import type { Summary } from '../lib/compute'
import { Button, Card, Tile } from '../components/ui'
import { dlCSV } from '../lib/csv'
import type { Tables } from '../lib/database.types'

type Closure = Tables<'day_closures'> & { summary: Summary }

export function Rapports() {
  const { myStations, stations: allStations } = useSession()
  const stations = myStations()
  const [mois, setMois] = useState(todayISO().slice(0, 7))
  const [closures, setClosures] = useState<Closure[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!stations.length) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('day_closures')
      .select('*')
      .in('station_id', stations.map((s) => s.id))
      .gte('day', mois + '-01')
      .lte('day', mois + '-31')
      .eq('status', 'closed')
      .order('day')
    setClosures((data ?? []) as Closure[])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mois, stations.length])

  useEffect(() => { void load() }, [load])

  const T = { v: 0, ca: 0, enc: 0, ec: 0, cu: 0, mg: 0 }
  let mgAny = false
  const rows = stations.map((st) => {
    const cs = closures.filter((c) => c.station_id === st.id)
    const v = cs.reduce((a, c) => a + (c.summary.ventesL || 0), 0)
    const ca = cs.reduce((a, c) => a + (c.summary.caTheo || 0), 0)
    const enc = cs.reduce((a, c) => a + (c.summary.enc || 0), 0)
    const ec = cs.reduce((a, c) => a + (c.summary.ecartCaisse || 0), 0)
    const cu = cs.reduce((a, c) => a + (c.summary.ecartCuve || 0), 0)
    const mg = cs.reduce((a, c) => a + (c.summary.margeNette || 0), 0)
    if (cs.some((c) => c.summary.margeNette != null)) mgAny = true
    T.v += v; T.ca += ca; T.enc += enc; T.ec += ec; T.cu += cu; T.mg += mg
    return { st, n: cs.length, v, ec }
  })

  function exportSyntheses() {
    const out: (string | number)[][] = [[
      'Date', 'Station', 'Litres vendus', 'CA théorique (F)', 'Encaissé (F)', 'Écart caisse (F)',
      'Écart cuves (L)', 'Marge brute (F)', 'Dépenses (F)', 'Marge nette (F)', 'Statut',
    ]]
    closures.forEach((c) => {
      const st = allStations.find((s) => s.id === c.station_id)
      const s = c.summary
      out.push([
        c.day, st?.name ?? '', Math.round(s.ventesL || 0), Math.round(s.caTheo || 0),
        Math.round(s.enc || 0), Math.round(s.ecartCaisse || 0), Math.round(s.ecartCuve || 0),
        s.margeBrute != null ? Math.round(s.margeBrute) : '', s.depenses != null ? Math.round(s.depenses) : '',
        s.margeNette != null ? Math.round(s.margeNette) : '', s.statut ?? '',
      ])
    })
    dlCSV(`taji_syntheses_${mois}.csv`, out)
  }

  async function exportDetail() {
    const d1 = mois + '-01', d2 = mois + '-31'
    const [reads, cash] = await Promise.all([
      supabase.from('nozzle_readings').select('*, nozzles(name)').in('station_id', stations.map((s) => s.id)).gte('day', d1).lte('day', d2).order('day'),
      supabase.from('cash_entries').select('*').in('station_id', stations.map((s) => s.id)).gte('day', d1).lte('day', d2).order('day'),
    ])
    const out: (string | number)[][] = [['Type', 'Date', 'Station', 'Détail', 'Ouverture', 'Fermeture', 'Litres', 'Mode', 'Montant (F)']]
    const readRows = (reads.data ?? []) as unknown as (Tables<'nozzle_readings'> & { nozzles: { name: string } | null })[]
    readRows.forEach((r) => {
      const st = allStations.find((s) => s.id === r.station_id)
      out.push(['Relevé pompe', r.day, st?.name ?? '', r.nozzles?.name ?? '', r.opening_index, r.closing_index ?? '', r.closing_index != null ? Math.round(Number(r.closing_index) - Number(r.opening_index)) : '', '', ''])
    })
    ;(cash.data ?? []).forEach((c) => {
      const st = allStations.find((s) => s.id === c.station_id)
      out.push(['Encaissement', c.day, st?.name ?? '', '', '', '', '', c.method, Math.round(Number(c.amount_fcfa))])
    })
    dlCSV(`taji_detail_${mois}.csv`, out)
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-2">Rapports</h1>
      <input
        type="month"
        className="rounded-[10px] border border-grid bg-surface text-ink1 px-3 py-2 text-[14px] mb-3"
        value={mois}
        max={todayISO().slice(0, 7)}
        onChange={(e) => setMois(e.target.value)}
      />
      {loading ? (
        <Card>Chargement…</Card>
      ) : !stations.length ? (
        <Card>Aucune station.</Card>
      ) : (
        <>
          <Card className="mb-3">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-ink3 text-left">
                  <th className="py-1.5 font-semibold">Station</th>
                  <th className="py-1.5 font-semibold">Jours</th>
                  <th className="py-1.5 font-semibold">Litres</th>
                  <th className="py-1.5 font-semibold text-right">Écart caisse</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ st, n, v, ec }) => (
                  <tr key={st.id} className="border-t border-grid">
                    <td className="py-1.5">{st.name}</td>
                    <td className="py-1.5">{n}</td>
                    <td className="py-1.5">{fmt(v)} L</td>
                    <td className={`py-1.5 text-right ${ec < 0 ? 'text-crit' : ''}`}>{fmtS(ec)} F</td>
                  </tr>
                ))}
                <tr className="border-t border-grid font-bold">
                  <td className="py-1.5">Total</td>
                  <td></td>
                  <td className="py-1.5">{fmt(T.v)} L</td>
                  <td className={`py-1.5 text-right ${T.ec < 0 ? 'text-crit' : ''}`}>{fmtS(T.ec)} F</td>
                </tr>
              </tbody>
            </table>
          </Card>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <Tile label="CA THÉORIQUE" value={fmt(T.ca / 1000000)} unit="millions F" />
            <Tile label="ENCAISSÉ" value={fmt(T.enc / 1000000)} unit="millions F" />
            <Tile label="ÉCART CUVES" value={fmtS(T.cu)} unit="litres" tone={T.cu < 0 ? 'neg' : undefined} />
            {mgAny && (
              <div className="col-span-3">
                <Tile label="MARGE NETTE DU MOIS" value={`${fmt(T.mg)} F`} unit="FCFA" tone="brand" />
              </div>
            )}
          </div>

          <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Exports (pour le comptable)</h2>
          <Card className="space-y-2">
            <Button variant="ghost" onClick={exportSyntheses}>⬇ Synthèses quotidiennes (CSV)</Button>
            <Button variant="ghost" onClick={exportDetail}>⬇ Détail relevés & encaissements (CSV)</Button>
          </Card>
        </>
      )}
    </div>
  )
}
