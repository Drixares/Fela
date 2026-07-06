import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    // @repo/api and @repo/db ship TypeScript source with no build step, so they
    // can't be externalized and require()'d at runtime. Bundle them into the
    // main process (Vite resolves their ".js" import specifiers to the ".ts"
    // sources). better-sqlite3 is a native module and stays externalized (it's a
    // direct dependency of this app), so it's require()'d from node_modules at
    // runtime rather than bundled.
    plugins: [externalizeDepsPlugin({ exclude: ['@repo/api', '@repo/db'] })]
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      },
      // @repo/ui pulls in @base-ui/react, which resolves its own React copy in
      // the pnpm workspace. Without deduping, the bundle ends up with two React
      // instances and hooks crash (ReactSharedInternals dispatcher is null).
      dedupe: ['react', 'react-dom']
    },
    plugins: [react(), tailwindcss()]
  }
})
