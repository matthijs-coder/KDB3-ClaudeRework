# Execution Spec: `drillthrough` (tranche 1 — service + icon consumer + PDF hide)

> Per-module execution spec per `_executionSpecTemplate.md`. The executing AI implements mechanically; architectural decisions live in the approved contracts. **Do not write production JS/CSS until this spec is executed as an implementer slice.** This spec itself is the deliverable of the planner pass.
>
> **Scope:** tranche 1 only — `_KDB.services.drillthrough` (both assemblers + URL + open) + widgetVis **header icon** consumer + PDF hide selector. T1 remains icon-only. This spec does **not** implement T2. No new icon.
>
> **Note (2026-08-30):** T2 consumer (F1c ops on the existing `visualization` facet + S2 datapoint icon) is specified in `widgetVis-drillthrough-service-contractdelta.md` and `cognosHostService.md` §4, not in this T1 spec. Do not reopen T1 icon time / vis-max. T1 files: no Ctrl, no 3s flush, no `content.on`.
>
> **Pattern:** shared-service sibling `widgetBindingPlan` (named methods, no owned state, no `destroy`). Icon plant sibling `placeWidgetToolbar.js` locate-or-create.
>
> **Supervising planner pre-accepts the Section A echo for delegated implementers:** echo the numbered summaries at the top of the first progress message, then create only the files in YOUR slice (see Section B slice groups). Do not wait for a second human GO. Do not implement files outside your assigned slice.

---

**Status:** `Reviewed` — tranche 1 implemented (slices A/C/D/F/G/W + expand re-install). Final review H: `tranche1-complete`. No in-browser Cognos verification.
**Module / contracts:** `drillthrough.md`, `widgetVis-drillthrough-service-contractdelta.md`, `dashboardPdf-drillthrough-icon-hide-contractdelta.md`. Delta wins over parent `widgetVis.md` / `widgetVis-port-execution-spec.md` until slice W syncs those parents.
**Phase:** `extension (tranche 1 service + icon + PDF hide)`
**Authoring AI:** planner, 2026-08-29
**Executing AI:** `<slice implementer>`
**Reviewer:** captain / planner

**Do not modify** the three approved contracts. **Do not reopen** PO decisions. **Do not commit.**

---

## Section A. Pre-flight read list

The executing AI **must** read each file below in order, **before** producing any output file, then echo a one-sentence summary of each.

**Supervising planner pre-accepts this echo:** print the 14 numbered summaries at the top of the first progress message, then create only YOUR slice files.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` has a fixed top-level namespace set; feature/service code receives `_KDB` by injection and must not read `window._KDB` in deep files or invent new top-level keys.
2. `_____________KDB3API/.cursor/rules/state.mdc` — `_KDB.state` is serializable with one canonical writer per subtree; foreign writes are forbidden; this service owns **no** `_KDB.state.drillthrough`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — technical resources live under `_KDB.runtime.<owner>` and need a cleanup path; this service owns **no** `_KDB.runtime.drillthrough` and has **no** `destroy` (documented exception, sibling `widgetBindingPlan`).
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — shared services expose named methods only (no mixed `dispatch`); public surface here is `{ buildDrillthroughUrl, openDrillthrough }` only — no `mount`, `destroy`, `dispatch`, `getState`.
5. `_____________KDB3API/.cursor/rules/events.mdc` — known owner → direct API call; no fact-event without a consumer; this service emits **none**.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — orchestrator is thin wiring; JS executable hard limit 150 (target 80–120); orchestrator hard 120; >6 imports smell, >10 restructure; no `helpers/` `common/` `shared/` folders; **approved contract outranks rules for this module’s folder**.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English camelCase; underscore prefix on boundary inputs only; no nested leftover-suffix files; CSS new classes are `kdb-` kebab except the **legacy** class `.kdb_hyperlink_icon` (PO: keep).
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables; pure one-liners and config exempt; known drillthrough failures **return** `{ ok:false, ... }` and **do not throw**; unexpected → `DRILLTHROUGH_BUILD_INTERNAL` / `DRILLTHROUGH_OPEN_INTERNAL` + `console.error("[drillthrough.buildDrillthroughUrl]" | "[drillthrough.openDrillthrough]", ...)`.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — selectors from catalog / module tokens; live refs in owner runtime; Builder/Placer/Mutator; service files have **no DOM**; widgetVis view files scope from widget shell / expand host.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one full-compact `define([...], function (...) { ... })`; named entry + helpers at AMD factory scope only; **no** ES modules in `KDB3/js`; no nested helpers inside entry functions; no `window._KDB` in leaf files.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — lifecycle terms are the canonical set only; this service stores **no** lifecycle field (no owned state).
12. `_____________KDB3API/contracts/_template.md` — contract template; do not modify; implementation follows the **approved** contracts, not the empty template.
13. `_____________KDB3API/contracts/drillthrough.md` + `widgetVis-drillthrough-service-contractdelta.md` + `dashboardPdf-drillthrough-icon-hide-contractdelta.md` — source of truth: service owns URL/`p_p_*`/org/`window.open`; widgetVis owns icon plant/click/spec assembly; PDF owns one hide selector. **This spec fills the summaries; implementers re-echo.**
14. This execution spec itself.

Reference implementations (**read, copy pattern, do not modify** unless listed in Section B):

- `KDB3/js/core/services/widgetBindingPlan/__orchestratorWidgetBindingPlan.js`
- `KDB3/js/core/services/widgetBindingPlan/createWidgetBindingPlanService.js`
- `KDB3/js/core/services/widgetBindingPlan/diagnostics/createPlanSuccess.js` / `createPlanFailure.js` / `createPlanDiagnostics.js` (result-object shape only)
- `KDB3/js/core/services/__orchestratorServices.js` (slice C adds one import + one call)
- `KDB3/js/core/config/baseLinks.js` (slice C adds `pkzAnalysetool`)
- `KDB3/js/dashboard/widgets/widgetVis/__orchestratorWidgetVis.js` (`stampHostFacets` pattern)
- `KDB3/js/dashboard/widgets/widgetSettings/view/placeWidgetToolbar.js` (locate-or-create `.widgetIcons`)
- `KDB3/js/core/cognosHost/config/widgetChromeSelectors.js` (HEADER / widgetIcons / dataWidgetIcon / liveWidgetAnnotations / expandModeContainer)
- `KDB3/js/dashboard/widgets/widgetVis/effects/cleanupDrillthroughDecorations.js` (**KEEP**; already tears down `listeners` keys containing `drillthrough`, icon el, runtime.drillthrough bucket)
- `KDB3/js/dashboard/widgets/widgetVis/effects/focusMode/bindFocusPanelInteractions.js` (`bindExpandHeaderSettingsButton` = gear re-bind; icon re-bind is install’s job on expand host — **do not** clone onto `.KDB_focusModeSettingsPanel`)
- `KDB3/js/dashboard/widgets/widgetVis/effects/resolveTopNJahrFilterValue.js` (`filtersFacet.readFilterValues` + `jahrColumnId` — reuse for `yearContext.highestYearFromJahrFilter`)
- `KDB3/js/dashboard/widgets/widgetVis/effects/readEffectiveSettingsContext.js` (settings `visType` / `dimension` fallback)
- `KDB3/js/dashboard/widgets/widgetVis/effects/readVisualizationFacet.js` / `readFiltersFacet.js` (stamp readers)
- `KDB3/js/dashboard/filters/dienststelle/effects/readCurrentHierarchySnapshot.js` + `createDienststelleController.js` `getCurrentHierarchySnapshot` (orgSelection **not** tree)
- `KDB3/js/core/services/tableData/createTableDataService.js` `readRows` (cache only; array input; single-item returns rows or `undefined`)
- `KDB3/js/dashboard/filters/dienststelle/config/buildDienststelleTableDataInputs.js` (`readRows([{ tableName }])` call shape)
- `KDB3/js/core/config/tables.js` keys `dienststelle_bw_hierarchy` / `dienststelle_dezpv_hierarchy`
- Evidence only (do not port unused twin): `laatsteOriginal/KDB2/js/widgets/visWidgets/addPkzDrillthrough.js` (catalog/encode/org; `addIconAfterElement` ~1848–1889; `buildPkzDrillUrlFromConfig` ~1303–1466; BW ~307–556; DEZPV ~700–871; hash sanitize ~294–305)
- Tree BUILD evidence (not unused `generalFunctions/pkzDrillthrough/`): `laatsteOriginal/KDB2/js/filters/hierarchy/helpers/hierarchyTreeBuildHelpers.js` `buildDienststelleNodes` (parent/children/levelRank, textToId, idToText)
- Legacy CSS evidence: `laatsteOriginal/KDB2/css/widgets/KDBDroppedWidgets.css` `.kdb_hyperlink_icon` ~693–701 (do **not** copy `:has()` into `pdfCapture.css`)

`architecture/projectStructureRules.md` line limits: JS executable target 80–120, hard **150**; orchestrator target 40–80, hard **120**. `KDB.js` is the 500-line bootstrap exception (wiring only).

---

## Section B. Folder tree

Create/edit **only** the files in your assigned slice. Order inside a slice is creation order.

### Slice groups (implementers must not cross)

| Slice | Who | Paths |
|---|---|---|
| **A** | Service internals | All files under `KDB3/js/core/services/drillthrough/` including `__orchestratorDrillthrough.js` and `createDrillthroughService.js`. **No** register in `__orchestratorServices.js`. No DOM. No widgetVis. No CSS. No `KDB.js`. |
| **C** | Register | `__orchestratorServices.js` + `baseLinks.js` only. |
| **D** | widgetVis + widgetVis.css | Icon view/effects/CSS + orchestrator stamps + mount flag + wiring. **Not** `KDB.js`. Not `pdfCapture.css`. Not parent widgetVis markdown (that is **W**). |
| **F** | PDF hide | `pdfCapture.css` + two parent hide-set markdown one-liners. |
| **G** | Bootstrap mount | `KDB.js` mount one-liner only. |
| **W** | Parent widgetVis markdown sync | `contracts/widgetVis.md` + `contracts/widgetVis-port-execution-spec.md` only. **After D.** Mechanical table edits from the delta. |

Reviews B/E/H are not implementer slices.

### Slice A — create under `KDB3/js/core/services/drillthrough/`

```
drillthrough/
  config/datenart.js
  config/promptCatalog.js
  config/aufrissMaps.js
  config/monthLabels.js
  config/hierarchyTableKeys.js
  assemble/assembleIconAufriss.js
  assemble/assembleIconTime.js
  assemble/assembleIconDrillConfig.js
  assemble/assembleDatapointAufriss.js
  assemble/assembleDatapointTime.js
  assemble/assembleDatapointDrillConfig.js
  org/sanitizeHashValue.js
  org/parseHierarchyCell.js
  org/rankHierarchyRowKeys.js
  org/buildOrgTreeFromRows.js
  org/highestWins.js
  org/resolveOrgNodeId.js
  org/collectBwGruppeCandidates.js
  org/expandBwLevel001Children.js
  org/mapBwOrgPrompts.js
  org/normalizeDezpvValue.js
  org/mapDezpvOrgPrompts.js
  org/mapOrgPrompts.js
  encode/resolveHostEnv.js
  encode/encodeDrillthroughUrl.js
  effects/openBlankWindow.js
  diagnostics/createBuildResult.js
  buildDrillthroughUrl.js
  openDrillthrough.js
  createDrillthroughService.js
  __orchestratorDrillthrough.js
