# Execution Spec: specialSingleSelect parameterSet restore rights notify (SSS)

> Mechanical spec for Grok 4.6. Architecture lives in `specialSingleSelect-parameterSetRestore-rights-notify-contractdelta.md` (**Approved**, PO vastenburg 2026-09-08). Do **not** re-decide placement, P1/P4, V1, dstl-wins, overlay rename, H2, or copy.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo every row in Section A **before** producing files.
>
> **Implement gate:** do **not** execute this spec until PROGRAM wave-2 boxes **2, 6, 7** are `[x]` with Cognos green **and** PO has answered **yes** in the SSS chat. If the gate is closed: stop after reading; write nothing.

Live inventory 2026-09-08. Contract+spec adversarial **GREEN** (NIT only): overlay+size GREEN; spec review APPROVE-NIT. `runFilterRestore.js` 143 / AMD 8; `createWritebackSetService.js` **149 / AMD 10** (1-line slack — rename only); `notifyRestoreOutcome.js` 87 / AMD 1; `syncOneSpecialFilter.js` 126 / AMD 6.

---

**Status:** `Executed` — dual grok 4.6 review PASS 2026-09-08; Cognos pending  
**Module / contract:** `contracts/specialSingleSelect.md` + `contracts/specialSingleSelect-parameterSetRestore-rights-notify-contractdelta.md`  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-08  
**Executing AI:** grok 4.6 army (after gate)  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist (one writer)

**May create:**

- `KDB3/js/core/services/writeback/set/effects/dispatchSpecialSingleSelectRestore.js`

**May edit:**

- `KDB3/js/dashboard/filters/specialSingleSelect/effects/applyAutomaticSpecialSelection.js`
- `KDB3/js/dashboard/filters/specialSingleSelect/effects/syncOneSpecialFilter.js`
- `KDB3/js/dashboard/filters/specialSingleSelect/effects/performSpecialSingleSelectSync.js`
- `KDB3/js/dashboard/filters/specialSingleSelect/effects/routeSyncRequested.js`
- `KDB3/js/core/services/writeback/set/effects/runFilterRestore.js` (replace inline SSS `dispatchOwnerPhase` with the new dispatcher; AMD 8→9)
- `KDB3/js/core/services/writeback/set/effects/notifyRestoreOutcome.js`
- `KDB3/js/core/services/writeback/set/config/writebackLabels.js` (add **one** SSS key; do **not** revert the 2026-09-08 identical Dienststelle C4 strings)
- Overlay rename **only** the identifier `pendingDienststelleRestoreInfo` → `pendingRestoreInfo` in:
  - `KDB3/js/core/services/writeback/__orchestratorWriteback.js`
  - `KDB3/js/core/services/writeback/set/state/ensureWritebackRuntime.js`
  - `KDB3/js/core/services/writeback/set/effects/notifyRestoreOutcome.js`
  - `KDB3/js/core/services/writeback/set/effects/recoverUrlSharePending.js`
  - `KDB3/js/core/services/writeback/set/createWritebackSetService.js` (**rename only**; AMD stays 10; lines stay ≤150)
  - `KDB3/js/core/services/writeback/set/effects/whenUrlShareRestoreSettled.js`
  - `KDB3/js/core/services/writeback/set/effects/presentPendingUrlShareMessage.js`

**Must not edit:** `KDB.js`; `applyClearHiddenPolicy.js` (park/`selectionSource==="user"` stays); `evaluateSpecialFilterVisibility.js`; `specialPolicyApplyOps.js`; `specialFilterDefinitions.js`; `createMessageService.js`; `createWritebackSetService.js` except the overlay identifier rename; `dispatchDienststelleRestore.js`; `dienststelle/actions/parameterSet/**`; `notifyDienststelleEmptyOk.js`; `filterRestoreSupport.js` / classify / GET skip-prefix (H2); `singleSelect/actions/parameterSet/**`; parent contracts except captain one-liners after Cognos; `.cursor/rules/*.mdc`; git.

