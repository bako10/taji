import { useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button } from '../components/ui'

/** Placeholder PHASE 1 — l'assistant complet (org → station → cuves → pistolets → prix) arrive en PHASE 2. */
export function Onboarding() {
  const nav = useNavigate()
  return (
    <AuthShell>
      <p className="text-[14px] mb-3">
        <b>Créer votre entreprise et votre première station</b>
      </p>
      <p className="text-[13px] text-ink2 mb-4">
        L'assistant de configuration (entreprise → station → cuves → pistolets → prix) arrive à la
        prochaine étape du développement.
      </p>
      <Button variant="ghost" onClick={() => nav('/choix-role')}>
        ‹ Retour
      </Button>
    </AuthShell>
  )
}
