import { useEffect, useState } from 'react'

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const handler = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail)
      clearTimeout(t)
      t = setTimeout(() => setMsg(null), 2800)
    }
    window.addEventListener('taji-toast', handler)
    return () => {
      window.removeEventListener('taji-toast', handler)
      clearTimeout(t)
    }
  }, [])
  if (!msg) return null
  return (
    <div className="fixed left-1/2 bottom-24 -translate-x-1/2 z-50 max-w-[90%] rounded-xl bg-ink1 text-page px-4 py-3 text-[13.5px] font-semibold shadow-lg text-center">
      {msg}
    </div>
  )
}