**Must not create:** `helpers/` / `common/` / `shared/`; SSS `actions/parameterSet/`; `core/services/sss*`; a new `messageService` method; a rights-recomputing sidecar.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` via argument; labels under `_KDB.config.labels.de.writeback`; no new top-level namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — this WP does not add SSS state fields; policy patches stay the existing reducer path.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — overlay pending blob is writeback runtime; SSS must not write writeback runtime.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new `_KDB.api.specialSingleSelect` method; no new `messageService` method.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150; orch ≤120; AMD >10 requires split; `createWritebackSetService.js` is already AMD 10.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files; German UI only under `labels.de.*`; `_` on boundary params.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on new dispatcher and notify; missing `notify`/label → `console.warn`; do not throw into SET.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no new `document.querySelector`; C4 uses `message.notify` (not anchored).
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; factory-scope named helpers; no nested subfunctions in entry bodies; no ES modules.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle terms.
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` / `__getDashboardAPI` from feature or this writeback overlay.
13. `_____________KDB3API/contracts/specialSingleSelect-parameterSetRestore-rights-notify-contractdelta.md` — Approved law (P1 + strict P4, V1, writebackSet C4, dstl-wins, Personengruppe copy, H2 OOS).
14. This execution spec.

---

## Section B. Folder tree (create / edit order)

```
KDB3/js/dashboard/filters/specialSingleSelect/effects/
  applyAutomaticSpecialSelection.js     (edit)
  syncOneSpecialFilter.js              (edit)
  performSpecialSingleSelectSync.js   (edit)
  routeSyncRequested.js                (edit)
KDB3/js/core/services/writeback/set/config/
  writebackLabels.js                   (edit — add SSS key)
KDB3/js/core/services/writeback/set/effects/
  dispatchSpecialSingleSelectRestore.js   (new)
  runFilterRestore.js                      (edit)
  notifyRestoreOutcome.js                 (edit)
  recoverUrlSharePending.js               (rename blob)
  whenUrlShareRestoreSettled.js           (rename blob)
  presentPendingUrlShareMessage.js         (rename blob)
KDB3/js/core/services/writeback/set/state/
  ensureWritebackRuntime.js            (rename blob seed)
KDB3/js/core/services/writeback/set/
  createWritebackSetService.js         (rename blob only)
KDB3/js/core/services/writeback/
  __orchestratorWriteback.js           (rename blob only)
```

No new folders.

---

## Section C. Per-file specifications

#### `applyAutomaticSpecialSelection.js`

- **Role:** effect (existing). Live 113 / AMD 3. Hard 150.
- **AMD imports:** unchanged (`specialPolicyShared.js`, `specialPolicyApplyOps.js`, `applyClearHiddenPolicy.js`).
- **Factory-scope helpers** (new, never inside `applyAutomaticSpecialSelection`):
  - `function isNonEmptyInstance(_entry)` — `!!(_entry && _entry.displayValue != null && _entry.useValue != null && String(_entry.useValue) !== "")` (same as live `isNonEmptySelection`, including the `_selection &&` guard).
  - `function shouldAttachPersonengruppeRestoreClearHint(_evaluation, _definition, _syncOptions, _instances)` — `true` iff all of:
    1. `_syncOptions && _syncOptions.reason === "parameterRestore"`
    2. `_definition && _definition.filterLabel === "Personengruppe"`
    3. `_evaluation && _evaluation.rightsUnknown !== true`
    4. `_evaluation.rightAllowed === false` (filter right denied — **not** Sicht-only hide)
    5. `_instances` is an array and some entry passes `isNonEmptyInstance`
- **Entry:** keep `applyAutomaticSpecialSelection`. After the existing `shouldClearHidden` branch **awaits/returns** `_applyClearHiddenPolicy(...)`:
  1. `var clearResult = await _applyClearHiddenPolicy({...})` (replace the bare `return` on that branch).
  2. If `clearResult && clearResult.patch && !clearResult.patch.errorCode` **and** `shouldAttachPersonengruppeRestoreClearHint(...)` → set `clearResult.restoreClearHint = { filterLabel: "Personengruppe" }`.
  3. `return clearResult`.
- Do **not** attach hint on auto-default / keep-selected / restoreParked / `rightsUnknown` / `rightAllowed === true` / Leitung `filterLabel`.
- Do **not** require `selectionSource === "user"` (restore sels are not user-sourced; parkedCandidates would miss P1).
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `error-handling.mdc` (existing try/catch), `feature-structure.mdc` ≤150, `cognos-adapter.mdc` (no cognosAPI).

