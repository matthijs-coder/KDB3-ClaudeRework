# Contract Delta: `widgetVis` PKZ drillthrough icon consumer

> Delta on top of `contracts/widgetVis.md` and `contracts/widgetVis-port-execution-spec.md`.
> PO-approved: `widgetVis` **plants** the PKZ icon and **calls** `_KDB.services.drillthrough`. The service owns URL / open / encoding (`contracts/drillthrough.md`). This file is the **consumer** contract. Do not duplicate the `p_p_*` catalog here.

---

**Status:** `Approved`
**Parent contract:** `contracts/widgetVis.md`
**Also amends:** `contracts/widgetVis-port-execution-spec.md` (`installDrillthrough`, `renderDrillthroughIcon`, `applyPostRenderCleanup`, `handleEnsureObservers` / unpark, `contentCreate`, mount)
**Related:** `contracts/drillthrough.md`; PDF hide `contracts/dashboardPdf-drillthrough-icon-hide-contractdelta.md` (pointer only)
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6, 2026-08-28
**Reviewed by:** `PO vastenburg — Approved 2026-08-28 (chat); T2 F1c+S2 PO 2026-08-30`

---

## 1. Purpose

Users need the legacy PKZ drillthrough affordance on visualization widgets: a T1 header icon that opens the PKZ-AT report, plus a T2 datapoint icon (S2) after a native Cognos datapoint select. Parent `widgetVis.md` already owns drillthrough UI/runtime. This delta **splits** ownership: widgetVis plants/clicks and assembles the spec; the service builds and opens the URL. T2 consumes F1c ops on the stamped `visualizationFacet` — no new facet, no Ctrl, no 3s flush, no `_KDB.cognosAPI` / `content.on` in widgetVis.

Title `.kdb_hyperlink` (metric dxmeta URL on the title text) is a **different** feature. Unchanged.

---

## 2. Product split

| Owner | Owns | Does not own |
|---|---|---|
| **widgetVis** (this delta) | T1 header PKZ plant + T2 S2 datapoint plant, locate-or-create, click bind, spec **assembly** (icon and datapoint), F1c consume via stamped `visualizationFacet`, mount flag, runtime bucket, cleanup via existing helper | URL template, `p_p_*` encoding, `window.open` / navigation; host `content.on` / `_KDB.cognosAPI` |
| **`_KDB.services.drillthrough`** | URL / open / encoding. Public methods: forthcoming `contracts/drillthrough.md` | Icon DOM, header placement, settings/filter owner reads |
| **dashboardPdf** | Capture hide `#main.kdb-pdf-capturing .kdb_hyperlink_icon` | Icon plant, focus SHOW, click |

widgetVis **calls** `_KDB.services.drillthrough` with an assembled spec. House DI: `__orchestratorWidgetVis` stamps the service on `_KDB.runtime.widgetVis` (same pattern as `visualizationFacet`). Also stamp `tableData` (`readRows` only) so spec assembly can pass `orgTree` (preferred) or omit it for the service cache fallback. Optional: stamp `dataQuery` if icon `yearContext.highestYearFromVis` is filled from the widget query. Deep files read those stamps; they do not look up `_KDB.services.drillthrough` or `_KDB.cognosAPI`.

---

## 3. Tranches (PO)

| Tranche | In | Out |
|---|---|---|
| **1 — this delta (2026-08-28)** | Header icon consumer: plant + click + `source: "icon"` spec + service call | Content-selection listeners, CTRL+datapoint capture, capture flush (T1) |
| **2 — this session (PO 2026-08-30)** | S2 datapoint icon plant + F1c consume via stamped `visualizationFacet` (`getSelections` / `subscribeSelections`). No Ctrl. No 3s flush. No new facet. | New visualization **facet**; `_KDB.cognosAPI.visualization.getSelections`; widgets **facet** for selections; `_KDB.cognosAPI` / `content.on` in widgetVis; grow `installDrillthrough.js`; plant S2 in header `.widgetIcons` or inside TR |

