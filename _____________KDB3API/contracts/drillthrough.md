# Service Contract: `drillthrough`

> Shared PKZ-AT URL/open service. Sibling style: `contracts/widgetBindingPlan.md` (runtime-optional named methods, no owned state). Live evidence is `laatsteOriginal/KDB2/js/widgets/visWidgets/addPkzDrillthrough.js`, not the unused `generalFunctions/pkzDrillthrough/` tree.

---

**Status:** `Approved`
**Owner module / service:** `drillthrough`
**Type:** `shared service`
**Authoring AI:** Cursor Grok 4.6, 2026-08-28
**Reviewed by:** pending PO vastenburg
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Scope And Tranches

Public key: `_KDB.services.drillthrough` (not `reportLaunch`, not `pkzDrillthrough`).

This service owns URL build, `p_p_*` encoding, BW/DEZPV org mapping, and `window.open`. It implements **both** fill modes now (`icon` and `datapoint`). It does **not** own icon DOM (T1 header or S2 datapoint), click wiring, or visualization selection. F1c selection ops live on `cognosHost.visualization`; widgetVis assembles `source:"datapoint"` + `categories[]`.

| Tranche | Who | What |
|---|---|---|
| **This contract / service CP** | `drillthrough` | Both assemblers + one URL builder + open. |
| **Tranche 1 consumer** | `widgetVis` | Header/icon click: assemble `source:"icon"` spec, call `openDrillthrough`. |
| **Tranche 2 consumer** | `widgetVis` (PO 2026-08-30) | Datapoint overlay: assemble `source:"datapoint"` + `categories[]` after F1c peek/subscribe. No Ctrl. No new facet. |

Do **not** add selection ops or icon DOM in this service. The datapoint assembler consumes a caller-normalized `categories[]` DTO from widgetVis (F1c flatten). This service does not call Cognos.

Target report: **PER125 Personalkennzahlen-Analysetool** via dxportal `pathRef`. Env hosts: `bi-dev` / `bi-test` / `bi.digital-wien.gv.at`. **All three** `pathRef` values include `/Personal/` (legacy prod omitted it; PO: typo).

---

## 1. Evidence And Deliberate Deltas

| Evidence | Use in this contract |
|---|---|
| `laatsteOriginal/KDB2/js/widgets/visWidgets/addPkzDrillthrough.js` | **LIVE source of truth** for `p_p_*` catalog, BW/DEZPV orchestrators, vis-type year/aufriss rules, `#` encoding, `window.open(url, "_blank")`. |
| `laatsteOriginal/KDB2/js/generalFunctions/pkzDrillthrough/` | Unused twin. **Do not copy:** fluktuation/`calenderYearForFluktuationsKZ` override; **token-wise** `;` then per-token `#` normalize. Live is **whole-string** `#` strip. |
| `contracts/widgetBindingPlan.md` | Sibling: shared service, named methods, no state, no `destroy`, caller-prepared spec, serializable success/failure. |
| `contracts/widgetVis.md` / `widgetVis-port-execution-spec.md` | Icon DOM (T1 + S2), click, spec assembly, service **call**, F1c consume via stamped `visualizationFacet`. |
| `contracts/dienststelle.md` | `getCurrentHierarchySnapshot()` is planner `useValue[]` only. Not enough for BW/DEZPV tree walk. |
| `KDB3/js/core/config/tables.js` | Hierarchy table keys `dienststelle_bw_hierarchy` / `dienststelle_dezpv_hierarchy`. |
| `KDB3/js/core/config/dashboardSettings.js` (`links`) | Existing home for `_KDB.config.links` URL strings. |

Deliberate deltas versus live `addPkzDrillthrough.js`:

- Public surface is `{ buildDrillthroughUrl, openDrillthrough, destroy }` on `_KDB.services.drillthrough`. Not a per-widget attach function.
- Caller passes a `DrillthroughSpec`. Service does **not** scrape widget DOM, does **not** read `_KDB.runtime.widgetVis`, does **not** call `_KDB.cognosAPI`.
- `source: "icon" | "datapoint"` is a required discriminant. Datapoint is a **second fill mode for the same keys**, not extra URL fields. Trigger is native Cognos datapoint select (widgetVis); not Ctrl and not a 3s flush.
- `info` (Cognos selection event blob) is **not** a URL field and is **not** on the public spec. Tranche-2 `widgetVis` extracts `categories[]` before the call.
- `p_aufspannen_2` is **icon-only** (optional). Datapoint never emits it.
- Lehrlinge / `LEHRLINGE` exists **only** on the icon aufriss map. Datapoint map has no `LEHRLINGE`.
- Icon never month-level. Datapoint with jahr+month **clears** `p_range`.
- Org tree is parent/children/level from hierarchy **tables**, not `dienststelle.getCurrentHierarchySnapshot()` planner strings. Required for **icon (tranche 1)**, not datapoint-only.
- No global CTRL listeners, no 3s capture window, no `watchWidgetRender`, no title `.kdb_hyperlink`, no `_KDB.state.pkzDrillthroughAttached`. Selection subscribe/peek is widgetVis + F1c, not this service.
- All three env URLs include `/Personal/` in `pathRef`.
- No `_KDB.state.drillthrough`. `destroy()` only releases pending hierarchy-wait opens (see Runtime).
- Unused DEZPV “level-0 children as Dienststelle list” toggle is **not** ported. Canonical DEZPV path is the highest-wins orchestrator.