#### `syncOneSpecialFilter.js`

- **Role:** effect. Live 126 / AMD 6. Hard 150.
- **AMD imports:** unchanged.
- On the success return (`113:119`), add `restoreClearHint: cognosResult && cognosResult.restoreClearHint ? cognosResult.restoreClearHint : null`.
- Abort returns stay without hint.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc` ≤150.

#### `performSpecialSingleSelectSync.js`

- **Role:** effect. Live 73 / AMD 4. Hard 150.
- **AMD imports:** unchanged.
- Factory-scope: `function collectRestoreClearLabels(_results)` — walk `results`; if `result.restoreClearHint && result.restoreClearHint.filterLabel === "Personengruppe"` push that string once (dedupe).
- On the **success** return object (`56:62`), add `clearedRestoredValues`: if `options.reason === "parameterRestore"` then `collectRestoreClearLabels(results)`, else `[]`.
- Abort return: `clearedRestoredValues: []`.
- Do **not** re-read tableData. Do **not** toast.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`.

#### `routeSyncRequested.js`

- **Role:** effect. Live 87 / AMD 2.
- `buildAck`: add `specialSingleSelectRestoreHint: { clearedRestoredValues: Array.isArray(result.clearedRestoredValues) ? result.clearedRestoredValues.slice() : [] }`.
- Validation-failure / catch acks: `clearedRestoredValues: []`.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.

#### `writebackLabels.js`

- **Role:** config. Live 17 / AMD 0.
- Add **exactly one** new key (keep both Dienststelle keys as they are today — identical Standardauswahl strings):

```js
specialSingleSelectRestoreClearedMessage: "Eine oder mehrere gespeicherte Personengruppe-Auswahlen sind nicht verfügbar. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen. Die Auswahl wurde zurückgesetzt."
```

- **Rules to apply:** `amd.mdc`, `naming.mdc`, `kdb-object.mdc` (merge path already `__orchestratorWriteback`).

#### `dispatchSpecialSingleSelectRestore.js` (**new**)

- **Role:** writeback SET effect (dstl twin, thinner).
- **Lines:** target 34–45 (hard 80). Twin of live `dispatchDienststelleRestore.js` (35), not dstl apply.
- **AMD imports (order):**
  1. `"../../schema/errorCodes.js"`
- **Factory parameters:** `_errorCodes`
- **Entry:** `async function dispatchSpecialSingleSelectRestore(_run, _resolvedTargets, _terminalInventoryGeneration)`
  - `try` / `catch`: log `"[writebackSet.dispatchSpecialSingleSelectRestore] failed"`; rethrow (same as dstl).
  - `const phase = await _run.dispatchOwnerPhase({ phaseName: "specialSingleSelectRestoreSync", owner: "specialSingleSelect", type: "specialSingleSelect/syncRequested", payload: { reason: "parameterRestore", tabIdxToScopeId: _resolvedTargets, inventoryGeneration: _terminalInventoryGeneration }, skipHistoryFlag: false, required: false, degradedAllowed: true, failureCode: _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED })`.
  - `owner = phase && phase.result`.
  - `_run.specialSingleSelectRestoreHint = { clearedRestoredValues: (owner && owner.specialSingleSelectRestoreHint && Array.isArray(owner.specialSingleSelectRestoreHint.clearedRestoredValues)) ? owner.specialSingleSelectRestoreHint.clearedRestoredValues : [] }`.
  - Always assign `_run.specialSingleSelectRestoreHint` from the ack arrays (may be empty). **Follow this assignment**, not a gate on `ok !== true` (that inverts P4). Do **not** call `messageService`.
- **Return:** `undefined`.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `feature-structure.mdc`, `cognos-adapter.mdc`.

#### `runFilterRestore.js`

- **Role:** writeback SET effect. Live 143 / AMD 8 → **9**.
- Add AMD import after `dispatchDienststelleRestore.js`: `"./dispatchSpecialSingleSelectRestore.js"`; factory param `_dispatchSpecialSingleSelectRestore`.
- Replace the inline SSS `await run.dispatchOwnerPhase({...})` (`122:133`) with `await _dispatchSpecialSingleSelectRestore(run, resolvedTargets, terminalInventoryGeneration);`
- Keep the following `assertStableGeneration` for SSS.
- **Must** finish ≤150 lines.
- **Rules to apply:** `amd.mdc`, `feature-structure.mdc` (AMD 9; ≤150).

