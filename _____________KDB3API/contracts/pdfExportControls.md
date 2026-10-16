# Contract: `pdfExportControls`

## Owner
- Namespace: `_KDB.api.pdfExportControls`
- Public methods:
  - `mount()`
  - `destroy()`

## Runtime Ownership
- Uses `_KDB.runtime.pdfExportControls` only.
- Owns toolbar DOM refs, listeners, observer, timers, pending promise refs.
- No `_KDB.state.pdfExportControls`.

## Responsibilities
- Own only Cognos toolbar button lifecycle in action bar leading region.
- Mount is idempotent and asynchronously waits for a late Cognos toolbar through `_KDB.utils.waitForElObserver` (30-second bound, owner `AbortController`).
- Toolbar rebuild observation re-resolves the current host and remounts without replacing `pendingPromises.exportRun`.
- Delegate export execution to `_KDB.services.dashboardPdf`.
- Keep button state synchronized (`idle/busy/progress/disabled`).
- Render icon-only control with extension assets (`./v1/ext/KDB3/images/pdf-black.png`, `./v1/ext/KDB3/images/pdf-white.png`) and keep a live hidden text label for accessibility updates.

## Behavior
- If service is missing, disable button and warn once.
- Icon variant selection reads the toolbar host computed foreground `color` (ownerDocument/defaultView), parses rgb/rgba defensively, computes luminance (`0.2126*r + 0.7152*g + 0.0722*b`), and selects black icon for `<128`, otherwise white.
- Icon src is evaluated at initial placement and every toolbar remount.
- During export:
  - disable button
  - render busy/progress label
  - preserve that runtime view model across toolbar remounts
  - reset to idle on completion/failure
- Control root toggles `is-unavailable` while service is unavailable or export is busy, and removes it only in available+idle state; disabled semantics remain on the button.
- Fatal errors:
  - tagged `console.error`
  - best-effort user-facing error modal via `_KDB.services.message.showAlert`
  - no direct Glass call; if `messageService` is unavailable, retain the tagged console error without throwing.

## Teardown
- `destroy()` aborts a pending toolbar wait, removes listeners, disconnects observer, clears timers/pending refs, removes toolbar DOM node, and resets runtime bucket shape.
