# Fix Spec: `sicht` CSS class alignment with `singleSelect`

> Focused styling/classname tranche for visual parity between `sicht` and `singleSelect`.
> This spec changes CSS marker classes and CSS placement only. It must not change filter behavior, state ownership, events, Dienststelle logic, or tableData semantics.

---

**Status:** `Ready for execution`
**Base contract:** `_____________KDB3API/contracts/sicht.md`
**Scope:** class tagging + CSS path/class alignment
**Decision:** Use the dual-class pattern:

```txt
Sicht wrapper = KDB_singleSelectFilter + KDB_sichtSingleSelect
```

`KDB_singleSelectFilter` activates shared generic singleSelect popup styling. `KDB_sichtSingleSelect` remains the Sicht semantic/delta marker.

---

## Section A. Required pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/naming.mdc`
2. `_____________KDB3API/.cursor/rules/dom.mdc`
3. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
4. `_____________KDB3API/contracts/sicht.md`
5. `_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/syncFilterWrapperClasses.js`
6. `_____________KDB3API/KDB3/js/dashboard/filters/sicht/config/selectors.js`
7. `_____________KDB3API/KDB3/js/dashboard/filters/sicht/config/sichtDefinitions.js`
8. `_____________KDB3API/KDB3/js/dashboard/filters/sicht/effects/applySichtOptionState.js`
9. `_____________KDB3API/KDB3/css/filters/sichtSingleSelect.css`
10. `_____________KDB3API/KDB3/css/filters/singleSelect.css`
11. `_____________KDB3API/KDB3/css/filters/specialSingleSelect.css`

---

## Section B. Files allowed to modify

Only modify these files:

```txt
_____________KDB3API/contracts/sicht.md
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/syncFilterWrapperClasses.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/config/selectors.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/config/sichtDefinitions.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/effects/applySichtOptionState.js
_____________KDB3API/KDB3/css/filters/sichtSingleSelect.css
```

Do not move files in this tranche. `singleSelect.css` is already expected under:

```txt
KDB3/css/filters/singleSelect.css
```

If that path/reference is not already correct, stop and report before editing extra files.

---

## Section C. Required changes

### C1. Add dual class for Sicht wrapper

File:

```txt
KDB3/js/dashboard/filters/filterDock/effects/syncFilterWrapperClasses.js
```

Required behavior:

- `singleSelect` wrappers get `KDB_singleSelectFilter`.
- `specialSingleSelect` wrappers get `KDB_singleSelectFilter`.
- `sicht` wrappers get both:

```txt
KDB_singleSelectFilter
KDB_sichtSingleSelect
```

- `sicht` must not get `KDB_cascadingFilter`.
- Keep `KDB_cascadingFilter` only for a non-Sicht upstream legacy compatibility case if such a case remains in the current code; otherwise do not add it for `sicht`.

Acceptance:

- A `filterType === "sicht"` wrapper receives `KDB_singleSelectFilter` and `KDB_sichtSingleSelect`.
- A `filterType === "sicht"` wrapper does not receive `KDB_cascadingFilter`.
- Existing `singleSelect` and `specialSingleSelect` class behavior is not regressed.

Rules to apply:

- `dom.mdc` - wrapper class sync is filterDock-owned classification, not state mutation.
- `module-public-api.mdc` - no state/API surface changes.

### C2. Rename Sicht-owned delta classes to `KDB_*`

Files:

```txt
KDB3/js/dashboard/filters/sicht/config/selectors.js
KDB3/js/dashboard/filters/sicht/config/sichtDefinitions.js
KDB3/js/dashboard/filters/sicht/effects/applySichtOptionState.js
KDB3/css/filters/sichtSingleSelect.css
```

Required class names:

| Old | New |
|---|---|
| `kdb-sicht-single-select` | `KDB_sichtSingleSelect` |
| `kdb-sicht-option-alle` | `KDB_sichtHideAlle` |
| `kdb-sicht-option-disabled` | `KDB_sichtOptionDisabled` |
| `kdb-sicht-commit-in-progress` | `KDB_sichtCommitInProgress` |
| `kdb-sicht-option-bw` | `KDB_sichtOptionBw` |
| `kdb-sicht-option-dezpv` | `KDB_sichtOptionDezpv` |

Notes:

- `KDB_sichtSingleSelect` is the wrapper/root marker.
- `KDB_singleSelectFilter` is the shared visual behavior marker.
- Do not reintroduce `KDB_cascadingFilter` for `sicht`.

Acceptance:

- No `kdb-sicht-` class remains in production JS/CSS.
- Sicht CSS selectors use `KDB_sichtSingleSelect` and `KDB_sicht*` classes.
- `applySichtOptionState.js` receives class names from config/selectors, not hardcoded duplicates where avoidable.

Rules to apply:

- `naming.mdc` - this tranche is an approved compatibility exception to align with existing filter CSS class convention (`KDB_singleSelectFilter`, `KDB_specialSingleSelect`).
- `dom.mdc` - CSS classes only; no state writes.

### C3. Keep `sichtSingleSelect.css` as delta CSS only

File:

```txt
KDB3/css/filters/sichtSingleSelect.css
```

Required shape:

- Keep only Sicht-specific deltas:
  - hide native Alle option marker;
  - disabled/not-ready Sicht option styling;
  - optional reserved BW/DEZPV markers if needed.
- Do not copy generic `singleSelect.css` rules into this file.
- Generic checkbox/search/commit styling must come from shared `singleSelect.css` via `KDB_singleSelectFilter`.

Suggested content shape:

```css
.KDB_sichtSingleSelect .KDB_sichtHideAlle {
  display: none !important;
}

.KDB_sichtSingleSelect .KDB_sichtOptionDisabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
```

Acceptance:

- No duplicated generic singleSelect CSS.
- Sicht-specific CSS remains small and scoped.

### C4. Sync `sicht.md` contract class decision

File:

```txt
contracts/sicht.md
```

Required update:

- Document the dual-class decision:

```txt
KDB_singleSelectFilter = shared generic singleSelect visual behavior marker.
KDB_sichtSingleSelect = Sicht semantic/delta marker.
```

- Replace stale `kdb-sicht-*` canonical text with the approved `KDB_sicht*` compatibility naming for production CSS classes.
- Keep the note that `KDB_cascadingFilter` is not used for `sicht`.

Acceptance:

- Contract and production code no longer contradict each other on Sicht class naming.

---

## Section D. Forbidden actions

Do not:

- modify `.cursor/rules/`;
- modify contract templates;
- modify legacy trees;
- modify `TEST/`;
- add events;
- add Dienststelle / hierarchy behavior;
- change tableData semantics;
- change commit/history behavior;
- duplicate generic `singleSelect.css` into `sichtSingleSelect.css`;
- reintroduce `KDB_cascadingFilter` for `sicht`.

---

## Section E. Self-verification

Before reporting back, verify:

1. `filterType === "sicht"` gets `KDB_singleSelectFilter`.
2. `filterType === "sicht"` gets `KDB_sichtSingleSelect`.
3. `filterType === "sicht"` does not get `KDB_cascadingFilter`.
4. No `kdb-sicht-` remains in production JS/CSS.
5. `sichtSingleSelect.css` contains only Sicht delta CSS, no generic singleSelect CSS copy.
6. `singleSelect.css` path remains `KDB3/css/filters/singleSelect.css`.
7. No old `KDB3/css/singleSelect.css` reference remains in `cssHrefList.js`.
8. Contract class table/text matches production class names.
9. No lint diagnostics were introduced.

---

## Section F. Report template

Final report must include:

1. Pre-flight echo.
2. File checklist with line counts.
3. Confirmation for C1-C4.
4. Self-verification E1-E9.
5. Deviations, if any.
