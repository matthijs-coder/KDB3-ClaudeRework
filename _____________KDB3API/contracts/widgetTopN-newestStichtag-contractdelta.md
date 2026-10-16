# Contract Delta: `widgetTopN` NewestStichtag period pin

> Delta on top of `contracts/widgetTopN.md` §8.1.1 and the live `widgetVis` TopN gate (`topNGate` + `resolveTopNJahrFilterValue`).
> Product locked 2026-09-01 (PO): last month of the selected Jahr period; leftover List vis-title `NewestStichtag`; Pad B month map `01→JAN`. Stamped `Approved-for-implementation` after army contract-vs-code (no Type A).

---

**Status:** `Approved-for-implementation`
**Parent contract:** `contracts/widgetTopN.md`
**Also amends:** `contracts/widgetVis.md` `widgetVis/applyTopNChoice` / `resolveRequested` payload (live already sends `jahrFilterValue`; this names it)
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-01
**Reviewed by:** Implementing captain (Cursor Grok 4.6) after army contract-vs-code 2026-09-01; PO product lock 2026-09-01 (Pad B + vis-title `NewestStichtag`)

---

## 1. Purpose

TopN helper ranking must pin a **year and a month that have cube data**, not a Jahr member alone.

**Live (broken grain):** helper `widgetFilter` = `AggregationstypId: Monatsdurchschnitt` + optional Jahr include. No Monat. Empty global Jahr → `tableData.waitForRows([{ tableName: "year" }])` → lexicographic max `d` (live **2026**). Explicit **2026** is the same year-grain. Incomplete year + month-average without a month member → `WIDGET_TOPN_RESULT_EMPTY`. Explicit **2025** works as a **year average**, not December.

**This delta:** Cognos leftover List **`NewestStichtag`** (kennzahl in the query so unused DEZ does not win) returns one caption string `YYYYMM…` (e.g. `202607…` / `202512…`). KDB parses that string, maps month digits to TM1 **display captions**, and sets helper includes for **Jahr and Monat**. Monat stays a **filter**, never a `grid_cols` column.

**Supersedes** `contracts/futureTodo/futureTodoNew(23.08.2026)/jahr-filter-huidig-jaar-of-lege-selectie.md` (calendar-year default). That ticket does not fix explicit incomplete 2026.

---

## 2. Period pin (NewestStichtag)

### 2.1 Cognos leftover (PO already authored)

- Visualization title **exact** `NewestStichtag` (visApi `getTitle()`, not HTML `table-name`).
- List, live, leftover (no KDB settings chrome).
- Follows the **global Jahr** page context: empty or 2026 → `202607…` when data exists through July 2026; Jahr 2025 → `202512…`.
- One row. Caption/`d` starts with six digits `YYYYMM`; remainder (kennzahl) is ignored.
- PO does **not** change helper-List data items, Monat Code levels, or KDB `__savedProperties` / `loadingTablesPropId`.

### 2.2 `tables.js`

| Field | Value |
|---|---|
| Config key / caller `tableName` | `newestStichtag` |
| `name` (Cognos vis-title) | `NewestStichtag` |
| `role` | `newest_stichtag` |
| `load` | `false` (Jahr-dependent; boot cache would lie) |

State key (service-owned only): `_KDB.state.tableData.newestStichtag`. Live lookup is **config-key**, not vis-title (`year` / `Jahr` pattern). Contract `tableDataService.md` Q3 is stale on that point; this delta follows **live** handle-based keys.

Existing `year` / `Jahr` entry: **leave**. TopN must **not** use it after this delta.

### 2.3 tableData API (mandatory)

`NewestStichtag` **changes with Jahr**. Live `waitForRows` returns cache when `lifecycle === "ready"`. Live has **no** `markTableStale`. `ensureFreshRows` is therefore also cache after boot. `readRows` never loads.

Per TopN resolve, `widgetVis` must call:

