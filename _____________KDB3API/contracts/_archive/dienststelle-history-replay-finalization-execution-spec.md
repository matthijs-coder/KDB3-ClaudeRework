# Execution Spec: `dienststelle` (history replay finalization fix)

> Bugfix tranche: history push after default-on-empty commit + DEZPV committed display sanitizing after undo/redo.
> Implements agreed fix directions A+B (Bug 1) and A (Bug 2). No contract delta; aligns with existing `dienststelle.md` §8 and §11.1 / §13.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/dienststelle.md`
**Phase:** `incremental bugfix — history replay finalization`
**Authoring AI:** mid-tier orchestrator, 2026-06-05
**Executing AI:** `<assigned by reviewer>`
**Reviewer:** `user / supervising AI`

---

## Section A. Pre-flight read list

The executing AI must read each file below in order before editing. First response must echo one concrete sentence per item. Stop if any summary is generic.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — Cognos host reads/writes via `_KDB.cognosAPI.filters`; no legacy globals.
2. `_____________KDB3API/.cursor/rules/state.mdc` — history snapshots are serializable; host reads for snapshot capture do not write foreign state.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — deferred rAF handles live under existing buckets or local closure only; no new observers.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no API shape change; disposed-state guards unchanged.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — small focused files; extract helper if needed.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names; boundary `_` prefix on AMD imports.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — host-read snapshot failures log and fall back; replay clear failures log, do not throw through public API.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — display sync only mutates approved filterDock text nodes; no live refs in state.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — full-compact AMD; factory-scope helpers; no inline subfunctions in entry bodies.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle terms.
12. `_____________KDB3API/contracts/dienststelle.md` — §8 display defer, §11.1 history option A, §13 replay discipline.
13. This execution spec.

Echo must also confirm:

- **Not** a full re-port; minimal diff only.
- **Bug 1 root cause:** user-confirm `old` snapshot from KDB state only → `old ≈ new` → no `pushCommittedStep` → undo does nothing.
- **Bug 2 root cause:** history replay calls committed display sync immediately; manual confirm uses 4× rAF defer.

---

## Section B. Immutable decisions

| Topic | Decision |
|---|---|
| Bug 1 fix A | Capture **host-read** pre-commit snapshot for user OK before reconcile |
| Bug 1 fix B | Replay must **clear** Cognos scopes when snapshot values are `[]` or scope is explicitly empty |
| Bug 2 fix A | History replay uses **same bounded rAF defer** as user confirm for committed display sync |
| Bug 2 fix B | Optional single retry if first deferred sync returns `didSync: false` (only if needed after implementation) |
| Contract | No `dienststelle.md` edit; behavior completes existing §8 / §11.1 / §13 |
| Scope | One tranche; no filterDock / sicht / bootstrap / widget changes |
| History option A | Auto-default remains part of same user commit step; one push only |

---

## Section C. Folder tree

Modify or create only:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/
  effects/
    readDienststelleConfirmHistorySnapshot.js   (new)
    applyStoredDienststelleScopeValues.js         (modify)
    scheduleDienststelleViewSync.js               (new — extract from runDienststelleReconcile)
    runDienststelleReconcile.js                   (modify — import shared scheduler)
    handleDienststelleHistoryReplay.js            (modify — use shared scheduler)
    routeDienststelleDispatch.js                  (modify — host snapshot for old)
  history/
    maybePushDienststelleHistoryStep.js           (modify — skip diagnostic log)
```

Do **not** modify: filterDock, sicht, historyService, rules, templates, legacy trees, CSS.

---

## Section D. Mapping table

| Production file | Legacy / evidence | Rule-alignment note |
|---|---|---|
| `readDienststelleConfirmHistorySnapshot.js` | REDESIGN2 `getConfirmedHierarchySnapshot` (host reconcile); contract §11.1 option A | Host-read snapshot helper; uses existing `readDienststelleHostSelection` + `listDashboardTabScopeIds`; AMD factory-scope pure read |
| `routeDienststelleDispatch.js` | `runUserConfirmReconcile` old capture | Replace `_readDependencySnapshot` with host confirm snapshot for `oldSnapshot` only; `new` stays post-reconcile state snapshot |
| `maybePushDienststelleHistoryStep.js` | Investigation: lines 34–35 skip push silently | Add one `console.info` when push skipped because snapshots equal (include activeFilterKey); do not push duplicate steps |
| `applyStoredDienststelleScopeValues.js` | `clearDienststelleHostFilter.js` clear pattern | Empty/missing values → clear scope in Cognos, not no-op skip; reuse replace/clear from clear helper logic |
| `scheduleDienststelleViewSync.js` | `runDienststelleReconcile.js` defer block | Extract `USER_CONFIRM_DEFER_FRAMES = 4` scheduling; replay uses `source: "historyReplay"` with same defer |
| `runDienststelleReconcile.js` | existing | Import shared scheduler; remove duplicated defer helpers |
| `handleDienststelleHistoryReplay.js` | contract §8 manual commit defer | Replace immediate `_syncView(_KDB, null)` in `finalizeHistoryReplay` with shared deferred sync |

