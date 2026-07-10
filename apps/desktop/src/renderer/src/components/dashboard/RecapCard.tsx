import { Card, CardContent, CardHeader } from '@repo/ui/components/card'
import { XIcon } from 'lucide-react'

import { SectionLabel } from './SectionLabel'

/** Carte "Daily market brief" à bordure dégradée bleue. */
export function RecapCard(): React.JSX.Element {
  return (
    <div className="rounded-[13px] bg-gradient-to-r from-sky-300 via-blue-300 to-indigo-300 p-px">
      <Card className="ring-0">
        <CardHeader className="flex items-center justify-between">
          <SectionLabel withChevron={false}>Personal recap</SectionLabel>
          <button
            type="button"
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </CardHeader>
        <CardContent>
          <p className="font-serif text-2xl">Daily market brief</p>
          <p className="mt-1 text-sm text-muted-foreground">US PPI data looms over markets...</p>
        </CardContent>
      </Card>
    </div>
  )
}
