# Contract Delta: loading overlay coverage + German status text

> Mask Cognos-unfriendly waits with `_KDB.services.loading`, plus a German “what is loading” line. Service stays the overlay owner; callers decide **when**. This is not a second loading service and not the KDB2 GET opacity-hack.

---

**Status:** `Approved` — PO vastenburg 2026-09-02 (chat: GET `.dashboardFrame` trial; SET kdbControl under same frame; vis whole widget; copy B; then **go**). GET cover taste-check after Cognos, not a reopen of the mount.
**Type:** `shared service contract delta` + caller wiring
**Authoring AI:** Cursor Grok 4.6 (coordinator), 2026-09-02
**Reviewed by:** PO vastenburg, approved 2026-09-02
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`, `cognos-adapter.mdc`

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/loadingService.md` | Status Draft→Approved for live Qs; `startLoading` message; `KDB_hide` → `KDB_loading`; cover CSS; labels |
| `contracts/writeback.md` | SET overlay mount `.dashboardFrame` + copy |
| `contracts/writeback-urlParameterId-contractdelta.md` | Keep boot/SET coalescing rules; latch start on **handle** |
| `contracts/writeback-get-persist-landing-contractdelta.md` | GET persist overlay on `.dashboardFrame` |
| `contracts/widgetSettings.md` | vis overlay **start** after panel insert |
| `contracts/widgetBindingApply.md` | vis overlay **finish** on `whenRenderComplete` (not in cap file `runApplyBindingRenderSteps.js`) |
| `contracts/leftover-widgets-developer-hide-contractdelta.md` | Overlay remains out of leftover-CSS WP; this WP owns overlay |
| `contracts/kennzahlenTree.md` | Scoped tree overlay (live module `metricsTree`) |
| `contracts/kdbControl.md` | Save-load slot scoped overlay until container has a child |
| `contracts/dashboardPdf.md` | Overlay stays always-on; no new German in this WP |
| `contracts/properties.md` | Play Loading-Image gates **boot only** |
| `contracts/kdb-ready-halt-developer-mode-contractdelta.md` | Boot overlay finish stays modules-mounted (not tree/select) |

---

## 1. Purpose

Show the existing spinner as a **real cover** (not a 110px icon over jumping widgets) and a German status line with **context**, whenever Cognos wait UX is unfriendly:

| Site | Cover mount | `mountKey` | Copy key |
|---|---|---|---|
| Dashboard boot | `.pageViewContent` (unchanged) | `kdb-root-loading-animation-mount` | `dashboard` |
| SET restore | `.dashboardFrame` | `writeback-set-loading` | `dashboardRestore` |
| GET persist-land | `.pane.paneContent.contentViewPane` — lift when first tab arrived (`loadingService-overlay-coverage-cognos-followup-contractdelta.md`) | `writeback-get-persist-loading` | `dashboardSave` |
| Vis after DnD / placeControls | widget shell `#${widgetId}` | `kdb-widget-render-loading-{id}` | `chart` |
| Kennzahlen tree | `#kdb-control-main-blocks` | `kdb-metrics-tree-loading` | `metrics` |
| Parameter save/load slot (empty) | `#kdb-control-save-load-slot` | `kdb-control-save-load-slot-loading` | `parameterSelect` |
| PDF export | existing PDF mount | `dashboard-pdf-export` | superseded: `loadingService-dashboardPdf-progress-caption-contractdelta.md` |

---

## 2. Closed product decisions (2026-09-02)

| # | Decision |
|---|---|
| Boot-done | Modules mounted → `rootLifecycle ready` → `finishLoading`. **Do not** hold boot until tree or `#selectParameterSet` (Approved overlay C). |
| SET mount | `.dashboardFrame`. kdbControl / `#selectParameterSet` **may** sit under that cover. |
| GET mount | **`.pane.paneContent.contentViewPane`**. Lift when land reached first tab. z-index below Cognos parameterset popup. Follow-up 2026-09-03. |
| Vis mount | **Whole** widget shell. Start after settings **panel** insert (leftover-hide just lifted). Finish `whenRenderComplete`. |
| Cover CSS | Opaque inset layer + class `KDB_loading`. **No** generic `.KDB_hide` rule. |
| Play Loading-Image | Gates **boot** only (and boot `transparent`). SET / GET / tree / slot / PDF / vis **always on**. |
| Copy B | GET `Dashboard wird gespeichert`. SET `Dashboard wird wiederhergestellt`. Boot `Dashboard wird geladen`. Vis `Diagramm wird geladen`. Tab catalog `Registerkarte wird geladen`. Tree `Kennzahlen werden geladen`. Never the English word Widget. Never Parametersatz. |
| Scope | One delta; execution spec with exclusive writer slices. |

