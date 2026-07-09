import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarNav,
  sidebarNavItemVariants
} from '@repo/ui/components/sidebar'
import { Link, useLocation } from '@tanstack/react-router'
import {
  HomeIcon,
  SettingsIcon,
  TrendingUpIcon,
  WalletCardsIcon,
  type LucideIcon
} from 'lucide-react'

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

function NavLink({ entry, active }: { entry: NavEntry; active: boolean }): React.JSX.Element {
  const Icon = entry.icon
  return (
    <Link to={entry.to} className={sidebarNavItemVariants({ active })}>
      <Icon />
      <span>{entry.label}</span>
    </Link>
  )
}

/** Sidebar de l'app : logo, menu principal, item Réglages en pied. */
export function AppSidebar(): React.JSX.Element {
  const { pathname } = useLocation()
  return (
    <Sidebar>
      <SidebarHeader>
        <FelaLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav>
          {MAIN_NAV.map((entry) => (
            <NavLink key={entry.to} entry={entry} active={pathname === entry.to} />
          ))}
        </SidebarNav>
      </SidebarContent>
      <SidebarFooter>
        <SidebarNav>
          <NavLink entry={SETTINGS_NAV} active={pathname === SETTINGS_NAV.to} />
        </SidebarNav>
      </SidebarFooter>
    </Sidebar>
  )
}
