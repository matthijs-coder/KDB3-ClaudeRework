# Contract Delta: `tabs` Tab-CRUD (delete / move / duplicate)

> Delta on top of `contracts/tabs.md`. Upon approval this delta supersedes the deferred provisions of `tabs.md` §7.2 / §15 / §16 / §21 for the operations named here.
> Contract-only: no production code is approved by this document. Implementation starts only after explicit PO approval of this delta plus the owner deltas listed in §11.

---

**Status:** `Approved — PO decisions Q1–Q3 closed 2026-07-14; cross-review corrections A–E incorporated 2026-07-15; Wave 1 (tabs/widgetBase/UI) execution-ready, Wave 2 (filter owners) ungated 2026-08-10 — D-CRUD-8 writeback precondition fulfilled`
**Parent contract:** `contracts/tabs.md`
**Depends on:** `tabs-activationEvent-contractdelta.md` (`tabs:changed`), `widgetBase-lazyLaunchpadRouting-contractdelta.md`, `tabs-parameterSetRestore-contractdelta.md`, `writeback.md` §4 (v3 shape, GET)
**Related deltas (§11):** `widgetBase-tabMutation-contractdelta.md`, `singleSelect-tabMutation-contractdelta.md`, `dienststelle-tabMutation-contractdelta.md`, `pageContextPlain-tabMutation-contractdelta.md`, `kdbControl-tabsCrud-contractdelta.md`
**Type:** `feature module contract delta`
**Authoring AI:** Fable 5, 2026-07-14 (architecture input GPT-5.6; PO decision + eight binding frames via writeback function planner 2026-07-14)
**Reviewed by:** PO (vastenburg) + writeback function planner, 2026-07-14 — Q1 (D-CRUD-3), Q2 (landing rule), Q3 (rollback conditions + §10.2 serialization) decided; see §1 D-CRUD-5..8

---

## 1. PO Decisions (binding)

- **D-CRUD-1 — Core strategy A:** tab-CRUD is a **tabs-owned live saga** using direct owner-dispatches. Restore *primitives* are reused inside the owners; the dashboard-wide `writebackSet.restore(v3)` is **never** invoked for a tab mutation. Legacy's "collect → permute records → full restore" model is rejected (too heavy, visible reset, out of restore-contract scope).
- **D-CRUD-2 — Order & undo:** build order **delete → move → duplicate**. Tranche 1 (delete) ships explicitly **without undo**; no history frame is published that is not replayable. Delete is park-based (§3.1) precisely so undo remains possible in a later tranche.
- **D-CRUD-3 — Saved parameterSets stay positional (CLOSED, PO 2026-07-14):** v3 parameterSets remain immutable positional snapshots. Tab-CRUD does not remap or invalidate stored sets; applying an old set deliberately restores the tab layout/filters/widgets as saved at those positions — this is *desired* behavior ("load a set" = put back a photo-per-position) and is documented as such. Motivation (binding): v3 deliberately persists no Cognos or structural tab identity (code-only rule, `writeback.md` §4.4), restore is by definition photo-per-position, and stored sets are not enumerable for invalidation. A follow-the-content administration would require a persistent identity schema in v3 plus invalidation of non-enumerable sets — rejected. No v3 change. This decision is closed and does not reopen at later tranches.
- **D-CRUD-4 — Reorder is UI over move:** `tabs/reorder` gets no separate domain semantics; reorder UI translates to `tabs/move`. This closes `tabs.md` §21's open question.
- **D-CRUD-5 — Content-over-fixed-slots model is normative (PO 2026-07-14):** the mental model "content permutes over immutable physical Cognos slots" governs every operation. The field classification table in §2.1 and the contiguous-prefix invariant in §2.2 are binding for this delta *and* for every owner delta that permutes tabIdx-keyed state (§11 deltas must reference §2.1 instead of restating it).
- **D-CRUD-6 — Content-following landing rule (PO 2026-07-14):** the landing tab after delete follows the *content* the user was viewing, not a raw position; exact rule in §4.1. The landing uses the existing final-emit pattern: mechanical intermediate activations suppressed behind the in-flight guard, then one deterministic `tabs:changed` for the landing slot with `source: "tabsMutation"` (precedent: `postParameterSetRestoreTraverse` → `source: "postRestoreTraverse"`).
- **D-CRUD-7 — Rollback best-effort accepted under two conditions (PO 2026-07-14):** (a) every mutation run resolves an explicit **MutationResult** modeled on `RestoreResult`: per owner-phase `ok | degraded | failed` with diagnostics, plus a top-level `outcome` in which "degraded with residual damage" is an honest reportable outcome — never silently half-applied; (b) the apply order is chosen such that the most irreversible step (physical widget park/take) comes **as late as possible**, so failures in earlier phases roll back cheaply. See §2 phase order and §5.
- **D-CRUD-8 — §10.2 shared owner files: SERIALIZE, writeback track first (PO 2026-07-14):** implementation inside `singleSelect` and `dienststelle` by the tab-CRUD track starts only after the writeback track has finished its remaining work in those modules (including the deferred `dstl.byTab` / scopeId→tabIdx-mapping gap pulled forward from the futureTodo backlog — the permutation primitives of this delta must align with that same structure). Contract deltas may be written in parallel, but the owner deltas for `singleSelect`/`dienststelle`/`widgetBase` are cross-reviewed by both planners before implementation; on conflict `writeback.md` wins and the PO decides. If the tracks still converge on the same module in time, one builder takes that module. **Precondition fulfilled 2026-08-10:** the writeback track closed the `dstl.byTab`/scopeId→tabIdx gap (canonical action `tabs/resolveFilterScopeTargets`) and the page-context singleSelect gaps (filterInstanceIdentity track); the gate is lifted (see §10.2 and the owner-delta headers).

