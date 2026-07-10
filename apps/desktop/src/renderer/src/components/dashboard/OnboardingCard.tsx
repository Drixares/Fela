import { Card, CardContent, CardHeader } from '@repo/ui/components/card'
import { XIcon } from 'lucide-react'

/** Carte verte "Make the most of Origin" avec progression en 3 segments. */
export function OnboardingCard(): React.JSX.Element {
  return (
    <Card className="bg-gradient-to-br from-emerald-950 via-green-900 to-green-800 text-white ring-0">
      <CardHeader className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-[0.2em] text-white/80 uppercase">
          Complete onboarding
        </span>
        <button type="button" aria-label="Dismiss" className="text-white/70 hover:text-white">
          <XIcon className="size-4" />
        </button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        <p className="font-serif text-2xl">Make the most of Origin</p>
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5">
            <div className="h-1.5 flex-1 rounded-full bg-white" />
            <div className="h-1.5 flex-1 rounded-full bg-white/25" />
            <div className="h-1.5 flex-1 rounded-full bg-white/25" />
          </div>
          <p className="text-sm text-white/90">33% complete</p>
        </div>
      </CardContent>
    </Card>
  )
}
