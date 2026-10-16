# Execution Spec: singleSelect restore table display

> Mechanical spec for Grok 4.6. Architecture lives in
> `singleSelect-restore-table-display-contractdelta.md` (**Approved**,
> PO vastenburg 2026-09-09). Do **not** re-decide S4/M1/F1/H0, overlay, hydrate,
> GET `vals` = use, or SSS-as-sels-owner.
> Overflow: restore commits Cognos echo `d===u` as `"cognos"`; this slice commits
> resolved `d` as `"table"` when unique hit and `observed.d !== resolved.d`.
> No harness. Production: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo Section A **before** files.

---

**Status:** `Executed` — 2026-09-09; dual review PASS (mechanical + semantic). **PO Cognos green 2026-09-09.**  
**Module / contract:** `contracts/singleSelect-restore-table-display-contractdelta.md`  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Executing AI:** grok 4.6 army  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist (one writer)

**May create:**

- `KDB3/js/dashboard/filters/singleSelect/actions/parameterSet/commitRestoreSelection.js`

**May edit:**

- `KDB3/js/dashboard/filters/singleSelect/actions/parameterSet/applyRestoreSelectionCore.js` (sequencer only after split)
- `KDB3/js/dashboard/filters/singleSelect/state/createFilterInstanceState.js`
- `KDB3/js/dashboard/filters/singleSelect/actions/parameterSet/parameterSetResyncApplyPair.js`

**Must not edit:** `applyRestoreSelection.js` (catch wrapper AMD 2); `resolveRestoreSelectionPair.js`; `commitSelectionState.js`; `verifyCommitFilterValue.js`; `writeVerifiedSelection.js`; `applySpecialSelectionPolicy.js`; `hydrateStateFromPopup.js`; `ownerRoutes.js`; `parameterSetResyncApply.js`; `createWritebackSetService.js`; `KDB.js`; messageService; toast PROGRAM files; parent contracts; `.mdc`; git.

**Must not create:** `classifyRestoreObservedDisplay.js`; `waitRestoreHostValues.js`; `rewriteRestoreHostPair.js`; `helpers/` / `common/` / `shared/`; a new `messageService` method; dock overlay.

**Read-only (copy patterns, do not edit):** `commitSelectionState.js` (`applyConfirmedState`); `verifyCommitFilterValue.js` (3-arg); `hostFilterWrite.js`; `parameterSetResyncApply.js` (`resolveConfirmedSelection` already forwards `record.currentSelection` including `displaySource`).

If `parameterSetResyncApplyPair.js` would exceed **150** after lock 7: **STOP**, report, split only skip-write + table keep-owner into `actions/parameterSet/keepResyncOwnerPair.js`. Do not silently grow. Army estimate: ~132–145 / AMD 6 — stay in-file unless count proves otherwise.

---

## Section A. Pre-flight read list

Echo **one sentence** per row **before** files:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` via argument; no new top-level namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — `singleSelect` is the canonical writer of `state.filters.singleSelect` instances; no foreign writes; no persist of display into `filt.sels`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — this slice adds no new runtime bucket.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new public method on `_KDB.api` / `_KDB.services`.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150; orch ≤120; AMD ≤10; split by job; no silent grow. Core was 120/7 — split **before** adding classify lines.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English `verb+noun.js`; `_` on boundary inputs only; no `helpers`/`Support`.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on named executables; restore/resync boundaries already convert or rethrow as live; F1 skip-write must **not** throw.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no DOM / overlay this slice.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; factory-scope helpers; no nested functions in entry bodies; no ES modules.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle term.
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no new facet; keep stamped `filtersFacet` via existing `hostFilterWrite` / `readFiltersFacet`.
13. `_____________KDB3API/contracts/singleSelect-restore-table-display-contractdelta.md` — law: locks 3–8; M1 = `resolved.degraded === false`; chip overlay OOS.
14. This execution spec.

---

## Section B. Edit order

```
KDB3/js/dashboard/filters/singleSelect/
  actions/parameterSet/commitRestoreSelection.js     (new)
  actions/parameterSet/applyRestoreSelectionCore.js   (edit — swap commit import)
  state/createFilterInstanceState.js                (edit — lock 6)
  actions/parameterSet/parameterSetResyncApplyPair.js  (edit — lock 7)
