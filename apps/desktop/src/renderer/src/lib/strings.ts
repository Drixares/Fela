/**
 * Centralised UI copy for the renderer. French is the only language in v1, but
 * routing every visible string through this module keeps components free of
 * hard-coded text and preserves the option to add i18n later (phase 3) without
 * touching every component.
 *
 * Convention: plain strings for static copy, functions for anything that
 * interpolates a value, so call sites stay type-safe and translations can
 * reorder placeholders.
 */
export const strings = {
  app: {
    name: 'Fela',
    tagline: 'Où part mon argent ?'
  },
  accounts: {
    title: 'Comptes',
    loading: 'Chargement des comptes…',
    empty: "Aucun compte pour l'instant.",
    count: (n: number) => `${n} compte${n > 1 ? 's' : ''}`
  },
  versions: {
    electron: (version: string | undefined) => `Electron v${version ?? ''}`,
    chromium: (version: string | undefined) => `Chromium v${version ?? ''}`,
    node: (version: string | undefined) => `Node v${version ?? ''}`
  }
} as const
