# Execution Spec: widget bind one tab when global empty

> Mechanical spec for Grok 4.6. Architecture lives in `dienststelle-widget-bind-tab-scope-contractdelta.md`. Do not re-decide A+B, C, chip, or no-arg flatten.
> One writer. Exclusive allowlist. Echo every Section A row **before** producing files.

---

**Status:** `Implemented` — contract+spec review ACCEPT; probe `dienststelle-state` confirms union.
**Module / contract:** `dienststelle.md` + `widgetVis.md` + this delta
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-10-16

---

## Exclusive allowlist (one writer)

**May create:**

- `KDB3/js/dashboard/filters/dienststelle/effects/resolvePlannerPageScopeId.js`
- `KDB3/js/dashboard/filters/dienststelle/effects/pickPageContextScopeMap.js`

**May edit:**

- `KDB3/js/dashboard/filters/dienststelle/effects/readCurrentHierarchySnapshot.js`
- `KDB3/js/dashboard/filters/dienststelle/createDienststelleController.js`
- `KDB3/js/dashboard/filters/dienststelle/effects/buildVisualizationWidgetDienststellePayload.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/gates/dienststelleGate.js`
- `contracts/dienststelle.md` (delta §3 dienststelle inserts only)
- `contracts/widgetVis.md` (delta §3 widgetVis insert only)
- the delta + this spec (status → `Implemented` after code lands)

**Must not edit:** `applyDienststelleDefault.js`; walk/reconcile host; `uniqueAlignedUseDisplayValues.js` (reuse only); `notifyVisualizationWidgetDienststelleChanged.js`; `handleDienststelleChanged.js`; `addOrReplaceLocalFilter.js`; `widgetBindingPlan/**`; `widgetBindingApply/**`; `assembleDrillthroughSpec.js`; `assembleDatapointDrillthroughSpec.js`; chip/sanitize view; `KDB.js`; git.

**Must not create:** `helpers/` / `common/` / `shared/`; a second unique; tab-id on `vis.byId`; paintChip.

---

## Section A. Pre-flight read list

1. `kdb-object.mdc` — `_KDB` via argument; no new namespace.
2. `state.mdc` — do not rewrite `pageContextValuesByScope`; scoped read is a snapshot transform.
3. `runtime.mdc` — no new runtime bucket.
4. `module-public-api.mdc` — no new `_KDB.api.dienststelle` method. Optional `_options` on existing `getCurrentHierarchySnapshot`.
5. `events.mdc` — no new events.
6. `feature-structure.mdc` — JS ≤150. Live `readCurrentHierarchySnapshot` fn is already 66: **must not grow**; do not force ≤60 on that existing function.
7. `naming.mdc` — English files; `_` on boundary params.
8. `error-handling.mdc` — named export try/catch + `console.error` + rethrow unless a true one-liner.
9. `dom.mdc` — no DOM.
10. `amd.mdc` — one `define`; factory-scope; no nested subfunctions; no ESM.
11. `cognos-adapter.mdc` — no `_KDB.cognosAPI` / new facet.
12. The approved delta.
13. This spec.
14. Live files in Section C (read, then patch).

---

## Section B. Folder tree

```
KDB3/js/dashboard/filters/dienststelle/effects/
  resolvePlannerPageScopeId.js          (new)
  pickPageContextScopeMap.js            (new)
  readCurrentHierarchySnapshot.js       (edit)
  buildVisualizationWidgetDienststellePayload.js  (edit)
KDB3/js/dashboard/filters/dienststelle/
  createDienststelleController.js       (edit)
KDB3/js/dashboard/widgets/widgetVis/effects/gates/
  dienststelleGate.js                   (edit)
```

---

## Section C. Per-file specifications

#### `resolvePlannerPageScopeId.js`

- **Role:** `__controller(_KDB, _pageScopeId)` → raw host scope string or `null`.
- **Lines:** ≤50 (hard 60).
- **AMD:** `define(["./lookupDienststelleFilterRef.js", "../../../tabs/state/selectors.js"], …)` as `_lookup`, `_tabsSelectors`. Call `_lookup.resolveRawPageContextScope`.
- **Behavior:**
  1. If `_pageScopeId` is `null` / `""` / `"global"` → `null` (callers must coerce S1 `"global"` to `"active"` **before** this function).
  2. If `_pageScopeId === "active"` → `_tabsSelectors.readActiveTabId(_KDB)`; if missing → `null`.
  3. Else treat as canonical/tab id.
  4. `activeFilterKey` from `_KDB.state.filters.dienststelle.activeFilterKey` (read only).
  5. Return `_lookup.resolveRawPageContextScope(_KDB, activeFilterKey, canonical)`. If that string is empty, return `null`. Map-miss is decided by `pickPageContextScopeMap`, not by treating a canonical leftover as a hit.
