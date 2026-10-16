# Contract Delta: parameterset discard confirm (WP1)

> User changes `#selectParameterSet` while the dashboard has unsaved work. Confirm before restore. URL inbound and boot overlay skip the modal.

---

**Status:** `Approved` — PO vastenburg 2026-09-07. Proposal series locked. JS only via `contracts/writeback-discard-confirm-execution-spec.md`.  
**Type:** `shared-service consumer contract delta`  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (tick **1** when Cognos green)  
**Naslag:** `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` §1  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-07; mechanism lock after army stress-test same day  
**Parents:** `contracts/writeback.md`, `contracts/writeback-urlParameterId-contractdelta.md`, `contracts/messageService.md`  
**Related rules:** `module-public-api.mdc`, `feature-structure.mdc`, `events.mdc`, `error-handling.mdc`, `amd.mdc`, `naming.mdc`

This delta **implements** the port that `writeback-urlParameterId-contractdelta.md` §11 left OOS (`skipDiscardConfirmOnce` already reserved).

---

## 1. Purpose

When the user picks another parameterset from the host dropdown, ask before discarding unsaved dashboard changes. Mechanical inbound (URL `parameterId`, boot overlay, Cognos default SET) must not see this modal.

---

## TODO — Proposal series (**locked**)

Series closed 2026-09-07 (army Q1–Q5 + stress-test HOLD / HOLD-WITH-TWEAK). Mechanism is **§6**. Do not re-open unless PO reverses a lock.

| # | Locked choice |
|---|---|
| 1 | No dirty bit. Confirm every non-default **host** SET. |
| 2 | Skip confirm when `statusKind === "default"`. Complementary to `skipDefaultRestoreForUrlParameterId` (that helper skips **restore work**, not the modal). |
| 3 | Confirm **host** `newDashboard`. Do **not** confirm recover. Do **not** gate on `options.source === "bridge"`. |
| 4 | Previous id: `_KDB.runtime.writeback.lastConfirmedParameterSetId`. Revert = `select.value = previous \|\| "-"` with **no** `change`. |
| 5 | Two new `bridge/` files. Confirm on `bridgeSet` **before** `restore()`. Stamp on `executeRestoreRun` after `ok === true`. |

---

## 2. Closed product decisions (Draft locks — PO 2026-09-07)

| # | Lock |
|---|---|
| 1 | Surface `_KDB.services.message.confirm`. No native `confirm`. Fail-closed if service missing/disposed: **do not** restore; `console.warn`; revert select (§6). |
| 2 | Copy (exact DE): title `Nicht gespeicherte Änderungen`; body `Hinweis: Beim Öffnen eines Dashboards aus dem Dropdown werden nicht gespeicherte Änderungen verworfen.\n\nMöchten Sie fortfahren?` |
| 3 | Buttons: `confirmLabel: "OK"`, `cancelLabel: "Abbrechen"` (legacy; not tabs Ja/Nein). |
| 4 | Proceed with existing restore **only** on `{ confirmed: true }`. Any other `ConfirmResult` → revert `#selectParameterSet`; no restore. |
| 5 | Skip map is **§6.2** (flag **always cleared if true**, overlay, default). Honor skip **or** overlay **or** default, or URL waiter / boot default regress. |
| 6 | Confirm is on `bridgeSet` via `runBridgeSetRestore` **before** `restore()`. The only KDB `change` listener on `#selectParameterSet` is one document-capture handler for `value === __KDB_NEW_DASHBOARD__`: `stopImmediatePropagation`, then the owned `bridgeSet(null, "newDashboard")`. No second confirm. After that call returns, `select.value = "-"` with no `change` event. URL recover does not use this listener and does not rewrite the select. |
| 7 | No events. No `_KDB.state` for the dialog. Labels on writeback (`writebackLabels.js`). |
| 8 | **No dirty bit.** Flags are `statusKind` plus `parameterSetRestoreActive` (in-flight, **not** unsaved). |
| 9 | **`executeRestoreRun.js` must not confirm.** Stamp after `ok` is allowed (not a modal). |

---

## 3. Ownership

Writeback SET / host dropdown bridge owns **when** to confirm. `messageService` owns presentation. `historyControls` is out.

