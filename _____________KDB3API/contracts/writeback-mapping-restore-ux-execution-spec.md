# Execution Spec: writeback mapping + Dienststelle restore UX

> Implements the three **Approved** contract-only deltas (PO vastenburg 2026-09-03).
> **Implement GO** 2026-09-03 (PO vastenburg): A1 name-match only; proceed. Four grok 4.6 writers, exclusive allowlists.
> Law: the three deltas. This spec is how. Do not reopen A1/A2/C4/C5/C6.

---

**Status:** `Implemented — same-package Cognos green 2026-09-03` (PO: MAG toast gone). Old vs new package SET: `contracts/futureTodo/writeback-v2Map-old-vs-new-package-parameterset-2026-09-03.md`.
**Module / contract:**
- `_____________KDB3API/contracts/writeback-v2Map-contractdelta.md` (A1 recast §4 / §11)
- `_____________KDB3API/contracts/writeback-mapping-package-mismatch-contractdelta.md` (A2)
- `_____________KDB3API/contracts/writeback-dienststelle-restore-ux-contractdelta.md` (C4/C5/C6)
**Phase:** extension (four slices: M1, S1, D1, U1)
**Authoring AI:** captain, 2026-09-03
**Executing AI:** grok 4.6 army (one writer per slice)
**Reviewer:** fresh grok 4.6 dual review (mechanical MUST + semantic delta), then PO Cognos
**Handoff:** `_____________KDB3API/contracts/futureTodo/writeback-mapping-restore-ux-implement-captain-handoff-2026-09-03.md`

Pre-impl (2026-09-03 army): A1/A2/C4/C5/C6 are **not** live. Validate already runs before widgetReset. `runFilterRestore.js` is 149 lines (extract required).

**Spec review 2026-09-03 (before GO):** MUST FAIL items patched below. Filters + vis still work after A1 (classify/SET by **name**; vis = runtime `parameterMap`). Dropped source-map **order fallbacks** (would SWAP unknown alt-first table labels; not a filter/vis fail). v2Map §11 “first-key fallback” = **when that runtime table name is present in GFO**, not Object.keys order.

---

## Exclusive allowlists (no shared write files)

Writers **may** run in parallel. If sequential: M1 → S1 → D1 → U1. Prefer **D1 before U1** so C4 toast copy matches C5 grain.

| Slice | Writer owns (write) | Must not write |
|---|---|---|
| **M1** A1 Map | `map/adapters/remapV2KidTokens.js`, `map/adapters/buildV2SourceMapping.js` | `kidIndex.js`, `parameterMap.js`, uni/de-uni, `mapV2ToV3.js`, any `set/` |
| **S1** A2 SET `pkg` | `set/state/validateRestorePayload.js` **only** | SET factory, orchestrator, `runNormalRestore.js`, `executeRestoreRun.js`, Map, `kidIndex.js` body, `errorCodes.js`, U1 files |
| **D1** C5/C6 dstl | `dienststelle/actions/parameterSet/buildRestoreScopePlan.js`, `applyRestorePlan.js`, `parameterSetRestore.js` | `runDienststelleReconcile.js`, `parameterSetContext.js`, SET, Map, validate |
| **U1** C4 SET UX | files in Section C U1 | S1 validate, D1 three files, Map, `reconcileConfirmedDienststelle.js`, `kidIndex.js` |

Live contract-path correction (do not “fix” by moving files): A2 lives at `set/state/validateRestorePayload.js`, **not** `writeback/schema/validateRestorePayload.js`.

---

## Section A. Pre-flight read list

Each writer reads **in order**, then echoes **one sentence per item** as the **first** output. Wrong or missing echo → stop, re-read, retry. Then write **only** that writer’s allowlist.

