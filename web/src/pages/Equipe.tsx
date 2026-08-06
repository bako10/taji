import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../context/Session'
import { supabase } from '../lib/supabase'
import { Button, Card, Field, Input, Select } from '../components/ui'
import { toast } from '../lib/toast'
import type { Tables } from '../lib/database.types'

type Staff = Tables<'staff'>

export function Equipe() {
  const { myStations } = useSession()
  const stations = myStations()
  const [stationId, setStationId] = useState(stations[0]?.id ?? '')
  const [staff, setStaff] = useState<Staff[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('pompiste')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!stationId) return
    setLoading(true)
    const { data } = await supabase.from('staff').select('*').eq('station_id', stationId).eq('active', true).order('full_name')
    setStaff(data ?? [])
    setLoading(false)
  }, [stationId])

  useEffect(() => { void load() }, [load])

  async function add() {
    if (!name.trim()) return toast('Nom requis')
    const { error } = await supabase.from('staff').insert({ station_id: stationId, full_name: name.trim(), phone: phone.trim() || null, role })
    if (error) return toast('⚠ ' + error.message)
    setName(''); setPhone('')
    toast('✔ Membre ajouté')
    await load()
  }

  async function remove(id: string) {
    if (!confirm('Retirer ce membre de l’équipe ?')) return
    const { error } = await supabase.from('staff').update({ active: false }).eq('id', id)
    if (error) return toast('⚠ ' + error.message)
    await load()
  }

  const ICON: Record<string, string> = { pompiste: '⛽', caissier: '💵', autre: '👤' }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-2">Équipe</h1>
      {stations.length > 1 && (
        <Select className="mb-3 max-w-[70%]" value={stationId} onChange={(e) => setStationId(e.target.value)}>
          {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      )}
      <Card className="mb-3">
        {loading ? (
          <div className="text-[13px] text-ink3">Chargement…</div>
        ) : staff.length === 0 ? (
          <p className="text-[13px] text-ink3">Aucun pompiste enregistré. Ajoutez-les ci-dessous pour suivre les litres servis par personne.</p>
        ) : (
          staff.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-grid last:border-0">
              <div className="text-[14px] font-semibold">{ICON[p.role] || '👤'} {p.full_name} <span className="text-[11px] text-ink3 font-normal">({p.role})</span></div>
              <button className="text-crit text-[13px]" onClick={() => remove(p.id)}>retirer</button>
            </div>
          ))
        )}
      </Card>
      <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Ajouter un membre</h2>
      <Card>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Nom complet"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom Nom" /></Field>
          <Field label="Téléphone"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+223 …" /></Field>
        </div>
        <Field label="Rôle">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="pompiste">Pompiste</option>
            <option value="caissier">Caissier</option>
            <option value="autre">Autre</option>
          </Select>
        </Field>
        <Button onClick={add}>+ Ajouter</Button>
      </Card>
      <p className="text-[11px] text-ink3 text-center mt-4">
        Ces membres servent à attribuer les litres par pompiste lors de la saisie. Pour donner un
        accès à l'application, générez un code d'invitation dans Réglages.
      </p>
    </div>
  )
}