Parent / execution-spec lines that **require** content-selection listeners + capture flush + Ctrl in `installDrillthrough.js` are **replaced** by T2: subscribe via F1c, S2 plant, native datapoint select. Runtime capture keys may be reused as a last-selection buffer only; **subscribe drives chrome, peek is source of truth at click**.

---

## 4. Mount

`mount({ enableDrillthrough?: boolean })` — **default `true`** when omitted.

Production `KDB.js` must call **explicitly**:

```js
_KDB.api.widgetVis.mount({ enableDrillthrough: true });
```

(Today: `_KDB.api.widgetVis.mount({})`.)

Store the resolved flag on module runtime (`_KDB.runtime.widgetVis.enableDrillthrough`), not in `_KDB.state`. When `false`: skip T1 and S2 plant, skip click, skip F1c subscribe, skip service call. `contentCreate` still succeeds.

---

## 5. Icon (tranche 1)

**Asset (exists, no new design):** `KDB3/images/pkzDrillthrough.png`  
**Class (legacy only):** `.kdb_hyperlink_icon` on the inner `<a>` (background-image paints the icon).  
**Not** title class `.kdb_hyperlink`.

**Host:** Cognos `.widgetHeader .widgetIcons` — **same host as the settings gear** (`placeWidgetToolbar.js` locate-or-create). Scope from the widget shell (`[data-kdb-widget-id]` / `widgetBase` shell ref). Chrome tokens: `KDB3/js/core/cognosHost/config/widgetChromeSelectors.js`.

**Shape (legacy `addIconAfterElement`):**

```
.widgetHeader .widgetIcons
  div.dataWidgetIcon.liveWidgetAnnotations[role="application"]   ← first child
    a.kdb_hyperlink_icon
```

**Idempotent locate-or-create:** if `.kdb_hyperlink_icon` already exists in that host, reuse the wrapper; do not duplicate. Re-bind click. Store the wrapper (or documented icon node) on `runtime.domRefs.drillthroughIconEl`.

**Re-install** (still icon-only, still idempotent):

- `contentCreate` step 7 (when enabled and header/content exists)
- `applyPostRenderCleanup` (confirmed render; Cognos may wipe header chrome)
- `handleEnsureObservers` unpark (return to canvas without `contentCreate`)

**Cleanup:** existing `effects/cleanupDrillthroughDecorations.js` (`cleanupContent` `clearDrillthrough`, destroy). No new cleanup file. Tranche 1 has no content-event subscriptions; the helper may still clear leftover `drillthrough*` listener/timer keys.

**Companion CSS (not PDF):** `KDB3/css/widgets/widgetVis.css` — `.kdb_hyperlink_icon` paints the PNG on the inner `<a>`. Wrapper `.widget .widgetHeader .dataWidgetIcon:has(.kdb_hyperlink_icon)` is `position: absolute; top: 5px; right: 28px` (same row as the gear at `right: 5px`, **left of** the gear, **inside** the widget border). Do **not** park it under native maximize (that is a hidden 2×2 `.resizeEdge.topRight` at `right: -13px`). Do **not** leave the wrapper in-flow in `.widgetIcons` (that overlaps `.widgetTitle`). Visibility matches the gear: hide when `.widget:not(.nodeSelected)`; SHOW in `.expandModeContainer`. Unique token only — do not hide `.widgetIcons` or generic `.dataWidgetIcon`. **2026-09-02:** sibling IBM header icons are hidden by `cognosButtons.css` WP2: `.widgetHeader .widgetIcons > .dataWidgetIcon:not(:has(.kdb_hyperlink_icon))` — this T1 wrapper stays out of that hide. Do not edit title `.kdb_hyperlink`. Do not put capture-hide CSS here. Do not piggyback leftover-hide or gear `KDB_hide`.

**PDF hide:** out of scope except pointer — `contracts/dashboardPdf-drillthrough-icon-hide-contractdelta.md` (`#main.kdb-pdf-capturing .kdb_hyperlink_icon`).

---

## 5b. Datapoint icon (tranche 2 / S2)

T1 header icon is **unchanged** (`right: 28px` on `.widgetHeader .widgetIcons`). Do not reopen T1 placement.