Do **not** dump `parameterMap.js`. kidIndex: **shape only** (exports + `index.package` keys).

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` is the injected registry; Map/SET do not invent namespaces; option lists are `_KDB.config.options`.
2. `_____________KDB3API/.cursor/rules/state.mdc` — one canonical writer per subtree; Map must not write `_KDB.state`; foreign writes forbidden.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — runtime is owner-private; new pending flags live under `_KDB.runtime.writeback` with destroy/clear paths (U1 only).
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — SET/Map stay named-method; no new public methods; no mixed shape; disposed guards unchanged.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no toast RPC event; C4 is a direct `_KDB.services.message.notify` from SET finish.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150, orchestrator ≤120, controller fn ≤60, AMD ≤10; no `helpers`/`common`/`shared`; verb+noun files.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English identifiers; `_` prefix only on boundary inputs; **new** German copy only in `writebackLabels.js`. **Carve-out (UX §2 OOS):** existing hardcoded DE abort `showAlert` strings stay in `notifyRestoreOutcome` / present rung 2 — do not move them into labels this WP. Dual review must not fail that leftover.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — named executables get local try/catch; reducers exempt; log prefix + original `err`; no silent catch. **Anti-D1:** new/edited named executables include try/catch (not a wrapper util).
9. `_____________KDB3API/.cursor/rules/dom.mdc` — this WP does not add DOM builders; do not `document.querySelector` for Map/SET policy.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define([...], function...)`; named helpers at factory scope; no nested functions in entry; no ES modules in `KDB3/js/**`.
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — Map/SET are not ring-1; no `_KDB.cognosAPI` / `__getDashboardAPI`; Map allowed reads: kidIndex, `filterPropObj`, `bwOldToNewMap` only.
12. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle terms; do not invent `stale-error`; this WP does not change restore `outcome` enum except A2 `failed`.
13. `_____________KDB3API/contracts/writeback-v2Map-contractdelta.md` — A1: same-package iff every GFO key ∈ `{datasourceName, alternativeDatasourceName}`; remap emits `alternativeDatasource_name_KID`; no slots/DS source map; MAG use-KID not in scope.
14. `_____________KDB3API/contracts/writeback-mapping-package-mismatch-contractdelta.md` — A2: SET + kidIndex; unequal `pkg` → `WRITEBACK_MAPPING_PACKAGE_MISMATCH` + `failed` **before park**; no Map import; known MAG+code overblock accepted.
15. `_____________KDB3API/contracts/writeback-dienststelle-restore-ux-contractdelta.md` — C4 SET-finish `notify` (two keys, never both with abort); C5 no tab S6 when global saved valid; C6 fail-fast + skip reconcile; no Rechte.
16. `_____________KDB3API/contracts/futureTodo/writeback-mapping-restore-ux-captain-handoff-2026-09-03.md` — slices, reopen-bans, Cognos checklist; do not re-investigate legacy Map.
17. `_____________KDB3API/KDB3/js/core/config/mapping/kidIndex.js` **shape only** — exports `getParameterMappingIndex`, `resolveRuntimePackageKey`, `findMissingRequiredKeys`, `REQUIRED_KEYS`; `index.package` has `pkg`, `datasourceName`, `alternativeDatasourceName`. Do not edit. Do not read `parameterMap.js`.
18. This execution spec.

---

## Section B. Folder tree

No new folders. New files only under existing `set/effects/`.

```
_____________KDB3API/KDB3/js/
  core/config/mapping/
    kidIndex.js                          // READ-ONLY (shape)
  core/services/writeback/
    __orchestratorWriteback.js           // U1: pending-flag seed 1-liner in normalize only
    schema/errorCodes.js                 // READ-ONLY (code already exists)
    map/adapters/
      remapV2KidTokens.js                // M1
      buildV2SourceMapping.js            // M1
    set/
      createWritebackSetService.js       // U1: clearWritebackRuntime 1-liner only; NO new AMD
      config/writebackLabels.js          // U1
      state/
        validateRestorePayload.js        // S1
        ensureWritebackRuntime.js        // U1: seed pending flag
      effects/
        runFilterRestore.js              // U1
        dispatchDienststelleRestore.js   // U1 NEW
        executeRestoreRun.js             // U1
        notifyRestoreOutcome.js          // U1 NEW
        presentPendingUrlShareMessage.js // U1
        whenUrlShareRestoreSettled.js    // U1: clearPending 1-liner
        recoverUrlSharePending.js        // U1: clearPending 1-liner
  dashboard/filters/dienststelle/actions/parameterSet/
    buildRestoreScopePlan.js             // D1
    applyRestorePlan.js                  // D1
    parameterSetRestore.js               // D1
```

Conditional: **none**. Overlay pending **is required** (delta §3.3; pre-impl: SET finish runs under `urlShareBootOverlayActive`). Files beyond UX §7 “typical blast” are the pending-flag 1-liners — wiring, not a product reopen.

---

## Section C. Per-file specifications

### Writer M1 — A1 Map

#### `core/services/writeback/map/adapters/remapV2KidTokens.js`

- **Role:** Map adapter (KID rewrite gate).
- **Lines:** live 52; target ≤80; hard 150.
- **AMD imports (keep, order unchanged):**
  - `"../../schema/errorCodes.js"`
  - `"../../../../config/mapping/kidIndex.js"`
  - `"./buildV2SourceMapping.js"`
  - `"./universalizeV2KidTree.js"`
  - `"./deUniversalizeV2KidTree.js"`
