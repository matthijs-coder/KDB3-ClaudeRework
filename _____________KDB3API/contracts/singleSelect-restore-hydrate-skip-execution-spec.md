# Execution Spec: skip popup hydrate when use is set (H0-B)

> Mechanical spec for Grok 4.6. Law: `singleSelect-restore-hydrate-skip-contractdelta.md`
> (PO GO 2026-09-09). One writer. Exclusive allowlist. Echo Section A **before** files.

---

**Status:** `Executed` — 2026-09-09; dual review PASS. **PO Cognos green 2026-09-09.**  
**Module / contract:** `contracts/singleSelect-restore-hydrate-skip-contractdelta.md`  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Executing AI:** grok 4.6 army  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist (one writer)

**May edit only:**

- `KDB3/js/dashboard/filters/singleSelect/effects/hydrateStateFromPopup.js`

**Must not edit:** `restorePopupSelection.js`; `syncPopupOptionSelection.js`; `applyPendingSelection.js`; `resolveRestoreSelectionPair.js`; `resolveFilterValueFromTable.js`; `executeConfirmedCommit.js`; `verifyCommitFilterValue.js`; `applySpecialSelectionPolicy.js`; `ownerRoutes.js`; `filterPropId.js`; GET collectors; `KDB.js`; contracts; `.mdc`; git.

**Must not create:** new files; `helpers/`; reverse lookup; overlay.

---

## Section A. Pre-flight

Echo one sentence per row **before** files:

1. `kdb-object.mdc` — `_KDB` via argument; this file already has no `_KDB`.
2. `state.mdc` — mutate only the passed `_filterState`; no `filt.sels`.
3. `runtime.mdc` — no new bucket.
4. `module-public-api.mdc` — no new public method.
5. `events.mdc` — no new events.
6. `feature-structure.mdc` — JS ≤150; AMD ≤10.
7. `naming.mdc` — `_` on boundary inputs.
8. `error-handling.mdc` — this file has no try/catch today; do **not** add one unless you wrap the whole `__controller` without nested functions.
9. `dom.mdc` — read popup options only; do not rewrite labels.
10. `amd.mdc` — one `define`; factory-scope helpers; no nested functions in `__controller`.
11. `lifecycleVocabulary.md` — no new term.
12. `cognos-adapter.mdc` — no `_KDB.cognosAPI`.
13. `contracts/singleSelect-restore-hydrate-skip-contractdelta.md` — locks 1–7.
14. This spec.

---

## Section B. Edit order

1. `hydrateStateFromPopup.js`

---

## Section C. Per-file

### Traps

1. After the existing `wasHydratedFromDom === true || !findFirstCognosOption` early return (unchanged — **do not** set the flag on missing options), **before** the selected-option loop: if `_selectionState.getConfirmedUseValue(_filterState.currentSelection)` is a non-empty string, set `_filterState.wasHydratedFromDom = true` and `return`.
2. Empty use / Alle still enters the loop (today).
3. Do not compare `displaySource`. Use **useValue** only (covers `"table"` and F1 `"unavailable"` + use).
4. Do not call `createConfirmedSelection` on the skip path.
5. Do not reset the flag anywhere else (this file is the only writer).
6. AMD stays **3**. Same imports. Target ~66 lines (hard 150).

#### `effects/hydrateStateFromPopup.js`

- **Role:** effect — one-shot DOM hydrate of owner selection.
- **Lines:** live 59 → ~66 (hard 150). AMD **3**.
- **AMD imports:** unchanged (`selectors`, `selectionState`, `readPopupOptionLabel`).
- **Factory-scope helpers:** keep `findFirstCognosOption`. No new helpers required.
- **Entry:** `__controller(_popupMount, _filterState)`
- **Body steps:**
  1. Keep today’s first `if` (hydrated or no Cognos option) `return`.
  2. Skip-write + latch if confirmed use non-empty.
  3. Keep today’s selected-option loop unchanged.
- **Return:** `__controller`
- **Rules to apply:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `state.mdc` (only `_filterState`); `dom.mdc` (no label rewrite).

---

## Section J. Acceptance

1. Allowlist only.
2. Skip when use non-empty; latch flag; missing-options empty-use still unlatched.
3. File ≤150, AMD 3, no nested functions in `__controller`.
4. No reverse lookup.

---

## Section K. Forbidden

`.mdc`; git; dump files; D/remap/E/M2; toast PROGRAM; `helpers/`.

---

## Section L. Report

Pre-flight echo, line count, deviations, J checklist, open questions.

---

## Section M. Reviewer / Cognos

After SET Dienststellenleitung: open popup once. Owner `useValue` must stay the MUN. Chip may still be `DST_LTNG`. No highlight is OK. Do not click Fertig as the pass criterion.
