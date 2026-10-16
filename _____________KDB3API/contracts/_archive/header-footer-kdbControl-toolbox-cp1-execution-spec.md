# Execution Spec: `header` + `footer` + kdbControl toolbox wiring (CP-1 sandbox tranche)

**Status:** Ready for execution  
**Contracts:** `_____________KDB3API/contracts/header.md`, `_____________KDB3API/contracts/footer.md`, `_____________KDB3API/contracts/kdbControl-header-footer-toolbox-contractdelta.md`  
**Phase:** Sandbox skeleton + integration (no production tree)  
**Authoring AI:** Planning AI — 2026-05-13  
**Executing AI:** _(to be filled)_  
**Reviewer:** _(user)_

**Scope boundary:** Implementation files live **only** under `TEST/kdbControl-port/header/`, `TEST/kdbControl-port/footer/`, `TEST/kdbControl-port/kdbControl/` (toolbox wiring), and `TEST/kdbControl-port/harness/` + `TEST/kdbControl-port/harness/adapters/` + `TEST/kdbControl-port/harness/state/` as needed. **Same tranche:** update `_____________KDB3API/architecture/eventSubscribe.md` and `_____________KDB3API/contracts/kdbControl.md` §6 so catalog/contract stay aligned with sandbox behaviour. No copies into `_______KDB3/`, no legacy edits, no `.mdc` / rules edits.

---

## 1. Pre-flight rule echo (executing AI)

Before creating files, read in order and **echo one sentence per item** (numbered list) in the first implementation response.

| # | Source | Echo (reference — executing AI must restate in own words) |
|---|--------|--------------------------------------------------------------|
| 1 | `state.mdc` | `_KDB.state` is JSON-serializable; each subtree has one canonical writer; cross-module reads use selectors, mutations go through owner API/dispatch; no foreign writes. |
| 2 | `runtime.mdc` | Non-serializable resources live under `_KDB.runtime.<owner>` with standard buckets; every resource has cleanup; no cross-module runtime reads/writes. |
| 3 | `module-public-api.mdc` | Feature modules expose dispatch-style `mount` / `destroy` / `dispatch` / `getState` only; granular reads are selectors, not `read*` on `_KDB.api`; post-`destroy` guards apply. |
| 4 | `events.mdc` | Known-owner commands use direct `dispatch`, not request-events; fact-events at confirmation points; subscribers mutate only own state; constants in emitter `eventNames.js`; catalog updates for new/changed events. |
| 5 | `dom.mdc` | Selectors under `_KDB.elements.selectors.<owner>`; live nodes in `_KDB.runtime.<owner>.domRefs`; builder / placer / mutator split; scoped queries; no state mutation inside renderers/listeners except via dispatch. |
| 6 | `feature-structure.mdc` | Orchestrator wires only; controller owns behavior; file size/import limits; contract-first; execution spec is mechanical for delegated implementation. |
| 7 | `amd.mdc` | Single `define([...], function...)` per file; no ES modules in production AMD tree; named helpers at factory scope; underscore prefix on AMD deps and boundary parameters. |
| 8 | `naming.mdc` | English identifiers; `camelCase` functions; slash-actions; colon event names; underscore prefix only for boundary inputs; CSS `kdb-` kebab-case. |
| 9 | `error-handling.mdc` | `try/catch` at lifecycle and subscriber boundaries; reducers pure and non-throwing; no silent catches; AbortError handling for abortable work. |

**Additional mandatory reads for this tranche:**

| # | Source | Echo |
|---|--------|------|
| 10 | `_____________KDB3API/.cursor/lifecycleVocabulary.md` | Canonical **lifecycle** terms apply to a **`lifecycle`** field when a module uses one; **`header`/`footer` chrome presence uses domain field `status` (`idle` \| `active` \| `removed`) — not `lifecycle`; no vocabulary update for this tranche (see §14). |
| 11 | `header.md`, `footer.md`, `kdbControl-header-footer-toolbox-contractdelta.md` | CP-1: separate modules, direct dispatch from toolbox, `header:confirmedChanged` payload shape, footer guards + subscription to header fact, no `kdbControl` mirror of header/footer truth. |
| 12 | This execution spec | Full file; file tree, per-file rules, acceptance criteria, forbidden actions. |

---

## 2. File tree with target line counts

Root for new modules: `TEST/kdbControl-port/`.

