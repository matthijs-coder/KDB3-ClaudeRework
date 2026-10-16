# Contract Delta: writeback T2 item 2 — close (no restore WP)

> Closes T2 pick-list item 2 (`tbl` / `topn` kinds, widget-localFilters,
> launchpad-only) as **product classification**, not as schema+restore.
> Parent `writeback.md` stays authoritative after the §4.5 / §4.6 / §11
> patches in this delta.

---

**Status:** `Approved` (PO vastenburg, 2026-08-16)
**Parent:** `contracts/writeback.md` §4.5, §4.6, §4.6.1, §7, §11 decisions 2 and 6
**Depends on:** `widgetBase-parameterSetRestore-contractdelta.md` §5,
`widgetSettings-parameterSetRestore-contractdelta.md` (vis `type` / `topn`),
`widgetVis-parameterSetRestore-contractdelta.md` (step-27 bind),
`widgetDataTable.md` (stub), `widgetTopN.md`, `writeback-v2Map-contractdelta.md` §6
**Type:** `shared-service contract delta`
**Authoring AI:** planner (Grok 4.6), 2026-08-16
**Related:** `contracts/futureTodo/t2-parameterSet-gaps-launch-prompt.md` item 2

---

## 1. Purpose

Do **not** add v3 field specs or owner restore for `"tbl"`, kind `"topn"`,
compact `localFilters`, or launchpad-only widgets. Record PO product facts
so T2 does not treat those leftovers as missing glue.

No production JS in this WP. Optional GET skip-diagnostics stay out unless
PO names them as a later WP.

---

## 2. PO decisions (2026-08-16)

| Slice | Decision |
|---|---|
| **C** compact `localFilters` | **Derived-only.** Not a v3 widget key. BindingPlan rebuilds Cognos local filters after restore from `code` / `type` / `dim` / `topn` / empty-vis. Do not persist `[[filterKey, values]]`. |
| **A** kind `"tbl"` | **Skip-by-design** until a real `widgetDataTable` tranche. Cognos List/datatable shells park to launchpad on startup (`dataTables` / TopN helper). Not canvas product. |
| **vis type `"list"`** | **Already vis restore.** `wgts[].kind === "vis"` + `type: "list"` (bucket `"List"`). Same GET/SET path as bar/line. Not `"tbl"`. |
| **B** kind `"topn"` helpers | **Skip-by-design.** Runtime `kind: "topN"` + `role: "topNHelper"`. Distinct from vis key `wgts[].topn` (`topNChoice`, already live). |
| **D** launchpad-only | **Skip-by-design** (unchanged). Claim pool for canvas `wgts`; not first-class restore. Shell-create stays deferred backlog §7. |

Closes parent open decisions **2** and **6**. Does not close 3–5 or 7.

---

## 3. Two names that must not merge

| Token | Meaning | v3 |
|---|---|---|
| vis `type: "list"` | user-placed visualization, dropdown List | `kind: "vis"` — required parity |
| vis `topn` | semantic TopN choice on a vis | optional vis key — live |
| kind `"tbl"` | Cognos List **shell** / `widgetDataTable` / pad `dataTables` | not in `wgts`; skip |
| kind `"topn"` | TopN **helper** shell / pad `topN` | not in `wgts`; skip |

`widgetDataTable` stays a stub. This delta does not start that tranche.

---

## 4. Schema / GET / MAP / SET (normative after parent patch)

### 4.1 `localFilters`

- Not in `WIDGET_FIELDS`. Unknown widget key → `WRITEBACK_INVALID_V3_PAYLOAD`.
- GET does not collect Cognos widget local filters.
- Step 27 `widgetVis` bind remains the restore of those filters (derived).
- v2 map: omit + `WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED` (already live).
- Compact shape in parent §4.5 stays **documentation of a rejected persist
  form**, not a future-on-by-default schema.

### 4.2 `"tbl"` / kind `"topn"` / launchpad-only

GET omits: `placement !== "onCanvas"`, frame `kind` not vis/text,
`role === "topNHelper"`, host `kdb3widget`. Classification: **skipped by
design**. Silent omit is accepted leftover (same class as
`HOST_ITEM_UNKNOWN` silencing). Emitting `WRITEBACK_SKIPPED_BY_DESIGN` on
GET is **not** this WP.

