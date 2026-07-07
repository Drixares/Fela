import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import { BACKUP_CHANNELS, type FelaApi } from '../shared/ipc'

// The renderer never touches the database file; it drives backups through this
// thin bridge to the main-process handlers (see src/main/backups.ts).
const api: FelaApi = {
  backups: {
    getState: () => ipcRenderer.invoke(BACKUP_CHANNELS.getState),
    chooseDirectory: () => ipcRenderer.invoke(BACKUP_CHANNELS.chooseDirectory),
    createNow: () => ipcRenderer.invoke(BACKUP_CHANNELS.createNow),
    restore: (backupPath) => ipcRenderer.invoke(BACKUP_CHANNELS.restore, backupPath)
  }
}

window.addEventListener('message', (event) => {
  if (event.data === 'start-orpc-client') {
    const [serverPort] = event.ports
    ipcRenderer.postMessage('start-orpc-server', null, [serverPort])
  }
})

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