**Trigger:** native Cognos datapoint select (highlight). **No Ctrl. No 3s flush.**

**Host:** widget root `.widget.liveWidget.maximizable` — sibling of `.resizeEdge.topRight` and `widgetContentWrapper`. **Not** inside TR. **Not** header `.widgetIcons`. Skip plant if the widget is not `.maximizable` or the TR sibling is missing.

**Keep** the existing 2×2 crush on `.resizeEdge.topRight`. Do **not** uncrush native `#maximize_32_v7`.

**Shape:** distinct wrapper class (`kdb-datapoint-pkz` or equivalent English token). Inner `a.kdb_hyperlink_icon` + `KDB3/images/datapoint_pkzDrillthrough.png` (T1 keeps `pkzDrillthrough.png` on the same class). Never `widget.querySelector(".kdb_hyperlink_icon")` (that hits T1).

**CSS (companion `widgetVis.css`, not this contract’s job to write):** same column box as T1 / maximize (`right: -26px`, 25×25). Canvas `top: 63px`. **Amended 2026-09-01:** S2 is **not** canvas-only. SHOW the distinct wrapper in `.expandModeContainer` when planted (real categories). Hide rules under `.expandModeContainer .kdb-datapoint-pkz` are removed. Visual stack under Ausblenden: `contracts/widgetVis-drillthrough-focus-restore-contractdelta.md`.

**Plant / hide:** plant only when F1c peek/subscribe reports **real** categories (not `null` / empty). Hide on `deselect` / `clearAll` / widget deselect / tab. `.widget:not(.nodeSelected) .kdb_hyperlink_icon` still hides S2 when the widget is deselected — **intended**.

**Runtime:** second `domRefs` key `datapointDrillthroughIconEl` + a second `listeners.drillthrough*` key. F1c unsubscribe also lives on `listeners.drillthrough*` (per-widgetId replace). Subscribe drives chrome; `getSelections` peek is source of truth at click.

**Click:** assemble `source: "datapoint"` + `categories[]` from `visualizationFacet.getSelections`. If peek is `null` / empty, do **not** open.

**Files:** do **not** grow `installDrillthrough.js` (~135 already). New `view/` builder + placer. New T2 coordinator effect (not the T1 installer).

**PDF:** reuse `.kdb_hyperlink_icon` hide. No `:has()` in `pdfCapture.css`.

---

## 6. Click and spec assembly

Click on the icon: `preventDefault` / `stopPropagation`, assemble spec, call the service open/build surface (names in `drillthrough.md`). Opening is an effect only: no history, no settings write.

**Spec assembly is widgetVis** (it already holds vis derived + settings context + stamped host facets). Suggested file: `effects/assembleDrillthroughSpec.js`. Keep each file **under 150 lines**; split by job (plant ≠ assemble ≠ click).

Tranche 1 spec **must** include `source: "icon"` plus the material the service needs:

| Field | Source (owner APIs / stamps — no DOM scrape) |
|---|---|
| `source` | `"icon"` |
| `widgetId` | envelope / runtime |
| `visType` | injected `visualizationFacet.getVisType(widgetId)`; settings `visType` via existing owner read as fallback |
| `selectedDimension` | `widgetSettings` public snapshot (`getState` / existing `readEffectiveSettingsContext`) |
| `kennzahlCode` | vis **derived** (`code`) |
| `sicht` | `_KDB.api.sicht.getState()` (`currentSelection` / `activeSichtValue`) |
| `orgSelection` | `_KDB.api.dienststelle.getCurrentHierarchySnapshot()` → selected `useValue` / display / level. **Not** the walkable tree. |
| `orgTree` | Preferred: build from stamped `tableData.readRows` (`dienststelle_bw_hierarchy` / `dienststelle_dezpv_hierarchy`) per `contracts/drillthrough.md` §5.2. Omit only to use the service cache-only `readRows` fallback. Snapshot `string[]` is not the tree. |
| `yearContext.highestYearFromJahrFilter` | injected `filtersFacet.readFilterValues`, **same `itemId` as TopN** (`jahrColumnId`). **Not** TopN’s empty-global `waitForRows("year")` fallback (that is latest data year). Live legacy: current **page** scope first, else **global**, `Math.max` of selected years (`addPkzDrillthrough.js` `getHighestYearFromJahrPageContextFilter`). Do not take `data[0]` only. Do not pass `scopeId: "page"`. |
| `yearContext.highestYearFromVis` | stamped `dataQuery.peekQueryRows` (**sync**). First column whose name contains `jahr` or `year`; `Math.max` of values in 1900–2100. Fill for **every** visType; service still emits `ja_kalenderJahr` for pie/other. Line/table/list emit `ja_bisMaxStichtag` when this year is present (`contracts/drillthrough.md` §6.3). Do **not** await `readQueryRows` on click. Thenable `getResult` → null (miss). **Not** TopN `waitForRows("year")`. |
| `yearContext.defaultYear` | widgetVis calendar fallback (Mar–Dec = year−1, Jan–Feb = year−2). Do **not** leave calendar `Date.now` to the service. |

