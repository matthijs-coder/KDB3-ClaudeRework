# Execution Spec: share D4 slice part 2 — `shareControls` chrome

> Same slice as `share-d4-cognos-writeback-execution-spec.md`. Implement **after** ring-1 wrappers, facet binds, and `writebackBridge.readSelectedParameterSet` exist (or in parallel only if those files are already written). **One writer owns `KDB.js`** — apply this spec’s chrome bullets together with the overlay bullets from part 1 in **one** edit, last.
> Contract: `shareControls.md` **Approved** 2026-08-29.
> Clone live `pdfExportControls/` then apply the deltas below. Do not copy PDF remount early-return.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/shareControls.md`
**Phase:** `full port`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-08-29
**Executing AI:** `<grok 4.6 implementer>`
**Reviewer:** supervising captain + dual review army

**Companion:** `_____________KDB3API/contracts/share-d4-cognos-writeback-execution-spec.md`

---

## Section A. Pre-flight read list

Echo one sentence each, then stop for captain accept:

1–12. Same ten `.mdc` + lifecycle + `_template.md` as part 1 spec §A (read them; do not skip because part 1 already did if you are a **fresh** implementer).
13. `_____________KDB3API/contracts/shareControls.md` (Approved — source of truth)
14. `_____________KDB3API/contracts/pdfExportControls.md` (chrome sibling)
15. `_____________KDB3API/contracts/messageService.md` (`showCopyable` / `showAlert` shapes)
16. This spec
17. Live clone sources (read, do not edit except `KDB.js` / `cssHrefList.js`):
    - `KDB3/js/dashboard/controls/pdfExportControls/**` (all 13 files)
    - `KDB3/css/pdfExportControls.css`
    - `KDB3/js/core/css/config/cssHrefList.js`
    - `KDB3/js/KDB.js` register/mount/destroy + AMD factory line 1
    - `KDB3/images/share.png` (canonical). Do **not** reference `share-black.png` / `share-white.png`.

---

## Exclusive allowlist (this spec)

**May create/edit:**

- `KDB3/js/dashboard/controls/shareControls/**` (tree below)
- `KDB3/css/shareControls.css`
- `KDB3/js/core/css/config/cssHrefList.js` (one href insert)
- `KDB3/js/KDB.js` (chrome wiring **and** part-1 overlay if you are the KDB.js writer)

**Must not:** writeback `bridge/` / `set/` internals, `cognosAPI/dashboard.js`, `createDashboardAdapter.js`, `helpers/`, AI share PNGs, `.mdc`, git commit/push, scrape `#selectParameterSet`, call `__getDashboardAPI` or `_KDB.cognosAPI`.

---

## Section B. Folder tree (create order)

```
KDB3/js/dashboard/controls/shareControls/config/domSelectors.js
KDB3/js/dashboard/controls/shareControls/config/iconAssets.js
KDB3/js/dashboard/controls/shareControls/config/shareLabels.js
KDB3/js/dashboard/controls/shareControls/config/shareLinkHashKeys.js
KDB3/js/dashboard/controls/shareControls/adapters/resolveShareIconHref.js
KDB3/js/dashboard/controls/shareControls/view/buildShareControls.js
KDB3/js/dashboard/controls/shareControls/view/placeShareControls.js
KDB3/js/dashboard/controls/shareControls/view/syncShareControlsView.js
KDB3/js/dashboard/controls/shareControls/runtime/cleanupShareControlsRuntime.js
KDB3/js/dashboard/controls/shareControls/observation/bindToolbarObserver.js
KDB3/js/dashboard/controls/shareControls/effects/waitForShareToolbar.js
KDB3/js/dashboard/controls/shareControls/effects/readDashboardFacet.js
KDB3/js/dashboard/controls/shareControls/effects/buildShareDashboardLink.js
KDB3/js/dashboard/controls/shareControls/effects/bindShareClick.js
KDB3/js/dashboard/controls/shareControls/createShareControlsController.js
KDB3/js/dashboard/controls/shareControls/__orchestratorShareControls.js
KDB3/css/shareControls.css
KDB3/js/core/css/config/cssHrefList.js
KDB3/js/KDB.js
```

No `helpers/`. Controller AMD **≤6**.

---

## MUST echo before files

- Public API `{ mount, destroy }` only. No `dispatch`. No `_KDB.state.shareControls`.
- Stamp `dashboardFacet` from `_KDB.services.cognosHost.dashboard`; preserve on normalize; effects read the stamp only.
- Wait key **`"toolbar.actionBarLeadingSelector"`**. Host = action bar `.leading` only. Do not insert into `#com.ibm.ca.collaboration.sharePluginContainer`.
- Duplicate-guard = do not **build** a second root. If present, **move** it before leftmost-in-document-order of `[data-kdb-pdf-export-controls]` / `[data-kdb-history-controls]` (else `firstChild`). Do **not** copy PDF remount skip (`same host && root still in host → return`).
- Hash: `biBase + "#" + URLSearchParams.toString()`. **No** `{` `}` around the hash.
- Facet predicate: `ok === true` && non-empty string `data` for **both** boardId and bi-base.
- `showCopyable({ title, copyText: url, message: "" })`. `showAlert` options object, `severity: "error"`.
- Icon: `./v1/ext/KDB3/images/share.png` + CSS invert when luminance ≥128. Do not ship/href `share-black.png` / `share-white.png`.
- German strings from contract §10.3 only. No Dutch.
- `data-kdb-share-controls="true"` / `data-kdb-share-button="true"`. `is-unavailable` on **root**. `__label` visually hidden.

---

## Section C. Per-file specifications

Clone PDF file named in **Clone** line, then apply **Delta**. Rules on every file: `amd.mdc`, `naming.mdc`, `feature-structure.mdc` (80–120 target, hard 150), `error-handling.mdc` where noted.

#### `config/domSelectors.js`

- **Clone:** `pdfExportControls/config/domSelectors.js`
- **Delta:** selectors `data-kdb-share-controls="true"`, `data-kdb-share-button="true"`, icon/label data attrs analogously; `unavailableClassName: "is-unavailable"`.
- **Lines:** ~15
- **Rules:** `dom.mdc` — selectors live here then merge onto `_KDB.elements.selectors.shareControls`.

#### `config/iconAssets.js`

```js
{ iconHref: "./v1/ext/KDB3/images/share.png" }
```

No black/white pair. **Lines:** ~10.

#### `config/shareLabels.js`

German keys **exactly** `shareControls.md` §10.3. **Lines:** ~25. Orchestrator merges `Object.assign({}, shareLabels, existing)` onto `_KDB.config.labels.de.shareControls`.

#### `config/shareLinkHashKeys.js`

```js
{ perspective: "dashboard", action: "view", mode: "dashboard" }
```

No `parameterId` here. **Lines:** ~12.

#### `adapters/resolveShareIconHref.js`

- **Clone:** `resolvePdfIconHref.js` (same parseRgb / luminance 0.2126/0.7152/0.0722).
- **Delta:** return `{ href: iconHref, invert: luminance >= 128 }`. Missing rgb → `{ href, invert: false }`. Not an SDK adapter.
- **Lines:** target 55 (hard 80)
- **Rules:** `error-handling.mdc` defensive parse; no throw.

#### `view/buildShareControls.js`

- **Clone:** `buildPdfExportControls.js`
- **Delta:** classes `kdb-share-controls` / `__item` / `__button` / `__icon` / `__label`; `data-kdb-share-controls="true"` etc. `aria-label` / `title` from labels (`buttonAccessibleName` / `buttonTitle`), not hardcoded German in a second place if labels already merged — builder may read options `{ iconSrc, invert, accessibleName, title, labelText }` passed from placer. Label text = `buttonTitle` (`Teilen`). If `invert`, add class `kdb-share-controls__icon--invert` on the img.
- **Rules:** `dom.mdc` Builder.

#### `view/placeShareControls.js`

- **Clone:** `placePdfExportControls.js` **but replace insert policy**
- **Delta:**
  1. `rootEl = host.querySelector(rootSelector)`.
  2. If **no** root: `build` then insert.
  3. If root exists: **do not build**; use existing node.
  4. Insert/move: find `[data-kdb-pdf-export-controls]` and `[data-kdb-history-controls]` **in this host**; pick the **leftmost in document order** (`compareDocumentPosition` / `sourceIndex`); `host.insertBefore(rootEl, thatNode || host.firstChild || null)`.
  5. Update `domRefs`; refresh icon `src` + invert class from `resolveShareIconHref`.
- **Lines:** target 50 (hard 80)
- **Rules:** `dom.mdc` Placer.

#### `view/syncShareControlsView.js`

- **Clone:** `syncPdfExportControlsView.js`
- **Delta:** `is-unavailable` on **root** when `serviceAvailable !== true`. `button.disabled` when disabled. Label text from viewModel (visually hidden). No `busy` unless you keep the field unused (`false`).
- **Rules:** `dom.mdc` Mutator.

#### `runtime/cleanupShareControlsRuntime.js`

- **Clone:** PDF cleanup
- **Delta:** reset runtime buckets; **preserve `dashboardFacet`** on the object you assign back (`facet = runtime.dashboardFacet` then restore after wipe). Abort mount controller; disconnect observer; clear `remountTimer`; remove `rootEl` from DOM; listeners clickCleanup.
- **Rules:** `runtime.mdc`.

#### `observation/bindToolbarObserver.js`

- **Clone:** PDF observer (`document.body`, childList+subtree, debounce 0 via `runtime.timers.remountTimer`)
- **Delta:** log tag `[shareControls.bindToolbarObserver]`. Remount callback comes from controller.
- **Rules:** `error-handling.mdc` try/catch in timer callback; `runtime.mdc`.

#### `effects/waitForShareToolbar.js`

- **Clone:** `waitForPdfToolbar.js`
- **Delta:** runtime `shareControls`; trackWait key **`"toolbar.actionBarLeadingSelector"`**; `true` when wait armed or `pendingPromises.mount` set; `false` when missing `waitForElObserver` / selector. Abort is not sync `false`.
- **Rules:** `dom.mdc` (approved document-root wait, recorded in contract §8); `error-handling.mdc`.

#### `effects/readDashboardFacet.js`

```js
function readDashboardFacet(_KDB) {
  var rt = _KDB.runtime && _KDB.runtime.shareControls;
  return rt && rt.dashboardFacet ? rt.dashboardFacet : null;
}
```

No `_KDB.services.cognosHost` lookup in deep files. **Lines:** ~15.

#### `effects/buildShareDashboardLink.js`

- **AMD:** `../config/shareLinkHashKeys.js`
- **Input:** `{ biBase, boardId, id, label, emptyParameterLabel }`
- **Body:** `URLSearchParams`; set perspective/action/mode from config; `id` and `objRef` = boardId; `parameterId` **only** if `id != null`; `parameterLabel` always = non-empty `label` else `emptyParameterLabel`. Return `biBase + "#" + params.toString()`. **No braces.**
- **Lines:** target 40
- **Rules:** `amd.mdc`; no `location` / `history` mutation.

#### `effects/bindShareClick.js`

- **AMD (3):** `./readDashboardFacet.js`, `./buildShareDashboardLink.js`, and none else if click handler stays in this file.
- **Body:** like PDF click bind. On click (try/catch):
  1. If viewModel `serviceAvailable === false` or button disabled: return.
  2. `readSelectedParameterSet()` as-is (`id == null` is valid).
  3. Facet `getBoardId()` / `getDashboardBiBaseUrl()`. Missing facet methods: warn once, no dialog.
  4. Predicate both: `ok === true` && `typeof data === "string"` && `data.length > 0`.
  5. Fail boardId → `showAlert({ title: boardIdMissingTitle, message: boardIdMissingMessage, severity: "error" })`.
  6. Fail bi-base → `biBaseMissing*` same shape.
  7. Build URL; title: `id != null` → `dialogTitleWithSet` replace `{label}` with label or `emptyParameterLabel`; else `dialogTitleWithoutSet`.
  8. `showCopyable({ title, copyText: url, message: "" })`.
- Labels from `_KDB.config.labels.de.shareControls`.
- **Rules:** `error-handling.mdc` try/catch; `events.mdc` no new events; never `__getDashboardAPI`.

#### `createShareControlsController.js`

- **AMD (6):** `placeShareControls`, `syncShareControlsView`, `bindShareClick`, `bindToolbarObserver`, `waitForShareToolbar`, `cleanupShareControlsRuntime`.
- **Clone structure:** PDF controller — `mount` / `destroy` / `isDisposed` / `didWarnMissingService`.
- **Delta `finishMount`:** before place/sync, if missing `writebackBridge.readSelectedParameterSet` **or** `message.showCopyable`/`showAlert` **or** stamped facet `getBoardId`/`getDashboardBiBaseUrl`: warn once, `viewModel.serviceAvailable = false`, `disabled: true`. Then placeBindAndSync (place + bindShareClick + sync). Then bind observer.
- **Delta `remountAndSync`:** always `document.querySelector(toolbarHostSelector)` (not stored host). If no host, return. **Always** call place (move) — **do not** PDF-skip when root already in host.
- **`mount`:** disposed → warn + `false`. Else `waitForShareToolbar` return value (`true` = armed).
- **`destroy`:** `_isDisposed = true` then cleanup. Idempotent.
- **Lines:** target 80 (hard 150); controller function bodies stay small via helpers at factory scope.
- **Rules:** `module-public-api.mdc` named lifecycle; `runtime.mdc`; `error-handling.mdc` try/catch mount/destroy — on catch `console.error("[shareControls.mount|destroy]", err)` (no `<module>/error` dispatch; no state subtree).

#### `__orchestratorShareControls.js`

- **AMD:** `domSelectors`, `iconAssets`, `shareLabels`, `createShareControlsController` (4).
- **Body try/catch:**
  - merge selectors onto `_KDB.elements.selectors.shareControls`; set `toolbarHostSelector` from `toolbar.actionBarLeadingSelector`.
  - `Object.assign({}, shareLabels, existing)` → `_KDB.config.labels.de.shareControls`.
  - `_KDB.config.shareControls` = Object.assign({}, iconAssets, existing config).
  - `normalizeRuntime`: fill buckets; **must preserve `dashboardFacet`**.
  - Stamp `runtime.dashboardFacet` from `_KDB.services.cognosHost && cognosHost.dashboard` (boot after services; no pending stamp).
  - `_KDB.api.shareControls = createController(_KDB)`.
- **Lines:** target 70 (orchestrator hard 120)
- **Rules:** `kdb-object.mdc` registers `_KDB.api.shareControls`; thin; no business logic.

#### `KDB3/css/shareControls.css`

Clone `pdfExportControls.css`; replace class prefix `kdb-pdf-export-controls` → `kdb-share-controls`. Add:

```css
.kdb-share-controls__icon--invert {
  filter: invert(1);
}
```

Keep `__label` clip/visually hidden; `is-unavailable` on root dims icon.

#### `KDB3/js/core/css/config/cssHrefList.js`

Insert `"./v1/ext/KDB3/css/shareControls.css"` **immediately after** `pdfExportControls.css` (do not use the disk path).

#### `KDB3/js/KDB.js`

See part 1 spec — same edit. Chrome: AMD import after pdf; register after pdf; mount after pdf; destroy after pdf.

---

## Section D–E

No reducer. No selector registry.

## Section F

- Surface: `_KDB.api.shareControls = { mount, destroy }`
- Runtime: `domRefs`, `listeners`, `observers`, `abortControllers`, `timers`, `pendingPromises.mount`, `dashboardFacet`, `viewModel`
- State: none

## Section G–I

Omitted (Cognos-hosted). Browser-verify Teilen + copy dialog. Inbound restore needs Cognos host — report if you cannot.

## Section J. Acceptance

1. All 16 JS files + CSS + cssHref + KDB.js wiring exist.
2. Controller AMD ≤6.
3. No `share-black.png` / `share-white.png` hrefs.
4. Place **moves** existing root; remount does not PDF-skip.
5. URL has no `{perspective=` wrapper.
6. No `__getDashboardAPI` / `_KDB.cognosAPI` under `shareControls/`.
7. Dual review then browser: button order Share | PDF | History; click opens `showCopyable`; with/without set titles.

## Section K–M

Template forbidden + no shareService + no `#selectParameterSet` scrape. Dual mechanical + semantic review. Captain does not write production JS except a one-line wiring fix if blocked.
