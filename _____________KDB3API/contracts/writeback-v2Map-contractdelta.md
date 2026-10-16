# Contract Delta: `writebackMap` v2 → v3

> Promotes `writeback.md` Fase 2 MAP from skeleton to implementation.
> Parent §2.3 / §5 / §7 stay authoritative; this delta closes the live gap
> (`toV3` throws `WRITEBACK_UNSUPPORTED_LEGACY_FORMAT` for v2) and the
> §4.7 “legacy global kale → pcfs without `tab` (map later)” note.

---

**Status:** `Implemented — same-package Cognos green 2026-09-03` (PO vastenburg; A1 name-match). Cross-package / **old vs new package parameter-set** still open: `contracts/futureTodo/writeback-v2Map-old-vs-new-package-parameterset-2026-09-03.md`. Do **not** mark `Approved — Cognos green` until that A3 pass.
**Parent:** `contracts/writeback.md` §1 `map/`, §2.3, §2.4, §3, §5, §7, §9 MAP bullet, §10 Fase 2
**Depends on:** `nativeMultiSelect.md` (`filt.pcfs` global + page), `pageContextPlain-parameterSetRestore-contractdelta.md` §7, `dienststelle-parameterSetRestore-contractdelta.md` (BW labels), `header-parameterSetRestore-contractdelta.md` (`head.icon` invalid)
**Type:** `shared-service contract delta`
**Authoring AI:** planner, 2026-08-16; A1 recast planner 2026-09-03
**Related:** T2 item 1 of `contracts/futureTodo/t2-parameterSet-gaps-launch-prompt.md`; sibling `writeback-mapping-package-mismatch-contractdelta.md` (A2, SET `pkg` fail — not Map)
**Amendment:** 2026-09-03 — same-package **subset** gate; emit `alternativeDatasource_name_KID` on the remap path; MAG/level use-KID is **not** a must; parent §9 “metric slots and widget datasource” withdrawn for Map persist.

---

## 1. Purpose

`_KDB.services.writebackMap.toV3(raw, options?)` maps a detected **v2** KDB2
writeback payload to compact validated v3. The Cognos bridge already calls
this for `format === "v2"` then `writebackSet.restore`. After this WP that
path must succeed for supported v2 fields instead of throwing.

Map is still the only legacy entry point. `writebackSet` still must not import
or call `writebackMap`.

---

## 2. Public API (unchanged return)

```js
_KDB.services.writebackMap.toV3(raw, options?) -> V3ParameterSet
```

- Named-method service. `destroy()` remains. No `dispatch` / `getState`.
- `options.diagnostics` (optional array): mapping diagnostics are **pushed**
  here (`phase: "map"`), same out-param pattern as `normalizeV3`.
- Return remains a v3 object, not `{ v3, diagnostics }`.
- Bridge (`cognosWritebackBridge.bridgeSet`): allocate `diagnostics = []`,
  pass it into `toV3`, then prepend those entries onto `RestoreResult.diagnostics`
  after restore. Soft mapping skips do not abort restore.

Hard throw (`WritebackError`) stays for: disposed; v0/v1/unknown;
`WRITEBACK_MAPPING_CONFIG_MISSING`; `WRITEBACK_INVALID_V3_PAYLOAD` when the
mapped object fails `validateV3`.

Already-v3 input: keep today’s defensive `normalizeV3` → `validateV3` path.

---

## 3. Purity

Map must not mutate `_KDB.state`, Cognos, tabs, widgets, filters, or history.

Allowed reads:

- `core/config/mapping/kidIndex.js` `getParameterMappingIndex` /
  `findMissingRequiredKeys` / `resolveRuntimePackageKey` (index built once
  from frozen `parameterMap.js`; `_KDB` signature kept, source is not
  `_KDB.properties`);
- `_KDB.properties.filterPropObj` (read-only classify; do **not** import
  `classifyFilterInstance.js` or filterDock/NMS internals);
- `core/config/mapping/bwOldToNewMap.js` (filled from KDB2
  `mapOldBwToIdHelper`; null values omitted).

---

## 4. Pipeline

```txt
detectSourceFormat (existing)
  → v2: mapV2ToV3 (adapters) → normalizeV3 → validateV3 → V3ParameterSet
  → v3: normalizeV3 → validateV3
  → v0v1 | unknown: throw WRITEBACK_UNSUPPORTED_LEGACY_FORMAT
```

`pkg` on the result is the **current runtime** package key, not a Cognos id.

