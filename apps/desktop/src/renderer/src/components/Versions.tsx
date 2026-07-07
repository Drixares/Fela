import { useState } from 'react'

import { strings } from '../lib/strings'

function Versions(): React.JSX.Element {
  const [versions] = useState(window.electron.process.versions)

  return (
    <ul className="versions">
      <li className="electron-version">{strings.versions.electron(versions.electron)}</li>
      <li className="chrome-version">{strings.versions.chromium(versions.chrome)}</li>
      <li className="node-version">{strings.versions.node(versions.node)}</li>
    </ul>
  )
}

export default Versions
