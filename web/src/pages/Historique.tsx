import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '../context/Session'
import { supabase } from '../lib/supabase'
import { frDate, frDateShort, fmt, fmtS } from '../lib/format'
import type { Summary } from '../lib/compute'
import { Button, Card, Chip, Select } from '../components/ui'
import { ReportCard } from '../components/ReportCard'
import { toast } from '../lib/toast'
import type { Tables } from '../lib/database.types'

type Closure = Tables<'day_closures'> & { summary: Summary }

export function Historique() {
  const { myStations, isOwner, user } = useSession()
  const stations = myStations()
  const [params, setParams] = useSearchParams()
  const paramStation = params.get('station')
  const [stationId, setStationId] = useState(
    paramStation && stations.some((s) => s.id === paramStation) ? paramStation : stations[0]?.id ?? '',
  )
  const [closures, setClosures] = useState<Closure[]>([])
  const [sel, setSel] = useState<Closure | null>(null)
  const [loading, setLoading] = useState(true)

  const st = stations.find((s) => s.id === stationId)

  const load = useCallback(async () => {
    if (!stationId) return
    setLoading(true)
    const { data } = await supabase
      .from('day_closures')
      .select('*')
      .eq('station_id', stationId)
      .order('day', { ascending: false })
      .limit(60)
    setClosures((data ?? []) as Closure[])
    setLoading(false)
  }, [stationId])

  useEffect(() => {
    void load()
  }, [load])

  async function reopen(c: Closure) {
    if (!confirm('Rouvrir cette journée ? Le gérant pourra modifier les relevés, puis re-clôturer.')) return
    const { error } = await supabase.from('day_closures').update({ status: 'reopened' }).eq('id', c.id)
    if (error) return toast('⚠ ' + error.message)
    await supabase.from('audit_log').insert({ station_id: stationId, action: 'reouverture', entity: 'day_closures', entity_id: c.day, detail: { by: user?.id } })
    toast('Journée rouverte')
    setSel(null)
    await load()
  }

  if (sel && st) {
    return (
      <div>
        <button className="text-brand font-bold text-[14px] mb-3" onClick={() => setSel(null)}>‹ Retour</button>
        <h1 className="text-2xl font-extrabold">{st.name}</h1>
        <div className="text-[13px] text-ink3 mb-3">{frDate(sel.day)}</div>
        <ReportCard
          stationName={st.name}
          day={sel.day}
          sum={sel.summary}
          withActions
          canReopen={isOwner && sel.status === 'closed'}
          onReopen={() => reopen(sel)}
        />
        {sel.status === 'reopened' && (
          <Card className="mt-3">
            <div className="text-[13px] text-ink2">Cette journée est rouverte — à re-clôturer dans Saisie.</div>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-2">Historique</h1>
      {stations.length > 1 && (
        <Select
          className="mb-3 max-w-[70%]"
          value={stationId}
          onChange={(e) => {
            setStationId(e.target.value)
            setParams({ station: e.target.value })
          }}
        >
          {stations.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      )}
      {loading ? (
        <Card>Chargement…</Card>
      ) : closures.length === 0 ? (
        <Card>Aucune journée clôturée pour l'instant.</Card>
      ) : (
        <Card>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink3 text-left">
                <th className="py-1.5 font-semibold">Date</th>
                <th className="py-1.5 font-semibold">Litres</th>
                <th className="py-1.5 font-semibold text-right">Écart caisse</th>
                <th className="py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {closures.map((c) => (
                <tr key={c.id} className="border-t border-grid cursor-pointer" onClick={() => setSel(c)}>
                  <td className="py-2">{frDateShort(c.day)}</td>
                  <td className="py-2">{fmt(c.summary.ventesL)} L</td>
                  <td className={`py-2 text-right ${(c.summary.ecartCaisse || 0) < 0 ? 'text-crit' : ''}`}>
                    {fmtS(c.summary.ecartCaisse)} F
                  </td>
                  <td className="py-2 text-right">
                    {c.status === 'reopened' ? <span className="text-[11px] text-warn">rouverte</span> : <Chip statut={c.summary.statut || 'ok'} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <div className="mt-3">
        <Button variant="ghost" onClick={load}>Rafraîchir</Button>
      </div>
    </div>
  )
}
