# Execution Spec: parameterset discard confirm (WP1)

> Implements `contracts/writeback-discard-confirm-contractdelta.md` (**Approved**, PO vastenburg 2026-09-07). Architecture lives in that delta. This spec is mechanical: exclusive slices, files, MUST echoes. Do not invent.

---

**Status:** `Executed` — Cognos green PO vastenburg 2026-09-07. W1+W2 landed; dual-review SOUND; leftover hunt CLEAN.  
**Module / contract:** `contracts/writeback.md` + `contracts/writeback-discard-confirm-contractdelta.md` + `contracts/writeback-urlParameterId-contractdelta.md` (skip flag) + `contracts/messageService.md` (`confirm` only)  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-07  
**Executing AI:** grok 4.6 army W1 then W2  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos (delta §8)

No harness. Production tree only. Parent one-liners (delta §9) are **captain after implementation dual-review**, not writers.

---

## Exclusive allowlists (no two writers on the same file)

**Order: W1 first.** W2 may start only after W1 has landed `confirmDiscardUnsavedChanges.js` on disk.

### W1 — seeds, labels, confirm helper, stamp, skip-flag `finally`

**May create:**

- `KDB3/js/core/services/writeback/bridge/confirmDiscardUnsavedChanges.js`

**May edit:**

- `KDB3/js/core/services/writeback/set/config/writebackLabels.js`
- `KDB3/js/core/services/writeback/set/state/ensureWritebackRuntime.js`
- `KDB3/js/core/services/writeback/__orchestratorWriteback.js` (`normalizeWritebackRuntime` only)
- `KDB3/js/core/services/writeback/set/effects/executeRestoreRun.js`
- `KDB3/js/core/services/writeback/bridge/selectParameterSetById.js`

**Must not edit:** `cognosWritebackBridge.js`, `createWritebackSetService.js`, `recoverUrlSharePending.js`, `waitForBridgeSetSettlement.js`, `waitForParameterSetSelectReady.js`, `runBridgeSetRestore.js` (W2 creates it), `KDB.js`, `messageService/**`, `historyControls/**`, `shareControls/**`, `.cursor/rules/**`, parent contracts.

### W2 — SET runner + thin `bridgeSet`

**May create:**

- `KDB3/js/core/services/writeback/bridge/runBridgeSetRestore.js`

**May edit:**

- `KDB3/js/core/services/writeback/cognosWritebackBridge.js`

**Must not edit:** any W1 file, `createWritebackSetService.js`, `executeRestoreRun.js`, `recoverUrlSharePending.js`, `waitForBridgeSetSettlement.js` (import only from the new runner), `KDB.js`, `.cursor/rules/**`.

---

## Section A. Pre-flight (each writer, before files)

Echo **one sentence each**, numbered, then write. Do not ingest these into the captain thread.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc`
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc`
13. `_____________KDB3API/contracts/writeback-discard-confirm-contractdelta.md` (§6 + §8)
14. This execution spec

---

## Section B. Folder tree

Existing `writeback/bridge/` — do not create new folders.

```
KDB3/js/core/services/writeback/
  bridge/
    confirmDiscardUnsavedChanges.js   (W1 create)
    runBridgeSetRestore.js            (W2 create)
    selectParameterSetById.js         (W1 edit)
  set/config/writebackLabels.js       (W1 edit)
  set/state/ensureWritebackRuntime.js (W1 edit)
  set/effects/executeRestoreRun.js    (W1 edit)
  __orchestratorWriteback.js          (W1 edit)
  cognosWritebackBridge.js            (W2 edit)
```

---

## Section C. Per-file specifications

### W1.1 `set/config/writebackLabels.js`

- **Role:** declarative labels
- **Lines:** 12 → ~16 (hard 150)
- **AMD:** stay `[]`
- Keep all six existing keys. **Add exactly:**

| Key | Value (UTF-8) |
|---|---|
| `discardUnsavedTitle` | `Nicht gespeicherte Änderungen` |
| `discardUnsavedMessage` | `Hinweis: Beim Öffnen eines Dashboards aus dem Dropdown werden nicht gespeicherte Änderungen verworfen.\n\nMöchten Sie fortfahren?` (two newlines between sentences) |
| `discardUnsavedConfirm` | `OK` |
| `discardUnsavedCancel` | `Abbrechen` |

