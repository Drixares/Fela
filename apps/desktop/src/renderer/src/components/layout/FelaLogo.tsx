import { WalletIcon } from 'lucide-react'

import { strings } from '../../lib/strings'

/** Logo provisoire : icône + wordmark « Fela ». Remplaçable par un asset. */
export function FelaLogo(): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-ring text-sidebar-primary-foreground">
        <WalletIcon className="size-4" />
      </span>
      <span className="text-base font-semibold tracking-tight">{strings.app.name}</span>
    </div>
  )
}