---

## 3. loadingService API

Surface stays `_KDB.services.loading` (`startLoading`, `finishLoading`, `destroy`). Handle stays `{ mountKey, mountEl }` (live Q12 A). No events.

```js
startLoading({
  mountEl?,          // Element; required for new callers
  mountKey?,         // non-empty string
  transparent?,      // bool; boot only from Play-transparent toggle
  watchdogMs?,
  message?,          // German string already resolved
  messageKey?        // key in _KDB.config.labels.de.loading
})
```

- Resolve text: `message` if non-empty string, else `labels.de.loading[messageKey]`, else no caption. PDF “no caption (PDF)” superseded by `loadingService-dashboardPdf-progress-caption-contractdelta.md`.
- `source` / `runId` / `status` remain ignored (writeback must stop relying on them).
- Missing `mountEl` and missing `_KDB.elements.kdbWidget` → `null` (today). **New callers always pass `mountEl` + `mountKey`.**
- `startLoadingGuarded` latches `loadingStarted` only when the return value is a **truthy handle**, not `true` after a `null` start.

Finish API unchanged except it must remove `KDB_loading` (not `KDB_hide`) and the caption node.

---

## 4. Cover CSS + markup

**Stop** stamping `KDB_hide` on the mount (gear already uses that class). Stamp **`KDB_loading`**. Keep `position: relative` override in runtime as today.

Markup (keep Cognos spinner, add caption):

```html
<div class="loadingIndicatorContainer loadingIndicatorSolid|loadingIndicatorTransparent">
  <div class="loading_indicator">…existing ba-common-progressIndicator…</div>
  <p class="KDB_loadingMessage" hidden-if-empty></p>
</div>
```

Optional session `<p class="KDB_loadingSessionMessage">` **before** the spinner when `startLoading` gets a session caption — `loadingService-dashboardPdf-progress-caption-sandwich-contractdelta.md`. Default callers stay one caption below the spinner.

`loadingAnimation.css` (service-owned):

- `.KDB_loading > .loadingIndicatorContainer`: `position: absolute; inset: 0; z-index: 1000;` opaque background (solid) or alpha when `transparent`. Center spinner **and** caption.
- z-index **1000** (follow-up 2026-09-03): covers in-mount chrome; **below** body-level Cognos `smq-popup` (“Neues Parameterset erstellen”). Not 20000.
- **Do not** `display: none` / sibling-wipe on `.pageViewContent` (Cognos create-gate).
- Save-load **slot** (tiny): extra kdbControl CSS, legacy pattern, **id retargeted**:

```css
#kdb-control-save-load-slot.KDB_loading > :not(.loadingIndicatorContainer) {
  opacity: 0;
  pointer-events: none;
}
```

No generic `.KDB_hide { … }`. PDF capture-root must not gain this overlay (PDF mount stays tab-list inner, as today).

---

## 5. Labels

New `loadingService/config/loadingLabels.js`, merge on orchestrator like writeback (`Object.assign({}, defaults, existing)` onto `_KDB.config.labels.de.loading`).

| Key | DE |
|---|---|
| `dashboard` | Dashboard wird geladen |
| `dashboardSave` | Dashboard wird gespeichert |
| `dashboardRestore` | Dashboard wird wiederhergestellt |
| `chart` | Diagramm wird geladen |
| `tab` | Registerkarte wird geladen |
| `metrics` | Kennzahlen werden geladen |
| `parameterSelect` | Parameterauswahl wird geladen |