No other German literals in new JS. Orchestrator already `Object.assign({}, _writebackLabels, existing)`.

- **Rules:** `naming.mdc` — English keys; DE values only here. `feature-structure.mdc` — config folder.

### W1.2 `set/state/ensureWritebackRuntime.js`

- **Role:** runtime seed
- **Lines:** 32 → ~36. AMD 0.
- Inside `seedWritebackRuntimeKeys`, add **only if `=== undefined`:**
  - `runtime.lastConfirmedParameterSetId = null`
  - `runtime.discardConfirmInFlight = false`
- Do not boolean-coerce the id.

- **Rules:** `runtime.mdc` — owner `_KDB.runtime.writeback`; standard-ish flags on existing owner. `kdb-object.mdc` — no new top-level namespace. `error-handling.mdc` — file stays seed-only (exempt one-liners).

### W1.3 `__orchestratorWriteback.js` — `normalizeWritebackRuntime` only

- **Role:** module orchestrator (existing). Do **not** add AMD. Do **not** change install/wiring.
- After the `skipDiscardConfirmOnce` line, add:
  - `if (runtime.lastConfirmedParameterSetId === undefined) runtime.lastConfirmedParameterSetId = null;`
    Analog is **`pendingRunId`** (`== null ? null : keep` is also OK). **Forbidden:** `if (runtime.lastConfirmedParameterSetId !== true) runtime.lastConfirmedParameterSetId = false` — copies L72 and stamp-wipes.
  - `if (runtime.discardConfirmInFlight !== true) runtime.discardConfirmInFlight = false;` (boolean latch **may** copy L72)

- **Rules:** `feature-structure.mdc` — thin orch. `runtime.mdc`. `naming.mdc`. `error-handling.mdc` — existing orch try/catch stays.

### W1.4 `bridge/confirmDiscardUnsavedChanges.js` (create)

- **Role:** named-method effect (bridge helper)
- **Lines:** target 70–90 (hard 150). **Do not** split a third file.
- **AMD imports (exactly 2, this order):**
  1. `"../set/state/ensureWritebackRuntime.js"`
  2. `"./parameterSetSelectConstants.js"`
- **Factory parameters:** `_ensureWritebackRuntime`, `_parameterSetSelectConstants`
- **Factory-scope helpers (named declarations, not inside the entry):**
  - `function revertSelect(_runtime)` — `document.getElementById(_parameterSetSelectConstants.SELECT_ID)`; if node: `.value = _runtime.lastConfirmedParameterSetId \|\| "-"`. **No** `dispatchEvent`. **No** `selectParameterSetById`. try/catch: `console.error("[writeback.revertSelect] failed", error)` then return.
  - `async function confirmDiscardUnsavedChanges(_KDB, _statusKind)` — entry; return `true` (proceed restore) or `false` (no restore).
- **Return value of `define`:** `confirmDiscardUnsavedChanges`

**Entry body (order is law — delta §6.2):**

1. `try` whole body. Outer catch: `console.error("[writeback.confirmDiscardUnsavedChanges] failed", error)`; attempt `revertSelect` if runtime exists; return `false`.
2. `var runtime = _ensureWritebackRuntime(_KDB);`
3. **Skip map (sync, no `message.confirm`):**
   - If `runtime.skipDiscardConfirmOnce === true`: set it `false`, remember skip.
   - If `runtime.urlShareBootOverlayActive === true`: skip.
   - If `_statusKind === "default"`: skip (kind is already mapped; **do not** import `STATUS_TABLE`; **do not** compare raw `"defaultParamSet"`).
   - If skip: **return `true`** (proceed restore). Do **not** set the latch.
4. **Latch (only if not skip):** if `runtime.discardConfirmInFlight === true`: `console.warn("[writeback.confirmDiscardUnsavedChanges] discarded overlapping SET")`; return `false`. **Do not** revert (open dialog owns revert).
5. `var svc = _KDB.services && _KDB.services.message;` if `!svc \|\| typeof svc.confirm !== "function"`: `console.warn("[writeback.confirmDiscardUnsavedChanges] messageService unavailable — restore blocked (fail closed)")`; `revertSelect(runtime)`; return `false`.
6. `runtime.discardConfirmInFlight = true;`
7. Inner `try`:
   - Labels from `_KDB.config.labels.de.writeback` (guard each hop). Keys: `discardUnsavedTitle`, `discardUnsavedMessage`, `discardUnsavedConfirm`, `discardUnsavedCancel`.
   - `var result = await svc.confirm({ code: "WRITEBACK_DISCARD_UNSAVED", title, message, confirmLabel, cancelLabel })`.
   - If `!result \|\| result.confirmed !== true`: `revertSelect(runtime)`; return `false`.
   - Return `true`.