```
TEST/kdbControl-port/
  header/
    __orchestratorHeader.js                    target 45 lines (hard 120)
    createHeaderController.js                 target 100 lines (hard 150)
    state/
      initialState.js                           target 35 (hard 150)
      createHeaderReducer.js                    target 110 (hard 150)
      selectors.js                              target 70 (hard 150)
    effects/
      __orchestratorHeaderEffects.js            target 90 (hard 150)
    dom/
      buildHeaderChrome.js                      target 95 (hard 150)
      placeHeader.js                            target 55 (hard 150)
      syncHeaderFromState.js                    target 115 (hard 150)
    events/
      eventNames.js                             target 40 (hard 150)
  footer/
    __orchestratorFooter.js                     target 50 (hard 120)
    createFooterController.js                   target 110 (hard 150)
    state/
      initialState.js                           target 25 (hard 150)
      createFooterReducer.js                    target 95 (hard 150)
      selectors.js                              target 45 (hard 150)
    effects/
      __orchestratorFooterEffects.js            target 100 (hard 150)
    dom/
      buildFooterChrome.js                      target 60 (hard 150)
      placeFooter.js                            target 55 (hard 150)
      syncFooterFromState.js                    target 80 (hard 150)
    events/
      eventNames.js                             target 35 (hard 150)
  kdbControl/                                   (existing — modify listed files only)
    events/eventNames.js
    state/initialState.js
    state/createKdbControlReducer.js
    framework/bindFrameworkKdbActionToggles.js
    framework/bindFrameworkPrimitiveVisuals.js
    framework/syncFrameworkViewFromState.js
    framework/__orchestratorFramework.js        (or createHeaderFooterToolboxSync.js — see §6)
    createKdbControlController.js              (if subscription registration belongs here)
  harness/
    index.html                                  target +55 lines vs current (hard 250 total file)
    harness.js                                  target +120 lines (hard 250)
  harness/adapters/
    createMockKdb.js                            target +90 lines (hard 250)
  harness/state/
    createMockKdbStateSeed.js                   target +40 lines (hard 200)

Same tranche (repo `_____________KDB3API/`, not under `TEST/kdbControl-port/`):
  architecture/eventSubscribe.md
  contracts/kdbControl.md                       (§6 only)
```

**Optional new file (prefer if `__orchestratorFramework.js` already near import limit):**  
`kdbControl/framework/syncToolboxHeaderFooterFromSelectors.js` — target 85 lines (hard 150).

---

## 3. Per-file specifications (`Rules to apply`)

Convention: each production `.js` under `header/` and `footer/` is AMD `define([...], function (_dep...) { "use strict"; ... });` per `amd.mdc`. Sandbox port mirrors KDB3 discipline even though path is outside `KDB3/js/**`.

### `header/__orchestratorHeader.js`

- **Role:** Thin wiring: ensure `_KDB.state.header`, `_KDB.runtime.header`, `_KDB.api.header`, `_KDB.elements.selectors.header` defaults exist; instantiate `createHeaderController` with `{ _KDB }`; assign `_KDB.api.header`. Orchestrator header comment documents that **`status`** (`idle` \| `active` \| `removed`) is **domain chrome presence**, not the canonical **`lifecycle`** field — a separate `lifecycle` may be introduced later per module needs without conflating the two.
- **Rules to apply:** `feature-structure.mdc` (orchestrator = wiring only); `module-public-api.mdc` (single surface registration); `state.mdc` / `runtime.mdc` (initial empty buckets); `naming.mdc` (`__orchestrator`); `amd.mdc`.

### `header/createHeaderController.js`

- **Role:** `mount`, `destroy`, `dispatch`, `getState`; `_isDisposed` discipline; route actions to reducer then `__orchestratorHeaderEffects` for DOM + `header:confirmedChanged` emit ordering; validate `payload.source` ∈ `SourceEnum`.
- **Rules to apply:** `module-public-api.mdc`; `error-handling.mdc` (`try/catch` on `mount`/`destroy` bodies; wrapped `dispatch` optional — if dispatch runs sync effects, catch at effect boundary); `runtime.mdc` (cleanup all buckets); `state.mdc` (only writer for `_KDB.state.header`).

### `header/state/initialState.js`

- **Role:** Export factory returning CP-1 shape from `header.md` §2.1 (`status: "idle"`, `subtitleStatus: "hidden"`, empty strings for texts, `editTarget: "none"`, drafts empty).

