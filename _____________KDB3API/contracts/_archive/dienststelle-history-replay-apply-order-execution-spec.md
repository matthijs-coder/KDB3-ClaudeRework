# Execution Spec: `dienststelle` (history replay apply order + Cognos scope stability)

> Bugfix tranche: undo/redo fails after global clear + tab default commit because Cognos sticky pageContext, weak clear API, fixed global-first apply order, and no post-write host stability wait.
> Builds on completed tranche `dienststelle-history-replay-finalization-execution-spec.md` (host-read `old` snapshot, deferred view sync). No contract delta; completes existing `dienststelle.md` §11.1, §13, sticky-restore §614–619.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/dienststelle.md`
**Phase:** `incremental bugfix — history replay Cognos apply discipline`
**Authoring AI:** mid-tier orchestrator, 2026-06-05
**Executing AI:** `<assigned by reviewer>`
**Reviewer:** `user / supervising AI`

---

## Section A. Pre-flight read list

The executing AI must read each file below in order before editing. First response must echo one concrete sentence per item. Stop if any summary is generic.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — Cognos host reads/writes via `_KDB.cognosAPI.filters`; no legacy globals.
2. `_____________KDB3API/.cursor/rules/state.mdc` — replay snapshots are serializable; apply helpers write Cognos only, not foreign state.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — stability waits use `_KDB.utils.waitFor` or local Promise timing; no new observers.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no API shape change; disposed-state guards unchanged.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — extract small focused helpers; keep entry bodies thin.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names; boundary `_` prefix on AMD imports.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — Cognos write/clear failures log and return blockers; do not throw through public dispatch.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no DOM changes in this tranche.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — full-compact AMD; factory-scope helpers; no inline subfunctions in entry bodies.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle terms.
12. `_____________KDB3API/contracts/dienststelle.md` — §11.1 S1–S6, §13 replay, sticky restore §614–619, scope-empty host-read §561–567.
13. `_____________KDB3API/contracts/dienststelle-history-replay-finalization-execution-spec.md` — prior tranche; do not regress host-read `old` or deferred view sync.
14. This execution spec.

Echo must also confirm:

- **Not** a full re-port; minimal diff only.
- **Root cause (confirmed):** replay always applies **global → pageContext** with `replaceFilterContext([])` only; Cognos keeps sticky sibling pageContext when global is set first; reconcile `"sync"` then re-reads stale/default tab values.
- **User-approved direction:** when target is **global non-empty + tabs empty**, apply **pageContext clears first**, then global; use shared clear API + bounded stability wait between phases.

---

## Section B. Immutable decisions

| Topic | Decision |
|---|---|
| Apply order | **Conditional two-phase** apply derived from replay target snapshot (not fixed global-first) |
| Sticky Cognos | Respect contract §614–619: do **not** port REDESIGN2 sticky forcing; **do** explicitly clear pageContext in Cognos before restoring global dominance when target tabs are `[]` |
| Clear API | Extract shared single-scope clear using `clearPageContextFilter` → fallback `replaceFilterContext([])` + post-clear host verify (same semantics as `clearDienststelleHostFilter`) |
| Stability wait | After each **phase** (batch of scope writes), wait for host-stable reads via `_KDB.utils.waitFor` with tight timeout; pattern evidence from REDESIGN2 `waitForStableScopeValues` (2 stable reads, bounded attempts) |
| Defaulting on replay | Unchanged: `isHistoryReplay` + no `allowDefaulting` — replay must not run user-commit defaulting |
| Reconcile after replay | Keep existing reconcile call; stability waits happen **before** reconcile starts so sync reads settled Cognos |
| Contract | No `dienststelle.md` edit |
| Scope | One tranche; dienststelle module only; no filterDock / sicht / historyService / bootstrap |
| Symmetric `new` snapshot | **Out of scope** for this tranche (owner-only `new` remains); separate follow-up if needed |
| Reconcile trust-snapshot | **Out of scope** unless CP-2 smoke still fails after apply-order + clear + wait; then escalate |

### Apply-order matrix (immutable)

Let `hasGlobal = valuesByScope.global.length > 0`.

Let `allTargetTabsEmpty = every explicit key in valuesByScope.pageContext is []` (missing `pageContext` object or `{}` counts as “no tab values in target”).

Let `anyTargetTabHasValue = some pageContext[key].length > 0`.

| Target shape | Phase 1 | Phase 2 | Rationale |
|---|---|---|---|
| `hasGlobal && allTargetTabsEmpty` | **pageContext** (clear/apply each tab per snapshot) | **global** (set value) | Wipe sticky/suppressed sibling tab storage while tabs still addressable; then set global dominance |
| `!hasGlobal && anyTargetTabHasValue` | **global** (clear) | **pageContext** (set/clear per snapshot) | Clear global first so Cognos-native restore/default on tabs is not hidden behind stale global |
| Otherwise (mixed: global + tab values, or both empty) | **global** | **pageContext** | Preserve existing safe default for mixed snapshots |

Within each phase: scopes run **sequentially** (Promise chain), same as today.

After **each phase** completes all scope writes in that phase: run stability wait for **every scope touched in that phase** before starting the next phase.

---

## Section C. Folder tree

Modify or create only:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/
  effects/
    clearDienststelleFilterScope.js          (new — shared single-scope clear)
    resolveDienststelleReplayApplyOrder.js   (new — phase order from snapshot)
    waitForStableDienststelleScopeValues.js  (new — bounded host stability wait)
    applyStoredDienststelleScopeValues.js    (modify — phases, shared clear, waits)
    clearDienststelleHostFilter.js           (modify — delegate to shared clear)
    handleDienststelleHistoryReplay.js       (modify — minor: target fallback fix)
```