- **Do not** add a 6th import.
- **Factory parameters:** AMD bindings `_`-prefixed.
- **Factory-scope helpers:** keep `isSamePackage`, `remapV2KidTokens`, `cloneV2Payload` at factory scope. Recast `isSamePackage` only.
- **Entry:** `remapV2KidTokens(_KDB, _payload, _diagnostics)` — same-package → clone, skip rewrite; else source map + uni/de-uni as today.
- **`isSamePackage` body:**
  1. Read GFO top-level keys (same as live). Empty keys → `false` (remap still runs).
  2. `index = getParameterMappingIndex(_KDB)`; `main = index.package.datasourceName`; `alt = index.package.alternativeDatasourceName`.
  3. Allowed set = non-empty strings `{main, alt}` (omit missing/empty). Empty allowed set → `false`.
  4. Same-package iff **every** GFO key is in allowed. A third/foreign table → `false` (remap).
  5. Do **not** OR-match only the first GFO key. Do **not** treat first-key === alt as same-package unless **all** keys ⊆ allowed.
- **Pass package into source mapper:** when remapping, call `buildV2SourceMapping(_payload, index.package)` (or equivalent `_package` object with `datasourceName` + `alternativeDatasourceName`). Do not import `parameterMap.js`.
- **Return:** remapped clone or same-package clone (unchanged return).
- **try/catch:** keep existing; do not swallow mapping throws that today become `WRITEBACK_MAPPING_*`.
- **Rules to apply:**
  - `amd.mdc` — full-compact define; helpers at factory scope; no nested functions in entry.
  - `naming.mdc` — `_` on boundary inputs only.
  - `feature-structure.mdc` — ≤150 / ≤10 AMD (5 stays).
  - `kdb-object.mdc` / `state.mdc` — Map purity: no `_KDB.state` writes; no Cognos.
  - `cognos-adapter.mdc` — no `_KDB.cognosAPI`.
  - `error-handling.mdc` — keep try/catch on named remap entry.

#### `core/services/writeback/map/adapters/buildV2SourceMapping.js`

- **Role:** Map adapter (payload → source KID map).
- **Lines:** live 114; dual bind must stay **≤150**; target ≤130.
- **AMD imports:** **keep 0** (`define([], …)`). Do **not** import `parameterMap.js` or `kidIndex.js`.
- **Entry:** `buildV2SourceMapping(_payload, _package)` — `_package` may be null; then **bind no table-layer KIDs** (item + use-KID walks still run).
- **Factory-scope:** keep `addRev` / walk helpers at factory scope. Entry name stays `buildV2SourceMapping` (not `__controller`).
- **Dual-table bind (GFO object keys only; still no widget/slot/`kennzahlenTable` walk):**
  1. `topKeys = Object.keys(gfo)` when GFO is an object.
  2. `mainName = _package && _package.datasourceName`; `altName = _package && _package.alternativeDatasourceName`.
  3. If a key === `mainName` → `addRev(..., "datasource_name_KID", key)`.
  4. If a key === `altName` → `addRev(..., "alternativeDatasource_name_KID", key)`.
  5. **Do not** assign leftover / unknown GFO keys to either table KID (Object.keys order is not cube identity; that SWAP is forbidden). Unmatched keys stay unmatched.
  6. Then existing `walkGlobalFilters` / `walkTabs` unchanged (kale `{label}_filter_use_KID` from `.u`/`.use` stays).
- **OOS this slice:** all other `map/adapters/*` (classify, vis/txt, uni/de-uni bodies). Do not edit them.
- **Forbidden:** widget/slot/`*_widget_localfilter_KID` / `kennzahlenTable_KID` source keys; MAG/level `Dienststelle_*_filter_use_KID` minting.
- **Rules to apply:**
  - `amd.mdc` — 0 imports; factory-scope helpers; no nested functions in entry.
  - `naming.mdc` — `_payload`, `_package` boundary prefix.
  - `feature-structure.mdc` — ≤150.
  - `state.mdc` / `kdb-object.mdc` — pure mapping; no state writes.
  - `cognos-adapter.mdc` — no host calls.

---

### Writer S1 — A2 SET `pkg`

#### `core/services/writeback/set/state/validateRestorePayload.js`

- **Role:** SET restore step 8 validator.
- **Lines:** live 54; target 70–90; hard 150. **No extract.**
- **AMD imports (add kidIndex last):**
  - existing: `restoreConstants`, `normalizeV3`, `validateV3`, `errorCodes` (keep live relative paths)
  - **add** `"../../../../config/mapping/kidIndex.js"` as `_kidIndex` (5th import, ≤10)
