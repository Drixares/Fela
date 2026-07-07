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
  transactions: {
    title: 'Transactions',
    empty: 'Aucune transaction pour l’instant.',
    emptyHint: 'Saisissez un mouvement — une dépense en espèces, un virement reçu…',
    emptyNoAccounts: 'Créez d’abord un compte pour pouvoir saisir des transactions.',
    count: (n: number) => `${n} transaction${n > 1 ? 's' : ''}`,
    add: 'Ajouter une transaction',
    edit: 'Modifier',
    delete: 'Supprimer',
    allAccounts: 'Tous les comptes',
    filterLabel: 'Compte',
    noPayee: 'Sans libellé',
    noCategory: 'Sans catégorie',
    // French labels for the two directions a manual amount can take.
    directions: {
      expense: 'Dépense',
      income: 'Revenu'
    },
    form: {
      createTitle: 'Nouvelle transaction',
      createDescription: 'Enregistrez un mouvement absent de vos imports : espèces, oubli…',
      editTitle: 'Modifier la transaction',
      editDescription: 'Corrigez le compte, le montant, la date ou le classement de ce mouvement.',
      accountLabel: 'Compte',
      accountPlaceholder: 'Choisir un compte',
      directionLabel: 'Sens',
      amountLabel: 'Montant (€)',
      amountPlaceholder: '0,00',
      dateLabel: 'Date',
      payeeLabel: 'Libellé',
      payeePlaceholder: 'Carrefour, Employeur…',
      categoryLabel: 'Catégorie',
      categoryPlaceholder: 'Choisir une catégorie',
      noCategory: 'Sans catégorie',
      noteLabel: 'Note',
      notePlaceholder: 'Facultatif',
      submitCreate: 'Créer la transaction',
      submitEdit: 'Enregistrer',
      cancel: 'Annuler',
      accountRequired: 'Choisissez un compte.',
      amountRequired: 'Le montant est requis.',
      amountInvalid: 'Montant invalide.',
      amountPositive: 'Le montant doit être supérieur à zéro.',
      dateRequired: 'La date est requise.'
    },
    deleteDialog: {
      title: 'Supprimer cette transaction ?',
      description: (label: string, amount: string) =>
        `« ${label} » (${amount}) sera définitivement supprimée et le solde du compte recalculé.`,
      confirm: 'Supprimer',
      cancel: 'Annuler'
    },
    toast: {
      created: 'Transaction enregistrée.',
      updated: 'Transaction modifiée.',
      deleted: 'Transaction supprimée.',
      createError: 'Impossible d’enregistrer la transaction.',
      updateError: 'Impossible d’enregistrer les modifications.',
      deleteError: 'Impossible de supprimer la transaction.'
    }
  },
  imports: {
    // CSV import flow (see issue #8): pick a file and an account, map the
    // columns on the first import, preview, then validate.
    add: 'Importer CSV',
    dialog: {
      title: 'Importer un fichier CSV',
      description:
        'Importez un relevé exporté depuis votre banque. Rien n’est écrit avant votre validation.',
      accountLabel: 'Compte cible',
      accountPlaceholder: 'Choisir un compte',
      chooseFile: 'Choisir un fichier…',
      noFile: 'Aucun fichier sélectionné.',
      continue: 'Continuer',
      back: 'Retour',
      cancel: 'Annuler',
      refused: (detail: string) => `Import refusé : ${detail}`
    },
    mapping: {
      title: 'Associer les colonnes',
      description:
        'Premier import sur ce compte : indiquez quelle colonne contient chaque valeur. Ce choix sera mémorisé pour les prochains imports.',
      dateLabel: 'Date',
      amountLabel: 'Montant',
      labelLabel: 'Libellé',
      columnPlaceholder: 'Choisir une colonne',
      sampleTitle: 'Aperçu du fichier',
      submit: 'Prévisualiser',
      required: 'Choisissez les trois colonnes.',
      distinct: 'Chaque valeur doit venir d’une colonne différente.'
    },
    preview: {
      title: 'Prévisualisation',
      summary: (added: number, duplicates: number) =>
        `${added} nouvelle${added > 1 ? 's' : ''} transaction${added > 1 ? 's' : ''}, ` +
        `${duplicates} doublon${duplicates > 1 ? 's' : ''} probable${duplicates > 1 ? 's' : ''} ignoré${duplicates > 1 ? 's' : ''}.`,
      duplicateBadge: 'Doublon probable',
      submit: (added: number) => `Importer ${added} transaction${added > 1 ? 's' : ''}`
    },
    toast: {
      imported: (added: number) =>
        `${added} transaction${added > 1 ? 's' : ''} importée${added > 1 ? 's' : ''}.`,
      importError: 'Impossible d’importer le fichier.'
    }
  },
  transfers: {
    // A transfer moves money between two of the user's own accounts; it is
    // neither a revenue nor an expense (see issue #7).
    add: 'Virement',
    // Shown on each leg in the transactions list so a transfer never reads as a
    // plain expense or revenue.
    badge: 'Virement',
    form: {
      title: 'Nouveau virement',
      description: 'Déplacez de l’argent entre deux de vos comptes, sans catégorie.',
      fromLabel: 'Compte source',
      fromPlaceholder: 'D’où part l’argent',
      toLabel: 'Compte destination',
      toPlaceholder: 'Où arrive l’argent',
      amountLabel: 'Montant (€)',
      amountPlaceholder: '0,00',
      dateLabel: 'Date',
      payeeLabel: 'Libellé',
      payeePlaceholder: 'Épargne, remboursement…',
      noteLabel: 'Note',
      notePlaceholder: 'Facultatif',
      submit: 'Enregistrer le virement',
      cancel: 'Annuler',
      fromRequired: 'Choisissez le compte source.',
      toRequired: 'Choisissez le compte destination.',
      sameAccount: 'Les deux comptes doivent être différents.',
      amountRequired: 'Le montant est requis.',
      amountInvalid: 'Montant invalide.',
      amountPositive: 'Le montant doit être supérieur à zéro.',
      dateRequired: 'La date est requise.'
    },
    toast: {
      created: 'Virement enregistré.',
      createError: 'Impossible d’enregistrer le virement.'
    }
  },
  backups: {
    title: 'Sauvegardes',
    description:
      'Copies rotatives de votre base, écrites dans un dossier que vous choisissez. Pointez-le vers Dropbox ou iCloud Drive pour une copie hors-site — l’app n’accède jamais au réseau.',
    folderLabel: 'Dossier de sauvegarde',
    noFolder: 'Aucun dossier configuré.',
    chooseFolder: 'Choisir un dossier',
    changeFolder: 'Changer',
    backupNow: 'Sauvegarder maintenant',
    lastBackup: (when: string) => `Dernière sauvegarde : ${when}`,
    neverBackedUp: 'Aucune sauvegarde effectuée pour l’instant.',
    listTitle: 'Sauvegardes disponibles',
    count: (n: number) => `${n} sauvegarde${n > 1 ? 's' : ''}`,
    empty: 'Aucune sauvegarde dans ce dossier.',
    emptyHint:
      'Une sauvegarde est créée automatiquement au démarrage ; vous pouvez aussi en lancer une maintenant.',
    restore: 'Restaurer',
    restoreDialog: {
      title: 'Restaurer cette sauvegarde ?',
      description: (when: string) =>
        `Votre base actuelle sera remplacée par la sauvegarde du ${when}. Les modifications faites depuis seront perdues, et l’application redémarrera.`,
      confirm: 'Restaurer et redémarrer',
      cancel: 'Annuler'
    },
    toast: {
      created: 'Sauvegarde créée.',
      createError: 'Impossible de créer la sauvegarde.',
      chooseError: 'Impossible de sélectionner le dossier.',
      restoreError: 'Impossible de restaurer la sauvegarde.'
    }
  },
  versions: {
    electron: (version: string | undefined) => `Electron v${version ?? ''}`,
    chromium: (version: string | undefined) => `Chromium v${version ?? ''}`,
    node: (version: string | undefined) => `Node v${version ?? ''}`
  }
} as const
