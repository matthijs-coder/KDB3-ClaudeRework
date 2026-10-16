# Execution Spec: planner snapshot unique `useValue`s

> Mechanical spec for Grok 4.6. Architecture lives in `dienststelle-snapshot-unique-usevalues-contractdelta.md`. Do not re-decide layer, unique key, S1 host walk, or tab-targeted widget apply.
> Production tree only: `_____________KDB3API/KDB3/js/**` plus the two contract files in the allowlist.
> One writer. Exclusive allowlist. Echo every row in Section A **before** producing files.

---

**Status:** `Implemented`
**Module / contract:** `contracts/dienststelle.md` + `contracts/dienststelle-snapshot-unique-usevalues-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-10-16
**Executing AI:** grok 4.6 writer (assigned after review green)
**Reviewer:** grok 4.6 review swarm + captain

---

## Exclusive allowlist (one writer)

**May create:**

- `KDB3/js/dashboard/filters/dienststelle/effects/uniqueAlignedUseDisplayValues.js`

**May edit:**

- `KDB3/js/dashboard/filters/dienststelle/effects/readCurrentHierarchySnapshot.js`
- `contracts/dienststelle.md` (only the three text inserts in delta §3)
- `contracts/dienststelle-snapshot-unique-usevalues-contractdelta.md` (status → `Implemented` after code lands)
- this spec (status → `Implemented` after code lands)

**Must not edit:** `applyDienststelleDefault.js`; `walkDienststellePageContextScopes.js`; `reconcileDienststelleHostScopes.js`; `reconcileDienststelleScopeDispatch.js`; `resolveDienststelleDefaultTargets.js`; `buildVisualizationWidgetDienststellePayload.js`; `notifyVisualizationWidgetDienststelleChanged.js`; `createDienststelleReducer.js`; `widgetVis/**`; `widgetBindingPlan/**`; `widgetBindingApply/**`; `addOrReplaceLocalFilter.js`; `sanitizeWidgetDownstreamDisplayValues.js`; `KDB.js`; `.cursor/rules/*.mdc`; git.

**Must not create:** `helpers/` / `common/` / `shared/`; a second unique in planner or apply; a tab-id on `vis.byId`; a notify-per-tab.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` via argument; no new top-level namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — do not rewrite `pageContextValuesByScope` in the reducer; unique is a snapshot read transform.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no new runtime bucket.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new `_KDB.api.dienststelle` method; `getCurrentHierarchySnapshot` shape unchanged except unique arrays.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150; controller function ≤60; AMD >10 requires split.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files; `_` on boundary params.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — `__controller` in `uniqueAlignedUseDisplayValues.js` is a named export with a loop, not a one-liner: local `try/catch`, `console.error` tag `[dienststelle.uniqueAlignedUseDisplayValues]`, rethrow. Keep the existing try/catch on `readCurrentHierarchySnapshot`.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no DOM.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; factory-scope named helpers; no nested subfunctions; no ES modules.
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` / `__getDashboardAPI`; no new facet.
12. `_____________KDB3API/contracts/dienststelle-snapshot-unique-usevalues-contractdelta.md` — layer + unique key + S1 host walk frozen.
13. This execution spec.
14. Live `readCurrentHierarchySnapshot.js` (read, then patch).
15. `_____________KDB3API/contracts/dienststelle.md` — land only delta §3: §6 snapshot rule; S1 extra sentence **inside the table cell at the S1 row** (current `:589`, do not add a footnote); §11.2 snapshot bullet as gated in the delta.

---

## Section B. Folder tree

```
KDB3/js/dashboard/filters/dienststelle/effects/
  uniqueAlignedUseDisplayValues.js   (new)
  readCurrentHierarchySnapshot.js    (edit)
contracts/
  dienststelle.md                    (edit §6 / §11.1 S1 / §11.2 only)
```

No new folders.

---

## Section C. Per-file specifications

#### `KDB3/js/dashboard/filters/dienststelle/effects/uniqueAlignedUseDisplayValues.js`

- **Role:** named `__controller` unique of two aligned string arrays.
- **Lines:** target ≤40 (hard 60).
- **AMD:** `define([], function () { ... return __controller; })`.
- **Signature:** `__controller(_useValues, _displayValues)` → `{ useValues, displayValues }`.
- **Behavior:**
  1. Treat non-arrays as `[]`.
  2. Walk `_useValues` by index.
  3. For each entry, if `null` / `undefined`, skip. Else `token = String(entry).trim()`. Skip if `token === ""`.
  4. First-seen `token` wins (seen-key **and** pushed `useValues` entry are that same trimmed string). Later copies dropped.
  5. For a kept index `i`, `display = _displayValues[i]`; if `display` is a non-empty string after `String(display).trim()`, push that trimmed display; else push `token`.
  6. Do not sort. Do not rewrite metrics tokens. Do not read `_KDB`.
- **try/catch:** wrap the body of `__controller`. On catch: `console.error("[dienststelle.uniqueAlignedUseDisplayValues] failed", error); throw error;`.
- **Rules to apply:** `amd.mdc`; `naming.mdc` (`__controller`, `_` on both params); `error-handling.mdc` (try/catch as above); `feature-structure.mdc` (≤60).
- **Forbidden:** mutating the input arrays; unique by display; `Set` iteration order tricks that drop alignment.

#### `KDB3/js/dashboard/filters/dienststelle/effects/readCurrentHierarchySnapshot.js`

- **Role:** planner snapshot reader (existing).
- **AMD:** add `"./uniqueAlignedUseDisplayValues.js"` as `_uniqueAligned`.
- **Change (only this):** inside `collectPageContextUseValues`, after the existing concat loops, return `_uniqueAligned(out, displayOut)` instead of the raw `{ useValues: out, displayValues: displayOut }`.
- Do **not** unique `resolution.dominantValues` when that array is already non-empty (global dominates).
- Do **not** unique `pageContextValuesByScope` on state.
- Do **not** move extractors.
- File must stay ≤150 lines. `__controller` of this file is `readCurrentHierarchySnapshot` — do not grow it. The collect helper may stay factory-scope.
- **Rules:** `amd.mdc` (full-compact `define`); `naming.mdc`; existing `console.error` + rethrow stays.

#### `contracts/dienststelle.md`

Land **exactly** the three inserts in delta §3. S1 sentence goes **inside** the existing S1 table cell (`dienststelle.md` S1 row, currently `:589`), not as a footnote under the table. No other parent edits. Do not rewrite S2–S5.

---

## Section D. Done when

- After S1-shaped state (`dominantValues: []`, five page scopes each `[{ useValue: "X", displayValue: "X" }]`), `readCurrentHierarchySnapshot` returns `resolution.dominantValues === ["X"]` (after metrics rewrite, still one token) and `downstreamValues` is that same one-element list.
- `pageContextValuesByScope` on state still has five keys.
- No widget / apply / default-walk file changed.
- Writer report: one sentence per Section A row, then the two JS diffs in words.

---

## Section E. Forbidden “helpful” extras

- Dedupe in `buildHierarchyFilter` or `sanitizeWidgetDownstreamDisplayValues`.
- Changing `Object.keys` order to numeric tab sort.
- Unique after metrics rewrite as a second pass (rewrite is 1:1; first unique is enough).
- Touching notify / 600 ms / broadcast.
- Git commit / push.