- **Do not** add kidIndex to `createWritebackSetService.js` (already **10 AMD / 147 lines**) or `__orchestratorWriteback.js`.
- **Do not** import Map / `toV3` / `mapV2ToV3`.
- **Entry:** existing `validateRestorePayload(run, v3)` — `run` has **no** `_KDB`. Call `_kidIndex.resolveRuntimePackageKey(null)` (kidIndex ignores `_KDB`).
- **Body steps:** live already `recordPhase("validate", …, validation.ok)` **once** after `validateV3`. Insert pkg checks **after** `_validateV3` succeeds and **before** that success `recordPhase`. Record validate **once**.
  1. If `!validation.ok` → keep today’s copy-diagnostics + `recordPhase` false + `throw ABORT` (no pkg compare).
  2. Resolve `runtimePkg` in try/catch (GET pattern): on throw, treat as missing.
  3. If `runtimePkg` missing/empty → `run.addDiagnostic(_errorCodes.codes.WRITEBACK_MAPPING_CONFIG_MISSING, "validate", <short message>)`; `run.recordPhase("validate", null, false, …)`; `throw _constants.ABORT`. Do **not** invent a second code.
  4. If `String(v3.pkg) !== String(runtimePkg)` → `run.addDiagnostic(_errorCodes.codes.WRITEBACK_MAPPING_PACKAGE_MISMATCH, "validate", <short message>)`; `recordPhase("validate", null, false, …)`; `throw _constants.ABORT`.
  5. Else fall through to the **single** existing success `recordPhase` + return. Empty/whitespace `pkg` already fails `validateV3` — A2 is **unequal non-empty** strings only.
  6. Do **not** compare `alternativeDatasource_name_KID` to `pkg`.
  7. A2 abort still runs **after** `historyBegin` (same as invalid v3). Cleanup empties undo/redo. Spec does **not** claim zero history effect. Do not reorder begin vs validate.
  8. Successful **v2** Map already stamps `pkg` to runtime (`mapV2ToV3`) — this fail must **not** fire on that path. Direct foreign v3 still fails (incl. MAG+code-only overblock).
- **Fail API:** live is **positional** `run.addDiagnostic(code, phase, message, details?)` then **`throw ABORT`**. Do **not** use the delta’s object-literal `addDiagnostic({ code })` and do **not** `createWritebackError` (host throw). `executeRestoreRun` already maps ABORT → `{ ok: false, outcome: "failed" }`. **Do not edit executeRestoreRun.**
- **Rules to apply:**
  - `amd.mdc` — one define; factory-scope; no nested functions in entry.
  - `naming.mdc` — `_kidIndex` boundary prefix.
  - `feature-structure.mdc` — ≤150 / 5 AMD.
  - `module-public-api.mdc` — no new SET methods.
  - `error-handling.mdc` — try/catch around kidIndex; named code; no silent catch.
  - `kdb-object.mdc` — no Map; no new namespace.
  - `cognos-adapter.mdc` — no host.

---

### Writer D1 — C5/C6 Dienststelle

Do **not** add AMD imports to `parameterSetRestore.js` (already **10/10**).

#### `dashboard/filters/dienststelle/actions/parameterSet/buildRestoreScopePlan.js`

- **Role:** restore plan builder (C5 grain).
- **Lines:** live 141; **≤8-line** C5 loop after the `normalizeScope` for-loop; **no new comments**; hard 150. Stop and report if the file would exceed 150. **No new AMD** (live 4).
- **Entry:** existing `__controller` / returned builder.
- **C5 after the existing per-scope `normalizeScope` loop (do not change `normalizeScope` fallback boolean itself):**
  1. Find the plan item with `scope === "global"` (`var globalItem` / equivalent). If **no** global item (`glob` not an array): treat as missing; **guard** `globalItem && globalItem.valid` so it does not throw.
  2. If `globalItem && globalItem.valid && globalItem.valid.length > 0`: set `fallback = null` on every **non-global** plan item. Leave `missing` arrays intact (C4 `missingValues`).
  3. If no global item or `valid.length === 0`: leave per-scope fallback as today (all-miss / global-miss still S6 when `fallbackToDefault`).
  4. `rowCount === 0` shares the fallback **boolean**; do not change that diagnostic split; no “Rechte”.
  5. Do **not** reorder glob-then-byTab push (global is first when `glob` is an array).
- **Rules to apply:**
  - `amd.mdc` / `naming.mdc` / `feature-structure.mdc` (≤150, no 5th import).
  - `state.mdc` — dienststelle writes only its restore plan values, not SET/widgets.
  - `error-handling.mdc` — keep try/catch on named entry if present; do not add a wrapper util.
  - `naming.mdc` — no German identifiers.

#### `dashboard/filters/dienststelle/actions/parameterSet/applyRestorePlan.js`