```

No new folders. Do not touch `applyRestoreSelection.js`.

---

## Section C. Per-file

### Traps (do not rediscover)

1. **M1 apply** = `resolved.degraded === false` (dump Lehrlinge / DST_LTNG **or** option table). Not “only `config.tables` rows”.
2. **Lock 3 vs 4:** unique hit ∧ `observed.d !== resolved.d` → `"table"`. `observed.d === resolved.d` → `"cognos"`. **Do not** gate on `observed.d === use`.
3. **No extra restore write. No M4 loop.** First write is already `resolved.selection`. Core already one-shot post-write `readValues` for `u`.
4. **F1 resync:** skip `writeValues` + verify + rollback + canonical when incoming `"unavailable"` / **pre-coerce** null `d` **and** non-empty `use`. Do **not** only delete the L20 throw (then L31 writes `{d:"",u}`). **Alle** still `writeValues([])` — do not skip-write on `!displayValue` after `null`→`""`.
5. **Resync `"table"`:** write owner pair; probe existing 3-arg `verifyCommitFilterValue`; on `!ok` **and** on `ok` keep owner via `applyConfirmedState` (owner `d` + `"table"`). **No throw. No `rollbackHostWrite`. No `updateCanonicalInstance(observed.d)`.**
6. **`createFilterInstanceState`:** **separate** `"table"` preserve (keep `d`). Do not reuse the unavailable object that zeros `d`. Load-bearing = terminal resync reconcile.
7. **Do not** call `writeVerifiedSelection`.
8. **H0 residual:** first popup open can wipe `use` if option label ≠ owner `d`. Out of slice. Do not “fix” hydrate.
9. Chip stays Cognos `.d`. Do not overlay.

---

#### `actions/parameterSet/commitRestoreSelection.js` (new)

- **Role:** restore-commit sibling (named helper module, not a shared classifier).
- **Lines:** target 60–80 (hard 150).
- **AMD imports (order):**
  - `"../../effects/commitSelectionState.js"`
  - `"../../config/parameterSetCodes.js"`
- **Factory parameters:** `_commitSelectionState`, `_codes`
- **Entry:** `function commitRestoreSelection(_canonicalInstance, _root, _args)`
- **Return:** the entry function.
- **`_args`:** `{ useValue, resolved, observed, filterInstanceId }` (`observed` = `readValues` array).
- **Factory-scope helpers OK** (never inside the entry): e.g. `commitEmptyRestore`, `commitObservedRestore`.
- **Body:**
  1. If `!_args.useValue`: `applyConfirmedState(_canonicalInstance, _root, { displayValue: "Alle", useValue: "", displaySource: "policy" })`. Return `{ committed: true, degraded: false, diagnostic: null }`.
  2. `observedDisplay` = `observed[0].d == null ? null : String(observed[0].d)` (caller already confirmed `observed[0].u === useValue`).
  3. `resolvedD` = `resolved.selection && resolved.selection.d != null ? String(resolved.selection.d) : null`.
  4. **Lock 3:** `resolved.degraded === false` **and** `resolvedD != null` **and** `observedDisplay !== resolvedD` → `applyConfirmedState` with `{ displayValue: resolvedD, useValue: String(observed[0].u), displaySource: "table" }`. Return `{ committed: true, degraded: false, diagnostic: null }`.
  5. **Else today’s live classify** (do **not** invent a third degraded path):
     - `transportOnly = resolved.degraded === true && (observedDisplay === null || observedDisplay === useValue)`
     - `displayUnavailable = observedDisplay === null`
     - `applyConfirmedState` with `{ displayValue: transportOnly ? null : observedDisplay, useValue: String(observed[0].u), displaySource: transportOnly || displayUnavailable ? "unavailable" : "cognos" }`
     - Return `{ committed: true, degraded: transportOnly || displayUnavailable, diagnostic: transportOnly ? resolved.diagnostic : (displayUnavailable ? { code: _codes.DISPLAY_DEGRADED, filterInstanceId, message: "host reread confirmed use value without an independent display value" } : null) }`
- **Rules to apply:** `amd.mdc` (factory-scope only); `naming.mdc`; `feature-structure.mdc` (actions/); `state.mdc` (owner write via `applyConfirmedState` only); `error-handling.mdc` (try/catch on the entry); `kdb-object.mdc` (no new namespace).
- **Do not** import `hostFilterWrite`. **Do not** write the host. **Do not** call `writeVerifiedSelection` / `verifyCommitFilterValue`.

---

#### `actions/parameterSet/applyRestoreSelectionCore.js` (edit)

- **Role:** sequencer only.
- **Lines:** target ~100–108 (hard 150). Live 120.
- **AMD after split (7 — swap, do not add):**
  1. `"./parameterSetRuntime.js"`
  2. `"./filterRestoreSupport.js"`
  3. `"../../effects/resolveFilterRef.js"`
  4. `"../../effects/resolveRestoreSelectionPair.js"`
  5. `"../../effects/hostFilterWrite.js"`
  6. `"../../config/parameterSetCodes.js"`
  7. `"./commitRestoreSelection.js"`
- **Drop:** `"../../effects/commitSelectionState.js"`.
- **Keep:** `runApplyRestoreSelection`, factory-scope `toCancelled`. Same guards, one `writeValues(useValue ? [resolved.selection] : [])`, one post-write `readValues`, u-mismatch rollback+throw, empty-restore non-empty-host rollback+throw.
- **Replace** both live `applyConfirmedState` sites with `return _commitRestoreSelection(canonicalInstance, root, { useValue, resolved, observed, filterInstanceId: _instance.filterInstanceId })` after the matching `preCommit` / `preCommitEmpty` guard (keep those guards in core).
- Empty branch still validates empty reread **in core**, then sibling commits Alle.
- Non-empty: u-mismatch **stays in core** (not classification). Then preCommit guard, then sibling (pass `resolved` even when degraded).
- **No** second selection write. **No** wait loop. **No** `verifyCommitFilterValue`.
- **Rules to apply:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` (keep existing try/catch + log prefix `[singleSelect.applyRestoreSelectionCore]`); `state.mdc`; `cognos-adapter.mdc` (facet only via `hostFilterWrite` / support).

