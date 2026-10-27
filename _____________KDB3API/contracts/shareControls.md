# Module Contract: `shareControls`

> Compact chrome module for dashboard sharing (legacy `exportShareFunctions`).
> No production code until this contract is **Approved**.
> Incoming URL restore is **not** this module — see `writeback-urlParameterId-contractdelta.md`.
> Outbound link (live law since 2026-10-27): native query with the live `pathRef` — see [`shareControls-pathRef-link-contractdelta.md`](shareControls-pathRef-link-contractdelta.md), [`cognosAPI-dashboardPathRef-contractdelta.md`](cognosAPI-dashboardPathRef-contractdelta.md), [`cognosHost-dashboardPathRef-contractdelta.md`](cognosHost-dashboardPathRef-contractdelta.md). The `/cognos/bi/` base is still `getDashboardBiBaseUrl` (`_archive/cognosAPI-dashboardShare-contractdelta.md`); the hash link with `id`/`objRef` in the archived share deltas is history.

---

**Status:** `Approved`
**Owner module / service:** `shareControls`
**Type:** `feature module` (toolbar chrome; sibling of `pdfExportControls`)
**Authoring AI:** Cursor Grok 4.6, 2026-08-28
**Reviewed by:** PO-by-proxy 2026-08-29 (fresh army green = PO ok)
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.
**Related contracts:** `pdfExportControls.md`, `wienKiControls.md`, `messageService.md`, `writeback.md`, `writeback-urlParameterId-contractdelta.md`, `cognosHostService.md`, `shareControls-pathRef-link-contractdelta.md`, `cognosHost-dashboardPathRef-contractdelta.md`, `cognosAPI-dashboardPathRef-contractdelta.md` (history: `cognosHost-dashboardShare-contractdelta.md`, `cognosAPI-dashboardShare-contractdelta.md`).

---

## 0. Decision summary

| Topic | Decision |
|---|---|
| Placement | `KDB3/js/dashboard/controls/toolbarControls/` (as built: `shareButton.js`, `shareLink.js`) |
| Public surface | `{ mount, destroy }` — named lifecycle, no `dispatch` / `getState` |
| State | No `_KDB.state.shareControls` |
| With / without parameter set | Legacy parity: follow host `#selectParameterSet` via **writebackBridge** read. No extra choose/confirm. Dialog **title** tells the user what the link contains. |
| Share without a set | Legitimate. URL omits `parameterId`. Not an error. |
| Incoming URL | writeback SET + `KDB.js` overlay restore `parameterId`. **Exception:** shareControls stamps/removes `kdb-share-read-only` on `#main` from exact `readOnly=1` (A/B query-then-hash; not SET restore). |
| Cognos SDK | Injected `_KDB.services.cognosHost.dashboard` only. No `__getDashboardAPI`, no `_KDB.cognosAPI` in this module. |
| Dialog | `_KDB.services.message.showCopyable` **plus optional declarative `toggle`** (messageService). No Glass, no custom share portal, no clipboard reimplementation. |
| Toolbar host | Cognos action bar `.leading` (same as PDF/history). Not `sharePluginContainer`. |
| User-facing copy | German only, under `_KDB.config.labels.de.shareControls`. |
| Open family | Native Cognos query (`biBase?perspective=dashboard&pathRef=…`) with the live content path; never `id`/`objRef`, never `#` (`shareControls-pathRef-link-contractdelta.md` §2) |

History: the module was built in 2026-08 with `readSelectedParameterSet`, `getBoardId` and `getDashboardBiBaseUrl` in one slice (`writeback-urlParameterId-contractdelta.md`, archived `cognosHost-dashboardShare-contractdelta.md` / `cognosAPI-dashboardShare-contractdelta.md`). Since 2026-10-27 the click reads `getPathRef` instead of `getBoardId`; the `getBoardId` facet getter stays published but has no share caller.

---

## 1. Purpose

`shareControls` owns the KDB **Teilen** toolbar button and the outbound share-link dialog. A click builds a viewer URL for the current dashboard, with or without the currently selected host parameter-set id, and shows that URL for copy. It does not own parameter-set restore, DWH CRUD, or the host dropdown.