- **Role:** apply plan (C6 fail-fast).
- **Lines:** live 62; target ≤90; hard 150. Keep 3 AMD.
- **Entry:** `applyRestorePlan`.
- **C6:** abort threshold **unchanged** (`requiredOk` global-only). **`break` only when `item.scope === "global"`** and that entry cannot apply (missing ref, `values.length === 0`, **or Cognos `writeFilter` fail** — any flip of `requiredOk` for global). Do not iterate later `byTab` writes. Empty byTab after C5 must **`continue`** (inherit), not `break`. Do not change glob-then-byTab push order.
- **Return shape unchanged:** `requiredOk`, `appliedScopes`, `fallbackScopes`, `missingValues` (names SET will stash). Optional `skipReconcile: !result.requiredOk` is allowed but **not required** if restore gates on `requiredOk`.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc` (keep try/catch), `state.mdc` (no foreign SET state).

#### `dashboard/filters/dienststelle/actions/parameterSet/parameterSetRestore.js`

- **Role:** dstl restore orchestrator (skip reconcile).
- **Lines:** live 136; +1–3; hard 150. **AMD 10 — do not add an 11th.**
- **C6:** after `applyRestorePlan`, `if (applyResult.requiredOk) { await _ctx.reconcile({ activeSichtValue: active.activeSichtValue, source: "tableData" }); }` — skip reconcile when global cannot apply/fallback. Keep `commitActiveDefinition` as today (reducer `SICHT_CHANGED` keys/tables only — **not** S6).
- **Return** still copies `fallbackScopes` / `missingValues` / `ok: applyResult.requiredOk`. Do **not** rename fields. Do **not** call `message.notify`.
- **Rules to apply:**
  - `amd.mdc` — 10 imports max; factory-scope; no nested functions.
  - `feature-structure.mdc` — ≤150.
  - `error-handling.mdc` — keep existing try/catch; **anti-D1**.
  - `events.mdc` — no toast event.
  - `module-public-api.mdc` — no new `_KDB.api.dienststelle` methods.

---

### Writer U1 — C4 SET-finish UX

**Anti-D2:** every new pending flag is seeded, cleared on `destroy` / overlay `clearPending`, and ignored after dispose.

#### `core/services/writeback/set/config/writebackLabels.js`

- **Role:** German writeback copy SSOT.
- **Lines:** live 10; +2 keys; hard 150. AMD 0.
- **Add exactly (never concatenate, no Rechte, no “whole dashboard defaulted”):**
  - `dienststelleRestoreFallbackMessage`: `Eine oder mehrere gespeicherte Dienststellen-Auswahlen sind nicht verfügbar. Für die betroffenen Bereiche wurde die Standardauswahl gesetzt.`
  - `dienststelleRestoreMissingMessage`: `Eine oder mehrere gespeicherte Dienststellen-Auswahlen sind nicht verfügbar. Betroffene Bereiche bleiben ohne eigene Auswahl (die globale Auswahl gilt weiter).`
- Keep existing `missingId*` / `hostListUnready*` keys.
- **Rules to apply:** `naming.mdc` (English **keys**, German **values**); `feature-structure.mdc`; do not duplicate into dienststelle labels.

#### `core/services/writeback/set/effects/dispatchDienststelleRestore.js` **NEW**

- **Role:** SET effect — dstl phase dispatch + hint stash.
- **Lines:** target 50–80; hard 150.
- **AMD imports:** `"../../schema/errorCodes.js"` only (same family as `dispatchFilterClearPhases.js`). No extra AMD: `dispatchOwnerPhase` lives on `_run`.
- **Entry:** `async function dispatchDienststelleRestore(_run, _filt, _resolvedTargets)` — filename-matching (family of `dispatchFilterClearPhases`); **not** `__controller`.
- **Body:**
  1. If `filt.dstl === undefined` → return `undefined` (no stash).
  2. `const phase = await _run.dispatchOwnerPhase(…)` with the **identical** payload/options live `runFilterRestore.js` uses today for dienststelle (copy, do not invent).
  3. Envelope is `{ ok, degraded, result }`. Stash **`phase.result`**: `var owner = phase && phase.result; _run.dienststelleRestoreHint = { fallbackScopes: (owner && owner.fallbackScopes) || [], missingValues: (owner && owner.missingValues) || [] }` on **`_run`** (not `_KDB.state`). Do **not** read `phase.fallbackScopes` (always empty → C4 never toasts). Do **not** stash `degraded` / DISPLAY_DEGRADED.
  4. Abort throw: **no** stash (no info toast). Cleanup does **not** drop extra `run` fields; notify still sees the hint.
- **try/catch:** log `[writebackSet.dispatchDienststelleRestore] failed` + `err`; rethrow (outer SET boundary converts). **Anti-D1.**
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`, `state.mdc` (stash on run object only), `events.mdc` (no toast here), `cognos-adapter.mdc`.