---

#### `state/createFilterInstanceState.js` (edit)

- **Role:** instance factory; lock 6 preserve.
- **Lines:** live 77 + ~10–12 → ~89 (hard 150). AMD **1** unchanged (`./selectionState.js`).
- **Keep** the existing `"unavailable"` block (L33–42) that **zeros `d`**. Do **not** reuse that assignment for table.
- **Add a sibling `if` immediately after that block, before `buildSelectionFields`.** Preserve when **all** of:
  - `_existing.currentSelection` exists
  - `existing.displaySource === "table"`
  - same `use` (`String(existing.useValue || "") === hostSelection.useValue`)
  - `hostSelection.displayValue === hostSelection.useValue`
  - existing `d` non-null
  - `String(existing.displayValue) !== String(hostSelection.displayValue)`
- Then assign `{ displayValue: existing.displayValue, useValue: hostSelection.useValue, displaySource: "table" }` onto `hostSelection`.
- If host later `d !== u`, `readSelectionFromValues` already returns `"cognos"` (~L12–16); do not enter preserve.
- **Rules to apply:** `amd.mdc`; `naming.mdc`; `state.mdc` (canonical instance shape; no foreign tree); `error-handling.mdc` (pure-ish factory — keep as live; do not add a noisy try/catch wrapper unless you touch executable logic that already has one).
- Factory-scope: keep `readSelectionFromValues` / `buildSelectionFields`. No nested functions inside `createFilterInstanceState`.

---

#### `actions/parameterSet/parameterSetResyncApplyPair.js` (edit)

- **Role:** resync host write + canonical commit (lock 7).
- **Lines:** target ~132–145 (hard 150). Live 110.
- **AMD:** live 5 **plus** `"../../effects/commitSelectionState.js"` → **6**. Bind `_commitSelectionState`. Do not import `writeVerifiedSelection.js`.
- **Keep** factory-scope `cancelledResult` and `updateCanonicalInstance`. **Do not** clone `cancelledResult` for skip-write success.
- **Factory-scope helpers (required, not inside `applyConfirmedPair`):**
  - `function shouldSkipDegradedResyncWrite(_selection, _useValue)` — true iff `_useValue` is non-empty **and** (`_selection.displaySource === "unavailable"` **or** `_selection.displayValue == null`). Use **pre-coerce** `displayValue` (null), never the `String`/`""` coerce.
  - `function keepResyncOwnerSelection(_canonicalInstance, _root, _selection)` — `_commitSelectionState.applyConfirmedState(_canonicalInstance, _root, { displayValue, useValue, displaySource } from _selection)`. Return that triple. No host I/O.

**Body of `applyConfirmedPair` — new order:**

