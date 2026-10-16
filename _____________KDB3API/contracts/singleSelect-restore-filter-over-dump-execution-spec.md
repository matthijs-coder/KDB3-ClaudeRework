# Execution Spec: Filter caption over dump singleton

> Mechanical spec for Grok 4.6. Law: `singleSelect-restore-table-display-contractdelta.md` follow-up
> (PO GO 2026-09-09). Q1-B + lock 6 drop `host.d === host.u`. No M2. No H0. No rights tables.
> Wave-1 restore-commit sibling already shipped — do **not** reopen classify / skip-write / core split.
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

**May edit only:**

- `KDB3/js/dashboard/filters/singleSelect/effects/resolveRestoreSelectionPair.js`
- `KDB3/js/dashboard/filters/singleSelect/state/createFilterInstanceState.js`

**Must not edit:** `applyRestoreSelectionCore.js`; `commitRestoreSelection.js`; `parameterSetResyncApplyPair.js`; `applyRestoreSelection.js`; `parseFilterOptionTableRows.js`; `resolveFilterValueFromTable.js`; `applySpecialSelectionPolicy.js`; `specialFilterDefinitions.js`; `hydrateStateFromPopup.js`; `ownerRoutes.js`; `verifyCommitFilterValue.js`; `writeVerifiedSelection.js`; `__savedProperties/filterPropId.js`; `tables.js`; GET collectors; `KDB.js`; contracts except you do not edit delta/spec; `.mdc`; git.

**Must not create:** new files; `helpers/` / `common/` / `shared/`; overlay; MUN parser.

---

## Section A. Pre-flight

Echo one sentence per row **before** files:

1. `kdb-object.mdc` — `_KDB` via argument; no new namespace.
2. `state.mdc` — `singleSelect` writes instance selection; no `filt.sels` display.
3. `runtime.mdc` — no new bucket.
4. `module-public-api.mdc` — no new public method; `tableData.readRows` / `waitForRows` take an **array**.
5. `events.mdc` — no new events.
6. `feature-structure.mdc` — JS ≤150; AMD ≤10.
7. `naming.mdc` — `_` on boundary inputs; English files.
8. `error-handling.mdc` — keep try/catch on `__controller`; table wait already warns.
9. `dom.mdc` — no DOM.
10. `amd.mdc` — one `define`; factory-scope helpers; no nested functions in the entry.
11. `lifecycleVocabulary.md` — no new term.
12. `cognos-adapter.mdc` — tableData only; no `_KDB.cognosAPI`.
13. `contracts/singleSelect-restore-table-display-contractdelta.md` — lock 2 order + lock 6 predicate.
14. This spec.

---

## Section B. Edit order

1. `resolveRestoreSelectionPair.js`
2. `createFilterInstanceState.js`

---

## Section C. Per-file

### Traps

1. **Map unique first.** Empty or >1 map matches: do **not** return the dump singleton from the map helper. Return `null` and continue.
2. **Then Filter.** Existing `readTablePair` + `findMatchingUseValue`. `readRows([{ tableName: tableKey, shape, pick }])` — **array**. Rights keys `dienststellenleitung` / `personengruppe` must not be `tableKey` (`resolveFilterOptionsTableKey` already returns `*_filter`).
3. **Then dump singleton** (`definition.displayValue` + `useValue` exact `use` match) only if Filter returned null.
4. Then F1 transport `d=u` as today.
5. **Lock 6:** drop `hostSelection.displayValue === hostSelection.useValue` from the `"table"` preserve `if`. Keep: source `"table"`, same `use`, existing `d` non-null, `existing.d !== host.d`. Unavailable block **first**, unchanged (still requires `host.d === host.u` there).
6. Do not merge with SSS first-row default. Do not edit dump files.

---

#### `effects/resolveRestoreSelectionPair.js`

- **Lines:** live 84 → target ~92–110 (hard 150). AMD **4** unchanged.
- **Split** `readExplicitPair` into two factory-scope helpers (never inside `__controller`):
  - `readMapPair(_definition, _useValue)` — current map loop only. Unique → `{d,u}`. `>1` → `null` (do **not** fall through to singleton here). `0` → `null`.
  - `readDumpSingleton(_definition, _useValue)` — current `displayValue`+`useValue` match only.
- **`__controller` order after empty-use Alle:**
  1. `readFilterDefinition` as today
  2. `mapPair = readMapPair(...)`; if truthy return `{ selection: mapPair, degraded: false, diagnostic: null }`
  3. `tablePair = await readTablePair(...)`; if truthy return Filter pair `degraded: false`
  4. `dumpPair = readDumpSingleton(...)`; if truthy return dump pair `degraded: false`
  5. Else today’s degraded `d=u` + `RESTORE_DISPLAY_DEGRADED`
- Keep `readTablePair` as-is (including wait + warn). Keep Alle short-circuit.
- **Rules:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` (entry try/catch); `module-public-api.mdc` (`tableData` array input).

---

#### `state/createFilterInstanceState.js`

- **Lines:** live 89 → ~90 (hard 150). AMD **1**.
- **Unavailable** `if` (L33–42): **do not change**.
- **Table preserve** `if`: **delete** the conjunct `hostSelection.displayValue === hostSelection.useValue`. Keep the other four conjuncts and the assignment that keeps `existing.displayValue` + `"table"`.
- **Rules:** `amd.mdc`; `naming.mdc`; `state.mdc`.

---

## Section D–I

No new API, harness, events.

---

## Section J. Acceptance (writer self-check)

1. Allowlist only. Both files ≤150. AMD unchanged.
2. Global DST_LTNG MUN: resolver returns Filter `{ d: "Dienststellenleitung", u: MUN }` when `dienststellenleitung_filter` unique-matches that `use` — **not** dump `DST_LTNG`.
3. Map unique still wins over Filter if a map ever has a unique `u`.
4. Filter miss / wait fail: dump singleton still used when `displayValue`+`useValue` match.
5. Rights tables not read for caption.
6. Lock 6: `"table"` preserved when host `.d` is `DST_LTNG` and owner `.d` is `Dienststellenleitung` (same `use`).
7. Unavailable preserve still zeros `d` only on its old `d===u` gate.
8. No dump-file edit. No M2. No hydrate.

---

## Section K. Forbidden

M2 overlay. H0 hydrate. `applySpecialSelectionPolicy`. MUN parse. SSS `if` on filterLabel. Edit `filterPropId.js`. New files. Commit. Tick toast PROGRAM.

---

## Section L. Report

Pre-flight echo, lines/AMD, deviations, J checklist, open questions.

---

## Section M. Cognos (not writer)

After SET, global Dienststellenleitung: owner `displayValue` should be Filter caption; chip may still be `DST_LTNG`. Open SSS popups once (H0 residual). Same for Personengruppe / `personengruppe_filter` vs dump `Lehrlinge`.

**PO Cognos green 2026-09-09.** Chip overlay (M2) and H0 remain OOS.