## 2. Normative Model & Saga

### 2.1 Field classification: slot-physical vs content-logical (normative, D-CRUD-5)

Every "tab" the user sees is *movable content stacked on an immovable physical Cognos slot*. Nothing ever moves, deletes or copies at the slot level; the illusion is produced by permuting content and presentation across the fixed slots. Every operation and every owner delta classifies state it touches against this table:

| Field of `_KDB.state.tabs.byIndex[i]` | Class | Behavior under CRUD |
|---|---|---|
| `index` | **slot-physical** | never changes; identifies the physical Cognos slot |
| `tabId` | **slot-physical** | never changes; Cognos id of the slot |
| `pageId` | **slot-physical** | never changes; Cognos page/dropbox id of the slot |
| `isCanvasLoaded`, `canvasLoadedAt`, `canvasLoadSource` | **slot-physical** | Cognos lazy-load status of the *slot*; never permutes with content |
| `hasBeenActivated`, `activatedAt`, `activatedBy` | **slot-physical** | activation history of the *slot*; never permutes with content |
| `isHelper`, `role` | **slot-physical** | helper tab untouchable |
| `name` | **content-logical** | permutes with the content (via `setTabName`) |
| `visible`, `button.*` | **content-logical** | permutes with the content (last slot hidden on delete, hidden slot enters service on duplicate) |
| `isActive` | derived | set only by the landing rule (§4.1), never permuted mechanically |
| `edit.*`, `lifecycle`, `errorCode`, `errorMessage` | derived/transient | recomputed after commit, never permuted |

Owner-side per-tab state is **content-logical by definition** and permutes with the plan: `singleSelect` per-tab registrations (v3 `sels[].tab`), `dienststelle` `byFilter[*].currentSelectionByScope.pageContext` entries (v3 `dstl.byTab`), `nativeMultiSelect` `byScope[scopeId]` kale page-context item lists (v3 `filt.pcfs[].tab` as of P1). Widget shells do not permute. Widget DOM nodes are never moved to another tab. A widget lives only on the slot (page) where Cognos registered it. On a tab mutation the content is fully rebuilt at its new location, using the destination slot's own stock widgets (the shells Cognos registered on that slot). Moving a tab is an illusion: content and presentation permute; widget shells do not. `widgetBase` frame `tabId`/`tabHandle` stays the Cognos slot of that shell (`tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1, live 2026-10-07). Exception: `widgetBase` `routedTabIds` is **slot-physical** bookkeeping ("this slot's pre-existing widgets were routed once") — never permuted and never written by the mutation handlers; it is seeded only by its existing two writers, as a side effect of the ensure-routed calls the saga awaits (`widgetBase-tabMutation-contractdelta.md` §3/§4, corrected 2026-07-15). The §11 owner deltas reference this table; they do not restate their own classification.

### 2.2 Contiguous-prefix invariant (hard invariant + postcondition)

