# Contract Delta: pageSurface applies Cognos page size after canvas-ready

> Delta on `contracts/pageSurface.md` (§3, §4 dispatch-after-mount, §5, §7, §8), `contracts/pageSurface-execution-spec.md` (host op names, skip-if-equal, mount/dispatch apply-now bullets), and `contracts/cognosHostService.md` (`setCanvasPageSize` paragraph ~158 + §7 pageSurface stamp).
> Contract-only: no production code is approved by this document.

---

**Status:** `Implemented` — PO live green 2026-10-06
**Owner:** `pageSurface` (`_KDB.api.canvas`); ring-1 op remains `cognosHost.canvas.setCanvasPageSize`
**Authoring AI:** Cursor coordinator, 2026-10-06
**Related:** [pageSurface.md](../pageSurface.md), [cognosHostService.md](../cognosHostService.md) `setCanvasPageSize` / `whenCanvasReady`

---

## 1. Problem (live evidence 2026-10-06)

Every dashboard load logs twice:

```
[pageSurface.applyPageSize] setCanvasPageSize failed
{ ok: false, outcome: "failed", errorCode: "CANVAS_HOST_CAPABILITY_MISSING", diagnostics: [] }
```

That is width then height at `canvas.mount`. The Outcome is the documented miss: no exact name hit in `getCanvasPropertiesList()` (or a non-list).

PO probe **after** load (context top):

- `getCanvasPropertiesList()` is a 54-string array and **includes** `pageSizeWidth` and `pageSizeHeight`.
- `getCanvasPropertyValue("pageSizeWidth"|"pageSizeHeight")` returns **numbers** `1800` and `800` (not `"1800px"`).
- `pageSize.width`, `pageSize.height`, `width`, `height` **do not exist**; `getPropertyValue` **throws** (`Property … does not exist`).
- kdbControl defaults are already `"1800px"` / `"800px"`. Restore step 10 skips `canv.w`/`canv.h` when those px values already match state, so the failed boot write is **not** retried.

Host page on this dashboard was already 1800×800 (Cognos spec). Tab 2..n overflow is a **different** bug (`widgetBase-parameterSetRestore-dropboxTarget-contractdelta.md`).

## 2. Mechanism

- `KDB.js` mounts `api.canvas` immediately after `kdbControl.mount`. kdbControl mount does not emit canvas intents. Empty `pending` → `applyDashboardSettings` → two sync `setCanvasPageSize` calls.
- `setCanvasPageSize` is sync. It does not call `whenCanvasReady`. First exact hit among `pageSizeWidth` / `pageSize.width` / `width` (height analogue). At mount the list has no hit → `CANVAS_HOST_CAPABILITY_MISSING`, empty diagnostics (list must not go on the Outcome).
- Same inner ring **does** wait for canvas-ready before another property write: `cognosAPI.dashboard.setDashboardZoom` awaits `getCanvasWhenReady()` then `defaultZoom`.
- Skip-if-equal today is `current === cssPx`. Live host current is `1800`; caller passes `"1800px"` → would rewrite even after a successful later call.

## 3. Classification

**(b) Contract gap.** Code matches `pageSurface.md` §5 (convert, call now, log failed Outcome, no throw, no retile, no wait). That first paint is too early for this host’s property list. The six-name candidate list is wrong for this Cognos build. Equality is too strict for a numeric host value.

Not (a): names, first-exact-hit, miss code, and empty diagnostics match the written spec. Not the dropboxTarget placement bug.

## 4. Design (PO 2026-10-06: wait, then one apply; wait-fail still try once)

Pre-check 2026-10-06 folded in: abort must not flush; facet returns an aborted **Outcome**, it does not throw `AbortError`.