1. Compute `useValue` as today. Capture `incomingDisplay = _selection && _selection.displayValue` and `incomingSource = _selection && _selection.displaySource` **before** the `displayValue = … != null ? String : ""` coerce.
2. Resolve `root` / `canonicalInstance` as today.
3. **F1 skip-write (before `isWriteReady` throw and before the `useValue && !displayValue` throw):** if `shouldSkipDegradedResyncWrite(_selection, useValue)` → **return** `{ displayValue: incomingDisplay == null ? null : String(incomingDisplay), useValue: useValue, displaySource: incomingSource || "unavailable" }`. No `writeValues`. No `readValues`. No verify. No rollback. No `updateCanonicalInstance`. Caller (`parameterSetResyncApply.js`) treats missing `cancelledResult` as SET continue (`ok` path). Restore `degraded` already sits on the instance.
4. Else continue live coerce `displayValue` for write.
5. Keep `isWriteReady` throw for non-skip paths.
6. **Delete** the throw `"confirmed display unavailable; refusing d=u resync synthesis"` **only after** skip-write is in place. Do not delete it without skip-write.
7. Alle / empty `useValue`: still `writeValues([])`, verify as today, `updateCanonicalInstance` Alle / `"policy"`. Unchanged.
8. **`"table"` + non-null owner `d`:** after guards, `writeValues([{ d: ownerDisplay, u: useValue }])` where ownerDisplay is owner `displayValue` (resolved caption). Probe **existing** 3-arg `_verifyCommit(facet, ref, { displayValue: ownerDisplay, useValue })`. **Do not** add a u-only mode. **Do not** edit `verifyCommitFilterValue.js`.
   - On `!ok`: **do not** `rollbackHostWrite`; **do not** throw. `keepResyncOwnerSelection(...)` and return that triple.
   - On `ok`: **also** `keepResyncOwnerSelection` (owner `d` + `"table"`), **not** `updateCanonicalInstance(observed.d)` / `"cognos"`. Return owner triple.
9. **Other sources (`"cognos"` / `"policy"` already handled):** keep live recement `verifyResult.observed` as `"cognos"` via `updateCanonicalInstance` when `useValue` nonempty and not table and not skip.
- Existing nested `map` clone for rollbackInput may stay (grandfathered). Do **not** add new nested `function` inside `applyConfirmedPair`.
- **Rules to apply:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` (keep try/catch + log prefix `[singleSelect.parameterSetResyncApplyPair.applyConfirmedPair]`; F1 skip **converts** to success return, does not throw); `state.mdc`; `module-public-api.mdc` (no new service method); `cognos-adapter.mdc`.

---

## Section D–I

No new actions, selectors, public API, harness, mocks.

`parameterSetResyncApply.js` stays: `resolveConfirmedSelection` already returns `record.currentSelection` (carries `"table"` / `"unavailable"`). Do not edit it.

---

## Section J. Acceptance (writer self-check)

1. Allowlist only. No file >150. Core AMD ≤10 after split. `applySpecialSelectionPolicy.js` / `hydrateStateFromPopup.js` / `verifyCommitFilterValue.js` / `writeVerifiedSelection.js` untouched.
2. Unique hit (dump **or** table) with `resolved.d ≠` use and host echo `d===u`: owner `displayValue === resolved.d`, `useValue` persisted use, `displaySource === "table"`.
3. Unique hit with `resolved.d ===` use and host `.d` matches: `displaySource === "cognos"`.
4. GET `filt.sels[].vals` still use-only (this slice does not edit GET).
5. SSS keep-selected: `use` unchanged this slice.
6. F1 miss: restore still `degraded: true` / owner `"unavailable"`; resync does **not** write `{d:"",u}` and does **not** throw `refusing d=u resync synthesis`.
7. Alle resync still writes `[]`.
8. Click commit still uses both-field `verifyCommitFilterValue` (file not weakened).
9. No dock overlay.
10. `applyRestoreSelectionCore.js` no longer imports `commitSelectionState.js`; classify lives in `commitRestoreSelection.js`.

---

## Section K. Forbidden

- Overlay dock / `filterDock`. Hydrate. Persist display in `filt.sels`. `{u}`-only Cognos writes. M4 wait-loop. Extra restore rewrite. `writeVerifiedSelection` on restore/resync. Weaken `verifyCommitFilterValue`. Grow `applySpecialSelectionPolicy.js`. Shared classifier file. New `_KDB` namespace / lifecycle / cognosHost facet / `messageService` method. Edit `.mdc`. Commit. Tick toast PROGRAM. Reopen SSS P1/H2.

---

## Section L. Report

1. Pre-flight echo (14).
2. Per-file lines + AMD vs spec targets.
3. Deviations (path, what, why, rule).
4. J checklist pass/fail.
5. Open questions.

---

## Section M. Reviewer / Cognos (not writer)

Honest Cognos script: after SET, compare host `getValues()[0].{d,u}` vs `instancesById[].currentSelection`. Chip may still show MUN. PDF may show owner caption. **H0:** open the six filters once after SET (first popup can wipe `use` if option label ≠ owner `d`) — residual, not this slice.

**PO Cognos green 2026-09-09.** Wave-1 plus Filter-over-dump confirmed together. Chip overlay (M2) and H0 remain OOS.