- **Rules to apply:** `state.mdc`; `naming.mdc`.

### `header/state/createHeaderReducer.js`

- **Role:** Pure reducer for slash-actions in `header.md` §5; normalize `subtitleStatus` when `status !== "active"` per contract; ignore unknown `type`; never touch DOM or `_KDB.events`.

- **Rules to apply:** `state.mdc`; `naming.mdc` (slash-actions); `error-handling.mdc` (no throw).

### `header/state/selectors.js`

- **Role:** `readHeaderStatus`, `readHeaderSubtitleVisible` (derive from `subtitleStatus === "visible"` only meaningful when active — document return for idle/removed), `readHeaderEditTarget`, `readHeaderTitleText`, `readHeaderSubtitleText`, `readHeaderDraftTitleText`, `readHeaderDraftSubtitleText` as needed for harness; all pure `function readX(_KDB)`.

- **Rules to apply:** `state.mdc`; `module-public-api.mdc` (selectors not on API object).

### `header/effects/__orchestratorHeaderEffects.js`

- **Role:** After committed state change: sync DOM via `syncHeaderFromState`; then if transition is “confirmed” per `header.md` §7 (state commit + DOM sync pass complete), emit `_KDB.events.emit(HEADER_CONFIRMED_CHANGED, payload)` with payload **exactly** `{ status, subtitleStatus, titleText, subtitleText, source }`; `source` from the dispatch that initiated the transition (thread through action meta or pass from controller — single source of truth per transition). **Do not emit** on `header/startTitleEdit` or `header/startSubtitleEdit` alone; emit only after a **confirmed** change to `status`, `subtitleStatus`, `titleText`, or `subtitleText` (or another render-relevant commit explicitly listed in `header.md` that changes those payload fields).

- **Rules to apply:** `events.mdc`; `error-handling.mdc` (try/catch around emit + DOM sync boundary); `dom.mdc` (no state writes here except via follow-up dispatch if ever needed — prefer none).

### `header/dom/buildHeaderChrome.js`

- **Role:** Build detached subtree: visible chrome for title/subtitle (sandbox copy), classes `kdb-` prefixed; no attach.

- **Rules to apply:** `dom.mdc` (builder pure); `naming.mdc` (CSS kebab-case).

### `header/dom/placeHeader.js`

- **Role:** Insert/remove header root under mount target from options.

- **Rules to apply:** `dom.mdc` (placer only).

### `header/dom/syncHeaderFromState.js`

- **Role:** Mutator: show/hide/remove nodes from `status`; subtitle visibility; text content from `titleText`/`subtitleText`; edit UI hints from `editTarget`/drafts (minimal for CP-1).

- **Rules to apply:** `dom.mdc`; `state.mdc` (read-only state).

### `header/events/eventNames.js`

- **Role:** Export `HEADER_CONFIRMED_CHANGED` constant string `header:confirmedChanged` (exact name per contracts).

- **Rules to apply:** `events.mdc`; `naming.mdc`.

### `footer/__orchestratorFooter.js`

- **Role:** Same pattern as header for `_KDB.state.footer`, `_KDB.runtime.footer`, `_KDB.api.footer`. Document in orchestrator header comment the same **`status`** vs **`lifecycle`** distinction as `header/__orchestratorHeader.js` (§14 D1).

- **Rules to apply:** Same as header orchestrator.

### `footer/createFooterController.js`

- **Role:** `mount`/`destroy`/`dispatch`/`getState`; on each dispatch that can activate footer, call guard via `readHeaderStatus(_KDB)` before reducer applies transition; never mutate `_KDB.state.header`.

- **Rules to apply:** `module-public-api.mdc`; `state.mdc`; `runtime.mdc`.

### `footer/state/initialState.js`

- **Role:** `{ status: "idle" }`.

- **Rules to apply:** `state.mdc`.

### `footer/state/createFooterReducer.js`

- **Role:** `footer/toggle`, `footer/show`, `footer/hide` per `footer.md` §5; reducer assumes guard already enforced for transitions to `active` OR encode guard in reducer using read-only snapshot passed from controller (prefer controller guard + pure reducer for shape changes only — pick one pattern and stay consistent).

- **Rules to apply:** `state.mdc`; `naming.mdc`.

### `footer/state/selectors.js`