**Do not** scrape `.KDB_optionSelected` (or other settings-dropdown DOM) when owner state/selectors exist.

Pass **raw owner values**. Do **not** encode `p_p_*` query keys here — that catalog lives in `contracts/drillthrough.md`.

Tranche 1 spec has **no** datapoint/selection payload.

Tranche 2 click (S2) reuses the same owner-API fields and adds `source: "datapoint"` + `categories[]` from stamped `visualizationFacet.getSelections` (F1c flatten). If peek is `null` / empty, do not open. No Ctrl. No 3s flush.

---

## 7. Runtime

Keep `_KDB.runtime.widgetVis.byId[id]`:

- `domRefs.drillthroughIconEl` (T1 header)
- `domRefs.datapointDrillthroughIconEl` (T2 S2)
- `drillthrough: { installed, lastSelectionEvent, pendingSelectionEvents, captureActive }`

Tranche 1 may set `installed` after a successful header icon+click install. **Do not** install `content.on` in widgetVis.

Tranche 2: `subscribeSelections` via stamped `visualizationFacet` (per-widgetId replace). Store the unsubscribe on `listeners.drillthrough*` and unsub on dispose / tab / re-install. Service `subscriptions` is not enough alone. Subscribe drives chrome; peek is source of truth at click. Capture keys may be reused as a last-selection buffer only.

Icon click dispose (T1 and S2) belongs in `runtime.listeners` under `drillthrough*` keys so `cleanupDrillthroughDecorations.js` already tears them down. Never `widget.querySelector(".kdb_hyperlink_icon")`.

---

## 8. Focus mode — SHOW the icon

Cognos clones the widget header into `.expandModeContainer`. Canvas T1 host stays `.widgetHeader .widgetIcons` (same as the gear). Focus T1+S2 host is `.kdb-expand-drillthrough-column` after `.collapseSvg.focusMode`. Hide cloned in-widget copies.

**Amended 2026-09-01 / B 2026-09-02:** T1 **and** S2 SHOW in focus (S2 only when categories are real). Visual column under Ausblenden. Focus **exit** is a fourth re-install (canvas T1 + S2 peek-sync + click re-bind). Details: `contracts/widgetVis-drillthrough-focus-restore-contractdelta.md`.

**Do not** clone the PKZ icon onto `.KDB_focusModeSettingsPanel`. `filterFocusPanelIcons` keeps only info / visualizations / dimensions / TopN and would **drop** it.

Click on the Cognos header clone may need **re-bind** (gear already re-binds via `bindExpandHeaderSettingsButton`). That is a **widgetVis install** concern (re-install / re-bind on expand, same locate-or-create). Exit must re-bind the **canvas** T1 click (enter unbinds it). Not PDF. Not a settings-panel clone.

---

## 9. What changes in `widgetVis.md`

Implementer patches the parent when this delta is Approved-for-implementation. Until then this delta wins on conflict.

