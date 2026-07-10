import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'
import { Progress } from '@repo/ui/components/progress'
import { SparklesIcon } from 'lucide-react'

import { SectionLabel } from './SectionLabel'

/** Carte budget : progression à 0 % et CTA "Start budgeting". */
export function BudgetCard(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <SectionLabel>Budget in February</SectionLabel>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Ask AI"
          className="rounded-lg text-indigo-500"
        >
          <SparklesIcon />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-lg font-medium">Budget your money.</p>
        <div className="flex items-center gap-3">
          <Progress value={0} className="bg-lime-200/70" />
          <span className="text-sm text-muted-foreground">0%</span>
        </div>
        <Button size="lg" className="w-full">
          Start budgeting
        </Button>
      </CardContent>
    </Card>
  )
}
