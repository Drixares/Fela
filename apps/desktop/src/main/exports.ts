import { writeFile } from 'node:fs/promises'
import { extname } from 'node:path'

import { BrowserWindow, dialog, ipcMain } from 'electron'

import { EXPORT_CHANNELS, type ExportFileToSave } from '../shared/ipc'

// Main-process dialog copy. The "no hard-coded strings" rule targets renderer
// components; native dialogs live outside that surface.
const SAVE_EXPORT_TITLE = 'Enregistrer l’export'
const FILTERS: Record<string, Electron.FileFilter> = {
  '.csv': { name: 'Fichiers CSV', extensions: ['csv'] },
  '.json': { name: 'Fichiers JSON', extensions: ['json'] }
}

/**
 * Wire the data-export IPC surface: the renderer hands over a generated export
 * (name + content, produced by the `exports.*` procedures) and the main
 * process — the only layer allowed to touch the filesystem — asks where to
 * save it and writes it (see the V1 PRD, #1, and issue #10).
 */
export function setupExports(): void {
  ipcMain.handle(
    EXPORT_CHANNELS.saveFile,
    async (_event, file: ExportFileToSave): Promise<boolean> => {
      const win = BrowserWindow.getFocusedWindow()
      const filter = FILTERS[extname(file.fileName)]
      const options: Electron.SaveDialogOptions = {
        title: SAVE_EXPORT_TITLE,
        defaultPath: file.fileName,
        ...(filter ? { filters: [filter] } : {})
      }
      const result = win
        ? await dialog.showSaveDialog(win, options)
        : await dialog.showSaveDialog(options)

      if (result.canceled || !result.filePath) {
        return false
      }
      await writeFile(result.filePath, file.content, 'utf8')
      return true
    }
  )
}