```js
_KDB.services.tableData.reloadTable([{
  tableName: "newestStichtag",
  shape: "row",
  pick: _KDB.config.visualizations.topNHelper.resultPick
  /* ["display","use","d","u","value","v","label","caption"] */
}])
```

Live leftover column is the kennzahl-trick data item (dump: `NewestStichtagTrick`). Mapping pick `[{ display: "d" }, { use: "u" }]` copies **own-key `d`/`u` only** and yields `{}` when Cognos puts YYYYMM on `label` / `caption` / `value` / `v` (no member `d`). Do not use that mapping pick.

Parse the **first column** YYYYMM from, in order: `d`, `label`, `caption`, `value`, `v`. **Never** `u`, `use`, or aliased `display` (string pick `"display"` falls through to `u`). Stringify numbers (`202607.71374` still matches `/^\d{6}/` as `202607`). Remainder after six digits is the kennzahl trick and is ignored.

Forbidden: `_KDB.state.tableData.*` reads/writes from `widgetVis` / `widgetTopN`. Use `_KDB.services.tableData` only (`reloadTable`, `readTableState`). Foreign-write rule unchanged. Leftover is **not** a `widgetBindingPlan` / `widgetBindingApply` target (those bind the claimed helper / visible vis).

`NewestStichtag` follows the global Jahr page context in Cognos. `reloadTable` re-reads the leftover’s **current** query result; it does not re-run the leftover. After Jahr changes, that result can still be the previous period (PO 2026-09-01: Jahr=`2025` still `{ value: 202607.71374, v: 202607.71374 }`).

Per TopN resolve, `widgetVis` must (helper `renderWidget` then `reloadTable` idea; leftover has no claimed id):

1. `reloadTable([{ tableName: "newestStichtag", shape: "row", pick }])` — discover; commits `widgetId` inside tableDataService.
2. `readTableState([{ tableName: "newestStichtag" }])` — one-item array unwraps to the entry object; take `widgetId`. Never `_KDB.state.tableData`.
3. Stamped `widgetsFacet.renderWidget(widgetId)` (`widgetVis` `readWidgetsFacet.js`). No `_KDB.cognosAPI`.
4. `reloadTable` again with the **same** `{ tableName: "newestStichtag", … }` input (do not switch to `{ widgetId }` — that remaps the tableData key).
5. Parse **only** that post-render reload’s rows.

Do not invent `getWidgetId` / export `resolveTableWidgetId`. Do not use `waitForRows` / `ensureFreshRows` / `readRows`. If `widgetId` or render/`ok` is missing, fail `WIDGET_TOPN_STICHTAG_UNAVAILABLE`.

v1 `reloadTable`-only is **superseded** by discover → `renderWidget` → one post-render `reloadTable` (helper idea). Do not add a Jahr-match poll; PO 2026-09-02: reload manner stays.

### 2.4 Parse and map (Pad B — locked)

Parse first six characters of the display string with `/^\d{6}/`. Year = chars 1–4 (caption `"2026"`). Month digits = chars 5–6.

Map **only** these TM1 **display** captions (same members as `sorting.js` `MONTH_*`, not `01`–`12`):

```txt
01 JAN  02 FEB  03 MRZ  04 APR  05 MAI  06 JUN
07 JUL  08 AUG  09 SEP  10 OKT  11 NOV  12 DEZ
```

Store the map in `_KDB.config` (prefer `topNHelper.js` or a sibling config module registered from `__orchestratorConfig`). **Do not** invert `drillthrough/config/monthLabels.js` (opposite direction, lowercase, lossy).

Cognos local include is `type: "display"`. Monat include must be `"JUL"`, never `"07"`. Jahr include `"2026"` is enough (`d` caption). `{ d, u }` with those captions is also fine.

**Pad A rejected:** no Monat Code/ID itemId exists in live config or `__savedProperties`. Do not put Monat (caption or code) in helper `grid_cols`.

### 2.5 Failure

