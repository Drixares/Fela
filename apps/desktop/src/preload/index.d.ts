import { ElectronAPI } from '@electron-toolkit/preload'
import type { FelaApi } from '../shared/ipc'

declare global {
  interface Window {
    electron: ElectronAPI
    api: FelaApi
  }
}
