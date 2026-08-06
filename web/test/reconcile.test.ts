/* Test numérique de la réconciliation (fonction pure, sans réseau).
   Lancer : npx tsx test/reconcile.test.ts */
// @ts-nocheck
import { reconcile } from '../src/lib/reconcile'

let failures = 0
function eq(label: string, got: unknown, want: unknown) {
  const ok = got === want
  if (!ok) failures++
  console.log(`${ok ? '✓' : '✗'} ${label}: ${got}${ok ? '' : ` (attendu ${want})`}`)
}

// ---- Cas 1 : journée complète avec marge (1er jour, pas d'historique) ----
const prices = [
  { org_id: 'O', product: 'essence', price_fcfa: 875, buy_price_fcfa: 700, effective_date: '2026-08-01' },
  { org_id: 'O', product: 'gasoil', price_fcfa: 940, buy_price_fcfa: 800, effective_date: '2026-08-01' },
]
const s1 = reconcile({
  orgId: 'O',
  day: '2026-08-06',
  tanks: [
    { id: 'E', product: 'essence', initial_stock_l: 10000, capacity_l: 20000, name: 'E', station_id: 'S' },
    { id: 'G', product: 'gasoil', initial_stock_l: 15000, capacity_l: 30000, name: 'G', station_id: 'S' },
  ],
  nozzles: [
    { id: 'e1', tank_id: 'E', station_id: 'S', name: 'E1', initial_index: 0 },
    { id: 'g1', tank_id: 'G', station_id: 'S', name: 'G1', initial_index: 0 },
  ],
  readings: [
    { nozzle_id: 'e1', opening_index: 0, closing_index: 800, staff_id: null },
    { nozzle_id: 'g1', opening_index: 0, closing_index: 800, staff_id: null },
  ],
  dips: [
    { tank_id: 'E', dip_l: 9200 }, // attendu 10000-800=9200 → 0
    { tank_id: 'G', dip_l: 19200 }, // attendu 15000+5000-800=19200 → 0
  ],
  deliveries: [{ tank_id: 'G', volume_invoiced_l: 5050, volume_received_l: 5000 }],
  cash: [
    { method: 'especes', amount_fcfa: 690000 },
    { method: 'orange_money', amount_fcfa: 300000 },
    { method: 'credit', amount_fcfa: 180000 },
  ],
  expenses: [{ amount_fcfa: 25000 }],
  prices,
  baseline: { E: { stock: 10000, sinceDay: null }, G: { stock: 15000, sinceDay: null } },
  inter: { E: { ventes: 0, livr: 0 }, G: { ventes: 0, livr: 0 } },
})
console.log('— Cas 1 : marge complète —')
eq('ventesL', s1.ventesL, 1600)
eq('caTheo', s1.caTheo, 1452000) // 800*875 + 800*940
eq('ecartCuve', s1.ecartCuve, 0)
eq('enc', s1.enc, 1170000)
eq('ecartCaisse', s1.ecartCaisse, -282000)
eq('margeBrute', s1.margeBrute, 252000) // 800*175 + 800*140
eq('depenses', s1.depenses, 25000)
eq('margeNette', s1.margeNette, 227000)
eq('statut', s1.statut, 'crit')

// ---- Cas 2 : prix de vente absent → garde-fou (jamais "conforme", marge indisponible) ----
const s2 = reconcile({
  orgId: 'O',
  day: '2026-08-06',
  tanks: [{ id: 'E', product: 'essence', initial_stock_l: 10000, capacity_l: 20000, name: 'E', station_id: 'S' }],
  nozzles: [{ id: 'e1', tank_id: 'E', station_id: 'S', name: 'E1', initial_index: 0 }],
  readings: [{ nozzle_id: 'e1', opening_index: 0, closing_index: 500, staff_id: null }],
  dips: [{ tank_id: 'E', dip_l: 9500 }],
  deliveries: [],
  cash: [{ method: 'especes', amount_fcfa: 400000 }],
  expenses: [],
  prices: [], // aucun prix
  baseline: { E: { stock: 10000, sinceDay: null } },
  inter: { E: { ventes: 0, livr: 0 } },
})
console.log('— Cas 2 : prix manquant —')
eq('caTheo', s2.caTheo, 0)
eq('ecartCuve', s2.ecartCuve, 0) // 9500 - (10000-500)=0
eq('statut (pas conforme)', s2.statut, 'warn')
eq('margeNette (indispo)', s2.margeNette, null)

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} échec(s)`)
process.exit(failures === 0 ? 0 : 1)