```

Extra org splits are **named now** so no file blows 150 (legacy BW/DEZPV/tree bodies are larger than 150 if copied as one function).

### Slice C — edit

- `KDB3/js/core/config/baseLinks.js`
- `KDB3/js/core/services/__orchestratorServices.js`

### Slice D — create under `KDB3/js/dashboard/widgets/widgetVis/`

```
widgetVis/
  effects/installDrillthrough.js
  effects/bindDrillthroughIconClick.js
  effects/assembleDrillthroughSpec.js
  effects/readDrillthroughVisYear.js
  effects/parseHierarchyCellForDrillthrough.js
  effects/buildOrgTreeForDrillthrough.js
  view/renderDrillthroughIcon.js
```

`parseHierarchyCellForDrillthrough.js` / `buildOrgTreeForDrillthrough.js` **copy** the service tree algorithm (same checklists). **Do not** AMD-import `core/services/drillthrough/**` internals (`module-public-api.mdc`).

### Slice D — edit

- `KDB3/js/dashboard/widgets/widgetVis/__orchestratorWidgetVis.js`
- `KDB3/js/dashboard/widgets/widgetVis/createWidgetVisController.js`
- `KDB3/js/dashboard/widgets/widgetVis/runtime/initializeRuntime.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/applyPostRenderCleanup.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/handleContentCreate.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/handleEnsureObservers.js`
- `KDB3/js/dashboard/widgets/widgetVis/config/defaults.js`
- `KDB3/css/widgets/widgetVis.css`

**KEEP unchanged:** `effects/cleanupDrillthroughDecorations.js`, `runtime/ensureWidgetRuntime.js` (already has `domRefs.drillthroughIconEl` + `drillthrough` bucket; capture keys unused).

### Slice F — edit

- `KDB3/css/widgets/pdfCapture.css`
- `contracts/dashboardPdf.md`
- `contracts/dashboardPdf-capture-chrome-hide-contractdelta.md`

### Slice G — edit

- `KDB3/js/KDB.js` (one-liner mount only)

### Slice W — edit (after D)

- `contracts/widgetVis.md` (only delta §9 listed section edits)
- `contracts/widgetVis-port-execution-spec.md` (only delta §10 list)

**Do not** modify: `drillthrough.md`, `widgetVis-drillthrough-service-contractdelta.md`, `dashboardPdf-drillthrough-icon-hide-contractdelta.md`.

**Section B file count (listed paths, create+edit):** **52** (A 31 + C 2 + D 14 + F 3 + G 1 + W 2).

---

## Shared MUST-match checklists (assemblers / org / encode)

Implementers execute these tables. Do not invent alternate maps. Source: `drillthrough.md` §6–§9. Evidence: `addPkzDrillthrough.js` as cited in Section A.

### Checklist 1 — Icon aufriss (`assembleIconAufriss.js`)

Normalize `visType` to lowercase. Treat `list` as `table`.

| visType | `p_aufspannen_1` | `p_aufspannen_2` |
|---|---|---|
| `line`, `table`, `list` | always `F_TST_SID` | mapped `selectedDimension` if present and not `default`/`none`/empty; else omit |
| `pie` | mapped `selectedDimension`, else default `GESCHLECHT` | omit |
| other | mapped `selectedDimension` if present; **no** Geschlecht default | omit |

Icon map (`mapDimensionToAufrissValue`; substring, case-insensitive). First match wins:

| Dimension contains | Prompt value |
|---|---|
| `geschlecht` | `GESCHLECHT` |
| `altersgruppe` | `ALTERSGRUPPE_SID` |
| `dienstverhältnis` / `dienstverhaeltnis` | `BEAMTER_VB` |
| `berufsfamilie` | `BERUFSFAMILIE_LANGTEXT` |
| `lehrlinge` | `LEHRLINGE` (**icon map only**) |
| `dienststelle` / `stelle` | BW → `DIENSTSTELLE_LANG_SID`; DEZPV → `DIENSTSTELLE_KURZ_TEXT` |
| else | `""` (omit prompt) |

Unmapped (empty) → warning `{ code: "DRILLTHROUGH_AUFRISS_UNMAPPED", message: "..." }` when a dimension was present but mapped to `""`. All warnings are `{ code, message }` objects (contract §8.2), never bare strings.

### Checklist 2 — Datapoint aufriss (`assembleDatapointAufriss.js`)

Walk `categories[]` in order. First `columnId` / `dataItemId` / `name` match wins. **No `LEHRLINGE`.** Never emit `p_aufspannen_2`.

| columnId contains | Prompt value |
|---|---|
| `geschlecht` | `GESCHLECHT` |
| `altersgruppe` | `ALTERSGRUPPE_SID` |
| `dienstverhältnis` / `dienstverhaeltnis` | `BEAMTER_VB` |
| `berufsfamilie` | `BERUFSFAMILIE_LANGTEXT` |
| `dienststelle` / `stelle` | BW → `DIENSTSTELLE_LANG_SID`; DEZPV → `DIENSTSTELLE_KURZ_TEXT` |
| else (no match) | omit `p_aufspannen_1` |

### Checklist 3 — Icon time (`assembleIconTime.js`) — never month-level

Icon **never** writes a month into `p_aktmon` (always `"{year} - 1"` = January). Ignore any month on the spec. Year pick: first non-null of `yearContext.highestYearFromVis`, `highestYearFromJahrFilter`, `defaultYear`.

| visType | Range / aktmon |
|---|---|
| `line` / `table` / `list` | If `highestYearFromVis`: `p_range = ja_bisMaxStichtag`, `p_aktmon = "{year} - 1"`. Else if `highestYearFromJahrFilter`: `ja_kalenderJahr` + `"{year} - 1"`. Else if `defaultYear`: `ja_kalenderJahr` + `"{year} - 1"`. Else omit both. |
| `pie` and other | Always `ja_kalenderJahr` when a year exists (same year pick order). `p_aktmon = "{year} - 1"`. No year → omit both. |

No year → warning `DRILLTHROUGH_YEAR_OMITTED`. Calendar fallback is **caller-supplied** `defaultYear`. Service must **not** call `Date.now` / `new Date()`.

### Checklist 4 — Datapoint time (`assembleDatapointTime.js`)

From `categories[]`: Jahr if id (`columnId`/`dataItemId`/`name`) contains `jahr`/`year` or numeric 1900–2100; Monat if id contains `monat`/`month` or mapped month label (checklist 4b).

| Extracted | `p_range` | `p_aktmon` |
|---|---|---|
| jahr only | `ja_kalenderJahr` | `"{jahr} - 1"` |
| jahr **and** month | **cleared / omitted** | `"{jahr} - {monatNumber}"` |
| neither | omitted | omitted |

### Checklist 4b — Month labels (`config/monthLabels.js`)

Copy live `mapMonthLabelToNumber` (`addPkzDrillthrough.js` ~918–985). Keys lowercased, strip `.`:

`jänner/januar/jan→1`, `februar/feb→2`, `märz/maerz/mrz/mar→3`, `april/apr→4`, `mai/may→5`, `juni/jun→6`, `juli/jul→7`, `august/aug→8`, `september/sep/sept→9`, `oktober/okt/oct→10`, `november/nov→11`, `dezember/dez/dec→12`. Numeric 1–12 from value or label also wins.

### Checklist 5 — Hash sanitize (`sanitizeHashValue.js`) — live whole-string, not unused per-`;` walker

Applied to org **member strings** before join/encode:

| Input | Output |
|---|---|
| `#ALLE_GG#` | keep `#ALLE_GG#` |
| ends with `#` (and not the marker above) | `"---"` (Dienststelle encode path) |
| contains `#` elsewhere | substring **before the first `#`** (whole string) |
| else | trim as-is |

DEZPV `|||#ALLE_GG#` markers keep the `#` until URL encode (§9). Do not sanitize the marker away. **`mapDezpvOrgPrompts` must not call `sanitizeHashValue` on marker strings** (they `endWith("#")` and would collapse to `"---"`). Apply checklist 5 to ordinary member ids only. Encode still runs `encodeOrg` on the joined `p_dezpv` string (leftover `#` → `%23`).

### Checklist 6 — Highest-wins (`highestWins.js`)

A selected node is dropped if **any ancestor** is also selected (walk `parent[0]`, guard 50). Remaining nodes are `highestSelections`. Selections that do not resolve in the tree are **kept** (appended after orchestrated members).

### Checklist 7 — BW (`mapBwOrgPrompts.js` + helpers)

Evidence: `addPkzDrillthrough.js` `computeBwDrillthroughOrchestrator` ~307–556. Contract §7.2 **wins** over live where they differ (MAG xor level-0 → warning, not silent empty).

- Never emit `p_dezpv_drillFromGDB`.
- **MAG + level 0** (any selected member `idValue`/`display` lowercased `"mag"` **and** `level === 0`): **both** `p_gruppe` and `p_dienststelle` **empty**. Success, not an error. Does **not** require a tree.
- If only one of MAG / level-0 matches: do **not** apply the empty MAG rule; continue orchestrator; push warning `DRILLTHROUGH_BW_MAG_LEVEL_MISMATCH`.
- Highest-wins on the BW tree (`dienststelle_bw_hierarchy`).
- **Level 001** selected: expand to **direct children** member ids as Dienststelle values (skip empty / `#ALLE_GG#`).
- `p_gruppe` is filled only when **every** highest selection is covered by a **candidate level-001 parent**. A level-001 node is a candidate if **it is selected** OR **all of its direct children** are selected.
- If `p_gruppe` is non-empty, **omit** `p_dienststelle` (do not send both).
- Else `p_dienststelle` = joined highest Dienststelle member ids (children expansion as above).
- `#ALLE_GG#` is never emitted as a BW Dienststelle member from the orchestrator expansion.
- Join multiple members with `;`.
- GG heuristic (fallback / display only): BW display starts with `Geschäftsgruppe` → treat as gruppe, not Dienststelle. **Orchestrator output wins** when it produces any non-empty org string.

### Checklist 8 — DEZPV (`mapDezpvOrgPrompts.js` + `normalizeDezpvValue.js`)

Evidence: `addPkzDrillthrough.js` ~700–871. Unused DEZPV “level-0 children as Dienststelle list” toggle is **not** ported.

- Never emit `p_dienststelle_drillFromGDB`.
- Highest-wins on the DEZPV tree (`dienststelle_dezpv_hierarchy`).
- Value normalize: trim; keep `---`; strip leading `DS_`; at **level 0** strip trailing `|ALLE`.
- For each **root** reached from a selection: always add normalized root id to `p_gruppe`.
- Marker eligibility: root selected **OR** all direct children selected → add `{normalizedRoot}|||#ALLE_GG#` to `p_dezpv`, and **do not** add descendants for that root.
- Other highest selections (level ≠ 0) whose root is **not** marker-eligible: add normalized member to `p_dezpv`.
- Unresolved (not in tree): still append to `p_dezpv`.
- GG heuristic (display only): first `|` then after-pipe starts with `ALLE#`. Orchestrator is canonical.

### Checklist 9 — Encode catalog + emit order (`encodeDrillthroughUrl.js`)

`p_datenart` hash **only** in `config/datenart.js`: `FA2B3F9D85EEDABE42016D7F23BB9EBAB19F030A`. Never duplicate full URLs in service config.

Encoder: config keys use one `p_`; query names use `p_p_*`. Tail **always**: `&format=HTML&Download=false&prompt=true`.

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

**Emit order (live):** art, datenart, org group, range, stichtag_or_range, dummy_validate, art_DrillFromGDB, kz pair, noBlock, KzBezeichnung, drillthroughFromGDB, drillthroughMultipleDstPossible, aktmon, aufriss (`aufspannen_1` + dummy), `aufspannen_2`.

**Encoding §9:** before `encodeURIComponent` replace `~` with space on **org** strings only. After, whole-string `.replace(/#/g, "%23")` on encoded org values. Do **not** double-encode `pathRef` (links already contain `%2F` / `%2B`). Host: `spec.hostEnv` or `window.location.href` contains `-dev` → `dev`; `-test` → `test`; else `prod`. Location is used **only** for this env key.

Empty `kennzahlCode` → omit kz prompts + warning `DRILLTHROUGH_KENNZAHL_OMITTED`.

### Checklist 10 — `DrillthroughBuildResult` / `DrillthroughOpenResult`

Shape exactly `drillthrough.md` §8.2. Open result uses `operation:"openDrillthrough"` and `failedStage:"openWindow"` on popup-block / open throw. `url` is still the built URL when open is blocked.

### Checklist 11 — Error codes (service)

`drillthrough.md` §10. Known failures: return result, do not throw. Do **not** collapse service codes into `WIDGET_VIS_DRILLTHROUGH_FAILED`.

| Code | Stage |
|---|---|
| `DRILLTHROUGH_MISSING_SPEC` | validateSpec |
| `DRILLTHROUGH_INVALID_SOURCE` | validateSpec |
| `DRILLTHROUGH_LINK_MISSING` | encodeUrl |
| `DRILLTHROUGH_HOST_UNRESOLVED` | encodeUrl |
| `DRILLTHROUGH_ORG_TREE_MISSING` | mapOrg |
| `DRILLTHROUGH_ORG_TREE_INVALID` | mapOrg |
| `DRILLTHROUGH_DATAPOINT_CATEGORIES` | assemble |
| `DRILLTHROUGH_BUILD_INTERNAL` | public catch |
| `DRILLTHROUGH_OPEN_BLOCKED` | openWindow |
| `DRILLTHROUGH_OPEN_INTERNAL` | public catch |

Warnings (still `ok:true` when otherwise valid): `DRILLTHROUGH_KENNZAHL_OMITTED`, `DRILLTHROUGH_SICHT_OMITTED`, `DRILLTHROUGH_YEAR_OMITTED`, `DRILLTHROUGH_AUFRISS_UNMAPPED`, `DRILLTHROUGH_BW_MAG_LEVEL_MISMATCH`.

### Checklist 12 — Org tree from KDB3 rows (`buildOrgTreeFromRows.js`)

Adapt `buildDienststelleNodes` (`hierarchyTreeBuildHelpers.js` ~34–221) to **row objects** (column keys = ranks). Do **not** import dienststelle files. Do **not** copy `generalFunctions/pkzDrillthrough/`. Do **not** copy `parentsParent` / `childrensChildren` / `selected` / `dataItemLabel` onto `OrgHierarchyTree` (not in contract §5.2).

**Row walk:**

1. If `Array.isArray(row)` → walk index `rank = 0..n-1`.
2. If object → `rankHierarchyRowKeys(row)` then walk that order.
3. Skip null/empty cells. `parseHierarchyCell` → `{ text, sourceId }`.
4. `getOrCreateIdForText(text)` (stable numeric ids starting at 1). If `sourceId` differs from text, set `idToMember[id].dataId`.
5. Left-to-right parent chain: each rank’s node `parent = [parentId]` or `[]`; append to parent’s `children`; `levelRank = rank` (keep lowest rank if seen again).
6. Return `{ sicht, tableKey, nodesById, idToMember: { text, dataId? }, textToNodeId }` per §5.2. `textToNodeId` maps both display text and `dataId` when present.

**`rankHierarchyRowKeys`:** extract rank from key: `/level0*(\d+)/i` or `/^(\d+)$/`; sort ascending; keys with no rank keep original `Object.keys` order **after** ranked keys. (**Gap:** live hierarchy column names are not in `tables.js`; this heuristic is the specified walk. Do not invent Cognos unique-names.)

**`parseHierarchyCell`:** object cell: text from `text|label|display|d|value|id` (KDB3 `readRows` default pick is `{ display, use }`, **not** `{ d, u }`); sourceId from `id` else last-bracket token of `use`/`useValue`/`u`/`value`. String/number cell: text = String(cell). Last-bracket: `/\[([^\]]+)\](?!.*\[[^\]]+\])/`.

**readRows (service fallback when `spec.orgTree` omitted):** injected `readRows` only, cache only. Call `readRows([{ tableName: tableKey }])` like `buildDienststelleTableDataInputs.js`. Never `loadTable` / `waitForRows`. Single-item input returns rows array or `undefined` (`resolveInputResults`). Missing/empty rows when selection present (non-MAG-empty) → `DRILLTHROUGH_ORG_TREE_MISSING`. Tree present but missing `nodesById` → `DRILLTHROUGH_ORG_TREE_INVALID`.

**build must not mutate `spec` or `orgTree`.**

---

## Section C. Per-file specifications

Shared AMD for every new `.js` file: full-compact `define([...], function (...) { ... });`, `"use strict";`, named entry + helpers at AMD factory scope only, **no inline subfunctions** inside the entry function / callbacks / return path. Underscore-prefix on boundary inputs only. Hard limit **150** (orchestrator **120**). No ES modules. No `window._KDB` in leaf files. No jQuery.

**Contract-vs-MUST exceptions (do not invent a destroy/runtime/state to satisfy generic template rows):**

- drillthrough owns **no** `_KDB.state.drillthrough`, **no** `_KDB.runtime.drillthrough`, **no** `destroy` (sibling: `widgetBindingPlan`).
- Public: named methods `{ buildDrillthroughUrl, openDrillthrough }` only.
- Known failures: return result objects; do not throw.
- widgetVis install/wiring failures: `WIDGET_VIS_DRILLTHROUGH_FAILED` — do **not** collapse service codes into that.

No other contract-vs-MUST conflict was found. If an implementer finds a **new** real conflict, STOP and report to the captain.

---

### Slice A files

#### `config/datenart.js`

- **Role**: declarative config
- **Lines**: target 12
- **AMD imports**: none
- **Return**: `{ HASH: "FA2B3F9D85EEDABE42016D7F23BB9EBAB19F030A" }` (exact)
- **Rules to apply**: `amd.mdc`; `naming.mdc` — UPPER_SNAKE constant; `feature-structure.mdc` — config folder; `error-handling.mdc` — config exempt.

#### `config/promptCatalog.js`

- **Role**: declarative config
- **Lines**: target 80
- **AMD imports**: none
- **Return**: object with (a) emit-order array of query param names matching checklist 9 **Emit order sentence** (art, datenart, org group, range, stichtag_or_range, dummy_validate, art_DrillFromGDB, kz pair, noBlock, KzBezeichnung, drillthroughFromGDB, drillthroughMultipleDstPossible, **aktmon**, aufriss, aufspannen_2) — **not** the catalog table row order (table lists aktmon before kz), (b) constants `{ stichtagOrRange: "Zeitraum", dummyValidate: "1", kzSource: "MASTER_FACT", noBlockAlleKz: "0", dummyAufriss: "0", drillthroughFromGdb: "ja", drillthroughMultipleDstPossible: "ja", tail: "&format=HTML&Download=false&prompt=true" }`. No full URLs.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc` — config.

#### `config/aufrissMaps.js`

- **Role**: declarative config
- **Lines**: target 70
- **AMD imports**: none
- **Return**: `{ iconMatchers: [...], datapointMatchers: [...] }` in checklist 1/2 order (lehrlinge **only** on icon). Each matcher `{ needles: string[], value: string|function(sicht) }`. `dienststelle`/`stelle` value depends on sicht BW vs DEZPV per checklists.
- **Factory-scope helper**: none required; if a resolve function is needed, name it `mapAufrissValue` at factory scope in the **assemble** files, not here.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `config/monthLabels.js`

- **Role**: declarative config
- **Lines**: target 50
- **AMD imports**: none
- **Return**: the monthMap object from checklist 4b (lowercase keys → 1–12).
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `config/hierarchyTableKeys.js`

- **Role**: declarative config
- **Lines**: target 15
- **AMD imports**: none
- **Return**: `{ BW: "dienststelle_bw_hierarchy", DEZPV: "dienststelle_dezpv_hierarchy" }` matching `KDB3/js/core/config/tables.js`.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `assemble/assembleIconAufriss.js`

- **Role**: assembler helper (`__controller`)
- **Lines**: target 90, hard 150
- **AMD imports**: `"../config/aufrissMaps.js"`
- **Factory-scope helpers**: `normalizeVisType(_visType)` (lowercase; `list`→`table`); `mapDimensionToAufrissValue(_dimension, _sicht)` (checklist 1).
- **Entry**: `function __controller(_spec, _warnings)`
- **Body steps**:
  1. Read `visType` / `selectedDimension` / `sicht` from spec (do not mutate spec).
  2. Apply checklist 1 table.
  3. Push `{ code: "DRILLTHROUGH_AUFRISS_UNMAPPED", message: "dimension did not map" }` onto `_warnings` when a non-empty dimension mapped to `""`.
  4. Return `{ p_aufspannen_1, p_aufspannen_2 }` (empty string = omit later).
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — try/catch, log `[drillthrough.assembleIconAufriss]`, rethrow (outer build converts); `events.mdc` — none; `state.mdc` — no owned/foreign state writes.

#### `assemble/assembleIconTime.js`

- **Role**: assembler helper (`__controller`)
- **Lines**: target 70, hard 150
- **AMD imports**: none
- **Factory-scope helpers**: `readYear(_yearContext)` (first non-null of the three fields, coerced to number); `formatAktmon(_year)` → `"{year} - 1"`.
- **Entry**: `function __controller(_spec, _warnings)`
- **Body**: checklist 3. Never write a month. No `Date`. Return `{ p_range_DrillFromGDB, p_aktmon_DrillFromGDB }`.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — try/catch, tag `[drillthrough.assembleIconTime]`; `state.mdc` — no writes.

#### `assemble/assembleIconDrillConfig.js`

- **Role**: assembler coordinator (`__controller`)
- **Lines**: target 60, hard 150
- **AMD imports**: `"./assembleIconAufriss.js"`, `"./assembleIconTime.js"`, `"../config/datenart.js"`
- **Entry**: `function __controller(_spec, _warnings)`
- **Body**:
  1. `Kennzahl_Code` = spec.kennzahlCode or `""`; if empty push `{ code: "DRILLTHROUGH_KENNZAHL_OMITTED", message: "kennzahlCode empty" }`.
  2. `p_art` = spec.sicht or `""`; if empty push `{ code: "DRILLTHROUGH_SICHT_OMITTED", message: "sicht empty" }`.
  3. `p_datenart` = datenart HASH.
  4. Call aufriss + time helpers.
  5. Return drillConfig keys (org keys left empty; `mapOrgPrompts` fills later). Include `source: "icon"`.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — try/catch `[drillthrough.assembleIconDrillConfig]`; `state.mdc` — no writes.

#### `assemble/assembleDatapointAufriss.js`

- **Role**: assembler helper (`__controller`)
- **Lines**: target 80, hard 150
- **AMD imports**: `"../config/aufrissMaps.js"`
- **Factory-scope helpers**: `categoryMatchText(_cat)` = first non-empty of columnId/dataItemId/name; `mapColumnToAufrissValue(_text, _sicht)` (checklist 2, **no LEHRLINGE**).
- **Entry**: `function __controller(_spec, _warnings)` — walk `categories[]` in order; first match wins; else omit `p_aufspannen_1`; never set `p_aufspannen_2`.
- **Rules to apply**: same as assembleIconAufriss; tag `[drillthrough.assembleDatapointAufriss]`.

#### `assemble/assembleDatapointTime.js`

- **Role**: assembler helper (`__controller`)
- **Lines**: target 90, hard 150
- **AMD imports**: `"../config/monthLabels.js"`
- **Factory-scope helpers**: `isJahrToken(_text)`; `readJahrNumber(_cat)`; `mapMonthLabelToNumber(_label, _value)` (checklist 4b); extract loop over categories.
- **Entry**: `function __controller(_spec, _warnings)` — checklist 4.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — `[drillthrough.assembleDatapointTime]`; `state.mdc`.

#### `assemble/assembleDatapointDrillConfig.js`

- **Role**: assembler coordinator (`__controller`)
- **Lines**: target 55, hard 150
- **AMD imports**: `"./assembleDatapointAufriss.js"`, `"./assembleDatapointTime.js"`, `"../config/datenart.js"`
- **Entry**: `function __controller(_spec, _warnings)`
- **Body**: if `categories` missing or not array → return `{ errorCode: "DRILLTHROUGH_DATAPOINT_CATEGORIES" }` (caller converts). Else same shared keys as icon assembler; **omit `p_aufspannen_2` always**. `source: "datapoint"`.
- **Rules to apply**: same as assembleIconDrillConfig; tag `[drillthrough.assembleDatapointDrillConfig]`.

#### `org/sanitizeHashValue.js`

- **Role**: pure helper (`__controller`)
- **Lines**: target 30
- **AMD imports**: none
- **Entry**: `function __controller(_value)` — checklist 5. One-liner-ish; try/catch optional (pure).
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — pure helper exempt if single return table; still no throw on bad input (return `""`).

#### `org/parseHierarchyCell.js`

- **Role**: org helper (`__controller`)
- **Lines**: target 70, hard 150
- **AMD imports**: none
- **Factory-scope helpers**: `extractLastBracketToken(_value)`; `cellText(_cell)`; `cellSourceId(_cell)` — copy algorithm from `hierarchyTreeBuildHelpers.js` ~56–96, KDB3 cells may be `{ d, u }` after default pick.
- **Entry**: `function __controller(_cell)` → `{ text, sourceId }` or null if no text.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — try/catch `[drillthrough.parseHierarchyCell]`, return null on throw; `state.mdc` — no writes.

#### `org/rankHierarchyRowKeys.js`

- **Role**: org helper (`__controller`)
- **Lines**: target 45
- **AMD imports**: none
- **Factory-scope helper**: `rankFromKey(_key)` per checklist 12.
- **Entry**: `function __controller(_row)` → array of keys in walk order. If `_row` is array, return indices as numbers.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `org/buildOrgTreeFromRows.js`

- **Role**: org builder (`__controller`)
- **Lines**: target 120, hard 150
- **AMD imports**: `"./parseHierarchyCell.js"`, `"./rankHierarchyRowKeys.js"`
- **Factory-scope helpers**: `getOrCreateIdForText(_text, _maps)` (textToNodeId + nextId); `ensureNode(_nodesById, _nodeId, _parentId, _rank)`.
- **Entry**: `function __controller(_rows, _sicht, _tableKey)`
- **Body**: checklist 12. `_rows` not array → empty tree still valid object with empty maps (caller decides missing). Do not mutate input rows.
- **Return**: `OrgHierarchyTree` §5.2.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — try/catch `[drillthrough.buildOrgTreeFromRows]`; `state.mdc` — no writes; `events.mdc` — none.

#### `org/highestWins.js`

- **Role**: org helper (`__controller`)
- **Lines**: target 50
- **AMD imports**: none
- **Factory-scope helper**: `hasSelectedAncestor(_nodeId, _nodesById, _selectedIdSet)` (parent[0], guard 50). Use object-map sets `{ [id]: true }`, not `Set`, to match widgetVis `var` style.
- **Entry**: `function __controller(_resolvedItems, _nodesById)` → `{ highest, unresolved }` (unresolved = items with null nodeId).
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `org/resolveOrgNodeId.js`

- **Role**: org helper (`__controller`)
- **Lines**: target 70, hard 150
- **AMD imports**: `"./sanitizeHashValue.js"`
- **Entry**: `function __controller(_sel, _tree)` — copy live `resolveNodeId` (~343–371 / DEZPV twin): try `textToNodeId[display]`, then sanitized idValue, then scan `idToMember` for dataId/text match. Return numeric id or null.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — `[drillthrough.resolveOrgNodeId]`.

#### `org/collectBwGruppeCandidates.js`

- **Role**: org helper (`__controller`)
- **Lines**: target 55
- **AMD imports**: none
- **Entry**: `function __controller(_nodesById, _selectedIdMap)` — checklist 7 candidate level-001 parents (levelRank === 1; selected OR all direct children selected). Return id map.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `org/expandBwLevel001Children.js`

- **Role**: org helper (`__controller`)
- **Lines**: target 50
- **AMD imports**: `"./sanitizeHashValue.js"`
- **Entry**: `function __controller(_node, _tree)` — member ids of direct children; skip empty / `#ALLE_GG#` after sanitize. Member id = `idToMember[id].dataId || text`.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `org/mapBwOrgPrompts.js`

- **Role**: BW orchestrator (`__controller`)
- **Lines**: target 120, hard 150
- **AMD imports**: `"./highestWins.js"`, `"./resolveOrgNodeId.js"`, `"./collectBwGruppeCandidates.js"`, `"./expandBwLevel001Children.js"`, `"./sanitizeHashValue.js"` (5 imports — OK)
- **Factory-scope helpers**: `isMag(_sel)`; `isLevel0(_sel)`; `memberIdFromNode(_nodeId, _tree)`; `isCoveredByCandidate(_nodeId, _nodesById, _candidateMap)` (parent walk guard 50).
- **Entry**: `function __controller(_orgSelection, _tree, _warnings)` — checklist 7. MAG+level0 empty both. MAG xor level-0 → warning + continue. Missing/invalid tree when still needed → return `{ errorCode: "DRILLTHROUGH_ORG_TREE_MISSING"|"DRILLTHROUGH_ORG_TREE_INVALID" }`. Unresolved appended after. Join `;`. Return `{ p_gruppe_drillFromGDB, p_dienststelle_drillFromGDB, p_dezpv_drillFromGDB: "" }`.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — `[drillthrough.mapBwOrgPrompts]`; `state.mdc`; `events.mdc` — none.

#### `org/normalizeDezpvValue.js`

- **Role**: org helper (`__controller`)
- **Lines**: target 35
- **AMD imports**: none
- **Entry**: `function __controller(_raw, _level)` — trim; keep `---`; strip leading `DS_`; if level === 0 strip trailing `|ALLE`.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `org/mapDezpvOrgPrompts.js`

- **Role**: DEZPV orchestrator (`__controller`)
- **Lines**: target 120, hard 150
- **AMD imports**: `"./highestWins.js"`, `"./resolveOrgNodeId.js"`, `"./normalizeDezpvValue.js"`, `"./sanitizeHashValue.js"`
- **Factory-scope helpers**: `walkRootId(_nodeId, _nodesById)`; `memberIdFromNode`; `isMarkerEligible(_rootId, _nodesById, _selectedIdMap)`.
- **Entry**: `function __controller(_orgSelection, _tree, _warnings)` — checklist 8. Return `{ p_gruppe_drillFromGDB, p_dezpv_drillFromGDB, p_dienststelle_drillFromGDB: "" }`. **Do not** run `sanitizeHashValue` on `{normalizedRoot}|||#ALLE_GG#` marker members.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — `[drillthrough.mapDezpvOrgPrompts]`.

#### `org/mapOrgPrompts.js`

- **Role**: org router (`__controller`)
- **Lines**: target 80, hard 150
- **AMD imports**: `"./mapBwOrgPrompts.js"`, `"./mapDezpvOrgPrompts.js"`, `"./buildOrgTreeFromRows.js"`, `"../config/hierarchyTableKeys.js"`
- **Factory-scope helpers**: `normalizeSicht(_sicht)` (upper trim); `hasSelection(_orgSelection)`; `resolveTree(_spec, _sicht, _readRows)` — prefer `spec.orgTree`; else cache `readRows([{ tableName }])` then `buildOrgTreeFromRows`; never call dienststelle snapshot as tree.
- **Entry**: `function __controller(_spec, _deps, _warnings)`
- **Body**:
  1. If no sicht → empty org strings (sicht warning already pushed by assembler).
  2. If no selectedValues → empty org strings (valid).
  3. Resolve tree; MAG-empty BW may skip tree requirement (mapBw handles).
  4. BW vs DEZPV route. Do not mutate spec/orgTree.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — `[drillthrough.mapOrgPrompts]`; `state.mdc` — may **read** tableData cache only via injected `readRows`; never write tableData; `runtime.mdc` — no runtime subtree.

#### `encode/resolveHostEnv.js`

- **Role**: encode helper (`__controller`)
- **Lines**: target 25
- **AMD imports**: none
- **Entry**: `function __controller(_spec)` — if `spec.hostEnv` is `dev|test|prod` return it; else `window.location.href` `-dev` / `-test` / else `prod`. Return null only if location unavailable and no spec.hostEnv → `DRILLTHROUGH_HOST_UNRESOLVED` at encode.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `dom.mdc` — location is host-key only, not DOM scrape.

#### `encode/encodeDrillthroughUrl.js`

- **Role**: encoder (`__controller`)
- **Lines**: target 120, hard 150
- **AMD imports**: `"../config/promptCatalog.js"`, `"../config/datenart.js"`, `"./resolveHostEnv.js"`
- **Factory-scope helpers**: `encodeOrg(_raw)` (`~`→space then `encodeURIComponent` then `.replace(/#/g, "%23")`); `pair(_name, _value)`; `omitEmpty`.
- **Entry**: `function __controller(_drillConfig, _links, _spec)`
- **Body**: checklist 9 emit order + omit rules. Base URL = `_links.pkzAnalysetool[hostEnv]` (injected links object). Empty/missing → `{ errorCode: "DRILLTHROUGH_LINK_MISSING" }`. Host unresolved → `{ errorCode: "DRILLTHROUGH_HOST_UNRESOLVED" }`. Do not double-encode pathRef. Concat filters + catalog tail. Return `{ url, hostEnv }` or `{ errorCode }`.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — `[drillthrough.encodeDrillthroughUrl]`; `kdb-object.mdc` — links from factory injection, not `window._KDB`.

#### `effects/openBlankWindow.js`

- **Role**: effect (`__controller`)
- **Lines**: target 20
- **AMD imports**: none
- **Entry**: `function __controller(_url)` — `return window.open(_url, "_blank");` only. try/catch: log `[drillthrough.openBlankWindow]`, rethrow (openDrillthrough converts).
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc` — effects folder; `error-handling.mdc`; `dom.mdc` — `window.open` is the documented service effect, not widgetVis.

#### `diagnostics/createBuildResult.js`

- **Role**: result factory (`__controller`)
- **Lines**: target 70
- **AMD imports**: none
- **Entry**: `function __controller(_partial)` — fill checklist 10 defaults: `ok`, `status`, `errorCode`, `errorMessage`, `url`, `source`, `widgetId`, `drillConfig` (never include Cognos `info`), `diagnostics: { service: "drillthrough", operation, hostEnv, failedStage, warnings }`. Clone warnings array shallowly. Do not mutate `_partial`.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `state.mdc` — serializable result only; sibling `createPlanSuccess.js` shape, not widgetBindingPlan fields.

#### `buildDrillthroughUrl.js`

- **Role**: public-method implementation (`__controller`)
- **Lines**: target 110, hard 150
- **AMD imports**: `"./assemble/assembleIconDrillConfig.js"`, `"./assemble/assembleDatapointDrillConfig.js"`, `"./org/mapOrgPrompts.js"`, `"./encode/encodeDrillthroughUrl.js"`, `"./diagnostics/createBuildResult.js"` (5)
- **Factory-scope helpers**: `isObject(_v)`; `validateSpec(_spec)` → `{ errorCode }` or null (`MISSING_SPEC` / `INVALID_SOURCE` only).
- **Entry**: `function __controller(_spec, _deps)`
- **Body**:
  1. try.
  2. validateSpec; fail → createBuildResult ok:false, failedStage `validateSpec`.
  3. warnings = [].
  4. source icon → assembleIcon; datapoint → assembleDatapoint; if datapoint returns DATAPOINT_CATEGORIES → fail assemble.
  5. mapOrgPrompts; if errorCode → fail mapOrg.
  6. merge org strings onto a **new** drillConfig object (do not mutate assembler output if that would mutate spec — always assign to a fresh object).
  7. encode; if errorCode → fail encodeUrl.
  8. return success result with url, drillConfig, warnings, operation `buildDrillthroughUrl`.
  9. catch → `console.error("[drillthrough.buildDrillthroughUrl]", err)` → `DRILLTHROUGH_BUILD_INTERNAL`.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — public catch converts, no throw; `state.mdc` — no owned state; `runtime.mdc` — no runtime subtree; `events.mdc` — none; `module-public-api.mdc` — named method impl.

#### `openDrillthrough.js`

- **Role**: public-method implementation (`__controller`)
- **Lines**: target 50
- **AMD imports**: `"./buildDrillthroughUrl.js"`, `"./effects/openBlankWindow.js"`, `"./diagnostics/createBuildResult.js"`
- **Entry**: `function __controller(_spec, _deps)`
- **Body**:
  1. try.
  2. `built = _buildDrillthroughUrl(_spec, _deps)`.
  3. If `built.ok !== true` → return built with `diagnostics.operation = "openDrillthrough"` (do **not** open).
  4. `handle = _openBlankWindow(built.url)`.
  5. If handle == null → ok:false, `DRILLTHROUGH_OPEN_BLOCKED`, failedStage `openWindow`, **url still present**.
  6. Else success, operation `openDrillthrough`.
  7. catch → `console.error("[drillthrough.openDrillthrough]", err)` → `DRILLTHROUGH_OPEN_INTERNAL`.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc`; `state.mdc`; `runtime.mdc` — no destroy/abort for `window.open`; `events.mdc` — none.

#### `createDrillthroughService.js`

- **Role**: service factory
- **Lines**: target 40, hard 150
- **AMD imports**: `"./buildDrillthroughUrl.js"`, `"./openDrillthrough.js"`
- **Factory-scope helpers**: `bindBuild(_deps, _spec)` → `_buildDrillthroughUrl(_spec, _deps)`; `bindOpen(_deps, _spec)` → `_openDrillthrough(_spec, _deps)`. **Do not** nest `function buildDrillthroughUrl` inside the factory (lift with `.bind`).
- **Factory parameters**: `_options` (boundary). Expected keys: `links` (`_KDB.config.links`), `readRows` (function or null).
- **Entry**: `function createDrillthroughService(_options)`
- **Body**: `deps = { links: _options && _options.links ? _options.links : null, readRows: _options && typeof _options.readRows === "function" ? _options.readRows : null }`; return `{ buildDrillthroughUrl: bindBuild.bind(null, deps), openDrillthrough: bindOpen.bind(null, deps) }`. No `dispatch`, `getState`, `mount`, `destroy`.
- **Rules to apply**: `module-public-api.mdc` — named methods only; **exception**: no destroy / disposed-state table (contract). `state.mdc` — no owned state / do not write foreign state. `runtime.mdc` — no runtime subtree / no destroy. `error-handling.mdc` — methods convert via build/open. `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `kdb-object.mdc` — factory does not register; orchestrator does. `events.mdc` — none.

#### `__orchestratorDrillthrough.js`

- **Role**: module orchestrator
- **Lines**: target 35, hard 120
- **AMD imports**: `"./createDrillthroughService.js"`
- **Entry**: `function __orchestrator(_KDB, _options)`
- **Body**:
  1. try.
  2. `_KDB.services = _KDB.services || {}`.
  3. `links = _KDB.config && _KDB.config.links ? _KDB.config.links : null`.
  4. `readRows = _KDB.services.tableData && typeof _KDB.services.tableData.readRows === "function" ? _KDB.services.tableData.readRows.bind(_KDB.services.tableData) : null`.
  5. `service = _createDrillthroughService({ links: links, readRows: readRows })`.
  6. `_KDB.services.drillthrough = service`.
  7. return service.
  8. catch → `console.error("[drillthrough.__orchestrator] service startup failed", error)`; throw (sibling widgetBindingPlan).
- **No business logic.** Slice A writes this file; slice C **registers** the call.
- **Rules to apply**: `kdb-object.mdc` — registers `_KDB.services.drillthrough`; thin orchestrator. `feature-structure.mdc`; `amd.mdc`; `naming.mdc` — `__orchestrator`; `error-handling.mdc` — startup catch; `state.mdc` — do not seed `_KDB.state.drillthrough`; `runtime.mdc` — do not seed `_KDB.runtime.drillthrough`; `module-public-api.mdc` — named-method service surface.

---

### Slice C files

#### `KDB3/js/core/config/baseLinks.js` (edit)

- **Role**: declarative links config
- **Change only**: add `pkzAnalysetool: { dev, test, prod }` with the **exact** three strings from `drillthrough.md` §13.1 (all include `/Personal/`). Keep existing `kdbControlHandbookUrl` / `userManualUrl` / `dataSpotUrl`. Do not put datenart hash here. `__orchestratorConfig.js` already Object.assigns `baseLinks` — **no change**.
- **Rules to apply**: `naming.mdc`; `amd.mdc`; `kdb-object.mdc` — `_KDB.config.links` home.

#### `KDB3/js/core/services/__orchestratorServices.js` (edit)

- **Role**: services bootstrap orchestrator
- **Change only**:
  1. Add AMD dep `"./drillthrough/__orchestratorDrillthrough.js"` after writeback (or after widgetBindingApply; **before** collectReplayHandlers is also fine if import order matches params — **required call site** is `registerEarlyServices` **after** `_orchestratorWriteback(_KDB);`, before the function’s closing).
  2. Add factory param `_orchestratorDrillthrough` in the same position as the deps array.
  3. In `registerEarlyServices`, after `_orchestratorWriteback(_KDB);` call `_orchestratorDrillthrough(_KDB);`.
- Do **not** reformat the whole file’s blank-line style more than needed for the new import. Do not add drillthrough to `destroyCoreServices` (no destroy).
- **Rules to apply**: `kdb-object.mdc`; `feature-structure.mdc`; `amd.mdc` — import/param order 1:1.

---

### Slice D files

#### widgetVis calendar helper (factory-scope in `assembleDrillthroughSpec.js`)

```
function readDefaultCalendarYear() {
  var now = new Date();
  var month = now.getMonth(); // 0-based
  var year = now.getFullYear();
  return month <= 1 ? year - 2 : year - 1;
}
```

March–December → `currentYear - 1`. January–February → `currentYear - 2`. **`new Date()` ONLY here**, never in the service.

#### `effects/parseHierarchyCellForDrillthrough.js`

- **Role**: widgetVis copy of service `org/parseHierarchyCell.js` (same checklist 12). **Do not** AMD-import the service file.
- **Lines**: target 70
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — `[widgetVis.parseHierarchyCellForDrillthrough]`.

#### `effects/buildOrgTreeForDrillthrough.js`

- **Role**: preferred `orgTree` builder for assemble
- **Lines**: target 120, hard 150
- **AMD imports**: `"./parseHierarchyCellForDrillthrough.js"`
- **Factory-scope helpers**: copy `rankHierarchyRowKeys` + `getOrCreateIdForText` + walk from checklist 12 **into this file** (keep parse imported). If this file would exceed 150, the rank helper must be inlined compactly — **do not** add a third widgetVis file; keep parse split as already named.
- **Entry**: `function __controller(_options)` with `{ readRows, sicht }`.
  1. If `typeof readRows !== "function"` return null.
  2. `tableKey` from sicht BW/DEZPV (`dienststelle_bw_hierarchy` / `dienststelle_dezpv_hierarchy`).
  3. `rows = readRows([{ tableName: tableKey }])`; if not array/empty → null.
  4. Build `OrgHierarchyTree`; try/catch log `[widgetVis.buildOrgTreeForDrillthrough]`, return null.
- **Never** `loadTable` / `waitForRows`. Never `_KDB.services.tableData` lookup — `readRows` is stamped.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc`; `state.mdc` — cache read only; `kdb-object.mdc` — no `window._KDB`.

#### `effects/assembleDrillthroughSpec.js`

- **Role**: spec assembler (`__controller`)
- **Lines**: target 120, hard 150
- **AMD imports**: `"./readEffectiveSettingsContext.js"`, `"./readVisualizationFacet.js"`, `"./buildOrgTreeForDrillthrough.js"`, `"./readDrillthroughJahrYear.js"`, `"./readDrillthroughVisYear.js"` (5)
- **Factory parameters / entry `_options`**: `{ _KDB, widgetId, sichtApi, dienststelleApi, tableDataReadRows }`. May receive `_KDB` as parameter (existing widgetVis pattern). **Must not** read `_KDB.services.drillthrough` or `_KDB.cognosAPI`.
- **Factory-scope helpers**: `readDefaultCalendarYear` (above); `normalizeSicht(_sichtState)`; `mapOrgSelectionFromSnapshot(_snapshot)`; `readJahrYearFromFilter(_KDB, _metricsTable)`; `readKennzahlCode(_KDB, _widgetId)`; `readVisType(_KDB, _widgetId, _settings)`.
- **OrgSelection mapping** from `dienststelleApi.getCurrentHierarchySnapshot()` (`readCurrentHierarchySnapshot.js` ~106–126): `resolution.dominantValues` / `downstreamValues` are **string[] useValues**; `displayValues` is string[]. Map each useValue to `{ useValue, displayValue, idValue, level }`. `idValue` = last-bracket token of useValue else display. `level` = first `/level0*(\d+)/i` on useValue, else null (service may resolve from tree). **Snapshot is not the tree.** Empty/missing snapshot → `{ selectedValues: [] }`.
- **sicht**: `sichtApi.getState()` → `currentSelection.displayValue` or `activeSichtValue` (`sicht/state/initialState.js`). Pass through as string (`BW`/`DEZPV`/other).
- **visType**: settings via `readEffectiveSettingsContext(_KDB, widgetId, {}, visRecord)` first. If stamped `visualizationFacet.getVisType(widgetId)` returns a **sync** `{ ok:true, data }`, use `data`. If it returns a Promise / `.then`, **do not await** (T1 assemble is sync) — keep settings fallback. Normalize lowercase.
- **selectedDimension**: settings `dimension` (`none`/`default`/empty = absent for aufriss).
- **kennzahlCode**: vis derived `code` (`controllerHelpers.readMetric` / `state.widgets.vis.byId[id].derived.code`).
- **yearContext.highestYearFromJahrFilter**: same path as `resolveTopNJahrFilterValue.js` `readGlobalJahrPageContextValue` — `filtersFacet.readFilterValues({ itemId: jahrColumnId, scopeId: "global" })` using `topNHelper.resolveTableEntry(metricsTable).jahrColumnId`. Parse numeric year from `{ d, u }`. Do **not** call `waitForRows` here (that path is TopN fallback, not drillthrough).
- **yearContext.highestYearFromVis**: `_readDrillthroughVisYear(_KDB, widgetId)` — **sync** `dataQuery.peekQueryRows` on the existing stamp. Do **not** await `readQueryRows` on click. Miss / thenable `getResult` → `null` (Jahr then calendar). Line/table/list emit `ja_bisMaxStichtag` when a vis year is present.
- **yearContext.defaultYear**: `readDefaultCalendarYear()`.
- **orgTree**: `buildOrgTreeForDrillthrough({ readRows: tableDataReadRows, sicht })` or omit (null) for service cache fallback.
- **Return**: `{ source: "icon", widgetId, visType, selectedDimension, kennzahlCode, sicht, orgSelection, orgTree, yearContext, hostEnv: null }`. No `p_p_*`. No datapoint `categories`.
- **Do not** scrape `.KDB_optionSelected`.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `error-handling.mdc` — try/catch `[widgetVis.assembleDrillthroughSpec]`, return null on throw (click/install treat as wiring fail); `state.mdc` — read vis/settings/sicht/dienststelle via APIs, no foreign writes; `events.mdc` — none; `kdb-object.mdc` — no `window._KDB`.

#### `effects/readDrillthroughVisYear.js`

- **Role**: executable helper (`__controller`)
- **Lines**: target 90, hard 150
- **AMD imports**: none required besides none; read stamp from `_KDB.runtime.widgetVis.dataQueryFacet` (same choke as other `read*Facet.js` files — inline `readDataQueryStamp` at factory scope, or a one-file stamp read). Must not look up `_KDB.services.cognosHost` or `_KDB.cognosAPI`.
- **Factory-scope helpers**: `readDataQueryStamp(_KDB)`; `parseYearFromCell(_raw)` (same 1900–2100 parse as `readDrillthroughJahrYear.js`); `findJahrColumnName(_columnNames)`; `maxYearFromTableRows(_rows)`; `__controller(_KDB, _widgetId)`.
- **Body**: if no stamp or no `peekQueryRows`, return `null`. Call `peekQueryRows(widgetId)` **sync**. If the return has `.then`, return `null` (do not await). If `ok !== true` or `data` is null, return `null`. First `columnNames` entry whose lowercased name includes `"jahr"` or `"year"`; `Math.max` of parsed years in that column. No visType gate. No `waitForRows`. No month.
- **Rules to apply**: `amd.mdc` — factory-scope named helpers, no nested functions in `__controller`; `naming.mdc`; `error-handling.mdc` — try/catch `[widgetVis.readDrillthroughVisYear]`, return `null`; `kdb-object.mdc` — no `window._KDB`; `feature-structure.mdc` — 150 hard.

#### `view/renderDrillthroughIcon.js`

- **Role**: view builder/placer (`__controller`)
- **Lines**: target 90, hard 150
- **AMD imports**: `"../../../../core/cognosHost/config/widgetChromeSelectors.js"`, `"../config/defaults.js"`
- **Factory-scope helpers**: `readChrome()` → `widget.strings` + `focusMode.strings`; `findExistingIcon(_host, _iconClass)`; `ensureWrapper(_host, _chrome)`; `createAnchor(_defaults)`.
- **Entry**: `function __controller(_options)` `{ widgetId, hostEl, iconClass, iconPath }`
- **Body (idempotent locate-or-create)**:
  1. If `!hostEl` return `{ ok:false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED", errorMessage: "missing widgetIcons host" }`.
  2. If `_hostEl.querySelector("." + iconClass)` exists: reuse its wrapper (`closest` `dataWidgetIcon` + `liveWidgetAnnotations` or parent). **Do not remove-and-recreate** (legacy `addIconAfterElement` ~1858–1863 removed; T1 reuses).
  3. Else create `div` with classes `dataWidgetIcon` + `liveWidgetAnnotations` (chrome tokens `dataWidgetIconClass` / `liveWidgetAnnotationsClass`), `role="application"`. First child: `a` with class `kdb_hyperlink_icon` (defaults token), `href="#"`, `title` optional `"PKZ Analysetool"`. `insertBefore` / `prepend` as **first child** of host (legacy prepend).
  4. Return `{ ok:true, wrapperEl, anchorEl }`. **No event logic.**
- **Rules to apply**: `dom.mdc` — Builder/Placer; chrome tokens; scoped from host; live ref returned for runtime. `amd.mdc`; `naming.mdc` — legacy class `.kdb_hyperlink_icon` is PO exception to `kdb-` kebab. `feature-structure.mdc` — view folder. `error-handling.mdc` — `[widgetVis.renderDrillthroughIcon]`. `state.mdc` — no state writes.

#### `effects/bindDrillthroughIconClick.js`

- **Role**: click binder (`__controller`)
- **Lines**: target 70, hard 150
- **AMD imports**: `"./assembleDrillthroughSpec.js"`
- **Factory-scope helper**: `onIconClick(_ctx, _event)` — `preventDefault` / `stopPropagation`; `spec = _assembleDrillthroughSpec({ _KDB: _ctx._KDB, widgetId: _ctx.widgetId, sichtApi: _ctx.sichtApi, dienststelleApi: _ctx.dienststelleApi, tableDataReadRows: _ctx.tableDataReadRows })`; if spec is null, log + stop; `service = _ctx.drillthroughService`; if missing, log + stop (install should have skipped); `result = service.openDrillthrough(spec)`; if `result && result.ok === false` log `[widgetVis.bindDrillthroughIconClick]` with **service** `errorCode` (do **not** remap to `WIDGET_VIS_DRILLTHROUGH_FAILED`).
- **Entry**: `function __controller(_options)` `{ _KDB, widgetId, anchorEl, runtime, drillthroughService, sichtApi, dienststelleApi, tableDataReadRows }`
- **Body**:
  1. If previous `runtime.listeners.drillthroughIconClick` is a function, call it (idempotent re-bind).
  2. `addEventListener("click", bound, true)` (capture like gear).
  3. Store dispose on `runtime.listeners.drillthroughIconClick` so `cleanupDrillthroughDecorations.js` (keys containing `drillthrough`) tears it down.
  4. Return dispose function.
- **Must not**: `window.open`, `p_p_*` encode, `_KDB.cognosAPI`, content-selection listeners, CTRL, 3s capture.
- **Rules to apply**: `dom.mdc` — listener body thin, delegates to named helper; `runtime.mdc` — listener has cleanup path; `error-handling.mdc` — `[widgetVis.bindDrillthroughIconClick]`; `events.mdc` — none (DOM click only); `state.mdc` — no history/settings writes.

#### `effects/installDrillthrough.js`

- **Role**: coordinator (`__controller`)
- **Lines**: target 110, hard 150
- **AMD imports**: `"../runtime/ensureWidgetRuntime.js"`, `"../view/resolveVisualizationContent.js"`, `"../view/renderDrillthroughIcon.js"`, `"./bindDrillthroughIconClick.js"`, `"./focusMode/domQueries.js"`, `"../config/defaults.js"` (6 — smell ceiling, do not add more)
- **Factory-scope helpers**: `readEnableFlag(_KDB)`; `readStamps(_KDB)`; `resolveIconHost(_widgetId, _runtime, _chrome)` — if `domQueries.isWidgetExpanded(widgetId)` use `resolveExpandModeContainer(widgetId)` then `.widgetHeader .widgetIcons` (chrome tokens). Else canvas shell `[data-kdb-widget-id]` / `getElementById` then header `.widgetIcons`. Locate-or-create `.widgetIcons` like `placeWidgetToolbar.js` ~18–23 if header exists and icons missing. **Do not** query `.KDB_focusModeSettingsPanel`.
- **Entry**: `function __controller(_options)` `{ _KDB, widgetId }`
- **Body**:
  1. try.
  2. If `enableDrillthrough === false` → `{ ok:true, skipped:true, reason:"disabled" }`.
  3. `runtime = ensureWidgetRuntime(_KDB, widgetId)`.
  4. Stamps: `drillthroughService` from `_KDB.runtime.widgetVis.drillthroughService`. Missing or missing `openDrillthrough` → `{ ok:false, errorCode:"WIDGET_VIS_DRILLTHROUGH_FAILED", errorMessage:"missing drillthrough service stamp" }` (skip plant).
  5. Resolve host; if no header/content host → `{ ok:false, errorCode:"WIDGET_VIS_DRILLTHROUGH_FAILED", errorMessage:"missing header icons host" }`.
  6. `renderDrillthroughIcon`; on fail return that error code.
  7. `bindDrillthroughIconClick` with sicht/dienststelle APIs from `_KDB.api.sicht` / `_KDB.api.dienststelle` passed as params (install may read `_KDB.api.*` because it is called from controller context; it still must not use `_KDB.services.drillthrough` or `_KDB.cognosAPI`).
  8. `runtime.domRefs.drillthroughIconEl = wrapperEl`.
  9. `runtime.drillthrough.installed = true`. Leave capture keys unused.
  10. catch → `console.error("[widgetVis.installDrillthrough]", widgetId, err)` → `{ ok:false, errorCode:"WIDGET_VIS_DRILLTHROUGH_FAILED" }`.
- **Must not**: selection listeners, capture window/flush, `p_p_*`, `window.open`, clone onto focus panel.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `dom.mdc`; `runtime.mdc` — icon + click owned by widgetVis byId runtime; `error-handling.mdc`; `state.mdc` — do not write settings/history; do **not** dispatch `ERROR_RECORDED` (would mark vis record error; contentCreate must still succeed). Callers attach `diagnostics.drillthrough` only. `events.mdc` — none.

#### `__orchestratorWidgetVis.js` (edit)

- **Change `stampHostFacets` only** (keep existing visualization/widgets/filters stamps):
  - `_KDB.runtime.widgetVis.drillthroughService = _KDB.services && _KDB.services.drillthrough ? _KDB.services.drillthrough : null`
  - `_KDB.runtime.widgetVis.tableDataReadRows = _KDB.services && _KDB.services.tableData && typeof _KDB.services.tableData.readRows === "function" ? _KDB.services.tableData.readRows.bind(_KDB.services.tableData) : null`
  - `_KDB.runtime.widgetVis.dataQueryFacet = service && service.dataQuery ? service.dataQuery : null` (stamp already present; assemble peeks via `peekQueryRows`, does not await `readQueryRows`)
- Deep files read these stamps. Stay ≤120. Do not reformat unrelated lines.
- **Rules to apply**: `kdb-object.mdc`; `amd.mdc`; `feature-structure.mdc` — thin orchestrator.

#### `createWidgetVisController.js` (edit)

- **`mount(instance, _options)` only extra**: `opts = _options || {}`; `enable = opts.enableDrillthrough !== false` (default **true**); after `_initializeRuntime`, set `_KDB.runtime.widgetVis.enableDrillthrough = enable`. Do not store in `_KDB.state`. Do not change destroy/dispatch.
- **Rules to apply**: `module-public-api.mdc`; `runtime.mdc` — flag is module runtime; `state.mdc` — not state; `error-handling.mdc` — existing mount try/catch stays.

#### `runtime/initializeRuntime.js` (edit)

- After creating buckets, if `runtime.enableDrillthrough == null` set `true` (default). Do not invent new owners.
- **Rules to apply**: `runtime.mdc`; `amd.mdc`.

#### `config/defaults.js` (edit)

- Keep `drillthroughIconPath`. Add `drillthroughIconClass: "kdb_hyperlink_icon"`. Do not add capture constants.
- **Rules to apply**: `naming.mdc` — legacy class token; `amd.mdc`.

#### `effects/applyPostRenderCleanup.js` (edit)

- Currently ~72 lines, 4 imports. Add `"./installDrillthrough.js"` (this file already lives in `effects/`; do **not** use `"../effects/installDrillthrough.js"`). After tooltip try/catch, **add icon re-install** (not capture flush): `diagnostics.drillthrough = _installDrillthrough({ _KDB: options._KDB, widgetId: widgetId })` in try/catch; log `[widgetVis.applyPostRenderCleanup] drillthrough install failed`; **do not** flip top-level `ok` (title-only, existing comment). Stay ≤150 (expected ~90).
- **Rules to apply**: `dom.mdc`; `runtime.mdc`; `error-handling.mdc`; `amd.mdc`.

#### `actions/handleContentCreate.js` (edit)

- Currently 9 AMD imports (smell). Adding install = **10** (restructure threshold; do not add an 11th).
- After `registerContentContext(...)` (which already resolves content-ready — install must **not** run before that), call install when `enableDrillthrough !== false` AND header/content exists (`ensureWidgetRuntime` + `resolveVisualizationContent` already ran inside register). Compact try/catch; on fail `console.error("[widgetVis.handleContentCreate] drillthrough", widgetId, err)` — **contentCreate still returns success**. Do **not** wait on drillthrough. Do **not** dispatch `ERROR_RECORDED` for install fail. Do **not** change `WIDGET_VIS_CONTENT_CREATE_FAILED` paths.
- Target 148, hard 150. Keep the install block ≤8 lines in the entry (helpers at factory scope: `runContentCreateDrillthroughInstall(_context, _widgetId)`).
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `feature-structure.mdc` — 10 imports at ceiling; `error-handling.mdc`; `state.mdc`; `runtime.mdc`.

#### `actions/handleEnsureObservers.js` (edit)

- Unpark: after focus + legend, call `_installDrillthrough({ _KDB: _context._KDB, widgetId: widgetId })` (idempotent). Attach `diagnostics.drillthrough`. Install failure does **not** fail unpark `ok` unless focus already failed. Import install (4th import).
- **Rules to apply**: `amd.mdc`; `runtime.mdc`; `error-handling.mdc`; `dom.mdc`.

#### `KDB3/css/widgets/widgetVis.css` (edit)

- **ADD** after existing `.kdb_hyperlink` rules (do **not** edit `.kdb_hyperlink`):

```css
.kdb_hyperlink_icon {
    display: inline-block;
    width: 16px;
    height: 16px;
    background-image: url(../../images/pkzDrillthrough.png);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
}
```

- Size the `<a>` (PNG is 16×16). Relative url from `KDB3/css/widgets/` is `../../images/pkzDrillthrough.png`. Prefer **no** `:has()`. Optional companion wrapper size **only if** needed for paint; do not hide wrappers. Asset exists: `KDB3/images/pkzDrillthrough.png` (no new icon).
- **Rules to apply**: `dom.mdc` / `naming.mdc` — legacy class; do not touch title hyperlink.

---

### Slice F files

#### `KDB3/css/widgets/pdfCapture.css` (edit)

- Add **one** selector to the **existing grouped rule** (currently ends at `.widget.liveWidget.maximizable .resizeEdge.topRight`):

`#main.kdb-pdf-capturing .kdb_hyperlink_icon`

Same `display: none !important`. No second rule. **No `:has()`**. Do **not** hide `.dataWidgetIcon` / `.widgetIcons` / `.liveWidgetAnnotations`. Residual empty 20×20 wrapper accepted.

#### `contracts/dashboardPdf.md` (edit)

- In Execution Contract stage 2 hide-set sentence: append `, .kdb_hyperlink_icon` immediately after `.widget.liveWidget.maximizable .resizeEdge.topRight`. No other wording.

#### `contracts/dashboardPdf-capture-chrome-hide-contractdelta.md` (edit)

- §3 Hide-set bullets: add `- `.kdb_hyperlink_icon` (PKZ drillthrough `<a>`)` after the `.resizeEdge.topRight` bullet. No other wording.

---

### Slice G files

#### `KDB3/js/KDB.js` (edit)

- Change **only** `_KDB.api.widgetVis.mount({})` → `_KDB.api.widgetVis.mount({ enableDrillthrough: true })` (today line ~83). No other bootstrap changes. Services orchestrator already runs before feature mount; drillthrough must be registered in slice C first.
- **Rules to apply**: `kdb-object.mdc`; `feature-structure.mdc` — KDB.js bootstrap exception; `amd.mdc`.

---

### Slice W files (after D)

Mechanical parent sync. Delta wins until this slice. **Do not** rewrite the whole files. **Do not** touch the three approved contracts.

**Note (2026-08-30):** The Slice W table below is the T1 parent sync already applied. T2 F1c+S2 parent wording lives in `widgetVis-drillthrough-service-contractdelta.md`, `widgetVis.md`, and `cognosHostService.md` §4. This spec does not implement T2 and does not reopen T1 icon time / vis-max.

#### `contracts/widgetVis.md` — apply `widgetVis-drillthrough-service-contractdelta.md` §9

| Section | Edit |
|---|---|
| §0 / §1 / §2 | Drillthrough = icon consumer + service call. Capture/CTRL deferred to tranche 2. Asset/class unchanged. |
| §4 Runtime | Capture subscriptions **not** installed in T1. Icon click + `drillthroughIconEl` stay. Capture keys may remain unused. Mount flag lives on `_KDB.runtime.widgetVis.enableDrillthrough`. |
| §5 `mount` | Default `enableDrillthrough: true`. Production passes `{ enableDrillthrough: true }`. Flag is runtime, not state. |
| `contentCreate` step 7 | Amend “Install drillthrough icon/**listeners**…” → plant **icon** (and click) when enabled; **no** content-selection listeners in T1. |
| `cleanupContent` step 5 | Still `clearDrillthrough` via `cleanupDrillthroughDecorations.js`. Wording: remove icon + click; do not require content-event teardown that was never installed. |
| `ensureObservers` | Add idempotent drillthrough **icon** re-install on unpark (with focus + legend). |
| Apply success / post-render | Title/legend/tooltip + **icon re-install**. Not capture flush. |
| §10 Dependencies | **Replace** the sentence that allows **direct `_KDB.cognosAPI` for drillthrough**. Host reads use **injected cognosHost facets only**. **URL open goes through `_KDB.services.drillthrough`.** Keep png / `.kdb_hyperlink_icon`. Add `_KDB.services.drillthrough`, `_KDB.api.sicht.getState()`, `_KDB.api.dienststelle.getCurrentHierarchySnapshot()`. |
| §11 Cognos touchpoints | “Content selection events / current selections” → **tranche 2**, gated on visualization **selection** facet. “Drillthrough URL open” → service, not widgetVis `window.open` / `_KDB.cognosAPI`. |
| §12 DOM | Host is `.widgetHeader .widgetIcons`; locate-or-create; legacy wrapper + `.kdb_hyperlink_icon`. Forbidden: new icon design. |
| §13 Drillthrough bullets | Icon plant + `source:"icon"` + service call. Title `.kdb_hyperlink` stays metric-URL (do not conflate). Capture buffers unused until T2. Focus: SHOW on native expand header; no settings-panel clone. |
| §15 | `WIDGET_VIS_DRILLTHROUGH_FAILED` **stays** for **install / wiring**. Service has its own codes — do not collapse. |
| §17 Folder | Add `effects/assembleDrillthroughSpec.js`, `effects/readDrillthroughVisYear.js`, `effects/bindDrillthroughIconClick.js`, `effects/buildOrgTreeForDrillthrough.js`, `effects/parseHierarchyCellForDrillthrough.js`. Keep `installDrillthrough.js`, `renderDrillthroughIcon.js`, `cleanupDrillthroughDecorations.js`. |
| §18 | `KDB.js`: `widgetVis.mount({ enableDrillthrough: true })`. Missing service → install skip + `WIDGET_VIS_DRILLTHROUGH_FAILED`, not failed `contentCreate`. |
| §19 | Add: `p_p_*` / URL open (service); PDF hide (dashboardPdf); T2 capture listeners; scraping `.KDB_optionSelected`; cloning icon onto `.KDB_focusModeSettingsPanel`. |
| §20 check 11 (drillthrough duplicate number) | Icon + click + runtime bucket owned/cleaned by widgetVis; URL open is the service. Capture listeners not required for T1. |
| Approval log | Row: 2026-08-29 drillthrough icon-consumer delta sync. |

#### `contracts/widgetVis-port-execution-spec.md` — apply delta §10

| Place | Amend |
|---|---|
| Section B tree | Add assemble / bind / buildOrgTree / parseHierarchyCellForDrillthrough. Files already named stay. |
| Section C `installDrillthrough.js` | Consumer: plant + click + assemble + service call. **Not** “open URL through legacy-derived behavior” inside widgetVis. |
| Section D `installDrillthrough.js` | T1 must/must-not from this spec. Hard 150; split already named. |
| Section D `renderDrillthroughIcon.js` | Locate-or-create in `.widgetHeader .widgetIcons` (expand host when expanded). Return refs only. |
| **New** assemble / bind / tree files | Point at this tranche-1 spec checklists. |
| `applyPostRenderCleanup.js` | Add icon re-install (not capture re-sync). |
| `handleContentCreate` | Optionally install icon when enabled. Must not wait on drillthrough for content-ready. |
| `handleEnsureObservers` | Unpark icon re-install with focus + legend. |
| `cleanupVisualizationContent` | Keep: remove icon via existing helper. Drop “detach content-event listeners” as a T1 must-do. |
| Section G | Mount `enableDrillthrough` default true; runtime flag. |
| Section H | `KDB.js` explicit `mount({ enableDrillthrough: true })`. |
| Section I #21 | Legacy asset/class; runtime icon + click. Capture unused until T2. |
| Section J | Still: no new icon. Add: no capture listeners in T1; no `p_p_*` in widgetVis; no focus-panel clone. |

---

## Section D. Reducer behavior table

N/A — `drillthrough` owns **no** `_KDB.state` subtree and has **no** reducer. `widgetVis` reducer is unchanged (no new action types). Install failures must **not** dispatch `widgetVis/errorRecorded`.

| Action type | Trigger | Reducer effect | Lifecycle |
|---|---|---|---|
| *(none for drillthrough)* | — | — | — |

---

## Section E. Published selectors

None. No owned state. `buildDrillthroughUrl` is spec-in / result-out, not a selector.

| Selector | Reads | Returns |
|---|---|---|
| *(none)* | — | — |

---

## Section F. Public API wiring

- Surface: `_KDB.services.drillthrough`
- Methods exposed: `buildDrillthroughUrl`, `openDrillthrough`
- `_KDB.runtime.drillthrough` initialization: **none** (do not create)
- `_KDB.state.drillthrough` initialization: **none** (do not create)
- widgetVis module runtime: `_KDB.runtime.widgetVis.enableDrillthrough` (boolean, default true); stamps `drillthroughService`, `tableDataReadRows`, `dataQueryFacet`
- Per-widget: existing `byId[id].domRefs.drillthroughIconEl` + `byId[id].drillthrough.installed`; listener key `drillthroughIconClick`

widgetVis public API remains `{ mount, destroy, dispatch, getState }`. No new named commands.

---

## Section G. Harness HTML spec

**Omit / N/A** — no in-browser Cognos in this workspace. Do not generate harness HTML.

---

## Section H. Harness JS spec

**Omit / N/A** — same as G. Do not generate harness JS.

---

## Section I. Mock extensions

**Omit / N/A** — no harness.

---

## Section J. Acceptance criteria (self-verification before reporting back)

1. Every file from **your slice** in Section B exists (or is documented omitted with reason). Do not create files from other slices.
2. Every file matches its Section C spec including `Rules to apply`.
3. Every new `.js` file uses full-compact AMD.
4. No new JS file exceeds 150 lines; new orchestrator ≤ 120; `KDB.js` change is the one-liner only.
5. No inline subfunction definitions inside entry functions / callbacks / return path. Factory-scope named helpers only.
6. Slice A files import only inside `drillthrough/` (plus no widgetVis/CSS). Slice D widgetVis files must **not** import `core/services/drillthrough/**` internals. No `helpers/` `common/` `shared/` folders.
7. No forbidden tree was read/modified (Section K). Evidence reads of `laatsteOriginal/...` listed in Section A are allowed **read-only**.
8. No drillthrough reducer. No `_KDB.state.drillthrough`. `build` / `open` do not mutate spec/orgTree.
9. **Service `mount`/`destroy` criteria: N/A.** Do not add them. widgetVis already has mount/destroy; do not add destroy to drillthrough. widgetVis mount resolves `enableDrillthrough` default true and stores it on **module runtime**.
10. Service has no subscriptions/listeners to abort. widgetVis icon click dispose is stored under `runtime.listeners` key containing `drillthrough` so existing cleanup works.
11. No `events/eventNames.js`. No events emitted.
12. Report back with Section L. Include slice id.
13. File-size, no nested helpers, no ES modules, no `window._KDB` in leaves.
14. No `p_p_*` in widgetVis. No `window.open` in widgetVis. No `cognosAPI` for drillthrough. T1 remains icon-only: no CTRL listeners, no 3s capture, no `content.on` in T1 files. T2 is F1c+S2 in other contracts; this spec does not implement T2.
15. Encode emit order + omit rules match checklist 9. Tail always `&format=HTML&Download=false&prompt=true`. datenart hash only in `config/datenart.js`.
16. `openBlankWindow` is `window.open(url, "_blank")` only. `openDrillthrough` never opens on build failure. Popup null → `DRILLTHROUGH_OPEN_BLOCKED` with url present.
17. Icon: one `.kdb_hyperlink_icon` in `.widgetHeader .widgetIcons` (expand host when expanded); locate-or-create reuse; no focus-panel clone.
18. PDF: one selector in the existing grouped rule; no `:has()` in pdfCapture; do not hide `.widgetIcons` / `.dataWidgetIcon`.
19. Production `KDB.js` calls `widgetVis.mount({ enableDrillthrough: true })`.
20. Install/wiring errors use `WIDGET_VIS_DRILLTHROUGH_FAILED`; service codes stay on the service; contentCreate still succeeds when install fails.

---

## Section K. Forbidden actions

- Modify any `.mdc` file under `_____________KDB3API/.cursor/rules/`.
- Modify `contracts/_template.md` or `_executionSpecTemplate.md`.
- Modify the three approved contracts: `drillthrough.md`, `widgetVis-drillthrough-service-contractdelta.md`, `dashboardPdf-drillthrough-icon-hide-contractdelta.md`.
- Reopen PO decisions (icon vs service split, both assemblers now, icon-only consumer T1, `p_aufspannen_2` icon-only, `info` not a URL field, Lehrlinge icon-map only, icon never month-level, mount default true + explicit production true, no new icon, all three env URLs include `/Personal/`, PDF one selector no `:has()`, focus SHOW on native expand header, title `.kdb_hyperlink` is a different feature, unused `generalFunctions/pkzDrillthrough/` is not source of truth, snapshot is not the tree, calendar fallback is widgetVis, never `Date.now` in the service). T1 remains icon-only; T2 is F1c+S2 in other contracts; this spec does not implement T2. Do not reopen T1 icon time / vis-max. Do not add Ctrl / 3s / `content.on` in T1 files.
- Read or modify `_______KDB3/`, `_______REDESIGN2/`, `.cursor oud`, `_remediation_backup`. `laatsteOriginal` **only** as listed evidence (read-only).
- Port unused `laatsteOriginal/KDB2/js/generalFunctions/pkzDrillthrough/` (fluktuation override, token-wise `#` normalize).
- Commit, push, or change git config.
- Invent `_KDB.state.drillthrough` or `_KDB.runtime.drillthrough` or `destroy` on the service.
- New icon artwork; substitute another asset; glob-miss is not “file missing”.
- `:has()` in `pdfCapture.css`. Hiding `.widgetIcons` / `.dataWidgetIcon` / `.liveWidgetAnnotations`.
- Cloning the PKZ icon onto `.KDB_focusModeSettingsPanel` / extending `filterFocusPanelIcons`.
- Scraping `.KDB_optionSelected` or settings-dropdown DOM.
- `p_p_*` encoding or `window.open` in widgetVis. Direct `_KDB.cognosAPI` for drillthrough.
- Adding a **new** visualization facet in T1 files, or implementing T2 in this spec. F1c is ops on the existing facet, specified in `cognosHostService.md` — not here. T1 files: no CTRL, no 3s capture, no `content.on`, no capture flush.
- Conflating title `.kdb_hyperlink` with `.kdb_hyperlink_icon`.
- `Date.now` / `new Date()` inside the drillthrough service.
- `loadTable` / `waitForRows` inside the drillthrough service.
- Importing dienststelle internals into the service. Importing drillthrough internals into widgetVis.
- `helpers/` `common/` `shared/` folders. Nested helpers inside entry functions. ES modules in `KDB3/js`. `window._KDB` in deep/leaf files.
- Skip Section A or proceed without the echoed summaries (planner pre-accepts: echo then implement **your slice** in the same turn).
- Implement files outside your assigned slice.

---

## Section L. Reporting template (for the executing AI)

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **Slice id** — A / C / D / F / G / W.
3. **File checklist** — path, line count, matches spec | deviation.
4. **Deviations** — path, deviation, motivation, rule consulted.
5. **Self-verification** — pass/fail per Section J item that applies to the slice.
6. **Open questions for reviewer** — including any live API gap (do not invent).

---

## Section M. Reviewer handoff

1. Verify the 14 echoed summaries are present and roughly correct.
2. Confirm the implementer stayed in their slice.
3. Read every file created/edited in that slice.
4. Run `ReadLints` on all new/edited `.js` files.
5. Cross-check `Rules to apply` and checklists 1–12.
6. Line counts ≤150 / orchestrator ≤120.
7. Encode order vs checklist 9; no `window.open` in widgetVis; PDF selector only; KDB.js one-liner.
8. Decide: accept slice / fix-spec / escalate. Do not implement in the final-review pass.

---

## Live API gaps (do not invent)

Documented for implementers and captain. T1 specified fallbacks:

1. **Hierarchy column keys:** `tables.js` hierarchy entries have no `shape`/`pick` and no sample rows in-repo. Spec walks array rows by index or object keys via `rankHierarchyRowKeys` (`level0*N` / numeric). If live keys are Cognos unique-names without a rank token, walk `Object.keys` order after ranked keys. Do not invent unique-name catalogs.
2. **`visualizationFacet.getVisType`:** `ensureVisType.js` treats it as thenable. T1 assemble is **sync** and uses `readEffectiveSettingsContext` visType; ignore Promise returns.
3. **`dataQuery.readQueryRows` is async.** Do not await it on icon click. Use **sync** `dataQuery.peekQueryRows` (in-memory `getCurrentQueryResults` / `getResult`; thenable → miss). Fill `yearContext.highestYearFromVis` when the peek has a jahr/year column. Icon time then: vis year (line/table/list → `ja_bisMaxStichtag`) else jahr filter else calendar `defaultYear`.

---

## Contract-vs-MUST (explicit)

Approved contracts outrank rules for `drillthrough/` and the widgetVis T1 consumer files listed here.

| Topic | MUST rule | Contract / this spec |
|---|---|---|
| Service factory destroy / disposed guards | `module-public-api.mdc` / template service-factory row | **Exception:** no `destroy`, no disposed table. Sibling `widgetBindingPlan`. |
| Runtime cleanup path | `runtime.mdc` | **Exception:** no `_KDB.runtime.drillthrough`. `window.open` is fire-and-forget. |
| Owned state + reducer | `state.mdc` / template Sections D–E | **Exception:** no `_KDB.state.drillthrough`. |
| Error conversion to owned error state | `error-handling.mdc` | **Exception:** serializable result objects; no lifecycle error field. Unexpected → `*_INTERNAL` + `console.error`. |
| CSS `kdb-` kebab | `naming.mdc` | **Exception:** legacy `.kdb_hyperlink_icon` (PO). |
| Selectors in `_KDB.elements.selectors.widgetVis` | `dom.mdc` | Follow **existing** widgetVis pattern: AMD-import `widgetChromeSelectors.js` + `config/defaults.js` class token (same as `resolveVisualizationContent.js`). Do not invent a new selector namespace for T1. |

No other real conflict found. Do not invent destroy/runtime/state to satisfy generic template rows.
