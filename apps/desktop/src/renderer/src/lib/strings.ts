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
    empty: "Aucun compte pour l'instant.",
    emptyHint: 'Créez votre premier compte pour commencer à suivre votre argent.',
    count: (n: number) => `${n} compte${n > 1 ? 's' : ''}`,
    total: 'Total',
    add: 'Ajouter un compte',
    edit: 'Modifier',
    archive: 'Archiver',
    // French labels for the account types the API contract accepts
    // (see ACCOUNT_TYPES in @repo/api/client).
    types: {
      checking: 'Compte courant',
      savings: 'Livret',
      cash: 'Espèces',
      credit_card: 'Carte de crédit',
      investment: 'Investissement'
    },
    form: {
      createTitle: 'Nouveau compte',
      createDescription: 'Ajoutez un compte réel à suivre : courant, livret, espèces, carte…',
      editTitle: 'Modifier le compte',
      editDescription: 'Corrigez le nom, le type ou le solde initial de ce compte.',
      nameLabel: 'Nom',
      namePlaceholder: 'Compte courant',
      typeLabel: 'Type',
      typePlaceholder: 'Choisir un type',
      initialBalanceLabel: 'Solde initial (€)',
      initialBalancePlaceholder: '0',
      initialBalanceHint: 'Le solde de départ ; les transactions viendront s’y ajouter.',
      submitCreate: 'Créer le compte',
      submitEdit: 'Enregistrer',
      cancel: 'Annuler',
      invalidBalance: 'Solde initial invalide.'
    },
    archiveDialog: {
      title: 'Archiver ce compte ?',
      description: (name: string) =>
        `« ${name} » disparaîtra de vos écrans courants, mais son historique et ses transactions sont conservés pour vos rapports passés.`,
      confirm: 'Archiver',
      cancel: 'Annuler'
    },
    toast: {
      created: (name: string) => `Compte « ${name} » créé.`,
      updated: (name: string) => `Compte « ${name} » modifié.`,
      archived: (name: string) => `Compte « ${name} » archivé.`,
      createError: 'Impossible de créer le compte.',
      updateError: "Impossible d'enregistrer les modifications.",
      archiveError: "Impossible d'archiver le compte."
    }
  },
  versions: {
    electron: (version: string | undefined) => `Electron v${version ?? ''}`,
    chromium: (version: string | undefined) => `Chromium v${version ?? ''}`,
    node: (version: string | undefined) => `Node v${version ?? ''}`
  }
} as const
