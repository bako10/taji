import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthShell } from '../components/AuthShell'
import { Button, Field, Input, Select } from '../components/ui'
import { PRODUITS } from '../lib/constants'
import { fmt } from '../lib/format'
import { toast } from '../lib/toast'
import { useSession } from '../context/Session'

type Tank = { product: string; name: string; capacity: number; stock: number }
type Nozzle = { tank: number; name: string; index: number }

export function Onboarding() {
  const nav = useNavigate()
  const { user, refresh } = useSession()
  const [step, setStep] = useState(1)
  const [org, setOrg] = useState('')
  const [stName, setStName] = useState('')
  const [stCity, setStCity] = useState('')
  const [tanks, setTanks] = useState<Tank[]>([])
  const [nozzles, setNozzles] = useState<Nozzle[]>([])
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [buyPrices, setBuyPrices] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  // formulaires d'ajout
  const [tp, setTp] = useState('essence')
  const [tn, setTn] = useState('')
  const [tc, setTc] = useState('')
  const [ts, setTs] = useState('')
  const [nt, setNt] = useState(0)
  const [nn, setNn] = useState('')
  const [ni, setNi] = useState('')

  const products = [...new Set(tanks.map((t) => t.product))]

  function addTank() {
    const cap = Number(tc)
    if (!(cap > 0)) return toast('Capacité requise')
    setTanks((a) => [...a, { product: tp, name: tn.trim() || 'Cuve ' + (a.length + 1), capacity: cap, stock: Number(ts) || 0 }])
    setTn(''); setTc(''); setTs('')
  }
  function addNozzle() {
    setNozzles((a) => [...a, { tank: nt, name: nn.trim() || 'Pistolet ' + (a.length + 1), index: Number(ni) || 0 }])
    setNn(''); setNi('')
  }

  async function finish() {
    setBusy(true)
    try {
      const org1 = await supabase.from('organizations').insert({ name: org, owner_id: user!.id }).select().single()
      if (org1.error) throw org1.error
      const orgId = org1.data.id
      const st1 = await supabase.from('stations').insert({ org_id: orgId, name: stName, city: stCity }).select().single()
      if (st1.error) throw st1.error
      const stId = st1.data.id
      const tankRes = await supabase.from('tanks').insert(
        tanks.map((t) => ({ station_id: stId, product: t.product, name: t.name, capacity_l: t.capacity, initial_stock_l: t.stock })),
      ).select()
      if (tankRes.error) throw tankRes.error
      const tankRows = tankRes.data
      const nzRes = await supabase.from('nozzles').insert(
        nozzles.map((n) => ({ station_id: stId, tank_id: tankRows[n.tank].id, name: n.name, initial_index: n.index })),
      )
      if (nzRes.error) throw nzRes.error
      const priceRows = products
        .map((p) => {
          const v = Number(prices[p])
          const b = Number(buyPrices[p]) || 0
          return v > 0 ? { org_id: orgId, product: p, price_fcfa: v, buy_price_fcfa: b > 0 ? b : null, created_by: user!.id } : null
        })
        .filter(Boolean) as { org_id: string; product: string; price_fcfa: number; buy_price_fcfa: number | null; created_by: string }[]
      if (priceRows.length) {
        const pr = await supabase.from('prices').insert(priceRows)
        if (pr.error) throw pr.error
      }
      await refresh()
      toast('✔ Station créée')
      nav('/', { replace: true })
    } catch (e) {
      toast('⚠ ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      {step === 1 && (
        <>
          <p className="text-[14px] mb-2.5"><b>Étape 1/4 — Ton entreprise</b></p>
          <Field label="Nom de l'entreprise / du réseau">
            <Input placeholder="Ex : Sangaré Distribution" value={org} onChange={(e) => setOrg(e.target.value)} />
          </Field>
          <Button onClick={() => (org.trim() ? setStep(2) : toast('Nom requis'))}>Continuer</Button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-[14px] mb-2.5"><b>Étape 2/4 — Ta première station</b></p>
          <Field label="Nom de la station"><Input placeholder="Ex : Station Faladié" value={stName} onChange={(e) => setStName(e.target.value)} /></Field>
          <Field label="Ville / quartier"><Input placeholder="Ex : Bamako — Faladié" value={stCity} onChange={(e) => setStCity(e.target.value)} /></Field>
          <Button onClick={() => (stName.trim() ? setStep(3) : toast('Nom requis'))}>Continuer</Button>
          <BackLink onClick={() => setStep(1)} />
        </>
      )}

      {step === 3 && (
        <>
          <p className="text-[14px] mb-2.5"><b>Étape 3/4 — Cuves et pistolets</b></p>
          {tanks.map((t, i) => (
            <div key={i} className="text-[12.5px] py-1">
              🛢 {t.name} — {PRODUITS[t.product]} · {fmt(t.capacity)} L · stock {fmt(t.stock)} L
              {nozzles.filter((n) => n.tank === i).map((n, j) => (
                <div key={j} className="text-ink2 pl-3">⛽ {n.name} — index {fmt(n.index)}</div>
              ))}
            </div>
          ))}
          <div className="bg-page rounded-xl p-2.5 mt-2">
            <b className="text-[13px]">Ajouter une cuve</b>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Select value={tp} onChange={(e) => setTp(e.target.value)}>
                {Object.entries(PRODUITS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <Input placeholder="Nom (Cuve 1)" value={tn} onChange={(e) => setTn(e.target.value)} />
              <Input type="number" placeholder="Capacité (L)" value={tc} onChange={(e) => setTc(e.target.value)} />
              <Input type="number" placeholder="Stock actuel (L)" value={ts} onChange={(e) => setTs(e.target.value)} />
            </div>
            <Button variant="ghost" className="mt-2" onClick={addTank}>+ Ajouter la cuve</Button>
          </div>
          {tanks.length > 0 && (
            <div className="bg-page rounded-xl p-2.5 mt-2">
              <b className="text-[13px]">Ajouter un pistolet</b>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Select value={nt} onChange={(e) => setNt(Number(e.target.value))}>
                  {tanks.map((t, i) => <option key={i} value={i}>{t.name} ({PRODUITS[t.product]})</option>)}
                </Select>
                <Input placeholder="Nom (Pompe 1)" value={nn} onChange={(e) => setNn(e.target.value)} />
              </div>
              <Input className="mt-2" type="number" placeholder="Index actuel du compteur" value={ni} onChange={(e) => setNi(e.target.value)} />
              <Button variant="ghost" className="mt-2" onClick={addNozzle}>+ Ajouter le pistolet</Button>
            </div>
          )}
          <Button className="mt-3" onClick={() => (tanks.length && nozzles.length ? setStep(4) : toast('Ajoute au moins une cuve et un pistolet'))}>Continuer</Button>
          <BackLink onClick={() => setStep(2)} />
        </>
      )}

      {step === 4 && (
        <>
          <p className="text-[14px] mb-2.5"><b>Étape 4/4 — Prix vente / achat (FCFA / litre)</b></p>
          {products.map((p) => (
            <div key={p} className="flex items-end justify-between py-1.5 border-b border-grid">
              <span className="text-[14px]">{PRODUITS[p]}</span>
              <div className="flex gap-2 items-end">
                <label className="text-center">
                  <div className="text-[9.5px] text-ink3 font-bold mb-0.5">VENTE</div>
                  <Input className="w-[78px]" type="number" placeholder="775" value={prices[p] ?? ''} onChange={(e) => setPrices((s) => ({ ...s, [p]: e.target.value }))} />
                </label>
                <label className="text-center">
                  <div className="text-[9.5px] text-ink3 font-bold mb-0.5">ACHAT</div>
                  <Input className="w-[78px]" type="number" placeholder="700" value={buyPrices[p] ?? ''} onChange={(e) => setBuyPrices((s) => ({ ...s, [p]: e.target.value }))} />
                </label>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-ink3 my-2">Le prix d'achat (optionnel) active le calcul de la marge nette.</p>
          <Button onClick={finish} disabled={busy}>{busy ? 'Création…' : '🚀 Créer ma station'}</Button>
          <BackLink onClick={() => setStep(3)} />
        </>
      )}
    </AuthShell>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <div className="text-center text-[13px] text-ink2 mt-3">
      <button className="text-brand font-bold" onClick={onClick}>‹ Retour</button>
    </div>
  )
}