#### `core/services/writeback/set/effects/runFilterRestore.js`

- **Role:** SET filter restore sequence.
- **Lines:** live **149** (hard 150). After extract **must** be ≤150 (expect ~138). AMD live 7 → 8 (`dispatchDienststelleRestore.js`).
- **Change:** replace inline dstl `dispatchOwnerPhase` block with `await _dispatchDienststelleRestore(run, filt, resolvedTargets)`. Live file has **zero** try/catch — **add** a local try/catch on the named export (log `[writebackSet.runFilterRestore]`, rethrow). Extract already buys the lines (~138 + ~8 ≤ 150).
- **Forbidden:** grow past 150; stash inline; hook `hasDegradedPhase`.
- **Rules to apply:** `amd.mdc` (8/10), `feature-structure.mdc`, `error-handling.mdc` (**anti-D1** try/catch required), `naming.mdc`. Grandfather existing `.filter` / `.forEach` / `.some` callbacks; do not add **new** nested `function` declarations inside the entry.

#### `core/services/writeback/set/effects/notifyRestoreOutcome.js` **NEW**

- **Role:** SET effect — abort alert + C4 info + overlay pend.
- **Lines:** target 80–110; hard 150.
- **AMD:** `restoreConstants` + `ensureWritebackRuntime` if needed for overlay flags. **Do not** import `writebackLabels.js` — read `_KDB.config.labels.de.writeback` (orchestrator already merges).
- **Entry:** `notifyRestoreOutcome(_KDB, _run, _outcome)` replacing live `notifyRestoreFailure`. Filename-matching; **not** `__controller`.
- **Factory-scope helpers (cap three, not nested, no per-helper try/catch):** `pickDienststelleInfoKey(_hint)`, `notifyDienststelleInfo(_KDB, _labelKey)`, one overlay-pend helper. One **entry** try/catch that **converts**.
- **Body:**
  1. **Abort / failed** (`failed` / `abortedByOwner`): existing `showAlert` path only (hardcoded DE — **do not** move abort strings into labels). **No** info `notify`. **Do not** set `pendingDienststelleRestoreInfo`. Keep overlay: if `urlShareBootOverlayActive`, skip live `showAlert`; if `pendingUrlShareMessage != null` return; else `pendingRestoreFailure = true` (copy live `notifyRestoreFailure`).
  2. **committed / degraded** and hint `fallbackScopes.length > 0` **or** `missingValues.length > 0`: pick **one** key — fallback if `fallbackScopes.length > 0`, else missing. Call `_KDB.services.message.notify({ message, severity: "info" })` **unless** overlay active → set `_KDB.runtime.writeback.pendingDienststelleRestoreInfo = { labelKey }` instead. Never both notify and showAlert.
  3. `cancelled` / no `message` / disposed: silent.
  4. DISPLAY_DEGRADED-only / empty hint / `hasDegradedPhase()`: **no** info toast.
- **try/catch:** log `[writebackSet.notifyRestoreOutcome]`; convert (do not throw into execute). **Anti-D1.**
- **Forbidden:** `hasDegradedPhase`, `userNotify`, dienststelle toast, Rechte, `notifyAnchored`, `_KDB.events` toast RPC.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`, `module-public-api.mdc` (message named method), `runtime.mdc` (pending flag), `events.mdc` (no new events), `kdb-object.mdc`.

#### `core/services/writeback/set/effects/executeRestoreRun.js`

- **Role:** SET run executor.
- **Lines:** live 99; after extract target ~77; hard 150. AMD 6 → 7 (`notifyRestoreOutcome.js`).
- **Change:** delete inline `notifyRestoreFailure` (L75–96); after cleanup call `_notifyRestoreOutcome(_KDB, run, outcome)` at the live call site (L67). Keep `hasDegradedPhase` **out of this file** (do not add).
- **Rules to apply:** `amd.mdc`, `feature-structure.mdc`, `error-handling.mdc`, `naming.mdc`.

#### `core/services/writeback/set/effects/presentPendingUrlShareMessage.js`

- **Role:** URL overlay present ladder.
- **Lines:** live 74; target ~95–110; hard 150. Keep 1 AMD.
- **Ladder (one present call, no stack):** `pendingUrlShareMessage` (missing-id / hostListUnready **modal**) **>** `pendingRestoreFailure` (abort `showAlert`) **>** `pendingDienststelleRestoreInfo` (`message.notify` info).
- **Must extend the live early-return** (today: continue only if `pendingUrlShareMessage` or `pendingRestoreFailure`). Also continue when `pendingDienststelleRestoreInfo` is set; otherwise rung 3 never runs.
- If rung 1 or 2 fires: **do not** `notify` info in the same call; **null** `pendingDienststelleRestoreInfo`.
- Rung 3: `notify` using `labels.de.writeback[labelKey]`; then clear the flag. `notify({ message, severity: "info" })` matches `messageService` (body-only; no `title`).
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc` (try/catch on present), `runtime.mdc`, `dom.mdc` (no new document queries).

