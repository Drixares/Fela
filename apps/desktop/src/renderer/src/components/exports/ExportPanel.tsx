import { useMutation } from '@tanstack/react-query'
import { Button } from '@repo/ui/components/button'
import { Card } from '@repo/ui/components/card'
import { toast } from '@repo/ui/components/sonner'
import { FileDownIcon } from 'lucide-react'

import { client } from '../../lib/orpc'
import { strings } from '../../lib/strings'

const t = strings.exports

type ExportFormat = 'csv' | 'json'

/**
 * The data-export settings section: download the whole database as CSV or JSON
 * so the user always stays owner of their history (see issue #10). The export
 * procedures generate the content; this panel only forwards it to the
 * `window.api.exports` bridge, where the main process — the sole layer allowed
 * to touch the filesystem — asks where to save it and writes the file.
 */
export function ExportPanel(): React.JSX.Element {
  const exportData = useMutation({
    mutationFn: async (format: ExportFormat) => {
      const file = format === 'csv' ? await client.exports.csv() : await client.exports.json()
      return window.api.exports.saveFile(file)
    },
    onSuccess: (saved) => {
      // `false` means the user closed the save dialog — not worth a toast.
      if (saved) toast.success(t.toast.saved)
    },
    onError: () => toast.error(t.toast.error)
  })

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium tracking-wide uppercase">{t.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
      </div>

      <Card className="flex flex-row items-center justify-between gap-3 p-4">
        <span className="text-sm text-muted-foreground">{t.hint}</span>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportData.mutate('csv')}
            disabled={exportData.isPending}
          >
            <FileDownIcon />
            {t.csv}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportData.mutate('json')}
            disabled={exportData.isPending}
          >
            <FileDownIcon />
            {t.json}
          </Button>
        </div>
      </Card>
    </section>
  )
}
