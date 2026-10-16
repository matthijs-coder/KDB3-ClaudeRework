# Contract Delta: DEZPV drillthrough tree follows query column order

> The hierarchy widget's first column is the outer node. The drill tree must use that order. Level-number sorting must not move `Dienststelle_DEZPV` behind `level001`.

---

**Status:** `Approved`
**Parent contract:** `contracts/drillthrough.md` (§5.2 tree walk)
**Supersedes:** `contracts/drillthrough-tranche1-execution-spec.md` checklist 12 `rankHierarchyRowKeys` sort, and the same sort copied into widgetVis. The tranche-1 spec stays the historical build record. This delta is the live walk rule.
**Type:** `shared service contract delta` + widgetVis tree copy
**Authoring AI:** Cursor Grok 4.7 (coordinator), 2026-10-14
**Reviewed by:** PO vastenburg, approved 2026-10-14 (chat: query column order; first filled cell is the root; level-number sort must not move `Dienststelle_DEZPV` after `level001`)
**Related rules:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`

**Implementation:** PO go 2026-10-14. Spec: `contracts/drillthrough-dezpv-column-order-execution-spec.md`.

---

## 1. Purpose

Sicht DEZPV, selected member `DS_M06|ALLE` (caption `M06|ALLE#MA 06 - Rechnungs- und Abgabenwesen Gesamt`). The Cognos widget `Dienststelle_DEZPVHierarchy` shows that member as the outer node. Nested under it: `M06|BEENDET#BEENDET - Beendeten OE(M06)`, then a specific ended org, then empty levels displayed as `(kein Wert)`.

Live drill config put `p_gruppe_drillFromGDB = M06|BEENDET`. That value is the parentless node of a tree whose parent links were built in level-number order. The query column order is the opposite.

## 2. Evidence

Query columns, left to right (PO screenshot 2026-10-14):

1. `Dienststelle_DEZPV`
2. `level001` … `level008`
3. `HideData`

On the live row, `Dienststelle_DEZPV` holds the ALLE caption (`dataId` `DS_M06|ALLE`). `level001` holds `DS_M06|BEENDET`. `level002` holds the ended org `M06|3a2_03aB3`.

Current walk (`rankHierarchyRowKeys` in `buildOrgTreeFromRows.js` and the copy in `widgetVis/effects/buildOrgTreeForDrillthrough.js`): keys matching `/level0*(\d+)/i` or `/^(\d+)$/` are sorted ascending and walked **before** keys with no level number. `Dienststelle_DEZPV` is therefore last. `level001` becomes the parentless root. The DEZPV mapper then writes that root to `p_gruppe` (`mapDezpvOrgPrompts.js`). The mapper is not the defect.

Legacy `buildDienststelleNodes` walks the flat row from index 0. It does not pull level columns forward.

## 3. Rule

Both tree builders use one walk:

| Row shape | Walk order |
|---|---|
| Array | Index `0 .. n-1` |
| Object | `Object.keys` order, as stored from the query. No re-sort. |

Parent chain stays left to right: the previous kept cell is the parent. The first kept cell has `parent: []`. Null and empty cells are skipped and do not reset the chain. A later sighting of the same caption replaces the parent only when its `levelRank` is strictly lower than the stored one.

`levelRank`:

- Key matches `/level0*(\d+)/i` or `/^(\d+)$/`: store that parsed number. BW `levelRank === 1` still means the column named `level001`.
- Any other key: store the walk index. The first column therefore has `levelRank` 0.

Do not sort level keys in front of unranked keys. `Dienststelle_DEZPV` before `level001` in the query must stay before `level001` in the walk.

The same walker serves BW and DEZPV. BW prompt rules are unchanged. Only the column order changes.

## 4. Worked example

Selection is the outer ALLE node. After this walk its `parent` is empty. `mapDezpvOrgPrompts` is unchanged and then yields:

| Prompt | Value |
|---|---|
| `p_gruppe_drillFromGDB` | `M06` |
| `p_dezpv_drillFromGDB` | `#ALLE_GG#` (`drillthrough-dezpv-top-alle-marker-contractdelta.md`; was `M06\|\|\|#ALLE_GG#`) |
| `p_dienststelle_drillFromGDB` | empty |

`M06` is `DS_M06|ALLE` after the existing level-0 normalize (strip `DS_`, strip a trailing `|ALLE`). The marker is emitted because the root itself is selected. `M06|BEENDET` is a descendant and is not the group.

## 5. Unchanged

- DEZPV and BW prompt mapping, marker eligibility, highest-wins, hash sanitize.
- Icon and datapoint both consume this tree.
- Cache-only `readRows`. No `loadTable` / `waitForRows`.
- Node identity stays the caption text. `dataId` stays the side field.
- `(kein Wert)` is not a new skip list. Empty cells are already skipped. A cell whose text is the literal `(kein Wert)` is out of scope here.

## 6. Files (when a later spec implements this)

- `KDB3/js/core/services/drillthrough/org/rankHierarchyRowKeys.js`
- `KDB3/js/core/services/drillthrough/org/buildOrgTreeFromRows.js` (only if `levelRank` for a named level column is taken from the walk index instead of the parsed level number)
- `KDB3/js/dashboard/widgets/widgetVis/effects/buildOrgTreeForDrillthrough.js`

No mapper edits. No new `_KDB` namespace, event, or public method.

## 7. Out of scope

- Rewriting `drillthrough-tranche1-execution-spec.md` in place.
- `HideData` / `rank*` column drops.
- Changing which node the DEZPV mapper treats as the group once `parent` is correct.
- BW MAG / level-0 product rules.

## 8. Acceptance

1. A DEZPV row whose first filled column is `Dienststelle_DEZPV` = `DS_M06|ALLE`, with `level001` = `DS_M06|BEENDET`, stores ALLE with `parent: []` and BEENDET as a descendant.
2. Icon drill with that selection and Sicht DEZPV yields `p_gruppe_drillFromGDB = M06`. `p_dezpv_drillFromGDB` is `#ALLE_GG#` per `drillthrough-dezpv-top-alle-marker-contractdelta.md`.
3. A BW `level001` column still has `levelRank === 1` when its key is `level001`, including when an unranked column precedes it.
4. WidgetVis `spec.orgTree` and the service fallback (`spec.orgTree` omitted) follow the same order.

## 9. Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-10-14 | `Approved` | PO vastenburg | Chat: query column order; first filled cell is the root; no level-number sort that places `Dienststelle_DEZPV` after `level001`. Code not started. |
| 2026-10-14 | `Approved` (go) | PO vastenburg | Chat: "ok. go". Spec `drillthrough-dezpv-column-order-execution-spec.md`. |
| 2026-10-14 | Code reviewed | coordinator | Walk is `Object.keys` order in both builders. Live drill not yet rechecked. |
