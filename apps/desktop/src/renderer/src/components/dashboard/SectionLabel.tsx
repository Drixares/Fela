import { ChevronRightIcon } from 'lucide-react'

/** Petites majuscules espacées façon Origin ("NET WORTH ›"). */
export function SectionLabel({
  children,
  withChevron = true
}: {
  children: React.ReactNode
  withChevron?: boolean
}): React.JSX.Element {
  return (
    <span className="flex items-center gap-1 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
      {children}
      {withChevron ? <ChevronRightIcon className="size-3.5" /> : null}
    </span>
  )
}
