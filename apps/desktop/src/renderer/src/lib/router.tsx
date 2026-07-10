import { SidebarProvider } from '@repo/ui/components/sidebar'
import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet
} from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

import { Header } from '@renderer/components/layout/Header'
import { AppSidebar } from '../components/layout/AppSidebar'
import { HomeView } from '../views/HomeView'
import { InvestView } from '../views/InvestView'
import { SettingsView } from '../views/SettingsView'
import { SpendingView } from '../views/SpendingView'

const SIDEBAR_MIN_WIDTH = 200
const SIDEBAR_MAX_WIDTH = 300
const SIDEBAR_DEFAULT_WIDTH = 256
const SIDEBAR_WIDTH_STORAGE_KEY = 'fela.sidebarWidth'

function clampWidth(value: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, value))
}

function readStoredWidth(): number {
  const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isNaN(parsed) ? SIDEBAR_DEFAULT_WIDTH : clampWidth(parsed)
}

/** Shell du dashboard : sidebar toujours ouverte et redimensionnable + zone de contenu scrollable. */
function RootLayout(): React.JSX.Element {
  const [sidebarWidth, setSidebarWidth] = useState(readStoredWidth)

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth))
  }, [sidebarWidth])

  // Drag the divider to resize the sidebar. It never closes — only its width changes.
  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const startX = event.clientX
      const startWidth = sidebarWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handleMove = (moveEvent: PointerEvent): void => {
        setSidebarWidth(clampWidth(startWidth + moveEvent.clientX - startX))
      }
      const handleUp = (): void => {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
    },
    [sidebarWidth]
  )

  return (
    <SidebarProvider
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      className="h-screen w-screen overflow-hidden bg-[#fafaf7]"
    >
      <AppSidebar />
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        onPointerDown={handleResizeStart}
        className="relative z-20 w-px shrink-0 cursor-col-resize bg-sidebar-border transition-colors after:absolute after:inset-y-0 after:-left-1 after:-right-1 after:content-[''] hover:bg-primary"
      />
      <div className="flex-1 overflow-y-auto">
        <Header />
        <Outlet />
      </div>
    </SidebarProvider>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeView
})

const spendingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spending',
  component: SpendingView
})

const investRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invest',
  component: InvestView
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsView
})

const routeTree = rootRoute.addChildren([homeRoute, spendingRoute, investRoute, settingsRoute])

export const router = createRouter({
  routeTree,
  history: createHashHistory()
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