Callers pass `messageKey`. Do not hardcode DE in feature files except this catalog.

---

## 6. Selectors (placement)

loadingService does **not** own feature selectors. Callers pass `mountEl`.

| Selector | Home |
|---|---|
| `.pageViewContent`, `.loadingIndicatorContainer` | cognosHost `rootChromeSelectors` (already) |
| `.dashboardFrame` | **Add** `root.dashboardFrame` in `rootChromeSelectors.js` (`u.req(".dashboardFrame")`). Not an inline string in writeback. |
| `#kdb-control-save-load-slot` | kdbControl config (today hardcoded in `buildControlShell.js` — move the id string there) |
| `#kdb-control-main-blocks` (Kennzahlen overlay; tree DOM still `#kdb-control_metrics_container`) | kdbControl `mainBlocksSelector` |
| `#${widgetId}` | `context.widgetEl` from placeControls; do not `querySelector` from widgetBindingApply |

Adapter: none new. PDF keeps `resolveLoadingMountEl`.

---

## 7. Caller rules

### 7.1 Boot (`KDB.js`)

Unchanged sequence. Pass `messageKey: "dashboard"`. Still gated by `KDBPlayLoadingImageToggle`. Finish after `startModules` / `setRootLifecycle("ready")`. **Arm** tree + slot overlays **during** `startModules` so they exist when the boot spinner’s `removeDelayMs: 0` macrotask runs.

### 7.2 SET (`loadingGuards.js`)

- If `urlShareBootOverlayActive === true` → return `false` (unchanged).
- Else `querySelector` catalog `.dashboardFrame`; `startLoading({ mountEl, mountKey: "writeback-set-loading", messageKey: "dashboardRestore" })`.
- Return whether the **handle** is truthy. Store handle on the run for `finishLoading({ handle })`.
- Do **not** use `kdb-root-loading-animation-mount`. Do **not** fall back to `_KDB.elements.kdbWidget`.

### 7.3 GET persist

Owner: `createWritebackGetService.js` (or a **new sibling**). **Do not** edit `applyWritebackGetPersistLanding.js` (150-line cap).

Window: after validate, **before** persist-land click (bridge only). **Finish as soon as land has arrived on the first visible tab** (`applyWritebackGetPersistLanding` returned). Do **not** keep for popup hold or restore-to-user-tab. Skip-land: if started, finish immediately. Copy `dashboardSave`. Mount `.pane.paneContent.contentViewPane`, mountKey `writeback-get-persist-loading`. Always on. No `smq-popup` write. No `#selectParameterSet` scrape.

Ungated / non-`source:"bridge"` `collect()` must **not** start this overlay.

### 7.4 Vis widget

**Start:** `placeWidgetSettingsPanel.js` after the panel is in the DOM, only when:

- `context.widgetEl` is an Element, and
- this is a **visualization** widget (widgetVis content; not text), and
- `payload.isHistoryReplay !== true` and `payload.source !== "historyReplay"`.

**Finish:** `finishRenderWait.js` after `whenRenderComplete` (success, timeout, or error). Also finish if applyBinding never runs (seed fail): settings/vis catch must not leak a spinner (watchdog is backup only).

Do **not** add lines to `runApplyBindingRenderSteps.js` (cap). Restore `waitForComplete === false` still finishes overlay in `finishRenderWait` / apply cleanup — do not hang the widget overlay on a skipped wait.

### 7.5 metricsTree

Start on `metricsTree/loadStarted` (same turn as `waitForRows`, overlay already in DOM). Finish on `rendered` **and** on `loadFailed` / abort. Mount tree root selector. `messageKey: "metrics"`. Always on. Do not block boot.

### 7.6 Save-load slot

Start when the slot element exists (`placeControlShell` / mount). Finish when the slot has **any element child** (foreign injection). `MutationObserver` on the slot (`runtime.kdbControl.observers`), not `waitForParameterSetSelectReady` (not public; do not scrape `#selectParameterSet` from kdbControl). Timeout: lift after 30s even if empty. `messageKey: "parameterSelect"`. Always on.

---

## 8. Events