---

## Section E. Per-file specifications

### `effects/readDienststelleConfirmHistorySnapshot.js` (new)

- **Role:** effect helper — host-read history snapshot at user confirm boundary.
- **Lines:** target 90–120, hard limit 150.
- **AMD imports:**
  - `../state/selectors.js`
  - `./readDienststelleHostSelection.js`
  - `./listDashboardTabScopeIds.js`
- **Entry function:** `__controller(_KDB)`
- **Return shape** (must match `buildCommittedStep` / `readDienststelleSnapshot`):

```js
{
  activeSichtValue,
  activeFilterKey,
  visibleFilterLabel,
  valuesByScope: {
    global: [{ displayValue, useValue, source: "cognos" }],
    pageContext: {
      "<scopeId>": [] | [values]
    }
  }
}
```

- **Behavior:**
  1. Read context fields from `_selectors.readActiveDienststelleContext(_KDB)`.
  2. If no `activeFilterKey`, return `null`.
  3. Host-read global: `lookupFilterApi(..., "global")` + `readFilterValues`; map via existing normalize helper pattern (`normalizeCognosDienststelleSelection` or inline equivalent `{ displayValue, useValue, source: "cognos" }`).
  4. For **every** dashboard tab from `listDashboardTabScopeIds(_KDB)`, host-read pageContext scope; include entry in `pageContext` even when empty (`[]`).
  5. Do **not** write `_KDB.state`; read-only.
  6. On host-read failure for a scope, treat as `[]` and `console.warn` once per scope with boundary tag.

- **Rules to apply:**
  - `amd.mdc` — single define, factory-scope helpers, no inline subfunctions in entry.
  - `state.mdc` — read-only; no state mutation.
  - `error-handling.mdc` — warn on host-read failure; return best-effort snapshot.
  - `naming.mdc` — `read*` prefix, English identifiers.

---

### `effects/routeDienststelleDispatch.js` (modify)

- **Change:** In `runUserConfirmReconcile`, replace:

```js
var oldSnapshot = _readDependencySnapshot(_controller._KDB);
```

with host confirm snapshot from new module:

```js
var oldSnapshot = _readConfirmHistorySnapshot(_controller._KDB);
```

- Add AMD import for `./readDienststelleConfirmHistorySnapshot.js`.
- Keep `_readDependencySnapshot` import only if still used elsewhere in file; remove if unused.
- **Do not** change handoff routing, inactive variant guard, or reconcile options.

- **Rules to apply:**
  - `amd.mdc` — update imports only.
  - `module-public-api.mdc` — dispatch surface unchanged.

---

### `history/maybePushDienststelleHistoryStep.js` (modify)

- **Change:** When `areSnapshotsEqual(_oldSnapshot, newSnapshot)` is true, before return:

```js
console.info("[dienststelle.history] push skipped: old equals new", {
  activeFilterKey: newSnapshot && newSnapshot.activeFilterKey
});
```

- Do not change push logic otherwise.

- **Rules to apply:**
  - `error-handling.mdc` — informational log only; not an error.

---

### `effects/applyStoredDienststelleScopeValues.js` (modify)

- **Change `applyScopeValues`:** When `_values` is missing, not an array, or length `0`, **clear** the scope instead of returning `{ ok: true }` no-op:

  1. Resolve filter API via `lookupFilterApi`.
  2. If no API, return `{ ok: true }` (nothing to clear).
  3. Call `replaceFilterContext(filterApi, [])` or reuse clear logic from `clearDienststelleHostFilter` (prefer importing a small shared `clearScopeValues` helper at factory scope in this file to avoid circular deps — do **not** import entire `clearDienststelleHostFilter` if it creates import cycle; duplicate minimal clear path is acceptable if ≤15 lines).

- **Global scope:** empty `valuesByScope.global` must clear global Cognos filter.

- **PageContext:** For replay target snapshot:
  - Apply/clear every key in `valuesByScope.pageContext`.
  - Additionally iterate all dashboard tab scope ids; if a tab is absent from snapshot `pageContext` but replay semantics require "was not defaulted yet", **do not** clear unless snapshot explicitly includes the scope. (Undo `old` snapshot from fix A will include all tabs with explicit `[]`.)

- **Rules to apply:**
  - `error-handling.mdc` — catch Cognos clear failures, log `[dienststelle.applyStoredDienststelleScopeValues]`, return blocker.
  - `amd.mdc` — helpers at factory scope.

---

### `effects/scheduleDienststelleViewSync.js` (new)

- **Role:** shared view-sync scheduler extracted from `runDienststelleReconcile.js`.
- **Lines:** target 70–100, hard limit 120.
- **AMD imports:**
  - `../view/syncDienststelleViewFromState.js`
  - `../view/syncDienststelleFilterDockNames.js`
  - `../state/selectors.js` (if needed for pageContext follow-up sync)
