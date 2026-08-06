import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/Session'
import { supabase } from '../lib/supabase'
import { todayISO, frDate, frDateShort, fmt, fmtS, addDays } from '../lib/format'
import type { Summary } from '../lib/compute'
import { Card, Chip, Tile } from '../components/ui'
import type { Tables } from '../lib/database.types'

type Closure = Tables<'day_closures'> & { summary: Summary }

export function Home() {
  const { myStations } = useSession()
  const nav = useNavigate()
  const stations = myStations()
  const [day, setDay] = useState(todayISO())
  const [closures, setClosures] = useState<Closure[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!stations.length) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('day_closures')
      .select('*')
      .in('station_id', stations.map((s) => s.id))
      .gte('day', addDays(day, -13))
      .lte('day', day)
      .eq('status', 'closed')
    setClosures((data ?? []) as Closure[])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, stations.length])

  useEffect(() => {
    void load()
  }, [load])

  const today = closures.filter((c) => c.day === day)
  let vt = 0, ecu = 0, eca = 0, mg = 0, mgAny = false
  today.forEach((c) => {
    vt += c.summary.ventesL || 0
    ecu += c.summary.ecartCuve || 0
    eca += c.summary.ecartCaisse || 0
    if (c.summary.margeNette != null) { mg += c.summary.margeNette; mgAny = true }
  })

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-2">Vue d'ensemble</h1>
      <div className="flex gap-2 items-center mb-3">
        <input
          type="date"
          className="rounded-[10px] border border-grid bg-surface text-ink1 px-3 py-2 text-[14px]"
          value={day}
          max={todayISO()}
          onChange={(e) => setDay(e.target.value)}
        />
        <span className="text-[12px] text-ink3">{frDate(day)}</span>
      </div>

      {!stations.length ? (
        <Card>Aucune station. Ajoutez votre première station dans Réglages.</Card>
      ) : (
        <>
          {today.length === 0 ? (
            <Card className="mb-3">
              <div className="text-[10.5px] font-bold text-ink3">EN ATTENTE</div>
              <div className="text-[12.5px] text-ink2 mt-1">
                Aucune journée clôturée pour cette date. Les chiffres apparaissent dès la clôture par
                le gérant.
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Tile label="LITRES VENDUS" value={fmt(vt)} unit={`litres · ${today.length}/${stations.length} clôturées`} />
              <Tile label="ÉCART CUVES" value={fmtS(ecu)} unit="litres" tone={ecu < 0 ? 'neg' : undefined} />
              <Tile label="ÉCART CAISSE" value={fmtS(eca)} unit="FCFA" tone={eca < 0 ? 'neg' : undefined} />
              {mgAny && (
                <div className="col-span-3">
                  <Tile label="MARGE NETTE" value={`${fmt(mg)} F`} unit="CA − achats − dépenses" tone="brand" />
                </div>
              )}
            </div>
          )}

          <h2 className="text-[13px] font-bold text-ink3 mt-4 mb-2 uppercase tracking-wide">Mes stations</h2>
          <div className="space-y-2.5">
            {stations.map((st) => {
              const c = today.find((x) => x.station_id === st.id)
              return (
                <Card key={st.id} className="cursor-pointer" >
                  <div className="flex items-center justify-between" onClick={() => nav('/historique?station=' + st.id)}>
                    <div>
                      <div className="font-bold text-[15px]">⛽ {st.name}</div>
                      <div className="text-[12px] text-ink3">
                        {c ? `${fmt(c.summary.ventesL)} L · écart caisse ${fmtS(c.summary.ecartCaisse)} F` : 'Journée non clôturée'}
                      </div>
                    </div>
                    {c ? <Chip statut={c.summary.statut || 'wait'} /> : <Chip statut="wait" />}
                  </div>
                </Card>
              )
            })}
          </div>

          <h2 className="text-[13px] font-bold text-ink3 mt-5 mb-2 uppercase tracking-wide">
            Tendance — écart de caisse (14 jours)
          </h2>
          <Card>
            <Trend closures={closures} day={day} />
            <div className="text-[11px] text-ink3 mt-2">
              Basé sur les journées clôturées. Zéro = caisse conforme aux volumes vendus.
            </div>
          </Card>
        </>
      )}

      {loading && <p className="text-[11px] text-ink3 text-center mt-4">Chargement…</p>}
    </div>
  )
}

/** Sparkline SVG de l'écart de caisse agrégé par jour sur 14 jours. */
function Trend({ closures, day }: { closures: Closure[]; day: string }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(day, -13 + i))
  const series = days.map((d) =>
    closures.filter((c) => c.day === d).reduce((s, c) => s + (c.summary.ecartCaisse || 0), 0),
  )
  const has = closures.length > 0
  const W = 320, H = 90, pad = 6
  const max = Math.max(1, ...series.map((v) => Math.abs(v)))
  const x = (i: number) => pad + (i * (W - 2 * pad)) / 13
  const y = (v: number) => H / 2 - (v / max) * (H / 2 - pad)
  const pts = series.map((v, i) => `${x(i)},${y(v)}`).join(' ')

  if (!has) return <div className="text-[12.5px] text-ink3 py-6 text-center">Aucune donnée clôturée.</div>
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="overflow-visible">
      <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke="var(--color-grid)" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke="var(--color-brand)" strokeWidth="2" />
      {series.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={v < 0 ? 'var(--color-crit)' : 'var(--color-brand)'}>
          <title>{`${frDateShort(days[i])} : ${fmtS(v)} F`}</title>
        </circle>
      ))}
    </svg>
  )
}