---

## 2. Purpose

`drillthrough` turns a caller-prepared spec into a PER125 PKZ-AT HTML prompt URL and optionally opens it in a new tab.

It maps Sicht + Dienststelle selection through the BW/DEZPV hierarchy tree into org prompt values, fills time/aufriss prompts from **icon** or **datapoint** rules, encodes `p_p_*` query parameters, and calls `window.open(url, "_blank")`.

It does not render icons, bind visualization selections, read widget settings, write history, or talk to Cognos. widgetVis assembles `source:"datapoint"` + `categories[]` after F1c; this service still only receives the DTO.

---

## 3. Ownership

### State

- Owns **no** `_KDB.state` subtree. There is **no** `_KDB.state.drillthrough`.
- Writes nothing under `_KDB.state.widgets.*`, filters, history, or tableData.

### Runtime

- Owns **no** `_KDB.runtime` subtree.
- Creates no listeners, subscriptions, AbortControllers, DOM refs, or adapters. The only timer is one deferred-open timeout per pending hierarchy wait (below).
- A hierarchy wait attaches to the promise returned by `tableData.readPendingLoad`. That promise is not copied onto `_KDB.runtime.drillthrough`. The service does not abort it.
- Every `window.open` handle (direct open and wait window) gets `handle.opener = null` right after opening. The `"noopener"` window feature is not used: it makes `window.open` return `null`, which reads as a blocked popup and leaves no handle for the wait window. The opened URL and the `"_blank"` target are unchanged. A failing opener write is logged and does not fail the open.
- A hierarchy wait also arms one timeout of `DEFERRED_OPEN_TIMEOUT_MS` (120000, `drillthrough/config.js`). If the load has not settled by then, the wait window shows the `loadFailedBody` text and a later settle is ignored.
- `destroy()` is idempotent. It cancels the deferred-open timeouts, closes wait windows that are still waiting (opens that already settled keep their window) and makes a late settle a no-op. It does not abort the `tableData` load. After `destroy()`, `openDrillthrough` returns `ok:false`, `errorCode:"DRILLTHROUGH_DISPOSED"` without calling `window.open`; `buildDrillthroughUrl` stays available (pure).

If root bootstrap removes `_KDB.services.drillthrough`, callers treat the missing service as a bootstrap/integration error.

---

## 4. Public API

### 4b. Shared service

- Surface: `_KDB.services.drillthrough`
- Style: `named methods` (shared-service default). No `dispatch`, `getState`, or `mount`.

```js
_KDB.services.drillthrough = {
  buildDrillthroughUrl: buildDrillthroughUrl,
  openDrillthrough: openDrillthrough,
  destroy: destroy
};
```

- Internal mutation style: none. No owned state, no writers.

| Method | Signature | Contract |
|---|---|---|
| `buildDrillthroughUrl` | `(spec: DrillthroughSpec) => DrillthroughBuildResult` | Sync. Validate spec, run the assembler for `spec.source`, map org prompts, encode URL. Known failures return `ok:false`; do not throw. |
| `openDrillthrough` | `(spec: DrillthroughSpec) => DrillthroughOpenResult` | Sync. Calls `buildDrillthroughUrl(spec)` internally, then `window.open(url, "_blank")` when the build succeeds. On `DRILLTHROUGH_ORG_TREE_MISSING` while `tableData.readPendingLoad` already holds that hierarchy key, opens `about:blank` in the same turn. `location.replace` runs only when that load later leaves the table `ready` and a rebuild succeeds. Every other settle follows `contracts/_archive/drillthrough-hierarchy-wait-open-contractdelta.md` §3. Every other build failure still opens nothing. After `destroy()` it returns `DRILLTHROUGH_DISPOSED` and opens nothing. |
| `destroy` | `() => void` | Idempotent. Releases pending hierarchy-wait opens (timers, wait windows), see Runtime. |

`openDrillthrough` always takes a spec (not a raw URL). It may call build internally.

After `destroy()`: `openDrillthrough` returns `{ ok:false, errorCode:"DRILLTHROUGH_DISPOSED" }`, `buildDrillthroughUrl` keeps working, repeated `destroy()` is a no-op.

### 4.1 Action payload schemas

None. This service is not dispatch-style. The only public input is `DrillthroughSpec`.

---

## 5. `DrillthroughSpec`

One DTO. Two fill modes. Optional overlay fields — **not** two public APIs.

