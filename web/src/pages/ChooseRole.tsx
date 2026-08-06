import { Link } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button } from '../components/ui'
import { useSession } from '../context/Session'

export function ChooseRole() {
  const { profile, signOut } = useSession()
  return (
    <AuthShell>
      <p className="text-[14px] mb-3">
        <b>Bienvenue {profile?.full_name || ''} !</b>
        <br />
        Comment veux-tu utiliser Taji ?
      </p>
      <Link to="/onboarding">
        <Button className="mb-2">👔 Je suis propriétaire — créer mes stations</Button>
      </Link>
      <Link to="/rejoindre">
        <Button variant="ghost" className="mb-2">
          🧑‍🔧 J'ai un code d'invitation (gérant ou pompiste)
        </Button>
      </Link>
      <div className="text-center text-[13px] text-ink2 mt-2">
        <button className="text-brand font-bold" onClick={() => signOut()}>
          Se déconnecter
        </button>
      </div>
    </AuthShell>
  )
}