**Same-package fast path** (legacy: skip KID rewrite when saved
`datasource_name_KID` equals runtime). In KDB3 this still **emits v3**.
Fast path = skip cross-package KID rewrite of `u` / item ids. Section mappers
+ normalize + validate always run.

**Same-package detection (supersedes the 2026-08-16 “first GFO key” sentence):**
same-package iff **every** `globalFiltersObj` top-level key is in the
non-empty set `{ package.datasourceName, package.alternativeDatasourceName }`
from `kidIndex.getParameterMappingIndex()` (today: `Personal_KDB` and
`Personal_Berechtigung_Dienststelle_KDB`). Empty GFO → not same-package
(remap still runs). A **third** table name → cross-package remap (duplicate
`pcfs` `nm` or stolen `*_filter_use_KID` may abort SET — §10 item 9).

**Do not** OR-match **only** the first GFO key against the alt table. That
false-skips a real old main cube when alt is first and a foreign second
table remains.

**Cross-package:** build a source KID map from the payload (legacy
`buildParameterSetMapping` concept, as a `map/` helper — not `_KDB.utils`)
and a target index from `getParameterMappingIndex`. Unknown tokens →
`WRITEBACK_MAPPING_TOKEN_UNRESOLVED` diagnostic, continue. Missing required
keys (`parameterMapping.REQUIRED_KEYS`) → throw `WRITEBACK_MAPPING_CONFIG_MISSING`.

Source map **must** emit `datasource_name_KID` and, when that table is
present in GFO, `alternativeDatasource_name_KID` (legacy STEP 0 dual bind).
**Never** bind the first GFO key alone to `datasource_name_KID` when the
first key is the alt cube — `deUniversalize` last-key-wins would collapse
both buckets onto `Personal_KDB` and drop Sicht/Dienststelle before classify.

Kale member MDX still remaps via `{label}_filter_use_KID` from
`valuesArray` `.u`/`.use` (unchanged). Alt-table KIDs do not replace that walk.

**Not a must (do not treat as A1 functional scope):** MAG/level
`Dienststelle_*_filter_use_KID` emission. v3 `filt.dstl` persist is `.d` /
semantic MAG ids (`extractV2FilterValues` + restore `bwOldToNewMap`). Optional
later sibling file only if unresolved `***Dienststelle_filter_use_KID***`
noise must die; never mint `Dienststelle_filter_use_KID` (not in
`parameterMap.js`); never DEZPV use-KID (no target key).

**Do not** add slots / `widget_datasource_*` / `*_widget_localfilter_KID` /
`kennzahlenTable_KID` to the **source** map. Those keys stay on frozen
`parameterMap.js` / `REQUIRED_KEYS` for **runtime BindingPlan**. v3 widgets
store `code`/`dim`/`type`/`topn` only.

Cognos IDs (`dataSource`, `sourceId`, `itemId`, `slot`) are mapping inputs
only. They must not appear in v3.

---

## 5. v2 filter classify (name + `filterPropObj`, no host)

Walk `globalFiltersObj[*][*]` and each `tabs[index].pageContextFilterObjArr`
entry. Identity for classify is `name` / `itemName` (case-insensitive).
Do not persist Cognos `itemId` / `sourceId`.

| Order | Match | v3 |
|---|---|---|
| 1 | name `sicht` | `filt.sicht` = first value `.d` |
| 2 | Dienststelle / `Dienststelle_BW` / `Dienststelle_DEZPV` / hierarchy | `filt.dstl` (`key`, `glob`, `byTab`) |
| 3 | `filterPropObj` `isSingleSelect` and not 1–2 | `filt.sels[]` `{ key, tab?, vals }` (`vals` = `.d` use values; `tab` omitted = global) |
| 4 | `isNative`, or leftover unowned multi `{ d, u }` (not hierarchy) | `filt.pcfs[]` `{ nm, tab?, vals: [{ d, u }] }` — **page** `tab: <tabIdx>`; **global kale omits `tab`** |
| 5 | else (special/multi outside sels/pcfs, T2 item 3) | omit + `WRITEBACK_FILTER_KIND_UNSUPPORTED` |

Kale must not land in `sels`. Jahr (`isNative`) is pcfs, not sels.

Empty `vals` → omit that entry (GET already omits empty pcfs).

BW old labels: remap through `core/config/mapping/bwOldToNewMap.js` when a
pair exists; unmapped labels stay on the v3 payload +
`WRITEBACK_DIENSTSTELLE_BW_LABEL_UNMAPPED`. The map is filled from the KDB2
helper (mapping SSOT WP); keys whose legacy value was `null` are omitted.