Do **not** modify: filterDock, sicht, historyService, rules, templates, legacy trees, CSS, `scheduleDienststelleViewSync.js`, `readDienststelleConfirmHistorySnapshot.js`.

---

## Section D. Mapping table

| Production file | Legacy / evidence | Rule-alignment note |
|---|---|---|
| `clearDienststelleFilterScope.js` | Extract from `clearDienststelleHostFilter.js` `clearScope` / `clearFilterApi` | Single-scope clear + verify; used by replay and host-filter clear |
| `resolveDienststelleReplayApplyOrder.js` | User sticky-native investigation + contract S1/S3/S4 | Pure function; no Cognos I/O |
| `waitForStableDienststelleScopeValues.js` | REDESIGN2 `waitForStableScopeValues` | Uses `_KDB.utils.waitFor`; tight timeout per contract §566 escalation shape |
| `applyStoredDienststelleScopeValues.js` | Current global-first chain lines 92–127 | Replace with phased apply + waits |
| `clearDienststelleHostFilter.js` | Existing | Thin wrapper; calls shared clear per scope |
| `handleDienststelleHistoryReplay.js` | Line 45 `step.new` fallback | Fix fallback to avoid wrong target if `targetValue` missing on undo |

---

## Section E. Per-file specifications

### `effects/clearDienststelleFilterScope.js` (new)

- **Role:** shared Cognos clear for one Dienststelle scope (global or pageContext).
- **Lines:** target 70–95, hard limit 120.
- **AMD imports:** `./readDienststelleHostSelection.js`
- **Exports:**
  - `clearDienststelleFilterScope(_KDB, _activeFilterKey, _scopeId, _filtersApi)`
    - `_scopeId === "global"` → global API lookup.
    - Else → pageContext lookup with raw scope id.
- **Behavior:**
  1. Resolve `filterApi` via `lookupFilterApi`; if missing return `{ ok: true, skipped: true, remaining: false }` (unchanged semantics for missing API).
  2. If `clearPageContextFilter` exists **and** scope is pageContext → call it; on failure fallback `replaceFilterContext([])`.
  3. If global or no `clearPageContextFilter` → `replaceFilterContext([])`.
  4. Re-read host via `readFilterValues`; set `remaining: !!selection`.
  5. Return `{ ok: !remaining, remaining: remaining, blocker: remaining ? "COGNOS_SCOPE_CLEAR_REMAINING" : null }`.
  6. Catch errors → log `[dienststelle.clearDienststelleFilterScope]`, return `{ ok: false, blocker: "COGNOS_CLEAR_FAILED" }`.
- **Rules:** `error-handling.mdc`, `amd.mdc`, `kdb-object.mdc`.

---

### `effects/resolveDienststelleReplayApplyOrder.js` (new)

