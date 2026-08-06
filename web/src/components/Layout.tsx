import { NavLink, Outlet } from 'react-router-dom'
import { useSession } from '../context/Session'

type Tab = { to: string; icon: string; label: string }

const TABS: Record<string, Tab[]> = {
  proprietaire: [
    { to: '/', icon: '🏠', label: 'Accueil' },
    { to: '/saisie', icon: '📝', label: 'Saisie' },
    { to: '/credits', icon: '📒', label: 'Crédits' },
    { to: '/rapports', icon: '📊', label: 'Rapports' },
    { to: '/reglages', icon: '⚙️', label: 'Réglages' },
  ],
  gerant: [
    { to: '/saisie', icon: '📝', label: 'Saisie' },
    { to: '/historique', icon: '🗓', label: 'Historique' },
    { to: '/credits', icon: '📒', label: 'Crédits' },
    { to: '/equipe', icon: '👥', label: 'Équipe' },
    { to: '/reglages', icon: '⚙️', label: 'Réglages' },
  ],
  pompiste: [
    { to: '/saisie', icon: '📝', label: 'Saisie' },
    { to: '/historique', icon: '🗓', label: 'Historique' },
    { to: '/reglages', icon: '⚙️', label: 'Réglages' },
  ],
}

const roleLabel: Record<string, string> = {
  proprietaire: 'Propriétaire',
  gerant: 'Gérant',
  pompiste: 'Pompiste',
}

export function Layout() {
  const { profile, role } = useSession()
  const tabs = TABS[role ?? 'pompiste']
  return (
    <div className="max-w-[520px] mx-auto min-h-screen pb-[84px]">
      <header className="sticky top-0 z-30 bg-page px-4 pt-3.5 pb-2.5 border-b border-grid flex items-center justify-between">
        <div className="font-extrabold text-xl tracking-tight">
          Taji<span className="text-brand">.</span>
        </div>
        <div className="text-[11.5px] text-ink3 text-right leading-tight">
          {profile?.full_name || ''}
          <br />
          <span className="text-brand font-bold">{roleLabel[role ?? 'pompiste']}</span>
        </div>
      </header>

      <main className="p-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-grid">
        <div className="max-w-[520px] mx-auto flex">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                  isActive ? 'text-brand' : 'text-ink3'
                }`
              }
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
