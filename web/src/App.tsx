import { Navigate, Route, Routes } from 'react-router-dom'
import { useSession } from './context/Session'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { ChooseRole } from './pages/ChooseRole'
import { JoinInvite } from './pages/JoinInvite'
import { Onboarding } from './pages/Onboarding'
import { Home } from './pages/Home'
import { Reglages } from './pages/Reglages'
import { Saisie } from './pages/Saisie'
import { Placeholder } from './pages/Placeholder'

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl animate-pulse">⛽</div>
        <div className="text-ink3 text-[13px] mt-2">Chargement…</div>
      </div>
    </div>
  )
}

export default function App() {
  const { loading, ready, user, role, isOwner } = useSession()

  if (loading) return <Loader />

  // Non connecté
  if (!user) {
    return (
      <Routes>
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Signup />} />
        <Route path="*" element={<Navigate to="/connexion" replace />} />
      </Routes>
    )
  }

  // Connecté mais contexte pas encore chargé
  if (!ready) return <Loader />

  // Connecté sans rôle → choix / onboarding / rejoindre
  if (!role) {
    return (
      <Routes>
        <Route path="/choix-role" element={<ChooseRole />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/rejoindre" element={<JoinInvite />} />
        <Route path="*" element={<Navigate to="/choix-role" replace />} />
      </Routes>
    )
  }

  // Connecté avec rôle → application
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={isOwner ? <Home /> : <Navigate to="/saisie" replace />} />
        <Route path="/saisie" element={<Saisie />} />
        <Route path="/historique" element={<Placeholder title="Historique" phase="PHASE 3" />} />
        <Route path="/credits" element={<Placeholder title="Crédits clients" phase="PHASE 3" />} />
        <Route path="/rapports" element={<Placeholder title="Rapports" phase="PHASE 3" />} />
        <Route path="/equipe" element={<Placeholder title="Équipe" phase="PHASE 3" />} />
        <Route path="/reglages" element={<Reglages />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
