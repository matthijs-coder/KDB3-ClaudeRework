# Launch prompt — open inventory after T2 green (product + leftover structure)

Paste into a **fresh** agent chat. Recommended: sterk thinking-model als
**planner / captain**; **cursor grok 4.6** voor begrensde verify- en
implementatie-subagents. PO = vastenburg. Tests in Cognos. Module Contract First.

Do **not** continue the T2 chat, Track S, Track R, or Track Remaining chat.
Re-read **live** files. This prompt **points** at existing futureTodo / remaining
files; do **not** invent a fourth backlog.

**PO assumption: T2 is GREEN.** Do not reopen T2 Cognos-gates.
Track S + Track R (R0–R5) + R6 (kennzahlDefaults shard + thin wrappers) landed
2026-08-17. Do not redo them. Working tree may still be uncommitted — that is
not an invitation to rewrite S/R.

---

COMPLEX TASK — KDB3: work through the **verified remaining inventory** after
T2 green and after Track S/R/R6. Two tracks, never mixed in one WP:

- **Track P** — product leftovers from `contracts/futureTodo/`
- **Track S-rem** — leftover structure/readability from Track Remaining
  (Batch 1–5 items that are **still open**; Batch 0 / R6 closed items are not)

Planner inventariseert niet opnieuw vanaf de audits. Verifieer alleen het
item dat PO kiest, tegen live `file:line`. Implementeer alleen na PO GO.

