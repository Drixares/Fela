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
      nameRequired: 'Le nom est requis.',
      typeRequired: 'Choisissez un type.',
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
  categories: {
    title: 'Catégories',
    empty: 'Aucune catégorie pour l’instant.',
    emptyHint: 'Créez un groupe ou une catégorie pour classer vos transactions.',
    addGroup: 'Ajouter un groupe',
    addCategory: 'Ajouter une catégorie',
    ungrouped: 'Sans groupe',
    edit: 'Modifier',
    delete: 'Supprimer',
    // French labels for the category kinds the API contract accepts
    // (see CATEGORY_KINDS in @repo/api/client).
    kinds: {
      income: 'Revenu',
      expense: 'Dépense'
    },
    groupForm: {
      createTitle: 'Nouveau groupe',
      createDescription: 'Un groupe organise vos catégories ; il est facultatif et modifiable.',
      editTitle: 'Modifier le groupe',
      editDescription: 'Renommez ce groupe. Ses catégories ne sont pas affectées.',
      nameLabel: 'Nom',
      namePlaceholder: 'Logement',
      submitCreate: 'Créer le groupe',
      submitEdit: 'Enregistrer',
      cancel: 'Annuler',
      nameRequired: 'Le nom est requis.'
    },
    categoryForm: {
      createTitle: 'Nouvelle catégorie',
      createDescription: 'Une catégorie classe vos transactions : loyer, courses, salaire…',
      editTitle: 'Modifier la catégorie',
      editDescription: 'Corrigez le nom, le type ou le groupe de cette catégorie.',
      nameLabel: 'Nom',
      namePlaceholder: 'Courses',
      kindLabel: 'Type',
      kindPlaceholder: 'Revenu ou dépense',
      groupLabel: 'Groupe',
      groupPlaceholder: 'Choisir un groupe',
      noGroup: 'Sans groupe',
      submitCreate: 'Créer la catégorie',
      submitEdit: 'Enregistrer',
      cancel: 'Annuler',
      nameRequired: 'Le nom est requis.',
      kindRequired: 'Choisissez un type.'
    },
    deleteGroupDialog: {
      title: 'Supprimer ce groupe ?',
      description: (name: string) =>
        `« ${name} » sera supprimé. Ses catégories sont conservées et deviennent « sans groupe » — aucune transaction n’est perdue.`,
      confirm: 'Supprimer',
      cancel: 'Annuler'
    },
    deleteCategoryDialog: {
      title: 'Supprimer cette catégorie ?',
      description: (name: string) =>
        `« ${name} » sera supprimée. Choisissez où reclasser ses transactions pour ne rien perdre de vos rapports.`,
      reassignLabel: 'Reclasser les transactions vers',
      keepUncategorized: 'Laisser sans catégorie',
      confirm: 'Supprimer',
      cancel: 'Annuler'
    },
    toast: {
      groupCreated: (name: string) => `Groupe « ${name} » créé.`,
      groupUpdated: (name: string) => `Groupe « ${name} » modifié.`,
      groupDeleted: (name: string) => `Groupe « ${name} » supprimé.`,
      categoryCreated: (name: string) => `Catégorie « ${name} » créée.`,
      categoryUpdated: (name: string) => `Catégorie « ${name} » modifiée.`,
      categoryDeleted: (name: string) => `Catégorie « ${name} » supprimée.`,
      groupError: 'Impossible d’enregistrer le groupe.',
      groupDeleteError: 'Impossible de supprimer le groupe.',
      categoryError: 'Impossible d’enregistrer la catégorie.',
      categoryDeleteError: 'Impossible de supprimer la catégorie.'
    }
  },
  versions: {
    electron: (version: string | undefined) => `Electron v${version ?? ''}`,
    chromium: (version: string | undefined) => `Chromium v${version ?? ''}`,
    node: (version: string | undefined) => `Node v${version ?? ''}`
  }
} as const