8. Inner `catch`: disposed `confirm` **rejects**. `console.warn("[writeback.confirmDiscardUnsavedChanges] confirm rejected", error)`; `revertSelect(runtime)`; return `false`. (Do **not** clone tabs `showAlert`.)
9. Inner `finally`: `runtime.discardConfirmInFlight = false`.

**Forbidden in this file:** tabs import; `executeRestoreRun`; `_KDB.cognosAPI`; native `confirm`; `change` listener; German string literals (labels only).

- **Rules:** `amd.mdc` — factory-scope helpers; no nested functions inside entry. `naming.mdc` — `_` on boundary inputs. `error-handling.mdc` — try/catch; Abort not required (modal, not fetch). `module-public-api.mdc` — not a public writeback method; fail-closed no throw to Cognos. `runtime.mdc` — owner runtime only. `events.mdc` — no events. `dom.mdc` — `getElementById(SELECT_ID)` is the existing writeback-bridge pattern (`readSelectedParameterSet.js`); not a feature-module mount. `cognos-adapter.mdc` — no host SDK.

### W1.5 `set/effects/executeRestoreRun.js`

- **Role:** restore-run coordinator. **Confirm stays out.**
- **Lines:** 74 → ~90 (hard 150). AMD **7→8**.
- **Add AMD import last:** `"../../bridge/parameterSetSelectConstants.js"` as `_parameterSetSelectConstants`.
- **Factory-scope helper:** `function captureParameterSetSelectId()` — `getElementById(SELECT_ID)`; missing / `NEW_DASHBOARD_VALUE` / value in `PLACEHOLDER_VALUES` → `null`; else `select.value`. try/catch → `console.error("[writebackSet.captureParameterSetSelectId] failed", error)`; return `null`.
- In `executeRestoreRun`, `let capturedId = null;` with the other lets.
- Immediately after `runtime = _restoreRunState.ensureWritebackRuntime(_KDB);` (still before loading/history): `capturedId = captureParameterSetSelectId();`
- After `finally` cleanup, keep `_notifyRestoreOutcome`. Then:

```js
var result = _restoreRunState.buildRestoreResult(run, outcome, baseline);
if (result && result.ok === true && runtime) {
  runtime.lastConfirmedParameterSetId = capturedId;
}
return result;
```

Stamp **only** `result.ok === true` (`committed` \| `degraded`). Do not stamp from payload. Do not read DOM after ok. Do not stamp in `notifyBridgeSetSettled`. Do not import recover.

