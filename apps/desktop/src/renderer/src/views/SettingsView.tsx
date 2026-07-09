import { BackupsPanel } from '../components/backups/BackupsPanel'
import { ExportPanel } from '../components/exports/ExportPanel'

/** Réglages : sauvegardes et export des données. */
export function SettingsView(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-8">
      <BackupsPanel />
      <ExportPanel />
    </div>
  )
}
