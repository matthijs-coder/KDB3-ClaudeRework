# Contract Delta: stamp `source: "tableData"` on Dienststelle table load

> Delta on `contracts/dienststelle.md` §11.1 S1 and `dienststelle-stable-default-final-clean-spec.md` §6.5.
> §6.5 already says `source: "tableData"` must not startup-default global after a user clear. Live subscribe/route never deliver that source. This wave only labels the event.

---

**Status:** `Implemented`
**Parents:** `dienststelle.md` §11.1 S1; `dienststelle-stable-default-final-clean-spec.md` §6.5
**Related (do not amend):** widget-bind tab-scope delta; unique-flatten delta; chip/sanitize
**Type:** `feature-module contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-10-16
**Army lock:** A only. B (`defaultScope(global)` only when `source === "startup"`), latch, chip/`d`/sanitize-aria, `paintChip`, `resolveWalkMode` rewrite, shared helper: out.

---

## 0. Diagnosis

**(a)** After S1 (user clears global, tabs get default, global stays empty), a late DEZPV hierarchy `LOAD_FINISHED` dispatches `{ tableName, rowCount }` with no `source`. Router `action.payload || { source: "tableData" }` never runs (payload is truthy). `runDienststelleReconcile` stamps `"sync"`. Empty global → `resolveWalkMode` `"startup"` → `defaultScope("global")`. Illegal vs S1. Once.

**(b)** Parent §6.5 already forbids that walk. The gate is live. The event is unlabeled.

Chip leftover / badge 2 / two DEZPV chips: not this wave. Sicht switch after S1 still defaults the new empty variant (contract §9/§11). That is later B, not this hole.

## 1. Closed product decisions

| # | Lock |
|---|---|
| 1 | **Subscribe stamp.** `onTableDataLoadFinished` payload is `{ tableName, rowCount, source: "tableData" }`. |
| 2 | **Router merge.** Spec Section C snippet is **copy-paste**, not a sketch. Coalesced `source` is the **last** `Object.assign` argument: `Object.assign({}, action.payload \|\| {}, { source: (action.payload && action.payload.source) \|\| (TABLE_DATA_CHANGED ? "tableData" : "sync") })`. Forbidden: **any** `Object.assign({ source: X }, payload)` — including `X` as `typeDefault` **or** as the coalesced expression. `payload.source === undefined` would wipe `X` and `runDienststelleReconcile` (`context.source \|\| "sync"`) would restore startup-default. |
| 3 | **Incoming `source` wins** when it is a non-empty string. |
| 4 | **Empty `SYNC_REQUESTED` stays `"sync"`.** Do not make empty public sync mean `tableData`. |
| 5 | **S1/S2 user OK unchanged.** Still `source: "user"` + `commitFromUser`. Tabs still default. Global still not defaulted on the user-clear path. |
| 6 | **Out.** `resolveWalkMode`; `defaultScope(global)` gate (B); latch; chip/sanitize/`paintChip`; Sicht notify; `runDienststelleReconcile` rewrite; tableData bus; Sicht/SSS subscribe; new helper; new AMD. |

## 2. Law

After a user clear (S1/S2), a later `TABLE_DATA_CHANGED` is `source: "tableData"`. `resolveWalkMode` stays `"sync"`. Observe host. Do not `defaultScope("global")`.

Boot / manual Sicht (`dienststelle/sichtChanged`, `source: "startup"` / `"user"`) still default an empty active-variant global. History / PS restore keep their own `source` and still bypass this router.

Pass/fail of this wave: DEZPV, clear **global**, OK, no Sicht click, wait ≥8s. Global **host** stays empty. `dominantScope` is not `"global"`. Chip caption, badge 2, two visible chips, leftover Gesamt on the empty global wrapper: not a fail.

## 3. Text to land

### `dienststelle.md` §11.1 S1 — add one sentence **inside** the S1 table cell (do not change the host rule; do not add a row after S1)

Live cell already ends with the unique-flatten sentence. Append:

> After S1, a later `TABLE_DATA_CHANGED` (including late hierarchy `LOAD_FINISHED`) must carry `source: "tableData"` and must not default global. Tab defaults from the user-clear path stay.

### `dienststelle-stable-default-final-clean-spec.md` §6.5 — after the existing `source: "tableData"` bullet

> The live `TABLE_DATA_CHANGED` producer and router must deliver that `source`. A truthy `{ tableName, rowCount }` payload must not drop it. `payload.source === undefined` must not wipe the type default.

## 4. Files

| File | Change |
|---|---|
| `dienststelle/effects/subscribeDienststelleTableDataChanges.js` | Add `source: "tableData"` on the existing payload object. File stays 40/150, 3 AMD. |
| `dienststelle/effects/routeDienststelleDispatch.js` | Replace dead `action.payload \|\| { source }` with `Object.assign({}, action.payload \|\| {}, { source: coalesced })`. File stays ≤150, 10 AMD, no new import. |
| `dienststelle.md` / `dienststelle-stable-default-final-clean-spec.md` | §3 text only. |

**Must not edit:** `resolveDienststelleReconcileMode.js`; `runDienststelleReconcile.js`; `reconcileDienststelleHostScopes.js`; `applyDienststelleDefault.js`; walk; Sicht subscribe; chip/view; widget bind; `KDB.js`.

## 5. Acceptance

- After DEZPV S1, no Sicht switch, ≥8s: `getAllGlobalFilterItems` `Dienststelle_DEZPV` values `[]`; `dominantScope !== "global"`.
- S1 tab defaults still applied on user OK.
- S2 tab default still applied on that tab’s user OK.
- First boot / manual Sicht still default the new variant’s global.
- Route file ≤150 lines, 10 AMD. Subscribe no extra AMD.
- No `paintChip`. No latch. No B.
