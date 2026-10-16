# Execution Spec: Dienststelle empty OK toast (WP2)

> Mechanical spec for Grok 4.6. Architecture lives in `dienststelle-empty-ok-toast-contractdelta.md` (**Approved**, PO vastenburg 2026-09-08). Do **not** re-decide toast site, `_filterName`, skip set, one-vs-N, file split, severity, after-apply, or `notifyAnchored`.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo every row in Section A **before** producing files.

---

**Status:** `Reviewed` — Cognos green 2026-09-08.  
**Module / contract:** `contracts/dienststelle.md` + `contracts/dienststelle-empty-ok-toast-contractdelta.md`  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-08  
**Executing AI:** grok 4.6 army  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist (one writer)

**May create:**

- `KDB3/js/dashboard/filters/dienststelle/config/dienststelleLabels.js`
- `KDB3/js/dashboard/filters/dienststelle/effects/notifyDienststelleEmptyOk.js`

**May edit:**

- `KDB3/js/dashboard/filters/dienststelle/__orchestratorDienststelle.js` (labels merge + AMD 3→4 only)
- `KDB3/js/dashboard/filters/dienststelle/effects/walkDienststellePageContextScopes.js` (`walkPageScopes` return `{ appliedCount }` only)
- `KDB3/js/dashboard/filters/dienststelle/effects/reconcileDienststelleHostScopes.js` (userCommit `.then` + AMD 6→7 only)

**Must not edit:** `applyDienststelleDefault.js`; `routeDienststelleDispatch.js`; `createDienststelleController.js`; `reconcileConfirmedDienststelle.js`; `resolveDienststelleReconcileMode.js`; `resolveScopedDienststelleFilterDom.js`; `KDB.js`; `writeback/set/effects/notifyRestoreOutcome.js`; `dienststelle/actions/parameterSet/**`; specialSingleSelect; `createMessageService.js`; Glass internals; `warnSettingsMessage.js`; parent `dienststelle.md` / `messageService.md` (captain after Cognos green); `.cursor/rules/*.mdc`; git.

**Must not create:** `helpers/` / `common/` / `shared/`; a second notify wrapper; cascade/suppress flags; runtime `domRefs` filter-block key.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` via argument; labels under `_KDB.config.labels.de.*`; no new top-level namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — this WP does not write `_KDB.state.filters.dienststelle`; defaulting stays the existing applier.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no new runtime bucket; do not stash a filter-block on `runtime.dienststelle.domRefs`; do not read `runtime.filterDock`.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new `_KDB.api.dienststelle` method; no new `messageService` method.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150; orch ≤120; AMD >10 requires split; do not grow route/controller/reconcileConfirmed.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files; German UI only under `labels.de.dienststelle`; `_` on boundary params.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on the notify helper; missing messageService → `console.warn`; do not rethrow into reconcile.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no new `document.querySelector` in the notify file; call existing `findScopedFilterWrapper`; no `runtime.filterDock`.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; factory-scope named helpers; no new nested subfunctions; no ES modules.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle terms.
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` / `__getDashboardAPI`; no new facet.
13. `_____________KDB3API/contracts/dienststelle-empty-ok-toast-contractdelta.md` — Approved WP2 law (userCommit after walk, `appliedCount`, `info`, `notifyAnchored` 5000ms, display Dienststelle).
14. This execution spec.

---

## Section B. Folder tree (create / edit order)

```
KDB3/js/dashboard/filters/dienststelle/
  config/dienststelleLabels.js                         (new)
  effects/notifyDienststelleEmptyOk.js                 (new)
  __orchestratorDienststelle.js                        (edit)
  effects/walkDienststellePageContextScopes.js         (edit)
  effects/reconcileDienststelleHostScopes.js           (edit)
```

No new folders.

---

## Section C. Per-file specifications

#### `KDB3/js/dashboard/filters/dienststelle/config/dienststelleLabels.js`

- **Role:** declarative DE labels (config)
- **Lines:** target 16 (hard 40)
- **AMD imports:** none (`define([], ...)`)
- **Factory parameters:** none
- **Factory-scope named helpers:** none
- **Entry:** none. Factory body: `"use strict";` then `return { … }`.
- **Return value:** object literal with **exactly one** key:

```js
{
  emptyOkDefaultRequired: "Für den {filterName}-Filter ist mindestens eine Auswahl erforderlich. Ohne Auswahl wird automatisch der voreingestellte Standardwert für die (aktuellen) Reiter gesetzt."
}
```

- Exact DE template (delta lock 3). Placeholder is `{filterName}` (not a JS template). No other keys. No functions.
- **Rules to apply:**
  - `amd.mdc` — one `define([]);` config export; no nested functions.
  - `naming.mdc` — English key `emptyOkDefaultRequired`; German value is UI copy.
  - `feature-structure.mdc` — `config/` folder; scannable.
  - `kdb-object.mdc` — merged into `_KDB.config.labels.de.dienststelle` by the orchestrator.

---

#### `KDB3/js/dashboard/filters/dienststelle/effects/notifyDienststelleEmptyOk.js`

- **Role:** effect helper (toast overlay)
- **Lines:** target 90–120 (hard 150)
- **AMD imports** (literal order):
  1. `"../view/resolveScopedDienststelleFilterDom.js"`
- **Factory parameters:** `_scopedDom`
- **Factory-scope named helpers** (never inside `__controller`):
  - `function readTemplate(_KDB)` — `labels = _KDB.config && _KDB.config.labels && _KDB.config.labels.de && _KDB.config.labels.de.dienststelle`; return `labels && labels.emptyOkDefaultRequired` as string or `""`.
  - `function interpolateFilterName(_template, _filterName)` — `split("{filterName}").join(String(_filterName))`.
  - `function readConnectedWrapper(_activeFilterKey, _filterScope)` — `wrapper = _scopedDom.findScopedFilterWrapper(_activeFilterKey, _filterScope)`; return `wrapper` only if `wrapper && wrapper.isConnected === true`; else `null`.
  - `function notifyMessage(_KDB, _message, _wrapper)` — `svc = _KDB.services && _KDB.services.message`; if missing → `console.warn("[dienststelle.notifyDienststelleEmptyOk] messageService missing")`; return. Inline the payload object (do **not** invent `dedupeKey` / `align` / `offset` / `title`). If `_wrapper` and `typeof svc.notifyAnchored === "function"` → `svc.notifyAnchored({ anchor: _wrapper, code: "DIENSTSTELLE_EMPTY_OK_DEFAULT", message: _message, severity: "info", durationMs: 15000 })`. Else if `typeof svc.notify === "function"` → `svc.notify({ code: "DIENSTSTELLE_EMPTY_OK_DEFAULT", message: _message, severity: "info" })`. Else same `console.warn`. Do **not** inner-try/catch around notify (service already falls back). Do **not** pass `document.body`. Do **not** import labels.
- **Entry function:**
  - Name: `__controller`
  - Parameters: `_KDB`, `_options`
  - Body steps:
    1. `try` / `catch`: on catch `console.error("[dienststelle.notifyDienststelleEmptyOk]", err)`; **return** (do not rethrow).
    2. `options = _options || {}`.
    3. `appliedCount = options.appliedCount` (**not** `_options.appliedCount`). If `typeof appliedCount !== "number" || appliedCount < 1` → return.
    4. If `options.commitFromUser !== true` → return.
    5. If `options.isHistoryReplay === true` → return. Do **not** skip on `isUserClearCommit` / `commitSourceWasClear` (empty OK without Clear still toasts on write).
    6. `template = readTemplate(_KDB)`. If `!template` → `console.warn("[dienststelle.notifyDienststelleEmptyOk] missing label")`; return.
    7. Trim `options.visibleFilterLabel` if it is a string; `filterName` = that non-empty result, else `"Dienststelle"`. Interpolate the **trimmed** name.
    8. `notifyMessage(_KDB, interpolateFilterName(template, filterName), readConnectedWrapper(options.activeFilterKey, options.filterScope))`.
- **Entry return value:** `undefined` (fire-and-forget).
- **AMD factory return:** `return __controller;` (hostScopes factory param is this function).
- **Rules to apply:**
  - `amd.mdc` — one `define`; helpers at factory scope; no nested functions in `__controller`.
  - `naming.mdc` — `_` on `_KDB` / `_options`; DE only via labels + `"Dienststelle"` fallback for the **placeholder**, not a second sentence.
  - `feature-structure.mdc` — `effects/`; ≤150.
  - `error-handling.mdc` — try/catch; fail-closed; no throw into reconcile.
  - `dom.mdc` — only `findScopedFilterWrapper`; no new `document.querySelector`; no `runtime.filterDock`.
  - `module-public-api.mdc` — existing `notify` / `notifyAnchored` only.
  - `cognos-adapter.mdc` — no Cognos calls.