```js
{
  source: "icon" | "datapoint",          // required discriminant

  sicht: "BW" | "DEZPV" | string,        // → p_art / p_p_art
  kennzahlCode: string | null,           // → p_p_kz_1 + p_p_KzBezeichnung_DrillFromGDB

  orgSelection: OrgSelection,            // selected Dienststelle members (not planner string[] alone)
  orgTree?: OrgHierarchyTree | null,     // preferred: caller-passed walkable tree

  // --- icon overlay (required when source === "icon"; ignored when datapoint) ---
  visType?: string | null,               // normalized lowercase: line | table | list | pie | other
  selectedDimension?: string | null,     // aufriss label; "default" / "none" / "" = absent
  yearContext?: {
    highestYearFromVis?: number | null,      // max Jahr from vis query rows
    highestYearFromJahrFilter?: number | null,
    defaultYear?: number | null              // caller applies calendar fallback (see §6.3)
  },

  // --- datapoint overlay (required when source === "datapoint"; ignored when icon) ---
  categories?: Array<{
    columnId?: string | null,
    dataItemId?: string | null,
    name?: string | null,
    label?: string | null,
    value?: string | number | null
  }>,

  hostEnv?: "dev" | "test" | "prod" | null,  // optional override; default from window.location
  widgetId?: string | null                   // diagnostic echo only
}
```

Rules:

- `source` is required. Invalid/missing → `DRILLTHROUGH_INVALID_SOURCE`.
- Datapoint overlay is **`source:"datapoint"`**, not extra URL keys. Both modes fill the same drill-config keys: `p_range`, `p_aktmon`, `p_aufspannen_1` (plus shared org/kz/sicht keys). `p_aufspannen_2` is icon-only.
- `info` is **not** on this spec and **not** a URL field.
- Service does not scrape widget DOM, does not read `_KDB.runtime.widgetVis`, does not call `_KDB.cognosAPI`.
- `widgetId` is diagnostic only.
- Same spec + same injected links/tree → same URL (`build` does not call `Date.now` or random). Calendar fallback year is **caller-supplied** in `yearContext.defaultYear`.

### 5.1 `OrgSelection`

```js
{
  selectedValues: [
    {
      displayValue?: string | null,
      useValue?: string | null,
      idValue?: string | null,   // last-bracket token of useValue, else display
      level?: number | null      // 0-based; from useValue /level0*N/ or from orgTree after resolve
    }
  ]
}
```

`dienststelle.getCurrentHierarchySnapshot()` may supply `useValue[]` / `displayValues[]` for this object. It is **not** the tree (§7.1).

Empty `selectedValues` is valid: org prompts omitted.

### 5.2 `OrgHierarchyTree`

Walkable tree the BW/DEZPV orchestrators need. **Not** planner `string[]`.

```js
{
  sicht: "BW" | "DEZPV",
  tableKey: "dienststelle_bw_hierarchy" | "dienststelle_dezpv_hierarchy",
  nodesById: {
    [nodeId: string | number]: {
      id: number,
      parent: number[],      // [parentId] or []
      children: number[],
      levelRank: number      // named level00N / numeric key: that parsed N (1 = column level001). Other keys: walk index (first query column = 0). Walk order: drillthrough-dezpv-column-order-contractdelta.md.
    }
  },
  idToMember: {
    [nodeId: string | number]: { text: string, dataId?: string | null }
  },
  textToNodeId: { [displayOrDataId: string]: number }
}
```

How the service receives the tree (no DOM scrape):

| Priority | Source | When |
|---|---|---|
| 1 (preferred) | `spec.orgTree` | Caller (widgetVis) built it from hierarchy table rows and passed it in. |
| 2 (allowed) | Injected `tableData.readRows` | `spec.orgTree` omitted. Factory injects `_KDB.services.tableData.readRows`. Service reads `dienststelle_bw_hierarchy` or `dienststelle_dezpv_hierarchy` by `sicht` (**cache only**, no `loadTable` / `waitForRows`) and builds `OrgHierarchyTree` internally. |
| Forbidden | `_KDB.api.dienststelle.getCurrentHierarchySnapshot()` as the tree | Planner `useValue[]` has no parent/children/level. |
| Forbidden | Widget/header DOM, `_KDB.runtime.widgetVis`, `_KDB.cognosAPI` | — |

Missing/empty tree when `orgSelection.selectedValues.length > 0` (and not the BW MAG/level-0 empty case) → `DRILLTHROUGH_ORG_TREE_MISSING`. If that failure happens while the hierarchy load is already in flight, `openDrillthrough` opens a wait window instead of returning the failure (`contracts/_archive/drillthrough-hierarchy-wait-open-contractdelta.md`). The tree read stays cache-only `readRows`.

Tree walk is **tranche-1 for icon**, not datapoint-only. Icon open uses the same BW/DEZPV orchestrators as datapoint.

Object rows are walked in `Object.keys` order (query order). Level-number keys are not pulled in front of other columns. Parent of the first kept cell is empty. See `drillthrough-dezpv-column-order-contractdelta.md`.

---

## 6. Assemblers

Two assemblers, **one** URL builder (`buildPkzDrillUrlFromConfig` equivalent).

