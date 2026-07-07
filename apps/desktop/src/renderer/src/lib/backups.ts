/**
 * Renderer-side view of the backups surface exposed on `window.api.backups`
 * (bridged from the main process — see src/main/backups.ts). Types are inferred
 * from the bridge so they can never drift from what main actually returns, the
 * same way `orpc.ts` infers its types from the API contract.
 */

/** Folder, last-backup time and the list of existing backups. */
export type BackupsState = Awaited<ReturnType<typeof window.api.backups.getState>>

/** A single backup file as listed on the settings screen. */
export type BackupEntry = BackupsState['backups'][number]

/** TanStack Query key for the backups state. */
export const backupsKey = ['backups'] as const
