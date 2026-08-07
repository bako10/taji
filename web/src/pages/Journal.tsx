import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '../context/Session'
import { supabase } from '../lib/supabase'
import { fmt, fmtS, frDateShort } from '../lib/format'
import { Button, Card, Select } from '../components/ui'
import { dlCSV } from '../lib/csv'
import type { Tables } from '../lib/database.types'

type Audit = Tables<'audit_log'>

const ACTION_LABEL: Record<string, string> = {
  cloture: 'Clôture',
  reouverture: 'Réouverture',
  changement_prix: 'Changement de prix',
  suppression_saisie: 'Suppression de saisie',
  invitation: 'Invitation',
  revocation: 'Révocation d’accès',
}

const ICON: Record<string, string> = {
  cloture: '🔒',
  reouverture: '↺',
  changement_prix: '🏷️',
  suppression_saisie: '🗑️',
  invitation: '➕',
  revocation: '🚫',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describe(a: Audit): string {
  const d = (a.detail ?? {}) as any
  switch (a.action) {
    case 'cloture':
      return `Journée du ${a.entity_id} clôturée — écart caisse ${fmtS(d.ecartCaisse ?? 0)} F, écart cuves ${fmtS(d.ecartCuve ?? 0)} L`
    case 'reouverture':
      return `Journée du ${a.entity_id} rouverte — motif : « ${d.motif ?? '—'} »`
    case 'changement_prix': {
      const parts: string[] = []
      if (d.nouveau_vente !== d.ancien_vente) parts.push(`vente ${d.ancien_vente != null ? fmt(d.ancien_vente) : '—'} → ${fmt(d.nouveau_vente)} F`)
      if (d.nouveau_achat !== d.ancien_achat) parts.push(`achat ${d.ancien_achat != null ? fmt(d.ancien_achat) : '—'} → ${d.nouveau_achat != null ? fmt(d.nouveau_achat) : '—'} F`)
      return `Prix ${d.produit ?? a.entity_id} : ${parts.join(' · ')}`
    }
    case 'suppression_saisie': {
      const m = d.montant_fcfa != null ? `${fmt(d.montant_fcfa)} F` : d.volume_facture_l != null ? `${fmt(d.volume_facture_l)} L` : ''
      return `Suppression ${d.type ?? 'saisie'}${m ? ' (' + m + ')' : ''} — jour ${d.jour ?? ''}`
    }
    case 'invitation':
      return `Code d'invitation ${d.role ?? ''} généré`
    case 'revocation':
      return `Accès révoqué : ${d.nom ?? '—'} (${d.role ?? ''})`
    default:
      return `${a.action} — ${a.entity}`
  }
}

export function Journal() {
  const { stations } = useSession()
  const [rows, setRows] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [fStation, setFStation] = useState('all')
  const [fAction, setFAction] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const stationName = (id: string | null) => stations.find((s) => s.id === id)?.name ?? '—'

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('audit_log').select('*').order('at', { ascending: false }).limit(500)
    setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () =>
      rows.filter((a) => {
        if (fStation !== 'all' && a.station_id !== fStation) return false
        if (fAction !== 'all' && a.action !== fAction) return false
        const day = a.at.slice(0, 10)
        if (from && day < from) return false
        if (to && day > to) return false
        return true
      }),
    [rows, fStation, fAction, from, to],
  )

  function exportCSV() {
    const out: (string | number)[][] = [['Date', 'Heure', 'Station', 'Type', 'Détail']]
    filtered.forEach((a) => {
      const dt = new Date(a.at)
      out.push([
        dt.toLocaleDateString('fr-FR'),
        dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        stationName(a.station_id),
        ACTION_LABEL[a.action] ?? a.action,
        describe(a),
      ])
    })
    dlCSV(`taji_journal_${new Date().toISOString().slice(0, 10)}.csv`, out)
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Journal d'activité</h1>
      <p className="text-[13px] text-ink3 mb-3">Toutes les actions sensibles, tracées et horodatées.</p>

      <Card className="mb-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[11px] text-ink3 font-bold mb-1">STATION</span>
            <Select value={fStation} onChange={(e) => setFStation(e.target.value)}>
              <option value="all">Toutes</option>
              {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </label>
          <label className="block">
            <span className="block text-[11px] text-ink3 font-bold mb-1">TYPE D'ACTION</span>
            <Select value={fAction} onChange={(e) => setFAction(e.target.value)}>
              <option value="all">Toutes</option>
              {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </label>
          <label className="block">
            <span className="block text-[11px] text-ink3 font-bold mb-1">DU</span>
            <input type="date" className="w-full rounded-[10px] border border-grid bg-page text-ink1 px-3 py-2 text-[14px]" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-[11px] text-ink3 font-bold mb-1">AU</span>
            <input type="date" className="w-full rounded-[10px] border border-grid bg-page text-ink1 px-3 py-2 text-[14px]" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <Button variant="ghost" className="mt-2" onClick={exportCSV}>⬇ Exporter (CSV)</Button>
      </Card>

      {loading ? (
        <Card>Chargement…</Card>
      ) : filtered.length === 0 ? (
        <Card>Aucun événement pour ces filtres.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const dt = new Date(a.at)
            return (
              <Card key={a.id} className="!p-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg leading-none mt-0.5">{ICON[a.action] ?? '•'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold">{ACTION_LABEL[a.action] ?? a.action}</div>
                    <div className="text-[12.5px] text-ink2">{describe(a)}</div>
                    <div className="text-[11px] text-ink3 mt-0.5">
                      {frDateShort(a.at.slice(0, 10))} · {dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {a.station_id ? ` · ${stationName(a.station_id)}` : ''}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
          <p className="text-[11px] text-ink3 text-center pt-1">
            {filtered.length} événement(s){rows.length >= 500 ? ' · 500 plus récents' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