```txt
spec.source
  → assembleIconDrillConfig(spec)     if "icon"
  → assembleDatapointDrillConfig(spec) if "datapoint"
  → mapOrgPrompts(spec, tree)          shared
  → encodeDrillthroughUrl(drillConfig) shared
```

Shared `drillConfig` keys (single `p_` prefix; encoder adds the extra `p_`):

| Key | Icon | Datapoint |
|---|---|---|
| `Kennzahl_Code` | spec | spec |
| `p_art` | spec.sicht | spec.sicht |
| `p_datenart` | service config hash | same |
| `p_gruppe_drillFromGDB` | org map | org map |
| `p_dienststelle_drillFromGDB` | org map (BW) | org map (BW) |
| `p_dezpv_drillFromGDB` | org map (DEZPV) | org map (DEZPV) |
| `p_range_DrillFromGDB` | icon time rules | datapoint time rules |
| `p_aktmon_DrillFromGDB` | icon time rules | datapoint time rules |
| `p_aufspannen_1` | icon aufriss | datapoint columnId map |
| `p_aufspannen_2` | icon-only, optional | **omit always** |
| `info` | **not a field** | **not a field** |

### 6.1 Icon aufriss (`source:"icon"`)

Normalize `visType` to lowercase. Treat `list` as `table`.

| visType | `p_aufspannen_1` | `p_aufspannen_2` |
|---|---|---|
| `line`, `table`, `list` | always `F_TST_SID` | mapped `selectedDimension` if present and not `default`/`none`; else omit |
| `pie` | mapped `selectedDimension`, else default `GESCHLECHT` | omit |
| other | mapped `selectedDimension` if present; **no** Geschlecht default | omit |

Icon aufriss map (`mapDimensionToAufrissValue`; substring, case-insensitive):

| Dimension contains | Prompt value |
|---|---|
| `geschlecht` | `GESCHLECHT` |
| `altersgruppe` | `ALTERSGRUPPE_SID` |
| `dienstverhältnis` / `dienstverhaeltnis` | `BEAMTER_VB` |
| `berufsfamilie` | `BERUFSFAMILIE_LANGTEXT` |
| `lehrlinge` | `LEHRLINGE` (**icon map only**) |
| `dienststelle` / `stelle` | BW → `DIENSTSTELLE_LANG_SID`; DEZPV → `DIENSTSTELLE_KURZ_TEXT` |
| else | `""` (omit prompt) |

### 6.2 Datapoint aufriss (`source:"datapoint"`)

Walk `categories[]` in order. First `columnId` / `dataItemId` / `name` match wins. **No `LEHRLINGE`.** No `p_aufspannen_2`.

| columnId contains | Prompt value |
|---|---|
| `geschlecht` | `GESCHLECHT` |
| `altersgruppe` | `ALTERSGRUPPE_SID` |
| `dienstverhältnis` / `dienstverhaeltnis` | `BEAMTER_VB` |
| `berufsfamilie` | `BERUFSFAMILIE_LANGTEXT` |
| `dienststelle` / `stelle` | BW → `DIENSTSTELLE_LANG_SID`; DEZPV → `DIENSTSTELLE_KURZ_TEXT` |
| else (no match) | omit `p_aufspannen_1` |

When the page Dienststelle filter (`orgSelection.selectedValues`) is MAG-only (the selected org set is MAG and nothing else — every selected member `idValue`/`display` lowercased `"mag"`), datapoint MUST NOT emit `DIENSTSTELLE_LANG_SID` on `p_aufspannen_1` / `p_p_aufspannen_1`. Empty aufriss — existing omit-if-empty. Other category needles, DEZPV `DIENSTSTELLE_KURZ_TEXT`, org MAG keys (`p_p_dienststelle_*`), and `p_art`/sicht MUST NOT change.

### 6.3 Icon time (never month-level)

Icon **never** writes a month into `p_aktmon` (always `{year} - 1` = January). Ignore any month on the spec.

| visType | Range / aktmon |
|---|---|
| `line` / `table` / `list` | If `highestYearFromVis`: `p_range = ja_bisMaxStichtag`, `p_aktmon = "{year} - 1"`. Else if `highestYearFromJahrFilter`: `ja_kalenderJahr` + `"{year} - 1"`. Else if `defaultYear`: `ja_kalenderJahr` + `"{year} - 1"`. Else omit both. |
| `pie` and other | Always `ja_kalenderJahr` when a year exists. Year pick: (pie/other may receive a year already resolved by the caller into `yearContext`; service uses first non-null of `highestYearFromVis`, `highestYearFromJahrFilter`, `defaultYear`). `p_aktmon = "{year} - 1"`. No year → omit both. |

Caller calendar fallback (widgetVis, **not** this service; do not `Date.now` inside build):

- March–December → `currentYear - 1`
- January–February → `currentYear - 2`

Pass the result as `yearContext.defaultYear`.

### 6.4 Datapoint time

From `categories[]`: Jahr if id contains `jahr`/`year` or numeric 1900–2100; Monat if id contains `monat`/`month` or a mapped month label (Jänner/Januar/…/Dezember, plus `jan`…`dec`).