Project root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`
Target: `_____________KDB3API/`
Branch: `tabs`. Do **not** push. Commit only if PO asks.

AUTHORITY (highest first):

1. This prompt (closed lists, stale lists, pick-list, forbidden, gates).
2. Live `KDB3/js/**` + the module contract of any file you touch.
3. `architecture/stateOwnership.md`
4. `architecture/projectStructureRules.md`
5. `_____________KDB3API/.cursor/rules/` — **do not edit `.mdc`** unless PO asks.
6. Pointed files (read, do not copy into a mega-spec):
   - `contracts/futureTodo/nogOpen_2026_08_17_0200.md` (02:00 snapshot; **stale
     on T2 Cognos-open and on a few line-counts / one Track-S teardown**)
   - `contracts/futureTodo/writeback-restore-deferred-backlog.md`
   - `contracts/futureTodo/t2-parameterSet-gaps-launch-prompt.md` (T2 closed)
   - `contracts/structure-remaining-issues-handoff-launch-prompt.md`
     (**partially stale** — see §0; do not treat its Batch 1 thick-wrapper /
     v2-not-implemented bullets as open work)
   - `architecture/structure-remediation-log.md` (append only; never rewrite
     S/R/R6 rows)

---

## 0. Closed — do not reopen

### T2 (PO green)

- T2-1 v2-import / `writebackMap` (`core/services/writeback/map/`, 17 adapters
  + service). v0/v1 still `WRITEBACK_UNSUPPORTED_LEGACY_FORMAT` — that is
  **not** a T2 gap.
- T2-2 `tbl` / `topn` / widget-localFilters / launchpad-only (contract-close).
- T2-3 special/multi outside `sels` / `pcfs` (skip-by-design).
- T2-4 `head.icon` GET/SET. **Leftover product:** toolbox picker + icon history
  (Track P pick-list, not a T2 reopen).
- T2-5a inflight wait restore/reset.
- T2-5b abort landing tab. **Leftover:** `tabs:changed` suppress whole SET;
  filt-only success without step 28.
- T2-5c activate `getCanvasWhenReady`. **Leftover:** per-widget paint on
  activate; global `waitFor:"canvas"` still click+150ms.
- Mapping SSOT wiring (`core/config/mapping/{parameterMap,kidIndex,bwOldToNewMap}.js`).
  Cognos property `parameterMappingId` is not loaded.

### T0 / T1 / consolidatie

- NMS dest-write slim. `filterScopeMatchesTarget.js` gone. Dest-write by name
  + dest scope. GET page = `listUnowned(scopeId)` only.
- T1a `tabs_move` history. Nested owners `skipHistory: true`.
- T1b kale-value undo (`filter_nativeMultiSelect`). filterDock confirm-only.
- `widgetVis/history/` — skip (settings-owned).
- NMS GET/SET global kale without `tab`. Tab-CRUD still does **not** permute
  global — design.
- WP0–WP4, WP6–WP8. **WP5 not merged** (restore-batch ≠ seed) — do not merge.
- Canvas-discovery (`readCanvasDiscoverySources` / `discoverCanvasWidgets` /
  `waitForScopedShells`).
- `pageContextPlain` — historical. Live owner is `nativeMultiSelect/`.
- `seq` vervallen. `sichtChange` **REJECTED** (do not start).

### Track S (lifecycle) — invariants must hold if you touch these files

- `cleanWidgetForTransfer.js`: **no** `_KDB.state.widgets[widgetId]` teardown.
  Runtime `widgetBase.byId` teardown stays.
- widgetSettings timers on `runtime.widgetSettings.timers`; cleared on cleanup.
- history **reducer** has no `Date.now` (payload timestamps). Service may stamp.
- `KDB.js` destroy: `metricsTree` after `filterDock`, before `kdbControl`;
  services destroy all **except** `widgetBindingPlan`.
- kdbControl gallery: document listeners/timers on `runtime.kdbControl.listeners`
  (AbortSignal). **Do not split gallery** without explicit PO.
- widgetVis: `rejectAllTopNGateWaiters` before runtime wipe.

### Track R / R6 — done

- R0 pass-through / dead deletes (keep live `writeLifecycle` on widgetSettings
  / widgetDataTable).
- R1 rule-docs (optional folders; leftover suffixes forbidden for **new** files).
- R2 folder renames (`dashboardPdf/helpers` → `effects/`; header/footer `dom/`
  → `view/`; bindingPlan `utils/` → precise folders; TopN utils lifted;
  vis `actions/shared/` flattened).
- R3 history `stage*` inlined; `maybePush*` → `push*`. Zero `stage*.js` remain
  (R0 “10 other stage* deferred” is stale).
- R5 observation `manage*` → shorter names. NMS `OWNER_ROUTE_MAP` stays
  `stateChanged` only — **do not add popupReady**.
- R6 `kennzahlDefaults.js` is a thin aggregator over prefix shards. Do **not**
  re-shard. Data shards may exceed 150 (config exception).
- R6 wrapper thinning: `flattenDataQueryResult` gone; poll in
  `tableData/effects/waitForTableQueryResult.js`; `clearAllPageContextFilters`
  gone; `whenRenderStartComplete` gone; `clearAllLocalFilters` loop lives in
  `createCognosBindingFilterMethods` (not in `visualization.js`).
- P0 leftover host `.getValues()`: wrapper-only
  (`verifyCommitFilterValue` → `_KDB.cognosAPI.filters.getFilterValues`).
  Remaining-issues Batch B Q1 is **stale**.

### R4 / R6 skips — do not “fix” without PO

- widgetBase does **not** adopt `tabMutationRun` (local numeric `runId` only;
  util requires `operationId` — would change cancel shape).
- Eight grandfathered `*Support.js` — no split-for-hygiene.
- Ceremonial SS reducer rewrite — needs discussion, not a readability win.
- Filter-fragment dedup vs bindingSpecs.
- dragDrop rebind-poll — **NOT-A-BUG**. Do not “fix” without live Cognos
  proof **and** PO.

---

## 1. Stale text a fresh agent must ignore

| Claim | Live |
|---|---|
| T2-1 / writebackMap “skeleton / not started” | implemented; T2 green |
| remaining-issues Batch 1 “v2 map not implemented” | stale |
| remaining-issues Batch B Q1 drop-vs-wrap `.getValues()` | wrap already landed |
| remaining-issues thick wrappers flatten/poll / clearAllPageContextFilters / whenRenderStartComplete | deleted or moved |
| `nogOpen` §A items 1–6 “Cognos open” | PO: T2 green |
| `nogOpen` widgetText disposed `ok: true` | live `ok: false, skipped` |
| `nogOpen` bindWidgetSettingsPanel 195 / topNGate 176 | now **207** / **184** |
| `nogOpen` widgetBase 83 JS + legacy widgets-key teardown | 82 JS; teardown **removed** in Track S |
| remaining-issues `runtime.widgets[id]` vs `byId` as open work | live is `runtime.widgetBase.byId`; no `runtime.widgets` |
| `tabs.md` “CRUD deferred” | CRUD live; leftover is **history beyond MOVE** |
| R0 “other stage* deferred” | R3 closed them |

---

## 2. First message (mandatory)

Read this prompt + live contracts for the tracks. Then present **only** the
pick-list below to PO. **STOP. Do not write a contract delta or code until
PO names a number (or park).**

One item (or one tightly bound pair) per WP. Contract delta + PO GO **before**
code when the item is product or Cognos-adjacent. Cognos after each WP that
touches host behaviour.

Do **not** start Track P and Track S-rem in the same WP.
Do **not** start T3, gallery split, WP5 merge, `sichtChange`, canvas-discovery,
or a project-wide disposed-dispatch standard without an explicit named pick.

If PO says **park**: write a one-line as-built on this file (“parked YYYY-MM-DD
track X”) and stop.

---

## 3. Pick-list — Track P (product)

Source of truth for *what* (not *whether T2 is open*):
`nogOpen_2026_08_17_0200.md` §1 B/C + §3.3/§3.4, re-verified 2026-08-17 after
S/R/R6. **None of 7–21 was closed by later code.** Item 22 is PARTIAL
(legacy widgets-key teardown gone; full delegation still open).

| # | Item | Notes | Gate |
|---|---|---|---|
| P1 | T3 folder regroup | NMS/SS/DS `actions/` still flat (20/35/14). Needs **GO folder regroup**. Three owners together. No second tabMutation kernel. | PO GO |
| P2 | GET-fixture | No committed `WBParameterGetFunction()` JSON in repo. PO supplies live Cognos dump. | PO fixture |
| P3 | §2.4 page-context poll + `missingShells` in restore phase | Still one-shot; restore can `ok: true` while shells missing. | contract + Cognos |
| P4 | §2.1 rest: per-widget paint on activate; honest global `waitFor:"canvas"` | 5c closed; activate still click+150ms + bounded canvas. GET/PDF still `waitFor:"canvas"`. | contract + Cognos |
| P5 | tabs history beyond MOVE | Delete / duplicate / rename have no keys. MOVE = T1a closed. | contract + Cognos |
| P6 | §7 shell-create surplus widgets | `placeSerializedWidgetEntry`: not supported → `WRITEBACK_WIDGET_RESTORE_FAILED`. | contract + Cognos |
| P7 | `dataSourceContext` | No JS module. Interim `Personal_KDB`. Wait-site in `resolveMetricsDataSource.js`. | contract + Cognos |
| P8 | head.icon toolbox picker + icon history | GET/SET icon is T2-4 closed. Toolbox has no picker; header history ignores `setIcon`. | contract + Cognos |
| P9 | `tabs:changed` suppress during whole SET | Abort landing exists; observer still emits every activation. | needs discussion |
| P10 | Filt-only success landing (no step 28) | Filter-only restore leaves DOM on last page-context tab. | needs discussion |
| P11 | §6.1 duplicate SS labels → per-scope state | Mitigated on GET; owner still keys `filterLabel`. | needs discussion |
| P12 | §6.2 `maxUserTabs` fallback SSOT | `collectTabs`/`collectWidgets` → `Infinity`; `listDashboardSlots` → `MAX_USER_TABS` (5). Small. | SHOULD |
| P13 | widgetVis legend `#` / `ALLE` / `Beendet` | Investigation; start only if user-visible + delta. | PO |
| P14 | Content-cleanup delegation (full transfer path) | Settings-delete already calls `widgetVis/cleanupContent`. `routeToLaunchpad` frame-only. | contract |
| P15 | widgetText cleanup round | Production (~40 JS); no follow-up backlog yet. Audit first. | PO |
| P16 | widgetDataTable cleanup | Scaffold (~10 JS, `SCAFFOLD_NOOP`). | PO |
| P17 | `specialSingleSelect` history | SET-sync only; no GET; no `history/`. Out unless PO picks. | PO |
| P18 | `v2FieldMap.js` third alias layer | File does not exist. Expres out of mapping SSOT. | PO |
| parkP | Park Track P | Record as-built; do not start T3. | — |

**Do not start without GO:**

- §3.3 class-toggle hidden-tab (only if Cognos ignores programmatic click)
- `waitUntilTraversed` / `retraverse` (reserved names, zero JS)
- `sichtChange`
- v0/v1 writeback map (blocked on real DWH samples — Open Decision 3)
- `WritebackTabel` CRUD

Polish (Track P-pol) is **not** on this numbered list. See §5. Only start if
PO names a polish id **or** a file-size trigger below.

---

## 4. Pick-list — Track S-rem (structure leftovers)

`structure-remaining-issues-handoff-launch-prompt.md` §5 is the parent, minus
everything in §0 of **this** prompt.

**Batch B still blocks Cognos-adjacent edits.** If PO picks any S1–S7, ask the
matching Batch-B question first and **wait**. Do not auto-fix.

| # | Item | Notes | Gate |
|---|---|---|---|
| S1 | `getSlots` / raw host handles | `visualization.getSlots` returns host object; binding chains `.getSlot().addDataItems`. | Batch B |
| S2 | Tabs activate: `setActiveTab` vs DOM `.click()` | **No** `setActiveTab` in JS. `traverseTabs.js` still `target.click()`. | Batch B |
| S3 | `window.top.WBParameter*` vs `_KDB.cognosAPI.writeback` | Live install is `window.top` (matches `writeback.md`). No `_KDB.cognosAPI.writeback`. | Batch B |
| S4 | Bridge SET `RestoreResult` vs contract `void` | Live returns `RestoreResult`; `writeback.md` still types `void`. | Batch B (doc vs code) |
| S5 | `dienststelle/state/selectors.js` Cognos-calls → effects | Still calls `getPageContextItemsArr` / `getAllGlobalFilterItems`. File ~333 lines. | Batch B |
| S6 | Leaf verbs (`getContent` / `getPageContext` / slot mutates) | Partial (`setContentPropertyValue` exists). Callers still pull raw handles. | Batch B |
| S7 | `cognosHost` CSS catalog | Seed only. Still outside: PDF spinner, actionBar, `ba-common-tabList*`, `.page.*`. | Batch B (now / later / on-touch) |
| S8 | Size split: tabs `traverseTabs` / `createTabsController` / `reduceTabsAction` | All still >300 lines. Mechanical, verb-named. No gallery. | SHOULD |
| S9 | Size split: `syncFrameworkViewFromState.js` (~336) | Gallery `buildControlPrimitiveGallery.js` (~715) stays **DEFERRED**. Preserve S-listeners if you must touch gallery (default: do not). | SHOULD |
| S10 | `waitForFilterInventory` untracked timeouts | `setTimeout` not on `runtime.timers`; abort does not clear. | SHOULD (leak hygiene) |
| S11 | `readDockRoot` consistent use | Shared helper exists; 4 local `resolveDockRoot` in filterDock + extra bypasses in dienststelle/SSS. | SHOULD |
| S12 | `cloneSerializable` → `core/utils` | Many copies; catch `undefined` vs original-ref. Unify **return semantics** explicitly. Overlaps widget polish B2/S2. | SHOULD; one WP |
| S13 | `writeVerifiedSelection` adoption | Only SS uses it. Restore/resync/clear still clone `rollbackHostWrite`. | SHOULD |
| S14 | metricsTree reducer `Date.now` fallback | Controller already stamps payloads. Not an S-P0. | MAY |
| S15 | dragDrop avatar / `document.body` template mount | Unverified leftover leak. Destroy finishes session; template `hideSpotEl` fallback may remain. | MAY; evidence first |
| S16 | `widget_removed` has no replay handler | Committed; `collectReplayHandlers` has drop/transfer/move/resize only. | contract |
| S17 | Per-module Cognos adapters | Only tabs + metricsTree dragDrop today. **Only where Cognos is actually hit.** No ceremonial adapters. | Batch B / on-touch |
| parkS | Park Track S-rem | Record as-built. | — |

**Batch C hygiene** (disposed convention, dispatch return-shape, action-name
constants, ceremonial reducers, `collectReplayHandlers` self-register vs
central list): **do not start** until PO answers Batch C. Live split is real
(widgetVis/settings/topN/datatable `ok: true`+skipped/aborted; widgetBase/
launchpad `ok: false`; widgetText now `ok: false`+skipped). Overlaps widget
polish D1/F1.

**Do not put on the worklist:** R1–R3, kennzahlDefaults re-shard, writeback
re-split, healthy controller rewrites, mass-`handle*` rename.

---

## 5. Polish — only if PO names it or a trigger fires

Follow-ups in `contracts/futureTodo/widget*-cleanup-*.md` and
`dienststelle-filterDock-cleanup-backlog.md`. Each item: own CP-1 + GO.
Do not opportunistically “while here”.

### Triggers that **are** met (2026-08-17 live)

| File | Lines | Why grown | Constraint |
|---|---|---|---|
| `widgetSettings/view/bindWidgetSettingsPanel.js` | **207** | Track S timer registry | LOCKED S-file. Split **by job**, keep timer registry + cleanup. |
| `widgetVis/effects/gates/topNGate.js` | **184** | Track S `rejectAllTopNGateWaiters` | LOCKED S-file. Keep reject-before-wipe. |
| `widgetVis/view/legend/installLegendTextObserver.js` | **161** | post-02:00 | Not an S-lock. |
| `widgetVis/view/legend/legendCaptionDom.js` | **157** | post-02:00 | Not an S-lock. |

`routeDienststelleDispatch.js` is **148** — trigger **not** met.
`evaluateObservedDockState.js` is still **90 / 6 AMD**.

### Still-open polish ids (unchanged except noted)

- widgetBase **B1–B7** (legacy widgets-key teardown = **closed** by Track S).
- widgetTopN **F1–F5** (F4 PARTIAL: apply type is `"TopN"`; Cognos id still `"List"`).
- widgetSettings **S1–S7**.
- widgetVis **D1, D2, D4, D5**.
- Binding Phase 3 / Apply Tier C (normalize unify = high risk; keepexclude is
  still apply-local — R6 did **not** hoist it onto `cognosAPI`).
- dienststelle/filterDock **2.1–2.6** (SCOPE_BUCKETS 3×; 4 local
  `resolveDockRoot`; observation still flat). Overlap S11.
- Cross-cutting: disposed-dispatch (Batch C), `cloneSerializable` (S12),
  `isDefaultTopNChoice` vs `isDefaultTopN` (three slightly different
  predicates).

---

## 6. Other documented leftovers (MAY / docs — not a secret third track)

Only if PO names them:

- v0/v1 map needs real DWH samples (`writeback.md` Open Decision 3).
- Readability on-ramp never created (`jsModuleMap.md`, `domainGlossary.md`,
  `userFlows.md`, `contracts/INDEX.md`).
- Contract-fold: `properties.md` Draft; `widgetSettings.md` still titled STUB;
  `historyService-writebackRestore-contractdelta.md` still Draft while
  begin/finish exist. Docs only — no behaviour WP.
- `kdbControl` `controlDefinitions[]` / `hierarchyDataService` —
  `openDesignCandidates.md`; trigger not met.
- Eight `*Support.js` — grandfather; rename only on-touch of that file.

---

## 7. Process

1. Planner: this prompt + live files. Confirm T2/S/R/R6 closed from §0.
   Present **§3 + §4 pick-list**. **STOP.**
2. After PO pick: if product or Cognos-adjacent → compact contract delta.
   **STOP** for GO. If mechanical size-split of S8/S9 with no Cognos change →
   allowlist + line-count before/after is enough; still STOP for GO.
3. Cursor grok 4.6 implements **one** WP with an exclusive file allowlist.
   No two agents on the same file. Preserve §0 S-invariants on every touch.
4. Planner reviews the diff (do not accept blind). ReadLints. Caller grep.
5. STOP for PO Cognos if the WP touches host behaviour.
6. Append `architecture/structure-remediation-log.md` for S-rem WPs only.
   For Track P: as-built note on the owning futureTodo / contract delta.
7. Repeat, or park.

Line budget: JS executable ≤150, orchestrator ≤120, controller fn ≤60,
≤10 AMD imports. **Pure data** config may exceed 150. Prefer one approved
~160-line coordinator over a new 20-line Support file. No new
`helpers/` `common/` `misc/` `shared/`. No new leftover suffixes
(`Support`/`Helpers`/`Shared`/`Internals`). No new `_KDB.*` without PO.

---

## 8. FORBIDDEN

- Reopening T0 / T1 / T2 / WP5 merge / canvas-discovery / `sichtChange`.
- Reopening Track S teardown/timer/destroy sites “to make them nicer”.
- Re-deleting R0 files; deleting live `writeLifecycle` (settings/datatable).
- Re-sharding `kennzahlDefaults`; writeback monolith re-split; gallery split
  without PO.
- Treating remaining-issues Batch 1 thick-wrapper bullets or v2-skeleton as
  open work.
- Mixing Track P product with Track S-rem size/Cognos in one WP.
- Mixing Cognos behaviour with cosmetic renames in the same diff.
- widgetBase `tabMutationRun` adopt; NMS `popupReady` on `OWNER_ROUTE_MAP`;
  dragDrop rebind-poll “fix”; ceremonial SS reducer rewrite.
- New `_KDB.*`, `.mdc` edits, third full audit, updating
  `structure-audit.md` / `structure-audit-2.md`.
- Inventing a fourth backlog file. Point at existing futureTodo / contracts.
- Flattening NMS dest-skip into DS/SS apply-fail.
- SET diagnostic codes inside tab-mutation.

---

## 9. Suggested default (captain → PO; not auto-start)

If PO does not pick a number, recommend **in this order** and still wait:

1. **S8** tabs size-split (mechanical, high scan-pain, no product).
2. **S9** `syncFrameworkViewFromState` split (gallery still deferred).
3. **S10** `waitForFilterInventory` timer registry (small leak hygiene).
4. Then PO chooses one Track P item (P5 tabs-history rest, P3/P4 readiness,
   P6 shell-create, P7 dataSourceContext, or P1 T3 if they want folders).
5. File-size polish on the four files in §5 only if PO wants a dedicated
   settings/vis split WP — preserve S-invariants on the two LOCKED files.

SUCCESS: each picked item is implemented under a contract (or explicit
mechanical allowlist) + Cognos where needed, or explicitly parked. Working
tree is not a mixed overdesign. S/R/T2 invariants still hold.
