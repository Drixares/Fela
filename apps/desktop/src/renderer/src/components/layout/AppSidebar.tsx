import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@repo/ui/components/sidebar'
import { Link, useLocation } from '@tanstack/react-router'
import {
  HomeIcon,
  SettingsIcon,
  TrendingUpIcon,
  WalletCardsIcon,
  type LucideIcon
} from 'lucide-react'

import { cn } from '@repo/ui/lib/utils'
import { strings } from '../../lib/strings'
import { FelaLogo } from './FelaLogo'

type NavEntry = { to: string; label: string; icon: LucideIcon }

const MAIN_NAV: NavEntry[] = [
  { to: '/', label: strings.nav.home, icon: HomeIcon },
  { to: '/spending', label: strings.nav.spending, icon: WalletCardsIcon },
  { to: '/invest', label: strings.nav.invest, icon: TrendingUpIcon }
]

const SETTINGS_NAV: NavEntry = {
  to: '/settings',
  label: strings.nav.settings,
  icon: SettingsIcon
}

export function AppSidebar(): React.JSX.Element {
  const { pathname } = useLocation()

  return (
    // `collapsible="none"` renders the sidebar as a fixed column that can never
    // collapse or close — it is always open. Its width is driven by the
    // `--sidebar-width` CSS variable, which the resize handle in RootLayout drives.
    <Sidebar collapsible="none">
      <SidebarHeader className="h-20 justify-center">
        <FelaLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {MAIN_NAV.map((entry) => {
              const Icon = entry.icon

              return (
                <SidebarMenuItem key={entry.to}>
                  <SidebarMenuButton
                    className={cn(
                      pathname === entry.to ? 'bg-sidebar-accent' : 'text-muted-foreground'
                    )}
                    render={(props) => (
                      <Link to={entry.to} {...props} activeOptions={{ exact: true }} />
                    )}
                  >
                    <Icon />
                    <span>{entry.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={cn(
              pathname === SETTINGS_NAV.to ? 'bg-sidebar-accent' : 'text-muted-foreground'
            )}
            render={(props) => (
              <Link to={SETTINGS_NAV.to} activeOptions={{ exact: true }} {...props} />
            )}
          >
            <SETTINGS_NAV.icon />
            <span>{SETTINGS_NAV.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  )
}