---

## 2. Ownership

- Canonical state subtree: **none**. This module does not write `_KDB.state.*`.
- Foreign-write paths: none. Host dropdown selection is read through `_KDB.services.writebackBridge.readSelectedParameterSet()`. Restore of a shared URL is writeback SET.

---

## 3. Runtime

- Owner namespace: `_KDB.runtime.shareControls`
- Buckets: `domRefs`, `listeners`, `observers`, `abortControllers`, `timers` (remount debounce, same job as PDF `remountTimer`), `pendingPromises.mount`
- Runtime `adapters` unused; luminance lives in `toolbarControls/iconHref.js` (`readToolbarIconTone`, `pickToneIconHref`)
- Stamp: `dashboardFacet` — set once by the orchestrator from `_KDB.services.cognosHost.dashboard`. `mount` / runtime normalize **must preserve** this stamp.

**As built (Phase 1):** all four toolbar buttons (share, wienKi, pdf, history) share one controller and one toolbar host in `KDB3/js/dashboard/controls/toolbarControls/`. Runtime is the shared `_KDB.runtime.toolbarControls` (kit buckets: `abortControllers.hostWait` plus one `<id>Bind` abort controller per button, `pendingPromises.hostWait`, `observers.toolbar`, `timers.toolbarSync`, `domRefs.toolbarHostEl`; fields `buttons`, `isHostReady`, `dashboardFacet`), not a per-button namespace. One toolbar wait (30 s) and one `MutationObserver` serve all buttons, reference counted by mount/destroy; button order is `BUTTON_ORDER` in `config.js`. `_KDB.api.<apiName>` exposes `{ mount, destroy }` (share also `applyReadOnlyChrome`). `toolbarControls/index.js` registers all four buttons in one call (history, pdf, wienKi, share); the bootstrap manifest still mounts and destroys each button on its own.

- Cleanup: `destroy()` — abort mount wait, disconnect observer, clear timers, remove listeners, detach placed DOM, reset the runtime bucket (keep stamp-preservation rules on normalize, not on destroy)
- Overlay / URL restore runtime lives on writeback, not here

---

## 4. Public API

### 4a. Feature module

- Surface: `_KDB.api.shareControls`
- Style: **named lifecycle** (deviation from feature/UI dispatch default)
- Methods: `mount`, `destroy`, `applyReadOnlyChrome` (`applyReadOnlyChrome` is idempotent class reconcile; `KDB.js` calls it in `finishDashboardInitialization` immediately before `whenUrlShareRestoreSettled`)
- Orchestrator AMD id: `./dashboard/controls/toolbarControls/index.js` (registers all four toolbar buttons)
- `mount` returns `true` / `false` like live `pdfExportControls` (shared toolbar wait in `toolbarControls/toolbarHost.js`): `true` when the 30s wait is **armed** or already pending; `false` when disposed / missing `waitForElObserver` / missing selector. `true` is not “placed”. Abort is not a synchronous `false`. `KDB.js` ignores the return.

```js
_KDB.api.shareControls = {
  mount: mount,
  destroy: destroy,
  applyReadOnlyChrome: applyReadOnlyChrome
};
```

- Deviation motivation: no `_KDB.state` subtree, no undo/redo, one external caller (`KDB.js`), one user command (button click). Same shape as `pdfExportControls` / `historyControls`.
- Disposed-state: `_isDisposed` set `true` before runtime clear. `mount` after destroy is a no-op + `console.warn`. `destroy` is idempotent. Sync reads are not published.

---

## 5. Readers / Writers

- No selector registry.
- No internal `_KDB.state` writers.
- Cross-module reads this module **consumes** (after the implementation gate):
  - `_KDB.services.writebackBridge.readSelectedParameterSet()` → `{ id: string|null, label: string|null }` **as-is**. Sentinels, missing `#selectParameterSet`, and `::`-sanitize are **bridge-owned** (`writeback-urlParameterId-contractdelta.md` §5.2). This module does not reimplement them.
  - stamped `dashboardFacet.getPathRef()` / `getDashboardBiBaseUrl()` → `Outcome<string|null>`
  - URL fallback `toolbarControls/readUrlPathRef.js` (`readUrlPathRef`, `readUrlSubView`; navigation name then `location.href`, query then hash)

