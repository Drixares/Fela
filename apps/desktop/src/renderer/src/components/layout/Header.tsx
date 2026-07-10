import { Button } from '@repo/ui/components/button'
import { PlusIcon } from 'lucide-react'

export function Header(): React.JSX.Element {
  return (
    <header className="flex h-20 w-full items-center justify-between px-4">
      <h1 className="text-2xl font-bold">Welcome back Mattéo</h1>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon-lg">
          <PlusIcon className="size-4" />
        </Button>
      </div>
    </header>
  )
}
