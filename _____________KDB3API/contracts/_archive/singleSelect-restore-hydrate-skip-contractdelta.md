# Contract Delta: Skip popup hydrate when confirmed use is already set (H0-B)

> First `filterDockPopupReady` after SET must not copy a Cognos option label into owner state when `useValue` is already non-empty. That wipe sets `use` to `""` and drops `displaySource: "table"`. Do **not** reverse-map popup token `DST_LTNG` to Filter caption. Do **not** rewrite Cognos option labels. Do **not** persist display in `filt.sels`.

---

**Status:** `Implemented` — dual grok 4.6 PASS 2026-09-09. **PO Cognos green 2026-09-09.**  
**Type:** `feature-module contract delta`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Parents:** `contracts/singleSelect-restore-table-display-contractdelta.md` (H0 was OOS); `contracts/singleSelect.md` hydrate / popupReady  
**OOS:** reverse label→use (D); pending-remap; Fertig keep-owner / u-only verify; rewrite option labels (E); chip overlay (M2); `applySpecialSelectionPolicy.js`; dump `filterPropId.js`; `.mdc`  
**Spec:** `contracts/singleSelect-restore-hydrate-skip-execution-spec.md`

---

## Diagnosis

`hydrateStateFromPopup` matches **display** only. After Filter-over-dump, owner `d` is `Dienststellenleitung` while the selected Cognos option is `DST_LTNG` → `uv = ""`. `shouldSkipPopupReadyHydrate` is false (pending === backup). SSS uses the same hydrate via `delegateToSingleSelect`. Dump map `selectionValuesByDisplay` does not exist; Filter rows match caption not token. Reverse lookup would be a new axis (global-only; page-context dump has no singleton). Click-commit still `verifyCommitFilterValue` both-field — Fertig of `DST_LTNG` as Filter caption would fail host echo. **B only.**

---

## Closed product decisions

| # | Lock |
|---|---|
| 1 | Skip the hydrate write when `getConfirmedUseValue(currentSelection)` is non-empty. Set `wasHydratedFromDom = true` **on that skip only**. |
| 2 | Do **not** set the flag on the existing early return for missing Cognos options + empty use (cold-start later `popupReady` must still hydrate). |
| 3 | Existing `wasHydratedFromDom === true` return stays first and does not re-set the flag. |
| 4 | Alle / empty use still hydrates (today’s loop). Sicht already skips the call (`filterType === "sicht"`). |
| 5 | Do not reset `wasHydratedFromDom` on SET / `applyConfirmedState` / reconcile. Latch after skip is intended (later Alle must not re-hydrate a leftover Cognos selected row). |
| 6 | No D, no pending-remap, no `waitForRows` on popup, no new helper, no `helpers/` folder. One file. |
| 7 | Popup may show **no** KDB highlight (`syncPopupOptionSelection` exact-matches Filter caption vs `DST_LTNG`). Fertig stays disabled until a real pending change. Click `DST_LTNG` may `labelNotFound` / verify fail — residual, not this slice. Chip still Cognos `.d` until M2. |

---

## Acceptance

1. After SET of Dienststellenleitung unique Filter hit, first popup open keeps owner `useValue` (MUN) and `displaySource: "table"` / Filter caption.
2. GET `filt.sels[].vals` still that use (not `""`).
3. Cold start / Alle (empty use) still hydrates from Cognos selected option when options exist.
4. `wasHydratedFromDom` is true after the skip so a later popupReady does not wipe.
5. No new public methods. `hydrateStateFromPopup.js` ≤ 150 / AMD 3.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-09 | Approved | PO vastenburg | GO if army KEEP. Challenge: DROP D/remap; ship B. |
| 2026-09-09 | Implemented | dual grok 4.6 | Mechanical + semantic PASS. Cognos pending. |
| 2026-09-09 | Cognos green | PO vastenburg | Popup open-close keeps caption; use not wiped. |
