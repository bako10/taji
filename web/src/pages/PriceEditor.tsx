import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { PRODUITS } from '../lib/constants'
import { fmt } from '../lib/format'
import { latestPrice, latestBuyPrice } from '../lib/prices'
import { Button, Card, Input } from '../components/ui'
import { toast } from '../lib/toast'
import type { Tables } from '../lib/database.types'

type Org = Tables<'organizations'>
type Price = Tables<'prices'>

type Change = {
  product: string
  oldSale: number | null
  newSale: number
  oldBuy: number | null
  newBuy: number | null
}

export function PriceEditor({
  org,
  prices,
  userId,
  onSaved,
}: {
  org: Org
  prices: Price[]
  userId: string
  onSaved: () => Promise<void> | void
}) {
  const [edit, setEdit] = useState(false)
  const [px, setPx] = useState<Record<string, string>>({})
  const [buy, setBuy] = useState<Record<string, string>>({})
  const [changes, setChanges] = useState<Change[] | null>(null)
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)

  const products = Object.keys(PRODUITS).filter((p) => {
    const cur = latestPrice(prices, org.id, p)
    return cur !== null || ['essence', 'gasoil'].includes(p)
  })

  function startEdit() {
    const p0: Record<string, string> = {}
    const b0: Record<string, string> = {}
    products.forEach((p) => {
      const s = latestPrice(prices, org.id, p)
      const b = latestBuyPrice(prices, org.id, p)
      p0[p] = s != null ? String(s) : ''
      b0[p] = b != null ? String(b) : ''
    })
    setPx(p0)
    setBuy(b0)
    setEdit(true)
    setChanges(null)
  }

  function cancel() {
    setEdit(false)
    setChanges(null)
    setConfirmed({})
    setPx({})
    setBuy({})
  }

  function review() {
    const list: Change[] = []
    for (const p of products) {
      const oldSale = latestPrice(prices, org.id, p)
      const oldBuy = latestBuyPrice(prices, org.id, p)
      const newSale = px[p] === '' ? oldSale : Number(px[p])
      const newBuy = buy[p] === '' ? oldBuy : Number(buy[p])
      const saleChanged = newSale !== oldSale
      const buyChanged = newBuy !== oldBuy
      if (!saleChanged && !buyChanged) continue
      if (!(newSale != null && newSale > 0)) {
        toast('Prix de vente requis — ' + PRODUITS[p])
        return
      }
      list.push({ product: p, oldSale, newSale, oldBuy, newBuy: newBuy != null && newBuy >= 0 ? newBuy : null })
    }
    if (!list.length) {
      toast('Aucun changement')
      setEdit(false)
      return
    }
    setChanges(list)
    setConfirmed({})
  }

  async function save() {
    if (!changes) return
    if (!changes.every((c) => confirmed[c.product])) {
      toast('Coche chaque changement pour confirmer')
      return
    }
    setBusy(true)
    try {
      const rows = changes.map((c) => ({
        org_id: org.id,
        product: c.product,
        price_fcfa: c.newSale,
        buy_price_fcfa: c.newBuy,
        created_by: userId,
      }))
      const { error } = await supabase.from('prices').insert(rows)
      if (error) throw error
      // Traçabilité : une entrée d'audit par changement de prix
      await supabase.from('audit_log').insert(
        changes.map((c) => ({
          station_id: null,
          action: 'changement_prix',
          entity: 'prices',
          entity_id: c.product,
          detail: {
            org_id: org.id,
            produit: PRODUITS[c.product],
            ancien_vente: c.oldSale,
            nouveau_vente: c.newSale,
            ancien_achat: c.oldBuy,
            nouveau_achat: c.newBuy,
          },
        })),
      )
      toast('✔ Prix mis à jour')
      cancel()
      await onSaved()
    } catch (e) {
      toast('⚠ ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // ---- Écran de confirmation (double validation) ----
  if (changes) {
    return (
      <Card className="mb-4 border-crit">
        <div className="text-[14px] font-bold mb-1">⚠️ Confirmer le changement de prix</div>
        <p className="text-[12px] text-ink3 mb-3">
          Le prix modifie le CA et l'écart de caisse du jour. Coche chaque changement pour le valider.
        </p>
        {changes.map((c) => (
          <label key={c.product} className="flex items-start gap-3 py-2 border-b border-grid last:border-0">
            <input
              type="checkbox"
              className="w-5 h-5 mt-0.5 shrink-0"
              checked={!!confirmed[c.product]}
              onChange={(e) => setConfirmed((s) => ({ ...s, [c.product]: e.target.checked }))}
            />
            <div className="text-[13px]">
              <div className="font-semibold">{PRODUITS[c.product]}</div>
              {c.newSale !== c.oldSale && (
                <div>Vente : <b>{c.oldSale != null ? fmt(c.oldSale) : '—'} → {fmt(c.newSale)} F</b></div>
              )}
              {c.newBuy !== c.oldBuy && (
                <div>Achat : <b>{c.oldBuy != null ? fmt(c.oldBuy) : '—'} → {c.newBuy != null ? fmt(c.newBuy) : '—'} F</b></div>
              )}
            </div>
          </label>
        ))}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button variant="ghost" onClick={cancel} disabled={busy}>Annuler</Button>
          <Button variant="danger" onClick={save} disabled={busy || !changes.every((c) => confirmed[c.product])}>
            {busy ? 'Enregistrement…' : 'Confirmer les prix'}
          </Button>
        </div>
      </Card>
    )
  }

  // ---- Lecture seule (verrou) ----
  if (!edit) {
    return (
      <Card className="mb-4">
        {products.map((p) => (
          <div key={p} className="flex items-center justify-between py-1.5 border-b border-grid last:border-0">
            <span className="text-[14px]">{PRODUITS[p]}</span>
            <span className="text-[13px] text-ink2">
              vente <b className="text-ink1">{(() => { const v = latestPrice(prices, org.id, p); return v != null ? fmt(v) : '—' })()}</b>
              {' · '}achat {(() => { const b = latestBuyPrice(prices, org.id, p); return b != null ? fmt(b) : '—' })()}
            </span>
          </div>
        ))}
        <Button variant="ghost" className="mt-2" onClick={startEdit}>✏️ Modifier les prix</Button>
        <p className="text-[11px] text-ink3 mt-1">
          Les prix sont verrouillés : la modification demande une confirmation par produit. Chaque
          changement est historisé et tracé.
        </p>
      </Card>
    )
  }

  // ---- Édition (déverrouillé) ----
  return (
    <Card className="mb-4">
      {products.map((p) => (
        <div key={p} className="flex items-end justify-between py-1.5 border-b border-grid last:border-0">
          <span className="text-[14px]">{PRODUITS[p]}</span>
          <div className="flex gap-2 items-end">
            <label className="text-center">
              <div className="text-[9.5px] text-ink3 font-bold mb-0.5">VENTE</div>
              <Input className="w-[78px]" type="number" value={px[p] ?? ''} onChange={(e) => setPx((s) => ({ ...s, [p]: e.target.value }))} />
            </label>
            <label className="text-center">
              <div className="text-[9.5px] text-ink3 font-bold mb-0.5">ACHAT</div>
              <Input className="w-[78px]" type="number" value={buy[p] ?? ''} onChange={(e) => setBuy((s) => ({ ...s, [p]: e.target.value }))} />
            </label>
          </div>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button variant="ghost" onClick={cancel}>Annuler</Button>
        <Button onClick={review}>Vérifier les changements →</Button>
      </div>
    </Card>
  )
}
