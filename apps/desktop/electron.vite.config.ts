import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    // @repo/api ships TypeScript source with no build step, so it can't be
    // externalized and require()'d at runtime. Bundle it into the main process
    // (Vite resolves its ".js" import specifiers to the ".ts" sources).
    plugins: [externalizeDepsPlugin({ exclude: ['@repo/api'] })]
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
