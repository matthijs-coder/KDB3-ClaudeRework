# Contract Delta: `dienststelle` Tab-Mutation (prepare / apply / restore snapshot)

> Delta on top of `contracts/dienststelle.md`, owned by the tab-CRUD saga defined in `contracts/tabs-tabCrud-contractdelta.md`.
> Contract-only: no production code is approved by this document.
> **Build gate (D-CRUD-8) — LIFTED 2026-08-10:** the writeback track closed the `dstl.byTab`/scopeId→tabIdx gap via `tabs/resolveFilterScopeTargets`. Wave-2 dienststelle implementation may start. Permutation primitives must consume `tabs/resolveFilterScopeTargets` as the canonical scopeId↔tabIdx map source. Cross-review rules (writeback.md wins on conflict) unchanged.

---

**Status:** `Approved — PO 2026-08-10 (incl. tabTargets value-shape pin + resolve tolerance); cross-reviewed 2026-07-15; build gate D-CRUD-8 lifted 2026-08-10 (see header)`
**Parent contract:** `contracts/dienststelle.md`
**Consumer:** `tabs` (tab-CRUD saga only; `source: "tabsMutation"`)
**Depends on:** `tabs-tabCrud-contractdelta.md` (§2.1 field table, §2.4 MutationResult), `dienststelle-parameterSetRestore-contractdelta.md` (v3 `dstl.byTab` semantics, `tabIdxToScopeId`)
**Type:** `feature module contract delta`
**Authoring AI:** Fable 5, 2026-07-14
**Reviewed by:** writeback function planner 2026-07-15 (cross-review corrections B/D); PO vastenburg 2026-08-10 (approval incl. tabTargets value-shape pin). Per-file cross-review of the Wave-2 handlers pending (execution spec §L/M).

---

## 1. Purpose

Dienststelle page-context selections live per Cognos slot scope: `byFilter[filterKey].currentSelectionByScope.pageContext[scopeId]` (parent contract §4) — **scopeId-keyed**, where `scopeId` is slot-physical. Tab content permutes over slots (`tabs-tabCrud-contractdelta.md` §2.1, normative), so when content moves from slot A to slot B its Dienststelle selection must be applied on B's scope and cleared from A's — both in owner state *and* in the Cognos host scope. The owner does this itself via the dispatches below; tabs never writes filter state.

The tabIdx-facing view of this data is v3 `dstl.byTab[tabIdx]`. The scopeId→tabIdx mapping work in the writeback backlog defines the canonical translation; this delta's permutation primitives reuse that structure and must not fork a second one (D-CRUD-8).

## 2. New Dispatches

New action types (`config/actions.js`): `PREPARE_TAB_MUTATION: "dienststelle/prepareTabMutation"`, `APPLY_TAB_MUTATION: "dienststelle/applyTabMutation"`, `RESTORE_TAB_MUTATION_SNAPSHOT: "dienststelle/restoreTabMutationSnapshot"`. Routed like the parameterSet types (Promise-returning branch in the controller).

All payloads carry `{ runId, operationId, source: "tabsMutation", skipHistory: true }`; stale-guard on a dedicated `_KDB.runtime.dienststelle.tabMutationRunId` (same `guardRun`/`isStale` discipline as the parameterSet path, separate key so tab mutations and writeback restores never cancel each other). Stale → `{ ok: false, errorCode: "TABS_MUTATION_CANCELLED" }`, no side effects.

### 2.1 `dienststelle/prepareTabMutation` — saga phase 2

Payload: `{ plan, tabIdxToScopeId, runId, operationId, source, skipHistory }`.

Behavior: snapshot, for every affected scope and for **every `byFilter` key** (`Dienststelle_BW`, `Dienststelle_DEZPV` — not only the active one), the complete pageContext entry (`currentValues`, `backupValues`, `pendingValues`, `lastObservedHostValues`, `lastConfirmedAt` — cross-review D, 2026-07-15) under `_KDB.runtime.dienststelle.tabMutationSnapshots[operationId]`. No Cognos writes. Unresolvable scope → prepare fails; saga aborts.

Return: `Promise<{ ok, operationId, snapshotScopes: string[], diagnostics }>`.

### 2.2 `dienststelle/applyTabMutation` — saga phase 3 (before widgets, cheap rollback)

Payload: `{ plan, tabIdxToScopeId, runId, operationId, source, skipHistory }`. Per operation:

