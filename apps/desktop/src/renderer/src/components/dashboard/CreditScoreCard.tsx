import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'

import { SectionLabel } from './SectionLabel'

/** Carte credit score : segments vides et CTA "Connect credit score". */
export function CreditScoreCard(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <SectionLabel>Credit score</SectionLabel>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-lg font-medium">Track your credit score.</p>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((segment) => (
            <div key={segment} className="h-2 flex-1 rounded-full bg-muted" />
          ))}
        </div>
        <Button size="lg" className="w-full">
          Connect credit score
        </Button>
      </CardContent>
    </Card>
  )
}
