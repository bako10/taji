import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PRODUITS } from '../lib/constants'
import { fmt } from '../lib/format'
import { Button, Card, Input, Select } from '../components/ui'
import { toast } from '../lib/toast'
import type { Tables } from '../lib/database.types'

type Station = Tables<'stations'>
type Tank = Tables<'tanks'>
type Nozzle = Tables<'nozzles'>
type Invite = Tables<'invites'>
type Member = Tables<'station_members'> & { profiles: { full_name: string } | null }

export function StationConfig({ station, onBack, onChanged }: { station: Station; onBack: () => void; onChanged: () => void }) {
  const [tanks, setTanks] = useState<Tank[]>([])
  const [nozzles, setNozzles] = useState<Nozzle[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [requirePhoto, setRequirePhoto] = useState(station.require_photo)
  // formulaires
  const [tp, setTp] = useState('essence'), [tn, setTn] = useState(''), [tc, setTc] = useState(''), [tsk, setTsk] = useState('')
  const [nt, setNt] = useState(''), [nn, setNn] = useState(''), [ni, setNi] = useState('')

  const load = useCallback(async () => {
    const [tk, nz, inv, mb] = await Promise.all([
      supabase.from('tanks').select('*').eq('station_id', station.id).eq('active', true).order('created_at'),
      supabase.from('nozzles').select('*').eq('station_id', station.id).eq('active', true).order('created_at'),
      supabase.from('invites').select('*').eq('station_id', station.id).order('created_at', { ascending: false }),
      supabase.from('station_members').select('*, profiles:user_id(full_name)').eq('station_id', station.id),
    ])
    setTanks(tk.data ?? [])
    setNozzles(nz.data ?? [])
    setInvites(inv.data ?? [])
    setMembers((mb.data ?? []) as unknown as Member[])
    if (!nt && (tk.data?.length)) setNt(tk.data[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station.id])

  useEffect(() => { void load() }, [load])

  async function addTank() {
    const cap = Number(tc)
    if (!(cap > 0)) return toast('Capacité requise')
    const { error } = await supabase.from('tanks').insert({ station_id: station.id, product: tp, name: tn.trim() || 'Cuve', capacity_l: cap, initial_stock_l: Number(tsk) || 0 })
    if (error) return toast('⚠ ' + error.message)
    setTn(''); setTc(''); setTsk('')
    toast('✔ Cuve ajoutée'); await load()
  }
  async function addNozzle() {
    if (!nt) return toast('Choisir une cuve')
    const { error } = await supabase.from('nozzles').insert({ station_id: station.id, tank_id: nt, name: nn.trim() || 'Pistolet', initial_index: Number(ni) || 0 })
    if (error) return toast('⚠ ' + error.message)
    setNn(''); setNi('')
    toast('✔ Pistolet ajouté'); await load()
  }
  async function makeInvite(role: 'gerant' | 'pompiste') {
    const code = 'TJ' + Math.random().toString(36).slice(2, 6).toUpperCase()
    const { error } = await supabase.from('invites').insert({ code, org_id: station.org_id, station_id: station.id, role })
    if (error) return toast('⚠ ' + error.message)
    await supabase.from('audit_log').insert({ station_id: station.id, org_id: station.org_id, action: 'invitation', entity: 'invites', entity_id: code, detail: { role, station: station.name } })
    toast('✔ Code ' + role + ' généré'); await load()
  }
  async function revoke(id: string) {
    if (!confirm('Révoquer l’accès de ce membre ?')) return
    const m = members.find((x) => x.id === id)
    const { error } = await supabase.from('station_members').update({ active: false }).eq('id', id)
    if (error) return toast('⚠ ' + error.message)
    await supabase.from('audit_log').insert({ station_id: station.id, org_id: station.org_id, action: 'revocation', entity: 'station_members', entity_id: id, detail: { role: m?.role, nom: m?.profiles?.full_name, station: station.name } })
    toast('Accès révoqué'); await load()
  }
  async function togglePhoto(v: boolean) {
    setRequirePhoto(v)
    const { error } = await supabase.from('stations').update({ require_photo: v }).eq('id', station.id)
    if (error) { toast('⚠ ' + error.message); setRequirePhoto(!v); return }
    onChanged()
  }

  const pending = invites.filter((i) => !i.used_by)

  return (
    <div>
      <button className="text-brand font-bold text-[14px] mb-3" onClick={onBack}>‹ Réglages</button>
      <h1 className="text-2xl font-extrabold">{station.name}</h1>
      <div className="text-[13px] text-ink3 mb-3">{station.city}</div>

      <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Cuves</h2>
      <Card className="mb-3">
        {tanks.map((t) => (
          <div key={t.id} className="py-1.5 border-b border-grid last:border-0">
            <div className="text-[14px] font-semibold">🛢 {t.name}</div>
            <div className="text-[12px] text-ink3">{PRODUITS[t.product]} · capacité {fmt(t.capacity_l)} L</div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Select value={tp} onChange={(e) => setTp(e.target.value)}>{Object.entries(PRODUITS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Input placeholder="Nom" value={tn} onChange={(e) => setTn(e.target.value)} />
          <Input type="number" placeholder="Capacité (L)" value={tc} onChange={(e) => setTc(e.target.value)} />
          <Input type="number" placeholder="Stock actuel (L)" value={tsk} onChange={(e) => setTsk(e.target.value)} />
        </div>
        <Button variant="ghost" className="mt-2" onClick={addTank}>+ Ajouter une cuve</Button>
      </Card>

      <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Pistolets</h2>
      <Card className="mb-3">
        {nozzles.map((n) => {
          const t = tanks.find((x) => x.id === n.tank_id)
          return (
            <div key={n.id} className="py-1.5 border-b border-grid last:border-0">
              <div className="text-[14px] font-semibold">⛽ {n.name}</div>
              <div className="text-[12px] text-ink3">{t?.name ?? ''} · index initial {fmt(n.initial_index)}</div>
            </div>
          )
        })}
        {tanks.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Select value={nt} onChange={(e) => setNt(e.target.value)}>{tanks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
              <Input placeholder="Nom" value={nn} onChange={(e) => setNn(e.target.value)} />
            </div>
            <Input className="mt-2" type="number" placeholder="Index actuel du compteur" value={ni} onChange={(e) => setNi(e.target.value)} />
            <Button variant="ghost" className="mt-2" onClick={addNozzle}>+ Ajouter un pistolet</Button>
          </>
        )}
      </Card>

      <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Équipe (accès à l'application)</h2>
      <Card className="mb-3">
        {members.filter((m) => m.active).map((m) => (
          <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-grid last:border-0">
            <div className="text-[14px]">{m.role === 'pompiste' ? '⛽' : '🧑‍🔧'} {m.profiles?.full_name || '—'} <span className="text-[11px] text-ink3">({m.role})</span></div>
            <button className="text-crit text-[13px]" onClick={() => revoke(m.id)}>révoquer</button>
          </div>
        ))}
        {members.filter((m) => m.active).length === 0 && <p className="text-[13px] text-ink3">Aucun membre rattaché.</p>}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button variant="ghost" onClick={() => makeInvite('gerant')}>+ Code gérant</Button>
          <Button variant="ghost" onClick={() => makeInvite('pompiste')}>+ Code pompiste</Button>
        </div>
        {pending.map((i) => (
          <div key={i.code} className="mt-2">
            <div className="text-2xl font-extrabold tracking-[4px] text-center bg-brand-soft text-brand rounded-xl py-3">{i.code}</div>
            <div className="text-[12px] text-ink3 text-center">Code <b>{i.role}</b> — la personne crée son compte puis saisit ce code.</div>
          </div>
        ))}
      </Card>

      <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Preuve photo</h2>
      <Card>
        <label className="flex items-center justify-between">
          <span className="text-[14px]">Exiger une photo pour les saisies</span>
          <input type="checkbox" checked={requirePhoto} onChange={(e) => togglePhoto(e.target.checked)} className="w-5 h-5" />
        </label>
        <p className="text-[11px] text-ink3 mt-1">Fonctionnalité de capture disponible dans une prochaine version (PWA v2).</p>
      </Card>
    </div>
  )
}
