# Contract Delta: `pageContextPlain` Tab-Mutation (prepare / apply / restore snapshot)

> Delta on top of `contracts/pageContextPlain.md`, owned by the tab-CRUD saga in `contracts/tabs-tabCrud-contractdelta.md`.
> P0 only — no writeback GET/SET.

---

**Status:** `Approved — as-built` — P0 Cognos-green 2026-08-14 (incl. dest-item skip on missing dest host); committed. P1 GET/SET out of this delta.
**Parent contract:** `contracts/pageContextPlain.md`
**Consumer:** `tabs` (tab-CRUD saga only; `source: "tabsMutation"`)
**Depends on:** `tabs-tabCrud-contractdelta.md` §2.1 / §2.4, `tabs-filterScopeSelectors-contractdelta.md` (`tabTargets` shape), `dienststelle-tabMutation-contractdelta.md` (pattern, not shared code)
**Type:** `feature module contract delta`
**Authoring AI:** planner, 2026-08-14

---

## 1. Purpose

Kale page-context filter values are host-owned today and therefore stick to the physical slot across delete/move/duplicate. This owner snapshots unowned page-context items per affected scope, permutes them with content, and re-pushes the host after Cognos tab sync — same saga slots as `dienststelle`, thinner value model.

## 2. New Dispatches

Action types: `PREPARE_TAB_MUTATION`, `APPLY_TAB_MUTATION`, `RESTORE_TAB_MUTATION_SNAPSHOT`, `RESYNC_TAB_MUTATION_HOST`, `TAB_MUTATION_SCOPE_WRITE`. Routed Promise-returning in the controller.

Envelope: `{ runId, operationId, source: "tabsMutation", skipHistory: true, plan, tabIdxToScopeId }`. Stale-guard on `_KDB.runtime.pageContextPlain.tabMutationRunId`. Stale → `{ ok: false, errorCode: "TABS_MUTATION_CANCELLED" }`, no side effects.

`dispatchOwnerTabMutation.buildOwnerPayload` **must** include `pageContextPlain` alongside `singleSelect` and `dienststelle` so `tabIdxToScopeId` is attached. Owner API key: `_KDB.api.pageContextPlain`.

### 2.1 `pageContextPlain/prepareTabMutation`

Snapshot **from Cognos host**, not from warm owner state (unlike dienststelle). For every affected slot (same slot list as dienststelle prepare, including duplicate source/insert/reveal), resolve `scopeId` via `resolveScopeId` + `matchLayoutScopeId` fallback. Unresolvable scope → prepare fails; saga aborts.

Per resolved scope, list unowned page-context items (`isUnownedPageContextItem`: complement of `classifyFilterInstance` as invoked by `enumerateFilterInstances` — must not import singleSelect internals) whose `String(getFilterScope(item))` equals that `scopeId` after `_tabpanel` strip on both sides. Skip items whose `getFilterItemId` is null/empty after trim. Record `{ itemId, itemName, sourceId, values }` where `values` is `getFilterValues(item)` (`{ d, u }[]`).

Store under `_KDB.runtime.pageContextPlain.tabMutationSnapshots[operationId]`:

```js
{ runId, operationId, byScope: { [scopeId]: [ { itemId, itemName, sourceId, values } ] } }
```

Empty list for a scope is valid (no unowned items). Return: `Promise<{ ok, operationId, snapshotScopes, diagnostics }>`.

### 2.2 `pageContextPlain/applyTabMutation`

Snapshot-sourced. Missing snapshot / runId mismatch → fail.

- **delete:** snapshot-sourced. Clear host+state for the deleted content's scope (every snapshotted item on that scope; items not in the snapshot are left). Then same as move over `slotMoves`: clear unique `from` scopes, write each `to` from `snapshot.byScope[from]`.
- **move:** clear all unique `from` scopes first; then write each `to` from snapshot (same as dienststelle move). Values conserved.
- **duplicate:** descending `slotMoves` shift-writes from snapshot (**no clears**) plus `clonePair` (fallback `sourceSlot` → `insertSlot`) clone onto insert scope; source untouched; `clearedScopes: []`.

Host lookup per write: `lookupPlainFilterApi(itemId, scopeId)` on a fresh page-context inventory. **P0 cannot create Cognos filter items on a destination scope.** Missing dest host item → **skip that item** (no `TABS_MUTATION_APPLY_FAILED`, apply stays `ok: true`). Missing `replaceFilterContext` API, or a thrown host write, still fail apply. Do not create host items. Empty claimed list is a no-op. Missing `snapshot.byScope[scopeId]` key is treated as `[]`. Resync stays `ok: true` with diagnostics; resync also skips missing dest items.

Reducer `tabMutationScopeWrite` sets `byScope[scopeId]` to the item array (or `[]` on clear).

Return: `Promise<{ ok, operationId, appliedScopes, clearedScopes, diagnostics }>`.

### 2.3 `pageContextPlain/restoreTabMutationSnapshot`

Restore snapshot per scope to state + host; delete snapshot bucket. Unrecoverable → `TABS_MUTATION_ROLLBACK_INCOMPLETE`. Return: `Promise<{ ok, operationId, restored, unrecoverable, diagnostics }>`.

### 2.4 `pageContextPlain/resyncTabMutationHost`

After `cognosSync`, for every unique affected slot (`slotMoves` from/to, plus `deletedSlot`/`hideSlot` on delete; on duplicate also `clonePair`, `sourceSlot`, `insertSlot`, `revealSlot`), resolve scope, read **current** `byScope[scopeId]`, re-push each item via `replaceFilterContext`. Missing scope/item → diagnostic, continue (non-fatal). No owner-state mutation. `ok: true` unless unexpected throw. Saga records `hostResync` degraded when diagnostics exist.

## 3. Rules

- `scopeId` live-derived only; canonical map is `tabTargets` from `tabs/resolveFilterScopeTargets`.
- No history, no events, no sicht/singleSelect/dienststelle/widget writes, no global-scope items.
- Reconcile: P0 has none. If a later reconcile is added it must no-op while `_KDB.runtime.tabs.pendingPromises.tabMutation` is set.
- Claim set is page-context only. Do not change `classifyFilterInstance` in P0 or P1.
- `writeback.md` §4.3: P0 left `filt` unchanged. **P1** adds `filt.pcfs` (`pageContextPlain-parameterSetRestore-contractdelta.md`).

## 4. Saga wiring

Add `"pageContextPlain"` to:

- prepare owner list
- filterApply owner list
- all rollback owner lists that currently include `singleSelect`/`dienststelle`
- hostResync owner list

## 5. Acceptance

1. After delete/move/duplicate, kale page-context values follow the content tab **when the dest host item exists**. Missing dest items are skipped (tab-CRUD of widgets/names must still succeed).
2. Duplicate: source and clone scopes have identical unowned item values **when dest host items exist**; displaced tabs keep theirs.
3. Stale `runId` → cancelled, zero side effects.
4. Rollback restores the prepare host snapshot.
5. GET `filt.pcfs` is a P1 concern (`pageContextPlain-parameterSetRestore-contractdelta.md`). P0 GET remains valid without `pcfs`.
6. A dashboard with no user-added kale filters must not abort move/duplicate/delete because leftover unowned host items are missing on the dest tab.

**As-built 2026-08-16 (live owner `nativeMultiSelect`):** dest host lookup is **name + dest scope**, not source `itemId`. Missing dest still skip+warn / apply `ok: true`. Live lookups use `_tabpanel` strip equality only (no layout-alias matcher). See `contracts/nativeMultiSelect.md`.