Visible dashboard tabs form a **contiguous prefix** of the slot order; hidden slots sit at the tail; min 1 / max `limits.maxUserTabs` (5) visible; helper tab outside the range. This invariant is *load-bearing*: `tabs/add` takes "the first hidden slot", so delete must shift content left within the visible prefix and hide the last **visible** slot (never leave a hole); pre-existing hidden trailing slots stay untouched. Duplicate must shift content right into the tail slot. **Every operation's plan validates the invariant as a precondition and the saga asserts it as a postcondition of commit; a postcondition violation is a `failed` MutationResult, never silent.**

### 2.3 Saga phases

One mutation at a time; tabs is the domain coordinator (business logic in tabs action-handlers/effects, never in the orchestrator file, per `feature-structure.mdc`). Phase order implements D-CRUD-7(b): the most irreversible step — physical widget park/take — runs as late as possible, so earlier failures roll back cheaply.

1. **Plan** — pure, no DOM/Cognos: validate guards (§2.2, §4 invariants), build one immutable *mutation plan* keyed on stable `tabId` **and** position (position alone is forbidden; `state.mdc` stable-ids rule). Plan carries `operationId` and `runId`.
2. **Prepare** — each involved owner snapshots its own state and confirms readiness/capacity via its `prepareTabMutation` dispatch. Any prepare failure aborts before any mutation (dashboard byte-identical). Byte-identical explicitly includes the **visible active tab**: the saga captures the originally active tab before any mechanical slot activation and re-activates it on every abort path that ends before commit (added 2026-07-15, review finding — the mechanical activations of the readiness phase must not leave the user on a different tab after an abort).
3. **Remap per-tab filter state** — via `singleSelect` / `dienststelle` / `nativeMultiSelect` own dispatches (`dstl.byTab`, `sels[].tab`, kale page-context values are tabIdx/scope-keyed and must permute with the plan). Tabs never writes foreign state (`stateOwnership.md` canonical-writer rule). Runs *before* widget apply: pure state permutation, cheap to roll back from prepare snapshots.
4. **Apply widgets** — via `widgetBase` dispatches reusing existing park/claim/take/contentCreate/placeControls primitives (§3.1/§3.2). This is the irreversibility frontier: once park/take has started, rollback becomes best-effort.
5. **Commit tabs** — one atomic tabs-reducer commit (names, visibility, landing `isActive`, order-derived projections), then tabs-owned Cognos/DOM sync (`setTabName`, `syncTabsDomFromState`). §2.2 postcondition asserted here.
6. **Host resync** — post-commit, post-cognosSync: `singleSelect/resyncTabMutationHost`, `dienststelle/resyncTabMutationHost` and `nativeMultiSelect/resyncTabMutationHost` re-push each affected scope's committed filter state to Cognos (mirror of writeback restore step 22). Non-fatal: per-scope/instance diagnostics tagged `TABS_HOST_RESYNC_FAILED` degrade `phases.hostResync` but never abort or roll back the committed mutation — widget routing, `TAB_MUTATION_APPLY` and cognosSync traverse reload page-context scopes and revert phase-3 filter writes without this late resync.
7. **Finalize** — destructive cleanup only after commit; one deterministic final `tabs:changed` emit (§6); result resolves the MutationResult (§2.4).
8. **Rollback** — on failure before phase 4: restore via each owner's `restoreTabMutationSnapshot` dispatch from the prepare snapshots (cheap, complete). On failure during/after phase 4: best-effort rollback (no multi-owner transaction exists on Cognos); residual damage is reported honestly per D-CRUD-7(a).

Locking: the saga registers itself under `_KDB.runtime.tabs.pendingPromises.tabMutation`; a second CRUD dispatch while in flight resolves `{ ok: false, errorCode: "TABS_MUTATION_CONFLICT" }`. Interaction with traverse follows the existing traverse-conflict rule.

### 2.4 MutationResult (D-CRUD-7a, modeled on `RestoreResult`)

```js
Promise<{
  ok: boolean,                       // outcome === "applied"
  outcome: "applied" | "degraded" | "aborted" | "cancelled" | "failed",
  operationId: string,
  phases: {                          // per owner-phase, RestoreResult pattern
    [phaseName]: { status: "ok" | "degraded" | "failed" | "skipped", diagnostics: [] }
  },
  diagnostics: []                    // top-level, includes TABS_MUTATION_ROLLBACK_INCOMPLETE entries
}>
```

