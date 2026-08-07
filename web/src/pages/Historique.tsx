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
  const [reopenOpen, setReopenOpen] = useState(false)
  const [motif, setMotif] = useState('')
  const [confirmChk, setConfirmChk] = useState(false)
  const [busy, setBusy] = useState(false)

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

  // Réinitialise le panneau de réouverture quand on change de clôture affichée.
  useEffect(() => {
    setReopenOpen(false)
    setMotif('')
    setConfirmChk(false)
  }, [sel])

  async function doReopen(c: Closure) {
    const m = motif.trim()
    if (!m) return toast('Le motif de réouverture est obligatoire')
    if (!confirmChk) return toast('Coche la confirmation pour continuer')
    setBusy(true)
    try {
      const { error } = await supabase.from('day_closures').update({ status: 'reopened' }).eq('id', c.id)
      if (error) throw error
      await supabase.from('audit_log').insert({
        station_id: stationId,
        org_id: st?.org_id,
        action: 'reouverture',
        entity: 'day_closures',
        entity_id: c.day,
        detail: { motif: m, by: user?.id },
      })
      toast('Journée rouverte')
      setSel(null)
      await load()
    } catch (e) {
      toast('⚠ ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
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
          canReopen={isOwner && sel.status === 'closed' && !reopenOpen}
          onReopen={() => setReopenOpen(true)}
        />

        {reopenOpen && isOwner && sel.status === 'closed' && (
          <Card className="mt-3 border-crit">
            <div className="text-[14px] font-bold mb-1">↺ Rouvrir la journée du {frDateShort(sel.day)}</div>
            <p className="text-[12px] text-ink3 mb-2">
              Le gérant pourra de nouveau modifier les relevés, puis re-clôturer. Cette action est
              tracée dans le journal d'audit.
            </p>
            <label className="block mb-2">
              <span className="block text-[12px] text-ink2 mb-1">Motif de la réouverture (obligatoire)</span>
              <textarea
                className="w-full rounded-[10px] border border-grid bg-page text-ink1 px-3 py-2 text-[14px] outline-none focus:border-brand"
                rows={2}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="ex : erreur de jauge sur la cuve gasoil"
              />
            </label>
            <label className="flex items-start gap-3 mb-3">
              <input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0" checked={confirmChk} onChange={(e) => setConfirmChk(e.target.checked)} />
              <span className="text-[13px]">Je confirme la réouverture de cette journée clôturée.</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setReopenOpen(false)} disabled={busy}>Annuler</Button>
              <Button variant="danger" onClick={() => doReopen(sel)} disabled={busy || !motif.trim() || !confirmChk}>
                {busy ? 'Réouverture…' : 'Confirmer la réouverture'}
              </Button>
            </div>
          </Card>
        )}

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
