import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthShell } from '../components/AuthShell'
import { Button, Field, Input } from '../components/ui'
import { toast } from '../lib/toast'

export function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass })
    setBusy(false)
    if (error) return toast('⚠ ' + traduireErreur(error.message))
    nav('/', { replace: true })
  }

  return (
    <AuthShell>
      <form onSubmit={submit}>
        <Field label="Adresse email">
          <Input
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Mot de passe">
          <Input
            type="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
      <div className="text-center text-[13px] text-ink2 mt-3">
        Pas encore de compte ?{' '}
        <Link to="/inscription" className="text-brand font-bold">
          Créer un compte
        </Link>
      </div>
    </AuthShell>
  )
}

export function traduireErreur(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect.'
  if (/Email not confirmed/i.test(msg)) return 'Email non confirmé.'
  if (/User already registered/i.test(msg)) return 'Un compte existe déjà avec cet email.'
  if (/Password should be at least/i.test(msg)) return 'Mot de passe trop court (8 caractères min.).'
  return msg
}
