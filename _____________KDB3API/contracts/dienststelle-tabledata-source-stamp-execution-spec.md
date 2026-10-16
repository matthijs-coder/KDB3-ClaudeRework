# Execution Spec: stamp `source: "tableData"` on Dienststelle table load

> Mechanical spec for Grok 4.6. Architecture lives in `dienststelle-tabledata-source-stamp-contractdelta.md`. Do not re-decide A vs B, latch, chip, or `resolveWalkMode`.
> Production tree only: `_____________KDB3API/KDB3/js/**` plus the parent inserts in the allowlist.
> One writer. Exclusive allowlist. Echo every Section A row **before** producing files.

---

**Status:** `Implemented`
**Module / contract:** `dienststelle.md` + `dienststelle-stable-default-final-clean-spec.md` + this delta
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-10-16
**Executing AI:** grok 4.6 writer (assigned after review green)
**Reviewer:** grok 4.6 review swarm + captain

---

## Exclusive allowlist (one writer)

**May create:** none.

**May edit:**

- `KDB3/js/dashboard/filters/dienststelle/effects/subscribeDienststelleTableDataChanges.js`
- `KDB3/js/dashboard/filters/dienststelle/effects/routeDienststelleDispatch.js`
- `contracts/dienststelle.md` (delta §3: one sentence **inside** the S1 table cell only)
- `contracts/dienststelle-stable-default-final-clean-spec.md` (delta §3 §6.5 insert only)
- the delta + this spec (status → `Implemented` after code lands)

**Must not edit:** `resolveDienststelleReconcileMode.js`; `runDienststelleReconcile.js`; `reconcileDienststelleHostScopes.js`; `walkDienststellePageContextScopes.js`; `applyDienststelleDefault.js`; `syncDienststelleFromSicht.js`; `subscribe` of sicht / specialSingleSelect; chip/view/sanitize; widget bind; `KDB.js`; git.

**Must not create:** `helpers/` / `common/` / `shared/`; `stampTableDataSource.js`; latch state; `paintChip`.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` via argument; no new namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — no new state field.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no new runtime bucket.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new `_KDB.api.dienststelle` method.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events; do not stamp `source` on tableData `LOAD_FINISHED`.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150; AMD >10 requires split. Route is already 10 AMD / 148 lines: **no new import**, merge stays in place.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files; `_` on boundary params.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — keep existing try/catch on subscribe; do not wrap the route merge in a new function.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no DOM.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; no nested subfunctions; no ESM.
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no new `_KDB.cognosAPI` / facet.
12. The approved delta.
13. This spec.
14. Live files in Section C (read, then patch).

---

## Section B. Folder tree

```
KDB3/js/dashboard/filters/dienststelle/effects/
  subscribeDienststelleTableDataChanges.js   (edit)
  routeDienststelleDispatch.js               (edit)
```

---

## Section C. Per-file specifications

#### `subscribeDienststelleTableDataChanges.js`

- **Change one object.** `onTableDataLoadFinished` dispatch payload becomes `{ tableName: tableName, rowCount: rowCount, source: "tableData" }`.
- Do not add a helper, a new AMD, or a new function.
- File stays **40 / 150**, **3 AMD**. Existing try/catch + `console.error("[dienststelle.tableDataChanged] failed", _error)` stays.
- `isRelevantTableName` gate stays.

#### `routeDienststelleDispatch.js`

- **Only** the `TABLE_DATA_CHANGED` / `SYNC_REQUESTED` reconcile argument (live ~136–138). Tab-mutation defer line stays.
- Replace:

```js
return _runReconcile(_controller._KDB, _dispatchInternal, _reconcile, action.payload || {
  source: action.type === _actions.TABLE_DATA_CHANGED ? "tableData" : "sync"
});
```

- Paste this **verbatim** (source **last**). Do not rewrite the `Object.assign` argument order.

```js
return _runReconcile(_controller._KDB, _dispatchInternal, _reconcile, Object.assign({}, action.payload || {}, {
  source: (action.payload && action.payload.source) || (action.type === _actions.TABLE_DATA_CHANGED ? "tableData" : "sync")
}));
```

- Forbidden: **any** `Object.assign({ source: X }, action.payload || {})`, including `X` as `typeDefault` **or** as the coalesced `(payload && payload.source) \|\| typeDefault`. First-argument `source` is wiped by `payload.source === undefined`.
- Empty/`undefined` `SYNC_REQUESTED` payload → `"sync"`. Keep the type ternary. Do not drop it.
- Present non-empty `payload.source` wins (`\|\|`).
- File **≤150** lines (today 148). **10 AMD**, no new import. Do not extract a helper.

#### Parent contracts

Land **exactly** delta §3. `dienststelle.md` S1: append the sentence **inside** the existing S1 table cell (`dienststelle.md` ~591). Do not insert a new table row or a footnote after S1. §6.5: one bullet after the existing `source: "tableData"` bullet. No other parent edits.

---

## Section D. Done when

- Subscribe payload includes `source: "tableData"`.
- Route merge is the verbatim Section C snippet (coalesced `source` last, not first).
- Writer quotes the two live snippets.
- Route ≤150 / 10 AMD. Subscribe 40 / 3 AMD.
- No other JS touched.

---

## Section E. Forbidden extras

- Gate `defaultScope(..., "global")` to `source === "startup"` (B).
- Latch / `clearedByUser`.
- Chip / sanitize / `paintChip`.
- `resolveWalkMode` rewrite.
- Stamp Sicht or specialSingleSelect TABLE_DATA.
- Stamp tableData `LOAD_FINISHED` bus.
- Any `Object.assign({ source: X }, payload)` (source-first), even if `X` is coalesced.
- Git commit / push.