- **delete** (tranche 1): clear the deleted content's pageContext entries (state) and its host scope selection (existing scope helpers, `skipHistory`); then permute in ascending plan order: the plan's shift pairs are **tabIdx pairs** `(fromTabIdx → toTabIdx)` — the owner resolves each side to a `scopeId` per call via `tabIdxToScopeId` (cross-review B, 2026-07-15) — and per resolved pair writes the `from` values on the `to` scope (state + host apply via existing scope helpers) and clears the `from` scope.
- **move** (tranche 2): same permutation over the rotation range; values are conserved.
- **duplicate** (tranche 3): clone the source scope's values onto the new content's scope for every `byFilter` key; source untouched.
- Global scope (`currentSelectionByScope.global`) and `resolution.*`/`defaults` are tab-independent and are **never** touched. No hierarchy validation, no BW old-to-new mapping — those stay restore-only (parent restore delta CP-3); tab mutation moves *already-confirmed* values between scopes and therefore never re-validates them.

Return: `Promise<{ ok, operationId, appliedScopes: string[], clearedScopes: string[], diagnostics }>`. Failure → saga aborts; rollback via §2.3 is complete (widget phase not yet run, D-CRUD-7b).

**As-built 2026-08-12:** move apply snapshot-sourced (clear all sources, write from prepare snapshot), aligned with the singleSelect pattern; files `applyTabMutationMove.js` + `applyTabMutationScopeOps.js` extracted for the 150-line rule.

**As-built 2026-08-12 (duplicate):** `applyTabMutationDuplicate.js` — descending `slotMoves` shift-writes via `writeScopeFromSnapshot` (no clears) plus `clonePair` clone write onto insert scope; source untouched. Prepare affected-slot widening covers source, insert, reveal, and all `slotMoves` scopes.

### 2.3 `dienststelle/restoreTabMutationSnapshot` — rollback

Payload: `{ operationId, runId, source }`. Restores the snapshot per scope and filterKey (state + host re-apply via existing helpers); deletes the snapshot bucket; unrecoverable scopes → `TABS_MUTATION_ROLLBACK_INCOMPLETE` diagnostics. Return: `Promise<{ ok, operationId, restored: string[], unrecoverable: string[], diagnostics }>`.

### 2.4 `dienststelle/resyncTabMutationHost` — saga post-commit host resync

Payload: `{ plan, tabIdxToScopeId, runId, operationId, source, skipHistory }` (same envelope as §2.2).

Behavior: for every affected slot (unique `fromTabIdx`/`toTabIdx` in `plan.slotMoves`, plus `plan.deletedSlot`/`plan.hideSlot` on delete), resolve the scope via `tabIdxToScopeId`, read the **current committed** `currentSelectionByScope.pageContext[scopeId]` entry per `byFilter` key, and re-push each to Cognos via `applyHostScope` (`applyTabMutationScopeOps.js`). Missing scope → diagnostic, continue (non-fatal). No owner-state mutation.

Return: `Promise<{ ok, operationId, diagnostics }>`. `ok: true` when the handler completes (even with diagnostics); `ok: false` only on unexpected errors. Saga records `phases.hostResync` as `degraded` when any diagnostics are present.

**As-built 2026-08-12:** `actions/resyncTabMutationHost.js`; saga dispatches via `tabMutationSagaSupport.resyncOwners` after `cognosSync`, before finalize.

## 3. Rules

- `scopeId` stays live-derived (handed in as `tabIdxToScopeId` per call), never persisted. Canonical source of that map is the tabs-owned resolve action delivered by the writeback track: `tabs/resolveFilterScopeTargets` (`tabs-filterScopeSelectors-contractdelta.md`); the owner never builds its own mapping (cross-review B). **Value shape (pinned 2026-08-10):** the map is the full `tabTargets` object — `{ [tabIdx: string]: { tabId, pageId, scopeId?, visible } }` — not a flat scopeId-string map. Resolution per slot reuses the existing `restoreSupport.resolveScopeId` path **including** its `matchLayoutScopeId` tabId/pageId fallback (same tolerance as the parameterSet restore path); only a slot that stays unresolvable after that fallback fails the prepare (§2.1).
- No history writes; no Sicht mutation; no singleSelect/widget writes; no events emitted for tab mutation.
- Reconcile paths (`SYNC_REQUESTED`, `TABLE_DATA_CHANGED`) must tolerate a permutation in flight: the saga's in-flight guard (`_KDB.runtime.tabs.pendingPromises.tabMutation`) is readable; reconcile triggered mid-mutation defers or no-ops, documented in the execution spec.
- Alignment (D-CRUD-8): the permutation helper shares the scopeId→tabIdx structure the writeback track establishes for `dstl.byTab`; if that track lands a shared helper first, this delta adopts it.

## 4. Acceptance

1. After delete/move, `writebackGet` produces `filt.dstl.byTab` consistent with the new layout (parent CRUD §3.8); each tab's visible Dienststelle selection follows its content.
2. Deleted content's scope entries are cleared in state and host for all `byFilter` keys; global values untouched.
3. Duplicate yields identical values on source and clone scopes.
4. Stale `runId` → `TABS_MUTATION_CANCELLED`, zero side effects; separate runtime keys guarantee a concurrent writeback restore is unaffected.
5. Rollback restores the prepare snapshot; unrecoverable scopes reported, never silent.