---

## 6. Events

- Emitted: none
- Subscribed: none
- Request-events: none

Direct calls to known owners (`message`, `writebackBridge`, dashboard facet). No catalog row.

---

## 7. Dependencies

- `_KDB`
- `_KDB.utils.waitForElObserver`
- `_KDB.services.message` (`showCopyable`, `showAlert` on share failure)
- `_KDB.services.writebackBridge` (`readSelectedParameterSet` only)
- `_KDB.services.cognosHost.dashboard` — orchestrator stamp only; effects read `_KDB.runtime.shareControls.dashboardFacet`

Do not inject `_KDB.cognosAPI`. Do not inject `writebackSet.restore`.

If `writebackBridge.readSelectedParameterSet`, `message.showCopyable` / `showAlert`, or the stamped facet methods are missing: one tagged `console.warn`, no throw, no dialog (same missing-service tone as PDF). **Must** set `is-unavailable` on the **root** and `disabled` on the button in `finishMount` **before** place/sync (live PDF), not only on first click; click is a no-op.

---

## 8. Cognos touchpoints

- Toolbar host query: `_KDB.elements.selectors.toolbar.actionBarLeadingSelector` (document-root wait is an approved `dom.mdc` exception, same as PDF; record it here).
- Second document-root exception: inbound chrome uses `document.querySelector(_KDB.elements.selectors.root.dashboardClassHost)` (`#main`). Not `getElementById("main")`. `document.location.href` parse is URL, not a DOM exception.
- `_KDB.runtime.toolbarControls.dashboardFacet.getPathRef()` (live content path; `getDashboardInfo().searchPath` stays in the inner ring)
- `_KDB.runtime.toolbarControls.dashboardFacet.getDashboardBiBaseUrl()`
- No mirror writes. No `__getDashboardAPI`. No `_KDB.cognosAPI.*`.
- Native Cognos `#com.ibm.ca.collaboration.sharePluginContainer` stays hidden by `cognosButtons.css` when it is an action-bar `.pluginContainer` (2026-09-03: `[id="com.ibm.bi.dashboard.toolbars.actionBar"] .pluginContainer`, not `[id$="PluginContainer"]` — [cognosButtons-allowlist-invert-contractdelta.md](./_archive/cognosButtons-allowlist-invert-contractdelta.md) §3.2). This button must **not** reuse that id or the `com.ibm.kdb.share*` legacy ids. **Do not wait for or insert into** that container. Host is **only** `toolbar.actionBarLeadingSelector`.
- Use `data-kdb-share-controls="true"` / `data-kdb-share-button="true"` and class `.kdb-share-controls` (PDF/history `="true"` pattern; presence selectors still match, but do not invent a second attribute style).
- CSS BEM (same jobs as PDF): `.kdb-share-controls__item`, `__button`, `__icon`, `__label`. `is-unavailable` is on the **root** (`.kdb-share-controls`), not the button. `__label` is visually hidden (icon-only 16×16 like PDF); accessible name is `buttonAccessibleName`, tooltip is `buttonTitle`.

---

## 9. Folder layout

```txt
KDB3/js/dashboard/controls/
  toolbarControls/
    index.js          # createToolbarController / registerToolbarButton: { mount, destroy } per button, onRegister/extendApi hooks
    config.js         # BUTTON_ORDER, BUTTONS (apiName, class/data prefixes), ICON_ASSETS, LABELS (share, ...), selectors, readOnlyClass kdb-share-read-only
    toolbarHost.js    # shared toolbar wait, MutationObserver, placement in declared order, tone reader
    toolbarButton.js  # button instance, view model sync, label/icon reads, click wrapper, single-button DOM build
    iconHref.js       # toolbar luminance -> icon href (same formula as pdf)
    shareButton.js    # share definition: dashboardFacet stamp (onRegister), click handler, applyReadOnlyChrome API
    shareLink.js      # buildShareDashboardLink, openShareCopyDialog, read-only token read, applyShareReadOnlyChrome
    readUrlPathRef.js # readUrlPathRef, readUrlSubView: outbound fallback from the current URL (own A/B ladder)
```