---

#### `KDB3/js/dashboard/filters/dienststelle/__orchestratorDienststelle.js`

- **Role:** module orchestrator (edit)
- **Lines:** stay under orch 120 (63 today).
- **AMD imports:** existing three, then `"./config/dienststelleLabels.js"` (AMD **3→4**). Keep existing `.js` suffixes. Do **not** rename `__orchestrator`.
- **Factory parameters:** existing three, then `_dienststelleLabels`.
- **Edit only:** inside `__orchestrator`, after `_KDB.runtime.dienststelle.tabsFacet = ...` and **before** `stageDienststelleHistoryReplayHandler`, add:

```js
try {
  _KDB.config = _KDB.config || {};
  _KDB.config.labels = _KDB.config.labels || {};
  _KDB.config.labels.de = _KDB.config.labels.de || {};
  _KDB.config.labels.de.dienststelle = Object.assign({}, _dienststelleLabels, _KDB.config.labels.de.dienststelle || {});
} catch (err) {
  console.error("[dienststelle.orchestrator] labels merge failed", err);
}
```

- Existing keys win. Do not wrap the rest of `__orchestrator` in a new try/catch. Do not change controller create / api registration.
- **Rules to apply:**
  - `amd.mdc` — AMD 4; one `define`.
  - `feature-structure.mdc` — thin orch; no toast logic here.
  - `kdb-object.mdc` — labels under `_KDB.config.labels.de.dienststelle`.
  - `error-handling.mdc` — try/catch on the new merge only.

---

#### `KDB3/js/dashboard/filters/dienststelle/effects/walkDienststellePageContextScopes.js`

- **Role:** effects helper (edit)
- **Lines:** 90 → target ≤110 (hard 150)
- **AMD:** **stays 5**. Do **not** import `notifyDienststelleEmptyOk.js`.
- **Exports:** still `{ walkPageScopes, observePageValue, defaultScope }` only.
- **`defaultScope`:** **unchanged** return (Promise of applied default object or `null`). Startup in hostScopes uses `appliedDefault || _globalValue`.
- **`walkPageScopes` only:**
  1. After `existingByScope` / `targetScopes` locals, add `var appliedCount = 0;`.
  2. In the **existing** `defaultScope(...).then(function (appliedDefault) { ... })`, if `appliedDefault` is truthy: keep writing `_pageContextValuesByScope[currentScopeId] = [appliedDefault];` **and** `appliedCount += 1`.
  3. Change the function return from `return scopeApplySteps;` to `return scopeApplySteps.then(function () { return { appliedCount: appliedCount }; });`.
  4. Do **not** add another nested IIFE (the existing `currentScopeId` IIFE stays).
  5. Empty `targetScopes`: **no** sync early `return { appliedCount: 0 }` (would break `.then`). Keep the existing `existingByScope` observe loop. The wrap in step 3 already yields a Promise of `{ appliedCount: 0 }`.
- **Rules to apply:**
  - `amd.mdc` — do not add nested named functions; do not add AMD.
  - `feature-structure.mdc` — ≤150.
  - `state.mdc` — no extra state writes; `DEFAULT_APPLIED` dispatch stays inside `defaultScope`.
  - `error-handling.mdc` — do not add a new try/catch around the whole walk.

---

#### `KDB3/js/dashboard/filters/dienststelle/effects/reconcileDienststelleHostScopes.js`

- **Role:** effects controller (edit)
- **Lines:** 98 → target ≤120 (hard 150)
- **AMD imports:** existing six, then `"./notifyDienststelleEmptyOk.js"` (AMD **6→7**). Smell, allowed (<10).
- **Factory parameters:** existing six, then `_notifyDienststelleEmptyOk`.
- **Edit only `runUserConfirmAfterHostRead`**, the `mode === "userCommit"` `walkPageScopes(...).then`:

**Today:**

```js
.then(function () {
  return _scopeDispatch.finishReconcile(_dispatchInternal, _definition, _context, _label, finishGlobalValue, pageContextValuesByScope);
});
```

**Locked:**