---

## 6. Other §7 fields (this WP)

| v2 | v3 | Soft skip |
|---|---|---|
| `canvas` / `configuration.dashboardWidth/Height` | `canv` / `sett.dash` (canvas wins if both) | `"1800px"` → number during map |
| other `configuration.*` settings | `sett` catalog only (`v3Defaults`) | unknown config keys omitted, no throw |
| `topHeader` `turnedOn` / `text` / `icon` | `head.on` / `title` / `sub` / `subOn` / `icon` | empty `icon` silent omit; stem copied (T2 item 4) |
| `bottomFooter.turnedOn` | `foot.on` | |
| `tabs[*].name` / `visible` | `tabs[]` `{ name, hide? }` (array by numeric index) | |
| `widgets[*]` `visualization` | `wgts[]` `kind: "vis"` (`code`, `type`, `dim`, `topn`, layout, colours) | |
| `widgets[*]` text/comment | `kind: "txt"` | header-draggable / host / writebackTable → `WRITEBACK_SKIPPED_BY_DESIGN` |
| `widgetType` dataTable / topN | — | omit + `WRITEBACK_WIDGET_KIND_UNSUPPORTED` (T2 item 2) |
| `localFilters` | — | omit + `WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED` (T2 item 2) |
| launchpad-only / no tab index | — | omit + `WRITEBACK_SKIPPED_BY_DESIGN` |
| `sequence` / `sequences` | drop | no diagnostic |
| `selectedOptions.dimension/visType/topNChoice` | `dim` / `type` / `topn` | |

Soft skip = omit field/entry, push diagnostic, **continue**. Mapped remainder
must still `validateV3`.

---

## 7. Folder (fill the empty `map/adapters/` in parent §1)

Service layout. No `helpers/` `shared/` `common/`. Verb+noun files. JS ≤150,
this service factory stays a thin named-method controller (≤60 in `toV3`).
≤10 AMD imports per file.

```txt
core/services/writeback/map/
  createWritebackMapService.js    // detect, route v2/v3, terminal pipeline, destroy
  adapters/
    mapV2ToV3.js                  // section order + pkg + fast/cross-package gate
    mapV2CanvasSettings.js
    mapV2HeaderFooter.js
    mapV2Filters.js
    mapV2FilterEntries.js         // split for ≤150
    extractV2FilterValues.js
    classifyV2FilterItem.js
    mapV2Tabs.js
    mapV2Widgets.js
    mapV2WidgetEntry.js
    mapV2VisWidget.js
    mapV2TxtWidget.js
    parseV2WidgetLayout.js
    buildV2SourceMapping.js       // payload → source KID map (cross-package)
    remapV2KidTokens.js           // source → target; no-op on same-package
    universalizeV2KidTree.js
    deUniversalizeV2KidTree.js
```

As-built v2 field names (KDB2 GET, not KDB3 owner names): vis type is `visualType`; layout is `style.left/top/width/height`; topN is `selectedOptions.topN` (not `topNChoice`); text body is `widgetTitle`; header `text` → `head.title` only.

Do not add `_KDB.services.writebackMap` extra methods. Do not add `_KDB.utils.*`
for this. Do not add `_KDB.services.tabMutation`. Do not edit `.mdc`.

---

## 8. Out of scope (explicit)

- v0/v1 adapters (still `WRITEBACK_UNSUPPORTED_LEGACY_FORMAT` until DWH samples)
- T2 item 2: closed 2026-08-16 as product classification
  (`writeback-t2-item2-contractdelta.md`), not a future restore WP. Map §6
  rows for `widgetType` dataTable/topN (`WRITEBACK_WIDGET_KIND_UNSUPPORTED`)
  and `localFilters` (`WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED`) stay
  unchanged.
- T2 item 3: closed 2026-08-16 as product classification
  (`writeback-t2-item3-contractdelta.md`), not a future restore WP. Map §5
  row 5 (`WRITEBACK_FILTER_KIND_UNSUPPORTED`) stays unchanged.
- T2 item 4: `head.icon` persist — see `writeback-t2-item4-contractdelta.md` (map copies stem; owner restore is that WP)
- T2 item 5: writeback barriers / `sichtChange`
- Host-item create; flattening NMS dest-skip; WP5 seed/restore merge
- T0/T1 history files; T3 folder regroup; canvas-discovery
- Changing `writebackSet` restore phases or GET collectors except the bridge
  diagnostic prepend in §2
