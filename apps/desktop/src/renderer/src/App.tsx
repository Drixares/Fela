import { Button, buttonVariants } from '@repo/ui/components/button'

import electronLogo from './assets/electron.svg'
import Versions from './components/Versions'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={ipcHandle}>Send IPC</Button>

        <a
          href="https://electron-vite.org/"
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: 'outline' })}
        >
          Documentation
        </a>
      </div>
      <Versions></Versions>
    </>
  )
}

export default App
