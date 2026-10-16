# Execution Spec: writeback GET persist-popup hold

**Status:** `Reviewed` — PO Cognos groen 2026-09-02 (land restored; persist works).
**Contract:** `contracts/writeback-get-persist-landing-contractdelta.md` §3 steps 4/10–11, §5, §8 (hold patch, PO ack 2026-09-02)
**Phase:** hold/restore trigger only. Do **not** reopen A′ land, B/C/D, scrape, bridge thickening.
**Authoring AI:** persist-popup-hold captain, 2026-09-02

---

## A. Pre-flight (echo before any edit)

Read, then **one sentence each**, then edit in the same turn (captain is the reviewer):

1. `kdb-object.mdc`
2. `state.mdc`
3. `runtime.mdc`
4. `module-public-api.mdc`
5. `events.mdc`
6. `feature-structure.mdc`
7. `naming.mdc`
8. `error-handling.mdc`
9. `dom.mdc`
10. `amd.mdc`
11. `cognos-adapter.mdc`
12. Contract delta §3 / §5 / §8
13. This spec

---

## B. Allowlist (one writer; no other files)

1. `KDB3/js/core/services/writeback/get/scheduleWritebackGetPersistRestore.js` — **must**
2. `KDB3/js/core/services/writeback/get/createWritebackGetService.js` — popup-present gate only
3. `KDB3/js/core/services/writeback/get/readWritebackGetPersistPopup.js` — **only if** you must share identity between (1) and (2) without a second AMD export from (1). Verb+noun file. Not `helpers/`.

**Do not edit:** `applyWritebackGetPersistLanding.js` (150 cap), `cognosWritebackBridge.js`, `followActiveTab.js`, SET restore, leftover CSS, `.cursor/rules/*.mdc`.

---

## C. Behaviour (normative; do not guess)

Keep A′ land path. Change **restore/hold** only.

1. **Identity:** persist popup = `smq-popup` **direct child** of `body` (existing `readDirectBodySmqPopup` / `listPersistDocuments`). Prefer the document KDB runs in; `window.top.document.body` only if that document is different. If several `smq-popup`, pick the one whose `h1.api-title` text contains `parameterset` (case-insensitive); else first direct-body `smq-popup`. Ignore `#WB > #preloader-object`. No `#saveParameterSet` / `#selectParameterSet` scrape or click.

2. **Gate:** after `validateV3`, `source === "bridge"` → land. Popup does **not** skip land. Internal collect already skips via `source`.

3. **Hold:** if popup **was present**, schedule fire-and-forget watch. Restore the captured user tab **only when that popup node is absent** from `body` (save finished or cancel). Same persist-land action as today; follow must run.

4. **Forbidden restore:** loader `#preloader-object` hide while popup still on `body`; **8s** never-seen; **20s** never-hide; any clock while `smq-popup` still exists.

5. **Never-seen:** do not restore (no 8s yank). Combined with (2) this also skips land.

6. **Stuck cap:** **30000ms** only if popup **was seen** and is still present. Then restore (safety). Not 8s.

7. **Deadlock:** do not `await` popup-gone inside `collect()` / `apply`. Watch stays timeout/poll like today (`timers.persistRestoreTab`).

8. **Cancel (keep):** user `tabs:changed` unless `source === "writebackGetPersistLanding"`; SET `parameterSetRestoreActive` (cancel, **no** GET restore); GET re-entry; `destroy()`. User tab switch while popup open: do not fight.

9. **Poll:** keep ~200ms. Prefer existing Abort/timer buckets under `_KDB.runtime.writeback`.

10. **Errors:** named helpers `try/catch`; land/restore miss still returns v3; no `notifySaveFailed` / German save alert on hold failure. No `_KDB.cognosAPI` / `__getDashboardAPI`.

---

## D. Per-file rules line

- `scheduleWritebackGetPersistRestore.js`: `amd` (factory-scope helpers, no nested IIFE), `runtime` (timer cleanup), `events` (cancel on tabs:changed), `error-handling`, `dom` (body-direct query is the existing persist exception; do not add `document.querySelector` for chrome scrape), `naming`, `cognos-adapter` (no SDK). Hard 150 lines. Remove 8s/20s loader semantics.
- `createWritebackGetService.js`: `feature-structure` (orchestrate only), `module-public-api` (named service), `error-handling`. Gate only; do not move land before collectors.
- `readWritebackGetPersistPopup.js` (if created): one job, AMD, ≤80 lines, `try/catch`.

---

## E. Acceptance (writer self-check; PO Cognos later)

- Restore cannot run while `smq-popup` is still a `body` child (except 30s stuck).
- `collect()` returns before popup-gone.
- Cancel/destroy/GET re-entry still cancel the watch.
- Tab-1 skip land click still works when popup present and already on first visible slot.
- Bridge stays `await collect({ source: "bridge" })` → stringify.

If blocked (apply would need a rewrite, 150 overrun, need `_KDB.cognosAPI`): **stop and report**. Do not improvise.
