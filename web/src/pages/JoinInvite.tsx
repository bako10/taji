import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthShell } from '../components/AuthShell'
import { Button, Field, Input } from '../components/ui'
import { toast } from '../lib/toast'
import { useSession } from '../context/Session'

type JoinResult = { ok: boolean; error?: string; station_name?: string }

export function JoinInvite() {
  const nav = useNavigate()
  const { refresh } = useSession()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { data, error } = await supabase.rpc('join_with_invite', { p_code: code.trim() })
    setBusy(false)
    if (error) return toast('⚠ ' + error.message)
    const res = data as JoinResult
    if (!res?.ok) return toast('⚠ ' + (res?.error || 'Code invalide'))
    toast('✔ Station rejointe : ' + res.station_name)
    await refresh()
    nav('/', { replace: true })
  }

  return (
    <AuthShell>
      <p className="text-[14px] mb-2.5">
        <b>Rejoindre une station</b>
        <br />
        Saisis le code que ton propriétaire t'a transmis.
      </p>
      <form onSubmit={submit}>
        <Field label="Code d'invitation">
          <Input
            className="uppercase tracking-[3px] font-bold"
            placeholder="EX: TJ4K9P"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? 'Vérification…' : 'Rejoindre la station'}
        </Button>
      </form>
      <div className="text-center text-[13px] text-ink2 mt-3">
        <button className="text-brand font-bold" onClick={() => nav('/choix-role')}>
          ‹ Retour
        </button>
      </div>
    </AuthShell>
  )
}
