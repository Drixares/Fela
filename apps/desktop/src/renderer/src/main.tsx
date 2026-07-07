import './assets/main.css'
import './assets/tailwind.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@repo/ui/components/sonner'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { strings } from './lib/strings'

document.title = strings.app.name

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>
)