- **Rules:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc` ≤150 / AMD ≤10; `error-handling.mdc` — helper try/catch; `runtime.mdc`; `state.mdc` — no `_KDB.state` write; `cognos-adapter.mdc` — no SDK.

### W1.6 `bridge/selectParameterSetById.js`

- **Role:** URL inbound select. **Not revert.**
- **Lines:** 102 → ~112. AMD stays 4.
- Keep L70–73: assign value, **then** `skipDiscardConfirmOnce = true`, **then** `dispatchEvent("change")`.
- Add `var didSetSkipFlag = false;` with the other vars.
- When setting the flag to `true`, also `didSetSkipFlag = true`.
- Add `finally` on the existing try/catch (after catch, so timeout/abort/throw-after-change all run it):

```js
} finally {
  if (didSetSkipFlag === true && runtime) {
    runtime.skipDiscardConfirmOnce = false;
  }
}
```

Do not clear on early returns **before** the flag is set (`didSetSkipFlag` stays false). Do not call confirm here.

- **Rules:** `amd.mdc`; `naming.mdc`; `error-handling.mdc` — existing catch stays; `finally` must not swallow the catch throw (rethrow already happened). `runtime.mdc`.

---

### W2.1 `bridge/runBridgeSetRestore.js` (create)

- **Role:** SET-path effect extracted from `bridgeSet`
- **Lines:** target 90–120 (hard 150)
- **AMD imports (this order):**
  1. `"./confirmDiscardUnsavedChanges.js"`
  2. `"./normalizeBridgeSetInput.js"`
  3. `"../schema/errorCodes.js"`
  4. `"./waitForBridgeSetSettlement.js"`
  5. `"../set/config/restoreConstants.js"`
- **Factory parameters:** `_confirmDiscardUnsavedChanges`, `_normalizeBridgeSetInput`, `_errorCodes`, `_waitForBridgeSetSettlement`, `_restoreConstants`
- **Factory-scope (named declarations, not inside the entry):**
  - `function notifyAfterRestore(_KDB, result, rawStatus, restoreStartedAt)` — **move unchanged** from `cognosWritebackBridge.js` L18–30. Do **not** stamp here.
  - `function toBridgeDiagnostic(error)` — **clone** live L227–234 (`error.diagnostic` or `_errorCodes.makeDiagnostic(WRITEBACK_INVALID_V3_PAYLOAD, ...)`). The live catch at L222 calls this; it is **outside** the L180–224 copy span. Omitting it is a `"use strict"` `ReferenceError` in the runner catch → wrapper catch logs the **wrong** error and **skips** `notifyAfterRestore` (URL waiter timeout).
- **Entry:** `async function runBridgeSetRestore(_KDB, _raw, _status)`
- **Return:** `runBridgeSetRestore`

**Entry body:**

1. `const status = _status === undefined \|\| _status === null ? "notDefaultParamSet" : String(_status);`
2. `var restoreStartedAt;` `var didEnterRestore = false;` `var result;` — live L174–176 sit **above** `assertBridgeUsable`. A literal copy starting at L180 will throw on `didEnterRestore = true` in strict mode. Name them here.
3. `var statusKind = _restoreConstants.STATUS_TABLE[status];` (may be undefined for unsupported raw status — still call confirm with that value; default skip only on `"default"`).
4. `var proceed = await _confirmDiscardUnsavedChanges(_KDB, statusKind);`
5. If `proceed !== true`: return `{ ok: false, status: status, runId: 0, outcome: "cancelled", diagnostics: [], phases: [] }`. **No** restore. **No** `notifyAfterRestore`.
6. Then copy today’s `bridgeSet` **try body + catch** from live L180–224 (`newDashboard` restore **without** `{ source: "bridge" }`; v3/v2 with `{ source: "bridge" }`; unsupported format throw). Catch: `console.error("[writebackBridge.runBridgeSetRestore] failed", error)` (no `logBridgeError` in this file — do not pass nested loggers from the 282-line factory). Catch builds `{ ok: false, outcome: "failed", diagnostics: [toBridgeDiagnostic(error)], phases: [] }` and calls `notifyAfterRestore` only if `didEnterRestore`. Runner catch **returns** that object (does not rethrow), so the thin `bridgeSet` wrapper catch never sees restore failures.
7. Restore calls stay `_KDB.services.writebackSet.restore(...)`. Deep file must **not** look up `_KDB.services.cognosHost`.

Do not gate on `options.source === "bridge"`. Do not confirm inside `executeRestoreRun`.

- **Rules:** `amd.mdc` — factory-scope `notifyAfterRestore`; no nested functions in the async entry (use the existing sequential ifs, not inner closures). `naming.mdc`. `error-handling.mdc`. `feature-structure.mdc` ≤150 / AMD 5. `module-public-api.mdc` — not a new public method. `cognos-adapter.mdc` — no `__getDashboardAPI` / `_KDB.cognosAPI`. `events.mdc` — no new events.

### W2.2 `cognosWritebackBridge.js`

- **Role:** Cognos bridge factory (grandfathered >150)
- **Must decrease** 282 → target **220–240**. AMD **6→4**.
- **AMD after edit (exactly 4):**
  1. `"./schema/errorCodes.js"`
  2. `"./bridge/readSelectedParameterSet.js"`
  3. `"./bridge/selectParameterSetById.js"`
  4. `"./bridge/runBridgeSetRestore.js"`
- Remove AMD for `normalizeBridgeSetInput.js` (SET extract owns it), `waitForBridgeSetSettlement.js`, and `restoreConstants.js`. Do **not** keep a dead normalize import.
- Delete factory-scope `notifyAfterRestore` from this file.
- Keep GET, install/uninstall, `assertBridgeUsable`, `logBridgeCall`, `logBridgeError`, `toBridgeDiagnostic`, public `{ install, uninstall, isInstalled, destroy, readSelectedParameterSet, selectParameterSetById }`.
- `bridgeSet` becomes thin:

```js
async function bridgeSet(_raw, _status) {
  const status = _status === undefined || _status === null ? "notDefaultParamSet" : String(_status);
  logBridgeCall("set", { status: status });
  try {
    assertBridgeUsable("set");
    return await _runBridgeSetRestore(_KDB, _raw, _status);
  } catch (error) {
    logBridgeError("set", error);
    return {
      ok: false,
      status: status,
      runId: 0,
      outcome: "failed",
      diagnostics: [toBridgeDiagnostic(error)],
      phases: []
    };
  }
}
```

Do **not** confirm here. Do **not** thicken. Do **not** chase ≤150. Nested service methods inside `createCognosWritebackBridge` stay (grandfathered factory).

- **Rules:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc` — line count must drop; AMD ≤10; `error-handling.mdc`; `kdb-object.mdc` — no new `_KDB` keys; `module-public-api.mdc` — public surface unchanged.