```js
.then(function (walkResult) {
  var appliedCount = walkResult && walkResult.appliedCount;
  _notifyDienststelleEmptyOk(_KDB, {
    appliedCount: appliedCount,
    commitFromUser: true,
    isHistoryReplay: _context.isHistoryReplay === true,
    activeFilterKey: _activeFilterKey,
    visibleFilterLabel: _label,
    filterScope: commitSourceScope
  });
  return _scopeDispatch.finishReconcile(_dispatchInternal, _definition, _context, _label, finishGlobalValue, pageContextValuesByScope);
});
```

- `commitSourceScope` is already in that branch. Do **not** call the helper on the `"sync"` walk `.then` or on `continueAfterGlobalRead` startup/`defaultScope` paths (those stay `.then(function () {`).
- Do **not** add a Clear-intent skip (`isUserClearCommit` / `commitSourceWasClear`) on this call. Empty OK without Clear still toasts if `appliedCount > 0`.
- Do **not** change `USER_COMMIT_DEFAULT_DELAY_MS`.
- Do **not** add try/catch around `finishReconcile` (helper already fail-closes).
- **Rules to apply:**
  - `amd.mdc` — AMD 7; no nested functions beyond the existing `.then` callbacks.
  - `feature-structure.mdc` — ≤150.
  - `module-public-api.mdc` — helper is AMD-imported, not a new api method.
  - `error-handling.mdc` — helper owns toast errors; reconcile continues to `finishReconcile`.
  - `cognos-adapter.mdc` — no new Cognos.

---

## Section D. Reducer behavior table

No reducer change this WP. Do not edit `createDienststelleReducer.js`.

---

## Section E. Published selectors

No change.

---

## Section F. Public API wiring

- Surface: `_KDB.api.dienststelle` **unchanged**.
- `_KDB.config.labels.de.dienststelle.emptyOkDefaultRequired` added via orch merge.
- No new `_KDB.runtime.dienststelle` keys.

---

## Section G–I. Harness

None. Do not write harness HTML/JS.

---

## Section J. Acceptance criteria (self-verification before reporting back)

1. Every allowlisted file exists / was edited as specified.
2. Every file matches Section C, including `Rules to apply`.
3. Full-compact AMD `define([...], function (...) { ... })`.
4. No file exceeds its line limit. Route / controller / `reconcileConfirmed` / `applyDienststelleDefault` **untouched**.
5. No new nested subfunctions in the notify helper. Walk keeps its existing `currentScopeId` IIFE only.
6. Notify helper does not `document.querySelector` and does not read `runtime.filterDock`.
7. No forbidden tree / files from the allowlist.
8. `defaultScope` return shape unchanged.
9. Helper try/catch does not rethrow.
10. Labels: exactly one key; `{filterName}` placeholder; orch existing keys win.
11. Helper call **only** on userCommit walk `.then`.
12. Reporting back: checklist of paths, line counts, AMD counts, deviations, 14 echoed summaries.

---

## Section K. Forbidden actions

- Modify any `.mdc` under `_____________KDB3API/.cursor/rules/`.
- Modify `contracts/_template.md` or `_executionSpecTemplate.md`.
- Modify the Approved delta or parent `dienststelle.md` / `messageService.md`.
- Edit `applyDienststelleDefault.js` (including a “guarded” toast).
- Invent cascade/suppress flags.
- New `messageService` method; `_KDB.cognosAPI`; `__getDashboardAPI`.
- Folders `helpers` / `common` / `shared`.
- ES modules in `KDB3/js/**`.
- Commit / push / git config.
- Skip Section A echoes.
- Start WP6 / WP7 / SSS / wave-1 numbers.

---

## Section L. Reporting template (for the executing AI)

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **File checklist** — path, lines, AMD, matches spec | deviation.
3. **Deviations** — path, deviation, motivation, rule.
4. **Self-verification** — pass/fail per Section J.
5. **Open questions for reviewer** — only if the spec was silent.

---

## Section M. Reviewer handoff

1. Verify the 14 echoes.
2. Read every allowlisted file.
3. Confirm `applyDienststelleDefault.js` / route / controller / `reconcileConfirmed` git-clean.
4. Dual grok review: AMD, skip set, one toast, copy interpolation, no filterDock read.
5. PO Cognos: S1/S2 toast; S3/S6 silent; boot silent.