`"degraded"` covers per-entry duplicate failures (§3.4) *and* rollback residual damage — both are honest reportable outcomes, never a silent half-applied state. `"aborted"` = pre-mutation abort with clean rollback; `"failed"` = commit/postcondition failure. Post-commit phases (`cognosSync`, `hostResync`) may report `degraded` without flipping `outcome` to `failed` or triggering rollback — the committed tabs state stands; `ok` is true only when `outcome === "applied"`. **As-built 2026-08-12 / token 2026-09-08:** edit UI (`confirmAndDispatchTabDelete` / `confirmAndDispatchTabDuplicate` / `confirmAndDispatchTabMove`) surfaces `outcome: "degraded"` as an `info` `notify` (not a failure `showAlert`) — the mutation committed; only post-commit sync was incomplete. Residual D-CRUD-7a hitchhiking that toast is parked (`toast-severity-content-rule-contractdelta.md`).

## 3. Eight Binding Frames (PO, 2026-07-14 — normative)

### 3.1 Delete = park, never destroy
Tab-delete routes the tab's widgets to the launchpad through the existing `widgetBase` routeToLaunchpad path (no physical destruction, no new delete primitive). Rationale: proven code, shell stock stays available for duplicate, undo stays possible later. Per-tab filter state (`dienststelle.byTab`, `singleSelect sels[].tab`, kale `nativeMultiSelect.byScope`) is cleared by the filter owners themselves via their own dispatches.

### 3.2 Duplicate reuses the *current* restore pipeline, completely
As of 2026-07-14 that pipeline is: claim shell → `takeFromLaunchpad(tabId)` → colour → `contentCreate` (metric enrichment live via `_KDB.api.metricsTree.resolveMetricByCode`, code-only input) → `widgetSettings/placeControls` (`isHistoryReplay: true`) → settings batch → vis binding (see `widgetBase/actions/handleParameterSetRestore.js`). **Skipping `placeControls` is a contract breach** (missing settings gear). A convergence initiative is in flight (`completeShellPlacement` / `completePostPlacement` as shared widgetBase effects across drop, history and restore): duplicate must be designed against that shared layer — **no fourth placement variant**. See sync point §10.1.

### 3.3 No new widget serialization
`serializeWidget(widgetId)` must reuse the existing GET-collector logic (`collectWidgets.js` / `buildWidgetObject.js`, v3 `wgts` entry shape) per widget — refactor the collector so a per-widget function becomes available if needed. The v3 code-only rule applies: never persist `langtext`/`url`/`display`/`metricsTable`; those are resolved live.

### 3.4 Shell capacity = existing drop behavior
Exhausted launchpad stock during duplicate is a **per-entry degraded outcome** (entry fails with a diagnostic, the operation continues), identical to the restore path's per-entry failure model. No separate capacity layer.

### 3.5 Event suppression during mutations
Multi-step mutations that mechanically activate tabs follow the existing traversal pattern: in-flight guard via `_KDB.runtime.tabs.pendingPromises` (the `tabs:changed` subscribers — kdbControl tabFollow, widgetBase lazy routing, dragDrop rebind — suppress/resynchronize on it; precedent: `followActiveTab.js` already checks `pendingPromises.traverse|startup` and must additionally recognize `tabMutation`), plus **one deterministic final `tabs:changed` emit** for the landing tab with a distinct `source` (precedent: `postParameterSetRestoreTraverse` → `source: "postRestoreTraverse"`; here `source: "tabsMutation"`). No new events; `tabs:structureChanged` stays deferred until a concrete consumer exists (`events.mdc` fact-event rule).

### 3.6 Render barrier explicit
Cognos renders only visible pages. After move/duplicate onto a non-active tab, this contract chooses: **rendering follows on first activation via the existing lazy path** (`widgetBase` lazy routing / vis `deferRenderWait`), with `widgetBase/renderTabWidgetsRequested` + `waitFor: "widgetsRendered"` available as an explicit barrier where an operation needs confirmed rendering (existing: `tabs/effects/awaitTabWidgetsRendered.js`). No implicit assumptions; each operation's spec states which of the two applies.

### 3.7 Owner-dispatch conventions
Every owner-dispatch from the tabs saga carries `runId`, `source: "tabsMutation"`, `skipHistory: true`; stale-runId completions are ignored by every owner; rollback runs via the per-owner prepare snapshots. Precedent for tabs→widgetBase dispatch exists (`tabs/effects/awaitTabWidgetsRendered.js`). Naming per `naming.mdc`: action types are `<module>/<imperativeAction>`; the `Requested` suffix stays reserved for request-events (the backlog names `tabs/moveRequested` etc. are rejected).