None new. No `loading:started`. No `eventSubscribe.md` rows.

---

## 9. Out of scope

- Holding boot overlay until `#selectParameterSet` exists.
- Spinner inside `smq-popup` / `#preloader-object` / `#saveParameterSet`.
- Reintroducing KDB2 GET `opacity: 0` + 8500ms.
- Gating SET/GET/tree/slot/PDF/vis on Play Loading-Image.
- PDF German caption — superseded by `loadingService-dashboardPdf-progress-caption-contractdelta.md`.
- Overlay-port SUPER/USER class.
- `helpers` / `common` / `shared` folders; ES modules in `KDB3/js/**`.
- Thickening cap files: `applyWritebackGetPersistLanding.js`, `runApplyBindingRenderSteps.js`.

---

## 10. Implementation files (normative)

**W1 service:** `applyLoadingOverlay.js`, `removeLoadingOverlay.js`, `scheduleOverlayRemoval.js`, `clearLoadingRuntime.js`, `createLoadingService.js` (pass-through), `__orchestratorLoadingService.js` (label merge), new `config/loadingLabels.js`, `css/loadingAnimation.css`, `rootChromeSelectors.js` (`dashboardFrame`).

**W2 vis:** `placeWidgetSettingsPanel.js` (start), `finishRenderWait.js` (finish). Optional tiny helper under `widgetSettings/effects/` or `widgetVis/effects/` if a file would exceed 150 — **not** `helpers/`.

**W3 tree + slot:** `runMetricsTreeMount.js` (split if >150), `placeControlShell.js` / new `effects/applySaveLoadSlotLoading.js`, kdbControl CSS for slot sibling-opacity, kdbControl selector config for the slot id.

**W4 writeback + boot:** `loadingGuards.js`, `createWritebackGetService.js` or new `get/effects/applyWritebackGetPersistLoading.js`, `KDB.js` boot `messageKey` only (no extra boot logic beyond one option field).

---

## 11. Acceptance

1. Boot: Play-on → cover + `Dashboard wird geladen` on `.pageViewContent`; lifts at modules-mounted; `#selectParameterSet` still appears after lift.
2. Empty tree shows cover + `Kennzahlen werden geladen` until jsTree render or fail; boot spinner already gone.
3. Empty save-load slot shows cover + `Parameterauswahl wird geladen` until a child appears (or 30s).
4. Drop vis: after panel insert, whole widget covered + `Diagramm wird geladen`; lifts on render complete; leftover-hide does not hide the spinner (panel exists).
5. User SET: `.dashboardFrame` cover + `Dashboard wird wiederhergestellt`; canvas widgets not half-built; kdbControl may be covered. **Amended 2026-10-13:** a URL-share SET shows that same cover once `#selectParameterSet` exists and `urlShareBootOverlayActive` was cleared before `change` (`writeback-urlParameterId-contractdelta.md` §6.1). The quiet-wait and the select-ready wait stay uncovered. The boot cover stays lifted.
6. GET save from tab 2+: `.pane.paneContent.contentViewPane` cover + `Dashboard wird gespeichert`; lifts when land arrived on first visible tab — not for popup hold / user-tab restore; overlay stays **below** Neues-Parameterset popup.
7. GET never emits `hidSu`; this WP does not touch persist keys. No overlay on non-bridge `collect()`.
8. No `.KDB_hide` added by loadingService. Gear hide still works. PDF export overlay still starts.
9. File caps: no new file >150 JS; orchestrator ≤120; AMD ≤10 without PO.

---

## 12. Cognos checklist (PO)

1. Boot splash (Play on/off).
2. Kennzahlen empty → filled.
3. Parameter dropdown appears; slot spinner lifts.
4. Drag Kennzahl onto canvas: whole widget cover, then chart.
5. Load a Parameterset (user SET): frame cover; after lift, widgets complete.
6. Save from tab 3: frame cover; name appears in the list; **say whether the cover is OK**.
7. URL-share inbound: no second SET spinner while boot latch is true.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | Draft → Approved | PO vastenburg | Product Qs closed in chat; go. GET frame cover = trial until Cognos taste-check. |
