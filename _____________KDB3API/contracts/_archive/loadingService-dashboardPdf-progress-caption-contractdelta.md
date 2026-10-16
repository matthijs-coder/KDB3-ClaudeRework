# Contract Delta: PDF export progress captions on `loadingService`

> Mid-run German status on the existing PDF overlay. Same service, same tab-list mount, no second animation. Encode quality unchanged. PO locked 2026-09-04 after army review.

---

**Status:** `Approved` — PO vastenburg 2026-09-04; Cognos green; WP closed.
**Type:** `shared service contract delta` + `dashboardPdf` caller wiring
**Authoring AI:** Cursor Grok 4.6 (coordinator), 2026-09-04
**Reviewed by:** army slices (loadingService API, capture coupling, UX/runtime, contracts) 2026-09-04; PO product 1–4 same day
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`, `cognos-adapter.mdc`

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/loadingService.md` | Public API: add `updateLoadingMessage`; folder layout caption helpers; disposed table |
| `contracts/loadingService-overlay-coverage-contractdelta.md` | PDF row caption keys; resolve-text “no caption (PDF)”; OOS “PDF German caption” |
| `contracts/dashboardPdf.md` | Execution Contract §2 start caption + PDF watchdog; §5 prepare/capture captions + paint yield |

**Reaffirmed, not amended:** `loadingService-overlay-coverage-cognos-followup-contractdelta.md` §5 — PDF traverse still **does not** start the tab-page overlay. `dashboardPdf-focus-mode-exit-restore-contractdelta.md` unchanged. `pdfExportControls.md` unchanged.

---

## 1. Purpose

The PDF overlay already covers the tab-list mount for the whole export, but the caption is empty and the CSS spinner freezes during html2canvas / PNG encode. Users read that as a hang.

This WP labels honest stages (including first-time vendor load and tab n of m) on that overlay, and yields one paint before the capture CPU wall so the new line is visible. It does **not** shorten encode, does **not** put the overlay on the canvas, and does **not** claim per-widget progress.

---

## 2. Closed product decisions (PO vastenburg 2026-09-04)

| # | Decision |
|---|---|
| 1 Package | Existing `_KDB.services.loading`. New caption-only `updateLoadingMessage`. Compact spinner CSS on the PDF tab-list mount. Longer **PDF-only** watchdog. Double-rAF yield after the capture caption, then abort check, then html2canvas. Overlay stays tab-list inner; never `.pagegenericPage`. |
| 2 Copy | Catalog strings in §5. Exact DE locked. |
| 3 Encode | JPEG / scale / `toBlob` **out of this WP**. |
| 4 Freeze honesty | Duration hint **only** on the start line. Capture line is `Registerkarte {n} von {m} wird erfasst` with **no** extra “Anzeige kann kurz stehen bleiben”. **Superseded** by `loadingService-dashboardPdf-progress-caption-sandwich-contractdelta.md` (sticky session line for the whole overlay; stage below spinner). |

Army UX slice still prefers a freeze clause on capture. **PO lock 4 wins.** Recorded, not reopened in implementation.

Army technical adjustments stamped here (do not re-litigate product 1–4):

| Topic | Lock |
|---|---|
| PDF `watchdogMs` | **1800000** (30 min). Live PDF already passed `300000`, which equals the service default — “longer” was otherwise a no-op. Not `tabCount * 60s` (tabCount unknown at overlay start; per-tab fail ceiling is 132s not 60s). Other callers stay `300000`. |
| Compact CSS | Scope with `.KDB_loading` on the PDF mount (slot/tree pattern). 32px spinner, 11px caption. **Superseded** by sandwich delta: PDF spinner **80px**, captions **14px**, `overflow: hidden` kept. |
| Caption API | Never use a second `startLoading` to change text (`activeCount` leak + watchdog reset). |
| Formatting | loadingService is **not** a formatter. dashboardPdf fills `{n}` / `{m}` and passes resolved `message`. |
| Toolbar | English `onProgress` / `"PDF " + stage` crumbs **out of scope**. Overlay is the user-facing German surface. |

---

## 3. `updateLoadingMessage`

Surface stays `_KDB.services.loading` (named methods). Handle stays `{ mountKey, mountEl }` (live Q12 A). No events.

```js
_KDB.services.loading = {
  startLoading: startLoading,
  finishLoading: finishLoading,
  updateLoadingMessage: updateLoadingMessage,
  destroy: destroy
};
```

```js
updateLoadingMessage({
  handle?,     // prefer; same object startLoading returned
  mountKey?,   // alternate when handle missing; require handle.mountKey or mountKey
  message?,    // already-resolved string (same precedence as startLoading)
  messageKey?  // key in _KDB.config.labels.de.loading
})
```

Returns `true` when the caption node was updated, `false` otherwise. Never throws.