#### Pending-flag 1-liners (same flag name everywhere)

Flag: `_KDB.runtime.writeback.pendingDienststelleRestoreInfo` = `null` | `{ labelKey: "dienststelleRestoreFallbackMessage" | "dienststelleRestoreMissingMessage" }`.

**Anti-D2:** seed `null`; clear on destroy and overlay `clearPending`; never serialize.

| File | Live lines | Allowed edit |
|---|---|---|
| `set/state/ensureWritebackRuntime.js` | 31 | Seed `pendingDienststelleRestoreInfo: null` next to the two existing pending keys. |
| `__orchestratorWriteback.js` | 84 / orch cap 120 | **normalize only** — same seed. Do not add AMD. Do not register new services. |
| `set/createWritebackSetService.js` | 147 / **10 AMD** | **`clearWritebackRuntime` only** — delete/null the new flag. **No new AMD import.** |
| `set/effects/whenUrlShareRestoreSettled.js` | 87 | `clearPending` also nulls the new flag. |
| `set/effects/recoverUrlSharePending.js` | 79 | same `clearPending`. |

- **Rules to apply (each):** `runtime.mdc` (cleanup path), `feature-structure.mdc` (stay ≤150 / no 11th AMD on factory), `amd.mdc`, `naming.mdc`, `kdb-object.mdc` (no new top-level namespace).

---

## Section D. Reducer behavior table

No new action types. D1 uses existing `dienststelle/parameterSetRestoreRequested`. S1/M1/U1 are service effects. **N/A.**

---

## Section E. Published selectors

None. **N/A.**

---

## Section F. Public API wiring

- `_KDB.services.writebackMap` — unchanged (`toV3`, `destroy`).
- `_KDB.services.writebackSet` — unchanged (`restore`, `destroy`, URL-share). **No** new methods.
- `_KDB.api.dienststelle` — **no** new methods.
- `_KDB.runtime.writeback.pendingDienststelleRestoreInfo` — U1 only; owner-private; cleared on destroy (**anti-D2**).
- Labels: `__orchestratorWriteback` already `Object.assign` merges `writebackLabels.js` onto `_KDB.config.labels.de.writeback` (existing keys win).

---

## Section G–I. Harness

**N/A.** Direct production tree. No TEST harness, no mock Cognos for this WP. PO Cognos checklist is Section J item 12 / handoff.

---

## Section J. Acceptance criteria (writer self-check before report)

1. Every allowlist file exists; new files only `dispatchDienststelleRestore.js` and `notifyRestoreOutcome.js`.
2. Each file matches Section C including `Rules to apply`.
3. Full-compact AMD; no ES `import`/`export` in `KDB3/js/**`.
4. No file >150; no orchestrator >120; SET factory still ≤10 AMD; `parameterSetRestore.js` still ≤10 AMD; `runFilterRestore.js` ≤150.
5. No **new** nested `function` declarations inside entry functions. Grandfather existing `.filter` / `.forEach` / `.some` arrow/function callbacks in files this WP edits.
6. M1 does not import `parameterMap.js`. SET AMD graph has `kidIndex` **only** via `validateRestorePayload.js`, **not** Map.
7. Section K not violated.
8. No new reducer. Map remains pure.
9. **Anti-D1:** new named executables `dispatchDienststelleRestore` and `notifyRestoreOutcome` have local try/catch; edited named entries keep try/catch. No generic try/catch wrapper util.
10. **Anti-D2:** `pendingDienststelleRestoreInfo` is seeded, cleared in `clearWritebackRuntime` / overlay `clearPending`, not left after `destroy`. Do not pretend this WP adds module `mount`/`destroy` ceremony to Map adapters.
11. No new event-name string literals; C4 does not emit a toast event.
12. Semantic:
    - A1: GFO `{Personal_KDB, Personal_Berechtigung_Dienststelle_KDB}` either order → skip remap; remap path **name-matches** those two table KIDs (no collapse onto `Personal_KDB`); **no** Object.keys order fallback. Filters/vis restore by name / runtime map even if unmatched old table labels remain.
    - A2: `pkg !== runtime` → `WRITEBACK_MAPPING_PACKAGE_MISMATCH`, `outcome: "failed"`, **no** widgetReset (validate still step 8 before step 9). History wipe same as invalid v3 (not a fail).
    - C5: global saved valid → missing `byTab` has `fallback === null`.
    - C6: global cannot apply/fallback → no later byTab writes; no `reconcile`.
    - C4: info `notify` only on committed/degraded + hint; abort `showAlert` only; never both; pick fallback key if `fallbackScopes.length > 0` else missing key; overlay ladder missing-id > abort > info.
