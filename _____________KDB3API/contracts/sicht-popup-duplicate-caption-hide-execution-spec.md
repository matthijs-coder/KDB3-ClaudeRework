# Execution Spec: `sicht` popup duplicate-caption hide (`M-CSS-KDB`)

> CSS-only. Approved delta is law. No architectural decisions.

---

**Status:** `Executed` / `Reviewed` — PO Cognos **green** 2026-09-09. PO committed.  
**Module / contract:** `_____________KDB3API/contracts/sicht.md` + `_____________KDB3API/contracts/sicht-popup-duplicate-caption-hide-contractdelta.md`  
**Phase:** layout hide of post-Fertig same-class twin  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Executing AI:** grok 4.6 writer  
**Reviewer:** dual grok 4.6 after files

---

## Section A. Pre-flight read list

Echo one sentence each **before** editing:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc` — existing `KDB_sicht*` classes are grandfathered; mint no new class.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc`
9. `_____________KDB3API/.cursor/rules/dom.mdc` — CSS under `.KDB_sichtSingleSelect`; no live DOM in `_KDB.state`.
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no new facet.
13. `_____________KDB3API/contracts/sicht-popup-duplicate-caption-hide-contractdelta.md` — M-CSS-KDB locked; CSS file only.
14. This spec.

---

## Section B. Folder tree

Change one existing file:

```
_____________KDB3API/KDB3/css/filters/sichtSingleSelect.css
```

Do **not** create files. Do **not** edit JS. Do **not** edit `sicht.md` (captain already did §16).

---

## Section C. Per-file specification

#### `KDB3/css/filters/sichtSingleSelect.css`

- **Role:** Sicht-owned hide CSS.
- **Change:** Add exactly two selectors to the **existing first rule** (same `display: none !important` block as Alle + `'duplicates'`). Do not add a second `display` block. Do not change `.KDB_sichtOptionDisabled`.

Exact first rule after edit:

```css
.KDB_sichtSingleSelect .KDB_sichtHideAlle,
.KDB_sichtSingleSelect .ba-common-listItem-wrapper:has([aria-label="duplicates"]),
.KDB_sichtSingleSelect .KDB_sichtOptionBw ~ .KDB_sichtOptionBw,
.KDB_sichtSingleSelect .KDB_sichtOptionDezpv ~ .KDB_sichtOptionDezpv
{
  display: none !important;
}
```

Keep the disabled block unchanged.

- **Rules to apply:**
  - `naming.mdc` — no new class; reuse `KDB_sichtOptionBw` / `KDB_sichtOptionDezpv`.
  - `dom.mdc` — scoped to `.KDB_sichtSingleSelect`; not `singleSelect.css`.
  - `feature-structure.mdc` — CSS-only extension; no JS.
  - `cognos-adapter.mdc` — no facet.
  - delta — keep-first sibling; do not add `:has([aria-label="BW"])`.

---

## Section J. Acceptance

1. File matches Section C exactly (two sibling selectors in the first rule).
2. `.KDB_sichtOptionDisabled` block unchanged.
3. No `KDB3/js/**` diff.
4. No new CSS class.
5. No `'duplicates'` selector removed.
6. Report: path, line count, deviations.

---

## Section K. Forbidden

- Edit `.mdc`, `_template.md`, `_executionSpecTemplate.md`, `sicht.md`, JS, `singleSelect.css`, `tables.js`, `KDB.js`.
- M-CSS-ARIA, new class, observer, apply-skip.
- Commit / push / git config.
- Folders `helpers` / `common` / `shared`.

---

## Section L. Reporting

1. Pre-flight echo (14).
2. File checklist (path, lines, matches spec | deviation).
3. Deviations.
4. Self-verification vs Section J.
