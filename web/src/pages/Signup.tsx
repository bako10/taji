import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthShell } from '../components/AuthShell'
import { Button, Field, Input } from '../components/ui'
import { toast } from '../lib/toast'
import { traduireErreur } from './Login'

export function Signup() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast('Indique ton nom complet')
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: { data: { full_name: name.trim(), phone: phone.trim() } },
    })
    setBusy(false)
    if (error) return toast('⚠ ' + traduireErreur(error.message))
    if (!data.session) {
      toast('Compte créé — vérifie ta boîte mail pour confirmer.')
      nav('/connexion', { replace: true })
      return
    }
    nav('/', { replace: true })
  }

  return (
    <AuthShell>
      <form onSubmit={submit}>
        <Field label="Nom complet">
          <Input placeholder="Prénom Nom" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Téléphone">
          <Input
            type="tel"
            placeholder="+223 …"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field label="Adresse email">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Mot de passe (8 caractères min.)">
          <Input
            type="password"
            autoComplete="new-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? 'Création…' : 'Créer mon compte'}
        </Button>
      </form>
      <div className="text-center text-[13px] text-ink2 mt-3">
        Déjà un compte ?{' '}
        <Link to="/connexion" className="text-brand font-bold">
          Se connecter
        </Link>
      </div>
    </AuthShell>
  )
}