**Does:** resolve caption exactly like `startLoading` (`message` if non-empty string, else `labels.de.loading[messageKey]`, else empty). Resolve spinner **only** from `_KDB.runtime.loadingService.domRefs.spinnersByMountKey[mountKey]`. Call existing caption sync (`textContent` + `hidden`). Empty caption hides the `<p>` as today.

**Does not:** increment `activeCount`; insert/rebuild overlay; add/remove `KDB_loading`; change position overrides; reset or cancel watchdog; cancel `removeDelay`; deep-query nested Cognos `.loadingIndicatorContainer`; fall back to `_KDB.elements.kdbWidget`.

**No-op (`false`) when:** `_isDisposed`; unknown / missing `mountKey`; `_KDB.state.loading[mountKey].isActive !== true`; spinner missing from `spinnersByMountKey`; spinner no longer a direct child of the mount. Disposed: `console.warn` once (same pattern as `startLoading` / `finishLoading`). Other no-ops: silent `false` (optional once-warn for unknown key is allowed, not required).

Callers must not use `startLoading` as a caption updater. Nested starts on a shared `mountKey` (vis / tab-page) stay `activeCount` owners; they do not switch to this method for overlap.

Lift `syncLoadingCaption` and `resolveLoadingMessage` out of `applyLoadingOverlay.js` into loadingService effects so both `startLoading` and `updateLoadingMessage` share one implementation. Do not grow `applyLoadingOverlay.js` toward 150.

---

## 4. PDF overlay session

Mount, `mountKey` (`dashboard-pdf-export`), `transparent: false`, and “always on / not Play-gated” stay as today. Tab-page overlay stays skipped for `source === "dashboardPdf"`.

**Start** (before vendor load, as today):

```js
startLoading({
  mountEl: context.mountEl,
  mountKey: "dashboard-pdf-export",
  transparent: false,
  watchdogMs: 1800000,
  messageKey: "pdfExport"
})
```

Store the handle on `runSession` as today. Mid-run updates pass **that handle**.

**Mid-run** (dashboardPdf owns wording):

1. Read the catalog template from `_KDB.config.labels.de.loading[<key>]`.
2. For tab lines, replace `{n}` and `{m}` with decimal strings (`tabIndex + 1`, `manifest.tabs.length`). No other placeholders. Missing template → skip update (do not hardcode DE in `dashboardPdf/**`).
3. `updateLoadingMessage({ handle: runSession.loadingHandle, message: resolved })` for parameterized lines; `messageKey` is enough for non-parameterized stages.
4. Missing loadingService / missing handle: keep today’s coded loading warnings; export continues; do not invent a second overlay.

**Stage → caption** (user-visible):

| Moment | Catalog key | Visible DE |
|---|---|---|
| Overlay start (covers first AMD vendor load) | `pdfExport` | PDF-Export läuft – das kann einige Minuten dauern |
| Title page | `pdfTitle` | Titelseite wird erstellt |
| Before tab activate + widget render gate | `pdfTabPrepare` | Registerkarte {n} von {m} wird vorbereitet |
| After readiness, **before** html2canvas | `pdfTabCapture` | Registerkarte {n} von {m} wird erfasst |
| Anhang | `pdfAttachment` | Anhang wird erstellt |
| Save | `pdfSave` | PDF wird gespeichert |

**Paint yield (capture only):** after the capture caption is set, await **two** `requestAnimationFrame` turns, re-check abort, then `html2canvas`. Yield helper lives under `dashboardPdf/effects/` (factory-scope). Not `core/utils`, not loadingService, no runIds, no `window` discovery. Abort after yield must not enter capture. Yield before `toDataURL` is **not** required this WP.

**Finish:** still exactly once in the outer service `finally` (`finishLoading({ handle })`), success / error / abort. Watchdog `finishLoading` at 1800000 remains the leak-net if the run never reaches `finally`.

Caption / yield / format logic must **not** land in `runDashboardPdfExport.js` (already at the 150-line hard cap). Natural homes: `manageLoadingSession.js` (start + update-by-handle) and `captureTabPage.js` (prepare vs capture + yield). Title / Anhang / save updates from session helpers called around the existing `report(...)` points without thickening the runner past 150 — extract a thin session helper if needed.

`prepare` is a **new** PDF progress moment (not a live `onProgress.stage` today). Implementation may emit `onProgress` with `stage: "prepare"` for diagnostics; toolbar still concatenates English `stage` and stays out of scope.

---

## 5. Labels

Add to `loadingService/config/loadingLabels.js` (same merge onto `_KDB.config.labels.de.loading`):

