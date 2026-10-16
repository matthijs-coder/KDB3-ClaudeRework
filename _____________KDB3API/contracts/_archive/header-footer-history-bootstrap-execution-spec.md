# Execution Spec: header + footer history replay bootstrap glue

> Execute only after CP-1 approval of `header-footer-history-bootstrap-contractdelta.md` and prerequisite `historyService-kdbControl-replay-bootstrap` (Strategy A late bind already in production).
> This spec extends `collectReplayHandlers` and owner `mount()`/`destroy()` staging only. No header/footer commit or replay logic in this tranche.

---

**Status:** `Draft`
**Contract delta:** `_____________KDB3API/contracts/header-footer-history-bootstrap-contractdelta.md`
**Phase:** `header footer history bootstrap`
**Depends on:** `historyService-kdbControl-replay-bootstrap-execution-spec.md` (completed)
**Authoring AI:** Auto, 2026-05-21
**Executing AI:** `<pending>`
**Reviewer:** `<pending CP-2>`

**CP-1 approved (2026-05-21):**

- Chrome and text are separate execution tranches (this spec enables both handler keys; text apply may be inactive until text spec).
- Header replay via internal `applyHeaderHistoryReplay`; no new public API.
- Replay `source: "api"`.
- kdbControl sync via owner effects (wired in owner chrome specs, not here).
- Footer cascade: header undo to active does not auto-restore footer.
- No `KDB.js` change if current mount/bind order is preserved.

---

## Section A. Pre-flight read list

The executing AI must read each file below and echo one sentence per item before editing:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB.*` namespaces; bootstrap reads runtime contributions only.
2. `_____________KDB3API/.cursor/rules/state.mdc` — bootstrap glue does not write owner state subtrees.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — staged contributions under `_KDB.runtime.<owner>` with owner destroy cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no public `registerHistoryHandler`; historyService surface unchanged.
5. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — orchestrator wiring only in touched controller mount/destroy hooks.
6. `_____________KDB3API/.cursor/rules/naming.mdc` — AMD boundary underscore prefix.
7. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on mount/destroy boundaries.
8. `_____________KDB3API/.cursor/rules/amd.mdc` — dependency arrays and factory parameters 1:1.
9. `_____________KDB3API/contracts/header-footer-history-bootstrap-contractdelta.md` — handler map and bind order.
10. `_____________KDB3API/contracts/historyService-kdbControl-replay-bootstrap-contractdelta.md` — existing Strategy A adapter.
11. `_____________KDB3API/KDB3/js/core/services/collectReplayHandlers.js` — current kdbControl-only collection.
12. `_____________KDB3API/KDB3/js/core/services/__orchestratorServices.js` — `bindHistoryReplayHandlersOnly` path.
13. `_____________KDB3API/KDB3/js/KDB.js` — mount order header → footer → kdbControl → bind → historyControls.
14. `_____________KDB3API/KDB3/js/dashboard/header/createHeaderController.js` — mount/destroy extension point.
15. `_____________KDB3API/KDB3/js/dashboard/footer/createFooterController.js` — mount/destroy extension point.

First output must be 15 summaries. If any summary is generic or missing, stop and re-read.

---

## Section B. Scope

Extend Strategy A late-bind to collect and bind header/footer replay handler contributions.

In scope:

1. Update `collectReplayHandlers(_KDB)` to include `header_chromeChange`, `header_textChange`, and `footer_chromeChange` when staged contributions exist.
2. Call `_stageHeaderHistoryReplayHandler` from `header.mount()` after `_KDB.runtime.header` is usable.
3. Call `_stageFooterHistoryReplayHandler` from `footer.mount()` after `_KDB.runtime.footer` is usable.
4. Clear staged contributions in `header.destroy()` and `footer.destroy()`.
5. Preserve existing `kdbControl_settingsChange` collection and bind flow.

Out of scope:

- Implementing `maybePush*` / `apply*HistoryReplay` business logic (owner chrome/text specs).
- Changing `historyService` public API or editing `historyService/` files (unless Strategy A bind is broken).
- Changing `KDB.js` mount order or bind insertion point.
- kdbControl history commits or `historyControls` UI.
- `header-history-text-execution-spec.md` implementation.
- Event catalog, rules, templates, legacy, `TEST/`.

---

## Section C. Expected file changes

Required:

```txt
_____________KDB3API/KDB3/js/core/services/collectReplayHandlers.js
_____________KDB3API/KDB3/js/dashboard/header/createHeaderController.js
_____________KDB3API/KDB3/js/dashboard/footer/createFooterController.js
```

Required new (minimal staging only; full history folder comes in owner specs):

```txt
_____________KDB3API/KDB3/js/dashboard/header/history/stageHeaderHistoryReplayHandler.js
_____________KDB3API/KDB3/js/dashboard/header/history/createHeaderHistoryReplayHandler.js
_____________KDB3API/KDB3/js/dashboard/footer/history/stageFooterHistoryReplayHandler.js
_____________KDB3API/KDB3/js/dashboard/footer/history/createFooterHistoryReplayHandler.js
```

`createHeaderHistoryReplayHandler` / `createFooterHistoryReplayHandler` in this tranche may delegate to stub `apply*` that returns `false` until owner chrome specs land. Staging and bind must still register keys when `apply` is a function.

Do not edit contracts, rules, templates, `KDB.js`, or unrelated modules in this execution.

---

## Section D. Required runtime flow

Unchanged root order (verify; do not modify unless regression proves bind runs before staging):

```txt
mountFeatureModules(_KDB)
  _KDB.api.header.mount({})
    stage _KDB.runtime.header.historyReplayHandlerContribution
  _KDB.api.footer.mount({})
    stage _KDB.runtime.footer.historyReplayHandlerContribution
  _KDB.api.kdbControl.mount({})
    stage _KDB.runtime.kdbControl.historyReplayHandlerContribution
  _orchestratorServices(_KDB, { bindHistoryReplayHandlersOnly: true })
    collectReplayHandlers(_KDB) -> late-bind via history runtime adapter
  _KDB.api.historyControls.mount({})