If reload fails, the widget is missing, the string does not match `/^\d{6}/`, or the month digits are not in the map: **do not** fall back to `waitForRows` / table `year` / calendar year. Fail the current TopN resolve with a documented error (new code e.g. `WIDGET_TOPN_STICHTAG_UNAVAILABLE` or reuse `WIDGET_TOPN_INVALID_REQUEST` with a clear message). Same terminal `widgetVis/topNResolved` `status:"error"` discipline as other helper failures.

---

## 3. Helper `widgetFilter` (still no Monat column)

Replace parent §8.1.1 sentence “Jahr include when available from current context/cache” with:

Helper `widgetFilter` carries:

1. `AggregationstypId: { include: ["Stichtag"] }` (PO 2026-09-02: same include key as before, value `Stichtag` not `Monatsdurchschnitt`; not visible-vis `kennzahlDefaults`).
2. Jahr include on `jahrColumnId` `[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]` when the period pin has a year caption.
3. Monat include on `[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]` (`Monat_widget_localfilter_KID` / literal TM1 id) when the period pin has a mapped caption.

`grid_cols` stays `[topNItemId, valueColumnId]` (live already omits `jahrColumnId` from slots). **No Monat column.** `dimensionSelectionAffects: "disabled"` unchanged.

---

## 4. Ownership and payload

`widgetVis` owns period-pin resolution (today: `topNGate` → `resolveTopNJahrFilterValue`). It must resolve NewestStichtag **before** `widgetTopN/resolveRequested` and pass both values. `widgetTopN` applies includes; it does not call tableData for `newestStichtag`.

Live `topNGate` already sends extra-contractual `jahrFilterValue`. This delta makes it canonical and adds Monat:

```js
payload: {
  /* existing resolveRequested fields */
  jahrFilterValue: { d: "2026", u: "2026" } | "2026",
  monatFilterValue: { d: "JUL", u: "JUL" } | "JUL"
}
```

`validateResolveRequest` may keep `yearFilterValue` as a read alias (F5 hygiene — not this feature). New code must write `jahrFilterValue` / `monatFilterValue` only.

---

## 5. Golden vectors

Assume cube data through **July 2026**. Leftover follows global Jahr. Helper aggregation pin is `Stichtag`. Visible vis grain unchanged (Line Stichtag, pie `allOther`, etc.).

| # | Global Jahr | NewestStichtag `d` | Helper Jahr include | Helper Monat include |
|---|---|---|---|---|
| 1 | empty (`data: []`) | `202607…` | `2026` | `JUL` |
| 2 | `2026` | `202607…` | `2026` | `JUL` |
| 3 | `2025` | `202512…` | `2025` | `DEZ` |
| 4 | leftover missing / bad parse | — | none; resolve **errors** (no year-table fallback) | none |

---

## 6. Out of scope

- Changing leftover List authoring / page-filter wiring (Cognos).
- VisType-split (max complete year vs max month) or a second leftover table.
- Monat Code data item on helper Lists (Pad A).
- Putting Monat/Jahr in helper `grid_cols` / changing `extractTopNResult`.
- Drillthrough year/month (`waitForRows("year")` remains forbidden there).
- Deleting `tables.js` `year` / leftover `Jahr`.
- F5 alias cleanup as a required slice (may ride along if the same files are open).
- Calendar-year default from the 23.08 futureTodo.
- `loadingTablesPropId` / `_KDB.properties.loadingTablesPropObj`.
- Direct `_KDB.cognosAPI` from features (`cognos-adapter.mdc`).
- Title-aggregation sibling delta.

---

## 7. Files (implementation allowlist)

