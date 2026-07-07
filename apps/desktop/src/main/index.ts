import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/message-port'
import { appRouter } from '@repo/api'
import { createDb, seedDefaultCategories } from '@repo/db'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { setupBackups } from './backups'
import { createSettingsStore } from './settings'

const orpcHandler = new RPCHandler(appRouter, {
  interceptors: [onError((error) => console.error(error))]
})

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Open the local SQLite database. Created here (not at module load) because
  // app.getPath is only available once ready.
  //
  // In development we point at `packages/db/dev.db` — the same file
  // `drizzle-kit push` writes to (run `pnpm --filter @repo/db db:push`) — so the
  // schema pushed there is what the running app sees. `pnpm dev` runs with the
  // app dir as cwd, so this resolves to <repo>/packages/db/dev.db. In production
  // each install gets its own database under the per-user data directory.
  const dbPath = is.dev
    ? join(process.cwd(), '../../packages/db/dev.db')
    : join(app.getPath('userData'), 'app.db')

  const db = createDb(dbPath)

  // First-launch only: fill a brand-new database with the French default
  // categories. Idempotent — an existing database (even one the user has edited)
  // is never re-seeded. Wrapped so a seed hiccup can never block startup.
  try {
    seedDefaultCategories(db)
  } catch (error) {
    console.error('Failed to seed default categories', error)
  }

  // Rotating file backups + restore, owned entirely by the main process (the
  // sole owner of the database file). Settings live in their own JSON file so a
  // restore never rewinds where future backups are written. Takes a throttled
  // backup on launch and registers the IPC surface the settings screen drives.
  const settings = createSettingsStore(join(app.getPath('userData'), 'settings.json'))
  setupBackups({ dbPath, db, settings })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Upgrade the port forwarded by the preload script into an oRPC connection,
  // supplying the database as the initial server context.
  ipcMain.on('start-orpc-server', (event) => {
    const [serverPort] = event.ports
    orpcHandler.upgrade(serverPort, { context: { db } })
    serverPort.start()
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
