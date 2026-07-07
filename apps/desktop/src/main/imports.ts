import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { BrowserWindow, dialog, ipcMain } from 'electron'

import { IMPORT_CHANNELS, type ChosenCsvFile } from '../shared/ipc'

// Main-process dialog copy. The "no hard-coded strings" rule targets renderer
// components; native dialogs live outside that surface.
const CHOOSE_CSV_TITLE = 'Choisir un fichier CSV à importer'
const CSV_FILTER_NAME = 'Fichiers CSV'

/**
 * Decode a bank export. Exports are usually UTF-8, but some French banks still
 * ship Windows-1252/Latin-1; those bytes are invalid UTF-8, which Node decodes
 * to U+FFFD replacement characters — so their presence is the tell to fall
 * back to latin1 and keep the accents intact.
 */
function decodeCsv(bytes: Buffer): string {
  const utf8 = bytes.toString('utf8')
  return utf8.includes('�') ? bytes.toString('latin1') : utf8
}

/**
 * Wire the CSV-import IPC surface: a native open dialog whose result is the
 * **file content as a string** — the renderer and the import procedures never
 * see a path (see the V1 PRD, #1, and issue #8).
 */
export function setupImports(): void {
  ipcMain.handle(IMPORT_CHANNELS.chooseCsvFile, async (): Promise<ChosenCsvFile | null> => {
    const win = BrowserWindow.getFocusedWindow()
    const options: Electron.OpenDialogOptions = {
      title: CHOOSE_CSV_TITLE,
      properties: ['openFile'],
      filters: [{ name: CSV_FILTER_NAME, extensions: ['csv', 'txt'] }]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)

    const path = result.canceled ? undefined : result.filePaths[0]
    if (!path) {
      return null
    }
    return { name: basename(path), content: decodeCsv(await readFile(path)) }
  })
}