- **Role:** `readFooterStatus(_KDB)`; re-export or thin wrappers only if needed — **footer reads header** only by importing `readHeaderStatus` from `../../header/state/selectors.js` (relative path within sandbox port). **Resolved:** relative sandbox import is mandatory/canon for this tranche; **no** new RequireJS `paths` alias solely for this import.

- **Rules to apply:** `state.mdc`; `footer.md` §8 (public selector path only).

### `footer/effects/__orchestratorFooterEffects.js`

- **Role:** DOM sync after state; apply **G-header-removed** when reacting to subscription (see below): may dispatch internally `footer/hide` or apply reducer+sync for forced removal per contract.

- **Rules to apply:** `events.mdc` (subscriber try/catch); `error-handling.mdc`; `dom.mdc`.

### `footer/dom/*.js`

- **Role:** Parallel to header for footer chrome.

- **Rules to apply:** `dom.mdc`.

### `footer/events/eventNames.js`

- **Role:** Import `HEADER_CONFIRMED_CHANGED` from `header/events/eventNames.js` for subscribe call parameter only; footer does not emit it.

- **Rules to apply:** `events.mdc`.

### `kdbControl/events/eventNames.js`

- **Role:** Remove or clearly comment **unused** toolbox request constants (`header:toggleRequested`, etc.) if no remaining emitters; **no new** request wiring for these controls.

- **Rules to apply:** `events.mdc`; `kdbControl-header-footer-toolbox-contractdelta.md`.

### `kdbControl/state/initialState.js`

- **Role:** Remove `header.toggle`, `footer.toggle`, `header.subtitle.toggle`, `headerEditMode` keys from `framework.placeholderSelections` initial object (no mirror).

- **Rules to apply:** `state.mdc`; contractdelta §2 item 3.

### `kdbControl/state/createKdbControlReducer.js`

- **Role:** Delete `cascadeToolboxHeaderFooterSelections` and any reducer logic that encodes header/footer truth in `placeholderSelections`.

- **Rules to apply:** `state.mdc`; contractdelta.

### `kdbControl/framework/bindFrameworkKdbActionToggles.js`

- **Role:** For `data-kdb-action` in `{ "header.toggle", "footer.toggle", "header.subtitle.toggle" }`: if `_KDB.api.header` / `_KDB.api.footer` exist and `typeof dispatch === "function"`, call `dispatch` with `{ type, payload: { source: "kdbControl" } }` and **return without** updating kdbControl placeholder state for those keys. If the relevant API object or `dispatch` is missing: **`console.warn` once per missing surface** (e.g. gated by a module-scope `didWarnMissingHeaderApi` / `didWarnMissingFooterApi` flag), then **return** — no `throw`, no state write, no stub/fake API.

- **Rules to apply:** `events.mdc` (direct API vs request); `dom.mdc` (listener delegates to API); `module-public-api.mdc`; `error-handling.mdc` (warn, no throw at this boundary).

### `kdbControl/framework/bindFrameworkPrimitiveVisuals.js`

- **Role:** On radio change for `data-placeholder-control-id="headerEditMode"`: map `renameHeader` → `header/startTitleEdit`, `renameHeaderSubtitle` → `header/startSubtitleEdit` with `source: "kdbControl"`; **do not** rely on placeholder selection state for chrome truth. If `_KDB.api.header` / `dispatch` is missing: **same once-only `console.warn` + return** pattern as `bindFrameworkKdbActionToggles.js` (shared flag acceptable so at most one warn from either binder for missing header API).

- **Rules to apply:** Same as `bindFrameworkKdbActionToggles.js`.

### `kdbControl/framework/syncFrameworkViewFromState.js`

- **Role:** Extend sync pass: derive checkbox checked states for the three switches from **selectors** (`readHeaderStatus === "active"`, etc.); map `readHeaderEditTarget` to radio checked (`title` → `renameHeader`, `subtitle` → `renameHeaderSubtitle`, `none` → both unchecked). Keep existing placeholder sync for **other** demo controls unchanged.

- **Rules to apply:** `dom.mdc`; `state.mdc` (read via selectors only).

### `kdbControl/framework/__orchestratorFramework.js` (and/or new sync helper + `createKdbControlController.js`)