CSS: disk file `KDB3/css/customButtons/toolbarControls.css` (button chrome plus the `#main.kdb-share-read-only` hide-set); `cssHrefList.js` entry **`./v1/ext/KDB3/css/customButtons/toolbarControls.css`** (do not copy the repo-relative disk path into the href list).

Icons: canonical asset is `KDB3/images/share.png` (512×512 ARGB, ~3KB). Runtime href: `./v1/ext/KDB3/images/share.png` (same `./v1/ext/` prefix as PDF). `iconHref.js` uses the same toolbar-host luminance formula as `pdfExportControls`. Do **not** ship the bulky AI `share-black.png` / `share-white.png` (1024×1024, 24bpp opaque, baked light background, ~700–800KB). Implementation may either (a) luminance-select between two **tiny ARGB** copies derived from `share.png` whose filenames are **not** `share-black.png` / `share-white.png`, or (b) one `share.png` href plus CSS luminance invert when the host foreground is light (legacy). Missing `share.png` is the asset blocker, not the generated pair.

Labels: defaults live in `toolbarControls/config.js` (`LABELS.share`); `readButtonLabels` merges `Object.assign({}, LABELS.share, _KDB.config.labels.de.shareControls)`, so configured labels win (same as messageService).

Bootstrap (`KDB.js`, allowed 500-line wiring exception):

- Registration: `toolbarControls/index.js` registers history, pdf, wienKi and share in this order (WienKI after PDF, share last).
- `mountFeatureModules`: `_KDB.api.shareControls.mount({})` immediately after `_KDB.api.wienKiControls.mount({})` (WienKI after PDF). Share last re-asserts leftmost.
- `destroyRegisteredFeatures`: `api.shareControls` next to `api.pdfExportControls` / `api.wienKiControls`, **not** in `destroyCoreServices`. Must run before `writebackBridge` / `message` / `cognosHost` teardown.

---

## 10. Behaviour

### 10.1 Mount