| Section | Change |
|---|---|
| §0 / §1 / §2 | Drillthrough = T1 header icon + T2 S2 datapoint chrome + service call. Asset/class unchanged (no new icon). No Ctrl. No new facet. |
| §4 Runtime | T1: no `content.on`. T2: `subscribeSelections` + `datapointDrillthroughIconEl` + `listeners.drillthrough*`. Subscribe drives chrome; peek is source of truth at click. |
| §5 `mount` | Default `enableDrillthrough: true`. Production passes `{ enableDrillthrough: true }` explicitly. Flag is runtime, not state. |
| `contentCreate` step 7 | Plant T1 **icon** (and click) when enabled. T2: F1c subscribe + S2 plant when categories are real. No `content.on` in widgetVis. |
| `cleanupContent` step 5 | Still `clearDrillthrough` via `cleanupDrillthroughDecorations.js`. Remove T1 + S2 icons, click, and `drillthrough*` unsubs. |
| `ensureObservers` | Add idempotent drillthrough **icon** re-install on unpark (with focus + legend). |
| Apply success / post-render | Title/legend/tooltip + **icon re-install**. Not capture flush. |
| **§10 Dependencies** | **Replace** the sentence that allows **direct `_KDB.cognosAPI` for drillthrough**. Host reads use **injected cognosHost facets only** (`visualizationFacet`, `filtersFacet`, existing stamps). **URL open goes through `_KDB.services.drillthrough`.** Keep the `pkzDrillthrough.png` / `.kdb_hyperlink_icon` dependency. Add `_KDB.services.drillthrough`, `_KDB.api.sicht.getState()`, `_KDB.api.dienststelle.getCurrentHierarchySnapshot()` (hierarchy already listed for binding). |
| §11 Cognos touchpoints | “Content selection events / current selections” → **tranche 2** via stamped `visualizationFacet.getSelections` / `subscribeSelections` (F1c ops; not a new facet). Host `content.on` stays in ring 1. “Drillthrough URL open” → service, not widgetVis `window.open` / `_KDB.cognosAPI`. |
| §12 DOM | T1 host is `.widgetHeader .widgetIcons` (unchanged). T2 host is `.widget.liveWidget.maximizable` (TR sibling). Distinct S2 wrapper. Still forbidden: new icon design; plant S2 in header or TR. |
| **§13 Drillthrough bullets** | T1 icon plant + `source: "icon"` + service call. T2: F1c subscribe + S2 plant + `source: "datapoint"` + `categories[]` from peek. Title `.kdb_hyperlink` stays the metric-URL feature (do not conflate). Subscribe drives chrome; peek is source of truth at click. Focus: T1+S2 SHOW (S2 when categories real); visual under Ausblenden; exit re-install. No settings-panel clone. |
| §15 | `WIDGET_VIS_DRILLTHROUGH_FAILED` **stays** for **install / wiring** (missing host, missing stamp, plant/bind failure). Service has **its own** build/open codes — do not collapse those into `WIDGET_VIS_DRILLTHROUGH_FAILED`. |
| §17 Folder | Add `effects/assembleDrillthroughSpec.js`. Keep `installDrillthrough.js` / `renderDrillthroughIcon.js` / `cleanupDrillthroughDecorations.js`. T2: new `view/` builder+placer + T2 coordinator (do not grow `installDrillthrough.js`). Split before 150 lines. |
| §18 | `KDB.js`: `widgetVis.mount({ enableDrillthrough: true })`. Drillthrough service registered before production mount; missing service → install skip + `WIDGET_VIS_DRILLTHROUGH_FAILED` wiring, not a failed `contentCreate`. |
| §19 | Add: `p_p_*` catalog / URL open (service); PDF capture hide (dashboardPdf); Ctrl / 3s flush; new visualization **facet**; `content.on` / `_KDB.cognosAPI` in widgetVis; scraping `.KDB_optionSelected`; cloning the icon onto `.KDB_focusModeSettingsPanel`. |
| §20 check 11 | T1 icon + T2 S2 + runtime bucket owned/cleaned by widgetVis; URL open is the service. `content.on` is not required in widgetVis. |
| Approval log | Row for this delta when PO reviews. |

