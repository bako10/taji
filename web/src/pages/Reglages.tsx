import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../context/Session'
import { supabase } from '../lib/supabase'
import { Button, Card, Field, Input } from '../components/ui'
import { toast } from '../lib/toast'
import { StationConfig } from './StationConfig'
import { PriceEditor } from './PriceEditor'
import type { Tables } from '../lib/database.types'

export function Reglages() {
  const { profile, role, isOwner, user, orgs, prices, refresh, signOut, myStations } = useSession()
  const stations = myStations()
  const org = orgs.find((o) => o.owner_id === user?.id)
  const [cfg, setCfg] = useState<Tables<'stations'> | null>(null)

  const [name, setName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
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
          <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Activité</h2>
          <Link to="/journal">
            <Card className="mb-4 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">📋 Journal d'activité</div>
                  <div className="text-[12px] text-ink3">Clôtures, réouvertures, prix, suppressions, accès…</div>
                </div>
                <span className="text-ink3">›</span>
              </div>
            </Card>
          </Link>

          <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Prix vente / achat (FCFA / L)</h2>
          <PriceEditor org={org} prices={prices} userId={user!.id} onSaved={refresh} />

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
