# Execution Spec: header/footer zoom hint (WP5)

> Mechanical spec for grok 4.6 implementers. Architecture lives in `header-footer-zoom-hint-contractdelta.md` (PO **Approved** 2026-09-07). Do not re-open the proposal series. No harness. Existing production header/footer only.

---

**Status:** `Executed` — Cognos green 2026-09-07; **trigger parked** (PO): `_notifyZoomHint` calls commented; helper/labels/AMD stay.  
**Module / contract:** `contracts/header.md` + `contracts/footer.md` + `contracts/header-footer-zoom-hint-contractdelta.md`  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-07  
**Executing AI:** grok 4.6 subagent (captain assigns after spec review)  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist

**May create:**

- `KDB3/js/dashboard/header/config/headerLabels.js`
- `KDB3/js/dashboard/header/effects/notifyZoomHint.js`

**May edit:**

- `KDB3/js/dashboard/header/__orchestratorHeader.js` (labels namespace init + merge + AMD 2→3 only; `try/catch` around the new merge only)
- `KDB3/js/dashboard/header/effects/__orchestratorHeaderEffects.js` (AMD 7→8; **one** `_notifyZoomHint` call after `__mountSync` return)
- `KDB3/js/dashboard/footer/effects/__orchestratorFooterEffects.js` (AMD 5→6; **one** `_notifyZoomHint` call after `_syncFooterFromState`)

**Must not edit:** `createHeaderController.js`, `createFooterController.js`, both `handleParameterSetRestore.js`, both `apply*HistoryReplay.js`, `createHeaderHistoryReplayHandler.js`, `createFooterHistoryReplayHandler.js`, `runNormalRestore.js`, `runNewDashboardReset.js`, `fillToolboxHeaderFooter.js`, `bindFrameworkKdbActionToggles.js`, `cleanupHeaderRuntime.js`, `createMessageService.js`, `showGlassToast.js`, `renderAnchoredNotification.js`, `mapV2HeaderFooter.js`, `KDB.js`, footer date/user/page/url files, `setDashboardZoom`, `__orchestratorFooter.js`, parent `header.md` / `footer.md` / `messageService.md` (one-liners = captain **after** JS dual-review), `.cursor/rules/*.mdc`, git.

**Must not create:** `dashboard/chrome/`; `footer/effects/notifyZoomHint.js`; `footer/config/*Labels.js`; runtime latch / new runtime bucket; new events; new `messageService` methods; `helpers/` / `common/` / `shared/`.

**Footer effects must not import** `__orchestratorHeaderEffects.js`. Footer effects may import only the leaf `../../header/effects/notifyZoomHint.js` (Section C). Do not remove header effects’ existing footer **view** import `syncFooterFromState`.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB` namespaces; labels under `_KDB.config.labels.de.*`; no new top-level namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — header/footer own their chrome `status`; toast is not state; no foreign subtree writes.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no new buckets; helper may read `_KDB.runtime.header.domRefs.rootEl`; footer orch must not.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new `_KDB.api.header` / `_KDB.api.footer` methods; Approved WP5 allows **one** footer-effects → `notifyZoomHint.js` import.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events; do not toast from `HEADER_CONFIRMED_CHANGED`.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — contract first; do not grow controllers (header 152 / footer AMD 9); JS ≤150 / orch ≤120 / AMD ≤10.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files; German UI string only in `headerLabels.js`; `_` on boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on named executables; missing messageService → `console.warn` + no-op, no throw.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no `document.querySelector`; anchor is already-mounted `rootEl`; never pass a disconnected node to `notifyAnchored`.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; factory-scope named helpers; no nested subfunctions; no ES modules.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — chrome `status` (`idle`/`active`/`removed`) is not module `lifecycle`; do not add a lifecycle term.
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no Cognos zoom; no `_KDB.cognosAPI` / `__getDashboardAPI`.
13. `_____________KDB3API/contracts/header-footer-zoom-hint-contractdelta.md` — Approved WP5 law (one toast, `notifyAnchored` on header `rootEl`, skip mount/unmount/replay).
14. This execution spec.

---

## Section B. Folder tree (create / edit order)

```
KDB3/js/dashboard/header/
  config/headerLabels.js                         (new)
  effects/notifyZoomHint.js                      (new)
  __orchestratorHeader.js                        (edit)
  effects/__orchestratorHeaderEffects.js         (edit)