| Extracted | `p_range` | `p_aktmon` |
|---|---|---|
| jahr only | `ja_kalenderJahr` | `"{jahr} - 1"` |
| jahr **and** month | **cleared / omitted** | `"{jahr} - {monatNumber}"` |
| neither | omitted | omitted |

---

## 7. BW vs DEZPV org mapping

Shared after either assembler. Input: `orgSelection` + `OrgHierarchyTree`. Output: the three org strings (empty string = omit that `p_p_*`).

Join multiple members with `;`.

### 7.1 Shared: highest-wins

A selected node is dropped if **any ancestor** is also selected (walk `parent[0]`, guard 50). Remaining nodes are `highestSelections`.

Selections that do not resolve in the tree are **kept** (appended after orchestrated members).

### 7.2 BW

- Never emit `p_dezpv_drillFromGDB`.
- **MAG + level 0** (any selected member `idValue`/`display` lowercased `"mag"` and `level === 0`): **both** `p_gruppe` and `p_dienststelle` **empty**. Success, not an error.
- If only one of MAG / level-0 matches: do **not** apply the empty MAG rule; continue orchestrator. Log compact diagnostic; do not fail the build.
- Highest-wins on the BW tree (`dienststelle_bw_hierarchy`).
- **Level 001** selected: expand to **direct children** member ids as Dienststelle values (skip empty / `#ALLE_GG#`).
- `p_gruppe` is filled only when **every** highest selection is covered by a **candidate level-001 parent**. A level-001 node is a candidate if **it is selected** OR **all of its direct children** are selected.
- If `p_gruppe` is non-empty, **omit** `p_dienststelle` (do not send both).
- Else `p_dienststelle` = joined highest Dienststelle member ids (children expansion as above).
- `#ALLE_GG#` is never emitted as a BW Dienststelle member from the orchestrator expansion.

GG heuristic (fallback / display only): BW display starts with `Geschäftsgruppe` → treat as gruppe, not Dienststelle. Orchestrator output wins when it produces any non-empty org string.

### 7.3 DEZPV

- Never emit `p_dienststelle_drillFromGDB`.
- Highest-wins on the DEZPV tree (`dienststelle_dezpv_hierarchy`).
- Value normalize: trim; keep `---`; strip leading `DS_`; at **level 0** strip trailing `|ALLE`.
- For each **root** reached from a selection: always add normalized root id to `p_gruppe`.
- Marker eligibility: root selected **OR** all direct children selected → add a marker to `p_dezpv`, and **do not** add descendants for that root. If the root member id, after stripping a leading `DS_`, ends with `|ALLE`, the marker is the literal `#ALLE_GG#`. Otherwise it is `{normalizedRoot}|||#ALLE_GG#`. See `drillthrough-dezpv-top-alle-marker-contractdelta.md`.
- Other highest selections (level ≠ 0) whose root is **not** marker-eligible: add normalized member to `p_dezpv`.
- Unresolved (not in tree): still append to `p_dezpv`.

GG heuristic (display only): first `|` then after-pipe starts with `ALLE#`. Orchestrator is canonical.

### 7.4 Hash sanitize (pre-encode, live whole-string)

Applied to org **member strings** before join/encode (not the unused per-`;` token walker):

| Input | Output |
|---|---|
| `#ALLE_GG#` | keep `#ALLE_GG#` |
| ends with `#` (and not the marker above) | `"---"` (Dienststelle encode path) |
| contains `#` elsewhere | take substring **before the first `#`** (whole string, not per `;` token) |
| else | trim as-is |

DEZPV `|||#ALLE_GG#` markers keep the `#` until URL encode (§9).

---

## 8. Prompt catalog and URL builder

Base URL from `_KDB.config.links` (§13). Concatenate `p_p_*` query pairs, then the fixed tail.

Tail (always): `&format=HTML&Download=false&prompt=true`

Encoder: config keys use one `p_`; query names use `p_p_*`.

### 8.1 Catalog

| Query param | Source field | When omitted |
|---|---|---|
| `p_p_art` | `p_art` / `spec.sicht` | empty sicht |
| `p_p_datenart` | service config hash | **never** (always emitted) |
| `p_p_gruppe_DrillFromGDB` | `p_gruppe_drillFromGDB` | empty |
| `p_p_dienststelle_DrillFromGDB` | `p_dienststelle_drillFromGDB` | empty, or Sicht is DEZPV, or BW gruppe filled |
| `p_p_dezpv_DrillFromGDB` | `p_dezpv_drillFromGDB` | empty, or Sicht is BW |
| `p_p_range_DrillFromGDB` | `p_range_DrillFromGDB` | empty (incl. datapoint jahr+month) |
| `p_p_stichtag_or_range` | constant `Zeitraum` | when range omitted |
| `p_p_dummy_validate` | constant `1` | when range omitted |
| `p_p_art_DrillFromGDB` | `p_art` | empty sicht |
| `p_p_aktmon_DrillFromGDB` | `p_aktmon_DrillFromGDB` | empty |
| `p_p_kz_1` | `Kennzahl_Code` | empty code |
| `p_p_kz_1_source` | constant `MASTER_FACT` | when kz omitted |
| `p_p_noBlock_alleKZ` | constant `0` | **never** |
| `p_p_KzBezeichnung_DrillFromGDB` | `Kennzahl_Code` | empty code |
| `p_p_drillthroughFromGDB` | constant `ja` | **never** |
| `p_p_drillthroughMultipleDstPossible` | constant `ja` | **never** |
| `p_p_aufspannen_1` | `p_aufspannen_1` | empty |
| `p_p_dummy_aufrissPrompt_v2` | constant `0` | when `p_aufspannen_1` omitted |
| `p_p_aufspannen_2` | `p_aufspannen_2` | empty **or** `source === "datapoint"` |

