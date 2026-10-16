# Execution Spec: inbound share leftover cleanup (writeback canvasFacet stamp)

> Cleanup after inbound canvas-wait add/remove rounds. Live inbound works (dropdown → SET). Do **not** reopen canvas wait, `await p` on boot, or a shared `getCanvasWhenReady` join. Specs were patched first; this spec is the JS ticket.

---

**Status:** `Landed` — stamp cut + dual review PASS; Cognos not re-checked after stamp cut
**Captain spec patch:** 2026-08-30 ~00:43 leftover cleanup after inbound canvas-wait churn. Writer A stamp/seed cut + dual review PASS. Do **not** re-run allowlist. Cognos not re-checked after stamp cut (inbound dropdown→SET was Cognos-working before ~00:36 cut).
**Module / contract:** `writeback-urlParameterId-contractdelta.md` (Approved; live path = dropdown only)
**Phase:** `cleanup`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-08-30
**Executing AI:** `<grok 4.6 implementer>`
**Reviewer:** supervising captain + dual review army

---

## Section A. Pre-flight read list

Executing AI **must** read each file in order, **then echo one sentence per MUST** in the MUST pre-flight below. Stop if a summary is missing.

1. `_____________KDB3API/.cursor/rules/` — all 10 MUST (`amd`, `naming`, `kdb-object`, `state`, `runtime`, `dom`, `events`, `module-public-api`, `feature-structure`, `error-handling`)
2. This spec
3. Live (read-only except allowlist): `__orchestratorWriteback.js` ~28, ~81–87; `ensureWritebackRuntime.js` ~19
4. Do **not** follow `share-inbound-wait-execution-spec.md` (superseded)

---

## Exclusive allowlist

**Writer A (JS) may edit only:**

- `KDB3/js/core/services/writeback/__orchestratorWriteback.js` — remove `stampWritebackCanvasFacet(_KDB)` call (~28), remove function (~85–87), drop `if (runtime.canvasFacet === undefined) runtime.canvasFacet = null;` (~81)
- `KDB3/js/core/services/writeback/set/state/ensureWritebackRuntime.js` — drop `if (runtime.canvasFacet === undefined) runtime.canvasFacet = null;` (~19)

**Must not:** `KDB.js`, `cognosWritebackBridge.js`, `canvas.js` / `async.js`, FilterDock JS, `selectParameterSetById.js`, `waitForParameterSetSelectReady.js`, `whenUrlShareRestoreSettled.js`, `loadingGuards.js`, `executeRestoreRun.js`, widgetBase / tableData / launchpad / tabs / widgetBindingApply, `helpers/` / `common/` / `shared/`, `.cursor/rules/*.mdc`, git commit/push. Do **not** recreate `waitForUrlShareCanvasReady.js`. Stay ≤120 / AMD ≤10.

Writer B cancelled: overlay flag stays; do not edit `loadingGuards.js` / `executeRestoreRun.js` / `whenUrlShareRestoreSettled.js`.

Two writers must not share a file. One writer owns this allowlist.

---

## MUST pre-flight (echo before producing files)

- Remove writeback `canvasFacet` stamp/seed only. Zero live `KDB3/js/**` callers after helper deleted (D4).
- KEEP `urlShareBootOverlayActive` (seed, normalize, set/clear). It is a writeback-internal latch for background SET (skip second spinner; defer restore-failure alert until presentPending). Not a `KDB.js` boot hold.
- Do not edit `KDB.js` boot order. Fire-and-forget `whenUrl` stays.
- Do not touch dropdown waits. Do not add canvas wait. Do not stamp a replacement facet.
- Do not “clean” widgetBase/tableData/launchpad/tabs `canvasFacet` stamps (live owners).
- Never `timeoutMs: 0`. Never `__getDashboardAPI` outside `cognosAPI/`. Never `ok:true`+cancelled. Never `WRITEBACK_SKIPPED_BY_DESIGN` for URL skip.

---

## Section C. Per-file specifications

Rules on every JS file: `amd.mdc` (full-compact define; factory-scope helpers only), `naming.mdc`, `feature-structure.mdc` (hard 150), `error-handling.mdc`.

#### `__orchestratorWriteback.js`

Delete `stampWritebackCanvasFacet(_KDB)` call (~28), delete `stampWritebackCanvasFacet` function (~85–87), delete `if (runtime.canvasFacet === undefined) runtime.canvasFacet = null;` (~81). Keep `urlShareBootOverlayActive` normalize (`!== true` → false). Stay ≤120 / AMD ≤10.

#### `ensureWritebackRuntime.js`

Delete `if (runtime.canvasFacet === undefined) runtime.canvasFacet = null;` (~19) only. Keep overlay seed.

---

## Section J. Acceptance

1. Boot without waiting for share (FilterDock / kdbControl).
2. `[urlShareWait] waiting for dropdown` then found / first option / membership. No `whenCanvasReady` lines.
3. SET applies when dropdown fills. Empty URL: no dropdown wait.
4. No second SET spinner / no alert-before-presentPending during background apply (overlay KEEP).
5. Grep `KDB3/js/core/services/writeback/**` has zero `canvasFacet`. Other modules’ stamps unchanged.

## Section K. Forbidden

No shareService; no recreate canvas helper; no `await p`; no shared `getCanvasWhenReady` join; no FilterDock mix-in; no `.mdc`; no git commit/push.
