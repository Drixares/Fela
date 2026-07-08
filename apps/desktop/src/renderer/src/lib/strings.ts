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
    // One-gesture rule creation from a transaction (issue #15): « toujours
    // classer SNCF en Transport ».
    createRule: 'Créer une règle depuis cette transaction',
    // History-based suggestion offered on an uncategorised row (issue #15):
    // the last category used for the same payee, accepted in one click.
    suggestion: {
      accept: (category: string) => `Classer en ${category}`,
      acceptLabel: (payee: string, category: string) => `Classer « ${payee} » en ${category}`,
      toast: {
        done: 'Transaction classée.',
        error: 'Impossible de classer la transaction.'
      }
    },
    filters: {
      searchLabel: 'Recherche',
      searchPlaceholder: 'Rechercher un libellé ou une note…',
      categoryLabel: 'Catégorie',
      allCategories: 'Toutes les catégories',
      uncategorized: 'Non catégorisées',
      fromLabel: 'Du',
      toLabel: 'Au',
      minAmountLabel: 'Montant min (€)',
      maxAmountLabel: 'Montant max (€)',
      minAmountPlaceholder: 'Min (€)',
      maxAmountPlaceholder: 'Max (€)',
      reset: 'Réinitialiser les filtres',
      noMatch: 'Aucune transaction ne correspond aux filtres.',
      noMatchHint: 'Élargissez la période ou effacez des filtres pour retrouver vos mouvements.'
    },
    selection: {
      selectAll: 'Sélectionner toutes les transactions affichées',
      selectOne: (label: string) => `Sélectionner « ${label} »`,
      count: (n: number) => `${n} sélectionnée${n > 1 ? 's' : ''}`,
      categoryPlaceholder: 'Choisir une catégorie',
      apply: 'Recatégoriser',
      clear: 'Annuler la sélection',
      toast: {
        done: (n: number) =>
          `${n} transaction${n > 1 ? 's' : ''} recatégorisée${n > 1 ? 's' : ''}.`,
        error: 'Impossible de recatégoriser les transactions.'
      }
    },
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
  rules: {
    // Categorization rules (see issue #13): « si le libellé contient X →
    // catégorie Y », applied to incoming rows at import time, first match wins.
    title: 'Règles de catégorisation',
    empty: 'Aucune règle pour l’instant.',
    emptyHint:
      'Créez une règle « le libellé contient… » pour classer automatiquement vos prochains imports.',
    emptyNoCategories: 'Créez d’abord une catégorie pour pouvoir définir des règles.',
    add: 'Ajouter une règle',
    edit: 'Modifier',
    delete: 'Supprimer',
    moveUp: 'Monter',
    moveDown: 'Descendre',
    // How a rule reads in the list: the pattern, then the category it applies.
    patternPrefix: 'Le libellé contient',
    orderHint: 'Les règles s’appliquent de haut en bas : la première qui correspond gagne.',
    deletedCategory: 'Catégorie supprimée',
    form: {
      createTitle: 'Nouvelle règle',
      createDescription:
        'Classez automatiquement les transactions importées dont le libellé contient un texte.',
      editTitle: 'Modifier la règle',
      editDescription: 'Corrigez le texte recherché ou la catégorie appliquée.',
      patternLabel: 'Le libellé contient',
      patternPlaceholder: 'CARREFOUR',
      patternHint: 'La casse est ignorée : « carrefour » retrouve « CARREFOUR MARKET ».',
      categoryLabel: 'Catégorie appliquée',
      categoryPlaceholder: 'Choisir une catégorie',
      submitCreate: 'Créer la règle',
      submitEdit: 'Enregistrer',
      cancel: 'Annuler',
      patternRequired: 'Le texte recherché est requis.',
      categoryRequired: 'Choisissez une catégorie.'
    },
    // Retroactive application offered at rule creation (issue #15): the app
    // proposes to apply the new rule to matching transactions already in the
    // ledger — only if the user explicitly opts in.
    retroactive: {
      count: (n: number) =>
        `${n} transaction${n > 1 ? 's' : ''} existante${n > 1 ? 's' : ''} ` +
        `correspond${n > 1 ? 'ent' : ''} à ce motif.`,
      apply: 'Les reclasser aussi maintenant',
      toast: {
        applied: (n: number) => `${n} transaction${n > 1 ? 's' : ''} reclassée${n > 1 ? 's' : ''}.`,
        error: 'Règle créée, mais impossible de reclasser les transactions existantes.'
      }
    },
    deleteDialog: {
      title: 'Supprimer cette règle ?',
      description: (pattern: string) =>
        `« ${pattern} » ne sera plus appliquée aux prochains imports. Les transactions déjà classées ne changent pas.`,
      confirm: 'Supprimer',
      cancel: 'Annuler'
    },
    toast: {
      created: 'Règle créée.',
      updated: 'Règle modifiée.',
      deleted: 'Règle supprimée.',
      saveError: 'Impossible d’enregistrer la règle.',
      deleteError: 'Impossible de supprimer la règle.',
      reorderError: 'Impossible de réordonner les règles.'
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
      forcedBadge: 'Forcé',
      // A hint below the list when at least one probable duplicate is shown.
      duplicateHint:
        'Dépliez un doublon probable pour le comparer à la transaction existante, et forcez-le si c’en est un vrai.',
      importedRowLabel: 'Cette ligne',
      existingRowLabel: 'Transaction existante',
      forceLabel: 'Importer quand même (ce n’est pas un doublon)',
      // The category a rule (or the user's correction) will file the row
      // under — shown as a per-row select so the classification is corrigible
      // before validating rather than after (see issue #13).
      categorySelectLabel: (label: string) => `Catégorie appliquée à « ${label} »`,
      noCategory: 'Sans catégorie',
      // Marks a per-row category that was pre-filled from the payee's history
      // (issue #15) rather than by a rule — a proposal the user can accept as is.
      suggestedBadge: 'Suggéré',
      // Count reflects new rows plus the probable duplicates the user forced.
      submit: (added: number) => `Importer ${added} transaction${added > 1 ? 's' : ''}`
    },
    toast: {
      imported: (added: number) =>
        `${added} transaction${added > 1 ? 's' : ''} importée${added > 1 ? 's' : ''}.`
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
  exports: {
    title: 'Export des données',
    description:
      'Exportez tout votre historique — comptes, groupes, catégories et transactions — pour rester propriétaire de vos données.',
    hint: 'Le fichier contient l’intégralité de votre base, virements identifiés.',
    csv: 'Exporter en CSV',
    json: 'Exporter en JSON',
    toast: {
      saved: 'Export enregistré.',
      error: 'Impossible d’exporter les données.'
    }
  },
  reports: {
    title: 'Répartition des dépenses',
    subtitle: 'Où part mon argent ? Vos dépenses par groupe sur la période choisie.',
    // Every visible label for the shared period selector (see lib/period.ts).
    period: {
      thisMonth: 'Ce mois',
      lastMonth: 'Mois dernier',
      last3: '3 mois',
      last6: '6 mois',
      last12: '12 mois',
      custom: 'Personnalisée',
      fromLabel: 'Du',
      toLabel: 'Au',
      invalid: 'La date de début doit précéder la date de fin.'
    },
    total: 'Total des dépenses',
    // The « Sans groupe » bucket (categorized, but the category has no group)
    // and the « Non classé » segment (no category at all) are distinct.
    ungrouped: 'Sans groupe',
    uncategorized: 'Non classé',
    uncategorizedHint:
      'Des transactions de la période ne sont pas catégorisées — le rapport est incomplet.',
    share: (percent: number) =>
      `${percent.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`,
    empty: 'Aucune dépense sur cette période.',
    emptyHint: 'Choisissez une autre période, ou importez et catégorisez des transactions.',
    // Drill-down: group → categories → transactions.
    back: 'Retour',
    drillGroup: (name: string) => `Détail : ${name}`,
    drillCategory: (name: string) => `Transactions : ${name}`,
    txCount: (n: number) => `${n} transaction${n > 1 ? 's' : ''}`,
    noPayee: 'Sans libellé'
  },
  cashFlow: {
    // « Est-ce que je vis au-dessus de mes moyens ? » — revenus vs dépenses par
    // mois sur la période choisie (12 mois par défaut, voir issue #16).
    title: 'Cash flow mensuel',
    subtitle: 'Est-ce que je vis au-dessus de mes moyens ? Vos revenus et dépenses, mois par mois.',
    income: 'Revenus',
    expenses: 'Dépenses',
    // The period totals shown above the chart.
    netLabel: 'Solde net',
    surplus: 'Excédent',
    deficit: 'Déficit',
    empty: 'Aucun mouvement catégorisé sur cette période.',
    emptyHint: 'Choisissez une autre période, ou classez vos transactions en revenus et dépenses.',
    // Uncategorized movements carry no revenu/dépense type, so they count on
    // neither side — surfaced so an incomplete cash flow is never mistaken for a
    // complete one (like the « Non classé » segment of the group breakdown).
    incompleteHint: (n: number) =>
      `${n} mouvement${n > 1 ? 's' : ''} non catégorisé${n > 1 ? 's' : ''} ` +
      `sur la période ${n > 1 ? 'ne sont' : "n'est"} compté${n > 1 ? 's' : ''} ` +
      `ni en revenus ni en dépenses — le cash flow est incomplet.`
  },
  versions: {
    electron: (version: string | undefined) => `Electron v${version ?? ''}`,
    chromium: (version: string | undefined) => `Chromium v${version ?? ''}`,
    node: (version: string | undefined) => `Node v${version ?? ''}`
  }
} as const