### 3.8 GET consistency as acceptance criterion
After every mutation (delete/move/duplicate) `writebackGet` must produce a valid v3 consistent with the new tab layout (`tabs`, `wgts[].tab`, `filt.dstl.byTab`, `filt.sels[].tab` remapped, and **P1** `filt.pcfs[].tab` remapped via host-enumerate GET). This is a mandatory smoketest (§9).

## 4. Operation Semantics

Shared invariants (legacy parity): 5 fixed Cognos dashboard slots, slot `tabId`/`pageId` immutable — *content* permutes; min 1 / max 5 visible dashboard tabs; helper tab untouchable; `_tabNumber` in UI = logical position (1-based), never array index.

### 4.1 `tabs/delete` (tranche 1)
- Guard: refuse when only one visible dashboard tab remains (`TABS_MIN_VISIBLE`), refuse helper/hidden targets.
- Widgets of the deleted tab: **parked** to the launchpad via routeToLaunchpad (§3.1), reason `"tabDelete"`.
- Filter owners clear the deleted tab's scope entries via their own dispatches.
- Metadata shift-left (legacy insert semantics): content of the deleted position shifts out within the visible prefix; the last **visible** dashboard slot becomes hidden with baseline name (tabs baseline from `captureTabsBaselineNames`). When all trailing slots are visible this matches legacy "move to position 5 + hide + name reset"; with pre-existing hidden trailing slots the freed slot is the last visible position, not `limits.maxUserTabs - 1`.
- Filter keys for shifted tabs are remapped by their owners from the mutation plan; `routedTabIds` needs no mutation-side writes — the awaited ensure-routed calls seed target slots (`widgetBase-tabMutation-contractdelta.md` §4).
- Landing tab (content-following rule, D-CRUD-6, decided PO 2026-07-14):
  - **(a) delete of a non-active tab:** the saga activates the slot where the previously active *content* now lives — active content left of the deleted position stays on its slot, active content right of it shifted one slot left. The user perceives no navigation at all.
  - **(b) delete of the active tab at position k:** land on position k, where the former right-neighbor content has shifted in (browser-tab behavior). Only when k was the last visible position: land on the previous visible tab.
  - The landing is fixed deterministically in the plan, applied before the final emit, and uses the final-emit pattern of §3.5/§6: intermediate mechanical activations suppressed behind `pendingPromises.tabMutation`, then exactly one `tabs:changed` with `source: "tabsMutation"` for the landing slot.
- Render barrier: lazy path (§3.6) suffices — parked widgets need no render.
- No undo in tranche 1 (D-CRUD-2); no history frame emitted.

### 4.2 `tabs/move` (tranche 2)
- Insert/shift semantics, never swap (legacy parity). Payload: `{ tabId | position, targetPosition, source }`.
- Widgets stay on the Cognos slot where they were registered. Tab move rebuilds each destination on that slot's own stock (`tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1). Widget-scoped history stays on the shell id.
- Filter owners permute their tabIdx-keyed entries per the plan.
- Render barrier: widgets landing on a non-active tab render on first activation (lazy path); the saga may use `renderTabWidgetsRequested` when a confirmed-rendered end state is required.
- Undo candidate for the first history integration (move is fully replayable).
- **As-built 2026-08-12:** rotation within visible prefix; snapshot-first apply at all layers; content-following landing per D-MOVE-2; Cognos smoketests passed and `TAB_MOVE_UI_ENABLED` flipped to `true` the same day (incl. hostResync + popup re-arm fixes). Amended 2026-08-13: move commit also writes `plan.names.byIndexAfter` onto `byIndex[].name` (not solely via `slotMoves` content copies). The same-shell shift in this as-built is superseded 2026-10-07 by `tabs-tabMutation-rebuildOnSlotStock-contractdelta.md`.

