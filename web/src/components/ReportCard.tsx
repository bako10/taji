import { fmt, fmtS, frDateShort } from '../lib/format'
import { METHODES } from '../lib/constants'
import { statutOf, type Summary } from '../lib/compute'
import { waReport, shareReport } from '../lib/report'
import { Button, Card, Chip, Tile } from './ui'

type Props = {
  stationName: string
  day: string
  sum: Summary
  withActions?: boolean
  canReopen?: boolean
  onReopen?: () => void
}

export function ReportCard({ stationName, day, sum, withActions, canReopen, onReopen }: Props) {
  const statut = sum.statut || statutOf(sum)
  const modes = Object.entries(sum.encParMode || {})

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <Chip statut={statut} />
        <span className="text-[11.5px] text-ink3">Rapport du {frDateShort(day)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="LITRES" value={fmt(sum.ventesL)} unit="vendus" />
        <Tile label="ÉCART CUVES" value={fmtS(sum.ecartCuve)} unit="litres" tone={sum.ecartCuve < 0 ? 'neg' : undefined} />
        <Tile label="ÉCART CAISSE" value={fmtS(sum.ecartCaisse)} unit="FCFA" tone={sum.ecartCaisse < 0 ? 'neg' : undefined} />
      </div>

      {sum.margeNette != null && (
        <div className="mt-2">
          <Tile
            label="MARGE NETTE DU JOUR"
            value={`${fmt(sum.margeNette)} F`}
            unit="CA réel − achats − dépenses"
            tone="brand"
          />
        </div>
      )}

      <table className="w-full mt-3 text-[13px]">
        <tbody>
          {(sum.lignes || []).map((l, i) => (
            <tr key={i} className="border-b border-grid">
              <td className="py-1.5">
                {l.produit} — {fmt(l.ventes)} L × {fmt(l.prix)} F
              </td>
              <td className={`py-1.5 text-right ${l.ecart < 0 ? 'text-crit' : ''}`}>
                écart cuve {fmtS(l.ecart)} L
              </td>
            </tr>
          ))}
          <tr className="border-b border-grid">
            <td className="py-1.5">CA théorique</td>
            <td className="py-1.5 text-right font-bold">{fmt(sum.caTheo)} F</td>
          </tr>
          {modes.map(([m, v]) => (
            <tr key={m} className="border-b border-grid">
              <td className="py-1.5">{METHODES[m] || m}</td>
              <td className="py-1.5 text-right">{fmt(v)} F</td>
            </tr>
          ))}
          <tr className="border-b border-grid">
            <td className="py-1.5 font-bold">Total encaissé</td>
            <td className="py-1.5 text-right font-bold">{fmt(sum.enc)} F</td>
          </tr>
          <tr className="border-b border-grid">
            <td className="py-1.5 font-bold">Écart de caisse</td>
            <td className={`py-1.5 text-right font-bold ${sum.ecartCaisse < 0 ? 'text-crit' : 'text-good-text'}`}>
              {fmtS(sum.ecartCaisse)} F
            </td>
          </tr>
          {sum.margeNette != null && (
            <>
              <tr className="border-b border-grid">
                <td className="py-1.5">Marge brute carburant</td>
                <td className="py-1.5 text-right">{fmt(sum.margeBrute)} F</td>
              </tr>
              <tr className="border-b border-grid">
                <td className="py-1.5">Dépenses du jour</td>
                <td className="py-1.5 text-right">{sum.depenses ? '−' + fmt(sum.depenses) : '0'} F</td>
              </tr>
              <tr>
                <td className="py-1.5 font-bold">Marge nette</td>
                <td className={`py-1.5 text-right font-bold ${sum.margeNette < 0 ? 'text-crit' : 'text-good-text'}`}>
                  {fmt(sum.margeNette)} F
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {withActions && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => shareReport(waReport(stationName, day, { ...sum, statut }))}>
              📤 WhatsApp
            </Button>
            <Button variant="ghost" onClick={() => window.print()}>
              🖨 PDF
            </Button>
          </div>
          {canReopen && onReopen && (
            <Button variant="danger" onClick={onReopen}>
              ↺ Rouvrir cette journée (correction)
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