- **Role:** On kdbControl `mount`, subscribe once to `header:confirmedChanged` with handler that only calls existing `syncView` / `syncFrameworkViewFromState` path; store unsubscribe under `_KDB.runtime.kdbControl.subscriptions.headerFooterToolboxReadSync` (or name in that bucket). `destroy`: unsubscribe.

- **Rules to apply:** `runtime.mdc`; `events.mdc`; `error-handling.mdc` (try/catch inside handler).

### `harness/index.html`

- **Role:** Add `#mock-dashboard-header-mount` and `#mock-dashboard-footer-mount` inside `#mock-dashboard-frame` (or documented siblings); add buttons: “Header API toggle”, “Footer API toggle”, “Log header+footer state”, “Log last header:confirmedChanged”; optional subtitle/title scenario buttons as needed for AC.

- **Rules to apply:** `amd.mdc` harness exception for script type; no production paths.

### `harness/harness.js`

- **Role:** `require.config.paths`: map `dashboard/canvas/header` → `header`, `dashboard/canvas/footer` → `footer` **only if** needed to load orchestrator modules from harness `baseUrl` (optional convenience). **Not** required for `footer` → `header` selector import (that stays relative AMD per §14). After mock `_KDB` creation, call `__orchestratorHeader(_KDB, {})` and `__orchestratorFooter(_KDB, {})`, then `mount` both with `{ mountTarget: Element }` pointing to mock nodes; mount kdbControl as today; wire debug log for `_KDB.state.header`, `_KDB.state.footer`, and every `header:confirmedChanged` payload.

- **Rules to apply:** `amd.mdc` harness; `module-public-api.mdc` mount ordering.

### `harness/adapters/createMockKdb.js` + `harness/state/createMockKdbStateSeed.js`

- **Role:** Seed `_KDB.state.header`, `_KDB.state.footer` initial objects; ensure `_KDB.events` supports subscribe/emit; seed `_KDB.elements.selectors.header` / `.footer` with `mountRootSelector` strings targeting mock mount ids; attach `_KDB.api.header` / `_KDB.api.footer` after orchestrators.

- **Rules to apply:** `state.mdc`; `dom.mdc` (selectors only in elements).

---

## 4. Header module skeleton (behavioural checklist)

| Layer | Responsibility |
|-------|------------------|
| **state / initialState** | CP-1 shape; **`status`** tri-state (`idle` \| `active` \| `removed`) = **domain chrome presence**, not `lifecycle`; drafts for edit. |
| **reducer / actions** | All `header/*` actions in `header.md` §5; `SourceEnum` validated in controller before reducer; reducer ignores invalid `source`. |
| **selectors** | Published read API; no deep state access from other modules. |
| **controller / API** | `_KDB.api.header = { mount, destroy, dispatch, getState }`; disposal guards. |
| **DOM build / place / remove / render** | `idle`/`removed`: no mounted chrome (or empty inert shell — pick one and document in code comment); `active`: built + placed; `destroy` removes nodes and clears `domRefs`. |
| **Event publishing** | `header:confirmedChanged` only after state + DOM sync; payload keys exactly five; **no** `editTarget` in payload; **no emit** for edit-only `startTitleEdit` / `startSubtitleEdit`; emit only when `status`, `subtitleStatus`, `titleText`, or `subtitleText` (payload fields) change on a confirmed commit; header does **not** subscribe to its own fact for state writes. |

---

## 5. Footer module skeleton

| Layer | Responsibility |
|-------|------------------|
| **state / initialState** | `{ status: "idle" }` initially. |
| **reducer / actions** | `footer.md` §5; never set `active` without header guard satisfied at controller level. |
| **selectors** | `readFooterStatus`; import `readHeaderStatus` from header selectors only. |
| **controller / API** | Same dispatch surface as header. |
| **DOM** | Parallel to header; teardown on `removed`/`idle` per spec in effects. |
| **Guard vs inactive header** | **B:** every `footer/toggle` / `footer/show` that could reach `active` checks `readHeaderStatus(_KDB) === "active"` first — else no-op. |
| **Subscribe / reaction** | **A:** on `mount`, subscribe to `header:confirmedChanged`; if `payload.status === "removed"` (or maps to header inactive): if footer was `active` → transition to `removed` + DOM teardown; if footer was never `active` (`idle`) → remain `idle`. Implement without writing `_KDB.state.header`. Handler wrapped in `try/catch` per `error-handling.mdc`. |

---

## 6. kdbControl toolbox wiring