`p_datenart` hash (service config, not links): `FA2B3F9D85EEDABE42016D7F23BB9EBAB19F030A`.

Emit order (live): art, datenart, org group, range, stichtag_or_range, dummy_validate, art_DrillFromGDB, kz pair, noBlock, KzBezeichnung, drillthroughFromGDB, drillthroughMultipleDstPossible, aktmon, aufriss (`aufspannen_1` + dummy), `aufspannen_2`.

### 8.2 `DrillthroughBuildResult` / `DrillthroughOpenResult`

```js
{
  ok: boolean,
  status: "success" | "error",
  errorCode: string | null,
  errorMessage: string | null,
  url: string | null,
  source: "icon" | "datapoint" | null,
  widgetId: string | null,
  drillConfig: object | null,   // assembled keys; never include raw Cognos `info`
  diagnostics: {
    service: "drillthrough",
    operation: "buildDrillthroughUrl" | "openDrillthrough",
    hostEnv: "dev" | "test" | "prod" | null,
    failedStage: "validateSpec" | "assemble" | "mapOrg" | "encodeUrl" | "openWindow" | null,
    warnings: [{ code: string, message: string }]
  }
}
```

Open result adds nothing except `operation:"openDrillthrough"` and `failedStage:"openWindow"` on popup-block / open throw. `url` is still the built URL when open is blocked. A hierarchy wait window returns `ok: true`, `url: null`, and warning `DRILLTHROUGH_HIERARCHY_PENDING` (`contracts/_archive/drillthrough-hierarchy-wait-open-contractdelta.md`).

---

## 9. Encoding

Before `encodeURIComponent`: replace `~` with space on org strings.

After `encodeURIComponent`: **whole-string** `.replace(/#/g, "%23")` on the encoded org values (live). Do **not** port unused token-wise `;`-split normalize.

`encodeURIComponent` already encodes `#`; the extra replace is live parity for leftover `#`.

Do not double-encode the stored `pathRef` (links already contain `%2F` / `%2B`).

Host pick when `spec.hostEnv` omitted: `window.location.href` contains `-dev` → `dev`; `-test` → `test`; else `prod`. Location is used **only** for this env key — not widget scrape.

---

## 10. Error taxonomy

| Code | Stage | Meaning |
|---|---|---|
| `DRILLTHROUGH_MISSING_SPEC` | validateSpec | Spec missing or not an object. |
| `DRILLTHROUGH_INVALID_SOURCE` | validateSpec | `source` not `"icon"` or `"datapoint"`. |
| `DRILLTHROUGH_LINK_MISSING` | encodeUrl | `_KDB.config.links.pkzAnalysetool[hostEnv]` missing/empty. |
| `DRILLTHROUGH_HOST_UNRESOLVED` | encodeUrl | Host key could not be resolved. |
| `DRILLTHROUGH_ORG_TREE_MISSING` | mapOrg | Selection present (non-MAG-empty) but no walkable tree from spec or `readRows`. |
| `DRILLTHROUGH_ORG_TREE_INVALID` | mapOrg | Tree present but missing `nodesById` / maps needed to walk. |
| `DRILLTHROUGH_DATAPOINT_CATEGORIES` | assemble | `source:"datapoint"` but `categories` missing/not an array. |
| `DRILLTHROUGH_BUILD_INTERNAL` | public catch | Unexpected exception in build. |
| `DRILLTHROUGH_OPEN_BLOCKED` | openWindow | `window.open` returned `null`/`undefined` (popup blocker). |
| `DRILLTHROUGH_OPEN_INTERNAL` | public catch | Unexpected exception in open. |

Warnings (build still `ok:true` when otherwise valid):

| Code | Meaning |
|---|---|
| `DRILLTHROUGH_KENNZAHL_OMITTED` | No `kennzahlCode`; kz prompts skipped. |
| `DRILLTHROUGH_SICHT_OMITTED` | No sicht; `p_p_art*` skipped; org map returns empty. |
| `DRILLTHROUGH_YEAR_OMITTED` | No year resolved; range/aktmon skipped. |
| `DRILLTHROUGH_AUFRISS_UNMAPPED` | Dimension/columnId did not map; aufriss prompt skipped. |
| `DRILLTHROUGH_BW_MAG_LEVEL_MISMATCH` | Only one of MAG / level-0 matched; MAG-empty rule not applied. |