New runtime fields stay on `_KDB.runtime.writeback` (existing owner). Not a new `_KDB` namespace.

---

## 4. Public API

No new writeback methods. Revert / stamp / confirm are **private** `bridge/` + `set/effects` helpers. Public bridge surface stays `{ install, uninstall, isInstalled, destroy, readSelectedParameterSet, selectParameterSetById }`.

---

## 5. Copy keys

`_KDB.config.labels.de.writeback.discardUnsavedTitle` / `discardUnsavedMessage` / optional `discardUnsavedConfirm` / `discardUnsavedCancel` (`OK` / `Abbrechen`). Exact strings §2. `writebackLabels.js` (12 lines; orch already merges).

---

## 6. Locked mechanism (stress-test HOLD-WITH-TWEAK)

### 6.1 Files

**Create (2 only — not 3–4):**

| File | Role | Target |
|---|---|---|
| `KDB3/js/core/services/writeback/bridge/confirmDiscardUnsavedChanges.js` | Skip map, latch, `message.confirm`, revert on abort/fail-closed | ~45–55 lines, AMD 2 |
| `KDB3/js/core/services/writeback/bridge/runBridgeSetRestore.js` | Extract **whole SET path** from `bridgeSet` (format branches + `notifyAfterRestore`). **Await confirm first**, then `restore()`, then waiter notify | ~70–110 lines, AMD 3–5 |

**Edit:**

| File | Change | Constraint |
|---|---|---|
| `cognosWritebackBridge.js` | Swap SET body for `_runBridgeSetRestore`. Lines **must decrease** (282 → ~220–226). AMD **6→5** (or 4 if runner also takes normalize) | **Do not thicken.** Do **not** chase ≤150 on this grandfathered file |
| `executeRestoreRun.js` | Capture select id at **start**; stamp `lastConfirmedParameterSetId` only when `result.ok === true` | Confirm **out**. AMD 7→8 max (`parameterSetSelectConstants`). Stay ≤150 |
| `ensureWritebackRuntime.js` | Seed `lastConfirmedParameterSetId: null`, `discardConfirmInFlight: false` | AMD 0 |
| `__orchestratorWriteback.js` | Same seeds in `normalizeWritebackRuntime` | Id analog is **`pendingRunId`** (`== null ? null : keep`), **not** `skipDiscardConfirmOnce` (`!== true` → `false` — that wipe is legal only for `discardConfirmInFlight`). Copying L72 onto the id string stamp-wipes on re-orchestrate. |
| `writebackLabels.js` | Add §5 keys | AMD 0 |
| `selectParameterSetById.js` | Keep skip flag **before** synthesized `change`. Clear `skipDiscardConfirmOnce` in **`finally` after the flag is set** (timeout, abort, **and** throw after `change` also leave `true` today) | Not a revert path. Stay ≤150 / AMD 4 |

**Who imports whom**

- `cognosWritebackBridge.js` → `runBridgeSetRestore.js` only (SET path).
- `runBridgeSetRestore.js` → `confirmDiscardUnsavedChanges.js` + `restoreConstants.js` (`STATUS_TABLE`) + current waiter (+ normalize/errorCodes if full SET extract). Maps raw host `status` → `statusKind` **before** calling the confirm helper. The helper is AMD 2 and **must not** import `STATUS_TABLE`. Passing raw `status === "default"` would **modal** `defaultParamSet` boot.
- `confirmDiscardUnsavedChanges.js` → `ensureWritebackRuntime.js` + `parameterSetSelectConstants.js`. Clone ~10 lines of tabs `confirmAndDispatchTabDelete.js` (missing service → warn/block; await; proceed only if `confirmed === true`). **Plus try/catch:** disposed `message.confirm` **rejects** (`Promise.reject`), it does not return `{ confirmed: false }`. Catch → same fail-closed as missing service (warn, revert, no restore). **Do not import tabs.** Revert **inline** (no `revertSelectedParameterSet.js`).
- `executeRestoreRun.js` stamps. **Do not** stamp in `waitForBridgeSetSettlement.notifyBridgeSetSettled` (misses recover). **Do not** add a stamp import to `recoverUrlSharePending.js` (recover already `await restore()` → `executeRestoreRun`).

`createWritebackSetService.js` stays **148 / AMD 10**. `restore()` body does not grow. No 11th AMD.