13. Do **not** self-certify Cognos green / `Approved — Cognos green`.

---

## Section K. Forbidden actions

- Edit `.cursor/rules/*.mdc`, `_template.md`, `_executionSpecTemplate.md`.
- Edit the three **product** deltas except a captain one-liner after code if live paths require it; writers do **not** edit contracts.
- Edit `contracts/_archive/*`. Parent `writeback.md` / `dienststelle-parameterSetRestore-contractdelta.md` / `mapping-config-ssot-contractdelta.md` **after** code, by **captain**, not writers.
- Read/modify `TEST/dashboard/`, `_______KDB3/`, `_______REDESIGN2/`, `_______LAATSTEORIGINAL/` (legacy lessons already in deltas).
- Commit, push, git config.
- `_KDB.cognosAPI` / `__getDashboardAPI` from features.
- Import `parameterMap.js` into `buildV2SourceMapping.js`. Import `writebackMap` into SET. Import Map into validate.
- Reuse `reconcileConfirmedDienststelle` `userNotify`. Hook `hasDegradedPhase()` or DISPLAY_DEGRADED-only for C4.
- Toast from `dienststelle`. `_KDB.events` toast RPC. Rechte copy. Concatenate both C4 keys.
- Grow `runFilterRestore.js` past 150. Stuff overlay+info+abort back into `executeRestoreRun.js`.
- Move Dienststelle restore before widgetReset (step 9) to “fix” park. Edit `runNormalRestore.js`. C6 abort residue (parked widgets, other filters applied) is documented, not a reorder.
- Folders `helpers` / `common` / `shared` / leftover `Support`. Nested functions in AMD entry. ES modules in `KDB3/js/**`.
- Exceed JS 150 / orch 120 / controller-fn 60 / 10 AMD without stopping.
- New `_KDB` namespace, lifecycle term, or cognosHost facet.
- Reopen: full legacy Map (slots/DS/localFilters); MAG use-KID must; first-GFO-key OR; warn-instead-of-fail on `pkg`; v3 KID migrator; SET→Map; v2 SS `.d` vs `.u`; abort-on-every-miss; S6-default on a tab when global saved MAG applied.
- Mark v2Map `Approved — Cognos green` without dated PO host pass (A3).
- Skip Section A echo.

---

## Section L. Reporting template (each writer)

1. **Pre-flight echo** — 18 numbered one-sentence summaries from Section A.
2. **File checklist** — path, line count, AMD import count, matches spec | deviation.
3. **Deviations** — path, deviation, motivation, rule consulted. Stop if architectural.
4. **Self-verification** — pass/fail per Section J items that apply to this slice.
5. **Open questions** — only if blocked; do not improvise architecture.

---

## Section M. Reviewer handoff

1. Captain: confirm 18 echoes exist and are not platitudes.
2. **Fresh** grok 4.6 dual review (not the writers): (a) mechanical MUST — AMD, `_` prefix, try/catch, file size, no foreign `_KDB.state`, Map purity, SET no Map import, **new** German only in `writebackLabels.js` (abort DE leftover allowed); (b) semantic vs the **three deltas**.
3. One fix-iteration max, then escalate to PO.
4. Captain parent one-liners **after** code matches: v2Map §9 list; mismatch §4; UX §6; SSOT call-site table “SET reads `resolveRuntimePackageKey`”.
5. Dutch Cognos checklist (handoff) for PO. Do not self-certify green.

---

## PO note (implement GO)

U1 includes pending-flag 1-liners **not** listed in UX §7 typical blast (`ensureWritebackRuntime.js`, orchestrator normalize, SET `clearWritebackRuntime`, `whenUrlShareRestoreSettled.js`, `recoverUrlSharePending.js`). Required by UX §3.3 (info must pend under URL overlay). No allowlist collision with S1/D1/M1. No file needs a split the deltas did not already require (`runFilterRestore` extract **is** named in UX §3.2).

A1 source-map binds table KIDs **only** when GFO keys equal runtime `datasourceName` / `alternativeDatasourceName`. Unmatched old names stay unmatched (classify walks all tables by filter **name**; vis uses runtime `parameterMap`). That tightens v2Map §11 “first-key fallback” to “when that runtime name is present in GFO”, not key-order.

Completeness review (2026-09-03): **PASS WITH HOLES** — the four block holes are patched in this file. **PO implement GO** 2026-09-03 (vastenburg): keep A1 name-match only.
