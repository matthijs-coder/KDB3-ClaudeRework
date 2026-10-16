# Communique: F6c smoke failure — commit value resolution

**Status:** For planning AI / CP-2 follow-up  
**Date:** 2026-05-24  
**From:** Executing AI (F6c implementation + Cognos smoke analysis)  
**Relation:** Refines F6c scope; supersedes naive pre-OK-only resolution in `commitConfirmedSelection.js` / `resolveFilterApi.js`.

---

## 1. Smoke result

**F6c fails on first single-option commit from Alle.**

Repro (Geschlecht):

1. Open filter (pending `Alle`, backup `Alle`).
2. Select `weiblich` → KDB pending correct.
3. Click OK → commit fails: `matching Cognos value not found`, `pending: 'weiblich'`, `normalizedOk: null`.

KDB handoff and pending state are correct. Failure is in Cognos `{ u, d }` resolution.

---

## 2. Root cause

F6c resolves the commit value **only** via `filterApi.getValues()` **before** programmatic OK (`resolveSelectedValueBeforeOk`).

`getValues()` returns **committed dashboard filter context**, not KDB pending / popup draft selection.

| Scenario | `getValues()` before OK | `getValues()` after OK |
|---|---|---|
| Alle → first pick (e.g. `weiblich`) | `[]` | would populate after native OK (legacy) |
| A → B switch (e.g. `weiblich` → `männlich`) | `[weiblich]` (old commit), not pending | often `[]` (F6c original bug) |

KDB `applyPendingSelection` + `syncPopupOptionSelection` update state and DOM checkboxes only; they do **not** write Cognos PageContext values.

**Pre-OK-only resolution is therefore insufficient for both paths.** F6c fixed the post-OK `[]` race by moving resolution before OK, but broke Alle → first selection.

---

## 3. Legacy evidence

Legacy singleSelect clicked **native OK first**, then polled `getValues()` until `valueObj.d === currentSelection`, then `replaceFilterContext` / `updateFilterContext2`.

That worked for Alle → first pick. It failed for A ↔ B when post-OK poll returned `[]` (popup/API teardown timing).

Hierarchy code notes: relying on when `getValues()` updates after popup clicks is **not deterministic** (`hierarchyPopupInteractionHelpers.js`).

---

## 4. Planning decision required

**Reject pure Option A (pre-OK `getValues()` only).** Approve **hybrid resolution** for F6d:

### Phase 1 — fast path (keep)

While popup open: bounded poll `getValues()` for pending label match. Use if found.

Covers cases where Cognos already reflects the target in committed context.

### Phase 2 — OK-commit window (required fallback)

If Phase 1 fails:

1. Snapshot `baseline = getValues()`.
2. Programmatic native OK (filterDock-owned, popup still open).
3. **Immediately** bounded poll `getValues()` until:
   - value matches pending label, **or**
   - selection changed vs baseline and matches pending.
4. Capture `{ u, d }` from poll result → `replaceFilterContext(filterApi, [value])`.
5. Do **not** use post-replace `getValues()` for initial discovery.

Timing must beat popup teardown; poll delay should be aggressive (e.g. 50–100 ms, bounded ~2–3 s).

### Phase 3 — normalized verification (keep)

After successful `replaceFilterContext`: poll normalized state (empty for Alle, exactly one matching value for non-Alle). Same as current F6c.

### Phase 4 — popup close (keep)

Programmatic OK / close only **after** successful replace + verification, for Cognos UI cleanup. Not as sole value source.

### Optional Phase 5 — last-resort sources (plan gate)

If Phase 2 still returns `[]`:

- resolve `{ u, d }` from popup picklist / DOM while popup open, **or**
- construct `{ u, d }` from label when Cognos accepts it (rollback already uses `{ u: useValue, d: displayValue }` in `restorePreviousConfirmedSelection.js`).

Only add if smoke proves Phase 2 alone is insufficient.

---

## 5. Constraints (unchanged)

- No new events; no `_KDB.runtime.filterDock` reads from singleSelect.
- Commit remains singleSelect-owned; programmatic OK / close remains filterDock-owned.
- Preserve F6/F6b: popupReady sync-only; duplicate confirm blocked while `isCommitInProgress`.
- Allowed scope: `commitConfirmedSelection.js`, `resolveFilterApi.js`, focused helper under `singleSelect/effects/` if needed.

---

## 6. Acceptance for F6d

| Case | Expected |
|---|---|
| Alle → `weiblich`, OK | commits `weiblich` |
| `weiblich` → `männlich`, OK | commits `männlich` |
| Rapid A/B then OK | latest pending, not backup |
| Alle path | `replaceFilterContext(filterApi, [])` |
| Happy path | no `matching Cognos value not found` with `lastValues: []` after replace |
| F6/F6b regression | no popupReady flood; pending stable on option switch |

---

## 7. Diagnostic for manual smoke

With popup open and pending set, before OK:

```js
const api = _KDB.cognosAPI.filters.getAllGlobalFilterItems()
  .find(i => i.getItemName() === "Geschlecht");
console.log("getValues before OK:", api.getValues());
console.log("KDB pending:", _KDB.state.filters.singleSelect.byScope.global.Geschlecht.pendingSelection);
```

Expect `[]` before OK when backup is Alle — confirms Phase 1 alone cannot succeed.

---

## 8. File-size note

`resolveFilterApi.js` is 202 lines (over 150 hard limit). F6d split or helper extraction should be planned if hybrid logic is added.