Open-result warning (not a build warning; `openDrillthrough` returns `ok: true`):

| Code | Meaning |
|---|---|
| `DRILLTHROUGH_HIERARCHY_PENDING` | `about:blank` opened. `location.replace` runs later only when the table is `ready` and the rebuild succeeds. `url` is null until then. |

Known failures: return result, do not throw. Unexpected: log once `[drillthrough.buildDrillthroughUrl]` / `[drillthrough.openDrillthrough]` with compact context, convert to `*_INTERNAL`.

---

## 11. Readers / Writers

**For shared services:**

- No dedicated read methods (`read*` / `getState`). `buildDrillthroughUrl` is the only read-like operation: spec in, serializable result out.
- No selector registry (no owned state).

**For all state owners:**

- None. This service is not a state owner. No `set*` / `apply*` writers.

`build` / `open` must not mutate `spec` or `orgTree`.

---

## 12. Events

None.

- No fact-events, no request-events, no subscriptions.
- Known caller is `widgetVis` calling named methods directly.
- No `events/eventNames.js`.

Do not add events unless a real independent consumer exists (none today).

---

## 13. Dependencies

Injected at orchestrator / factory (no deep `window._KDB` in leaf files):

- `_KDB` — orchestrator registration only, plus factory close-over of `config.links`.
- `_KDB.config.links.pkzAnalysetool` — **home for PER125 URLs** (see below).
- Optional: `_KDB.services.tableData.readRows` — cache-only hierarchy rows when `spec.orgTree` omitted.
- Optional: `_KDB.services.tableData.readPendingLoad` and `readTableState` — join an in-flight hierarchy load without starting one (`contracts/_archive/drillthrough-hierarchy-wait-open-contractdelta.md`). Not a read of `_KDB.runtime.tableData`.

No dependencies on `_KDB.api.*`, `_KDB.events`, `_KDB.cognosAPI.*`, `_KDB.runtime.*`, `_KDB.services.cognosHost.*`, history, or dashboard DOM queries (except `window.location` for host key, `window.open` in effects, and `document.title` / `textContent` on the window that `window.open` just returned).

### 13.1 Config homes (pick documented here)

| Concern | Home | Why |
|---|---|---|
| Env report URLs (`pathRef`) | `_KDB.config.links.pkzAnalysetool.{dev,test,prod}` | Existing links owner (`core/config/dashboardSettings.js`, `links`). |
| `p_datenart` hash | service `core/services/drillthrough/config.js` (`datenart`) | Prompt constant, not a navigable URL. |
| Prompt catalog, aufriss maps, month labels, dummy constants | service `config/` | Encoder/assembler policy. |

Do **not** duplicate full URLs inside service config. Do **not** put the datenart hash in `links`.

Canonical link strings (all three include `/Personal/`):

```txt
dev:  https://bi-dev.digital-wien.gv.at/dxportal/bi/?pathRef=.public_folders%2FPersonal%2FPKZ%2F10_Standardberichte%2FPER125%2BPersonalkennzahlen-Analysetool
test: https://bi-test.digital-wien.gv.at/dxportal/bi/?pathRef=.public_folders%2FPersonal%2FPKZ%2F10_Standardberichte%2FPER125%2BPersonalkennzahlen-Analysetool
prod: https://bi.digital-wien.gv.at/dxportal/bi/?pathRef=.public_folders%2FPersonal%2FPKZ%2F10_Standardberichte%2FPER125%2BPersonalkennzahlen-Analysetool
```

No new cognosHost facet for `pathRef`.

### 13.2 Bootstrap

`KDB3/js/core/services/__orchestratorServices.js` imports `__orchestratorDrillthrough` and registers `_KDB.services.drillthrough`. `KDB.js` does not need a direct import if services bootstrap already runs `__orchestratorServices`.

---

## 14. Cognos Touchpoints

**None.**

Forbidden:

- `_KDB.cognosAPI.*`
- `_KDB.services.cognosHost.*` (including F1c `getSelections` / `subscribeSelections` — those stay on the visualization facet for widgetVis)
- PathRef lookup via Cognos
- Widget content/selections/query APIs

Feature modules never call `_KDB.cognosAPI`. `widgetVis` (tranche 2) consumes stamped `visualizationFacet` F1c ops to **assemble** `categories[]`; this service still only receives the DTO. This service does not call Cognos.

---

## 15. Folder Layout

As built (exports per file; `org/` files each export one function). `__orchestratorDrillthrough.js` is a shim over `index.js` (`registerDrillthrough`).

