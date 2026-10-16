# Execution Spec: SSS restore auto-default toast + H2

> Mechanical spec for Grok 4.6. Architecture lives in
> `specialSingleSelect-restore-default-h2-contractdelta.md` (**Approved**,
> PO vastenburg 2026-09-09). Do **not** re-decide copy, two-toasts, default-boot,
> H2 exact keys, NMS-out, or dstl-wins.
> No harness. Production: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo Section A **before** files.

P1 overlay already shipped. This spec **extends** it. Do not revert Dienststelle C4 strings. Do not revert `pendingRestoreInfo` rename. Do not add AMD to `createWritebackSetService.js`.

---

**Status:** `Executed` — 2026-09-09; dual review after try/catch fix  
**Module / contract:** `contracts/specialSingleSelect-restore-default-h2-contractdelta.md`  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Executing AI:** grok 4.6 army  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist (one writer)

**May edit (SSS hint):**

- `KDB3/js/dashboard/filters/specialSingleSelect/effects/applyAutomaticSpecialSelection.js`
- `KDB3/js/dashboard/filters/specialSingleSelect/effects/specialPolicyShared.js` (**only if** applyAutomatic would exceed 150; lift both `shouldAttach*` helpers here — not a new folder)
- `KDB3/js/dashboard/filters/specialSingleSelect/effects/syncOneSpecialFilter.js`
- `KDB3/js/dashboard/filters/specialSingleSelect/effects/performSpecialSingleSelectSync.js`
- `KDB3/js/dashboard/filters/specialSingleSelect/effects/routeSyncRequested.js`
- `KDB3/js/core/services/writeback/set/effects/dispatchSpecialSingleSelectRestore.js`
- `KDB3/js/core/services/writeback/set/effects/notifyRestoreOutcome.js`
- `KDB3/js/core/services/writeback/set/config/writebackLabels.js`
- `KDB3/js/core/services/writeback/set/effects/presentPendingUrlShareMessage.js`

**May edit (H2 — exact MAG keys, drop prefix):**

- `KDB3/js/dashboard/filters/singleSelect/effects/classifyFilterInstance.js`
- `KDB3/js/dashboard/filters/singleSelect/actions/parameterSet/filterRestoreSupport.js`
- `KDB3/js/core/services/writeback/get/collectors/singleSelectFilterSupport.js`
- `KDB3/js/core/services/writeback/map/adapters/classifyV2FilterItem.js` (drop `indexOf("dienststelle") === 0` OR only; keep the three exact MAG names)

**Must not edit:** `KDB.js`; `applyClearHiddenPolicy.js`; `evaluateSpecialFilterVisibility.js`; `specialPolicyApplyOps.js`; `specialFilterDefinitions.js`; `createMessageService.js`; `createWritebackSetService.js`; `dispatchDienststelleRestore.js`; `runFilterRestore.js`; `dienststelle/actions/parameterSet/**`; `notifyDienststelleEmptyOk.js`; `isUnownedNativeMultiSelectItem.js`; `mapV2FilterEntries.js`; `singleSelect/actions/parameterSet/**` except `filterRestoreSupport.js`; overlay seed files unless `presentPending` needs `labelKeys` only in present+notify; parent contracts; `.mdc`; git.

**Must not create:** `helpers/` / `common/` / `shared/`; new dispatcher; new `messageService` method.

**H2 inline predicate** (copy at each twin; do not extract a cross-folder helper):

```js
name === "dienststelle" || name === "dienststelle_bw" || name === "dienststelle_dezpv"
```

GET/SET `isKnownUnsupportedKey`: `sicht` **or** those three MAG keys. Never prefix. Never skip `dienststellenleitung`.

---

## Section A. Pre-flight read list

Echo one sentence per row **before** files:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150; AMD >10 split; set factory AMD 10.
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc`
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc`
13. `_____________KDB3API/contracts/specialSingleSelect-restore-default-h2-contractdelta.md`
14. This execution spec.

---

## Section B. Edit order

1. H2 four files (classify → GET → SET → v2). Classify-without-SET is forbidden — do all four in this writer pass.
2. `writebackLabels.js` — add the three new keys; keep existing P1 PG + both C4 strings.
3. SSS hint thread (apply → syncOne → perform → route → dispatch).
4. `notifyRestoreOutcome.js` then `presentPendingUrlShareMessage.js`.

No new folders.

---

## Section C. Per-file

#### H2 `classifyFilterInstance.js`

Replace `name.indexOf("dienststelle") === 0` with exact three MAG names. Keep hierarchy/cascade MAG belt. `condition === "dienststellenleitung"` stays. Factory-scope helper OK. AMD 0. ≤150.

#### H2 `filterRestoreSupport.js` / `singleSelectFilterSupport.js`

`isKnownUnsupportedKey`: `sicht` or exact three MAG keys. Do **not** activate unused `isOwnedFilterBoundary` callers. AMD unchanged.

#### H2 `classifyV2FilterItem.js`

`isDienststelleName`: keep three exact equals; **delete** `|| _lowerName.indexOf("dienststelle") === 0`.

#### `writebackLabels.js`

Add exactly:

- `specialSingleSelectRestoreDefaultPersonengruppeMessage` — contract §2 string
- `specialSingleSelectRestoreDefaultDienststellenleitungMessage` — contract §2 string
- `specialSingleSelectRestoreClearedDienststellenleitungMessage` — contract §2 string

Do not change `specialSingleSelectRestoreClearedMessage` or Dienststelle C4 twins.

#### `applyAutomaticSpecialSelection.js`