### 4.3 `tabs/duplicate` (tranche 3)
- Insert directly after the source position (legacy parity); requires a hidden slot (max-5 guard otherwise `TABS_MAX_VISIBLE`).
- Source widgets serialized per §3.3 (per-widget GET-collector reuse), then re-created on the target tab through the full pipeline of §3.2 with fresh `widgetId`s and a correlation map.
- Shell exhaustion: per-entry degraded per §3.4.
- Source filters cloned to the new tab's scope by the filter owners.
- **Dependency:** blocked on the placement-convergence layer (§10.1) being available, or explicit PO waiver.
- **As-built 2026-08-12:** insert-after-source with descending `slotMoves` shift-right; reveal tail slot; `clonePair` + `slotMoves` for filter owners; per-entry widget degraded (§3.4); landing = source (D-DUP-4); copy name = source name (D-DUP-3). §10.1 waived via D-DUP-1 middle path (`placeSerializedWidgetEntry.js`). Amended 2026-08-12 after smoketest: placement alone does not clone content/settings — a content-fill step (`widgetBase/effects/fillDuplicateWidgetContent.js`) reuses restore steps 25-27 (settings batch, text, vis binding) over the cloned entries, degraded-only. Cognos smoketests passed 2026-08-14; `TAB_DUPLICATE_UI_ENABLED` flipped to `true` the same day. The shell shift-right in this as-built is superseded 2026-10-07 by `tabs-tabMutation-rebuildOnSlotStock-contractdelta.md`: each affected slot is rebuilt on its own stock. Filter `slotMoves` stay.

## 5. Owner-Dispatch Table

All rows: payload additionally carries `{ runId, operationId, source: "tabsMutation", skipHistory: true }`; return shape `Promise<{ ok, diagnostics?, ...opSpecific }>`; stale runId → `{ ok: false, errorCode: "TABS_MUTATION_CANCELLED" }` without side effects.

| Phase | Owner | Dispatch | Used by | Core payload | Failure behavior |
|---|---|---|---|---|---|
| prepare | `widgetBase` | `widgetBase/prepareTabMutation` | del/move/dup | `{ plan }` → snapshot + capacity check | abort saga pre-mutation |
| prepare | `singleSelect` | `singleSelect/prepareTabMutation` | del/move/dup | `{ plan, tabIdxToScopeId }` → scope snapshot | abort saga pre-mutation |
| prepare | `dienststelle` | `dienststelle/prepareTabMutation` | del/move/dup | `{ plan, tabIdxToScopeId }` → byTab snapshot | abort saga pre-mutation |
| prepare | `nativeMultiSelect` | `nativeMultiSelect/prepareTabMutation` | del/move/dup | `{ plan, tabIdxToScopeId }` → host-enumerated unowned page-context snapshot | abort saga pre-mutation |
| apply (phase 3) | `singleSelect` | `singleSelect/applyTabMutation` | del/move/dup | `{ plan, tabIdxToScopeId }` — clear (delete) / permute (move) / clone (dup) `sels[].tab` registrations | abort + cheap rollback from snapshots |
| apply (phase 3) | `dienststelle` | `dienststelle/applyTabMutation` | del/move/dup | `{ plan, tabIdxToScopeId }` — same for `byTab` / pageContext scopes | abort + cheap rollback from snapshots |
| apply (phase 3) | `nativeMultiSelect` | `nativeMultiSelect/applyTabMutation` | del/move/dup | `{ plan, tabIdxToScopeId }` — snapshot-sourced clear/permute/clone of unowned page-context values | abort + cheap rollback from snapshots |
| apply (phase 4, irreversibility frontier per D-CRUD-7b) | `widgetBase` | `widgetBase/applyTabMutation` | del/move/dup | `{ plan }`; rebuilds vis/text on each destination slot's own stock (same-slot park, then `placeSerializedWidgetEntry` and fill). Does not take a shell onto another tab (`tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1) | delete/move: abort + best-effort rollback from the prepare photos; duplicate: per-entry degraded (§3.4), abort only on structural failure |
| commit | `tabs` (internal) | reducer action `tabs/tabMutationApply` | del/move/dup | validated name/visibility/landing patch | commit failure → rollback all owners |
| sync | `tabs` (effect) | Cognos `setTabName` + `syncTabsDomFromState` | del/move/dup | — | degraded diagnostic (`TABS_RENAME_FAILED` pattern) |
| render (optional) | `widgetBase` | `widgetBase/renderTabWidgetsRequested` | move/dup | `{ tabId, reason: "tabsMutation" }` | non-fatal, degraded (existing semantics) |
| rollback | widgetBase + filter owners | `<owner>/restoreTabMutationSnapshot` | on pre-commit failure | `{ operationId, runId, source }` (§3.7) | best-effort; residual damage in diagnostics |
| hostResync (phase 6) | `singleSelect` | `singleSelect/resyncTabMutationHost` | del/move/dup | `{ plan, tabIdxToScopeId }` — re-push committed sels | non-fatal; degrade `phases.hostResync` |
| hostResync (phase 6) | `dienststelle` | `dienststelle/resyncTabMutationHost` | del/move/dup | `{ plan, tabIdxToScopeId }` — re-push committed byTab | non-fatal; degrade `phases.hostResync` |
| hostResync (phase 6) | `nativeMultiSelect` | `nativeMultiSelect/resyncTabMutationHost` | del/move/dup | `{ plan, tabIdxToScopeId }` — re-push committed `byScope` | non-fatal; degrade `phases.hostResync` |