---

## 10. What changes in `widgetVis-port-execution-spec.md`

| Place | Amend (this delta wins until parent sync) |
|---|---|
| Section C `installDrillthrough.js` | Consumer: plant + click + assemble + service call. **Not** “open URL through legacy-derived behavior” inside widgetVis. |
| Section D `effects/installDrillthrough.js` | **Must do (T1):** render/reuse PKZ icon; bind icon click; `installed` on runtime; call service with assembled spec. **Must not:** grow this file for T2; `content.on` / `_KDB.cognosAPI` in widgetVis; selection goes through stamped `visualizationFacet` ops. Hard limit 150; split. |
| Section D `view/renderDrillthroughIcon.js` | Locate-or-create in `.widgetHeader .widgetIcons` (expand host when expanded). Legacy class/asset. Return refs only — **no** event logic beyond returning the node. |
| **New** `effects/assembleDrillthroughSpec.js` | Owner-API spec including `source: "icon"`, `orgSelection` + preferred `orgTree`, `yearContext`. Facets via stamps (`getVisType`, Jahr `readFilterValues`, `dataQuery.peekQueryRows`). No `.KDB_optionSelected`. |
| **New** `effects/readDrillthroughVisYear.js` | Sync vis-max year from stamped `peekQueryRows`. Null on miss. |
| Section D `applyPostRenderCleanup.js` | Add drillthrough **icon re-install** (not capture re-sync). |
| `handleContentCreate` | Optionally install **icon** when enabled. Still must not wait on drillthrough for content-ready. |
| `handleEnsureObservers` (as-built; add to spec) | Unpark: icon re-install with focus + legend sweep. |
| `cleanupVisualizationContent` | Keep: remove icon via existing helper. Drop “detach content-event listeners” as a T1 must-do. |
| Section B tree | Add `assembleDrillthroughSpec.js`. Files already named stay. |
| Section G | Mount option `enableDrillthrough` default true; runtime flag. |
| Section H | `KDB.js` explicit `mount({ enableDrillthrough: true })`. |
| Section I #21 | Legacy asset/class; runtime icon + click. Capture buffers unused until T2. |
| Section J | Still: no new icon asset. Add: no `content.on` / `_KDB.cognosAPI` in widgetVis; selection via stamped `visualizationFacet`; no `p_p_*` in widgetVis; no focus-panel clone of the icon. |

---

## 11. Files

| Path | Role |
|---|---|
| `KDB3/js/dashboard/widgets/widgetVis/effects/installDrillthrough.js` | **Add (T1).** Coordinator: skip if flag false; render header icon; bind click; set `installed`. Do not grow for T2 (~135). |
| `KDB3/js/dashboard/widgets/widgetVis/view/renderDrillthroughIcon.js` | **Add (T1).** Locate-or-create plant in `.widgetHeader .widgetIcons`. |
| `KDB3/js/dashboard/widgets/widgetVis/view/` S2 builder + placer | **Add (T2).** Distinct wrapper (`kdb-datapoint-pkz`); plant on `.widget.liveWidget.maximizable` as TR sibling. Not header `.widgetIcons`. |
| T2 coordinator effect (new file, not `installDrillthrough.js`) | **Add (T2).** Subscribe replace + S2 plant/hide + datapoint click. Uses `readVisualizationFacet.js`. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/assembleDrillthroughSpec.js` | **Add.** `source: "icon"` + vis/settings/sicht/hierarchy/Jahr + vis year. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/readDrillthroughVisYear.js` | **Add.** Sync vis-max year via stamped `peekQueryRows`. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/applyPostRenderCleanup.js` | Re-install icon. |
| `KDB3/js/dashboard/widgets/widgetVis/actions/handleContentCreate.js` | Step 7 icon install when enabled. |
| `KDB3/js/dashboard/widgets/widgetVis/actions/handleEnsureObservers.js` | Unpark icon re-install. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/cleanupDrillthroughDecorations.js` | **Keep** (no rewrite unless a wiring hole). |
| `KDB3/js/dashboard/widgets/widgetVis/__orchestratorWidgetVis.js` | Stamp drillthrough service (plus existing facets). |
| `KDB3/js/dashboard/widgets/widgetVis/config/defaults.js` | Already has `drillthroughIconPath`; class token `.kdb_hyperlink_icon` if not present. |
| `KDB3/js/KDB.js` | `widgetVis.mount({ enableDrillthrough: true })`. |
| `KDB3/css/widgets/widgetVis.css` | Companion `.kdb_hyperlink_icon` only; do not change `.kdb_hyperlink`. |
| `KDB3/images/pkzDrillthrough.png` | Existing asset. |
| `contracts/widgetVis.md` | Parent sync (§9). |
| `contracts/widgetVis-port-execution-spec.md` | Spec sync (§10). |