### 6.2 Skip map (`confirmDiscardUnsavedChanges`)

**Order is mandatory:** evaluate the skip map **first**, then the in-flight latch, then `message.confirm`. If latch runs first, a skip SET (URL inbound) during an open dialog takes “do not restore” and can starve the URL waiter.

Evaluate skip **synchronously**. Skip path must **not** call `message.confirm` (queue would burn the URL waiter budget).

Skip (treat as confirmed, no modal, **proceed to restore**) when **any**:

1. `skipDiscardConfirmOnce === true` — **always clear to `false` if it was true**, even when overlay/default also skip. Overlay-first without clear = later dropdowns skip forever.
2. `urlShareBootOverlayActive === true`
3. Mapped `statusKind === "default"` — runner passed `STATUS_TABLE` kind, including aliases `default` / `defaultParamSet` / `defaultparamset` / `defaultparameterset`. Confirm is **before** `restore()`, so `skipDefaultRestoreForUrlParameterId` has not run yet.

Else go to latch (§6.3), then confirm `direct` and host `newDashboard`.

Recover `restore(null, "newDashboard")` is **not** on `bridgeSet` — it never hits this helper. Overlay still covers URL inbound SET. Do not move confirm onto all `restore()` callers.

### 6.3 In-flight latch

Applies **only after** the skip map said “confirm”. `_activeRun` starts only **inside** `restore()`. Confirm-before-restore is outside occupancy. Live `message.confirm` **queues** (`enqueueInteractive` / `modalRequests`).

`_KDB.runtime.writeback.discardConfirmInFlight`: set `true` before `await confirm`, clear in `finally`. If already true: **do not** enqueue a second dialog; **do not** restore; `console.warn("[writeback.confirmDiscardUnsavedChanges] discarded overlapping SET")`. Do not fight the open dialog’s eventual revert.

### 6.4 Stamp (`executeRestoreRun`)

`ok` is exact: `buildRestoreResult` → `ok === true` for `committed` \| `degraded` only (`failed` / `cancelled` are false).

1. At **start** (before loading/history): read `#selectParameterSet` via `SELECT_ID`. If missing / placeholder (`""`, `"-"`) / `NEW_DASHBOARD_VALUE`, captured id = `null`. Else captured id = current `select.value`. **Do not** use restore payload (v3 has no host set id). **Do not** read DOM **after** ok (user can change the dropdown during occupy).
2. After cleanup / `buildRestoreResult`: if `ok === true`, write `runtime.lastConfirmedParameterSetId = capturedId`.
3. Skip-confirm paths that still `executeRestoreRun` still stamp. Skip-default (no occupy) correctly does **not** stamp.

First user pick before any ok restore: key is `null`; fail-closed revert uses `"-"`. Documented; no focus/pointerdown remember.

### 6.5 Revert

Fail-closed (revert select, no restore, `console.warn`) when: service missing; service disposed; `confirm` **throws/rejects** (disposed path is `Promise.reject`, not `{ confirmed: false }`); any `ConfirmResult` other than `{ confirmed: true }` (Abbrechen / Escape / close).

Revert: `document.getElementById(SELECT_ID).value = lastConfirmedParameterSetId \|\| "-"`. **No** `dispatchEvent`. **Do not** call `selectParameterSetById` (sets skip + `change` + waits SET → wipes unsaved work).

No KDB3 class-sync for this select. Ship `.value=` only; a `KDB_optionSelected` helper only if Cognos green shows a highlight bug.

Abbrechen skips `restore()`: **KDB** canvas stays old. Host `#selectParameterSet` is already the new id when SET runs (legacy SET layer was the same). No capture-`change` listener in this WP.

### 6.6 Must not

- Thicken `cognosWritebackBridge.js`; grow `createWritebackSetService.js` / `restore()`; 11th AMD on the set service.
- Confirm in `executeRestoreRun.js`.
- Stamp in `notifyBridgeSetSettled`.
- Dedicated stamp file or dedicated revert file.
- `KDB.js`; `shareControls/**`; `historyControls/**`; `messageService` internals; URL parse; invert skip-flag meaning.
- `waitForParameterSetSelectReady.js`.
- New `#selectParameterSet` `change` / `focus` / `pointerdown` listeners.
- Gate skip on `options.source === "bridge"`.
- Folders `helpers` / `common` / `shared`. Nested functions in AMD entry bodies.

