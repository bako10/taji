import { fmt, fmtS, frDateShort } from './format'
import type { Summary } from './compute'

const LABELS: Record<string, string> = {
  ok: '✅ CONFORME',
  warn: '⚠️ À SURVEILLER',
  crit: '🔴 ÉCART IMPORTANT',
}

/** Texte du rapport pour WhatsApp (identique v1, + marge nette si dispo). */
export function waReport(stationName: string, day: string, sum: Partial<Summary>): string {
  const lab = LABELS[sum.statut ?? ''] ?? ''
  const ligneMarge = sum.margeNette != null ? `\n📈 Marge nette : *${fmt(sum.margeNette)} F*` : ''
  return (
    `⛽ *TAJI — Rapport du ${frDateShort(day)}*\n` +
    `📍 ${stationName}\n` +
    `Statut : *${lab}*\n\n` +
    `💧 Litres vendus : *${fmt(sum.ventesL ?? 0)} L*\n` +
    `🛢 Écart cuves : *${fmtS(sum.ecartCuve ?? 0)} L*\n` +
    `💰 CA théorique : ${fmt(sum.caTheo ?? 0)} F\n` +
    `💵 Encaissé : ${fmt(sum.enc ?? 0)} F\n` +
    `📊 Écart de caisse : *${fmtS(sum.ecartCaisse ?? 0)} F*${ligneMarge}\n\n` +
    `_Généré par Taji_`
  )
}

/** Partage natif (WhatsApp, etc.) avec repli wa.me — idéal en PWA mobile. */
export async function shareReport(text: string) {
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
    }
  }
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener')
}