1. Stamp `dashboardFacet` in the orchestrator.
2. Merge selectors; toolbar host = action bar `.leading`.
3. `waitForElObserver` 30s + owner `AbortController`; `chromeChecks.trackWait` key **`"toolbar.actionBarLeadingSelector"`** (same catalog key as PDF/history — not a new share-only key).
4. Builder → placer. Duplicate-guard = do not **build** a second root. If a share root is already in this host, **move** it: `insertBefore` **that existing node** before the **leftmost-in-document-order** of `[data-kdb-wien-ki-controls="true"]` / `[data-kdb-pdf-export-controls="true"]` / `[data-kdb-history-controls="true"]` already in the host (else `firstChild`). That is **not** `wienKiEl || pdfEl || historyEl` (history’s stored-host remount can sit left of PDF). Same rule on first place and remount. “Already present” is not “leave it where Cognos/PDF left it.” Live PDF/history still `insertBefore(firstChild)` when their root is missing; after a partial rebuild Share would sit to the right unless remount **re-asserts** leftmost. Visual order must be Share | WienKI | PDF | History. Mount-after-WienKI in `KDB.js` is load-bearing (observers fire in registration order).
5. Bind click; observe `document.body` for toolbar rebuild. Remount **re-queries** the host via `document.querySelector` like PDF, not the stored host node (history's weaker path). That query is the **same** approved document-root exception as the 30s wait (§8), not a second undeclared exception. Debounce with `runtime.timers.remountTimer`.
6. Icon luminance from toolbar host computed `color` (same formula as `pdfExportControls`).

### 10.2 Click (outbound share)

1. Call `_KDB.services.writebackBridge.readSelectedParameterSet()` and use `{ id, label }` as-is. `id == null` → URL without `parameterId` (not an error). Do not re-apply sentinels or `::` sanitize here.
2. Resolve the live path, then the base (`shareControls-pathRef-link-contractdelta.md` §4). Present = `ok === true` and non-empty string `data` for every facet primitive; facet `ok` + `data: null` is **missing**, not success. Path: `getPathRef()`; if not present, `readUrlPathRef()` (non-empty string wins); still empty → `showAlert({ title: pathRefMissingTitle, message: pathRefMissingMessage, severity: "error" })`, no dialog, no `getBoardId`, no ID link. Then `getDashboardBiBaseUrl()`; not present → `showAlert({ title: biBaseMissingTitle, message: biBaseMissingMessage, severity: "error" })`, no dialog. `subView` = `readUrlSubView()` only when a non-empty string. Pass an options object to `showAlert`, not a string (live PDF/tabs).
3. Build **two** URLs: **`biBase + "?" + params.toString()`** (one `URLSearchParams` encode; no `#`). Set order: `perspective=dashboard`, `pathRef=<live path>`, `action=view`, `mode=dashboard`, `subView` only when non-empty, `nav_filter=true`, `parameterId` **only** when `id != null`, `parameterLabel` **always** (spaces as `+`), and when `isKdbReadOnly === true`, **after** `parameterLabel`, `readOnly=1`. `parameterLabel` value is bridge `label` when non-empty, else `emptyParameterLabel`. **Never** `id` or `objRef`.
4. Dialog title from §10.3 keys (do not hardcode German here): with id → `dialogTitleWithSet` replacing `{label}` (if `id != null` and `label` is empty, still `dialogTitleWithSet` and substitute `emptyParameterLabel`; do not print `"undefined"`); without id → `dialogTitleWithoutSet`.
5. `_KDB.services.message.showCopyable({ title, message: "", copyText: readOnlyUrl, toggle: { label: readOnlyToggleLabel, title: readOnlyToggleTitle, isChecked: true, copyTextChecked: readOnlyUrl, copyTextUnchecked: editUrl } })` via `openShareCopyDialog` (not the controller). Copy/close labels use messageService German defaults.

No mutation of `location` / `history`. The URL is a string for the dialog only.

### 10.3 Labels (German; source of truth)

`_KDB.config.labels.de.shareControls`:

| Key | German |
|---|---|
| `buttonTitle` | `Teilen` |
| `buttonAccessibleName` | `Dashboard teilen` |
| `dialogTitleWithSet` | `Link zum Dashboard (Parameterset: "{label}")` |
| `dialogTitleWithoutSet` | `Link zum Dashboard (kein Parameterset: leeres Dashboard)` |

`dialogTitleWithoutSet` embeds the same German as `emptyParameterLabel`. Changing only one of those two keys would desync the without-set title; keep them in lockstep (or later compose the title from `emptyParameterLabel` — not required this slice).
| `emptyParameterLabel` | `leeres Dashboard` |
| `boardIdMissingTitle` | `Teilen nicht möglich` |
| `boardIdMissingMessage` | `Die Dashboard-Kennung konnte nicht ermittelt werden. Bitte das Dashboard schließen und erneut öffnen.` (kept; unused by the click since 2026-10-27) |
| `pathRefMissingTitle` | `Teilen nicht möglich` |
| `pathRefMissingMessage` | `Der Dashboard-Pfad konnte nicht ermittelt werden. Bitte das Dashboard über das Cognos-Menü öffnen und erneut teilen.` |
| `biBaseMissingTitle` | `Teilen nicht möglich` |
| `biBaseMissingMessage` | `Die Dashboard-Adresse konnte nicht ermittelt werden. Bitte das Dashboard schließen und erneut öffnen.` |
| `readOnlyToggleLabel` | `Nur Lesen` |
| `readOnlyToggleTitle` | `Ohne KDB-Steuerung und Widget-Einstellungen` |

Do not invent Dutch or English UI strings. `{label}` in `dialogTitleWithSet` is the bridge label when non-empty, else `emptyParameterLabel`.

### 10.4 Inbound chrome (not restore)

`applyShareReadOnlyChrome` (`toolbarControls/shareLink.js`) runs (1) from `shareButton.js` `onRegister` after the facet stamp and (2) from `KDB.js` `finishDashboardInitialization` immediately before `whenUrlShareRestoreSettled` (same URL snapshot as SET `parameterId`). Parse: navigation `name` then `location.href`; per candidate query then hash; exact `readOnly=1`. **Add** `kdb-share-read-only` on `#main` when present; **remove** otherwise. Destroy does **not** `classList` `#main`. Not SET restore. Hide-set unchanged.

---

## 11. Out of scope

- Incoming `parameterId` parse, default-SET skip, overlay hold, host `select` + `change`, `newDashboard` fallback, missing-id alert — owner: writeback + `KDB.js` (`writeback-urlParameterId-contractdelta.md`)
- Host dropdown ownership, option CRUD, DWH fetch — owner: other Cognos extension
- `writebackSet.restore` / GET collect — owner: writeback
- Native Cognos collaboration share — hidden; not repaired
- History steps
- `helpers/` / `shareService`
- Injecting the legacy “neues Dashboard” option into `#selectParameterSet`

---

## 12. Open questions

None for PO. Remaining **implementation blocker** (not a product question):

- None. (Closed: same-slice production of `readSelectedParameterSet`, `getBoardId`, `getDashboardBiBaseUrl`, 2026-08; `getPathRef` replaced `getBoardId` in the click, 2026-10-27.) Icon policy is closed: `share.png` + luminance invert or tiny derived ARGB copies; do not ship the AI pair.

---

## Approval log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `2026-08-28` | `Draft` | Cursor Grok 4.6 | PO-aligned: legacy with/without via host dropdown; action-bar leading; German copy; restore not in this module. |
| `2026-08-28` | `Draft` (review patch) | Cursor Grok 4.6 | Army review: implementation gate, timers, insert order, destroy slot, bridge-owned sentinels, wait-key, showCopyable shape. |
| `2026-08-29` | `Draft` (MUST patch) | Captain after [shareControls review](560e1b2f-a5e4-45d2-8aa5-d33f324663ec) | Icon = `share.png` + invert/tiny derivatives (not AI pair). Bi-base missing = same `ok` + non-empty `data` as boardId. BEM/`is-unavailable` on root; `showCopyable` `message: ""`; `showAlert` `severity: "error"`; titles cite §10.3 keys; insert leftmost of PDF/history. |
| `2026-08-29` | `Draft` (MUST patch) | Captain after [shareControls second pass](fe1ca25a-63c3-498c-b9f7-9a588e0e4a13) | Remount **moves** existing share root leftmost. Hash = `biBase + "#" + URLSearchParams.toString()` (no wrapping braces). |
| `2026-08-29` | `Draft` (SHOULD nits) | Captain after [shareControls third pass](e625ba9e-1768-4eae-9527-1b7212638ec6) | merge-ready. Unavailable in `finishMount`; cssHref `./v1/ext/…`; `data-*=true`; leftmost = document order; empty-label lockstep. Approved held for package. |
| `2026-08-29` | `Approved` | PO-by-proxy (captain; handoff: fresh army green = PO ok) | [shareControls third pass](e625ba9e-1768-4eae-9527-1b7212638ec6) merge-ready. Package green with writeback + Cognos. |
| `2026-09-04` | `Approved` (read-only link) | Captain after dual review | One-liners from `shareControls-read-only-link-contractdelta.md` §9: pad A toggle, dual URL + token, inbound add/remove class. |
| `2026-09-13` | `Approved` (WienKI sibling) | PO vastenburg / coordinator | Leftmost set += WienKI; visual Share \| WienKI \| PDF \| History; mount after WienKI. |
| `2026-10-27` | `Approved` (pathRef link) | Coordinator per PO handover | §0/§5/§8/§9/§10.2/§10.3 patched from `shareControls-pathRef-link-contractdelta.md`: native query with live `pathRef`, `nav_filter=true`, optional `subView`; no `id`/`objRef`/`#`; German `pathRefMissing*` alert. |