| Path | Change |
|---|---|
| `KDB3/js/core/config/tables.js` | Add `newestStichtag` entry §2.2 |
| `KDB3/js/core/config/visualizations/topNHelper.js` | Point period source at `newestStichtag`; `monatColumnId`; month-code map (or sibling config + orchestrator) |
| `KDB3/js/core/config/__orchestratorConfig.js` | Only if a new config module is registered |
| `KDB3/js/dashboard/widgets/widgetVis/effects/resolveTopNJahrFilterValue.js` | Parse/map YYYYMM; import sibling for I/O. Keep `topNGate` import. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/reloadNewestStichtagPeriodPin.js` | **New.** Discover `reloadTable` → `readTableState.widgetId` → stamped `renderWidget` → second `reloadTable`. Hard 150. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/gates/topNGate.js` | Pass `monatFilterValue` |
| `KDB3/js/dashboard/widgets/widgetTopN/actions/validateResolveRequest.js` | Accept `monatFilterValue` |
| `KDB3/js/dashboard/widgets/widgetTopN/effects/buildHelperBindingSpec.js` | Monat include beside Jahr; still no Monat slot |
| `contracts/widgetTopN.md` §8.1.1 + approval log | Parent sync after stamp |
| `contracts/widgetVis.md` resolveRequested payload | Parent sync after stamp |
| This file | Stamp status + approval log |

Planner may add **one** new effects file (period pin) if the Jahr resolver would exceed 150 lines. No other JS.

---

## 8. Do not (implementing agents)

- `waitForRows` / `ensureFreshRows` / `readRows` as the NewestStichtag source after Jahr can change.
- Fall back to table `year` on miss.
- `include: ["07"]` on `[Monat]`.
- Monat or Jahr as helper slot columns.
- Invert `monthLabels.js`.
- Touch `bindingSpecs.js`, kennzahlDefaults, drillthrough, extract/claim/cleanup except payload plumbing.
- Edit `.cursor/rules/` or `__savedProperties` unless PO asks.
- Commit unless PO asks.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-01 | Product lock Pad B + vis-title `NewestStichtag` | PO (vastenburg) | Kennzahl leftover; KDB maps `01→JAN`; no Cognos helper-List / property changes |
| 2026-09-01 | `Draft` written | Coordinator | 10/10 live facts re-verified; no JS |
| 2026-09-01 | `Approved-for-implementation` | Implementing captain (Grok 4.6); PO product lock already in prompt | Army contract-vs-code CLEAN (no Type A). Year-grain + absent pin = expected pre-impl. v1 `reloadTable`-only (no public leftoverId). Parent §8.1.1 + `widgetVis` payload synced. Then JS. |
| 2026-09-01 | §2.3 pick/parse patch | Implementing captain (Grok 4.6); PO live dump | Leftover found (`NewestStichtag` List). `rows[0].NewestStichtagTrick === {}` after `{display:d,use:u}` pick. Parse `d→label→caption→value→v`; never `u`. Pick = helper `resultPick`. |
| 2026-09-01 | §2.3 host-lag path | Implementing captain (Grok 4.6); PO Jahr=2025 still `value: 202607.71374` | v1 reload-only superseded. Discover reload → `readTableState.widgetId` → `widgetsFacet.renderWidget` → second `reloadTable`. Parse second rows only. No `_KDB.state.tableData`. No bindingPlan on leftover. |
| 2026-09-02 | §2.3 poll until leftover YYYY matches global Jahr | Implementing captain (Grok 4.6); PO dump `itemCount>0` stale `202607` while global `2025` | Do not change `waitForQueryResult`. Freshness-only Jahr read. Timeout → STICHTAG_UNAVAILABLE. |
| 2026-09-02 | Poll cancelled; helper aggregation → `Stichtag` | PO (vastenburg) | Reload manner stays. Missed pin: `Monatsdurchschnitt` → `Stichtag`. Jahr value from leftover; Monat include already present. |
| 2026-09-02 | Slice complete (JS freeze) | Implementing captain (Grok 4.6); army dual review CONFIRM STOP | 0 MUST. No poll, no year-table delete, no Monat slot, no F5 alias, no commit. Remaining: PO F5 smoke TopN 1 Line+dimensie, Jahr leeg / 2026 / 2025. |