Exact payload/return shapes per owner are specified in the owner deltas (§11). Filter-owner rows consume `tabIdxToScopeId` = the full `tabTargets` object from `tabs/resolveFilterScopeTargets`. Saga-side precondition before phase 4: every affected target slot activated + `widgetBase/ensureTabWidgetsRouted` awaited **without runId** (`{ tabId, reason: "tabsMutation" }` — ensure guards on `parameterSetRunId` only; `widgetBase-tabMutation-contractdelta.md` §4).

### 5.1 Filter-owner tabMutationRun library (PO 2026-08-16)

- **Path:** `KDB3/js/core/utils/filters/tabMutationRun/` — stateless AMD modules only; not a service; not registered on `_KDB.utils`, `_KDB.api`, `_KDB.services`, or `_KDB.runtime`.
- **Consumers (this tranche):** `singleSelect`, `dienststelle`, and `nativeMultiSelect` filter owners.
- **Library scope:** run-guard bookkeeping (`guardRun` / `isStale` / `cancelled`), snapshot bucket helpers (`tabMutationSnapshots`), and dienststelle-style affected-slot derivation from plan (`listAffectedPlanSlots`).
- **Owner-owned (not in library):** scope resolution, instance matching, Cognos host writes, owner state mutation, singleSelect `buildTabMutationTransfers`, singleSelect semanticKey/matchTarget, dienststelle `resolveScopeIdForSlot` / restoreSupport, `nativeMultiSelect` `resolveScopeIdForSlot` (including global-skip via owner-local `stripTabpanel`), resync capture→reconcile vs live lookup.
- **Asymmetries preserved:** singleSelect pins `tabMutationOperationId` and uses richer `isStaleRun` semantics; dienststelle and `nativeMultiSelect` use `ensureRunIdDefault0`, exact `tabMutationRunId` equality stale check, runIds on cancelled diagnostics, and `String(operationId)` snapshot keys (no `pinOperationId`).

## 6. Events & Suppression

- During the saga: `pendingPromises.tabMutation` is set; the three `tabs:changed` subscribers extend their suppression predicate to include it (one-line change each, documented in their contracts/catalog entry).
- After finalize: exactly one `tabs:changed` emit for the landing tab, `source: "tabsMutation"`, `firstActivation` per normal semantics — this triggers the normal resync of kdbControl host, lazy routing and dropbox rebind.
- No `tabs:structureChanged`, no `tabs:error`, no command-events to known owners (`events.mdc`).

## 7. History

Tranche 1–3 publish **no** history frames (D-CRUD-2; `tabs.md` §16 stays in force). A later `tabs-history-contractdelta.md` may add replayable frames (move first), replay strictly via `_KDB.api.tabs.dispatch` with `isHistoryReplay`; historyService never writes tabs/widgets/filter state itself.

## 8. Error Codes (tabs-owned)

`TABS_MUTATION_CONFLICT`, `TABS_MUTATION_CANCELLED`, `TABS_MIN_VISIBLE`, `TABS_MAX_VISIBLE`, `TABS_MUTATION_PREPARE_FAILED`, `TABS_MUTATION_APPLY_FAILED`, `TABS_MUTATION_POSTCONDITION_FAILED` (§2.2), `TABS_MUTATION_ROLLBACK_INCOMPLETE`, `TABS_HOST_RESYNC_FAILED` (§2.3 phase 6) — all surfaced through the MutationResult of §2.4; never thrown into the event bus.

## 9. Acceptance / Mandatory Smoketests

1. Delete a middle tab with widgets: widgets appear parked on the launchpad, following tabs shift left, last slot hidden with baseline name, min-visible guard blocks deleting the last tab.
2. `writebackGet` after each mutation yields a v3 whose `tabs`, `wgts[].tab`, `filt.dstl.byTab`, `filt.sels[].tab`, and `filt.pcfs[].tab` are consistent with the new layout (§3.8). This explicitly includes runs ending in `outcome: "degraded"`: a degraded-but-committed mutation leaves consistent owner state, so a valid v3 remains a hard requirement (cross-review E, 2026-07-15).
3. During the saga no kdbControl host-move / lazy routing / dropbox rebind fires on intermediate activations; exactly one final `tabs:changed` (`source: "tabsMutation"`) lands everything.
4. Duplicate: copied widgets have working settings chrome (placeControls), correct colour/content/binding; shell exhaustion degrades per entry with diagnostics while the operation completes.
5. A failing prepare leaves the dashboard byte-identical (no partial mutation); a failing apply rolls back with diagnostics.
6. Applying a pre-mutation saved parameterSet restores the saved positional layout (D-CRUD-3 documented behavior).

