# Launch prompt — drillthrough datapoint captain 2026-08-30 ~16:04

Paste into a **fresh** agent chat. Do **not** continue the previous datapoint-icon captain chat (token context full). Do **not** load that chat.

Recommended: strong thinking model as **planner / team captain**. Subagents: **cursor grok 4.6** — use available slug `cursor-grok-4.6-xhigh-fast` (`subagent_type` `explore` | `generalPurpose`). Do not invent a slug that is not in the Task tool list. PO = vastenburg.

Captain **does not write the bulk of production JS**, does **not** personally re-derive `addPkzDrillthrough.js` (~2000 lines), does **not** dump catalogs into chat. Plan, gate, dispatch, review against contracts + MUST, present decisions to PO.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you read contracts, all `.mdc` files, and the 2000-line legacy file yourself.

- Treat **delegation as mandatory**, not optional polish.
- Point subagents at **file paths**. Do not paste whole contracts or `.mdc` bodies into this chat.
- Do **not** re-read all `.mdc` files here. Point the army at named files + named MUST clauses.
- Do **not** ingest `addPkzDrillthrough.js` in the captain thread. Army returns **citations**.
- One job at a time in *your* context: synthesize army verdicts, patch contract holes (PO agrees), brief the next writer.

**Quality over speed:** extra investigation and review via grok 4.6 subagents is a **good** default. Do not “just change aufspannen from MAG filter” from memory of this prompt without a fresh army vs live categories + live legacy.

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

- Be the army. Do not ingest all `.mdc` files into this chat. Point subagents at files.
- Re-open **closed** PO decisions in §0 except the **open job in §1**.
- ES modules in `KDB3/js`, `window._KDB` in deep files, foreign state writes, mixed dispatch+named APIs, nested helpers inside entry functions, new icon artwork.
- Fake-activate datapoint (`categories: []` opens a thin URL). No Ctrl. No 3s flush. No `content.on` / `_KDB.cognosAPI` in widgetVis.
- Port unused `laatsteOriginal/KDB2/js/generalFunctions/pkzDrillthrough/`. SOT is only `laatsteOriginal/KDB2/js/widgets/visWidgets/addPkzDrillthrough.js`.
- Invent a **new** visualization facet. F1c ops already exist on the **existing** facet.
- Invent `getSelectionAsLocalFilters` flatten (shape uncited).
- Add an F_TST_SID / combined-label time parser. Live dump already has separate `Monat`+`Jahr` categories. A late explore that recommended Stichtag parse is **superseded**.
- Revert T1 header icon (`right: 28px`, `.widgetHeader .widgetIcons`) or uncrush `.resizeEdge.topRight` (2×2).
- Grow `installDrillthrough.js`. Do not park S2 inside TR / header `:has`.
- Commit unless PO asks. No push. No `.mdc` edits unless PO asks.
- Load predecessor captain chats. This file + approved contracts + live JS are the source of truth.

### Army (grok 4.6) does

- Read legacy/current files and return **citations**.
- Draft/edit **one** contract/spec slice or a small set of JS/CSS files per task.
- Review a slice against named `.mdc` rules + named contracts.
- Do not invent architecture, do not reopen closed PO decisions.

Never: two writers on the same file.

---

## Project

Root:

