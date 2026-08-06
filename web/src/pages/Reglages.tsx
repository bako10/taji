import { useState } from 'react'
import { useSession } from '../context/Session'
import { supabase } from '../lib/supabase'
import { PRODUITS } from '../lib/constants'
import { latestPrice, latestBuyPrice } from '../lib/prices'
import { Button, Card, Field, Input } from '../components/ui'
import { toast } from '../lib/toast'
import { StationConfig } from './StationConfig'
import type { Tables } from '../lib/database.types'

export function Reglages() {
  const { profile, role, isOwner, user, orgs, prices, refresh, signOut, myStations } = useSession()
  const stations = myStations()
  const org = orgs.find((o) => o.owner_id === user?.id)
  const [cfg, setCfg] = useState<Tables<'stations'> | null>(null)

  const [name, setName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [px, setPx] = useState<Record<string, string>>({})
  const [buy, setBuy] = useState<Record<string, string>>({})
  const [nsName, setNsName] = useState('')
  const [nsCity, setNsCity] = useState('')

  if (cfg) {
    return <StationConfig station={cfg} onBack={() => setCfg(null)} onChanged={refresh} />
  }

  async function saveProfile() {
    const { error } = await supabase.from('profiles').upsert({ id: user!.id, full_name: name.trim(), phone: phone.trim() })
    if (error) return toast('⚠ ' + error.message)
    await refresh()
    toast('✔ Profil enregistré')
  }

  async function savePrices() {
    if (!org) return
    const rows: { org_id: string; product: string; price_fcfa: number; buy_price_fcfa: number | null; created_by: string }[] = []
    for (const p of Object.keys(PRODUITS)) {
      const curSale = latestPrice(prices, org.id, p)
      const curBuy = latestBuyPrice(prices, org.id, p)
      const saleChanged = (px[p] ?? '') !== '' && Number(px[p]) !== curSale
      const buyChanged = (buy[p] ?? '') !== '' && Number(buy[p]) !== curBuy
      if (!(saleChanged || buyChanged)) continue
      const vSale = (px[p] ?? '') === '' ? curSale : Number(px[p])
      const vBuy = (buy[p] ?? '') === '' ? curBuy : Number(buy[p])
      if (!(vSale && vSale > 0)) { toast('Prix de vente requis — ' + PRODUITS[p]); continue }
      rows.push({ org_id: org.id, product: p, price_fcfa: vSale, buy_price_fcfa: vBuy != null && vBuy >= 0 ? vBuy : null, created_by: user!.id })
    }
    if (!rows.length) return toast('Aucun changement')
    const { error } = await supabase.from('prices').insert(rows)
    if (error) return toast('⚠ ' + error.message)
    await refresh()
    setPx({}); setBuy({})
    toast('✔ Prix mis à jour')
  }

  async function addStation() {
    if (!org) return
    if (!nsName.trim()) return toast('Nom requis')
    const { error } = await supabase.from('stations').insert({ org_id: org.id, name: nsName.trim(), city: nsCity.trim() })
    if (error) return toast('⚠ ' + error.message)
    setNsName(''); setNsCity('')
    await refresh()
    toast('✔ Station créée — configure ses cuves et pistolets')
  }

  function setTheme(mode: 'light' | 'dark' | 'system') {
    localStorage.setItem('taji-theme', mode)
    const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
    toast('Thème : ' + (mode === 'light' ? 'clair' : mode === 'dark' ? 'sombre' : 'automatique'))
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Réglages</h1>
      <p className="text-[13px] text-ink3 mb-4">
        {profile?.full_name || ''} — {role === 'proprietaire' ? 'Propriétaire' : role === 'gerant' ? 'Gérant' : 'Pompiste'}
      </p>

      <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Mon profil</h2>
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Nom complet"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Téléphone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        </div>
        <Button variant="ghost" onClick={saveProfile}>Enregistrer</Button>
      </Card>

      {isOwner && org && (
        <>
          <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Prix vente / achat (FCFA / L)</h2>
          <Card className="mb-4">
            {Object.keys(PRODUITS).map((p) => {
              const cur = latestPrice(prices, org.id, p)
              const curBuy = latestBuyPrice(prices, org.id, p)
              if (cur === null && !['essence', 'gasoil'].includes(p)) return null
              return (
                <div key={p} className="flex items-end justify-between py-1.5 border-b border-grid last:border-0">
                  <span className="text-[14px]">{PRODUITS[p]}</span>
                  <div className="flex gap-2 items-end">
                    <label className="text-center">
                      <div className="text-[9.5px] text-ink3 font-bold mb-0.5">VENTE</div>
                      <Input className="w-[78px]" type="number" placeholder={cur != null ? String(cur) : '—'} value={px[p] ?? (cur != null ? String(cur) : '')} onChange={(e) => setPx((s) => ({ ...s, [p]: e.target.value }))} />
                    </label>
                    <label className="text-center">
                      <div className="text-[9.5px] text-ink3 font-bold mb-0.5">ACHAT</div>
                      <Input className="w-[78px]" type="number" placeholder={curBuy != null ? String(curBuy) : '—'} value={buy[p] ?? (curBuy != null ? String(curBuy) : '')} onChange={(e) => setBuy((s) => ({ ...s, [p]: e.target.value }))} />
                    </label>
                  </div>
                </div>
              )
            })}
            <Button variant="ghost" className="mt-2" onClick={savePrices}>Mettre à jour les prix</Button>
            <p className="text-[11px] text-ink3 mt-1">Le prix d'achat sert au calcul de la marge nette. Chaque changement est historisé.</p>
          </Card>

          <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Mes stations</h2>
          {stations.map((st) => (
            <Card key={st.id} className="mb-2 cursor-pointer" >
              <div className="flex items-center justify-between" onClick={() => setCfg(st)}>
                <div>
                  <div className="font-bold">{st.name}</div>
                  <div className="text-[12px] text-ink3">{st.city} — cuves, pistolets, invitations</div>
                </div>
                <span className="text-ink3">›</span>
              </div>
            </Card>
          ))}
          <Card className="mb-4">
            <b className="text-[13.5px]">Nouvelle station</b>
            <div className="grid grid-cols-2 gap-2.5 mt-2">
              <Field label="Nom"><Input value={nsName} onChange={(e) => setNsName(e.target.value)} placeholder="Station …" /></Field>
              <Field label="Ville / quartier"><Input value={nsCity} onChange={(e) => setNsCity(e.target.value)} /></Field>
            </div>
            <Button variant="ghost" onClick={addStation}>+ Ajouter la station</Button>
          </Card>
        </>
      )}

      <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Thème</h2>
      <Card className="mb-4">
        <div className="grid grid-cols-3 gap-2">
          <Button variant="ghost" onClick={() => setTheme('light')}>☀️ Clair</Button>
          <Button variant="ghost" onClick={() => setTheme('dark')}>🌙 Sombre</Button>
          <Button variant="ghost" onClick={() => setTheme('system')}>⚙️ Auto</Button>
        </div>
      </Card>

      <Card>
        <Button variant="danger" onClick={() => signOut()}>Se déconnecter</Button>
      </Card>
      <p className="text-[11px] text-ink3 text-center mt-6">
        Taji v2 — vos données sont sauvegardées en ligne et sécurisées par compte. Chaque action
        sensible est tracée dans le journal d'audit.
      </p>
    </div>
  )
}