---

## Section D. Reducer behavior table

N/A — no writeback reducer / no `_KDB.state` for this dialog (delta §2 lock 7).

---

## Section E. Published selectors

N/A.

---

## Section F. Public API wiring

- Surface unchanged: `_KDB.services.writebackBridge` methods listed in W2.2. `_KDB.services.writebackSet.restore` unchanged.
- Runtime seeds: `lastConfirmedParameterSetId`, `discardConfirmInFlight` on `_KDB.runtime.writeback`.
- No `_KDB.api` change. No new messageService method (`confirm` exists).

---

## Section G–I. Harness / mocks

N/A. No harness.

---

## Section J. Acceptance (writer self-check)

Echo delta §8 plus:

1. W1 files exist before W2 starts.
2. `confirmDiscardUnsavedChanges.js` AMD **2**. `runBridgeSetRestore.js` AMD **5**. `cognosWritebackBridge.js` AMD **4** (was 6). `createWritebackSetService.js` **untouched** (AMD 10).
3. Skip map before latch before `confirm`. Skip path never calls `svc.confirm`.
4. Mapped `_statusKind === "default"` skips; raw alias handling is the runner’s `STATUS_TABLE` lookup.
5. Recover path untouched — no confirm there.
6. Stamp only on `result.ok === true` in `executeRestoreRun`. Capture at start.
7. Revert never uses `selectParameterSetById`.
8. `selectParameterSetById` `finally` clears leftover skip only if `didSetSkipFlag`.
9. Bridge line count **less than 282**. No new `helpers/` folder. No nested functions in new AMD entries.
10. No `.mdc` edits. No git commit.

---

## Section K. Forbidden actions

- Modify `.cursor/rules/**`, `_template.md`, `_executionSpecTemplate.md`, parent `writeback.md` / `writeback-urlParameterId-contractdelta.md` / `messageService.md` (captain one-liners later).
- Edit `createWritebackSetService.js`, `recoverUrlSharePending.js`, `waitForParameterSetSelectReady.js`, `KDB.js`, `historyControls/**`, `shareControls/**`, `messageService` internals, `tabs/**` (read `confirmAndDispatchTabDelete.js` only as clone reference).
- Invent a dirty bit, `change`/`focus` listener, native `confirm`, Glass footer hack, `source === "bridge"` skip gate, third new JS file, stamp in `notifyBridgeSetSettled`.
- ES modules in `KDB3/js/**`. Folders `helpers` / `common` / `shared`.
- Commit / push / git config.
- Skip Section A echo.

---

## Section L. Reporting template

1. Pre-flight echo (14).
2. File checklist: path, lines, AMD, matches spec | deviation.
3. Deviations with motivation.
4. Section J pass/fail.
5. Open questions — stop, do not invent.

---

## Section M. Reviewer handoff

Captain: verify echo; dual grok review mechanical (AMD, size, `_` prefix, try/catch, skip-before-latch) + semantic (delta §8 vs code). Parent one-liners after that. PO Cognos = delta §8. Tick program box **1** only when Cognos green.
