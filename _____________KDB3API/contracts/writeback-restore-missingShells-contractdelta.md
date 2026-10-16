# Contract Delta: writeback restore — letter B (`missingShells` + page-context poll)

> Closes backlog §2.4 **only**. After T2-5c activate. **Do not fold C.
> Do not reopen 5c. Do not do G/H/D.** Two behaviors, one WP.

---

**Status:** `Approved — Cognos green 2026-08-18`
**Parent:** `contracts/writeback.md` §2.2 / §6.3–§6.6;
`widgetBase-lazyLaunchpadRouting-contractdelta.md`;
`tabs-parameterSetRestore-contractdelta.md` §5.2 (5c stays)
**Depends on:** T2-5c activate (click + 150ms + bounded canvas) — do not regress
**Type:** `feature module contract delta`
**Authoring AI:** captain / Grok 4.6, 2026-08-18
**Related:** `contracts/futureTodo/writeback-restore-deferred-backlog.md` §2.4

---

## 1. Purpose

After 5c, SET still lies in two one-shot gaps:

1. **B-shells.** widgetBase `missingShells > 0` keeps the tab unrouted/retryable,
   but ensure ack drops the count. SET records `tabWidgetsEnsureRouted`
   `ok: true` and continues to step 24. RestoreResult never shows the count.
2. **B-poll.** `runFilterRestore` still one-shots singleSelect page-context
   restore after activate; host miss → hard `WRITEBACK_TABS_TARGET_MISSING`.

This WP passes the count through, re-ensures a bounded number of times, and
polls page-context host registration **before** that hard fail. Timeout still
aborts `TARGET_MISSING`. Softening to degraded/success is **H** (forbidden).

---

## 2. PO decisions (B GO 2026-08-18)