1. **`setCanvasPageSize` stays sync.** No `Promise`. Wait is a pageSurface effect, not a facet change of dialect. Do not import `convertUnitToPx` into ring 1.
2. **Mount does not size the Cognos page immediately.** `isMounted = true`. If already mounted, no-op (KDB.js mounts once). Arm `canvasFacet.whenCanvasReady({ signal })` with **no `budgetMs`**. `signal` comes from one `AbortController` under `_KDB.runtime.pageSurface.abortControllers` (standard bucket; delete the key on destroy after abort).
3. **When the waiter settles, gate then maybe flush.** After `await`, if `_isDisposed` or `signal.aborted` or `outcome.outcome === "aborted"` (including `reason: "disposed"` / `"aborted"` / `"aborted-after-effect"`): **no flush**. Else run **exactly one** flush (once-token on the controller instance). Flush on: `ready === true`; wait `failed` (`CANVAS_WAIT_FAILED`, `CANVAS_HOST_UNAVAILABLE`, `CANVAS_HOST_CAPABILITY_MISSING`, and any other non-abort fail); thrown error inside the pageSurface waiter (named `try/catch`, log, then flush); missing `whenCanvasReady` (one `console.warn`, then flush). Wait-fail / missing op still attempts `setCanvasPageSize` once; keep `[pageSurface.applyPageSize] setCanvasPageSize failed` if `ok !== true`. Non-abort wait failures also log once at the waiter (`console.error` with the Outcome). Do not treat a resolved aborted Outcome as `AbortError`. Do not throw into kdbControl. Do not retile.
4. **One flush.** Pending axes first (last-write-wins on `pending`). Then kdbControl `settings.dashboard` only for axes **not** in that pending snapshot (today’s `applyUnflushedSettings`). Do not call `applyDashboardSettings` when any pending axis was flushed — that would paint background twice / overwrite a queued color. Width, height, and background share that one flush. A later `dispatch` after the once-token applies immediately.
5. **Pending until first flush.** Until the once-token is set, `dispatch` of the three canvas intents writes `runtime.pageSurface.pending` even when `isMounted`. This **overrides** `pageSurface.md` §4 “After `mount`, it applies immediately.” Restore or a user commit during the wait is kept in pending and applied in the flush.
6. **Destroy** sets `_isDisposed` first, then aborts the controller, clears pending, deletes the abortControllers key, drops the facet stamp. Idempotent. No flush from destroy. A late waiter result hits the abort/dispose gate and is a no-op.
7. **Candidate names (ring 1).** Width: `pageSizeWidth` only. Height: `pageSizeHeight` only. Drop `pageSize.width`, `width`, `pageSize.height`, `height`. First exact `===` hit in the host list remains. Missing list or no hit remains `CANVAS_HOST_CAPABILITY_MISSING` with `diagnostics: []`. Do not put the list or canvas handle on the Outcome. Do not call `getCanvasPropertyValue` / `setCanvasPropertyValue` with the dropped names.
8. **Skip-if-equal (local in `setCanvasPageSize`).** Caller still passes `"1800px"`. Already-set only when the host value is exactly: number `1800`, string `"1800"`, or string `"1800px"` (same integer px as `cssPx`). Null/undefined host value **writes**. Do not coerce `"1800cm"` / other units as equal. A real change still writes the CSS string.
9. **`convertUnitToPx` null at the caller** keeps today’s behaviour: that axis is not sent to the host, `flushPending` still marks it flushed, settings fallback does not retry it. Other axes still apply.
10. **Stamp.** Existing `_KDB.runtime.pageSurface.canvasFacet`. Deep files still read it only through `effects/readCanvasFacet.js`. pageSurface becomes a D4 live caller of existing `whenCanvasReady` (not a new facet/op). New §7 bullet; pageSurface is not in §7 today.
11. **Files.** New `dashboard/canvas/pageSurface/effects/applyPageSurfaceWhenReady.js` owns the wait, the once-token flush, and today’s `flushPending` / `applyUnflushedSettings` (moved out of the controller so `createPageSurfaceController.js` stays ≤150). Controller coordinates mount/dispatch/destroy only. Orchestrator ensures `abortControllers` on the runtime bucket. No nested `async` IIFE (`amd.mdc`).

No `KDB.js` boot-order change. No `settingsPostDispatchSideEffects.js` edit. No new events. No `_KDB.state.pageSurface`. No widget retile. No `budgetMs` on this waiter (accepted: if `getCanvasWhenReady` never settles, the one size attempt never runs).

## 5. Decisions (PO vastenburg, 2026-10-06)

- **Wait then apply:** `whenCanvasReady` (unbounded, abortable), then one flush of width/height/background.
- **Wait-fail:** still one `setCanvasPageSize` attempt; keep today’s fail log.
- **Names:** only `pageSizeWidth` / `pageSizeHeight`.
- **Equality:** `1800` and `"1800px"` are the same size.

## 6. Text sync at `Implemented`

- `pageSurface.md` §3 abortControllers + pending-until-flush; **§4** “After `mount`, it applies immediately” → pending until first flush, then immediate; §5 wait then one apply; §7 `whenCanvasReady` on the same stamp; §8 `effects/applyPageSurfaceWhenReady.js`.
- `pageSurface-execution-spec.md` candidate names + skip-if-equal coercion **and** mount/dispatch bullets (`:51-53` apply-now).
- `cognosHostService.md` `setCanvasPageSize` paragraph: two names; numeric/px equality; **new** §7 injection bullet: pageSurface `canvasFacet` also calls `whenCanvasReady`.

## 7. Out of scope

Tab 2..n dropbox parent (`widgetBase-parameterSetRestore-dropboxTarget-contractdelta.md`). Colour bugs. A published get-page-size op. Making `setCanvasPageSize` async. Fuzzy name scan. Writing a number instead of `"Nnpx"` on a real change. `defaultZoom`. A `budgetMs` cap on this waiter.

## 8. Acceptance (draft)

1. Cold load: no `CANVAS_HOST_CAPABILITY_MISSING` pair from `applyPageSize` when the host list later contains `pageSizeWidth` / `pageSizeHeight`.
2. After load, host `pageSizeWidth` / `pageSizeHeight` match kdbControl dashboard width/height in px (defaults 1800×800 on this board). Skip-if-equal does not rewrite `1800` when the caller would send `"1800px"`. A real change (e.g. 1801) still writes.
3. Changing dashboard width/height in settings **after** the flush still writes the host properties.
4. A width/height/background intent **during** the wait is applied in the single flush (pending wins over settings for that axis); background is painted once in that flush.
5. Wait-fail / missing `whenCanvasReady`: still one `setCanvasPageSize` attempt; existing fail log if `ok !== true`; no throw.
6. Destroy during the wait: no throw, no flush, no apply after dispose.
7. `getCanvasPropertyValue("pageSize.width")` / `"width"` / height analogues are never called from this path.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | — | Live probe (list has `pageSizeWidth`/`pageSizeHeight`; host values numbers; dotted/bare throw). PO: wait + one apply; wait-fail try once. |
| 2026-10-06 | `Draft` (pre-check MUST-FIX) | — | Abort Outcome does not flush; text-sync §4 + execution-spec mount bullets; named `applyPageSurfaceWhenReady.js`; local equality only. |
| 2026-10-06 | `Draft` → `Approved` | PO vastenburg | Wait + one apply; wait-fail try once; names pageSizeWidth/Height; equality 1800 vs "1800px". Code only after execution spec + go. |
| 2026-10-06 | `Approved` → `Implemented` | PO vastenburg | Cognos live green: no `CANVAS_HOST_CAPABILITY_MISSING` pair. Parent text-sync: `pageSurface.md`, `pageSurface-execution-spec.md`, `cognosHostService.md` §158 + §7. |
