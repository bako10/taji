import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Tables } from '../lib/database.types'
import type { Role } from '../lib/constants'

type Profile = Tables<'profiles'>
type Organization = Tables<'organizations'>
type Station = Tables<'stations'>
type Membership = Tables<'station_members'>
type Price = Tables<'prices'>

export type SessionValue = {
  loading: boolean
  ready: boolean // contexte métier chargé
  user: User | null
  profile: Profile | null
  orgs: Organization[]
  stations: Station[]
  memberships: Membership[]
  prices: Price[]
  isOwner: boolean
  isGerant: boolean
  isPompiste: boolean
  role: Role | null
  myStations: () => Station[]
  orgOf: (station: Station) => Organization | undefined
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [prices, setPrices] = useState<Price[]>([])

  const loadContext = useCallback(async (uid: string) => {
    const [p, o, s, m, pr] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('organizations').select('*'),
      supabase.from('stations').select('*').order('created_at'),
      supabase.from('station_members').select('*').eq('user_id', uid).eq('active', true),
      supabase.from('prices').select('*'),
    ])
    setProfile(p.data ?? null)
    setOrgs(o.data ?? [])
    setStations(s.data ?? [])
    setMemberships(m.data ?? [])
    setPrices(pr.data ?? [])
    setReady(true)
  }, [])

  const refresh = useCallback(async () => {
    if (user) await loadContext(user.id)
  }, [user, loadContext])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      const sess: Session | null = data.session
      if (!active) return
      setUser(sess?.user ?? null)
      if (sess?.user) await loadContext(sess.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, sess) => {
      setUser(sess?.user ?? null)
      if (sess?.user) {
        setReady(false)
        await loadContext(sess.user.id)
      } else {
        setReady(false)
        setProfile(null)
        setOrgs([])
        setStations([])
        setMemberships([])
        setPrices([])
      }
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadContext])

  const uid = user?.id
  const isOwner = !!uid && orgs.some((o) => o.owner_id === uid)
  const isGerant = memberships.some((m) => m.role === 'gerant')
  const isPompiste = !isGerant && memberships.some((m) => m.role === 'pompiste')
  const role: Role | null = isOwner ? 'proprietaire' : isGerant ? 'gerant' : isPompiste ? 'pompiste' : null

  const myStations = () => {
    if (isOwner) {
      return stations.filter(
        (st) => orgs.some((o) => o.id === st.org_id && o.owner_id === uid) && st.active,
      )
    }
    return stations.filter((st) => memberships.some((m) => m.station_id === st.id) && st.active)
  }
  const orgOf = (station: Station) => orgs.find((o) => o.id === station.org_id)

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value: SessionValue = {
    loading,
    ready,
    user,
    profile,
    orgs,
    stations,
    memberships,
    prices,
    isOwner,
    isGerant,
    isPompiste,
    role,
    myStations,
    orgOf,
    refresh,
    signOut,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSession doit être utilisé dans <SessionProvider>')
  return v
}
