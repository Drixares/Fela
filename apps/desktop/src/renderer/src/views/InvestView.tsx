import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@repo/ui/components/empty'
import { TrendingUpIcon } from 'lucide-react'

import { strings } from '../lib/strings'

const t = strings.invest

/** Placeholder de la future vue Investissements. */
export function InvestView(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-8">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrendingUpIcon />
          </EmptyMedia>
          <EmptyTitle>{t.title}</EmptyTitle>
          <EmptyDescription>{t.description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