- SET `pkg` vs runtime (`writeback-mapping-package-mismatch-contractdelta.md`)
- v2 singleSelect `.d` vs Cognos `.u` extract (pre-existing; not this WP)
- MAG/level use-KID emission as a persist must
- Remapping widget slots / datasource ids / localFilters into v3

---

## 9. Parent as-built after GO + code (do not edit parent until then)

- §1 `map/adapters/`: list the files in §7.
- §4.7 `filt.pcfs` sentinel: drop “(map later)”; global kale without `tab` is
  this WP.
- §10 Fase 2: v2 adapter implemented; v0/v1 still sample-gated.
- `nativeMultiSelect.md` out-of-scope: remove `writebackMap` for **mapping**
  only (GET/SET owners unchanged).
- Parent `writeback.md` ~1428 MAP acceptance: **withdraw** “metric slots and
  widget datasource” as Map persist. Replace with: cross-package Map resolves
  KID-based **filter item keys**, **kale `u` uniqueName bases**, and **GFO
  table keys** (`datasource_name_KID` + `alternativeDatasource_name_KID`).
  Widget datasource / vis slots remain **runtime** `parameterMap.js` /
  BindingPlan. Do not shrink `REQUIRED_KEYS`.

---

## 10. Acceptance (Cognos, after implement GO)

1. v3 `set(get())` unchanged (map is a no-op pass-through on v3).
2. A real KDB2 v2 payload (Sicht, Dienststelle, at least one SS, one kale page
   filter, two tabs, one vis + one txt) maps without
   `WRITEBACK_UNSUPPORTED_LEGACY_FORMAT`; restore is visually equivalent for
   those supported fields.
3. Global kale in v2 `globalFiltersObj` becomes `filt.pcfs` **without** `tab`;
   page kale becomes `filt.pcfs` **with** `tab`; none of those rows in `sels`.
4. Jahr-as-native stays in `pcfs`, not `sels`.
5. A v2 payload with `tbl`/`topn`/`localFilters` still maps; those
   pieces are omitted with the codes in §6; remaining vis/txt/filters restore.
   `topHeader.icon` maps to `head.icon` (T2 item 4); default stem omits on GET.
6. v0/v1/garbage still fail explicit unsupported/unknown.
7. Same-package v2 does not require a second package; `pkg` matches runtime.
8. **A1:** GFO `{Personal_KDB, Personal_Berechtigung_Dienststelle_KDB}` in
   either key order is same-package (skip KID rewrite); Sicht/Dienststelle
   buckets still classify; kale `u` is already this package.
9. **A1:** alt-first GFO on the **remap** path keeps two table names after
   de-universalize (no collapse onto `Personal_KDB`).
10. **A1:** a third unexpected GFO table is cross-package; duplicate `pcfs`
    `nm` may fail `validatePcfs` — explicit, not silent merge.

No history-stack check in this WP. Map does not push or replay steps.

---

## 11. A1 recast — files (implement GO)

Touch only Map adapters (hard cap 150 / ≤10 AMD). `buildV2SourceMapping.js`
is live ~114 / 0 imports — dual-table bind must stay under 150; do **not**
import `parameterMap.js` into the source mapper (source vs target mix).
`remapV2KidTokens.js` already imports `kidIndex.js` — subset gate uses
`index.package.datasourceName` + `alternativeDatasourceName` (`kidIndex.js`
already exposes the alt name).

| File | Change |
|---|---|
| `map/adapters/remapV2KidTokens.js` | Subset same-package gate (§4). |
| `map/adapters/buildV2SourceMapping.js` | Bind `datasource_name_KID` / `alternativeDatasource_name_KID` only when a GFO key **equals** runtime `datasourceName` / `alternativeDatasourceName`. Unmatched keys stay unmatched. No Object.keys / first-unbound fallback. No widget/slot walk. |

Do not edit `universalizeV2KidTree.js` / `deUniversalizeV2KidTree.js` /
extract/classify/filter mappers for A1 unless army proves collapse still
happens after dual bind.

Cognos §10 items 1–7 remain the original v2-map gate. Items 8–10 are **this**
amendment. Do not mark this delta `Approved — Cognos green` until PO hosts
both. A1 extra Map code means Fase 2 is **not** “finished” by T2 GREEN
reopen-bans (`writeback-restore-deferred-backlog.md` “skeleton” rows are
stale for the 2026-08-16 adapter, not a host pass).
