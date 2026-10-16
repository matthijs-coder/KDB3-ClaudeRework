# Execution Spec: PDF overlay sandwich captions (session + stage)

> Implements `contracts/loadingService-dashboardPdf-progress-caption-sandwich-contractdelta.md` (**Approved**, PO vastenburg 2026-09-04, spinner 80 first). Architecture lives in that delta. This spec is mechanical: exclusive slices, files, MUST echoes.

---

**Status:** `Frozen` — Cognos green, PO vastenburg 2026-09-04. WP closed.
**Module / contract:** sandwich follow-up to `contracts/loadingService-dashboardPdf-progress-caption-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-04
**Executing AI:** grok 4.6 army W1–W2
**Reviewer:** captain + dual grok 4.6 review + PO Cognos (sandwich delta §8)

No harness. Production tree only.

---

## Exclusive allowlists (no two writers on the same file)

### W1 loadingService session node + CSS 80px

**May create:**

- `KDB3/js/core/services/loadingService/effects/syncLoadingSessionCaption.js` (only if `syncLoadingCaption.js` would exceed 150 or mix two querySelectors uncleanly)

**May edit:**

- `KDB3/js/core/services/loadingService/effects/applyLoadingOverlay.js`
- `KDB3/js/core/services/loadingService/effects/syncLoadingCaption.js`
- `KDB3/js/core/services/loadingService/effects/updateLoadingMessage.js`
- `KDB3/js/core/services/loadingService/effects/resolveLoadingMessage.js` (only if session fields need the same resolve helper — prefer calling existing `__controller(_KDB, { message, messageKey })` twice with remapped keys rather than growing the helper)
- `KDB3/js/core/services/loadingService/createLoadingService.js` (only if `startLoading` must pass session fields; stay ≤150, AMD ≤10)
- `KDB3/css/loadingAnimation.css`

**Must not edit:** `__orchestratorLoadingService.js`, `loadingLabels.js` (copy unchanged), any `dashboardPdf/**`, `traverseTabs.js`, `KDB.js`, writeback, widgetSettings, `.cursor/rules/**`, parent contracts.

### W2 dashboardPdf start uses `sessionMessageKey`

**May edit:**

- `KDB3/js/core/services/dashboardPdf/effects/manageLoadingSession.js` — `startLoadingForRun` only: `sessionMessageKey: "pdfExport"`; **remove** `messageKey: "pdfExport"`. Other start fields unchanged (`watchdogMs: 1800000`, `mountKey`, `transparent`). Stay ≤150.

**Must not edit:** loadingService internals, `captureTabPage.js` (stage updates already go to `updateLoadingMessage`), `createDashboardPdfService.js`, `runDashboardPdfExport.js`, `formatPdfLoadingCaption.js`, `yieldForPaint.js`, `traverseTabs.js`, `KDB.js`, CSS, labels.

If `manageLoadingSession.js` cannot drop `messageKey` without a new line over 150: replace the existing `messageKey` line in place (same line count).

---

## Section A. Pre-flight (each writer, before files)

Echo **one sentence each**, numbered, then write.

1. `kdb-object.mdc`
2. `state.mdc`
3. `runtime.mdc`
4. `module-public-api.mdc`
5. `events.mdc`
6. `feature-structure.mdc`
7. `naming.mdc`
8. `error-handling.mdc`
9. `dom.mdc`
10. `amd.mdc`
11. `lifecycleVocabulary.md` — overlay captions are not a lifecycle status; do not invent a term for session vs stage
12. `contracts/loadingService-dashboardPdf-progress-caption-sandwich-contractdelta.md`
13. `contracts/loadingService.md` Public API (startLoading / updateLoadingMessage / disposed)
14. This execution spec

---

## Section B. W1 work

### Resolve session vs stage

Reuse `resolveLoadingMessage(_KDB, { message, messageKey })` for stage (today). For session, call it with `{ message: options.sessionMessage, messageKey: options.sessionMessageKey }` — do **not** add a formatter API. Do not invent DE strings.

### Markup

`SPINNER_HTML` stays spinner + `.KDB_loadingMessage` only (boot/tree/slot must not gain a session `<p>`).

When resolved session string is non-empty:

1. Ensure `<p class="KDB_loadingSessionMessage">` as **first** child of the stored spinner container, **before** `.loading_indicator` (insertBefore; `dom.mdc`: work on the stored spinner node, no `document.querySelector` for discovery).
2. Sync session `textContent` + `hidden` (same as stage).
3. Sync stage via existing `.KDB_loadingMessage` path.

When session is empty: do not create the session `<p>`. Do **not** stamp `KDB_loading--sessionStage` (unused; sandwich is DOM order).

Reuse of an existing spinner (nested start / second `applyLoadingOverlay` on same mount): if session now empty, do not leave a stale visible session line (hide/remove session node). PDF will pass session on the first start only.

### `syncLoadingCaption.js`

Must keep querying **`.KDB_loadingMessage` only** (stage). Never `.querySelector("p")`. If you add a session helper, use class `KDB_loadingSessionMessage` only.

try/catch: existing log + rethrow on the extracted helper is allowed.

### `updateLoadingMessage.js`

Stage only. No session write. Still no `markLoadingStarted` / `scheduleLoadingWatchdog` / state writes. Direct-child spinner check unchanged. Return `true`/`false`, never throw.

### CSS

1. Add generic `.KDB_loading .KDB_loadingSessionMessage` rules **exactly** as the delta §5 (margin 0 0 12px, 14px/1.4, empty/hidden hide).
2. **Replace** the PDF tab-list spinner/caption rules (current 32px / 11px) with the delta §5 PDF block: overflow hidden stays; spinner **80×80**; both caption classes **14px / 1.4**.
3. Do not change slot/tree 32px / 11px. Do not change z-index 1000. No `.pagegenericPage` / `#kdb-control-*` in the new PDF rules.

### Caps

JS ≤150, AMD ≤10, `"use strict"`, factory-scope helpers, `_` boundary params, try/catch on named executables. No ES modules. No `helpers/` folder. No `_KDB.cognosAPI`.

---

## Section C. W2 work

In `startLoadingForRun`, the `startLoading({...})` options object:

- Keep `mountEl`, `mountKey: "dashboard-pdf-export"`, `transparent: false`, `watchdogMs: 1800000`.
- Set `sessionMessageKey: "pdfExport"`.
- **Delete** `messageKey: "pdfExport"` (duration must not also land on the stage `<p>`).

Do not change `updateRunCaption` / `bindProgressCaption` / capture path. Those already call `updateLoadingMessage` for stage.

---

## Section J. Acceptance (writers self-check)

1. PDF start uses `sessionMessageKey: "pdfExport"` and does **not** pass stage `messageKey` at start.
2. Session node class is `KDB_loadingSessionMessage`; stage stays `KDB_loadingMessage`; `updateLoadingMessage` cannot overwrite session.
3. No `mountKey === "dashboard-pdf-export"` branch in loadingService.
4. Spinner CSS 80px on PDF tab-list + `.KDB_loading`; slot/tree still 32px.
5. Caption CSS 14px on PDF session+stage; PDF 11px rules gone.
6. `overflow: hidden` still on PDF tab-list + `.KDB_loading`.
7. No second `startLoading` for caption changes; no `activeCount` bump on update.
8. `loadingLabels.js` untouched. No DE in `dashboardPdf/**`.
9. Every edited JS file ≤150, AMD ≤10.

---

## Section K. Forbidden

- Sandwich via concatenating two strings into one `<p>`
- Restoring 110px in this WP
- Overlay on capture root
- Encode changes
- Editing `.mdc` / parent contracts (captain one-liners **after** review)
- Commit / push
- `helpers` / `common` / `shared` folders; ES modules

---

## Section L. Writer report

1. Section A echo (14)
2. File table: path, lines, AMD count, matches spec | deviation
3. Deviations with motivation
4. Section J pass/fail
5. Open questions (improvisation only)

---

## Parent one-liners (captain after dual review — not writers)

- `loadingService.md`: `startLoading` signature add `sessionMessage?` / `sessionMessageKey?`.
- Progress-caption delta: lock 4 + compact 32/11 superseded by this sandwich delta (one line each).
- `dashboardPdf.md` §2: `sessionMessageKey:"pdfExport"` instead of stage `messageKey:"pdfExport"`.
- Overlay-coverage markup: optional session `<p>` when session caption used (one line).

Cognos checklist = sandwich delta §8. Captain does not self-certify Cognos green.
