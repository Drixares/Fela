/**
 * The file an export procedure hands back: a suggested name and the full
 * content as a string. The renderer forwards both, verbatim, to the main
 * process, which shows the native save dialog and writes to disk — the only
 * layer allowed to touch the filesystem (see the V1 PRD, #1, and issue #10).
 * Must stay structurally identical to `ExportFileToSave` in the desktop app's
 * shared/ipc.ts, which redeclares it to stay free of workspace imports.
 */
export interface ExportFile {
  fileName: string;
  content: string;
}

/** `fela-export-2026-07-08.json` — dated so successive exports never collide. */
export function exportFileName(extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `fela-export-${stamp}.${extension}`;
}
