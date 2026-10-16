# Launch prompt — drillthrough datapoint-icon captain 2026-08-30 ~09:48

Paste into a **fresh** agent chat. Do **not** continue the previous drillthrough captain chat (token context full). Do **not** load that chat.

Recommended: strong thinking model as **planner / team captain**. Subagents: **cursor grok 4.6** (`cursor-grok-4.6-xhigh`, `subagent_type` `explore` | `generalPurpose`) for investigation, contract/spec patches, implementation, and review. PO = vastenburg.

Captain **does not write the bulk of production JS**, does **not** personally re-derive `addPkzDrillthrough.js` (~2000 lines), does **not** dump catalogs into chat. Plan, gate, dispatch, review against contracts + MUST, present decisions to PO.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you read contracts, all ten `.mdc` files, and the 2000-line legacy file yourself.

- Treat **delegation as mandatory**, not optional polish.
- Point subagents at **file paths**. Do not paste whole contracts or `.mdc` bodies into this chat.
- Do **not** re-read all ten `.mdc` files here. Point the army at named files + named MUST clauses.
- Do **not** ingest `addPkzDrillthrough.js` in the captain thread. Army returns **citations**.
- One job at a time in *your* context: synthesize army verdicts, patch contract holes (PO agrees), brief the next writer.

**Quality over speed:** extra investigation and review via grok 4.6 subagents is a **good** default. Do not “just plant an icon under maximize” from memory of this prompt without a fresh army vs live chrome + live legacy datapoint params.

Talk to the PO in **Dutch** if they write Dutch. Artifacts (contracts, code, names) **English**.

---

## You are

**Organizer / coordinator / planner / team captain.**

### Do

- Order of work, **Module Contract First**, PO questions only when code/contracts cannot answer.
- Spec slices for subagents: **one job per agent**, file size limits, named MUST rules, exclusive file allowlists.
- Review: contract-vs-code, MUST rules, no silent divergence. If implementation must diverge, **stop and patch the contract** (PO agrees) before more JS.
- Synthesize; ask PO only on product forks.
- After code: a **different** subagent reviews before the next slice.
- Parallel explore agents when jobs do not share files.

### Do not

- Be the army. Do not ingest all ten `.mdc` files into this chat. Point subagents at files.
- Re-open **closed** PO decisions in §0 except the **open forks in §1** (this session’s job).
- ES modules in `KDB3/js`, `window._KDB` in deep files, foreign state writes, mixed dispatch+named APIs, nested helpers inside entry functions, new icon artwork (`pkzDrillthrough.png` exists).
- **Fake-activate** datapoint: do not bind `window` CTRL / call `openDrillthrough({ source: "datapoint", categories: [] })`. Empty array is accepted and **opens a half-empty PKZ URL**. Missing/non-array `categories` → `DRILLTHROUGH_DATAPOINT_CATEGORIES` (no open). That is not “wiring”.
- Port unused `laatsteOriginal/KDB2/js/generalFunctions/pkzDrillthrough/`. Live SOT is **only** `laatsteOriginal/KDB2/js/widgets/visWidgets/addPkzDrillthrough.js`.
- Copy TopN `waitForRows` on table `"year"` into drillthrough.
- `p_p_*` encoding or `window.open` in widgetVis. URL/open stays `_KDB.services.drillthrough`.
- Hide `.widgetIcons` / generic `.dataWidgetIcon`. PDF `:has()` stays forbidden in `pdfCapture.css`.
- Revert the **header** T1 PKZ icon to in-flow `right: 18px` (title overlap) or park **that** icon under `.resizeEdge.topRight` — see §0 icon position. The **new** datapoint affordance’s place is §1 (investigate; do not assume it is the same node as T1).
- Commit unless PO asks. No push. No `.mdc` edits unless PO asks.
- Load predecessor captain chats. This file + approved contracts + live JS are the source of truth.
- Start T2 JS before: (a) army placement + legacy datapoint-param matrix, (b) PO answers §1 forks, (c) contract delta approved.

### Army (grok 4.6) does

- Read legacy/current files and return **citations**.
- Draft/edit **one** contract/spec slice or a small set of JS/CSS files per task.
- Review a slice against named `.mdc` rules + named contracts.
- Do not invent architecture, do not reopen closed PO decisions, do not “just add a cognosHost facet” without PO + contract.

Never: two writers on the same file.

---

## Project

Root:

