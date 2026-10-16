# Contract Delta: planner snapshot unique `useValue`s

> Delta on `contracts/dienststelle.md` §6 `getCurrentHierarchySnapshot()` and §11.2 effective-set language.
> Live S1 still writes the same default onto every empty dashboard tab. The planner snapshot must not flatten that map into a bag of identical tokens.

---

**Status:** `Implemented`
**Parent:** `contracts/dienststelle.md` §6, §11.1 S1, §11.2, §12
**Related (read, do not amend):** `widgetVis.md` hierarchy bind, `widgetBindingPlan.md` `hierarchyKeepexclude`, `widgetBindingApply.md` local filter apply
**Type:** `feature-module contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-10-16
**PO lock:** unique the flattened planner list; do not change the multi-tab default walk; tab-targeted / active-tab-only widget writes are a later theme

---

## 0. Diagnosis

This is **(b) a contract clarification** of an already-stated “effective set”, plus **(a) live code that concatenates a bag**.

`dienststelle.md` §6 / §11.2 already say `getCurrentHierarchySnapshot()` `resolution.dominantValues` / `downstreamValues` are the **full effective set** (`0|N`, not first-only). They never say the flatten of `pageContextValuesByScope` must unique by `useValue`.

Live `readCurrentHierarchySnapshot.collectPageContextUseValues` concatenates every page-scope list with **no** unique. After S1 (global clear + OK, empty tabs), the walk stores the same default object on each dashboard tab. Global `dominantValues` is `[]`, so the snapshot falls through to that concat → `[X, X, X, X, X]`. `widgetVis` binds the snapshot, not `payload.selection`. `buildHierarchyFilter` + one `addOrReplaceLocalFilter` then write **one** Cognos `addFilter` whose `values` is that bag.

Host writes are correct: one default per empty tab, sequential, active Sicht variant only. Notify is once after the walk. That path stays.

## 1. Closed product decisions

| # | Lock |
|---|---|
| 1 | **Layer.** Unique belongs in the planner snapshot flatten (`readCurrentHierarchySnapshot` / `collectPageContextUseValues`). Not in `applyDienststelleDefault`, not in the tab walk, not in `finishReconcile`, not in `widgetBindingPlan`, not in `addOrReplaceLocalFilter`. |
| 2 | **Key.** Unique by extracted `useValue` string. First-seen order. `displayValues` stays index-aligned (keep the display that arrived with the first copy of that `useValue`). |
| 3 | **When.** Unique the flattened page-context list used when global `dominantValues` is empty. The stored `pageContextValuesByScope` map stays per-scope and **may** repeat the same member on five tabs. |
| 4 | **S1 host walk unchanged.** Global clear + OK still defaults every eligible empty dashboard tab. Global itself is not defaulted on that path. |
| 5 | **S2–S5 unchanged.** Different tabs with different members still flatten to the union, now unique. Same member on many tabs appears once. |
| 6 | **Downstream unchanged.** One `widgetVis/dienststelleChanged` broadcast, no `widgetId`, fan-out over `vis.byId`. `payload.selection` may stay first-member-only. Binding still uses `hierarchySnapshot`. |
| 7 | **Out of this wave.** Targeting widgets by tab. Writing only the currently active tab’s vis widgets. Hidden-canvas apply experiments. Changing default tables or BW/DEZPV targeting. |

## 2. Law

When `getCurrentHierarchySnapshot()` builds the planner effective set from `resolution.pageContextValuesByScope` (global dominant empty):

1. Walk scopes in `Object.keys` order.
2. Extract `useValue` / display per existing extractors.
3. Append a pair only if that `useValue` string has not been seen yet.
4. Metrics-source rewrite stays 1:1 on the unique list.
5. If `downstreamValues` is still empty, copy the unique `dominantValues` (same as today).

Empty flatten stays empty. `hasConfirmedSelection` stays “at least one unique `useValue`”.

`pageContextValuesByScope` in owner state / `SYNC_REQUESTED` is **not** unique’d. Per-tab identity stays.

## 3. Text to land in `dienststelle.md`

### §6 `getCurrentHierarchySnapshot()` rules — add after the cardinality bullet

> When the planner effective set is assembled from `pageContextValuesByScope` (global dominant empty), flatten then unique by `useValue`, first-seen order, `displayValues` lockstep. The per-scope map itself is not unique’d and may hold the same member on many tabs.

### §11.2 invariants — tighten the snapshot bullet

Existing:

> `resolution.dominantValues` / `downstreamValues` are the full effective set.

Replace with:

> When the planner effective set is assembled from `pageContextValuesByScope` (global dominant empty), `resolution.dominantValues` / `downstreamValues` are that flatten uniqued by `useValue`, first-seen order. A bag of identical tokens from N defaulted tabs is not an effective set. Owner-state / `SYNC_REQUESTED` maps are not unique’d. A non-empty global dominant set is unchanged (still the full 0|N member list, not first-only).

### §11.1 S1 — add one sentence inside the S1 table cell (do not change the host rule)

> After S1 host defaults, the planner snapshot contains that default `useValue` once, even when every empty tab received it. (Land this sentence **inside** the S1 table cell, not as a footnote.)

## 4. Files

| File | Change |
|---|---|
| `KDB3/js/dashboard/filters/dienststelle/effects/uniqueAlignedUseDisplayValues.js` | **New.** Pure unique of two aligned string arrays by first-seen `useValue`. |
| `KDB3/js/dashboard/filters/dienststelle/effects/readCurrentHierarchySnapshot.js` | After page-context concat, unique before metrics rewrite. File is 136 lines; extract rather than grow past 150. |
| `contracts/dienststelle.md` | Land §3 text only. |

**Must not edit:** `applyDienststelleDefault.js`, `walkDienststellePageContextScopes.js`, `reconcileDienststelleHostScopes.js`, `reconcileDienststelleScopeDispatch.js`, `buildVisualizationWidgetDienststellePayload.js`, `notifyVisualizationWidgetDienststelleChanged.js`, `widgetVis/**`, `widgetBindingPlan/**`, `widgetBindingApply/**`, `addOrReplaceLocalFilter.js`, `KDB.js`.

## 5. Acceptance

1. S1: five empty dashboard tabs get the same default on the host. Each vis widget that binds that snapshot has the option **once in `values`** (not “only one widget is targeted”; §12 fan-out stays).
2. Two tabs with different members and empty global: snapshot / local filter is the unique union, order first-seen by `Object.keys`.
3. Non-empty global still dominates; page flatten is not used.
4. Startup/Sicht that defaults **global** first still binds one dominant value (unchanged).
5. TEMP `[sicht-jahr] TEMP local filter` for a Dienststelle itemId must not list the same `u` five times after S1.

## 6. Non-goals

- Do not unique inside Cognos `addFilter` or `sanitizeWidgetDownstreamDisplayValues`.
- Do not change notify timing, 600 ms user defer, or broadcast set.
- Do not write contracts about tab-scoped widget apply in this wave.