- **Role:** pure helper — derive phased apply order from replay target snapshot.
- **Lines:** target 45–65, hard limit 80.
- **AMD imports:** none (or `[]` only).
- **Export:** `resolveDienststelleReplayApplyOrder(_valuesByScope) → { phases: ["pageContext"|"global", ...], hasGlobal, allTargetTabsEmpty, anyTargetTabHasValue }`
- **Behavior:** implement matrix from Section B exactly.
  - `allTargetTabsEmpty`: true when `pageContext` missing/`{}` **or** every key maps to `[]`/missing entries.
  - Empty `global` array means `hasGlobal === false`.
- **Rules:** `amd.mdc`, `naming.mdc`.

---

### `effects/waitForStableDienststelleScopeValues.js` (new)

- **Role:** wait until Cognos host read for a scope matches expected shape (stable reads).
- **Lines:** target 80–110, hard limit 130.
- **AMD imports:** `./readDienststelleHostSelection.js`
- **Constants (factory scope):**
  - `REQUIRED_STABLE_READS = 2`
  - `POLL_INTERVAL_MS = 50`
  - `TIMEOUT_MS = 2000` (per scope; do not exceed 3000)
- **Export:** `waitForStableDienststelleScopeValues(_KDB, _activeFilterKey, _scopeId, _filtersApi, _expected)`
  - `_expected`: `{ mode: "empty" }` or `{ mode: "values", values: [...] }` (compare `useValue` of first entry for hierarchy single-select; empty means `readFilterValues` is null/empty).
- **Implementation:** use `_KDB.utils.waitFor` when available; if missing, degrade to single immediate read (log once `[dienststelle.waitForStableDienststelleScopeValues] waitFor missing`).
  - Predicate: N consecutive reads match expected (track stable count across waitFor iterations).
  - On timeout: return `{ stable: false, lastObserved: ... }` — caller treats as non-fatal warning unless phase is critical (see applyStored).
- **Rules:** `runtime.mdc`, `error-handling.mdc`, contract §566 (tight timeout, no legacy 10s polling).

---

### `effects/applyStoredDienststelleScopeValues.js` (modify)

- **AMD imports (add):**
  - `./clearDienststelleFilterScope.js`
  - `./resolveDienststelleReplayApplyOrder.js`
  - `./waitForStableDienststelleScopeValues.js`
- **Remove:** inline `clearScopeValues` using only `replaceFilterContext` (replace with shared clear).
- **Entry:** `applyStoredDienststelleScopeValues(_KDB, _snapshot)` — signature unchanged.

**Refactored behavior:**

1. Validate snapshot + `filtersApi` (unchanged).
2. `order = resolveDienststelleReplayApplyOrder(valuesByScope)`.
3. For each `phase` in `order.phases`:
   - **If phase === `"global"`:** run `applyScopeValues` for global once (set or clear via shared clear when `[]`).
   - **If phase === `"pageContext"`:** for each key in `Object.keys(pageContext)` sequentially, run `applyScopeValues` for that scope.
   - Collect `touchedScopes` list for this phase.
   - **Phase stability wait:** for each scope in `touchedScopes`, call `waitForStableDienststelleScopeValues` with expected derived from snapshot target for that scope.
   - If any wait returns `stable: false` for a **clear** target (`[]`): `console.warn` with scope id; continue (do not abort entire replay unless shared clear returned `ok: false`).
   - If shared clear returns `ok: false` with blocker → return `{ applied: false, blocker }` immediately.
4. Return `{ applied: true }`.

**`applyScopeValues` rules:**

- Non-empty values → `replaceFilterContext(cognosValues)` (unchanged).
- Empty → delegate to `clearDienststelleFilterScope`.
- Global empty clear uses same shared helper (`scopeId "global"`).

**Do not** iterate tabs absent from snapshot keys (unchanged from prior tranche); host-read `old` snapshots already include all tabs explicitly.

- **Lines:** target 140–180, hard limit 200.
- **Rules:** `amd.mdc`, `error-handling.mdc`, `feature-structure.mdc`.

---

### `effects/clearDienststelleHostFilter.js` (modify)

- **Change:** import `clearDienststelleFilterScope.js`; replace local `clearScope` / `clearFilterApi` / `tryReplaceEmpty` with shared helper.
- **Preserve:** public export `clearDienststelleHostFilter`, aggregate result shape `{ ok, clearedCount, failedScopes, remainingScopes }`, global-then-tabs sequential order (this path is **inactive variant / full clear**, not replay order matrix).
- **Lines:** should shrink; hard limit 100.
- **Rules:** `amd.mdc` — DRY without behavior change for existing callers.

---

### `effects/handleDienststelleHistoryReplay.js` (modify)