```txt
core/services/drillthrough/
  __orchestratorDrillthrough.js                       shim over index.js (path kept for KDB.js)
  assemble.js                                         assembleIconDrillConfig, assembleDatapointDrillConfig
  buildDrillthroughUrl.js                             buildDrillthroughUrl, createBuildResult
  config.js                                           aufrissMatchers, promptCatalog, monthLabels, drillthroughLabels, HIERARCHY_TABLE_KEYS, DEFERRED_OPEN_TIMEOUT_MS, datenart
  encode.js                                           encodeDrillthroughUrl
  index.js                                            registerDrillthrough
  open.js                                             createOpener
  org/
    buildOrgTreeFromRows.js                           default export: buildOrgTreeFromRows
    collectBwGruppeCandidates.js                      default export: collectBwGruppeCandidates
    expandBwLevel001Children.js                       default export: expandBwLevel001Children
    highestWins.js                                    default export: highestWins
    mapBwOrgPrompts.js                                default export: mapBwOrgPrompts
    mapDezpvOrgPrompts.js                             default export: mapDezpvOrgPrompts
    mapOrgPrompts.js                                  default export: mapOrgPrompts
    normalizeDezpvValue.js                            default export: normalizeDezpvValue
    parseHierarchyCell.js                             default export: parseHierarchyCell
    rankHierarchyRowKeys.js                           default export: rankHierarchyRowKeys
    resolveOrgNodeId.js                               default export: resolveOrgNodeId
    sanitizeHashValue.js                              default export: sanitizeHashValue
```

- `config.js` — hashes, catalogs, maps, and the German drillthrough label seed. URLs stay in `_KDB.config.links`.
- `open.js` — `window.open(url, "_blank")`, the wait document, and the deferred navigation. No `loadTable` / `waitForRows`.
- **No** `state/`, `view/`, `events/` or `adapters/` folder.

---

## 16. Out Of Scope

- PKZ drillthrough **icon** DOM (T1 header + S2 datapoint), PNG, CSS, placement, tooltip — owner: `widgetVis` (T1 `KDB3/images/pkzDrillthrough.png`; S2 `KDB3/images/datapoint_pkzDrillthrough.png`).
- Icon **click** wiring and spec assembly — owner: `widgetVis` (calls this service).
- Title **hyperlink** / `.kdb_hyperlink` — owner: `widgetVis` (unchanged; not this service).
- Selection subscribe/peek, S2 plant/hide, last-selection buffer — owner: `widgetVis` runtime (`_KDB.runtime.widgetVis.byId[id].drillthrough`) via stamped `visualizationFacet`. Not Ctrl. Not a 3s flush.
- Cognos **native** drill / Cognos drill definitions.
- F1c selection **ops** — existing `cognosHost.visualization` (`getSelections` / `subscribeSelections`); not this contract. Not a new facet.
- PDF hide of the icon — owner: `dashboardPdf` / `widgetVis` chrome policy.
- Widget settings **gear** / settings history.
- Fluktuation calendar-year override from unused `generalFunctions/pkzDrillthrough`.
- Token-wise `#` normalize from unused `urlHelpers.js`.
- DEZPV level-0 children-as-list toggle (dead in live; orchestrator is canonical).
- History steps, toasts, event bus facts.

---

## 17. Open Questions

*(empty — PO-approved decisions in §0–§4, §7.1, §13.1 are not reopened.)*

---

## 18. `widgetVis` caller notes (not this service)

Tranche 1 (icon):

1. Own icon DOM + click.
2. Assemble `DrillthroughSpec` with `source:"icon"`: sicht, kennzahl, visType, selectedDimension, `yearContext`, `orgSelection`, preferred `orgTree` (or omit tree and rely on injected `readRows`).
3. Call `_KDB.services.drillthrough.openDrillthrough(spec)`.
4. Do not scrape for URL params inside the service; assembly stays in `widgetVis`.

Tranche 2 (datapoint, PO 2026-08-30): widgetVis assembles `source:"datapoint"` + `categories[]` from F1c `getSelections` peek after native datapoint select, then calls the same two methods. Do not add selection ops here. No Ctrl. No 3s flush.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-08-28 | `Draft` | pending PO vastenburg | First contract: named service `{ buildDrillthroughUrl, openDrillthrough }`, both assemblers, icon consumer tranche 1, org tree from hierarchy tables, links + service-config split. |
| 2026-08-28 | `Draft → Approved` | PO vastenburg | Chat approval: implement tranche 1 (service + icon + PDF hide). No visualization selection facet. |
| 2026-08-30 | `Approved` (T2 consumer wording) | PO / contract writer | T2 consumer is widgetVis assembling `source:"datapoint"` + `categories[]` after F1c. Service still does not own selection or icon DOM and does not call Cognos. No new facet. No Ctrl. |
| 2026-10-14 | `Approved` (column-order delta) | PO vastenburg | Org-tree walk follows query column order. Level-number sort must not move `Dienststelle_DEZPV` after `level001`. `drillthrough-dezpv-column-order-contractdelta.md`. Code not started. |
| 2026-10-14 | `Approved` (hierarchy wait window) | PO vastenburg | Click stays enabled. In-flight hierarchy load opens `about:blank` in the click and navigates when that load is `ready` and the rebuild succeeds. `drillthrough-hierarchy-wait-open-contractdelta.md`. Code reviewed. Cognos click not yet checked. |
