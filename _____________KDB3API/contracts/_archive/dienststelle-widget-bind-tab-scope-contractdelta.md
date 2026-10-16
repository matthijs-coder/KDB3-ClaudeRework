# Contract Delta: widget bind uses one tab when global is empty

> Delta on `contracts/dienststelle.md` §6 / §12 and `contracts/widgetVis.md` `dienststelleChanged` bind.
> Live unique-flatten stays on the **no-arg** public snapshot (S1 `[X]` once; drillthrough). Widget bind after a tab OK must not be the union of other tabs’ defaults.

---

**Status:** `Implemented` — review ACCEPT; probe confirms union `[ZEB]+[ALLE]`.
**Parents:** `dienststelle.md` §6 `getCurrentHierarchySnapshot()`, §11.2, §12; `widgetVis.md` `widgetVis/dienststelleChanged`
**Related (do not amend):** `widgetBindingPlan.md`, `widgetBindingApply.md`, unique-flatten delta
**Type:** `feature-module contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-10-16
**Army lock:** A+B. C (tab-targeted fan-out) and chip paint are out. B-alone dies on later unscoped binds. Payload without handoff must still scope to the active tab.

---

## 0. Diagnosis

**(a)** Live widget bind uses `hierarchySnapshot` from an **unscoped** flatten of `pageContextValuesByScope`. After S1, other tabs still hold default X. Tab OK sets this tab to Y. Unique flatten → `[X,Y]`. One `addFilter` writes both. Apply does not merge.

**(b)** Parent “effective set” is the flatten for the **public** snapshot. It never said widget bind after a pageContext confirm is that union.

Chip display staying X is **unproven** (Cognos vs sanitize vs wrapper). Not this wave.

## 1. Closed product decisions

| # | Lock |
|---|---|
| 1 | **No-arg** `getCurrentHierarchySnapshot()` stays flatten + unique. Drillthrough keeps calling no-arg. |
| 2 | Same method accepts optional `{ pageScopeId }`. `"active"` or a tab/legacy id. Dienststelle resolves via `resolveRawPageContextScope`. WidgetVis does **not** import tabs selectors. |
| 3 | **Empty-global only.** Non-empty global dominant is unchanged (S3). Scoped collect is not used. |
| 4 | **Resolve miss → empty values, never flatten.** Do not fall back to the union. |
| 5 | **B — payload.** `widgetVis/dienststelleChanged` `hierarchySnapshot` is scoped whenever global is empty. `pageScopeId` is the confirming **tab** only when handoff is pageContext and `scopeId` is a non-empty, non-`"global"` id. Otherwise `"active"`. S1/global OK handoff `scopeId` is `"global"` — do **not** pass that through (would miss → empty and drop `[X]`). Startup/sicht/history (no handoff) use `"active"`. |
| 6 | **A — gate.** `dienststelleGate` fallback (no input snap) calls `getCurrentHierarchySnapshot({ pageScopeId: "active" })`, not no-arg. |
| 7 | **One helper.** Reuse `uniqueAlignedUseDisplayValues`. One-key map into `collectAlignedHostDisplays`. No second unique. |
| 8 | **Out.** Fan-out still all `vis.byId` (C later). Hidden widgets may get the active-tab set. No chip paint. No `payload.selection` change. No apply/walk/default-host change. |

## 2. Law

When global `dominantValues` is empty and a `pageScopeId` is supplied:

1. `"active"` → current tab id from tabs selectors (inside Dienststelle).
2. Canonical/tab id → `resolveRawPageContextScope` → raw host key.
3. Collect **only** that key from `pageContextValuesByScope`. Unique that list (usually 0\|1\|N of **this** tab).
4. If the raw key is absent: `dominantValues` / `downstreamValues` / `displayValues` empty. `hasConfirmedSelection` false.

When `pageScopeId` is omitted: today’s flatten + unique.

Widget bind (notify payload and gate fallback) must use the scoped form whenever it needs a snapshot and global is empty. The public no-arg form is not the widget bind contract.

## 3. Text to land

### `dienststelle.md` §6 — after the flatten-unique bullet

> Optional `{ pageScopeId }` on `getCurrentHierarchySnapshot` selects one page-context scope (`"active"` or a tab id, resolved with `resolveRawPageContextScope`). Used only when global dominant is empty. A resolve miss returns an empty planner set, not the flatten. No-arg remains the flatten unique union. Widget bind uses the scoped form; drillthrough uses no-arg.

### `dienststelle.md` §12 — after “binding uses `hierarchySnapshot`”

> That payload snapshot is the scoped planner set when global is empty: confirming tab if the handoff is pageContext with a real tab `scopeId`; otherwise the active tab. A global/S1 handoff (`scopeId: "global"`) uses the active tab, not a resolve-miss empty set. It is not the flatten of all defaulted tabs.

### `widgetVis.md` `dienststelleChanged` — after “prefers payload `hierarchySnapshot`”

> Gate fallback without a payload snapshot asks Dienststelle for `{ pageScopeId: "active" }`, not the no-arg flatten. The same `{ pageScopeId: "active" }` applies to every leftover widgetVis bind that today calls no-arg `getCurrentHierarchySnapshot` for a planner snapshot (including startup/settings paths that go through this gate).

## 4. Files

| File | Change |
|---|---|
| `dienststelle/effects/resolvePlannerPageScopeId.js` | **New.** `"active"` / handoff / tab id → raw host key or `null`. |
| `dienststelle/effects/pickPageContextScopeMap.js` | **New.** Full map vs one-key vs `{}`. Keeps `readCurrentHierarchySnapshot` file ≤150. Live reader fn is already 66; **must not grow** (do not force ≤60). |
| `dienststelle/effects/readCurrentHierarchySnapshot.js` | Optional `_options`; guard missing `_options`. Delegate map pick. |
| `dienststelle/createDienststelleController.js` | Pass `_options` through. |
| `dienststelle/effects/buildVisualizationWidgetDienststellePayload.js` | Snapshot via coerced tab `pageScopeId` (never raw `"global"`). |
| `widgetVis/effects/gates/dienststelleGate.js` | Fallback `{ pageScopeId: "active" }`. |
| `dienststelle.md` / `widgetVis.md` | §3 text only. |

**Must not edit:** `applyDienststelleDefault.js`, walk/reconcile host, `addOrReplaceLocalFilter.js`, `widgetBindingPlan/**`, `widgetBindingApply/**`, drillthrough assemble, `handleDienststelleChanged` fan-out, chip/sanitize view, `KDB.js`.

## 5. Acceptance

1. After S1, tab deselect X / select Y / OK: that tab’s vis local Dienststelle filter `values` is `[Y]`, not `[X,Y]`.
2. S1 with no later tab OK: still `[X]` once (flatten unique).
3. Non-empty global: widgets still get the global set.
4. A later settings/metric/topN bind on the **active** tab does not put X back.
5. Drillthrough still calls no-arg flatten.
6. Chip / tab-targeted fan-out unchanged.

## 6. Non-goals

- Writing only widgets on the confirming tab.
- Painting the filter chip.
- Unique after metrics rewrite.
- Changing `payload.selection` first-member behavior.
