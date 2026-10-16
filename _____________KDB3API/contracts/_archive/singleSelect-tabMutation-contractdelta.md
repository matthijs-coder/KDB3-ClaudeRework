# Contract Delta: `singleSelect` Tab-Mutation (prepare / apply / restore snapshot)

> Delta on top of `contracts/singleSelect.md`, owned by the tab-CRUD saga defined in `contracts/tabs-tabCrud-contractdelta.md`.
> Contract-only: no production code is approved by this document.
> **Build gate (D-CRUD-8) — LIFTED 2026-08-10:** the writeback filterInstanceIdentity track closed the page-context singleSelect gaps. The Wave-2 handlers already present in the working tree are ratified subject to the cross-review rules; they must consume `tabs/resolveFilterScopeTargets` as the canonical scope map.

---

**Status:** `Approved — PO 2026-08-10; cross-reviewed (corrections B/D) + reciprocal filterInstanceId identity amendment (§5) incorporated 2026-07-15; build gate D-CRUD-8 lifted 2026-08-10 (see header; identity-delta atomic-tranche gates unaffected)`
**Parent contract:** `contracts/singleSelect.md`
**Consumer:** `tabs` (tab-CRUD saga only; `source: "tabsMutation"`)
**Depends on:** `tabs-tabCrud-contractdelta.md` (§2.1 field table — content-logical classification of per-tab registrations, §2.4 MutationResult), `singleSelect-parameterSetRestore-contractdelta.md` (v3 `sels[].tab` semantics, `tabIdxToScopeId`), `singleSelect-filterInstanceIdentity-contractdelta.md` (§3 canonical identity + §12 tab lifecycle — supersedes this delta's label-bucket snapshot/apply/rollback keys; reconciled in §5)
**Type:** `feature module contract delta`
**Authoring AI:** Fable 5, 2026-07-14
**Reviewed by:** `writeback function planner + GPT-5.6 Sol identity planner + PO (vastenburg), 2026-07-15 — reciprocal filterInstanceId mechanics amendment (§5) jointly signed off`

---

## 1. Purpose

Page-context singleSelect values are physically attached to a Cognos slot scope, while the *content* the user sees permutes over slots (`tabs-tabCrud-contractdelta.md` §2.1, normative). When tab content moves from slot A to slot B, the page-context selections that belong to that content must be re-applied on slot B's scope and cleared from slot A's scope — otherwise the illusion breaks (filters "stay behind" on the old slot). The owner performs this itself; tabs never writes filter state (`stateOwnership.md`).

Key structural fact (parent contract §4): singleSelect state is keyed `byScope[filterScope][filterLabel]` — **not** tabIdx-keyed. The per-tab dimension exists only (a) live in Cognos per slot scope and (b) at GET time as v3 `sels[].tab` (tabIdx). The permutation therefore operates on *live scope assignments*, resolved through the same `tabIdxToScopeId` map (tabs-owner `tabTargets`) the restore path already uses — the primitives must land in the shape the writeback track establishes for that mapping (D-CRUD-8).

> **Superseded (2026-07-15, see §5):** the `byScope[filterScope][filterLabel]` keying in this paragraph and in §2.1–2.3 is replaced by canonical `filterInstanceId` keying per `singleSelect-filterInstanceIdentity-contractdelta.md` §4/§12. The scope-permutation model (content permutes over fixed physical Cognos slots), the phase order, the separate `tabMutationRunId` guard and every tranche/D-CRUD decision below are unchanged.

## 2. New Dispatches

New action types (`config/actions.js`): `PREPARE_TAB_MUTATION: "singleSelect/prepareTabMutation"`, `APPLY_TAB_MUTATION: "singleSelect/applyTabMutation"`, `RESTORE_TAB_MUTATION_SNAPSHOT: "singleSelect/restoreTabMutationSnapshot"`. Routed through the existing controller dispatch pattern (Promise-returning branch, like the parameterSet types).

All payloads carry `{ runId, operationId, source: "tabsMutation", skipHistory: true }`; stale-guard on a dedicated `_KDB.runtime.singleSelect.tabMutationRunId` (same discipline as `parameterSetRuntime.js` `guardRun`/`isStale`, separate key so a tab mutation never cancels a writeback restore or vice versa). Stale → `{ ok: false, errorCode: "TABS_MUTATION_CANCELLED" }`, no side effects.

### 2.1 `singleSelect/prepareTabMutation` — saga phase 2

Payload: `{ plan, tabIdxToScopeId, runId, operationId, source, skipHistory }`.

Behavior: snapshot the current page-context assignments for every affected scope (owner state + the per-scope live values the owner can read through its existing host paths) under `_KDB.runtime.singleSelect.tabMutationSnapshots[operationId]`. The snapshot explicitly enumerates, per affected filter entry, `currentSelection`, `backupSelection` and `pendingSelection` (cross-review D, 2026-07-15 — same completeness as the dienststelle snapshot). No Cognos writes. Unresolvable scope (missing `tabIdxToScopeId` entry) → prepare fails with `WRITEBACK_TABS_TARGET_MISSING`-style diagnostic; saga aborts.

Return: `Promise<{ ok, operationId, snapshotScopes: string[], diagnostics }>`.

### 2.2 `singleSelect/applyTabMutation` — saga phase 3 (before widgets, cheap rollback)

Payload: `{ plan, tabIdxToScopeId, runId, operationId, source, skipHistory }`. Per operation:

- **delete** (tranche 1): clear the deleted content's page-context selections on its scope (existing clear primitives, `skipHistory`), then permute: for each shift pair `(fromTabIdx → toTabIdx)` in ascending plan order — both sides resolved to scopes per call via `tabIdxToScopeId` — re-apply the `from` content's selections on the `to` scope and clear the `from` scope, using the existing apply primitives of the restore path (`applyRestoreSelection.js` family) — no new Cognos apply mechanics.
- **move** (tranche 2): same permutation over the rotation range; no selection values are created or lost.
- **duplicate** (tranche 3): clone the source content's page-context selections onto the new content's scope; source stays untouched.
- Global-scope selections (`byScope.global`) are tab-independent and are **never** touched by a tab mutation.

**As-built 2026-08-12 (duplicate):** `buildTabMutationTransfers.js` — `transfers = plan.slotMoves` (descending pairs) + `clonePair`; `clearSlots = []` (all targets overwritten from prepare snapshot; source untouched). Prepare snapshot covers shift + clone + reveal scopes via the same affected-slot builder.

Return: `Promise<{ ok, operationId, appliedScopes: string[], clearedScopes: string[], diagnostics }>`. Failure → saga aborts; rollback via §2.3 is complete (widget phase has not run yet, D-CRUD-7b).

### 2.3 `singleSelect/restoreTabMutationSnapshot` — rollback

Payload: `{ operationId, runId, source }`. Re-applies the snapshot per scope via the same apply primitives; deletes the snapshot bucket; unrecoverable scopes reported in diagnostics (`TABS_MUTATION_ROLLBACK_INCOMPLETE`). Return: `Promise<{ ok, operationId, restored: string[], unrecoverable: string[], diagnostics }>`.

### 2.4 `singleSelect/resyncTabMutationHost` — saga post-commit host resync

Payload: `{ plan, tabIdxToScopeId, runId, operationId, source, skipHistory }` (same envelope as §2.2).

Behavior (capture → reconcile → push → overlay): for every affected slot (unique `fromTabIdx`/`toTabIdx` in `plan.slotMoves`, plus `plan.deletedSlot`/`plan.hideSlot` on delete), resolve the scope via `tabIdxToScopeId` and **capture** the current committed `instancesById` selections (currentSelection/backupSelection/pendingSelection plus semantic identity). Then run `reconcileFilterInstances` (reason `tabMutation`): the cognosSync traverse rebuilds the page controls, so the cached `filterApisByInstanceId` references are stale and would otherwise be written/verified against detached controls (silent no-op); reconcile also adopts host values into `currentSelection`, which is why the capture happens first. After reconcile, match each captured record to the fresh instance in the same scope by semantic identity, re-push the captured selection via `writeAndVerifyInstanceSelection`, and overlay the captured selection back into owner state (same overlay pattern as §2.2 apply). Unverified scope, failed reconcile, missing match or failed write → diagnostic, continue (non-fatal); scopes without instances are a silent no-op.

Return: `Promise<{ ok, operationId, diagnostics }>`. `ok: true` when the handler completes (even with diagnostics); `ok: false` only on unexpected errors or reconcile failure. Saga records `phases.hostResync` as `degraded` when any diagnostics are present.

**As-built 2026-08-12:** `actions/resyncTabMutationHost.js`; saga dispatches via `tabMutationSagaSupport.resyncOwners` after `cognosSync`, before finalize. Reconcile-first + overlay added same day after the first Cognos smoketest showed the plain re-push silently hitting stale (detached) filter APIs after the traverse. Dienststelle needs no reconcile step: its `lookupScopeFilterApi` enumerates live host items per call.

**As-built 2026-08-12 (popup re-arm):** the second Cognos smoketest showed the popup enhancement (Alle option, single-select enforcement, visual selection) dead after a move: `effects/restorePopupSelection.js` decorated a stale cached DOM subtree (`runtime.domRefs.filterEl`) after the traverse replaced the filter DOM. Fixes: (1) the `domRefs.filterEl` cache is only used when still attached (`document.contains`); (2) `forceFreshPopupMount` now clears `filterEl`/`filterKey` as well as `popupMount`, before resolution; (3) `resyncTabMutationHost` drops the cached popup refs after its reconcile. Value writes were never affected (separate `filterApisByInstanceId` path).

**As-built 2026-08-16:** `writeAndVerifyInstanceSelection` now wraps `effects/writeVerifiedSelection.js`; public signature and `{ ok, errorCode }` return unchanged.

## 3. Rules

- `scopeId` stays live-derived (`tabIdxToScopeId` handed in per call), never persisted — identical to the restore delta. Canonical source of the map is the tabs-owned resolve action delivered by the writeback track: `tabs/resolveFilterScopeTargets` (`tabs-filterScopeSelectors-contractdelta.md`); the owner never builds its own mapping (cross-review B, 2026-07-15).
- No history writes (`skipHistory: true` throughout); no `singleSelect` events emitted for tab mutation.
- Where live per-tab values cannot be attributed from owner state alone, prepare uses existing host-read paths and reports unattributable scope as a degraded diagnostic instead of guessing. Label-keyed one-slot-per-label collision handling is superseded by the instance-aware `semanticInstanceKey` discipline in §5.3.
- **As-built 2026-08-16:** dead file `annotatePageContextCollisions.js` removed; §3 caveat restated without file cite.
- Alignment (D-CRUD-8): if the writeback track introduces a shared tabIdx/scopeId permutation helper while closing its backlog, these dispatches adopt it; this delta must not fork a second mapping structure.

## 4. Acceptance

1. After delete/move, `writebackGet` produces `filt.sels[].tab` values consistent with the new layout (parent CRUD §3.8) and the visible filter values on each tab follow their content.
2. Deleted content's page-context selections are gone from every scope; global selections untouched.
3. Duplicate yields identical selections on source and clone scopes.
4. Stale `runId` → `TABS_MUTATION_CANCELLED`, zero side effects; a concurrent writeback restore is never cancelled by a tab mutation guard (separate runtime keys).
5. Rollback restores the prepare snapshot; unrecoverable scopes are reported, never silent.

## 5. Filter-Instance Identity Amendment (reciprocal, 2026-07-15)

This is the reciprocal amendment required by `singleSelect-filterInstanceIdentity-contractdelta.md` §12. It reconciles this delta's mechanics with the approved canonical identity migration. Only the *keying* of snapshot/apply/rollback changes; every tab-CRUD decision (D-CRUD-1..8), the saga phase order, the content-over-fixed-slots model and the D-CRUD-8 build gate are preserved.

### 5.1 Keying supersession

- The label-bucket references (`byScope[filterScope][filterLabel]`, `byScope.global`) in §1 and §2.1–2.3 are superseded by the canonical `_KDB.state.filters.singleSelect.instancesById` registry keyed by `filterInstanceId` (canonical §4). `byScope` is no longer a mutable source; a derived read-only `getState().byScope` projection exists only for migration compatibility (canonical §10) and is never a tab-mutation target.
- A tab mutation permutes **selection pairs between concrete `filterInstanceId` records that live on the affected physical Cognos slot scopes**, not label buckets. Physical slot identity (`scopeId`) stays live-derived through `tabIdxToScopeId`; content-logical selection pairs permute with the plan (canonical §12).

### 5.2 Snapshot / apply / rollback keys

- **prepare** (§2.1): the per-scope snapshot is keyed by `filterInstanceId`, and for each affected instance stores the full `currentSelection`, `backupSelection` and `pendingSelection` d/u pairs (cross-review D completeness is retained). Global-scope instances are excluded from tab-mutation snapshots.
- **apply** (§2.2): for each shift pair `(fromTabIdx → toTabIdx)` resolved to `(fromScopeId → toScopeId)` via `tabIdxToScopeId`, re-apply the source instances' pairs to the matching-semantic target instances on the `to` scope and clear the `from` scope's instances, using the canonical owner apply/clear paths. Global instances (`scopeType: "global"`) are never touched. Delete clears the deleted content's instances; move permutes over the rotation range; duplicate clones source instances onto the new scope's matching-semantic instances.
  - *Ordering clarification (cross-review 2026-08-10):* because transfer values are sourced exclusively from the frozen prepare snapshot (never re-read from the live `from` scope), executing all clears before all applies is equivalent to per-pair apply-then-clear and is sanctioned as the as-built order. The invariant is snapshot-sourced writes, not literal pair interleaving.
- **rollback** (§2.3): re-applies the `filterInstanceId`-keyed snapshot pairs to the same instances; unrecoverable instances/scopes are reported (`TABS_MUTATION_ROLLBACK_INCOMPLETE`), never silent.

### 5.3 Resolution and collision discipline

- Target-instance resolution reuses the canonical identity resolution (`scopeType + scopeId + itemId`, with the controlled `itemName`/`semanticInstanceKey` fallback of canonical §3), never array position, DOM identity or label suffixing.
  - *Cross-scope clarification (cross-review 2026-08-10):* `itemId` is scope-local and by construction never matches across physical slots. Cross-scope target matching therefore keys on the semantic identity (`filterType`/`filterLabel`/`semanticInstanceKey`/`itemName`); the `itemId`-primary rule applies to same-scope resolution (rollback id-match first, semantic remount fallback second).
- Where two same-label instances occupy one scope, the owner disambiguates by `semanticInstanceKey`; an unresolved collision fails that entry with a coded diagnostic instead of guessing (canonical §3.2/§6). The multi-tab collision caveat in §3 is superseded by this instance-aware discipline.
- Snapshot/apply/rollback still perform host reread after Cognos writes per the canonical d/u policy (canonical §7.3/§8); a transport-only `d = u` is never committed as confirmed display.

### 5.4 Build sequencing (unchanged)

Contract mechanics are reconciled and jointly signed off. The D-CRUD-8 precondition is fulfilled as of 2026-08-10 (writeback closed its singleSelect work; see header) — the remaining sequencing condition is the canonical identity delta's own atomic-tranche gates, which this amendment does not lift. The Wave-2 handlers already present in the working tree are ratified subject to the cross-review rules.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-07-15 | `Draft → Cross-reviewed (B/D)` | writeback function planner | Corrections B (canonical `tabIdxToScopeId` resolve action) and D (full d/u snapshot completeness) incorporated. |
| 2026-07-15 | `Cross-reviewed → reciprocal identity amendment added; mechanics approved` | PO vastenburg + writeback function planner + GPT-5.6 Sol identity planner | Reciprocal `filterInstanceId` mechanics amendment (§5) added per canonical identity delta §12 and jointly signed off. Contract mechanics reconciled; production build still gated by D-CRUD-8 and canonical atomic-tranche rules. |
| 2026-08-10 | `Cross-reviewed → Approved` | PO vastenburg | Formal PO approval of the delta as cross-reviewed and amended; D-CRUD-8 lifted the same day. Per-file cross-review sign-off of the Wave-2 working-tree handlers by the writeback planner remains required before acceptance (execution spec §L/M). |