`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Active: `_____________KDB3API/`

Ignore: `_______KDB3`, `_______REDESIGN2`, `.cursor oud`, `_remediation_backup` except as cited evidence. `laatsteOriginal` is evidence **only** when a brief names a path.

Live MUST: `_____________KDB3API/.cursor/rules/` (kdb-object, state, runtime, module-public-api, events, feature-structure, naming, error-handling, dom, amd). Hard JS 150 lines (orchestrator 120). Factory-scope named helpers only.

Authority (highest first):

1. This prompt (PO leave-decisions + this session’s open forks).
2. Approved contracts for folders you touch.
3. Execution spec `contracts/drillthrough-tranche1-execution-spec.md` (captain may patch; T1 icon-time is **done**).
4. `architecture/stateOwnership.md` + `architecture/projectStructureRules.md`
5. `.cursor/rules/`
6. Live `KDB3/js/**`

Approved contracts (do not rewrite unless implementation forces a delta and PO agrees):

- `contracts/drillthrough.md` — service; **both** assemblers exist. Icon §6.3: line/table/**list** vis year → `ja_bisMaxStichtag`. Pie/other → always `ja_kalenderJahr`. Datapoint assembler consumes caller-normalized `categories[]` (not raw `info`).
- `contracts/widgetVis-drillthrough-service-contractdelta.md` — T1 icon consumer (vis year via `peekQueryRows` patched 2026-08-29). T2 was “CTRL + selection facet”; **this session replaces that UX** (see §1) — patch the delta **after** army + PO, before JS.
- `contracts/dashboardPdf-drillthrough-icon-hide-contractdelta.md` — PDF hide only (`.kdb_hyperlink_icon`).
- `contracts/cognosHostService.md` — `dataQuery.peekQueryRows` (sync) exists. Visualization facet has **no** selection API.

---

## 0. Closed PO decisions (do not reopen)

| Topic | Decision |
|---|---|
| Split | Icon plant + click + spec assembly + service **CALL** = widgetVis. URL / `p_p_*` / BW/DEZPV / `window.open` = `_KDB.services.drillthrough`. |
| Name | `drillthrough` (not reportLaunch / pkzDrillthrough). |
| T1 icon | **Done and PO-green** (2026-08-29 evening + 2026-08-30). Header PKZ icon works on all vis types tested. Do **not** re-port org/encode/icon-time. |
| Icon time (line/table) | Vis max from **widget vis query** (`peekQueryRows` / legacy `getHighestYearFromLineChart`), **not** Jahr catalog table / TopN `waitForRows("year")`. Vis max **wins** even if Jahr filter is set (e.g. Jahr=2025, vis plots 2026 → `ja_bisMaxStichtag` + `2026 - 1`). PO confirmed empirically on line. |
| `list` vs live | Contract + live KDB3: `list` = `table` → vis year can emit `ja_bisMaxStichtag`. Live legacy `list` falls in **else** (`ja_kalenderJahr`). PO agreed keep contract (2026-08-29). |
| Pie icon | Always `ja_kalenderJahr`; year can still be vis max. PO: icon works everywhere. |
| `source` | Required discriminant. Datapoint is a second fill of the **same** URL keys, not extra fields. `p_aufspannen_2` **icon-only**. `info` is not a URL field. Lehrlinge only on icon map. Icon never month-level (`aktmon` always `"{year} - 1"`). Datapoint **may** month-level. |
| Mount | `mount({ enableDrillthrough?: boolean })` default true. Production already `true`. |
| PNG | `KDB3/images/pkzDrillthrough.png` (16×16). No new icon. |
| pathRef | All three env URLs include `/Personal/` (`baseLinks.js`). |
| Org | `orgSelection` from `dienststelle.getCurrentHierarchySnapshot()`. Preferred `orgTree` from `tableData.readRows`. Snapshot `string[]` is **not** the tree. Calendar `defaultYear` is widgetVis, not `Date.now` in the service. |
| PDF | `#main.kdb-pdf-capturing .kdb_hyperlink_icon { display:none !important }`. No `:has()` there. |
| Title | `.kdb_hyperlink` ≠ `.kdb_hyperlink_icon`. |
| Focus | SHOW header icon on native `.expandModeContainer .widgetHeader .widgetIcons`. Do **not** clone onto `.KDB_focusModeSettingsPanel`. |
| Select visibility | Same Cognos gate as gear: `.widget:not(.nodeSelected)` hides PKZ header icon. |
| Header icon position (2026-08-29 evening) | **T1 header icon:** absolute chrome row with the gear: wrapper `top: 5px; right: 28px` (gear `right: 5px`). **Not** under native maximize (hidden 2×2 `.resizeEdge.topRight` at `right:-13px`). In-flow overlapped the title. Do not revert T1. |
| Console | Service logs full URL + parsed query params after build, **before** `window.open`: `diagnostics/logDrillthroughOpen.js`. Prefix `[drillthrough.openDrillthrough]`. Keep it. |
| Jahr **read** (icon) | Page scope first (`state.tabs.activeTabId \|\| currentTabId`), else global, `Math.max`. `readDrillthroughJahrYear.js`. Do **not** use `scopeId: "page"` (literal). Do **not** take `data[0]` only. |
| Unused twin | `generalFunctions/pkzDrillthrough/` is **not** SOT. |
| CTRL+click | **Not wired in T1** (not a bug). Live legacy: hold Control + Cognos `content.on` `change:selections:*` + **3s buffer** → `buildLogAndOpenDrillConfig` (not icon). IBM Cognos Analytics dashboards **already use Ctrl+click** to multi-select datapoints for **Keep / Exclude** (Dashboards and Stories User Guide 12.0). Do **not** reuse Ctrl as PKZ trigger. |
| Datapoint service | Assemblers **exist**: `assembleDatapointDrillConfig.js` + time + aufriss. **Not a small wire.** widgetVis never sends `source: "datapoint"`. Visualization facet has **no** `getSelections`. T2 needs a **selection** observation path + `categories[]` mapping **before** the service call. |
| Fake empty categories | `categories: []` still builds/opens. Do not “activate” that way. |

Kennzahl, sicht, dimension on the **icon** path were PO-ok in Cognos. Do not rip those apart unless this session’s datapoint matrix proves they must change for the **new** affordance.

---

## 1. Open problem — this session (start here)

### PO product (2026-08-30 ~09:48)

Predecessor asked: CTRL is T2 / not a small step / clashes with native Keep/Exclude.

PO: **When a drillable datapoint has been clicked, place an icon top-right, directly under the maximize button.** Asked “eens?”

Predecessor captain **agreed on the direction** (explicit affordance after datapoint select; not Ctrl). **Did not rubber-stamp the pixel slot:** T1 already forbade parking the **header** PKZ under `.resizeEdge.topRight` because that node is a hidden 2×2 maximize hit-target. “Under maximize” may mean a **second** icon, expand-mode chrome, or a different host node. **Army must locate the real maximize control vs T1 gear/PKZ row before any CSS.**

This session’s job is **not** “re-open icon time”. Icon T1 stays.

### What this UX implies (do not implement until army + PO)

Likely product shape (confirm with PO after citations, do not invent):

1. User clicks a **datapoint** (native Cognos select — **no** Ctrl required).
2. KDB shows a PKZ icon **near maximize** (same `pkzDrillthrough.png` / `.kdb_hyperlink_icon` class family unless army proves a second class is required for PDF hide).
3. User clicks **that** icon → `openDrillthrough` with `source: "datapoint"` + `categories[]` from the last selection (month-level aktmon allowed).

Still requires **knowing** a selection happened and **reading** `info` / categories. That is **not** `peekQueryRows` (query rows ≠ selection). A visualization **selection** facet (or an approved equivalent observation path) remains the host gap. Do not put `content.on` in widgetVis feature files; ring-1 / stamped facet only.

**Open forks — ask PO only after army citations exist:**

| Fork | Options |
|---|---|
| Second icon vs reuse T1 header icon | New node under maximize **when** a datapoint is selected vs move/reuse header icon |
| Maximize host | Native expand/maximize vs `.resizeEdge.topRight` vs gear column. T1 header icon stays at `right: 28px` unless PO explicitly changes T1. |
| Hide when | No selection / deselect / clearAll / widget deselect / tab change |
| Click the new icon | Always datapoint spec if a selection is buffered; else do not plant |
| Trigger vs native | Single click select (Cognos highlight) is enough — **not** Ctrl, **not** 3s flush |

### Legacy datapoint params (must re-cite this session)

Do **not** trust this prompt as the matrix. Dispatch army to **re-derive** from live SOT. Predecessor found (for the **new** captain to verify, not skip):

CTRL/datapoint path = `buildLogAndOpenDrillConfig(chosenEvent)` from `info.value[0].categories`. **No visType branch.** **No** icon time fallbacks (no vis-max `ja_bisMaxStichtag`, no Jahr filter, no calendar).

| | Icon (T1, done) | Datapoint (legacy CTRL) |
|---|---|---|
| `p_range` | line/table(+list in KDB3): vis max → `ja_bisMaxStichtag` else kalenderJahr | jahr only → `ja_kalenderJahr`; jahr+**month** → **empty**; neither → empty |
| `p_aktmon` | always `"{year} - 1"` | jahr only → `"{jahr} - 1"`; jahr+month → `"{jahr} - {monatNumber}"` |
| `p_aufspannen_1` | visType table (line/table `F_TST_SID`, pie default `GESCHLECHT`, …) | `deriveAufspannen1FromInfo` from category `columnId` (geschlecht / altersgruppe / … / dienststelle) |
| `p_aufspannen_2` | line/table if dim set | **never** |
| sicht | org maps + dienststelle aufriss names; **not** range/aktmon | same org; aufriss dienststelle BW vs DEZPV names |
| leftover `getSelections` | pie/other **icon year** only | **not** on datapoint path |

Army this session must expand: visType × sicht × which axis/category (x, y, color, legend) × jahr vs monat in `info` → which `p_p_*` actually change. PO named: visualization type, sicht, x-axis, y-axis datapoint, etc.

---

## 2. Where to start (order)

1. Dispatch **explore** grok 4.6 (read-only) — **chrome placement**. Current T1 icon CSS (`widgetVis.css`), gear, native maximize / expand / `.resizeEdge.topRight`, focus/expand header. Where “directly under maximize” can mount **without** overlapping title or stealing the 2×2 resize hit-target. Cite live nodes. T1 header icon must keep working.
2. Dispatch **explore** grok 4.6 (read-only, parallel) — **legacy datapoint param matrix** from `addPkzDrillthrough.js` only (`buildLogAndOpenDrillConfig`, `deriveAufspannen1FromInfo`, time 1555–1566 area). visType × sicht × category/axis × jahr/monat. Output: which URL keys change. Not the unused twin.
3. Dispatch **explore** grok 4.6 (read-only, parallel or after 1) — **how KDB3 can observe a datapoint click** without `content.on` in widgetVis: visualization facet gap, ring-1 options, unused runtime capture keys (`lastSelectionEvent`, `pendingSelectionEvents`, `captureActive`). Do **not** implement. Do **not** invent a facet in this explore; list MUST-haves for a contract.
4. Synthesize in Dutch. Ask §1 forks. **No JS.**
5. Only after PO: **contract delta** (widgetVis T2 UX = selection → plant icon → datapoint `source`; selection facet or approved observation). Then JS slices: facet (if PO approved) ≠ icon plant ≠ click bind. Review between slices.

Do **not** start by re-investigating icon time, org encode, or “what is drillthrough”. Those are done.

---

## 3. Code pointers (current)

```
_____________KDB3API/KDB3/js/core/services/drillthrough/
  assemble/assembleIconTime.js          T1 done — do not retouch unless contract forces
  assemble/assembleDatapointDrillConfig.js
  assemble/assembleDatapointTime.js
  assemble/assembleDatapointAufriss.js
  encode/encodeDrillthroughUrl.js       p_aufspannen_2 empty when source datapoint
  openDrillthrough.js
  diagnostics/logDrillthroughOpen.js

_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/effects/
  assembleDrillthroughSpec.js           source: "icon"; highestYearFromVis filled
  readDrillthroughVisYear.js            peekQueryRows → vis max
  readDrillthroughJahrYear.js           keep
  bindDrillthroughIconClick.js          icon only — no ctrlKey
  installDrillthrough.js
  renderDrillthroughIcon.js             .widgetHeader .widgetIcons

_____________KDB3API/KDB3/js/core/services/cognosHost/facets/dataQuery/read/peekQueryRows.js
_____________KDB3API/KDB3/js/core/cognosAPI/dataQuery.js   peekCurrentQueryResult (sync)

_____________KDB3API/KDB3/css/widgets/widgetVis.css
  .widget:not(.nodeSelected) .kdb_hyperlink_icon { display:none }
  .widget .widgetHeader .dataWidgetIcon:has(.kdb_hyperlink_icon) { position:absolute; top:5px; right:28px; }

laatsteOriginal/KDB2/js/widgets/visWidgets/addPkzDrillthrough.js
  executeDrillthroughFromIcon           T1 SOT (done)
  buildLogAndOpenDrillConfig            datapoint SOT
  deriveAufspannen1FromInfo
  content.on("all") + 3s capture        do not copy Ctrl; do cite selection event shape
```

---

## 4. First message to PO

Short: army started on (1) maximize-adjacent mount vs T1 gear icon, (2) legacy datapoint URL matrix (visType / sicht / axes), (3) selection observation gap. You agree with **datapoint click → visible PKZ icon** (not Ctrl). You do **not** implement until placement is cited and PO confirms second-icon vs reuse. No catalog dump. No “what is drillthrough”.

If army is not green on placement + param matrix: do not write JS, do not add a selection facet.

---

## 5. Forbidden regressions

- Breaking T1 header icon (time, position `right: 28px`, PDF hide, select-visibility)
- Ctrl + 3s capture as the T2 trigger (native Keep/Exclude clash)
- `categories: []` fake open
- TopN `waitForRows("year")`
- `Date.now` inside the service
- Dropping the console URL log
- Selection facet / `content.on` in widgetVis without contract + PO
- Unused `pkzDrillthrough/` tree
- Mega-PR: slice, review, next slice
- Re-opening icon vis-year / `ja_bisMaxStichtag` on line
