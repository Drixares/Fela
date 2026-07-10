import { Button } from '@repo/ui/components/button'
import { Card } from '@repo/ui/components/card'
import { XIcon } from 'lucide-react'

/** Carte promo verte « MORE FROM ORIGIN » / « Build a budget with AI ». */
export function BudgetPromoCard(): React.JSX.Element {
  return (
    <Card className="gap-4 border-0 bg-gradient-to-br from-emerald-700 to-green-900 p-6 text-white">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-white/70">
          More from Origin
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss"
          className="text-white/70 hover:bg-white/10 hover:text-white"
        >
          <XIcon />
        </Button>
      </div>
      <h3 className="font-serif text-2xl">Build a budget with AI</h3>
      <p className="text-sm text-white/80">
        AI Budget Builder creates a smart budget based on your real spending in seconds.
      </p>
    </Card>
  )
}
