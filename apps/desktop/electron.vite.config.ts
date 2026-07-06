import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {},
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