- **try/catch:** `console.error("[dienststelle.resolvePlannerPageScopeId] failed", error); throw error;`
- **Rules:** `amd.mdc`; `naming.mdc`; `error-handling.mdc`; `state.mdc` (read only).

#### `pickPageContextScopeMap.js`

- **Role:** `__controller(_KDB, _pageContextValuesByScope, _pageScopeId)` → object map for `collectPageContextUseValues`.
- **Lines:** ≤40 (hard 60). try/catch + `console.error("[dienststelle.pickPageContextScopeMap] failed", error); throw error;`
- **Behavior:**
  1. `map` = `_pageContextValuesByScope` if it is a non-null object, else `{}`.
  2. If `_pageScopeId` is `null` / `undefined` / `""` → return `map` (full flatten input).
  3. `raw = resolvePlannerPageScopeId(_KDB, _pageScopeId)`.
  4. If `!raw` or `!Object.prototype.hasOwnProperty.call(map, raw)` → return `{}`.
  5. Else `out = {}; out[raw] = map[raw]; return out;` — no nested IIFE, no computed-key object literal if that forces a nested function.
- **Rules:** `amd.mdc`; `naming.mdc`; `error-handling.mdc`.

#### `readCurrentHierarchySnapshot.js`

- **Signature:** `readCurrentHierarchySnapshot(_KDB, _options)`. Guard `_options = _options || {}`.
- **AMD:** add `./pickPageContextScopeMap.js` as `_pickPageContextScopeMap` only. `pickPageContextScopeMap.js` AMD-imports `./resolvePlannerPageScopeId.js`.
- **Empty-dominant block (live `:105-110`):** replace the raw `collectPageContextUseValues(resolution.pageContextValuesByScope)` with `collectPageContextUseValues(_pickPageContextScopeMap(_KDB, resolution.pageContextValuesByScope, _options.pageScopeId))`.
- When `_options.pageScopeId` is omitted, pick returns the full map → today’s flatten + unique.
- When it is set and the key misses: pick returns `{}` → empty collect. **Never** concat all scopes.
- S3 unchanged: pick is only reached when rewritten global `dominantValues` is empty.
- File ≤150. Live `readCurrentHierarchySnapshot` function is **66 lines — must not grow**. Do not extract further to chase ≤60. `_options` guard must replace an existing line or stay inside the existing `try` without adding a net line if that would grow the function; prefer `_options = _options || {}` on the same line as the first `var` if needed.
- Existing try/catch stays.

#### `createDienststelleController.js`

- `getCurrentHierarchySnapshot(_controller, _options)` passes `_options` through. No other controller edits.

#### `buildVisualizationWidgetDienststellePayload.js`

- Replace the unscoped `readCurrentHierarchySnapshot(_KDB)` with a **coerced** scope:
  - `pageScopeId = "active"` when `!handoff`, or `handoff.filterScope === "global"`, or `handoff.scopeType === "global"`, or `handoff.scopeId` is `null` / `""` / `"global"`.
  - else `pageScopeId = String(handoff.scopeId)` (pageContext tab id).
  - then `readCurrentHierarchySnapshot(_KDB, { pageScopeId: pageScopeId })`.
- Do **not** pass `"global"` into the resolver. S1 widget notify must still get flatten-of-active-tab default `[X]`, not an empty miss.
- Do **not** change `readEffectiveSelection` this wave.
- File ≤150. Inline the coerce; no new AMD file.

#### `dienststelleGate.js`

- In `readConfirmedHierarchy`, the API fallback becomes `api.getCurrentHierarchySnapshot({ pageScopeId: "active" })`.
- Do not import tabs. Do not change waiter / timeout logic.
- File already large; **one argument only**.

#### Parent contracts

Land **exactly** delta §3. No other parent edits.

---

## Section D. Done when

- Tab OK Y after S1: notify payload snap `dominantValues` / `downstreamValues` length 1 (`Y`), not `[X,Y]`.
- S1 global OK (`handoff.scopeId === "global"`): payload uses `"active"`, not miss-empty; active-tab default `[X]` once.
- Gate fallback on active tab: same one-tab set.
- No-arg public snap still flatten unique (S1 five X → `[X]`).
- Resolve miss: empty arrays, not flatten.
- Writer report: Section A echoes + files + the payload call and the gate call quoted.

---

## Section E. Forbidden extras

- Tab-filtered `vis.byId` fan-out.
- Chip / sanitize edits.
- Scoping `getCurrentHierarchySnapshot()` no-arg.
- Unique after metrics rewrite as a second pass.
- Git commit / push.
