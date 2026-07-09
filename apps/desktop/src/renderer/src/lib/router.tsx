import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet
} from '@tanstack/react-router'

import { AppSidebar } from '../components/layout/AppSidebar'
import { HomeView } from '../views/HomeView'
import { InvestView } from '../views/InvestView'
import { SettingsView } from '../views/SettingsView'
import { SpendingView } from '../views/SpendingView'

/** Shell du dashboard : sidebar fixe + zone de contenu scrollable. */
function RootLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <AppSidebar />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
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