| Key | DE |
|---|---|
| `pdfExport` | PDF-Export läuft – das kann einige Minuten dauern |
| `pdfTitle` | Titelseite wird erstellt |
| `pdfTabPrepare` | Registerkarte {n} von {m} wird vorbereitet |
| `pdfTabCapture` | Registerkarte {n} von {m} wird erfasst |
| `pdfAttachment` | Anhang wird erstellt |
| `pdfSave` | PDF wird gespeichert |

Existing overlay-coverage keys unchanged. Callers still must not hardcode DE in feature files except this catalog. dashboardPdf may only **substitute** `{n}` / `{m}` on strings read from the catalog.

Supersedes overlay-coverage:

- table row “PDF export … **none this WP**” → keys above
- resolve rule “else **no caption** (PDF)” → else no caption when neither `message` nor `messageKey` resolves (PDF now passes keys)
- Out of scope “PDF German caption”

---

## 6. Compact CSS (PDF mount only)

In `KDB3/css/loadingAnimation.css`, same compact pattern as slot/tree follow-up, **plus** `.KDB_loading` so a bare Cognos tab-list container is never restyled:

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

Do **not** move the PDF overlay onto `.pagegenericPage` / canvas if the caption looks small. Capture-quality (spinner in html2canvas / readiness timeout) outranks center-canvas visibility.

z-index stays **1000**. Markup stays Cognos spinner + `.KDB_loadingMessage`.

---

## 7. Out of scope

- JPEG / `scale` / async `toBlob` / other encode quality
- Per-widget progress or per-widget html2canvas
- Second overlay, iframe spinner, or overlay on the capture root
- Changing pdfExportControls button labels
- `updateLoadingMessage` `replacements` / formatter params on the service
- New events / `eventSubscribe.md`
- Play Loading-Image gating PDF
- Watchdog change for non-PDF callers
- Growing `runDashboardPdfExport.js` past 150
- Exclusive army file slices (execution spec, later)

---

## 8. Implementation files (normative homes, not army allowlists)

**loadingService:** `createLoadingService.js` (wire method + disposed guard); extract caption helpers under `effects/`; `applyLoadingOverlay.js` imports those helpers; `config/loadingLabels.js`; `css/loadingAnimation.css`.

**dashboardPdf:** `effects/manageLoadingSession.js` (start `messageKey` + `watchdogMs: 1800000` + update-by-handle); `effects/captureTabPage.js` (prepare/capture captions + double rAF + abort); optional `effects/yieldForPaint.js` and/or `effects/formatPdfLoadingCaption.js`; do not put this logic in `__orchestratorDashboardPdf.js`.

No `_KDB.cognosAPI` / `__getDashboardAPI` in new caption/yield files. Capture-root exception stays the existing `captureTabPage.js` path.

---

## 9. Acceptance

1. PDF overlay still mounts on the tab-list inner container; capture root has no KDB loading overlay; tab-page overlay still skipped for `source === "dashboardPdf"`.
2. From click, caption is `PDF-Export läuft – das kann einige Minuten dauern` **before** vendors resolve (first export).
3. During a multi-tab export the caption advances through title → prepare n/m → capture n/m → Anhang → save. `{n}` / `{m}` match visible-tab count. No widget counter.
4. Capture caption is painted (double rAF) before html2canvas starts. Spinner may still freeze during capture/encode.
5. One `finishLoading` in outer `finally`; no leftover overlay after success/error/abort from `activeCount` (no second `startLoading` for text).
6. `updateLoadingMessage` after `destroy` / after finish / wrong key does not throw and does not retarget boot/SET/GET/vis/tree/slot captions.
7. Slot/tree/boot/SET/GET compact or full spinner rules unchanged. PDF compact rules do not apply outside the tab-list + `.KDB_loading` selector.
8. Non-PDF `watchdogMs` still default 300000. PDF uses 1800000.
9. No DE string literals in `dashboardPdf/**`. No encode-option change. `runDashboardPdfExport.js` stays ≤150.
10. File caps: no new JS file >150; orchestrator ≤120; AMD ≤10 without PO.

---

## 10. Cognos checklist (PO)

1. Click PDF on a dashboard with several tabs: tab-strip shows the start line, then n/m lines; canvas is **not** covered by the overlay.
2. During “wird erfasst” the canvas/spinner may freeze — expected; PDF must not contain the spinner or caption.
3. First export after load still shows the start line while libraries load.
4. After the PDF downloads, the tab-strip overlay is gone.
5. A long export (>5 minutes, if you have one) must **not** lose the overlay at 5 minutes.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-04 | Draft | coordinator | PO locks 1–4 in chat; army technical WD 1800000 / CSS / no-op API stamped; army UX dissent on lock 4 recorded. |
| 2026-09-04 | Draft → Approved | PO vastenburg | Chat Approved; execution spec next; implementation by a fresh captain + grok 4.6 army. |
| 2026-09-04 | Cognos green — WP closed | PO vastenburg | Final Cognos check green (sandwich follow-up is the live overlay). |