- **Export:** `scheduleDienststelleViewSync(_KDB, _context, _reconcileResult)`
- **Constants:** `USER_CONFIRM_DEFER_FRAMES = 4` (unchanged).
- **Defer triggers:**
  - `context.source === "user"` && `context.viewSyncHandoff` → 4× rAF defer (existing behavior).
  - **NEW:** `context.source === "historyReplay"` → same 4× rAF defer, handoff `null`, then run committed sync on both buckets (same as `runLifecycleViewSync` with null handoff + optional pageContext follow-up when resolution indicates pageContext-only dominance).
- **Immediate sync** for other sources unchanged (`tableData`, `sync`, etc.).

- **Rules to apply:**
  - `dom.mdc` — sync functions only; no state writes.
  - `amd.mdc` — extract, do not duplicate defer logic in two files.

---

### `effects/runDienststelleReconcile.js` (modify)

- **Change:** Remove local `runDeferredLifecycleViewSync`, `scheduleViewSyncAfterReconcile`, `runLifecycleViewSync`, `needsPageContextCommittedSyncAfterGlobalConfirm` if moved to shared module (keep in shared file).
- Import and call `_scheduleDienststelleViewSync(_KDB, context, _reconcileResult)` in `.then` after reconcile.
- No behavior change for user confirm path except code location.

- **Rules to apply:**
  - `amd.mdc` — reduce file size via extraction.

---

### `effects/handleDienststelleHistoryReplay.js` (modify)

- **Change `finalizeHistoryReplay`:**
  - Remove immediate `_syncView(_KDB, null)`.
  - After `HISTORY_REPLAY_APPLIED` dispatch and `_syncFilterDockNames`, call:

```js
_scheduleDienststelleViewSync(_KDB, {
  source: "historyReplay",
  isHistoryReplay: true,
  observedAt: Date.now()
}, _reconcileResult);
```

- Import `./scheduleDienststelleViewSync.js`.
- Optional retry (fix B): if shared scheduler exposes sync result and `didSync === false`, schedule one additional deferred pass — only implement if first pass insufficient in self-verification; prefer defer alone first.

- **Rules to apply:**
  - `error-handling.mdc` — existing catch boundary unchanged.
  - `module-public-api.mdc` — replay must not push new history step (unchanged).

---

## Section F. Acceptance criteria (AC)

| ID | Criterion |
|---|---|
| AC1 | User global clear + OK with empty selection pushes **one** `filter_dienststelle` step when defaults are applied to pageContext tabs. |
| AC2 | After AC1 scenario, **Undo** restores prior global selection and removes tab defaults (Cognos + owner state align). |
| AC3 | **Redo** after undo re-applies the default-on-empty outcome. |
| AC4 | With active Sicht **DEZPV**, after undo from a commit that showed sanitized closed-filter text, committed display shows sanitized label (no raw `#`/`|` fragments). |
| AC5 | Manual user confirm display sync behavior unchanged (still 4× rAF defer). |
| AC6 | No new events, no API shape change, no foreign state writes. |
| AC7 | `ReadLints` clean on all touched files. |
| AC8 | When push is skipped, console shows `[dienststelle.history] push skipped: old equals new` (diagnostic only). |

### Manual smoke checklist (reviewer)

1. DEZPV active; set global Dienststelle; clear all; OK → tabs get defaults; verify Undo enabled and works.
2. Repeat; verify closed filter display sanitized before and after undo/redo.
3. BW active; confirm undo still works for non-sanitize path.
4. Verify no duplicate history steps on single OK.

---

## Section G. Anti-regression (D1 / D2 / R10)

- Do **not** weaken try/catch on `mount`/`destroy` in controller.
- Do **not** skip subscription/abort cleanup in `destroy`.
- Disposed-state guards on public methods remain intact.
- Do **not** add Dienststelle-owned MutationObserver.

---

## Section H. Forbidden actions

- Modify `_____________KDB3API/contracts/dienststelle.md` or `.mdc` rules.
- Modify filterDock, sicht, KDB.js bootstrap, historyService internals.
- Port legacy OK polling, sticky restore, or multi-scan from REDESIGN2.
- Introduce new events or `_KDB.state` subtrees.
- Read or edit `_______KDB3/`, `_______REDESIGN2/`, `laatsteOriginal/`.

---

## Section I. Reporting template (executing AI)

1. Pre-flight echo (13 items).
2. File checklist with line counts.
3. Deviations with rule citations.
4. AC1–AC8 pass/fail.
5. Note whether optional retry (Bug 2 B) was needed or omitted.

---

## Section J. Reviewer handoff (CP-2)

1. Verify pre-flight echo.
2. Read all touched files; confirm host snapshot includes all dashboard tab scope ids.
3. Confirm `applyStoredDienststelleScopeValues` clears empty scopes.
4. Confirm replay uses shared defer scheduler.
5. `ReadLints` on touched files.
6. User runs manual smoke checklist above.

---

> End of execution spec.
