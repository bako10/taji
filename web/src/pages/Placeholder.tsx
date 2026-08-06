import { Card } from '../components/ui'

export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-3">{title}</h1>
      <Card>
        <p className="text-[14px] text-ink2">Cet écran arrive en {phase}.</p>
      </Card>
    </div>
  )
}