KDB3/js/dashboard/footer/
  effects/__orchestratorFooterEffects.js         (edit)
```

---

## Section C. Per-file specifications

#### `KDB3/js/dashboard/header/config/headerLabels.js`

- **Role:** declarative DE labels (config)
- **Lines:** target 12 (hard 40)
- **AMD imports:** none (`define([], ...)`)
- **Factory parameters:** none
- **Factory-scope named helpers:** none
- **Entry:** none. Factory body: `"use strict";` then `return { … }`.
- **Return value:** object literal with **exactly one** key:

```js
{
  zoomFitToPageHint: "Sie können das Zoom-Symbol oben rechts im Dashboard verwenden und dort „An Seite anpassen“ auswählen, um die Dashboard-Größe an geänderte Header-/Footer-Einstellungen anzupassen."
}
```

- Exact DE string (delta lock 3), including the German quotation marks `„` / `“`. No other keys. No functions.
- **Rules to apply:**
  - `amd.mdc` — one `define([]);` config export; no nested functions.
  - `naming.mdc` — English key `zoomFitToPageHint`; German value is UI copy.
  - `feature-structure.mdc` — `config/` folder; scannable.
  - `kdb-object.mdc` — merged into `_KDB.config.labels.de.header` by the header orchestrator, not a new namespace.

---

#### `KDB3/js/dashboard/header/effects/notifyZoomHint.js`

- **Role:** effect helper (toast on chrome `status` → `active`)
- **Lines:** target 95 (hard 120)
- **AMD imports:** none (`define([], ...)`)
- **Factory parameters:** none
- **Factory-scope named helpers** (never inside `__controller`):
  - `function readZoomHintLabel(_KDB)` — null-safe walk `_KDB.config && _KDB.config.labels && _KDB.config.labels.de && _KDB.config.labels.de.header && _KDB.config.labels.de.header.zoomFitToPageHint`. If `typeof` value `!== "string"` return `""`. Then `trim()`; if empty return `""`. Do **not** coerce with `String(...)` (`String(undefined)` is `"undefined"` and would toast). **Do not** hardcode the German sentence.
  - `function readConnectedHeaderRoot(_KDB)` — `el = _KDB.runtime.header.domRefs.rootEl` with null-safe walks. If `el && el.isConnected === true` return `el`. Else `null`. No `document.querySelector`. Do not read footer `domRefs`.
  - `function shouldSkipAction(_action)` — if `!_action` return `false` (null action is not a skip type; predicate handles it). If `_action.type === "__mountSync"` or `_action.type === "__unmount"` return `true` (compare `type` twice; do **not** write `=== "__mountSync" || "__unmount"`). If `_action.options && _action.options.isHistoryReplay === true` return `true`. Else `false`. Do **not** treat `skipHistory` as skip.
  - `function isActiveTransition(_prev, _next)` — if `!_prev || !_next` return `false`. Return `_prev.status !== "active" && _next.status === "active"`.
- **Entry function:**
  - Name: `__controller`
  - Parameters: `_KDB`, `_action`, `_prev`, `_next`
  - Body steps (in order, all inside one `try`):
    1. If `shouldSkipAction(_action)` → `return`.
    2. If `!isActiveTransition(_prev, _next)` → `return`.
    3. `label = readZoomHintLabel(_KDB)`. If `!label` → `console.warn("[header.notifyZoomHint] missing zoomFitToPageHint label")` → `return`.
    4. `svc = _KDB.services && _KDB.services.message`. If `!svc || typeof svc.notifyAnchored !== "function"` → `console.warn("[header.notifyZoomHint] messageService missing")` → `return`.
    5. `rootEl = readConnectedHeaderRoot(_KDB)`. If `!rootEl` → `return` (no warn, no `notify()`).
    6. `svc.notifyAnchored({ anchor: rootEl, code: "HEADER_FOOTER_ZOOM_HINT", message: label, severity: "info", durationMs: 10000 })`.
    7. `catch (err)`: `console.error("[header.notifyZoomHint]", err);` **do not throw**.
- **Return value:** `__controller`
- **Must not:** call `notify()`; pass a disconnected node; write state/runtime; emit events; AMD-import `headerLabels.js`; read `_KDB.runtime.footer`; query filter dock; grow a factory-closure latch.
- **Rules to apply:**
  - `amd.mdc` — `define([]);` helpers at factory scope only; export `__controller`.
  - `naming.mdc` — `__controller`; `_` on boundary params; English identifiers; `code` `HEADER_FOOTER_ZOOM_HINT`.
  - `feature-structure.mdc` — `effects/`; ≤120 lines; AMD 0.
  - `error-handling.mdc` — one `try/catch` on `__controller` only. The four named helpers stay trivial (no nested try). Missing service converts (warn + return).
  - `runtime.mdc` — read header `domRefs.rootEl` only; no new bucket.
  - `dom.mdc` — no document-root query; connected live node only.
  - `events.mdc` — no emit.
  - `module-public-api.mdc` — existing `services.message.notifyAnchored` only.
  - `cognos-adapter.mdc` — no Cognos.

---

#### `KDB3/js/dashboard/header/__orchestratorHeader.js`

- **Role:** module orchestrator (edit)
- **Lines:** live 18 → target ≤50 (hard 120). No business logic / no toast.
- **AMD imports** (literal order, **3**):
  1. `"./config/headerLabels"`
  2. `"./createHeaderController"`
  3. `"./state/initialState"`
- **Factory parameters:** `_headerLabels`, `_createHeaderController`, `_initialState`
- **Keep** existing `domRefs` / `abortControllers` / `subscriptions` / `listeners` init and `_KDB.api.header = _createHeaderController(_KDB)` unchanged.
- **Change `__orchestratorHeader` body:** after existing `state.header` / `runtime.header` init, **before** `_KDB.api.header = ...`, add **only** this merge inside its own `try/catch` (do not wrap the existing wiring in a new outer try):

```js
try {
  _KDB.config = _KDB.config || {};
  _KDB.config.labels = _KDB.config.labels || {};
  _KDB.config.labels.de = _KDB.config.labels.de || {};
  _KDB.config.labels.de.header = Object.assign({}, _headerLabels, _KDB.config.labels.de.header || {});
} catch (err) {
  console.error("[header.orchestrator] labels merge failed", err);
}
```

- Existing keys on `_KDB.config.labels.de.header` win (`Object.assign` target is a new object from defaults then existing).
- Do not toast here. Do not add `"use strict"` if the file already has it.
- **Rules to apply:**
  - `amd.mdc` — AMD 3; no nested functions inside the orch (the `try` is inline, not a nested `function`).
  - `naming.mdc` — `_headerLabels` boundary import.
  - `feature-structure.mdc` — thin orchestrator; toast stays in effects helper.
  - `kdb-object.mdc` — merge into `_KDB.config.labels.de.header` only.
  - `error-handling.mdc` — try/catch on the new merge; log + do not throw.

---

#### `KDB3/js/dashboard/header/effects/__orchestratorHeaderEffects.js`

- **Role:** effects orchestrator (edit)
- **Lines:** live 92 → target ≤105 (hard 120)
- **AMD imports** (literal order, **8** — keep the existing seven, append the helper last):
  1. `"../view/syncHeaderFromState"`
  2. `"../view/buildHeaderChrome"`
  3. `"../view/placeHeader"`
  4. `"../events/eventNames"`
  5. `"../../footer/view/syncFooterFromState"`
  6. `"./bindHeaderEditSession"`
  7. `"./syncHeaderKdbControlReadView"`
  8. `"./notifyZoomHint"`
- **Factory parameters:** keep the current seven names, then `_notifyZoomHint`.
- **Change `__effects` only.** Live insert: **after line 75** (`if (t === "__mountSync") return;`), **before line 76** (`var now = snapshotChrome(st);`). After `var t = action && action.type;` and the `__mountSync` return, before `snapshotChrome`:

```js
_notifyZoomHint(_KDB, action, prevChrome, st);
```

- Do **not** call the helper before the `__mountSync` return (header mount prev is idle `initialState` — would false-toast).
- Do **not** put the call inside the `HEADER_CONFIRMED_CHANGED` `if`.
- Do **not** add a second call. Do not change `ensureChromeMounted` / `teardownChrome` / emit payload.
- **Rules to apply:**
  - `amd.mdc` — AMD 8 (smell, ≤10); no nested functions.
  - `naming.mdc` — `_notifyZoomHint`.
  - `feature-structure.mdc` — orch ≤120; call is wiring only.
  - `error-handling.mdc` — existing `__effects` try/catch stays; helper must not throw into it.
  - `events.mdc` — existing confirmed emit unchanged; not the toast trigger.

---

#### `KDB3/js/dashboard/footer/effects/__orchestratorFooterEffects.js`

- **Role:** effects orchestrator (edit)
- **AMD imports** (literal order, **6** — keep the existing five, append last):
  1. `"../view/syncFooterFromState"`
  2. `"../view/buildFooterChrome"`
  3. `"../view/placeFooter"`
  4. `"./loadFooterUpdateDate.js"`
  5. `"./loadFooterCreatedUser.js"`
  6. `"../../header/effects/notifyZoomHint.js"`
- **Factory parameters:** keep the current five names, then `_notifyZoomHint`.
- **Lines:** live 72 → target ≤85 (hard 120)
- **Change `__effects` only.** Live insert: **after line 55** (`_syncFooterFromState(_KDB);`), **before line 56** (`syncKdbControlReadView(...)`). `__unmount` already returned at lines 48–50. After `_syncFooterFromState(_KDB);` and **before** `syncKdbControlReadView(_KDB, action, prevState);`:

```js
_notifyZoomHint(_KDB, action, prevState, st);
```

- The `__unmount` branch **returns first** — that path must **not** call the helper (skip is also inside the helper).
- **One** call. Do not import `__orchestratorHeaderEffects.js`. Do not read `runtime.header` in this file (the helper does).
- Do not change date/user loaders, `ensureFooterMounted`, or `teardownFooter`.
- **Rules to apply:**
  - `amd.mdc` — AMD 6 (smell line, ≤10); leaf helper only.
  - `naming.mdc` — `_notifyZoomHint`; call arity `_KDB, action, prevState, st` (footer live order is action-before-prev; helper order is `_action, _prev, _next`).
  - `feature-structure.mdc` — orch ≤120.
  - `error-handling.mdc` — existing `__effects` try/catch stays.
  - `module-public-api.mdc` — this is the Approved one-file exception.
  - `runtime.mdc` — this file does not touch header `domRefs`.

---

## Section D. Reducer behavior table

**N/A.** No new actions. No reducer change. `header/show|toggle` and `footer/show|toggle` already move chrome `status` to `active`. This WP only observes the transition in effects.

| Action type | This WP |
|---|---|
| `header/toggle`, `header/show` | unchanged reducer; toast if helper predicate matches |
| `footer/toggle`, `footer/show` | unchanged reducer; toast if helper predicate matches |
| `header/hide`, `footer/hide` | no toast (predicate false) |
| `header/setTitleText`, `header/setSubtitleChrome`, `header/setIcon`, subtitle toggles | no toast (`status` stays `active`; predicate false) |
| `__mountSync`, `__unmount` | helper skip |
| history replay `*/show` with `options.isHistoryReplay` | helper skip |

---

## Section E. Published selectors

**N/A.** No new published selectors. Footer already reads header status via existing `state/selectors`. Helper reads header `runtime.domRefs.rootEl` (header-owned).

---

## Section F. Public API wiring

- Surfaces unchanged: `_KDB.api.header`, `_KDB.api.footer` (no new methods).
- `_KDB.services.message` unchanged (`notifyAnchored` already exists). Do not call `notify` from this WP.
- Labels: `_KDB.config.labels.de.header.zoomFitToPageHint` after header orch merge.
- Runtime: no new buckets. Reuse `runtime.header.domRefs.rootEl`.
- State: no new keys.

---

## Section G–I. Harness / mocks

**N/A.** No new harness. Do not add TEST HTML.

---

## Section J. Acceptance criteria (executing AI self-check)

1. Allowlist only: two new files + three edits. No other paths modified.
2. Header effects AMD **8**. Footer effects AMD **6**. Header orch AMD **3**. Helper AMD **0**. No file >150. Both effects orchs ≤120.
3. Controllers untouched (`createHeaderController.js` still 152 lines / same AMD; footer still AMD 9).
4. Header-on (footer off) → one `notifyAnchored` with `code: "HEADER_FOOTER_ZOOM_HINT"`, `severity: "info"`, `durationMs: 10000`, connected header `rootEl`.
5. Footer-on while that toast is still showing → helper may run; `notifyAnchored` collapses (same anchor + code); **no** Glass `notify`.
6. Restore both-on (inner `header/show` then `footer/show`, `skipHistory` only) → one visible toast.
7. Hide header → helper predicate false (no **new** zoom-hint call). Do not “fix” in-flight Glass fallback.
8. Footer-only while header not `active` → live controller no-op; no toast.
9. Missing `services.message` / `notifyAnchored` → `console.warn("[header.notifyZoomHint] …")`; no throw.
10. Missing/empty `zoomFitToPageHint` → `console.warn`; no hardcoded DE in the helper.
11. Disconnected/missing `rootEl` → silent return; **no** `notify()`.
12. `__mountSync` → no toast. `isHistoryReplay === true` → no toast. `_action === null` with prev === next → no toast. Bootstrap first paint that stays `idle` → no toast. After the first toast is dismissed, a later footer-on **may** toast again (do not add a latch).
13. No `document.querySelector`. No filter-dock. No new events. No Cognos zoom.
14. Footer effects import path is the leaf helper, not `__orchestratorHeaderEffects.js`.
15. Factory-scope helpers only; `"use strict"` in new AMD factories.
16. Report: Section L.

---

## Section K. Forbidden actions

- Re-open proposal-series options (Glass `notify` + latch, reopen Q4, filter-dock anchor, `dashboard/chrome/`, duplicate footer wrapper).
- Edit forbidden files listed in the allowlist.
- Grow `createHeaderController.js` / `createFooterController.js`.
- Call `notify()` from the helper (Glass fallback doubles restore).
- Pass `rootEl` when `isConnected !== true`.
- Hardcode the German sentence in `notifyZoomHint.js`.
- Skip restore `header/show` / `footer/show` (`skipHistory` is not `isHistoryReplay`).
- Toast from `HEADER_CONFIRMED_CHANGED`.
- Import `__orchestratorHeaderEffects.js` from footer.
- Nested functions inside entry bodies / async IIFE.
- ES modules in `KDB3/js/**`.
- Commit / push / git config.
- Modify `.mdc`, `_template.md`, `_executionSpecTemplate.md`, or the Approved delta.
- Parent one-liners on `header.md` / `footer.md` / `messageService.md` (captain after JS review).
- Skip Section A echo.
- Read `_______KDB3` / `_______REDESIGN2` for copy-paste. Legacy copy is the lock-3 string in `headerLabels.js`.

---

## Section L. Reporting template

1. Pre-flight echo (14 sentences).
2. File checklist: path, line count, AMD count, matches spec | deviation.
3. Deviations with motivation.
4. Self-verification of Section J (pass/fail each).
5. Open questions for captain/PO.

---

## Section M. Reviewer handoff

Captain: two **fresh** grok 4.6 reviews after JS (mechanical vs this spec; semantic vs Approved delta). Then PO Cognos: header on → one German zoom hint; footer on while showing → no second; restore both-on → one; hide → no new hint; undo show → no hint.