## 10. Sync Points

1. **Placement-convergence layer** (`completeShellPlacement` / `completePostPlacement`, widgetBase spoor): duplicate designs against this shared layer. If tab-CRUD reaches duplicate before that refactor lands, one of the two tracks waits — explicit cross-planner sync point, decided by PO. (As of 2026-07-14 the layer does not exist in code yet; duplicate stays blocked per §4.3.)
2. **Filter-owner sequencing — DECIDED (D-CRUD-8): serialize, writeback track first.** **Fulfilled 2026-08-10:** writeback closed dstl.byTab + page-context singleSelect via tabs/resolveFilterScopeTargets; Wave-2 filter-owner build may proceed. The tab-CRUD track does not touch `singleSelect`/`dienststelle` implementation files until the writeback track has closed its remaining work there, explicitly including the deferred `dstl.byTab` / scopeId→tabIdx-mapping gap pulled forward from the futureTodo backlog. The permutation primitives in the §11 filter-owner deltas are shaped against that same structure. Contract deltas are written in parallel; owner deltas for `singleSelect`/`dienststelle`/`widgetBase` get cross-review by both planners before build; on conflict `writeback.md` wins, PO decides; timing collision on one module → one builder. `scopeId` stays live-derived, never persisted.
3. ~~D-CRUD-3 confirmation~~ — **closed** at PO review 2026-07-14 (§1 D-CRUD-3).

## 11. Follow-up Deltas (authoring GO given 2026-07-14; each is STOP-gated on cross-review per D-CRUD-8 before build)

1. `widgetBase-tabMutation-contractdelta.md` — prepare/apply/restore shapes, park/take/duplicate internals, convergence-layer contract, ensure-routed precondition rule (§4; the earlier "re-park hazard" framing was rejected at cross-review — `isOwnedWidget` prevents re-parking). **Cross-reviewed 2026-07-15 (corrections A/C incorporated), awaiting PO.**
2. `singleSelect-tabMutation-contractdelta.md` and `dienststelle-tabMutation-contractdelta.md` — scope clear/permute/clone semantics, build-gated per D-CRUD-8 (gate lifted 2026-08-10). **Cross-reviewed 2026-07-15 (corrections B/D incorporated), awaiting PO.**
3. `kdbControl-tabsCrud-contractdelta.md` — edit icons/toolbox from deferred to enabled per shipped operation; delete confirmation and failure surfacing via `_KDB.services.message` (messageService.md, Approved 2026-07-15). **Updated 2026-07-15, awaiting PO review.**
4. Event-catalog update (`architecture/eventSubscribe.md`) for the extended suppression predicate + `source: "tabsMutation"` attribution — lands with the tranche-1 build.
5. Execution spec `tabs-tabCrud-tranche1-delete-execution-spec.md` (delete only; Wave 1 tabs/widgetBase/UI, Wave 2 filter owners — D-CRUD-8 gate lifted 2026-08-10). **Ready for execution (Wave 1) since 2026-07-15; Wave 2 buildable since 2026-08-10.**
6. Execution spec `tabs-tabCrud-tranche2-move-execution-spec.md` (move; Wave A tabs core, Wave B owners + UI). **Landed/approved 2026-08-12.**
7. Execution spec `tabs-tabCrud-tranche3-duplicate-execution-spec.md` (duplicate; Wave A tabs core, Wave B owners + UI). **Built 2026-08-12; Cognos smoketests passed 2026-08-14; `TAB_DUPLICATE_UI_ENABLED` true.**
8. `pageContextPlain.md` + `pageContextPlain-tabMutation-contractdelta.md` + `pageContextPlain-p0-execution-spec.md` — P0 kale page-context tab-mutation owner. **Cognos smoketests passed 2026-08-14** (incl. dest-item skip); committed. P1: `pageContextPlain-parameterSetRestore-contractdelta.md` + `pageContextPlain-p1-execution-spec.md` (Approved 2026-08-14, Grok F1–F7).
