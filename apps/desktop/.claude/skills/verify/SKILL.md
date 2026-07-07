---
name: verify
description: Launch and drive the Fela desktop app to verify renderer/API changes end-to-end — CDP recipe, DB safety, and gotchas.
---

# Verifying the desktop app end-to-end

## Launch with a CDP handle

```bash
cd apps/desktop && npx electron-vite dev -- --remote-debugging-port=9222
```

Run it in the background; poll `http://127.0.0.1:9222/json` until a `page`
target titled `Fela` appears, then drive it over the DevTools protocol
(Node ≥ 21 has a global `WebSocket`; no extra deps needed):
`Runtime.evaluate` to read the DOM, `Input.dispatchMouseEvent` +
`Input.insertText` for real interactions, `Page.captureScreenshot` for
evidence.

## Database safety

In dev the app opens `packages/db/dev.db` (WAL mode — data sits in
`dev.db-wal`, so the `.db` file's mtime is meaningless). Before mutating,
snapshot the state; afterwards restore **via SQL**, not by replacing the
file — another dev instance may hold the database open, and swapping the
file under a live WAL connection corrupts it. Seeding fixtures directly
with `sqlite3` is fine; dates are epoch **seconds**
(`strftime('%s', '2026-03-01')`).

## Gotchas that cost time

- **Two instances**: the user often has their own `pnpm dev` running.
  Always pass `--remote-debugging-port` and address your instance through
  CDP; check `ps aux | grep remote-debugging-port` when confused. Kill
  only your own PIDs when done.
- **Scroll before you click**: `getBoundingClientRect` is viewport-relative;
  a synthetic click at negative `y` silently lands elsewhere. Always
  `scrollIntoView` the target first.
- **Base UI selects keep every popup's options in the DOM**: filter
  `[role="option"]` candidates with `el.getClientRects().length > 0`
  before clicking, or you'll hit a hidden option from another select.
- Toasts render under `[data-sonner-toast]`; badges under
  `[data-slot="badge"]`.