| Requirement | Spec detail |
|-------------|-------------|
| **Dispatch** | `header.toggle` / `footer.toggle` / `header.subtitle.toggle` / title+subtitle radios → `_KDB.api.header.dispatch` / `_KDB.api.footer.dispatch` with `payload: { source: "kdbControl" }` per contractdelta §4. |
| **Read-sync** | `syncFrameworkViewFromState` (or extracted helper) reads `readHeaderStatus`, `readFooterStatus`, `readHeaderSubtitleVisible`, `readHeaderEditTarget` from selector modules; updates DOM only. |
| **Missing owner APIs** | If `_KDB.api.header` or `_KDB.api.footer` / `dispatch` absent when a toolbox control fires: **one** `console.warn` per missing surface (module-scope once flag), then return; no throw, no kdbControl state write, no fake/stub API. |
| **No request-events** | Do not emit `header:*Requested` / `footer:toggleRequested` for these controls. |
| **No kdbControl mirror** | Remove placeholder keys and cascade reducer logic; optional subscription to `header:confirmedChanged` **only** to trigger `syncView` (no state mutation in kdbControl from that event). |

---

## 7. Harness additions

1. Mock mount targets in DOM with stable ids.  
2. Mount order: mock `_KDB` → seed state/elements → `header` orchestrator + `header.mount` → `footer` orchestrator + `footer.mount` → `kdbControl.mount` (existing order adjusted only as needed).  
3. Buttons / checks covering: header toggle, footer toggle, subtitle toggle, title radio, subtitle radio (via toolbox UI **and** duplicate harness API buttons for state-only debugging).  
4. Debug `<pre>`: append lines for `JSON.stringify` of `_KDB.state.header`, `_KDB.state.footer`, and each `header:confirmedChanged` payload.  
5. Destroy harness path: destroy kdbControl → footer → header (or reverse if contract requires — use **footer before header** if footer depends on header events during teardown); assert no handlers fire after destroy.

---

## 8. Docs (same tranche as sandbox code — mandatory)

| Document | Action |
|----------|--------|
| `_____________KDB3API/architecture/eventSubscribe.md` | Add `header:confirmedChanged` (fact), emitter `header`, subscribers `footer`, optional `kdbControl` read-sync note, payload table, teardown owners. Ship in the **same** change set as the sandbox implementation so the catalog does not lag. |
| `_____________KDB3API/contracts/kdbControl.md` §6 | Replace or mark **superseded** the toolbox request-event rows listed in contractdelta §5 for known-owner header/footer controls; keep `tabs:toolRequested` untouched per delta. Ship together with sandbox code. |

---

## 9. Acceptance criteria

1. **Header toggle:** `header/toggle` cycles DOM presence consistent with `idle|removed → active` and `active → removed`.  
2. **Footer toggle:** `footer/toggle` shows/removes footer DOM only while header `active`.  
3. **Footer blocked / removed:** With footer `active`, `header/toggle` to `removed` removes footer DOM and sets footer `removed`; with footer never activated, footer stays `idle`.  
4. **Subtitle toggle:** `header/toggleSubtitle` updates header state + DOM when header `active`; no-op when inactive.  
5. **Title / subtitle radios:** Selecting each dispatches correct `start*Edit` and `readHeaderEditTarget` matches checked radio after sync.  
6. **kdbControl reflects owners:** Toolbox switches and radios match selectors after arbitrary API dispatches (`source: "api"` from harness buttons).  
7. **Destroy:** `header.destroy` / `footer.destroy` / `kdbControl.destroy` clear subscriptions, abort controllers, detach DOM; no leaks on second destroy.  
8. **No foreign state writes:** Grep verification: no assignments to `_KDB.state.header` outside `header/` and none to `_KDB.state.footer` outside `footer/`; kdbControl does not assign header/footer subtrees.  
9. **Docs in tranche:** `eventSubscribe.md` and `kdbControl.md` §6 updated in the same delivery as sandbox code (see §8).  
10. **No `lifecycleVocabulary.md` edit** for `status` tri-state; no conflation of `status` with `lifecycle` (see §14).

---

## 10. Forbidden actions

