import { useSession } from '../context/Session'
import { Card } from '../components/ui'

/**
 * PHASE 1 — écran d'accueil minimal : prouve auth + multi-tenant + RLS.
 * Le vrai tableau de bord (tuiles, statuts, tendance) arrive en PHASE 3.
 */
export function Home() {
  const { role, myStations, orgOf } = useSession()
  const stations = myStations()

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Mes stations</h1>
      <p className="text-[13px] text-ink3 mb-4">
        Vous êtes connecté en tant que{' '}
        <b>{role === 'proprietaire' ? 'propriétaire' : role === 'gerant' ? 'gérant' : 'pompiste'}</b>.
      </p>

      {stations.length === 0 ? (
        <Card>
          <p className="text-[14px] text-ink2">
            Aucune station rattachée pour l'instant.
            {role === 'proprietaire'
              ? ' Créez votre première station (onboarding — bientôt).'
              : ' Demandez un code d’invitation à votre propriétaire.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {stations.map((st) => (
            <Card key={st.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-[15px]">⛽ {st.name}</div>
                  <div className="text-[12px] text-ink3">
                    {st.city || '—'} · {orgOf(st)?.name ?? ''}
                  </div>
                </div>
                <span className="text-ink3">›</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] text-ink3 text-center mt-6">
        Taji v2 (React) — fondations. Saisie, clôture et tableau de bord arrivent aux étapes
        suivantes.
      </p>
    </div>
  )
}