`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Active: `_____________KDB3API/`

Ignore: `_______KDB3`, `_______REDESIGN2`, `.cursor oud`, `_remediation_backup` except as cited evidence. `laatsteOriginal` is evidence **only** when a brief names a path.

Live MUST: `_____________KDB3API/.cursor/rules/` — especially **`cognos-adapter.mdc` (always-apply)** + `cognosHostService.md` **§0**. Consume existing facet ops; stamp + `read*Facet`; no `_KDB.cognosAPI` from features. No new facet/op without PO + contract + D4. Stale parents that say “call `_KDB.cognosAPI`” or “build a selection **facet**” **lose** to adapter + §0.

Also: kdb-object, state, runtime, module-public-api, events, feature-structure (JS 150 / orchestrator 120, factory-scope helpers), naming, error-handling, dom, amd.

Authority (highest first):

1. This prompt (PO leave-decisions + this session’s open job).
2. Approved contracts for folders you touch.
3. `architecture/stateOwnership.md` + `architecture/projectStructureRules.md`
4. `.cursor/rules/` (`cognos-adapter.mdc` + §0 beat stale widgetVis.md “selection facet” sentences).
5. Live `KDB3/js/**`

Approved contracts (do not rewrite unless implementation forces a delta and PO agrees):

- `contracts/cognosHostService.md` — F1c: `getSelections` + `subscribeSelections` on **existing** `visualization`. Last-subscribe DTO buffer when host poll missing.
- `contracts/drillthrough.md` — both assemblers. Datapoint time from `categories[]`. Icon time T1 done.
- `contracts/widgetVis-drillthrough-service-contractdelta.md` — T1 icon + T2 S2.
- `contracts/dashboardPdf-drillthrough-icon-hide-contractdelta.md` — hide `.kdb_hyperlink_icon` only; no `:has()` in pdfCapture.
- `contracts/widgetVis.md` — T2 via stamped `visualizationFacet`.

---

## 0. Closed (do not reopen)

| Topic | Decision / live fact |
|---|---|
| Split | widgetVis: plant + click + spec + CALL. URL / `p_p_*` / `window.open` = `_KDB.services.drillthrough`. |
| Name | `drillthrough`. T1 header icon **done** (`right: 28px`). |
| Trigger | Native Cognos datapoint **select** (no Ctrl, no 3s). IBM Keep/Exclude uses Ctrl. |
| S2 host | Sibling of `.resizeEdge.topRight` on `.widget.liveWidget.maximizable`. Wrapper `kdb-datapoint-pkz`, inner `a.kdb_hyperlink_icon`. **Not** inside TR. **Not** header `.widgetIcons`. Keep 2×2 crush. PO pixels: `top: 24px; right: -25px; 24×24`. |
| S2 hide | Canvas-only; hide under `.expandModeContainer`. Hide wrapper when `.widget:not(.nodeSelected)` (borders only on `.nodeSelected` — patched 16:04 in `widgetVis.css`). |
| F1c | Ops on existing visualization facet. Ring 1: Canvas-feature `getContent` then widgets `getContent`. Live Cognos: **`widgets.getContent().getSelections` is not a function**. Subscribe (`content.on`) works. |
| Buffer | `runtime.cognosHostService.adapters.lastSelectionDtoByWidgetId`. `getSelections` falls back to last select DTO. Clear on deselect/clearAll/empty, **not** on unsub/replace. |
| Zeit (PO green 16:04) | Datapoint: jahr+month → range empty + `p_aktmon="{y} - {m}"`; jahr only → `ja_kalenderJahr` + `"{y} - 1"` + `p_p_stichtag_or_range=Zeitraum`. **Never** `ja_bisMaxStichtag` on datapoint. Year from **label** (not TM1 `value`). Month `mapMonthLabelToNumber(label,label)`; `DEZ`→12. File: `assemble/assembleDatapointTime.js`. |
| Live category shape | Line click example: `Monat`/`DEZ`, `Jahr`/`2022` or `2025`, `Dienststelle_BW`/`MAG`. Flatten fields: `columnId`, `label`, `dataItemId`, `value`. |
| Cache | Cognos often loads `…/v1/ext/KDB3/`, not OneDrive live. If time was empty after the label fix, the **old** module was still served. PO later confirmed zeit **correct**. |
| Adapter | Follow `cognos-adapter.mdc` + §0. No new facet. |

---

## 1. Open job — start here

### PO (2026-08-30 ~16:04)

Zeit is OK. S2 open works.

BW sicht: user chose **only MAG** in the Dienststelle filter. Drillthrough still sends **`p_p_aufspannen_1=DIENSTSTELLE_LANG_SID`** (PKZ groups by DST-langtext) and `p_p_dienststelle_DrillFromGDB=MAG`.

PO asks: was that also true in **legacy**? How did legacy handle dienststelle + sicht + grouping (`p_aufspannen_1`)?

**Do not assume a bug.** Live click categories **include** a Dienststelle member (`columnId` …`Dienststelle_BW`, `label` `MAG`) because the line series/color is Dienststelle. Aufriss is first needle in `categories[]`, not “read the filter widget”. Org MAG is a **separate** key (snapshot / `orgSelection`).

Also live: warning `DRILLTHROUGH_BW_MAG_LEVEL_MISMATCH` (“MAG and level-0 did not both match”) — cite, do not “fix” unless army + PO say the org encode is wrong.

**Predecessor army (2026-08-30 ~16:05, re-cite if you doubt):** `addPkzDrillthrough.js` datapoint path — `p_aufspannen_1` from **first matching clicked `columnId`**, not the page MAG filter. BW + dienststelle/stelle → `DIENSTSTELLE_LANG_SID` (KURZ is DEZPV only). `p_art` + MAG on `p_dienststelle_drillFromGDB` from **page Sicht / Dienststelle snapshot**, not category label. MAG-only filter does **not** omit aufriss. Filter size ignored. Present to PO; change JS only if PO wants different product.

### Open forks — ask PO only after citations

| Fork | Options |
|---|---|
| Aufriss when filter is single MAG | Keep category-driven `DIENSTSTELLE_LANG_SID` (legacy if cited) vs omit/change aufriss when filter is one DST |
| MAG org vs category MAG | Two channels (filter → `p_p_dienststelle_*`, category → `p_aufspannen_1`) vs collapse |

---

## 2. Where to start (order)

1. Dispatch **explore** grok 4.6 — legacy datapoint org + sicht + `deriveAufspannen1FromInfo` + how MAG lands on `p_dienststelle_drillFromGDB` vs aufriss. SOT: `addPkzDrillthrough.js` only. visType/axes not required.
2. Dispatch **explore** (parallel) — live KDB3 `assembleDatapointAufriss.js` + org encode in `assembleDatapointDrillConfig` / org helpers + the MAG level-mismatch warning.
3. Synthesize in Dutch. Ask PO only if legacy ≠ current or product is ambiguous. **No JS** until then.
4. If PO wants a change: contract delta (if keys/rules change) → JS slice → **other** reviewer.

Do **not** start by re-investigating icon time, S2 mount, F1c poll, or Ctrl.

---

## 3. Code pointers (current)

```
_____________KDB3API/KDB3/js/core/services/drillthrough/
  assemble/assembleDatapointTime.js     PO-green zeit — do not retouch unless new dump
  assemble/assembleDatapointAufriss.js  p_aufspannen_1 from categories
  assemble/assembleDatapointDrillConfig.js
  encode/ + org mapping (MAG warning)

_____________KDB3API/KDB3/js/core/services/cognosHost/facets/visualization/
  read/getSelections.js                 Canvas-feature then widgets; last-DTO fallback
  subscribeSelections.js + onHostSelectionEvent.js
  rememberLastSelectionDto.js / readLastSelectionDto.js

_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/
  effects/installAllDrillthrough.js     T1+T2 merger (4 call sites)
  effects/installDatapointDrillthrough.js
  view/buildDatapointDrillthroughIcon.js + placeDatapointDrillthroughIcon.js
  effects/assembleDatapointDrillthroughSpec.js

_____________KDB3API/KDB3/css/widgets/widgetVis.css
  S2: top 24px; right -25px; 24×24
  borders only .nodeSelected; wrapper hidden :not(.nodeSelected)
  T1 :has still right:28px; TR crush 2×2 unchanged

laatsteOriginal/KDB2/js/widgets/visWidgets/addPkzDrillthrough.js
  buildLogAndOpenDrillConfig / deriveAufspannen1FromInfo / org+sicht
```

---

## 4. First message to PO

Short: army started on legacy vs live **dienststelle / sicht / `p_aufspannen_1`** given MAG-only filter + Dienststelle category on the line click. Zeit and S2 open stay closed. CSS: S2 border only when widget selected (already patched). No catalog dump. No “what is drillthrough”.

---

## 5. Forbidden regressions

- T1 header icon time / position `right: 28px` / PDF hide / select-visibility
- S2 inside TR or header `:has`
- Ctrl + 3s as trigger
- `categories: []` fake open
- New visualization facet / `content.on` in widgetVis
- `ja_bisMaxStichtag` on datapoint
- Reverting Jahr-from-**label** in `assembleDatapointTime.js`
- F_TST_SID combined-label time invent
- Dropping the console `[drillthrough.openDrillthrough]` log
- Mega-PR: slice, review, next slice
- Commit/push without PO