1. No copy or sync of these modules into `_______KDB3/KDB3/js/**` (production target) in this tranche.  
2. No edits under `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`, or other legacy trees.  
3. No edits to `_____________KDB3API/.cursor/rules/*.mdc`, contract templates, or the three **approved** contracts (`header.md`, `footer.md`, `kdbControl-header-footer-toolbox-contractdelta.md`) except via a separate contract amendment process.  
4. No `_KDB.state.kdbControl.*` fields mirroring header/footer chrome truth (including placeholder selections for those controls).  
5. No request-events for the known-owner commands listed in contractdelta §4.  
6. No `headerFooter` combined module.  
7. No emission of `header:confirmedChanged` before DOM sync completes for the emitting commit.  
8. No emission of `header:confirmedChanged` for `header/startTitleEdit` or `header/startSubtitleEdit` alone (see §14).  
9. No edit to `_____________KDB3API/.cursor/lifecycleVocabulary.md` to add `status` / chrome tri-state — domain `status` is separate from vocabulary `lifecycle` (see §14).

---

## 11. Reducer / dispatch matrix (reference)

### Header (`header.md` §5)

| type | Reducer (when) | Effects / DOM |
|------|----------------|---------------|
| `header/toggle` | `idle\|removed→active`; `active→removed` | mount/unmount + emit if confirmed |
| `header/show` | toward `active` if not already | same |
| `header/hide` | `active→removed` | same |
| `header/toggleSubtitle` | flip subtitle only if `status==="active"` | sync + emit if changed |
| `header/startTitleEdit` | `editTarget`, draft | DOM sync only; **no** `header:confirmedChanged` |
| `header/startSubtitleEdit` | same | DOM sync only; **no** `header:confirmedChanged` |
| `header/commitTitle` / `commitSubtitle` / `cancelEdit` | per contract | emit only when `titleText`/`subtitleText`/`status`/`subtitleStatus` change |

### Footer (`footer.md` §5–6)

| type | Guard | Reducer |
|------|-------|---------|
| `footer/toggle` | to `active` only if `readHeaderStatus==="active"` | mirror header toggle semantics |
| `footer/show` / `footer/hide` | same where applicable | per contract |

---

## 12. Selector publication table

| Selector | Module | Returns |
|----------|--------|---------|
| `readHeaderStatus` | header | `"idle"\|"active"\|"removed"` |
| `readHeaderSubtitleVisible` | header | boolean (contract: meaningful when active) |
| `readHeaderEditTarget` | header | `"none"\|"title"\|"subtitle"` |
| `readHeaderTitleText` | header | string |
| `readHeaderSubtitleText` | header | string |
| `readFooterStatus` | footer | `"idle"\|"active"\|"removed"` |

---

## 13. Reporting (executing AI)

Return: file checklist with line counts, grep proof for "no foreign writes", confirmation of forbidden-tree compliance, confirmation that §8 docs (`eventSubscribe.md`, `kdbControl.md` §6) were updated in the same tranche as sandbox code, and any deviations filed with rule citation.

---

## 14. Resolved decisions (CP-1 — closed)

| # | Topic | Decision |
|---|--------|----------|
| **D1** | `status` vs `lifecycleVocabulary.md` | Values `idle`, `active`, `removed` are **domain** values of field **`status`** (chrome presence). They are **not** the canonical **`lifecycle`** field. **No** `lifecycleVocabulary.md` update in this tranche. If a module-level `lifecycle` is added later (e.g. `disposed` for the controller instance), it remains a **separate** concern from `status`. |
| **D2** | `header:confirmedChanged` | **Not** emitted for `header/startTitleEdit` or `header/startSubtitleEdit` alone. Emit **only** after a confirmed change to **`status`**, **`subtitleStatus`**, **`titleText`**, or **`subtitleText`** (payload fields), or another commit explicitly documented in `header.md` that alters those fields — i.e. render-relevant confirmed state, post DOM sync. |
| **D3** | Footer → header selector import | Relative sandbox AMD import is **allowed and preferred** for this tranche, e.g. `../../header/state/selectors.js`. **No** new RequireJS `paths` alias **required** solely for that import. |
| **D4** | Missing `_KDB.api.header` / `_KDB.api.footer` in toolbox wiring | **One** `console.warn` per missing API surface (once-only flag); **no** `throw`; **no** state write; **no** fake/stub fallback implementation. |
| **D5** | Docs sync | `eventSubscribe.md` and `kdbControl.md` §6 are updated in the **same tranche** as the sandbox code so contract/catalog do not fall behind. |

---

_End of execution spec._
