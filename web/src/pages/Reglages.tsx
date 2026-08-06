import { useSession } from '../context/Session'
import { Button, Card } from '../components/ui'

export function Reglages() {
  const { profile, role, signOut } = useSession()
  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Réglages</h1>
      <p className="text-[13px] text-ink3 mb-4">
        {profile?.full_name || ''} —{' '}
        {role === 'proprietaire' ? 'Propriétaire' : role === 'gerant' ? 'Gérant' : 'Pompiste'}
      </p>

      <Card className="mb-4">
        <div className="text-[13px] text-ink2">
          <div>
            <b>Nom :</b> {profile?.full_name || '—'}
          </div>
          <div>
            <b>Téléphone :</b> {profile?.phone || '—'}
          </div>
        </div>
      </Card>

      <Card>
        <Button variant="danger" onClick={() => signOut()}>
          Se déconnecter
        </Button>
      </Card>

      <p className="text-[11px] text-ink3 text-center mt-6">
        Prix, stations, invitations et thème arrivent en PHASE 3.
      </p>
    </div>
  )
}
