# Execution Spec: DEZPV drillthrough column order

**Status:** `Reviewed`
**Contract:** `contracts/drillthrough-dezpv-column-order-contractdelta.md`
**Phase:** implementation
**Authoring AI:** Cursor Grok 4.7 (coordinator), 2026-10-14
**PO go:** 2026-10-14 chat ("ok. go")

---

## Section A. Pre-flight

Read before editing. Put a one-sentence summary of each in the report, then edit in the same turn.

1. `amd.mdc` — one `define`, factory-scope helpers, no nested functions.
2. `naming.mdc` — English identifiers; underscore only on boundary inputs.
3. `error-handling.mdc` — do not add try/catch to a pure key-order helper.
4. `feature-structure.mdc` — stay inside the two files; no new file; hard limit 150 lines.
5. `contracts/drillthrough-dezpv-column-order-contractdelta.md` — walk `Object.keys` order; first kept cell is the root; `level001` keeps parsed `levelRank` 1.

## Section B. Allowlist

Edit only:

- `_____________KDB3API/KDB3/js/core/services/drillthrough/org/rankHierarchyRowKeys.js`
- `_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/effects/buildOrgTreeForDrillthrough.js`

Do not edit `buildOrgTreeFromRows.js`, `mapDezpvOrgPrompts.js`, `mapBwOrgPrompts.js`, `collectBwGruppeCandidates.js`, or any contract except this spec's status line is already set.

## Section C. Change

### `org/rankHierarchyRowKeys.js`

- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`. Pure helper. No try/catch.
- Array rows: return indices `0 .. length-1` (unchanged).
- Non-objects: return `[]` (unchanged).
- Object rows: return `Object.keys(_row)` in that order. Delete `rankFromKey`, `compareRankedKeys`, and the sort that places level keys before other keys.
- Keep the AMD shape: no imports, return `__controller`.

### `widgetVis/effects/buildOrgTreeForDrillthrough.js`

- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc` (existing `__controller` try/catch stays).
- `rankHierarchyRowKeys`: same rule as the service file. Delete `compareRankedKeys` and the sort. Keep `rankFromKey`. It is still used by `walkRow` to set `levelRank`.
- Do not change `walkRow`, `ensureNode`, `getOrCreateIdForText`, or the `__controller` table-key choice.
- `walkRow` must keep: `rank = typeof keys[i] === "number" ? keys[i] : rankFromKey(keys[i])` and `ensureNode(..., rank == null ? i : rank)`. A key `level001` stays `levelRank` 1 even when an unranked column precedes it. An unranked key uses the walk index.

## Section D. Forbidden

- No mapper edits. No HideData skip. No new files. No rename of `rankHierarchyRowKeys`. No ES modules. No commits.

## Section E. Check

From `_____________KDB3API` run `node --check` on both files.

Report: pre-flight echoes, line counts, and the resulting key order for an object whose `Object.keys` are `Dienststelle_DEZPV`, `level001`, `level002`, `HideData` (expected: that same order, not level columns first).

## Section F. Acceptance

1. That object walks `Dienststelle_DEZPV` before `level001`.
2. A node created from `level001` still receives `levelRank` 1.
3. A node created from `Dienststelle_DEZPV` at walk index 0 receives `levelRank` 0 and `parent: []` when it is the first non-empty cell.