| # | Choice | Decision |
|---|---|---|
| 1 | Letter | **B only.** SET restore honesty after T2-5c. Do not fold **C**. Do not reopen 5c. **G/H/D** out. |
| 2 | One WP | B-shells + B-poll together. Letter = “restore poll + missingShells in phase result”. |
| 3 | Leftover shells | Still `ok: true`, **`degraded: false`**. No `failPhase`. Do not flip SET `outcome` via `hasDegradedPhase()`. |
| 4 | `missingShells` | Number, default **0**. Count only. Ids out unless they fit the same `finishRoute` assign. |
| 5 | Diagnostic | Optional on the phase when count `> 0`. Existing non-degrading code. Prefer `WRITEBACK_SKIPPED_BY_DESIGN` + `details.missingShells` (do **not** pretend it is a tab traversal). `details.nonDegrading: true`. **No** new `errorCodes.js` enum (would also need writeback.md §8). |
| 6 | Re-ensure | While `missingShells > 0` and tab **not** marked routed: **1–2 extra** `widgetBase/ensureTabWidgetsRouted` dispatches. Reuse existing shell-presence wait inside ensure. **Not** `renderTabWidgetsRequested` / `waitFor: "widgetsRendered"` / per-widget paint. |
| 7 | `canvasReady` | writebackSet still consumes only `ok` (5c PO #9). |
| 8 | Poll timeout | Still `WRITEBACK_TABS_TARGET_MISSING` (**abort**). Never success-on-timeout. |
| 9 | Poll cap | **~2500ms** total extra **or 3 attempts** (5c order of magnitude). `AbortController`; `signal.aborted` after every await. `Date.now` in **effects only**. |
| 10 | Cognos | **Deferred.** Needs PO Cognos; do not stop the train. |

---

## 3. Live evidence (do not re-audit 5c)

- `handleEnsureTabWidgetsRouted.js` `mayMarkRouted`: `missingShells > 0` → not
  routed. `finishRoute` / `buildResult` drop the count (`normalizeDispatchResult`
  has no field; `handleRouteAllToLaunchpad` already assigns it **after** normalize).
- SET `ensureTabWidgetsRouted.js`: `result.ok === true` → `recordPhase(..., true,
  false)` and return; step 24 runs. `recordPhase` already **returns** the entry.
- `runFilterRestore.js`: step 18 activate (5c), then one-shot step 19 SS
  page-context. Host/scope miss → `WRITEBACK_TABS_TARGET_MISSING`.
- Inventory generation is **pinned** before activate — do **not** re-reconcile
  SS during the poll (`INVENTORY_STALE`).

---

## 4. B-shells (`tabWidgetsEnsureRouted`)

**widgetBase** `finishRoute` → `buildResult`: after `normalizeDispatchResult`,
assign `missingShells` (`readCount`, default 0). Same extra-field pattern as
`alreadyRouted`. `alreadyRouted: true` → `0`. Do not change
`normalizeDispatchResult.js`.

**SET** `ensureTabWidgetsRouted` on `result.ok === true`:

1. While `readCount(result.missingShells) > 0` and the tab is not marked
   routed, dispatch ensure again. Cap **2 extra** calls (3 total including
   the first). `run.assertStillCurrent()` after each await. `ok === false`
   stays today’s `failPhase` / cancel — no re-ensure on hard failure.
2. `recordPhase(PHASE_NAME, OWNER, true, false)`. Mutate the **returned
   entry**: `entry.missingShells = readCount(...)`. Do **not** add an extras
   arg to `recordPhase`. `buildRestoreResult` already copies `run.phases`.
3. When count `> 0`, optional phase diagnostic
   `WRITEBACK_SKIPPED_BY_DESIGN` + `details: { missingShells, tabIdx, tabId,
   nonDegrading: true }`. Copy to `run.diagnostics` with the same details so
   cleanup does not treat it as degrading.

Honest leftover: count may remain `> 0` after the cap. Still `ok: true`,
`degraded: false`. Continue to step 24.

---

## 5. B-poll (page-context host registration)

After the step-18 activate loop (5c path **unchanged**), **before** step-19
SS page-context restore, when `requiredPageTabIdx.length > 0`:

1. Bounded poll of **existing**
   `_KDB.cognosAPI.filters.getAllPageContextFilterItems` (or
   `getPageContextItemsArr(true)`). No new `_KDB.*`. No new events.
2. **Ready:** each required `tabIdx` has ≥1 page-context host item whose
   `getScope()` matches that tab’s live `scopeId` on `resolvedTargets`.
   Identity matching stays SS restore — poll is registration only.
3. Cap: `CAP_MS = 2500`, `MAX_ATTEMPTS = 3`. Local `AbortController`; abort
   timer + check `signal.aborted` after every await. Stale run → existing
   `assertStillCurrent` / `CANCELLED`. Missing filters API → not ready.
4. Ready → existing one-shot SS restore (and later pcfs/dstl as today).
5. Timeout / still missing → `WRITEBACK_TABS_TARGET_MISSING` + `ABORT`.
   Do **not** dispatch SS as success. Do **not** add a RestorePhaseName.
   Do **not** set `degraded`.

Do **not** change global `waitFor: "canvas"` (**C**). Do **not** wait
`widgetsRendered` on activate (**C**, 5c PO #4).

---

## 6. Files

**CREATE (only if `runFilterRestore.js` would exceed 150 lines)**

- `writeback/set/effects/waitForPageContextHost.js` — 0–1 AMD. Never throws
  `TARGET_MISSING`; returns `{ ready: boolean, attempts: number }`. Caller aborts.

**EDIT**

- `widgetBase/actions/handleEnsureTabWidgetsRouted.js` — pass `missingShells`
- `writeback/set/effects/ensureTabWidgetsRouted.js` — phase field + re-ensure
  loop; extract only if the file would exceed 150
- `writeback/set/effects/runFilterRestore.js` — call poll after activate,
  before SS page-context restore

`createRunContext.js` only if mutating the returned `recordPhase` entry is
impossible (prefer mutate). Do **not** widen `recordPhase` unless required.

New JS ≤150, ≤10 AMD imports. No `handle*` / `*Support` /
`helpers|shared|common`. No new `_KDB.*`. No new events. No `Promise.race`.

**Do NOT touch**

- `parameterSetActivateTab.js`, `awaitCanvasReady.js` (5c)
- `traverseTabs.js` `waitFor: "canvas"`; `awaitTabWidgetsRendered.js`;
  `renderTabWidgetsRequested`
- `waitForTransferReady.js` (no cap — 5c); `waitForScopedShells.js` (no lengthen);
  canvas-discovery / `discoverCanvasWidgets.js`
- `errorCodes.js` / writeback.md §8 enum; `normalizeDispatchResult.js`;
  `KDB.js`; gallery; shell-create (**D**)
- `tabs:changed` suppress (**G**); filt-only success landing (**H**)

---

## 7. Parent patches (this WP)

- `writeback.md` §2.2: phase extra field `missingShells?: number` on
  `tabWidgetsEnsureRouted`. One short patch; do not rewrite writeback.md.
- `writeback-restore-deferred-backlog.md` §2.4: this delta owns it
  (`Implemented — awaiting PO Cognos`). Do not fold C.
- `tabs-parameterSetRestore-contractdelta.md` §8: **B** is this delta; **C**
  stays deferred (global canvas honesty, per-widget activate paint).

---

## 8. Out of scope

- **C:** global `waitFor: "canvas"` honesty; per-widget paint on activate;
  `parameterSetActivateTab.js` / `awaitCanvasReady.js` (5c landed).
- **G** (`tabs:changed` suppress whole SET), **H** (filt-only success landing),
  **D** shell-create.
- Batch C unify. Reopening 5c. `waitForTransferReady` cap.
  `waitForScopedShells` lengthen. Canvas-discovery reopen.
- New error enum. SS inventory re-reconcile during poll.
  `failPhase` / `phase.degraded: true` on leftover shells.

---

## 9. Acceptance (code now; Cognos later)

1. `RestoreResult.phases` `tabWidgetsEnsureRouted` includes numeric
   `missingShells` when widgetBase reported it (default 0).
2. Leftover shells do **not** flip `outcome` to degraded/failed by themselves.
3. Re-ensure at most **2 extra** ensure calls; still honest if count remains `> 0`.
4. Page-context: retries then `TARGET_MISSING`; never success-on-timeout.
5. 5c activate path unchanged.
6. **Needs PO Cognos** (bundled later): SET with lazy tab / missing shells;
   slow page-context host.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-08-18 | B GO → `Implementing` | vastenburg | Letter B; Cognos later. Do not fold C. |
| 2026-08-18 | `Implementing` → `Implemented — awaiting PO Cognos` | vastenburg (captain review) | mechanical PASS-WITH-NITS, semantic PASS. Nits not fixed. Cognos bundled later. |
| 2026-08-18 | `Implemented/awaiting Cognos → Approved — Cognos green` | vastenburg | Bundled Cognos round after A1+dup+B. |

---

## As-built 2026-08-18

**Status:** `Approved — Cognos green 2026-08-18`

**Files** (lines / AMD imports)

- EDIT `widgetBase/actions/handleEnsureTabWidgetsRouted.js` (111 / 4) — `finishRoute` / `buildResult` assign numeric `missingShells` after `normalizeDispatchResult`; `alreadyRouted: true` → `0`.
- EDIT `writeback/set/effects/ensureTabWidgetsRouted.js` (130 / 3) — `tabWidgetsEnsureRouted` records `missingShells` on the returned phase entry; leftover shells stay `ok: true` / not degraded; optional `WRITEBACK_SKIPPED_BY_DESIGN` + `details.nonDegrading: true`.
- CREATE `writeback/set/effects/reensureTabWidgetsRouted.js` (52 / 0) — bounded re-ensure so ensure stays ≤150.
- CREATE `writeback/set/effects/waitForPageContextHost.js` (123 / 1) — poll after 5c activate; returns `{ ready, attempts }`; never throws `TARGET_MISSING`.
- EDIT `writeback/set/effects/runFilterRestore.js` (145 / 6) — call poll after activate, before SS page-context; timeout → `WRITEBACK_TABS_TARGET_MISSING` + `ABORT`.
- `createRunContext.js` — untouched.
- Extra SS file — none.
- 5c files — untouched.
- C/G/H/D — not started.

**Caps actually used**

- B-shells: 2 extra ensures (`EXTRA_ENSURE_CAP = 2`; 3 total including first).
- B-poll: 2500ms / 3 attempts (`CAP_MS = 2500`, `MAX_ATTEMPTS = 3`, `INTERVAL_MS = 800`; local `AbortController`; `Date.now` in the effect only).

**Parent §7** — present: `writeback.md` §2.2, backlog §2.4, `tabs-parameterSetRestore-contractdelta.md` §8.

**Deviations**

- No product divergence: leftover shells do not `failPhase` / `hasDegradedPhase`; poll timeout is abort `TARGET_MISSING`, not degraded/success.
- Poll host-read unreadiness converts to `{ ready: false }` without retry-spam `console.error`; unexpected poll errors also return `!ready` (caller still `TARGET_MISSING` + `ABORT`). `CANCELLED` still rethrows. Nits not fixed.

**Needs PO Cognos** (bundled later)

- SET on lazy tab with leftover shells: phase shows `missingShells`; outcome not flipped by that alone.
- Slow page-context host: poll then still `TARGET_MISSING`.

**Cognos green 2026-08-18** (vastenburg, bundled A1+dup+B).