Split before 150 lines (e.g. click bind vs plant vs assemble). No new `events/eventNames.js`.

---

## 12. Out of scope

- `p_p_*` catalog, URL template, host/env report path, `window.open` — `contracts/drillthrough.md` / the service
- New visualization **facet**; `_KDB.cognosAPI` / `content.on` in widgetVis; Ctrl / 3s flush (T2 is F1c + S2, specified in §3 / §5b)
- PDF hide CSS / `kdb-pdf-capturing` — `dashboardPdf-drillthrough-icon-hide-contractdelta.md`
- Title `.kdb_hyperlink` metric-URL behavior
- New icon artwork; substituting another asset
- Cloning the icon onto `.KDB_focusModeSettingsPanel` / extending `filterFocusPanelIcons`
- Scraping `.KDB_optionSelected` or settings-dropdown DOM
- Direct `_KDB.cognosAPI` from widgetVis for drillthrough
- Changing leftover-hide, gear `KDB_hide`, or `filterFocusPanelIcons` allow-list for this icon

---

## 13. Acceptance (tranche 1)

1. Production mount is `widgetVis.mount({ enableDrillthrough: true })`; omitted option still defaults true.
2. Enabled vis widgets get one PKZ icon in `.widgetHeader .widgetIcons` (gear host), class `.kdb_hyperlink_icon`, asset `pkzDrillthrough.png`. Locate-or-create; no duplicates after post-render / unpark.
3. Icon click assembles `source: "icon"` from owner APIs + stamped facets (not `.KDB_optionSelected`) and calls `_KDB.services.drillthrough`. widgetVis does not encode `p_p_*` or open the URL itself.
4. T1: no `content.on` and no capture flush in widgetVis. T2: F1c subscribe via stamped `visualizationFacet`; S2 plant only when categories are real. Runtime capture keys may be a last-selection buffer only; peek is source of truth at click.
5. Title `.kdb_hyperlink` unchanged.
6. Focus/expand: T1 + S2 **shown** on `.kdb-expand-drillthrough-column` under Ausblenden (S2 only when categories are real). After unmaximize: canvas T1 + S2 restored and clickable. **Not** cloned onto `.KDB_focusModeSettingsPanel`. Click re-bind is widgetVis install, like the gear.
7. `clearDrillthrough` / destroy still go through `cleanupDrillthroughDecorations.js` (T1 icon, S2 icon, `drillthrough*` unsubs).
8. Install/wiring failures use `WIDGET_VIS_DRILLTHROUGH_FAILED`. Service build/open codes stay on the service.
9. PDF capture hide is not implemented in this module (reuse `.kdb_hyperlink_icon`; no `:has()`).
10. T2 (PO 2026-08-30): no Ctrl; no 3s flush; no new facet; do not grow `installDrillthrough.js`; never `widget.querySelector(".kdb_hyperlink_icon")`.

---

## Changelog

| Date | Notes |
|---|---|
| 2026-08-28 | T1 icon consumer + service split. Approved PO vastenburg. |
| 2026-08-30 | T2 F1c + S2: consume `getSelections` / `subscribeSelections` on stamped `visualizationFacet`; S2 datapoint icon on maximizable widget root. No Ctrl. No new facet. T1 `right:28px` / `.widgetHeader .widgetIcons` unchanged. |