```

`collectReplayHandlers` output shape when all owners staged:

```js
{
  kdbControl_settingsChange: <contribution>,
  header_chromeChange: <same header contribution>,
  header_textChange: <same header contribution>,
  footer_chromeChange: <footer contribution>
}
```

Include each key only when `contribution && typeof contribution.apply === "function"`.

---

## Section E. Per-file specification

### `core/services/collectReplayHandlers.js`

- **Role:** assemble replay handler map for late bind.
- **Lines:** target under 50.
- **Required behavior:**
  - Read `_KDB.runtime.kdbControl.historyReplayHandlerContribution` → `kdbControl_settingsChange`.
  - Read `_KDB.runtime.header.historyReplayHandlerContribution` → assign **both** `header_chromeChange` and `header_textChange` to the same object when `apply` exists.
  - Read `_KDB.runtime.footer.historyReplayHandlerContribution` → `footer_chromeChange`.
  - Return `{}` for missing contributions; do not throw.
- **Rules:** `amd.mdc`, `state.mdc` (no state writes), `module-public-api.mdc`.
- **Forbidden:** imports from `dashboard/header/*`, `dashboard/footer/*`, `dashboard/canvas/kdbControl/*`.

### `dashboard/header/history/stageHeaderHistoryReplayHandler.js`

- **Role:** stage header handler on runtime after mount.
- **Behavior:** mirror `stageKdbControlHistoryReplayHandler.js`; require `_KDB.runtime.header`; set `historyReplayHandlerContribution`; return handler or null.

### `dashboard/header/history/createHeaderHistoryReplayHandler.js`

- **Role:** factory `{ apply(_KDB, targetValue, step, context) }`.
- **Behavior (bootstrap tranche minimum):**
  - `apply` must exist so bind registers keys.
  - Branch on `step.key` and/or `targetValue.target`.
  - Until `header-history-chrome-execution-spec` is complete, may return `false` for all applies (stub).
  - Must not import `historyService` replay files.

### `dashboard/header/createHeaderController.js`

- **Role:** wire staging into lifecycle.
- **Required changes:**
  - In `mount()`, after `resolveHeaderMountTarget` / before or after initial `_headerEffects` mount sync, call `_stageHeaderHistoryReplayHandler(_KDB, …)` with whatever apply delegate the chrome spec requires (stub apply acceptable in bootstrap-only pass).
  - In `destroy()`, null `historyReplayHandlerContribution` on `_KDB.runtime.header` (preserve existing DOM/listener cleanup).
- **Lines:** keep edit minimal; file may be near limit — no business logic in controller.

### `dashboard/footer/history/stageFooterHistoryReplayHandler.js`

- **Role:** stage footer handler on runtime after mount.
- **Behavior:** mirror kdbControl/header staging pattern on `_KDB.runtime.footer`.

### `dashboard/footer/history/createFooterHistoryReplayHandler.js`

- **Role:** factory `{ apply(...) }` delegating to `applyFooterHistoryReplay` (stub `false` ok until footer chrome spec).

### `dashboard/footer/createFooterController.js`

- **Role:** wire staging into lifecycle.
- **Required changes:**
  - In `mount()`, after runtime/footer setup and before or after initial `_footerEffects`, call `_stageFooterHistoryReplayHandler(_KDB, …)`.
  - In `destroy()`, null `historyReplayHandlerContribution` on `_KDB.runtime.footer`.
- **Do not** add history push in `onHeaderConfirmed` bootstrap hide path.

---

## Section F. Acceptance Criteria

1. `collectReplayHandlers()` returns all four keys when contributions are staged and `apply` is a function.
2. Existing `kdbControl_settingsChange` behavior unchanged.
3. `header.mount()` stages `historyReplayHandlerContribution` before `bindHistoryReplayHandlersOnly`.
4. `footer.mount()` stages contribution before bind.
5. `header.destroy()` and `footer.destroy()` clear contributions.
6. No `historyService` file imports dashboard modules.
7. No public `registerHistoryHandler` on any API.
8. No `_KDB.history`.
9. `KDB.js` unchanged unless CP-2 documents a required regression fix.
10. AMD dependency arrays aligned with factory parameters.
11. `ReadLints` clean on touched files.

---

## Section G. Forbidden Actions

- Do not implement chrome/text commit or full replay apply in this tranche (beyond stub `apply` for bind registration).
- Do not edit `historyService/createHistoryService.js` public surface.
- Do not push history steps from kdbControl for header/footer toggles.
- Do not add `_KDB.history` or public bind methods on `_KDB.services.history`.
- Do not import header/footer modules from `historyService`.
- Do not edit contracts, rules, templates, legacy, `TEST/`, event catalog.

---

## Section H. Verification Hints

```txt
Inspect KDB.js -> header.mount, footer.mount, kdbControl.mount, bindHistoryReplayHandlersOnly (read-only).
Search collectReplayHandlers -> header_chromeChange, header_textChange, footer_chromeChange.
Search registerHistoryHandler -> no matches.
grep historyReplayHandlerContribution in header/footer mount and destroy.
```

---

## Section I. Reporting Template

1. Pre-flight echo (15 items).
2. File checklist with line counts.
3. Handler map keys returned by `collectReplayHandlers` after full mount+bind.
4. Confirm `KDB.js` unchanged (yes/no).
5. Staging cleanup on destroy (header/footer).
6. ReadLints result.
7. Forbidden search results.
8. Deviations or open questions.
