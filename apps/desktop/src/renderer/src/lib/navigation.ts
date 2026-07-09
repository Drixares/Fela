import { useRouter } from '@tanstack/react-router'

/**
 * The renderer is a single scrolling page, not a router: every panel is a
 * `<section>` stacked in `App.tsx`. Onboarding leads the user from one empty
 * state to the action that fills it — « créez un compte », « importez », « voyez
 * le rapport » — and each of those actions lives in a different section. These
 * stable ids let an empty-state call-to-action scroll to the section that owns
 * the next step, so the first-launch parcours never dead-ends (see issue #17).
 */
export const SECTIONS = {
  accounts: 'section-accounts',
  reports: 'section-reports',
  transactions: 'section-transactions'
} as const

/**
 * Scroll the section to the top of the viewport; a no-op if it isn't mounted.
 * Deliberately not `behavior: 'smooth'` — Electron's Chromium silently ignores
 * programmatic smooth scrolls here (the animation never ticks), which would
 * leave the call-to-action doing nothing and reintroduce the dead-end this
 * navigation exists to remove.
 */
export function scrollToSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ block: 'start' })
}

/**
 * Chaque section vit désormais sur une route : « accounts » et « reports » sur
 * Home, « transactions » sur Spending. Un CTA d'empty-state doit donc changer de
 * vue avant de pouvoir scroller vers sa cible.
 */
const SECTION_ROUTE: Record<string, string> = {
  [SECTIONS.accounts]: '/',
  [SECTIONS.reports]: '/',
  [SECTIONS.transactions]: '/spending'
}

/**
 * Renvoie un callback qui amène l'utilisateur à une section : il navigue vers la
 * route qui l'héberge (si on n'y est pas déjà) puis scrolle une fois la section
 * montée. Sur la même route, il scrolle directement.
 */
export function useNavigateToSection(): (sectionId: string) => void {
  const router = useRouter()
  return (sectionId: string): void => {
    const to = SECTION_ROUTE[sectionId] ?? '/'
    if (router.state.location.pathname === to) {
      scrollToSection(sectionId)
      return
    }
    void router.navigate({ to }).then(() => {
      // Attendre le montage de la nouvelle vue avant de scroller (deux frames
      // pour laisser React peindre le contenu de la route).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToSection(sectionId))
      })
    })
  }
}