---

## 7. Out of scope

- Dirty-state detector.  
- Ja/Nein buttons.  
- Wave 2–3 WPs.  
- Focus/pointerdown previous-value (legacy).  
- New `_KDB` namespace / new lifecycle term.  
- Forcing grandfathered `cognosWritebackBridge.js` down to 150 lines.  
- GET save-as changing the host option without SET (stale key until next ok restore).

---

## 8. Acceptance

1. Manual dropdown change (non-skip) → confirm; OK restores; Abbrechen/Escape/close reverts select; no restore.  
2. URL inbound sets skip flag → **no** modal; restore runs; flag **cleared**. Overlay-skip **also** clears the flag when it was true.  
3. Boot overlay active → **no** modal.  
4. Cognos `statusKind === "default"` → **no** modal (even before overlay latch).  
5. Host `newDashboard` dropdown → confirm. Recover `restore(null, "newDashboard")` → **no** modal.  
6. Missing **or disposed** messageService, or `confirm` reject → no restore, warn, select reverted.  
7. Waiter timeout/abort **or throw after `change`** on `selectParameterSetById` clears leftover skip flag (`finally`).  
8. Second SET while confirm is open → no second dialog, no second restore (`message.confirm` would otherwise queue). A **skip** SET during an open dialog still restores (skip map before latch).  
9. Failed / cancelled restore does **not** stamp. Capture is at `executeRestoreRun` start, not post-ok DOM.  
10. No Glass footer hack.  
11. New JS files ≤150 / AMD ≤10. Bridge line count **decreases**. Set service AMD stays 10.  
12. After ok restore (including skipped confirm), next Abbrechen reverts to the stamped id (or `"-"` if null).

---

## 9. Parent one-liners (captain after dual review of **implementation**, not writers)

- `writeback-urlParameterId-contractdelta.md` §11: remove “Port of discard-confirm UI…”; point here.  
- Same parent **§5.3 bullet 5**: `skipDiscardConfirmOnce` is **honored and cleared** by this confirm (including overlay-skip and waiter timeout).  
- `writeback.md` runtime blob: `skipDiscardConfirmOnce` honored; add `lastConfirmedParameterSetId: null` and `discardConfirmInFlight: false`.

---

## 10. Locked answers (was open)

1. **No dirty bit** — every non-default host SET.  
2. **Skip** `statusKind === "default"`.  
3. **Confirm** host `newDashboard`; skip recover via call-site (not overlay-as-recover-discriminator).  
4. **Runtime** `lastConfirmedParameterSetId`; stamp in `executeRestoreRun` on `ok === true`; revert `.value=` no `change`.

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-07 | Draft | coordinator | Wave 1 WP1. |
| 2026-09-07 | Draft (patched) | review captain | No dirty bit. Flag never read/cleared. No revert API. Confirm not in `executeRestoreRun`. Skip map / previous-value = PO. |
| 2026-09-07 | Draft (dual-review SOUND) | review captain | Seven live claims match. Still blocked on §10 PO locks. |
| 2026-09-07 | Draft | review captain | PO: proposal series TODO; mechanism not locked. |
| 2026-09-07 | Draft — proposal series **locked** | coordinator | Army series + stress-test. Q1/Q2 HOLD; Q3–Q5 HOLD-WITH-TWEAK (§6). Awaiting PO Approved. |
| 2026-09-07 | Draft (NITS patched) | coordinator | Semantic dual-review NITS: skip-before-latch; mapped `statusKind`; disposed reject try/catch; skip-flag `finally`; §8. Mechanism unchanged. |
| 2026-09-07 | Draft (NITS patched) | coordinator | Mechanical dual-review NITS: orch id seed like `pendingRunId`, not boolean `!== true`. MUST-FIX none. Awaiting PO Approved. |
| 2026-09-07 | `Approved` | PO vastenburg | Mechanism §6 + NITS. Execution spec next; JS after spec army review. |
| 2026-09-07 | `Executed` | PO vastenburg | Cognos green. Dual-review SOUND. Leftover hunt CLEAN. |