- **Change line ~45:** remove incorrect fallback to `step.new` when `targetValue` is missing. Use:

```js
var target = payload.targetValue;
if (target == null && payload.step) {
  target = payload.step.old; // history service always passes targetValue; defensive only
}
```

  Do **not** fall back to `step.new` (would make undo a no-op).

- No other behavior change in this tranche.
- **Rules:** `module-public-api.mdc`.

---

## Section F. Acceptance criteria (AC)

| ID | Criterion |
|---|---|
| AC1 | **Undo** after global clear + OK (tabs auto-default): restores **global** prior value and **clears tab defaults** in Cognos + owner state. |
| AC2 | **Redo** after AC1 undo: re-applies global empty + tab defaults (one step, no extra push). |
| AC3 | Apply order for AC1 undo uses **pageContext phase before global phase** (verifiable via temporary `console.info` log `[dienststelle.replayApplyOrder]` with phases array — **remove log before handoff** or gate behind single debug flag default off; prefer one info line kept for CP-2 only if reviewer requests — default: **no permanent log**, verify by code inspection). |
| AC4 | PageContext clears on replay use `clearPageContextFilter` when available (code inspection). |
| AC5 | Prior tranche AC intact: host-read `old` snapshot, deferred view sync on replay, DEZPV sanitize after undo/redo. |
| AC6 | `clearDienststelleHostFilter` behavior unchanged for inactive-variant / full clear callers. |
| AC7 | No new events, no API shape change, no foreign state writes. |
| AC8 | `ReadLints` clean on all touched files. |

### Manual smoke checklist (reviewer / user)

1. BW active; set global Dienststelle (e.g. MAG); clear global; OK → tabs receive default.
2. **Undo** → global MAG back, **tabs empty** (not default MAG).
3. **Redo** → global empty, tabs default again.
4. Optional sticky scenario: global value A, tab sibling value B (hidden); clear global; OK; undo → global A restored, tab empty (no sticky B reappearing).
5. DEZPV: repeat 1–3; committed display sanitized after undo/redo.
6. No duplicate history steps on single OK.

---

## Section G. Anti-regression (D1 / D2 / R10)

- Do **not** weaken try/catch on `mount`/`destroy` in controller.
- Do **not** skip subscription/abort cleanup in `destroy`.
- Disposed-state guards on public methods remain intact.
- Do **not** add Dienststelle-owned MutationObserver.
- Do **not** port REDESIGN2 `scanNonEmptyPageContexts`, `pageContextStickyByScopeId`, or `pageRestoredAfterGlobalClear` forcing.

---

## Section H. Forbidden actions

- Modify `_____________KDB3API/contracts/dienststelle.md` or `.mdc` rules.
- Modify filterDock, sicht, `KDB.js` bootstrap, historyService internals.
- Port legacy 10-second OK polling or full REDESIGN2 reconcile pipeline.
- Introduce new events or `_KDB.state` subtrees.
- Read or edit `_______KDB3/`, `_______REDESIGN2/`, `laatsteOriginal/` except read-only evidence already cited.
- Change `readDienststelleConfirmHistorySnapshot`, `maybePushDienststelleHistoryStep`, or symmetric `new` snapshot in this tranche.

---

## Section I. Reporting template (executing AI)

1. Pre-flight echo (14 items).
2. File checklist with line counts.
3. Deviations with rule citations.
4. AC1–AC8 pass/fail (code inspection; note manual smoke pending user).
5. State observed apply phase order for undo scenario (pageContext → global).
6. Note if reconcile trust-snapshot follow-up recommended after CP-2.

---

## Section J. Reviewer handoff (CP-2)

1. Verify pre-flight echo.
2. Read `resolveDienststelleReplayApplyOrder.js` — matrix matches Section B.
3. Read `applyStoredDienststelleScopeValues.js` — phased loop + per-phase stability waits.
4. Confirm shared clear used for replay and `clearDienststelleHostFilter`.
5. Confirm `handleDienststelleHistoryReplay` no longer falls back to `step.new`.
6. `ReadLints` on touched files.
7. User runs manual smoke checklist (Section F).

### CP-2 escalation trigger

If AC1 still fails after this tranche, next spec **must** consider:

- reconcile skip or snapshot-trust path when `isHistoryReplay === true`;
- symmetric host-read `new` snapshot on push;
- single retry on phase stability timeout.

---

> End of execution spec.
