# Contract Delta: Closed-dock chip overlay from owner table caption (M2)

> After SET, owner `displayValue` may be Filter caption (`Dienststellenleitung`) with `displaySource: "table"` while Cognos paints `.wa-filterDock-filterItemText` from host `.d` (`DST_LTNG`). Overlay that **closed chip** from owner caption. Reuse the existing dock `committedDisplayObserved` fan-out. Opt-in **singleSelect only**. SSS chips ride `singleSelect.instancesById`. Do **not** persist display in `filt.sels`. Do **not** enable dock `characterData`. Do **not** paint popup labels. Do **not** reuse Dienststelle `#`-strip.

---

**Status:** `Implemented` — dual grok 4.6 PASS 2026-09-09. **PO Cognos green 2026-09-09.**  
**Type:** `feature-module contract delta`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Parents:** `contracts/filterDock.md` §9; `contracts/singleSelect.md` §7; `contracts/singleSelect-restore-table-display-contractdelta.md` (chip was OOS)  
**OOS:** H0 hydrate; characterData observer; CSS sibling; `filt.sels` display; SSS `ownerRoutes` opt-in; restore-core / resync-pair DOM; `applyDienststelleDisplaySanitizing.js`; `.mdc`  
**Spec:** `contracts/singleSelect-closed-dock-chip-overlay-execution-spec.md`

---

## Diagnosis

Cognos owns the chip. Dienststelle already opts into `needsFilterDockCommittedDisplayResync` and **sanitizes** `#…` text; that no-ops on `DST_LTNG`. SS has no chip writer. Dock MO is `childList` + attributes, **no `characterData`**. Observer-only first paint is unproven after SET (chip write may precede `"table"` commit or be text-node only). SET-tail call of the **same** painter after terminal resync reconcile is required. One-shot-only is forbidden.

---

## Closed product decisions

| # | Lock |
|---|---|
| 1 | `ownerRoutes` SS: `needsFilterDockCommittedDisplayResync: true` + `committedDisplayObserved: "singleSelect/filterDockCommittedDisplayObserved"`. SSS route **unchanged**. |
| 2 | New SS action. `dispatchSingleSelectAction` branches to a new handler. **Never** `processFilterDockHandoff` (payload has no `filterType`). |
| 3 | Painter gate: `selectionOwner === "singleSelect"` ∧ `displaySource === "table"` ∧ non-null `displayValue` ∧ `isCommitInProgress !== true` ∧ chip text ≠ caption. Then set chip `textContent` + `title`; `aria-label` only if empty (Dienststelle `ifEmpty`). Idempotent: if text already equals caption, **do not write** (childList loop). |
| 4 | Wrapper lookup: `instance.filterLabel` + `instance.scopeType` (`#filterDock__global` vs `#filterDock__other` + `[data-id]`). Copy ~15 lines into new SS `view/`. Do **not** extract from `restorePopupSelection` or Dienststelle. |
| 5 | Same handler after **successful** terminal resync reconcile in `handleParameterSetResync.js` (not `applyRestoreSelectionCore` / `parameterSetResyncApplyPair` / `parameterSetRunFinished`). Observer remains the live path. |
| 6 | Skip paint while that instance `isCommitInProgress`. Click-commit `"cognos"` stops overlay. Leftover caption until next childList is residual. |
| 7 | New files under `singleSelect/view/` + `singleSelect/effects/`. Do not grow Dienststelle router (AMD 10) or sanitizer (149). Do not grow restore cores with DOM. |
| 8 | No new public methods. No new `_KDB` namespace / lifecycle term / cognosHost facet. Chrome selectors from existing catalog via SS `config/selectors.js`. |
| 9 | H0 is a **separate** slice. Overlay does not write host / use. |

---

## Acceptance

1. After SET Dienststellenleitung unique Filter hit: closed chip text becomes Filter caption when the painter runs (SET-tail and/or later childList). Owner stays `"table"`. Host `.d` may still be `DST_LTNG`.
2. Click-commit that lands `"cognos"` is not over-painted with the old table caption while `isCommitInProgress`.
3. SSS Personengruppe / Dienststellenleitung chips paint via SS instances (no SSS route).
4. Global and pageContext chips use their own instance + bucket.
5. GET `filt.sels` still use-only. PDF unchanged (already owner caption).
6. New view + handler ≤ 150 each; `dispatchSingleSelectAction` AMD ≤ 10 (5→6); `handleParameterSetResync` AMD ≤ 10 (4→5).

---

## Parent one-liners (captain with this GO)

- `filterDock.md` §9.1: `needsFilterDockCommittedDisplayResync` is generic; `singleSelect` may opt in; SSS does not.
- `singleSelect.md` §7: internal action `singleSelect/filterDockCommittedDisplayObserved` — overlay closed chip from `"table"` caption; no public method.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-09 | Approved | PO vastenburg | GO if army KEEP. Narrows: SET-tail, commit skip, scope+label wrapper. |
| 2026-09-09 | Implemented | dual grok 4.6 | Mechanical + semantic PASS. Cognos pending. |
| 2026-09-09 | Cognos green | PO vastenburg | Closed-dock chip shows Filter caption after SET. Hygiene NIT: unused `committedDisplayParentSelector` in SS selectors — not a product defect. |