v2 map: datatable / topN / table → omit + `WRITEBACK_WIDGET_KIND_UNSUPPORTED`
(already live). Launchpad-only / missing tab index → omit +
`WRITEBACK_SKIPPED_BY_DESIGN` (already live).

SET: `wgts` vis/txt only. If a payload still carries `kind: "tbl"` or
`"topn"`, `validateV3` emits `WRITEBACK_WIDGET_KIND_UNSUPPORTED` (tolerant,
outcome degraded at best) and widgetBase skips the entry. No claim, no
`contentCreate`, no `WIDGET_FIELDS.tbl` / `.topn`.

### 4.3 vis type list

No schema change. `type: "list"` is a visType key; restore commits it like
any other `type`. Binding uses bucket `"List"`.

---

## 5. Parent patches (this WP)

Apply to `writeback.md` when this delta is approved. Wording must **not**
require GET to emit a diagnostic (that would be production JS; forbidden here).

- §4.5: vis type `"list"` is vis; `"tbl"` / helper `"topn"` skip-by-design
  (GET omit, no restore). Rewrite “localFilters must not be silently dropped”
  and the compact shape “when supported”: derived-only; compact form is a
  **rejected persist**, not a future-on-by-default schema.
- §4.6: `"tbl"` and helper `"topn"` → skipped by design (GET omit; SET skip
  if present in `wgts`). vis type `"list"` stays in the `"vis"` required row.
  `localFilters` → derived-only; v2 map omit +
  `WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED`; GET does not collect; exclude
  from parity.
- §4.6.1: **remove** `localFilters`, `"tbl"`, and `"topn"` from
  “diagnostic-required unsupported” (`get/map emits`). Put `"tbl"` / helper
  `"topn"` / launchpad-only in skipped-by-design with an explicit **GET
  silent-omit carve-out** (accepted leftover; optional later WP may emit
  `WRITEBACK_SKIPPED_BY_DESIGN`). `localFilters` is not a skipped widget; it
  is map-only diagnostic + derived restore.
- §4.7 unsupported fixture: a v3 widget **with** `localFilters` fails
  validate (`WRITEBACK_INVALID_V3_PAYLOAD`); `"tbl"`/`"topn"` entries still
  validate with tolerant `KIND_UNSUPPORTED`. Do not require GET to produce
  those kinds.
- §7: legacy localFilters / datatable / topN bullets match §4. Do not retarget
  v2 map codes this WP (`KIND_UNSUPPORTED` for v2 datatable/topN stays).
- §11.2 and §11.6: CLOSED 2026-08-16, pointer to this delta.
- `widgetBase-parameterSetRestore-contractdelta.md` §5: skip class; 
  `KIND_UNSUPPORTED` only if those kinds appear in `wgts`.
- `writeback-v2Map-contractdelta.md` §8: T2 item 2 is this close, not a
  future restore WP. Map §6 rows unchanged.

Do not add `_KDB.*`. Do not edit `.mdc`. Do not add owner restore deltas for
`widgetDataTable` / `widgetTopN`.

---

## 6. Out of scope

- Production JS (GET diagnostic emit, map code retarget, validate changes)
- `widgetDataTable` product / first-class grid
- Persisting helper occupancy or launchpad pad inventory
- Host-item / shell-create (deferred backlog §7)
- T2 items 3–5, T0/T1, T3 folder regroup, WP5, canvas-discovery
- Flattening NMS dest-skip; `sichtChange`; `head.icon`

---

## 7. Acceptance

1. Parent §11 decisions 2 and 6 are closed with this delta’s table.
2. `set(get())` vis with `type: "list"` remains required vis parity.
3. No new `wgts[].kind` values in GET.
4. No compact `localFilters` on GET or SET v3.
5. Cognos not required for this WP (no host behaviour change).

---

## 8. As-built leftover (honest, not this WP)

GET skip of launchpad / datatable / topNHelper is **silent** (no
`WRITEBACK_SKIPPED_BY_DESIGN`). Parent §4.6.1 records that silent omit as
an accepted leftover. Aligning GET emit is a later optional WP, not
item-2 restore.
