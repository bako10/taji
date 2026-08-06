import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../context/Session'
import { supabase } from '../lib/supabase'
import { fmt, frDateShort, todayISO } from '../lib/format'
import { Button, Card, Chip, Field, Input } from '../components/ui'
import { toast } from '../lib/toast'
import type { Tables } from '../lib/database.types'

type Client = Tables<'credit_clients'>
type Payment = Tables<'credit_payments'>

export function Credits() {
  const { myStations, user } = useSession()
  const stations = myStations()
  const orgIds = [...new Set(stations.map((s) => s.org_id))]
  const [clients, setClients] = useState<Client[]>([])
  const [sales, setSales] = useState<{ credit_client_id: string | null; amount_fcfa: number }[]>([])
  const [pays, setPays] = useState<{ credit_client_id: string; amount_fcfa: number }[]>([])
  const [sel, setSel] = useState<Client | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [plaf, setPlaf] = useState('0')
  const [payAmt, setPayAmt] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!orgIds.length) { setLoading(false); return }
    setLoading(true)
    const [cl, sa, pa] = await Promise.all([
      supabase.from('credit_clients').select('*').in('org_id', orgIds).order('name'),
      supabase.from('cash_entries').select('credit_client_id,amount_fcfa').eq('method', 'credit').not('credit_client_id', 'is', null),
      supabase.from('credit_payments').select('credit_client_id,amount_fcfa'),
    ])
    setClients(cl.data ?? [])
    setSales(sa.data ?? [])
    setPays(pa.data ?? [])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgIds.join(',')])

  useEffect(() => { void load() }, [load])

  const encours = (id: string) =>
    sales.filter((s) => s.credit_client_id === id).reduce((a, b) => a + Number(b.amount_fcfa), 0) -
    pays.filter((p) => p.credit_client_id === id).reduce((a, b) => a + Number(b.amount_fcfa), 0)

  const total = clients.filter((c) => c.active).reduce((a, c) => a + encours(c.id), 0)

  async function addClient() {
    if (!name.trim()) return toast('Nom requis')
    const { error } = await supabase.from('credit_clients').insert({
      org_id: orgIds[0], name: name.trim(), phone: phone.trim() || null, plafond_fcfa: Number(plaf) || 0,
    })
    if (error) return toast('⚠ ' + error.message)
    setName(''); setPhone(''); setPlaf('0')
    toast('✔ Client ajouté')
    await load()
  }

  async function openClient(c: Client) {
    setSel(c)
    const { data } = await supabase.from('credit_payments').select('*').eq('credit_client_id', c.id).order('day', { ascending: false })
    setPayments(data ?? [])
  }

  async function addPayment() {
    if (!sel) return
    const amt = Number(payAmt)
    if (!(amt > 0)) return toast('Montant requis')
    const { error } = await supabase.from('credit_payments').insert({
      credit_client_id: sel.id, station_id: stations[0]?.id ?? null, day: todayISO(), amount_fcfa: amt, method: 'especes', entered_by: user?.id,
    })
    if (error) return toast('⚠ ' + error.message)
    setPayAmt('')
    toast('✔ Paiement enregistré')
    await load()
    await openClient(sel)
  }

  if (sel) {
    return (
      <div>
        <button className="text-brand font-bold text-[14px] mb-3" onClick={() => setSel(null)}>‹ Retour</button>
        <h1 className="text-2xl font-extrabold">{sel.name}</h1>
        <div className="text-[13px] text-ink3 mb-3">{sel.phone || ''}</div>
        <Card className="mb-3">
          <div className="text-[10.5px] font-bold text-ink3">ENCOURS</div>
          <div className={`text-2xl font-extrabold ${encours(sel.id) > 0 ? 'text-crit' : ''}`}>{fmt(encours(sel.id))} F</div>
          {sel.plafond_fcfa > 0 && <div className="text-[12px] text-ink3">plafond {fmt(sel.plafond_fcfa)} F</div>}
        </Card>
        <Card className="mb-3">
          <Field label="Enregistrer un remboursement (FCFA)">
            <Input type="number" inputMode="numeric" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} placeholder="0" />
          </Field>
          <Button onClick={addPayment}>+ Enregistrer le paiement</Button>
        </Card>
        <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Paiements</h2>
        <Card>
          {payments.length === 0 ? (
            <div className="text-[13px] text-ink3">Aucun paiement.</div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="flex justify-between text-[13px] py-1 border-b border-grid last:border-0">
                <span>{frDateShort(p.day)}</span>
                <span className="font-semibold">{fmt(p.amount_fcfa)} F</span>
              </div>
            ))
          )}
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Crédits clients</h1>
      <p className="text-[13px] text-ink3 mb-3">Transporteurs, entreprises, clients réguliers</p>
      {loading ? (
        <Card>Chargement…</Card>
      ) : (
        <>
          <Card className="mb-3">
            <div className="text-[11px] font-bold text-ink3">ENCOURS TOTAL</div>
            <div className={`text-2xl font-extrabold ${total > 0 ? 'text-crit' : ''}`}>{fmt(total)} F</div>
            <div className="text-[12px] text-ink3">montant dû par l'ensemble des clients</div>
          </Card>

          <Card className="mb-3">
            {clients.filter((c) => c.active).length === 0 && (
              <p className="text-[13px] text-ink3">Aucun client à crédit. Ajoute le premier ci-dessous.</p>
            )}
            {clients.filter((c) => c.active).map((c) => {
              const e = encours(c.id)
              const depasse = c.plafond_fcfa > 0 && e > c.plafond_fcfa
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-grid last:border-0 cursor-pointer" onClick={() => openClient(c)}>
                  <div>
                    <div className="font-semibold text-[14px] flex items-center gap-2">
                      {c.name} {depasse && <Chip statut="crit" />}
                    </div>
                    <div className="text-[12px] text-ink3">{c.phone || ''}{c.plafond_fcfa > 0 ? ` · plafond ${fmt(c.plafond_fcfa)} F` : ''}</div>
                  </div>
                  <div className="text-right">
                    <b className={e > 0 ? 'text-crit' : ''}>{fmt(e)} F</b>
                    <div className="text-[11px] text-ink3">encours</div>
                  </div>
                </div>
              )
            })}
          </Card>

          <h2 className="text-[13px] font-bold text-ink3 mb-2 uppercase">Nouveau client</h2>
          <Card>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Nom"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Transport Diallo" /></Field>
              <Field label="Téléphone"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+223 …" /></Field>
            </div>
            <Field label="Plafond de crédit (FCFA, 0 = illimité)">
              <Input type="number" inputMode="numeric" value={plaf} onChange={(e) => setPlaf(e.target.value)} />
            </Field>
            <Button onClick={addClient}>+ Ajouter le client</Button>
          </Card>
        </>
      )}
    </div>
  )
}