Live ~130 / AMD 3. Hard 150.

- `isSpecialRestoreFilterLabel(_definition)` — `filterLabel === "Personengruppe"` **or** `"Dienststellenleitung"`.
- P1 `shouldAttach…ClearHint`: keep live five-part predicate but swap Personengruppe-only for `isSpecialRestoreFilterLabel`. Still `rightAllowed === false` + non-empty instance + `parameterRestore` + `rightsUnknown !== true`.
- New `shouldAttachRestoreDefaultHint(_evaluation, _definition, _syncOptions, _visibleResult)` true iff:
  1. `reason === "parameterRestore"`
  2. `isSpecialRestoreFilterLabel`
  3. `rightsUnknown !== true` and `rightAllowed === true`
  4. `_visibleResult && _visibleResult.changed && _visibleResult.patch && _visibleResult.patch.selectionSource === "specialDefault" && !_visibleResult.patch.errorCode`
- On `shouldClearHidden` success path: attach `restoreClearHint: { filterLabel }` as today when P1 hint true (label from definition).
- On visible success return: if default hint true, attach `restoreDefaultHint: { filterLabel: _definition.filterLabel }`.
- Do **not** edit `applyClearHiddenPolicy.js`. Do not gate on `selectionSource === "user"`.
- If this file would exceed 150: move both shouldAttach helpers + `isSpecialRestoreFilterLabel` into `specialPolicyShared.js`.

#### `syncOneSpecialFilter.js`

Forward `restoreDefaultHint` on the **success** return (same pattern as `restoreClearHint`). Abort returns unchanged.

#### `performSpecialSingleSelectSync.js`

One factory-scope `collectHintLabels(_results, _hintName, _field)` — walk results; if `result[_hintName] && result[_hintName].filterLabel` push unique string.

Success: `clearedRestoredValues` as today (only when `reason === "parameterRestore"`); add `appliedDefaultLabels` the same way from `restoreDefaultHint`. Abort: both `[]`.

Do not toast. Do not re-read tableData.

#### `routeSyncRequested.js`

`buildAck`: add `appliedDefaultLabels` slice (empty array on validation/catch). Keep `specialSingleSelectRestoreHint.clearedRestoredValues`. Put both arrays on `specialSingleSelectRestoreHint`.

#### `dispatchSpecialSingleSelectRestore.js`

Always assign `_run.specialSingleSelectRestoreHint = { clearedRestoredValues, appliedDefaultLabels }` from ack arrays (empty OK). **Not** gated on `ok !== true`. No `messageService`. No `statusKind` filter here (notify owns dstl; default-boot must still stash).

#### `notifyRestoreOutcome.js`

- Keep `pickDienststelleInfoKey` first. If it returns a key: **one** dstl notify/pend; **no** SSS (even if SSS hints nonempty).
- Else build SSS key list in order:
  1. if cleared includes `"Personengruppe"` → `specialSingleSelectRestoreClearedMessage`
  2. if default includes `"Personengruppe"` → `specialSingleSelectRestoreDefaultPersonengruppeMessage`
  3. if cleared includes `"Dienststellenleitung"` → `specialSingleSelectRestoreClearedDienststellenleitungMessage`
  4. if default includes `"Dienststellenleitung"` → `specialSingleSelectRestoreDefaultDienststellenleitungMessage`
  (same filter cannot be both; skip missing)
- Live: sequential `message.notify` for each SSS key (`severity: "info"`). Missing label/`notify`: `console.warn("[writebackSet.notifyRestoreOutcome] specialSingleSelect restore info skipped")`; do not throw; continue remaining keys.
- Overlay: `pendingRestoreInfo = { labelKeys: keys.slice(), labelKey: keys[0] || null }` then return (no live notify).
- Abort `showAlert` unchanged; returns before info.
- No `statusKind === "direct"` suppress.
- AMD stays 1. ≤150. Factory-scope helpers only.

#### `presentPendingUrlShareMessage.js`

On info rung: `keys = Array.isArray(pending.labelKeys) && pending.labelKeys.length ? pending.labelKeys.slice() : (pending.labelKey ? [pending.labelKey] : [])`. Notify each existing label string. Then clear `pendingRestoreInfo`. Missing label: `console.warn` (same prefix family); skip that key. Do not `showAlert` on info rung. Ladder unchanged. AMD 1. ≤150.

Do **not** edit `createWritebackSetService.js`.

---

## Section D–I

No new actions, selectors, public API, harness.

---

## Section J. Acceptance (writer self-check)

1. Allowlist only; no file >150; set factory AMD 10; NMS untouched.
2. Zero `indexOf("dienststelle")` in the four H2 files; MAG exact keys still skip; `dienststellenleitung` not skipped.
3. Default toast only when applyDefault mutated on `parameterRestore`; keep-selected silent.
4. Default-boot (`statusKind === "default"`) still stashes + notifies (no direct-only gate).
5. Two specials → two notifies; no combined sentence.
6. Dstl nonempty → zero SSS.
7. Overlay `labelKeys[]` + `labelKey` fallback; no second pending field.
8. P1 PG copy unchanged; new Leitung P1 + two default keys as contract §2.
9. No `cognosAPI` / SSS `messageService`. C4 Dienststelle strings identical.

---

## Section K. Forbidden

- Combined both-filter sentence. Two pending blobs. NMS edit. Classify without GET+SET. Prefix skip left in place. Revert C4 copy. New messageService method. Edit `.mdc`. Commit.

---

## Section L. Report

Pre-flight echo, per-file lines/AMD, deviations, J checklist, open questions.
