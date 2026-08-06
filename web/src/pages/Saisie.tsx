import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../context/Session'
import { supabase } from '../lib/supabase'
import { todayISO, frDate, fmt } from '../lib/format'
import { PRODUITS, METHODES, EXP_CATS } from '../lib/constants'
import { computeDay } from '../lib/compute'
import {
  loadInfra,
  loadDay,
  lastClosingIndexes,
  type Infra,
  type DayData,
} from '../lib/dataload'
import type { Tables } from '../lib/database.types'
import { Button, Card, Input, Select } from '../components/ui'
import { StepCard } from '../components/StepCard'
import { ReportCard } from '../components/ReportCard'
import { toast } from '../lib/toast'

type Staff = Tables<'staff'>
type CreditClient = Tables<'credit_clients'>

export function Saisie() {
  const { user, prices, isPompiste, myStations } = useSession()
  const stations = myStations()
  const [stationId, setStationId] = useState<string>(stations[0]?.id ?? '')
  const [day, setDay] = useState<string>(todayISO())
  const [infra, setInfra] = useState<Infra | null>(null)
  const [data, setData] = useState<DayData | null>(null)
  const [staff, setStaff] = useState<Staff[]>([])
  const [clients, setClients] = useState<CreditClient[]>([])
  const [openMap, setOpenMap] = useState<Record<string, number>>({})
  const [vals, setVals] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const st = stations.find((s) => s.id === stationId)

  const load = useCallback(async () => {
    if (!stationId) return
    setLoading(true)
    const inf = await loadInfra(stationId)
    const dd = await loadDay(stationId, day)
    const stf = await supabase.from('staff').select('*').eq('station_id', stationId).eq('active', true)
    const cl = st
      ? await supabase.from('credit_clients').select('*').eq('org_id', st.org_id).eq('active', true)
      : { data: [] as CreditClient[] }
    const om = await lastClosingIndexes(stationId, day, inf.nozzles)
    setInfra(inf)
    setData(dd)
    setStaff(stf.data ?? [])
    setClients(cl.data ?? [])
    setOpenMap(om)
    setVals({})
    setLoading(false)
  }, [stationId, day, st])

  useEffect(() => {
    void load()
  }, [load])

  const setV = (k: string, v: string) => setVals((s) => ({ ...s, [k]: v }))
  const gv = (k: string, fallback = '') => (k in vals ? vals[k] : fallback)

  if (!stationId) return <Card>Aucune station rattachée.</Card>
  if (loading || !infra || !data || !st) return <Card>Chargement…</Card>

  // Journée clôturée → rapport figé
  if (data.closure && data.closure.status === 'closed') {
    return (
      <div>
        <Header
          stations={stations}
          stationId={stationId}
          setStationId={setStationId}
          day={day}
          setDay={setDay}
        />
        <div className="text-center font-bold text-good-text bg-brand-soft rounded-2xl py-3 mb-3">
          ✅ Journée clôturée
        </div>
        <ReportCard stationName={st.name} day={day} sum={data.closure.summary as never} />
      </div>
    )
  }

  const rOf = (nid: string) => data.readings.find((r) => r.nozzle_id === nid)
  const dOf = (tid: string) => data.dips.find((d) => d.tank_id === tid)
  const cashOf = (m: string) => data.cash.find((c) => c.method === m && !c.credit_client_id)
  const done1 = infra.nozzles.length > 0 && infra.nozzles.every((n) => rOf(n.id)?.closing_index != null)
  const done2 = infra.tanks.length > 0 && infra.tanks.every((t) => dOf(t.id))
  const done3 = data.cash.length > 0
  const done4 = data.expenses.length > 0

  async function savePompes() {
    if (!infra) return
    setBusy(true)
    try {
      const rows = []
      for (const n of infra.nozzles) {
        const opRaw = gv('op_' + n.id, String(openMap[n.id] ?? rOf(n.id)?.opening_index ?? 0))
        const clRaw = gv('cl_' + n.id, rOf(n.id)?.closing_index != null ? String(rOf(n.id)!.closing_index) : '')
        const op = parseFloat(opRaw)
        const cl = clRaw === '' ? null : parseFloat(clRaw)
        if (isNaN(op) || op < 0) { toast('Index ouverture invalide — ' + n.name); setBusy(false); return }
        if (cl !== null && cl < op) { toast('⚠ ' + n.name + ' : fermeture < ouverture'); setBusy(false); return }
        if (cl !== null && cl - op > 40000 && !confirm(`${n.name} : ${fmt(cl - op)} L vendus — inhabituel. Confirmer ?`)) { setBusy(false); return }
        const staffId = gv('stf_' + n.id, rOf(n.id)?.staff_id ?? '')
        rows.push({
          station_id: stationId, nozzle_id: n.id, day, shift_label: 'journee',
          opening_index: op, closing_index: cl, staff_id: staffId || null, entered_by: user!.id,
        })
      }
      const { error } = await supabase.from('nozzle_readings').upsert(rows, { onConflict: 'nozzle_id,day,shift_label' })
      if (error) throw error
      toast('✔ Index enregistrés')
      await load()
    } catch (e) { toast('⚠ ' + (e as Error).message) } finally { setBusy(false) }
  }

  async function saveCuves() {
    if (!infra) return
    setBusy(true)
    try {
      const rows = []
      for (const t of infra.tanks) {
        const v = gv('dip_' + t.id, dOf(t.id) ? String(dOf(t.id)!.dip_l) : '')
        if (v === '') continue
        const d = parseFloat(v)
        if (isNaN(d) || d < 0) { toast('Jauge invalide — ' + t.name); setBusy(false); return }
        if (d > Number(t.capacity_l)) { toast('⚠ ' + t.name + ' : jauge > capacité'); setBusy(false); return }
        rows.push({ station_id: stationId, tank_id: t.id, day, dip_l: d, entered_by: user!.id })
      }
      if (rows.length) {
        const { error } = await supabase.from('tank_dips').upsert(rows, { onConflict: 'tank_id,day' })
        if (error) throw error
      }
      const inv = gv('dl_inv')
      if (inv !== '') {
        const rec = gv('dl_rec')
        const { error } = await supabase.from('deliveries').insert({
          station_id: stationId, tank_id: gv('dl_tank', infra.tanks[0]?.id), day,
          supplier: gv('dl_sup').trim(), volume_invoiced_l: parseFloat(inv) || 0,
          volume_received_l: rec === '' ? null : parseFloat(rec), entered_by: user!.id,
        })
        if (error) throw error
      }
      toast('✔ Cuves enregistrées')
      await load()
    } catch (e) { toast('⚠ ' + (e as Error).message) } finally { setBusy(false) }
  }

  async function saveCaisse() {
    setBusy(true)
    try {
      for (const m of ['especes', 'orange_money', 'moov_money']) {
        const raw = gv('csh_' + m, cashOf(m) ? String(cashOf(m)!.amount_fcfa) : '')
        if (raw === '') continue
        const amt = parseFloat(raw) || 0
        const existing = cashOf(m)
        if (existing) {
          const { error } = await supabase.from('cash_entries').update({ amount_fcfa: amt }).eq('id', existing.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('cash_entries').insert({ station_id: stationId, day, method: m, amount_fcfa: amt, entered_by: user!.id })
          if (error) throw error
        }
      }
      toast('✔ Caisse enregistrée')
      await load()
    } catch (e) { toast('⚠ ' + (e as Error).message) } finally { setBusy(false) }
  }

  async function addCreditSale() {
    const amt = parseFloat(gv('cr_amt'))
    if (!(amt > 0)) return toast('Montant requis')
    setBusy(true)
    try {
      const { error } = await supabase.from('cash_entries').insert({
        station_id: stationId, day, method: 'credit', amount_fcfa: amt,
        credit_client_id: gv('cr_client', clients[0]?.id), entered_by: user!.id,
      })
      if (error) throw error
      toast('✔ Vente à crédit ajoutée')
      await load()
    } catch (e) { toast('⚠ ' + (e as Error).message) } finally { setBusy(false) }
  }

  async function addExpense() {
    const amt = parseFloat(gv('ex_amt'))
    if (!(amt > 0)) return toast('Montant requis')
    setBusy(true)
    try {
      const { error } = await supabase.from('expenses').insert({
        station_id: stationId, day, category: gv('ex_cat', 'autre'),
        label: gv('ex_lbl').trim(), amount_fcfa: amt, entered_by: user!.id,
      })
      if (error) throw error
      toast('✔ Dépense ajoutée')
      await load()
    } catch (e) { toast('⚠ ' + (e as Error).message) } finally { setBusy(false) }
  }

  async function del(table: 'deliveries' | 'cash_entries' | 'expenses', id: string) {
    setBusy(true)
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      await load()
    } catch (e) { toast('⚠ ' + (e as Error).message) } finally { setBusy(false) }
  }

  async function doCloture() {
    if (!infra || !data) return
    setBusy(true)
    try {
      const c = await computeDay(st!, day, data, infra, prices)
      if (!c.complet) { toast('⚠ Il manque des relevés (index de fermeture ou jauges).'); setBusy(false); return }
      const sansPrix = c.lignes.filter((l) => l.ventes > 0 && !(l.prix > 0))
      if (sansPrix.length && !confirm(`Aucun prix de vente pour : ${sansPrix.map((l) => l.produit).join(', ')}.\nLe CA et l'écart de caisse seront faussés (0). Clôturer quand même ?`)) { setBusy(false); return }
      if (!c.cashOk && !confirm('Aucun encaissement saisi. Clôturer quand même ?')) { setBusy(false); return }
      if (data.closure && data.closure.status === 'reopened') {
        const { error } = await supabase.from('day_closures').update({ status: 'closed', summary: c as never, closed_by: user!.id, closed_at: new Date().toISOString() }).eq('id', data.closure.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('day_closures').insert({ station_id: stationId, day, closed_by: user!.id, summary: c as never })
        if (error) throw error
      }
      await supabase.from('audit_log').insert({ station_id: stationId, action: 'cloture', entity: 'day_closures', entity_id: day, detail: { ecartCaisse: c.ecartCaisse, ecartCuve: c.ecartCuve } })
      toast('✅ Journée clôturée')
      await load()
    } catch (e) { toast('⚠ ' + (e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div>
      <Header stations={stations} stationId={stationId} setStationId={setStationId} day={day} setDay={setDay} />

      {/* Étape 1 — index pompes */}
      <StepCard num={1} title="Index des pompes" hint={frDate(day)} done={done1} defaultOpen={!done1}>
        {infra.nozzles.map((n) => (
          <div key={n.id} className="mb-2">
            <div className="text-[13px] font-semibold py-1">⛽ {n.name}</div>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="block text-[12px] text-ink2 mb-1">Ouverture</span>
                <Input type="number" inputMode="decimal"
                  value={gv('op_' + n.id, String(rOf(n.id)?.opening_index ?? openMap[n.id] ?? 0))}
                  onChange={(e) => setV('op_' + n.id, e.target.value)} />
              </label>
              <label className="block">
                <span className="block text-[12px] text-ink2 mb-1">Fermeture</span>
                <Input type="number" inputMode="decimal" placeholder="index ce soir"
                  value={gv('cl_' + n.id, rOf(n.id)?.closing_index != null ? String(rOf(n.id)!.closing_index) : '')}
                  onChange={(e) => setV('cl_' + n.id, e.target.value)} />
              </label>
            </div>
            <Select className="mt-2" value={gv('stf_' + n.id, rOf(n.id)?.staff_id ?? '')} onChange={(e) => setV('stf_' + n.id, e.target.value)}>
              <option value="">— Pompiste (optionnel) —</option>
              {staff.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </Select>
          </div>
        ))}
        <Button className="mt-2" onClick={savePompes} disabled={busy}>Enregistrer les index</Button>
      </StepCard>

      {/* Étape 2 — cuves & livraisons */}
      <StepCard num={2} title="Cuves & livraisons" hint="en litres" done={done2}>
        {infra.tanks.map((t) => (
          <div key={t.id} className="mb-2">
            <div className="text-[13px] font-semibold py-1">🛢 {t.name} — {PRODUITS[t.product]} (cap. {fmt(t.capacity_l)} L)</div>
            <Input type="number" inputMode="decimal" placeholder="niveau mesuré"
              value={gv('dip_' + t.id, dOf(t.id) ? String(dOf(t.id)!.dip_l) : '')}
              onChange={(e) => setV('dip_' + t.id, e.target.value)} />
          </div>
        ))}
        <div className="text-[13px] font-semibold py-1 mt-1">🚚 Livraison reçue (laisser vide si aucune)</div>
        <div className="grid grid-cols-2 gap-2.5">
          <Select value={gv('dl_tank', infra.tanks[0]?.id ?? '')} onChange={(e) => setV('dl_tank', e.target.value)}>
            {infra.tanks.map((t) => <option key={t.id} value={t.id}>{t.name} ({PRODUITS[t.product]})</option>)}
          </Select>
          <Input placeholder="Fournisseur" value={gv('dl_sup')} onChange={(e) => setV('dl_sup', e.target.value)} />
          <Input type="number" inputMode="decimal" placeholder="Volume facturé (L)" value={gv('dl_inv')} onChange={(e) => setV('dl_inv', e.target.value)} />
          <Input type="number" inputMode="decimal" placeholder="Volume reçu (L)" value={gv('dl_rec')} onChange={(e) => setV('dl_rec', e.target.value)} />
        </div>
        {data.deliveries.map((d) => {
          const t = infra.tanks.find((x) => x.id === d.tank_id)
          return (
            <div key={d.id} className="text-[12.5px] text-ink2 py-1">
              🚚 {t?.name} · {d.supplier} · facturé {fmt(d.volume_invoiced_l)} L · reçu {d.volume_received_l != null ? fmt(d.volume_received_l) + ' L' : '—'}
              <button className="text-crit ml-2" onClick={() => del('deliveries', d.id)}>retirer</button>
            </div>
          )
        })}
        <Button className="mt-2" onClick={saveCuves} disabled={busy}>Enregistrer cuves & livraison</Button>
      </StepCard>

      {/* Étape 3 — encaissements */}
      <StepCard num={3} title="Encaissements" hint="FCFA" done={done3}>
        <div className="grid grid-cols-2 gap-2.5">
          {['especes', 'orange_money', 'moov_money'].map((m) => (
            <label key={m} className="block">
              <span className="block text-[12px] text-ink2 mb-1">{METHODES[m]}</span>
              <Input type="number" inputMode="numeric" placeholder="0"
                value={gv('csh_' + m, cashOf(m) ? String(cashOf(m)!.amount_fcfa) : '')}
                onChange={(e) => setV('csh_' + m, e.target.value)} />
            </label>
          ))}
        </div>
        <div className="text-[13px] font-semibold py-1 mt-1">📒 Ventes à crédit du jour</div>
        {clients.length ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Select value={gv('cr_client', clients[0]?.id)} onChange={(e) => setV('cr_client', e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input type="number" inputMode="numeric" placeholder="Montant (FCFA)" value={gv('cr_amt')} onChange={(e) => setV('cr_amt', e.target.value)} />
            </div>
            <Button variant="ghost" className="mt-2" onClick={addCreditSale} disabled={busy}>+ Ajouter la vente à crédit</Button>
          </>
        ) : (
          <div className="text-[12.5px] text-ink3">Aucun client à crédit. Crée-les dans l'onglet Crédits.</div>
        )}
        {data.cash.filter((c) => c.method === 'credit').map((c) => {
          const cl = clients.find((x) => x.id === c.credit_client_id)
          return (
            <div key={c.id} className="text-[12.5px] text-ink2 py-1">
              📒 {cl?.name || 'client'} : {fmt(c.amount_fcfa)} F
              <button className="text-crit ml-2" onClick={() => del('cash_entries', c.id)}>retirer</button>
            </div>
          )
        })}
        <Button className="mt-2" onClick={saveCaisse} disabled={busy}>Enregistrer la caisse</Button>
      </StepCard>

      {/* Étape 4 — dépenses */}
      <StepCard num={4} title="Dépenses du jour" hint="FCFA · optionnel" done={done4}>
        <div className="grid grid-cols-2 gap-2.5">
          <Select value={gv('ex_cat', 'autre')} onChange={(e) => setV('ex_cat', e.target.value)}>
            {Object.entries(EXP_CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input type="number" inputMode="numeric" placeholder="Montant (FCFA)" value={gv('ex_amt')} onChange={(e) => setV('ex_amt', e.target.value)} />
        </div>
        <Input className="mt-2" placeholder="Libellé (optionnel)" value={gv('ex_lbl')} onChange={(e) => setV('ex_lbl', e.target.value)} />
        <Button variant="ghost" className="mt-2" onClick={addExpense} disabled={busy}>+ Ajouter la dépense</Button>
        {data.expenses.map((e) => (
          <div key={e.id} className="text-[12.5px] text-ink2 py-1">
            💸 {EXP_CATS[e.category] || e.category}{e.label ? ' · ' + e.label : ''} : {fmt(e.amount_fcfa)} F
            <button className="text-crit ml-2" onClick={() => del('expenses', e.id)}>retirer</button>
          </div>
        ))}
        {data.expenses.length > 0 && (
          <div className="text-[12.5px] font-bold pt-1.5">Total dépenses : {fmt(data.expenses.reduce((s, e) => s + Number(e.amount_fcfa), 0))} F</div>
        )}
      </StepCard>

      {isPompiste ? (
        <div className="text-center bg-brand-soft rounded-2xl p-3 text-brand font-semibold">
          Saisie enregistrée. La clôture est faite par le gérant ou le propriétaire.
        </div>
      ) : (
        <Button disabled={!(done1 && done2) || busy} onClick={doCloture}>✅ Clôturer la journée</Button>
      )}
      <p className="text-[11px] text-ink3 text-center mt-3">
        Les relevés restent modifiables jusqu'à la clôture. Après clôture, seul le propriétaire peut rouvrir.
      </p>
    </div>
  )
}

function Header({
  stations,
  stationId,
  setStationId,
  day,
  setDay,
}: {
  stations: Tables<'stations'>[]
  stationId: string
  setStationId: (v: string) => void
  day: string
  setDay: (v: string) => void
}) {
  return (
    <div className="mb-3">
      <h1 className="text-2xl font-extrabold mb-2">Saisie du jour</h1>
      <div className="flex gap-2 items-center flex-wrap">
        {stations.length > 1 && (
          <Select className="max-w-[60%]" value={stationId} onChange={(e) => setStationId(e.target.value)}>
            {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )}
        <input
          type="date"
          className="rounded-[10px] border border-grid bg-surface text-ink1 px-3 py-2 text-[14px]"
          value={day}
          max={todayISO()}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>
    </div>
  )
}
