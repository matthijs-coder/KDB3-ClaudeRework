# Execution Spec: PDF export progress captions on `loadingService`

> Implements `contracts/loadingService-dashboardPdf-progress-caption-contractdelta.md` (**Approved**, PO vastenburg 2026-09-04). Architecture lives in that delta. This spec is mechanical: exclusive slices, files, MUST echoes.

---

**Status:** `Frozen` — Cognos green, PO vastenburg 2026-09-04. WP closed.
**Module / contract:** `contracts/loadingService.md` + overlay-coverage delta + this PDF-caption delta + `contracts/dashboardPdf.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-04
**Executing AI:** grok 4.6 army W1–W2 (fresh captain coordinates)
**Reviewer:** fresh captain + dual grok 4.6 review + PO Cognos (delta §10)

No harness. Production tree only.

---

## Exclusive allowlists (no two writers on the same file)

### W1 loadingService API + labels + compact CSS

**May create:**

- `KDB3/js/core/services/loadingService/effects/resolveLoadingMessage.js`
- `KDB3/js/core/services/loadingService/effects/syncLoadingCaption.js`
- `KDB3/js/core/services/loadingService/effects/updateLoadingMessage.js`

**May edit:**

- `KDB3/js/core/services/loadingService/createLoadingService.js`
- `KDB3/js/core/services/loadingService/effects/applyLoadingOverlay.js`
- `KDB3/js/core/services/loadingService/config/loadingLabels.js`
- `KDB3/css/loadingAnimation.css`

**Must not edit:** `__orchestratorLoadingService.js` (label merge already `Object.assign({}, defaults, existing)` — new keys in `loadingLabels.js` are enough), any `dashboardPdf/**`, `runDashboardPdfExport.js`, `traverseTabs.js`, `KDB.js`, writeback, widgetSettings, `.cursor/rules/**`.

### W2 dashboardPdf captions + yield + PDF watchdog

**May create:**

- `KDB3/js/core/services/dashboardPdf/effects/yieldForPaint.js`
- `KDB3/js/core/services/dashboardPdf/effects/formatPdfLoadingCaption.js`

**May edit:**

- `KDB3/js/core/services/dashboardPdf/effects/manageLoadingSession.js`
- `KDB3/js/core/services/dashboardPdf/effects/captureTabPage.js`
- `KDB3/js/core/services/dashboardPdf/createDashboardPdfService.js` (one-line wrap of `onProgress` only)
- `KDB3/js/core/services/dashboardPdf/runDashboardPdfExport.js` **only** to pass **visible ordinal** on the existing `_captureTabPage(...)` call: `_captureTabPage(_KDB, manifest.tabs[tabIdx], vendor.html2canvas, options.signal, timeoutMs, tabIdx + 1, manifest.tabs.length)` (must stay ≤150 lines). `{n}` / `{m}` are **1-based position in `manifest.tabs`**, not Cognos `tab.index` (hidden tabs would skip numbers). If that would add a line over 150: do not edit the runner; instead have `captureTabPage` accept only `_tab` and let `manageLoadingSession` / a W2 sibling receive ordinals via `runtime.dashboardPdf.activeRun` fields set in the wrapped `onProgress` — still **not** `tab.index + 1`.

**Must not edit:** loadingService internals (call `_KDB.services.loading` only), `__orchestratorDashboardPdf.js`, `captureCanvasBounded.js` (yield stays in `captureTabPage` before that call), `pdfExportControls/**`, `traverseTabs.js`, `pdfCapture.css`, `KDB.js`.

---

## Section A. Pre-flight (each writer, before files)

Echo **one sentence each**, numbered, then write. Do not ingest these into the captain thread.

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
11. `lifecycleVocabulary.md`
12. `contracts/loadingService-dashboardPdf-progress-caption-contractdelta.md`
13. `contracts/loadingService.md` Public API + disposed (only that section if the file is huge)
14. This execution spec

---

## Section B. W1 work

### Labels (`loadingLabels.js`)

Add keys exactly (UTF-8, en-dash U+2013 in `pdfExport` as in the delta):

| Key | DE |
|---|---|
| `pdfExport` | PDF-Export läuft – das kann einige Minuten dauern |
| `pdfTitle` | Titelseite wird erstellt |
| `pdfTabPrepare` | Registerkarte {n} von {m} wird vorbereitet |
| `pdfTabCapture` | Registerkarte {n} von {m} wird erfasst |
| `pdfAttachment` | Anhang wird erstellt |
| `pdfSave` | PDF wird gespeichert |

Keep existing seven keys. Do not hardcode DE elsewhere.

### Extract caption helpers

Move `resolveLoadingMessage` and `syncLoadingCaption` out of `applyLoadingOverlay.js` unchanged in behavior. `applyLoadingOverlay` AMD-imports them. Direct-child spinner reuse (`:scope >`) stays. File ≤150.

### `updateLoadingMessage.js`

- **Role:** named-method effect
- **Entry:** `__controller(_KDB, _options)` returning `true` / `false`
- Resolve `mountKey` from `options.handle.mountKey` or `options.mountKey`. No `kdbWidget` fallback.
- `false` when: missing `_KDB`; missing `mountKey`; `_KDB.state.loading[mountKey].isActive !== true`; no spinner in `_KDB.runtime.loadingService.domRefs.spinnersByMountKey[mountKey]`.
- Caption via `resolveLoadingMessage` then `syncLoadingCaption` only.
- try/catch: `console.error("[loadingService.updateLoadingMessage] failed", error)`; return `false`.
- **Rules:** `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `module-public-api.mdc` (no throw), `runtime.mdc` (owner runtime read only), `dom.mdc` (caption node only).

### `createLoadingService.js`

Add `updateLoadingMessage` on the returned object. Disposed: once `console.warn("[loadingService.updateLoadingMessage] called after destroy")`, return `false`. Public try/catch like `startLoading`. AMD +1. Stay ≤150.

### Compact CSS (`loadingAnimation.css`)

Append **only** (do not restyle slot/tree/boot):

```css
.ba-common-container.ba-common-tabList__innerContainer.KDB_loading {
  overflow: hidden;
}
.ba-common-container.ba-common-tabList__innerContainer.KDB_loading .ba-common-progressIndicator.is-circle.is-large {
  width: 32px;
  height: 32px;
}
.ba-common-container.ba-common-tabList__innerContainer.KDB_loading .KDB_loadingMessage {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.3;
}
```

z-index stays 1000. No canvas selectors.

---

## Section C. W2 work

### `formatPdfLoadingCaption.js`

Pure helper: `__controller(_KDB, _messageKey, _params)` → string or `""`.
Read `_KDB.config.labels.de.loading[messageKey]`. If `_params` has `n`/`m`, replace `{n}` and `{m}` with `String(...)`. No German literals. try/catch → `""`.

### `yieldForPaint.js`

`__controller(_signal)` → `Promise`. Resolve after **two** `requestAnimationFrame` callbacks. If rAF missing, `setTimeout(..., 0)` twice. After each wait: if `_signal && _signal.aborted`, resolve anyway (caller checks abort). try/catch log + resolve. No runIds. No `window._KDB`.

### `manageLoadingSession.js`

- `startLoadingForRun`: add `watchdogMs: 1800000`, `messageKey: "pdfExport"`. Other start fields unchanged.
- Add `updateRunCaption(_KDB, _runSession, _options)` where `_options` is `{ messageKey }` or `{ message }`. Calls `loading.updateLoadingMessage({ handle: _runSession.loadingHandle, ... })`. Missing service/handle/method: no throw (existing warning style OK).
- Add `bindProgressCaption(_KDB, _runSession, _onProgress)` returning a function that:
  1. Maps `payload.stage` → caption: `title` → `pdfTitle`; `attachment` → `pdfAttachment`; `save` → `pdfSave`.
  2. **Ignores `stage === "capture"`** (and unknown stages) for overlay text — tab captions belong to `captureTabPage`.
  3. Then calls original `_onProgress` if it is a function (keep English toolbar crumbs).
- Do not put html2canvas or tab loops here. Stay ≤150; split a sibling if needed (W2-created, not a `helpers/` folder).

### `createDashboardPdfService.js`

Pass `onProgress: _manageLoadingSession.bindProgressCaption(_KDB, runSession, options.onProgress)` into `runDashboardPdfExport`. Do not add other logic. Stay ≤150. AMD unchanged (already imports manageLoadingSession).

### `captureTabPage.js`

Order inside `captureTabPage` after the function starts:

1. Resolve handle from `_KDB.runtime.dashboardPdf.activeRun.loadingHandle` (same owner; do not look up `_KDB.services.cognosHost`).
2. `{n}` / `{m}` = visible-list ordinal, **not** `_tab.index`. Prefer args `_ordinal` (`tabIdx + 1`) and `_tabCount` (`manifest.tabs.length`) from the runner. Fallback if runner cannot grow: store `{ ordinal, tabCount }` on `_KDB.runtime.dashboardPdf.activeRun` from `bindProgressCaption` when `stage === "capture"` **before** `captureTabPage` runs (that report already fires first) — then read those fields. Never `Number(_tab.index) + 1`.
3. Caption prepare: `formatPdfLoadingCaption(_KDB, "pdfTabPrepare", { n: n, m: m })` then `updateLoadingMessage({ handle, message })`.
4. Existing `activateTabAndRender` + abort + capture root + `waitForCaptureReadiness`.
5. Caption capture: same with `"pdfTabCapture"`.
6. `await yieldForPaint(_signal)`.
7. If aborted → existing abort throw.
8. Existing `captureCanvasBounded` then `toDataURL`.

Do **not** start tab-page overlay. Do **not** call `_KDB.cognosAPI` except the existing `resolveCaptureRoot` exception already in this file. AMD + format + yield (≤10). Stay ≤150; if over, extract `activateTabAndRender` to a sibling (W2).

Preferred runner call (same line count): `_captureTabPage(_KDB, manifest.tabs[tabIdx], vendor.html2canvas, options.signal, timeoutMs, tabIdx + 1, manifest.tabs.length)`.

---

## Section D. Public API (after W1)

```js
_KDB.services.loading = {
  startLoading, finishLoading, updateLoadingMessage, destroy
};
```

No events. No `_KDB.state` writes from `updateLoadingMessage`.

---

## Section J. Acceptance (writers self-check)

1. Overlay still `mountKey: "dashboard-pdf-export"` on tab-list inner; `watchdogMs: 1800000`; start `messageKey: "pdfExport"`.
2. `updateLoadingMessage` does not bump `activeCount` or reset watchdog (verify: no `markLoadingStarted` / `scheduleLoadingWatchdog` on that path).
3. Tab-page overlay still skipped for `source === "dashboardPdf"` (W2 must not touch `traverseTabs.js`; confirm by not editing it).
4. `onProgress` stage `capture` does **not** set overlay to erfasst before prepare.
5. Double rAF (or double timeout fallback) runs **after** capture caption and **before** `captureCanvasBounded`.
6. No DE literals in `dashboardPdf/**`. No JPEG/scale/`toBlob` change. `runDashboardPdfExport.js` ≤150.
7. Compact CSS selector includes `.KDB_loading` and does not target `#kdb-control-*` or `.pagegenericPage`.
8. Disposed / inactive update returns `false`, no throw.
9. Every new/edited JS file: AMD `define`, `"use strict"`, factory-scope helpers only, try/catch on named executables, ≤150, AMD ≤10.

---

## Section K. Forbidden

- Second `startLoading` to change caption
- Overlay / spinner on `.pagegenericPage` or capture root
- Per-widget progress strings
- `updateLoadingMessage` formatter/`replacements` API
- Encode quality changes
- pdfExportControls label changes
- New events / `eventSubscribe.md`
- Editing `.mdc`, parent contracts (captain does one-liners **after** review)
- Commit / push
- `helpers` / `common` / `shared` folders
- ES modules in `KDB3/js/**`
- `_KDB.cognosAPI` / `__getDashboardAPI` in **new** files

---

## Section L. Writer report

1. Section A echo (14)
2. File table: path, lines, AMD count, matches spec | deviation
3. Deviations with motivation
4. Section J pass/fail
5. Open questions (improvisation only)

---

## Parent one-liners (captain after dual review — not writers)

Do **not** rewrite parents. After GREEN review:

- `loadingService.md`: Status pointer to this delta; method table add `updateLoadingMessage`.
- `loadingService-overlay-coverage-contractdelta.md`: PDF row + “no caption (PDF)” + OOS “PDF German caption” superseded by this delta (one-line each).
- `dashboardPdf.md` Execution Contract §2: `watchdogMs:1800000`, `messageKey:"pdfExport"`; §5: prepare/capture captions + double-rAF (short).

Cognos checklist for PO = delta §10. Captain does not self-certify Cognos green.