#### `notifyRestoreOutcome.js`

- **Role:** writeback SET effect. Live 87 / AMD 1. Target ~110. Hard 150. AMD stays 1.
- Keep `pickDienststelleInfoKey` as today.
- Factory-scope `function pickSssInfoKey(_hint)` — if `_hint && Array.isArray(_hint.clearedRestoredValues) && _hint.clearedRestoredValues.length > 0` return `"specialSingleSelectRestoreClearedMessage"`; else `null`.
- After abort/`committed|degraded` gate: `labelKey = pickDienststelleInfoKey(_run.dienststelleRestoreHint)`; **if !labelKey** `labelKey = pickSssInfoKey(_run.specialSingleSelectRestoreHint)`.
- If still !labelKey → return (silent).
- Overlay: `pend…` writes **`pendingRestoreInfo = { labelKey }`** (renamed). Live notify: existing `message.notify` `{ message, severity: "info" }`.
- If `labelKey` is the SSS key and the label string is missing **or** `notify` missing: `console.warn("[writebackSet.notifyRestoreOutcome] specialSingleSelect restore info skipped")`; do not throw.
- Abort `showAlert` unchanged; still returns before info (**never both**).
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `feature-structure.mdc`, `module-public-api.mdc` (existing `notify` only).

#### Overlay rename files

Replace identifier `pendingDienststelleRestoreInfo` with `pendingRestoreInfo` in every allowlisted file in Section B. No behavior change. `presentPendingUrlShareMessage.js` still looks up `labels[pending.labelKey]`. Ladder unchanged: missing-id > abort > info. Do **not** add a second pending field. Do **not** add AMD to `createWritebackSetService.js`.

---

## Section D. Reducer behavior table

No new action types. Existing `SYNC_FILTER_EVALUATED` patches unchanged. Hint is **not** state.

---

## Section E. Published selectors

None.

---

## Section F. Public API wiring

Unchanged `_KDB.api.specialSingleSelect` / `_KDB.services.writebackSet`. Hint is `_run.specialSingleSelectRestoreHint` on the SET run object only.

---

## Section G–I. Harness

None.

---

## Section J. Acceptance (writer self-check)

1. Allowlist only; no file >150; `createWritebackSetService.js` AMD still 10.
2. P1: restore non-empty Personengruppe + filter right denied → hint on ack → SET-finish info `notify` with SSS copy.
3. Auto-default Alle-denied empty → no hint.
4. Keep-selected → no hint.
5. Sicht-only hide (`rightAllowed === true`) → no hint.
6. Leitung `filterLabel` → no hint.
7. Dstl C4 hint nonempty → **only** dstl toast (same German on both dstl keys).
8. Abort/cancelled: no SSS info toast.
9. Overlay: SSS `labelKey` pends on `pendingRestoreInfo`; no live toast under overlay.
10. Ordinary tableData/Sicht `syncRequested` (`reason` not `parameterRestore`) → `clearedRestoredValues: []` on ack; writeback dispatcher not called.
11. No `_KDB.cognosAPI` from edited SSS files. No `messageService` in SSS folder.
12. Zero `pendingDienststelleRestoreInfo` left under `KDB3/js/core/services/writeback/`.

---

## Section K. Forbidden actions

- Execute while wave-2 boxes 2/6/7 are still `- [ ]` or PO has not said yes to SSS JS.
- Invent per-option Lehrlinge rights; abort SET; `required: true` on SSS sync.
- Reuse `dienststelleRestore*` keys for SSS.
- Stash on `phase.result.ok !== true`.
- Re-evaluate rights in a new sidecar.
- Edit `.mdc`; commit; parent one-liners (captain after dual review + Cognos).

---

## Section L. Reporting template

Same as `_executionSpecTemplate.md` Section L (pre-flight echo, file checklist with line/AMD, deviations, J checklist, open questions).

---

## Section M. Reviewer handoff

Captain: dual grok 4.6 review (mechanical AMD/try-catch/allowlist + semantic J). Then PO Cognos. Parent one-liners after that.
