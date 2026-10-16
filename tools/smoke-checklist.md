# KDB3 manual smoke checklist (Cognos + DevTools)

For: Matthijs. Language: English; UI terms are the German product terms.
Principle: the refactor must not change behaviour. "Expected" always means **same as on the baseline** (current `main` before the merge). Do the baseline run once on `main` and keep the numbers from section 0.

Legend: **[CORE]** = part of the quick Core smoke (section 1, about 10 min, run after EVERY merge). Everything else is run only when the matching workstream (WS) or the Phase 0 change is merged.

---

## 0) Setup

- [ ] Deploy the build under test to the Cognos extension path (`v1/ext/KDB3/...`). Hard-reload the browser (Ctrl+Shift+R) so no old AMD files are cached. Expected: DevTools Network shows `KDB3/js/KDB.js` loading with status 200.
- [ ] Open the **reference dashboard** (the dashboard with the KDB3 widget and the usual 5 tabs: 4-5 "dashboard" tabs plus the helper tab). Use the same dashboard, same user and same rights for baseline and test. A second run as a user **without** the superuser right is needed only for WS-K.
- [ ] Open DevTools (F12). Console: tick **Preserve log**; set the level filter to *All levels*. If the dashboard runs in an iframe, pick the right JS context in the console drop-down (top-left of the console). Handy filters: `KDB`, `TEMP`, `[sicht-jahr]`, `error`.
- [ ] Check the console handle: type `window.top.getKDB()`. Expected: the `_KDB` object (it is installed on `window.top` at boot). If `undefined`: wrong console context or boot failed - note it as a failure.
- [ ] Baseline parameter sets (Cognos "Parameterset" dropdown):
  - **Set A (v3)**: a set you saved with the current build (create it in step 1.10 if none exists).
  - **Set B (old v2)**: load a v2-format payload. The only v2 payload sample in the repo is `oude parameterset.txt` (repo root); paste it into the parameter-set content as you normally do. Note: the files in `_____________KDB3API/__savedProperties/` (`filterPropId.js`, `linePropId.js`, `loadingTablesPropId.js`, ...) are **not** parameter sets; they are the widget property values behind `spec.json` (what the Cognos widget's property fields contain). Use them only to check that the widget properties are unchanged (for example `loadingTablesPropId` lists 16 table names).
  - A **share URL** with `?parameterId=<id of Set A>` (see 1.12).
- [ ] Record the **baseline numbers** right after a fresh boot (before touching anything). Write them down next to the build id:
  ```js
  // listener counts per target (run in the console)
  const kdbCount = (t) => Object.fromEntries(Object.entries(getEventListeners(t)).map(([k, v]) => [k, v.length]));
  console.table({ document: kdbCount(document), window: kdbCount(window), body: kdbCount(document.body) });
  ```
  Note: `getEventListeners` exists only in the DevTools console (not in scripts).
- [ ] Record the **heap baseline**: DevTools -> Memory -> "Heap snapshot" -> Take snapshot (click the trash/collect-garbage icon first). Note the total MB. Optional: in the snapshot filter type `kdb` to see KDB3 object counts.
- [ ] Optional: count body observers: Performance monitor or run the profile in section 4. Baseline today: several `MutationObserver`s on `document.body` (4 for the toolbar controls, more for focus mode etc.).
- [ ] If an AMD module fails to load, the old recipe still applies: `requirejs.toUrl("kdbExt/...")` shows the URL, a `404` means "file not deployed / wrong path". Paste the `requirejs.onError` output into the failure report (section 5).

---

## 1) Boot core smoke [CORE] (about 10 min, after EVERY merge)

### Boot and chrome
- [ ] **1.1 [CORE] Load**: open the reference dashboard. Expected: the KDB3 widget renders, the loading spinner disappears, no home/"cubes unavailable" dialog.
- [ ] **1.2 [CORE] Console clean**: filter `error` and `Uncaught`. Expected: no red errors, no `RequireJS` / `Script error` / 404 in the Network tab for `KDB3/`. Warnings that also appear on baseline are fine - compare the count with the baseline.
- [ ] **1.3 [CORE] Header / Footer**: header (title and subtitle) and footer (created-by user and update date) are visible and filled.
- [ ] **1.4 [CORE] Tabs**: the tab bar shows the usual tabs; click each tab. Expected: each shows its widgets, the right tab is highlighted, no flicker loop.
- [ ] **1.5 [CORE] Launchpad**: open the launchpad on a tab. Expected: each pad shows the same entries as baseline.
- [ ] **1.6 [CORE] Filter dock**: the filter dock (Sicht, Jahr, Dienststelle, ...) is present and a click on a filter opens its popup; closing the popup works.
- [ ] **1.7 [CORE] Tables load**: the code does not log table loads, so read the state: `Object.entries(getKDB().state.tableData).map(([k,v])=>[k,v.lifecycle,v.rowCount])` (define `const getKDB = window.top.getKDB;` first) and wrap in `console.table(...)`. Expected: the same number of tables as baseline, all `lifecycle` = `ready`, and the same `rowCount` per table as baseline. The Dienststelle / Sicht popups list options (not empty).
- [ ] **1.8 [CORE] Widget add/remove**: drag one visualization (for example a `Line` chart) from the launchpad onto the canvas; set a Kennzahl via the metrics tree (drag a leaf onto it). Expected: the chart renders with data. Delete the widget (settings icon "Löschen"). Expected: it disappears, no console error.
- [ ] **1.9 [CORE] Undo / redo**: after 1.8 click Undo, then Redo (toolbar buttons). Expected: the widget disappears/returns, the buttons enable/disable like on baseline. Undo twice quickly (double-click): no error.

### Persistence
- [ ] **1.10 [CORE] Save + reload (v3)**: change something visible (header title, a filter value, one widget's chart type), save as **Set A** via the Parameterset save. Reload the browser tab, open Set A. Expected: the same title, filters, widgets, positions, chart types. Console: no `WRITEBACK_*` error codes.
- [ ] **1.11 [CORE] Old v2 set**: load Set B (see section 0). Expected: it loads without error; widgets/filters match what baseline shows for the same payload; where the old set has a missing value, the fallback info message is the same as baseline (Dienststelle / Personengruppe fallback).
- [ ] **1.12 [CORE] Share URL**: toolbar "Teilen" -> dialog title `Link zum Dashboard (Parameterset: "...")`. Copy the link, open in a new tab. Expected: the dashboard opens with that set loaded. Also toggle "Nur Lesen" in the dialog; the link then opens without the KDB control chrome / widget settings.
- [ ] **1.13 [CORE] PDF export**: toolbar "Dashboard als PDF exportieren" (PDF). Expected: spinner/busy state, then a PDF download with the visible tab(s); the button is usable again afterwards; no error toast.

### Quick exit check
- [ ] **1.14 [CORE] Close + reopen**: close the dashboard and reopen it (Cognos boots two instances on reopen; this is normal). Expected: still one header, one footer, one set of toolbar buttons (no duplicates), no console errors.

---

## 2) Phase 0 specific checks (debug sweep, orphan removal, tooling)

- [ ] **2.1 No Sicht/Jahr debug output**: filter the console by `TEMP` and by `[sicht-jahr]`, then switch Sicht (BW <-> DEZPV), change Jahr, change Dienststelle, add/rebind a vis widget, set and clear a TopN. Expected: **zero** console lines containing `TEMP` (any prefix, for example `[widgetTopN.helperPlan]`, `[widgetTopN.helperApply]`, `[widgetTopN.helperRead]`, `[widgetTopN.helperSpec]`, `[widgetTopN.extractTopNResult]`, `[widgetVis.NewestStichtag]`) and **zero** lines containing `[sicht-jahr]`. On the pre-Phase-0 baseline these are non-zero, so do not use the old build as "same as baseline" for this item.
- [ ] **2.2 No traverse log noise**: click through all tabs and reload/restore a set (tab traversal). Expected: count of `console.log` lines during tab traversal is <= baseline (expected: 0 traverse logs).
- [ ] **2.3 TopN helper is restored (behaviour change, intended)**: on a tab with a vis widget and a spare LIST in the `topN` pad (`#KDB_topNPad`, not dataTables), set a dimension and "Top 5". When the chart shows the top 5, first record the helper per chart: `const getKDB = window.top.getKDB; Object.entries(getKDB().runtime.widgetTopN.byOwner).map(([visId, r]) => [visId, r.helperWidgetId, r.lastHelperPlan === null, r.helperPlacement])` and note every `helperWidgetId`. Then check those ids by id (later releases strip the claim attributes, so do not rely on `[data-kdb-topn-claim-token]`): `['<helperId1>', '<helperId2>'].map(id => [id, !!document.getElementById(id).closest('#KDB_topNPad')])`. Expected: every entry is `true`, `lastHelperPlan === null` is `true` (post-resolution cleanup succeeded) and `helperPlacement` is `null` (no op holds the helper out). No extra table stays on the canvas next to the chart, no red outline anywhere. On the pre-Phase-0 baseline the helper stayed on the canvas with a red outline, so baseline does not apply to this item.
- [ ] **2.4 TopN rapid changes**: change Top 5 -> Top 10 -> Top 3 quickly (each click before the chart settles), then set "Ohne" (clear TopN) and change the grouping dimension. Expected: the final chart shows Top 3 (no `WIDGET_TOPN_NO_HELPER_AVAILABLE`), the recorded helper ids are inside `#KDB_topNPad` (check from 2.3), and the console shows no `[widgetTopN.placeHelperAfterOwner] restore failed` and no `[widgetTopN.postResolutionCleanup] cleanup failed` warning. Undo/redo TopN steps give the same chart result as baseline.
- [ ] **2.4a Several TopN widgets on one tab**: open or reload a tab with at least two TopN vis widgets (each with its own helper; the `topN` pad needs one spare LIST per chart). Expected: each chart is correct; the 2.3 snippet shows `lastHelperPlan === null` `true` for every chart (cleanup succeeded) and all recorded helper ids inside `#KDB_topNPad`; no `restore failed` and no `[widgetTopN.postResolutionCleanup] cleanup failed` warning (that warning means the helper reset failed, for example because it cannot render while hidden; report it with its `errorCode`). The owner charts should not appear noticeably slower (about 5 s) than baseline.
- [ ] **2.4b TopN after a Jahr change**: confirm a different global Jahr. Expected: all TopN charts on the tab rebind, the helper ids recorded in 2.3 are inside `#KDB_topNPad` (check by id; the wave releases the claims, so `helperWidgetId` is `null` afterwards and `lastHelperPlan === null` proves nothing here), no `[widgetTopN.postResolutionCleanup] cleanup failed` warning, the charts do not appear noticeably slower (about 5 s per chart) than baseline, and dragging a metric from the metrics tree onto the canvas still works.
- [ ] **2.5 Nothing else changed**: compare against the baseline for header/footer/tabs/filters/save/load (run section 1 fully, not only the CORE subset). Expected: no visual difference, same console warnings count.
- [ ] **2.6 No missing modules after orphan removal**: Network tab, filter `KDB3`. Expected: no 404, no `requirejs` "Script error" (removed orphans were never loaded, so a 404 means a real broken reference).
- [ ] **2.7 Drag and resize still work**: drag a widget by its handle and resize it. Expected: as baseline (relevant if `core/libraries/jquery-ui.min.js` is removed later).
- [ ] **2.8 Tooling (agent side, no Cognos)**: `node tools/check-all.mjs` exits 0 on the merged branch (only if the tools PR is merged).

---

## 3) Per-area sections (Phase 1 workstreams A-P)

Run the **Core smoke (section 1)** first, then only the sections of the WS being merged. "Baseline" = the same step on `main` before the merge.

### WS-A Cognos adapter layers (`cognosAPI`, `cognosHost`)
- [ ] Single-select filter write: set a single-select filter (for example Geschlecht) to one value, then clear it ("Alle"). Expected: dependent tables/charts update both times; no console error.
- [ ] Tables load on boot (same table count and `rowCount`s as baseline, see 1.7); chart widgets bind and render.
- [ ] Widget duplicate (Cognos "Duplicate" on a KDB vis widget) and tab switch. Expected: copies render, tab switch works.
- [ ] PDF export (1.13) works.
- [ ] Listener count: `getEventListeners(document)` before and after adding and removing 5 widgets - same totals as before (no growth). Console: `window.top.getKDB().runtime.cognosHost` still exists.
- [ ] Rapid filter changes (5 clicks in 2 s). Expected: final state correct, no stuck spinner; no `timeout` errors earlier than baseline.

### WS-B Binding plan/apply + tableData
- [ ] For each chart type (`Line`, `Pie`, `StackedBar`, `StackedColumn`, `List`, and the Prognose line chart): add, then change dimension, then change Kennzahl. Expected: renders identically to baseline. Console check, if you want to compare: `window.top.getKDB().services.widgetBindingPlan` is present.
- [ ] Rapid toggling: switch chart type / dimension 5 times in quick succession. Expected: ends with the last choice, no stale render, no error.
- [ ] TopN: set TopN, then "Ohne" (clear-only path). Expected: chart same as baseline; helper restored (see 2.3/2.4).
- [ ] Forced timeout: while a widget renders, switch to another tab. Expected: no hang; same message (if any) as baseline.
- [ ] All tables load on boot (same table count as baseline; `getKDB().state.tableData` shows all `lifecycle` = `ready` and the same `rowCount` per table, see 1.7); Dienststelle/Sicht popups and the metrics tree are populated.

### WS-C Writeback + properties
- [ ] Save/load round-trip for **every vis type** (Line, Pie, StackedBar, StackedColumn, List, Prognose) and every Zeitebene (grain, e.g. Jahr / Stichtag / Stichtag pro Jahr). Expected: after save + reload the widgets are identical.
- [ ] Load Set B (old v2) and compare with baseline (1.11). Corrupt JSON test: paste broken JSON into the parameter-set content. Expected: a visible message or the same behaviour as baseline, no hang.
- [ ] Share URL with a **valid** `parameterId` loads; with an **invalid** `parameterId` the dashboard opens empty with the same message as baseline.
- [ ] Save while a **non-first tab** is active; reopen. Expected: lands on the same tab as baseline.
- [ ] Destroy + re-boot 3x in one browser tab (close/reopen the dashboard). Expected: no growth in console warnings, restore still works on the 3rd time (see 4.3).
- [ ] `spec.json` properties still readable: header title/subtitle come from the saved header property.

### WS-D Feature services (message, loading, history, PDF, drillthrough)
- [ ] Toasts/dialogs: trigger an info message (restore with fallback), a share dialog and a confirm dialog ("discard unsaved changes"). Expected: placement unchanged; scroll/resize keeps them in place; closing leaves no dark backdrop.
- [ ] Spinners: dashboard load, tab switch, widget render, PDF export, parameter-set save. Expected: each shows and ends; when idle `Object.values(getKDB().state.loading).map(e=>e.activeCount)` returns all zeros.
- [ ] Undo/redo after header edit, widget move, tab rename, filter change; double-click undo quickly. Expected: stack steps correctly; after loading a parameter set the undo stack is empty (`window.top.getKDB().services.history.getSnapshot().stack.length === 0`).
- [ ] PDF export with 1 tab, with 5+ tabs, with a widget in focus mode (Vollbild), with legend charts (swatch colours/shapes in the PDF), and cancel/abort mid-export. Expected: output equals baseline; class `kdb-pdf-capturing` removed afterwards; the original tab is selected again.
- [ ] Drillthrough: click a header icon and a datapoint on a line/pie/table widget for 3-4 org/year combinations (BW and DEZPV). Expected: the target URL (Network tab or `window.open` target) equals baseline.

### WS-E Toolbar controls (wienKi, pdf, history, share)
- [ ] Button order and icons in the toolbar are unchanged: Undo, Redo, Teilen, PDF, Wien-KI (as on baseline). Test with the dark and the light Cognos theme (icon inversion).
- [ ] PDF busy state: while exporting, the PDF button is disabled/busy; afterwards enabled.
- [ ] Share dialog opens, "Nur Lesen" toggle works, read-only link hides the KDB chrome.
- [ ] Undo/redo enabled state follows the history (disabled at start, enabled after a change).
- [ ] Wien-KI: click opens the info dialog ("Wien-KI öffnen", copy-prompt) and the assist popup window.
- [ ] Performance tab (record 10 s, switch tabs, hover): exactly **one** `MutationObserver` on the body for the toolbar (see section 4).
- [ ] Close/reopen the dashboard: exactly one toolbar (no duplicate buttons).

### WS-F Tabs + dragDrop + pageSurface
- [ ] Tabs: add, rename, delete, duplicate, move (reorder) - each with undo and redo. Expected: widgets and filters of the tab follow, same as baseline.
- [ ] Startup traversal: on boot the tabs are traversed once (no visible endless tab flipping).
- [ ] Parameter-set restore (Set A and Set B) with several tabs: tabs, names and positions are restored.
- [ ] Drag a launchpad item onto a tab that was never opened in this session (lazily loaded). Expected: the drop works.
- [ ] Start dragging, press **Esc**. Expected: the drag cancels cleanly, no ghost image, widget stays.
- [ ] Console: `window.top.getKDB().utils.readCurrentTab` exists while open; after close/reopen it still works (not patched twice).

#### F2 dragDrop + pageSurface
- [ ] Drag a **visualization** from the toolbox/metrics tree onto the **first** tab, a **lazily loaded** tab (never opened in this session) and the **last** tab. Expected: the drop creates the widget at the pointer position on each; the page highlights (`kdb_drag-over`) while hovering.
- [ ] Same with a **comment** (text) from the toolbox. Expected: text widget created on each of the three tabs.
- [ ] Start a drag and press **Esc** (or release outside a tab). Expected: the avatar is gone, the page no longer shows the layout grid (`KDB_absoluteLayoutGrid`), nothing is highlighted. Console: `getEventListeners(document).dragover` has no KDB entry left.
- [ ] Switch tabs several times, then DevTools console `$$('[kdb_dropbox="true"]')`. Expected: every opened dashboard tab has exactly one bound dropbox and the helper tab has none; Elements -> Event Listeners on a bound page shows 4 drag listeners (`dragenter`, `dragover`, `dragleave`, `drop`) that stay the same objects after a tab switch (no remove + re-add).
- [ ] Drop onto the helper tab and on a tab bar area outside a page. Expected: no widget; the warning toast for the helper tab appears like on baseline.
- [ ] Destroy + re-mount (close/reopen the KDB3 widget). Expected: `document.getElementById("KDB_dragAvatarTemplates")` is `null` after destroy (no stale avatar templates), drag and drop works again after re-mount, and listener counts on `document` do not grow.
- [ ] Page size and background (kdbControl settings: dashboard width, height, background colour): change each once before and after the canvas is ready (right after load). Expected: the page size and colour follow, same as baseline; undo/redo of dashboard settings re-applies them.

### WS-G kdbControl (control primitives)
- [ ] In a widget settings panel / header editor: colour inputs (typing a hex value, picking from the palette), palette closes on outside-click, toggle switches (Ein/Aus) and radios work as on baseline.
- [ ] Close/reopen the dashboard, then `getEventListeners(document).mousedown.length` is the same as after a first boot (no extra listener).

### WS-H singleSelect + nativeMultiSelect
- [ ] Single-select popup (Geschlecht / Altersgruppe / Berufsfamilie): commit with OK, with "Alle", cancel, and click outside the popup (out-click reverts). Expected: values and dependent charts as baseline.
- [ ] Native multi-select (Jahr): select 2 years, confirm; clear; confirm again. Expected: charts reflect the years; header/filter dock text updated.
- [ ] Forced write failure: change a filter while the network is offline (DevTools -> Network -> Offline), then back online. Expected: the filter reverts to its previous value, no stuck popup.
- [ ] Delegated commits: change Sicht (delegates to Dienststelle) and the special filters; undo and redo each filter change.
- [ ] Open and close one popup 50 times. Expected: `getEventListeners(document)` counts do not grow.

### WS-I Dienststelle
- [ ] Switch Sicht BW <-> DEZPV: the Dienststelle hierarchy changes, default selection is applied, tables reload.
- [ ] Confirm a Dienststelle selection (single node, multi, a whole level). Expected: charts and the filter dock text update, drillthrough orgs match baseline.
- [ ] Parameter-set restore (Set A and Set B) restores the Dienststelle; with an invalid Dienststelle the fallback message matches baseline.
- [ ] Tab duplicate/move/delete with Dienststelle set. Expected: values follow the tab; undo/redo works.
- [ ] Console stays quiet during a Dienststelle change (no repeated lines, no `[sicht-jahr]`).

### WS-J Sicht + specialSingleSelect
- [ ] Sicht BW and DEZPV: option list, default selection and table loads match baseline.
- [ ] Personengruppe popup (only available for Sicht BW): open, select, confirm, "Alle", cancel; switch Sicht to DEZPV. Expected: the filter is hidden/disabled as on baseline.
- [ ] Dienststellenleitung popup: same flow as Personengruppe.
- [ ] Restore Set A / Set B with Sicht = DEZPV and with Personengruppe set. Expected: same values as saved.

### WS-K filterDock + metricsTree
- [ ] Performance tab: record 10 s while hovering the filter dock. Expected: scripting time not higher than baseline.
- [ ] All five filter families (Sicht, Dienststelle, singleSelect, Jahr/native multi-select, special single select): open + confirm each popup once. Expected: values commit, "Alle" and hierarchy labels show.
- [ ] Boot with and without an inbound share URL (1.12). Expected: the dock binds in both cases; popup clicks work after switching Cognos tabs/views.
- [ ] Metrics tree: search for a Kennzahl, clear the search, drag a leaf, drag a group node onto a widget. Expected: as baseline. Search a name with `&` or `<` (for example `A&B <x>`). Expected: it shows as plain text (no HTML interpreted).
- [ ] Run once as a user **with** and once **without** the superuser right: the "Beta"/release filter behaves as baseline; loading overlay clears in both.

### WS-L widgetBase + widgetSettings
- [ ] Open the settings panel of a vis widget and of a text widget; change **every** dropdown kind: Diagrammtyp, Dimensionen, TopN (including "Ohne" coupling), showValues, iterator, Zeitebene, Zoom, grouping, colour, Schriftgröße, Umstylen. Expected: each applies; undo and redo each.
- [ ] Place 20 widgets, delete them, undo the deletes. Expected: `getEventListeners(document).pointerdown.length` returns to the baseline value; `Object.keys(window.top.getKDB().runtime.widgetSettings.domRefs)` is empty only after **all** widgets are deleted (while some remain, it lists those).
- [ ] Tab duplicate / delete / move with mixed widgets (vis, text, TopN, table). Expected: widgets and settings follow; forced shortage (more widgets than slots) shows the same toast and rolls back as baseline.
- [ ] TopN without a grouping dimension: the message "Um die Top-N Funktion zu verwenden, muss zuerst eine Gruppierungsdimension gewählt werden." appears.

### WS-M widgetVis + widgetDataTable
- [ ] Drillthrough header icon and datapoint icon: compare URLs for 3-4 org/year combinations (see WS-D).
- [ ] Line, pie, stacked bar and list widgets: change vis type, dimension and TopN. Console check (optional): `plan.slots` / `localFilters` of the last binding identical to baseline.
- [ ] Performance tab with 15-20 vis widgets: re-render (change Jahr) and Dienststelle change. Expected: not slower than baseline; only **one** focus-mode `MutationObserver`.
- [ ] Maximize ("Vollbild") and restore ("Normale Größe") a widget; legend remains correct; toggling legend items works.
- [ ] Remove a widget, then change Dienststelle. Expected: no console error, the removed widget does not reappear and no hidden re-render happens.
- [ ] Data tables (widgetDataTable): behaviour as baseline (it is a no-op stub; nothing must visibly change).

### WS-N Text + TopN widgets, header, footer, launchpad
- [ ] Launchpad: pads and entries are the same and in the same order; the visible tabs in the launchpad match the canvas tabs (`dashboard` role tabs); the helper tab is not shown.
- [ ] Header: toggle visibility, edit title and subtitle, confirm; undo/redo; save/reload restores it.
- [ ] Footer: created-by user and update date show; after a parameter-set restore the footer is as saved.
- [ ] Text widget: add, edit text, font size (Schriftgröße), colour, background colour (Hintergrundfarbe), alignment (Zentriert), border presets (Rahmen); delete it. Expected: no leftover `<style>` tags (check Elements: search `kdb` in `<head>`), no `contenteditable` left after leaving edit mode or after close/reopen.
- [ ] TopN widget flows (see 2.3/2.4) unchanged.

### WS-O Core foundation (authoring, config, events, homeDialog, utils)
- [ ] **Authoring mode** (Cognos Edit ↔ View, the pencil/"Bearbeiten" button):
  - Each switch flips `getKDB().state.authoring.isAuthoring`, and `#kdb-control-root` gains or loses the class `kdb-control--authoring`. The tab bar behaves as on baseline.
  - Toggle 3×, then close/reopen and toggle again. Expected: one flip per toggle, no console errors.
  - After boot, `getKDB().runtime.authoring.dashboardFacet` is non-null and `getKDB().runtime.authoring.pendingDashboardFacetStamp` is `null`.
- [ ] **Hide-widgets property** (`KDBHideWidgetsToggle` in the widget properties; a properties feature, kept here as a regression check): on/off shows/hides the KDB widgets as on baseline.
- [ ] **Cubes-unavailable dialog:** block the table query (DevTools "Block request URL") and reload. Expected:
  - The same title and text as baseline, and only the buttons "Dashboard schließen" / "Dashboard minimalisieren".
  - Each button navigates as on baseline (close goes to the BI home perspective, minimize opens the home app view).
- [ ] **Config spot check (console):** `Object.keys(getKDB().config.tables).length === 24`; `Object.keys(getKDB().config.visualizations.kennzahlDefaults).length === 113`; `getKDB().config.links.wienKiUrl` is set; `Object.keys(getKDB().utils)` lists exactly `convertUnitToPx, getTableConfigObject, readCurrentTab, waitFor, waitForElObserver, readableTextColorForHex`.
- [ ] **Kennzahl defaults:** a Line widget with a percent Kennzahl (e.g. `P_L_Q_01`) and one with `P_ABS_K_KF_02` (Jahr 2025 excluded). Expected: the same format, aggregation caption and year filter as baseline. The Line/List month and year sort order is unchanged.
- [ ] **Links:** the WienKi button opens WienKi; the kdbControl handbook icon opens the handbook; a drillthrough opens the PKZ Analysetool URL (same as baseline).
- [ ] **Waits** (`waitFor` callers):
  - Load Set A from the Parameterset dropdown and through the share URL.
  - Switch Sicht BW↔DEZPV, then confirm Dienststelle.
  - Expected: the set and the Dienststelle apply as on baseline, with no new fallback toasts or warnings (the callers handle `WAITFOR_TIMEOUT` silently, so a timeout shows only as a missing or late update).
- [ ] **Readable text colour:** the kdbControl colour palette and the widget-settings colour dropdown show black/white text on light/dark swatches as on baseline.
- [ ] **Replay keys (collector):** undo/redo once each for header text, a tab rename, a single-select filter change, a widget move and a widget-settings option. Expected: as on baseline.
- [ ] **Full Core smoke (section 1) passes.**

### WS-P Docs, CSS, vendor, spec (non-JS)
- [ ] Boot and look: header, footer, tabs, filter dock, toolbar, popups, settings panel, launchpad look the same as baseline (screenshot compare at 100% zoom).
- [ ] Network tab: **no 404** for `KDB3/css/`, `KDB3/images/`, fonts or libraries. Icons (toolbar, widget icons, `konfigIcon.svg`) load.
- [ ] Console: no `jstree`, jQuery or font-awesome related errors. Metrics tree renders (jstree) and the widget settings panel icons are visible.
- [ ] `spec.json`: the KDB3 widget is still offered in the Cognos dashboard widget menu; the properties panel ("My options") shows the same fields; an existing dashboard still loads its saved property values (incl. the header property).
- [ ] No CSS regression: open each popup and the PDF export dialog once.
- [ ] CSS links: `[...document.querySelectorAll('link[rel=stylesheet][href*="ext/KDB3/css"]')].map(l=>l.getAttribute('href'))` returns exactly the 20 entries of `core/css/config/cssHrefList.js`, in the same order; no 404 and no request for `libraries/all.min.css` (Font Awesome removed).
- [ ] `.sr-only` still hides: `[...document.querySelectorAll('.sr-only')].map(e=>getComputedStyle(e).position)` is all `absolute` (or empty); no stray screen-reader text visible in Cognos toolbars or dialogs.
- [ ] kdbControl panel (merged `kdb-control/shell.css` + `controls.css`): collapse/expand arrow, every section, text-input focus outline, toggles, radios, action buttons; authoring mode shows the orange border.
- [ ] Toolbar buttons (merged `customButtons/toolbarControls.css`): Undo/Redo/Teilen/PDF/Wien-KI look and hover as baseline.
- [ ] Filters (merged `filters/filters.css`): Jahr filter shows no "Gesamt"; Sicht popup hides duplicates and "Alle" as before; Dienststelle and special single-select look as baseline.
- [ ] Widgets: outside developer mode non-KDB Cognos widgets stay hidden (`widgets/hostWidgets.css`); list widget columns 0/1 are 65px wide; during PDF export the widget chrome is hidden (`widgets/widgetHiding.css`); the launchpad hide spot is invisible.
- [ ] Vendor re-encoding (UTF-16 -> UTF-8): PDF export with an attachment page succeeds and umlauts render; no `SyntaxError` from `jspdf.umd.min.js` / `html2canvas.min.js`; metrics tree shows the jstree icons (`32px.png` sprites), drag and search work.
- [ ] Header shows the default Stadt Wien icon (`images/Stadt-wien.png`, status 200).

---

## 4) Leak and performance checks (run when WS-A, C, D, E, F, G, H, K, L or M is merged)

### 4.1 Listener counts (before / after N repetitions)
- [ ] Run the `kdbCount` helper from section 0 after fresh boot -> **baseline**.
- [ ] Repeat N = 20 times one of: open + close a filter popup; open + close the widget settings panel; add + delete one widget; switch tabs back and forth.
- [ ] Run `kdbCount` again. Expected: per event type (`click`, `mousedown`, `pointerdown`, `keydown`, `scroll`, `resize`) the count on `document` and `window` differs by at most the baseline noise (+0 to +2). Growth by roughly N means a leak - write down which action and which event type.

### 4.2 One body MutationObserver for the toolbar
- [ ] DevTools -> Performance monitor, or Performance recording of 10 s with tab switches. Expected: after WS-E there is one toolbar observer on `document.body`, not four; scripting time per tab switch is not higher than baseline.
- [ ] Compare the "Recalculate style" and "Scripting" totals of the recording with the baseline recording.

### 4.3 Heap growth after 3 destroy + re-boot cycles
- [ ] Heap snapshot S1 after the first boot (collect garbage first).
- [ ] Close and reopen the dashboard 3 times (each reopen boots two instances and disposes one; this is normal). After the 3rd boot collect garbage and take snapshot S2.
- [ ] Compare: DevTools Memory -> select S2 -> "Comparison" view against S1; filter `kdb` or `Detached`. Expected: total heap growth of S2 over S1 is below about 10-15 % and there are no large groups of **detached DOM nodes** or retained `_KDB` instances (no more than the live one and one being disposed). Write the MB numbers into the report.
- [ ] Console: `window.top.getKDB()` still returns the newest instance; after closing the dashboard completely, `window.top.getKDB` is `undefined` (or points to a newer instance), never to a stale one.
- [ ] Also check the console after the 3 cycles: no repeated duplicate warning lines per cycle (for example "foreign previous" chain growth in the writeback bridge).

### 4.4 Heap growth during use
- [ ] Place and delete 20 widgets, switch tabs 20 times, take snapshot S3. Expected: heap within about 10 % of S1 after garbage collection.

---

## 5) How to report a failure

Paste the following into the PR or chat. Short is fine, but all five points:

1. **What failed**: checklist item number (for example `1.10`, `WS-H`), what you expected and what you saw (one sentence + screenshot if visual).
2. **Console**: copy everything in the console since the page load (right-click -> *Save as...* or select all and copy), including red errors with stack traces. Keep the filter cleared. Include `requirejs.onError` output if a module did not load.
3. **Steps**: the exact click path, in order, starting from "fresh load of dashboard X". Say whether it also fails on baseline `main` (important: failing on baseline is not a regression).
4. **Dashboard + user**: dashboard name/id, tab, widget(s) involved, Sicht/Jahr/Dienststelle selection, and whether the user has the superuser right.
5. **Parameter set**: name of the set and the JSON of the set (Set A/B or a new one); for share-URL problems, the URL (remove tokens). Add the build id (branch / commit SHA) and browser version.

Optional but useful: Network HAR export (for 404/403/timeouts), and a heap snapshot file for leak failures (4.3).

---

## 6) WS-K metricsTree

Run after the WS-K metricsTree PR is merged. Baseline = the same dashboard on `main` before the merge. The jstree options changed (`force_text`) and drag markers are now set through node attributes, so check both.

- [ ] Expand group nodes, search, clear the search, then try to drag a **group** row (expected: no drag ghost, nothing is dropped) and a **leaf** (expected: drag works and the widget receives the Kennzahl). Repeat after collapsing/expanding a group and after a search (leaf drag still works, group drag still blocked).
- [ ] Search for a Kennzahl by short text and by a word from its tooltip (langtext); type quickly and press Enter, click the magnifier icon, press Enter/Space on the icon. Expected: filtering as baseline.
- [ ] Search a name that contains `&`, `<` or an umlaut (for example `A&B <x>`). Expected: it is shown as literal text (no HTML interpreted, no `&amp;` artefacts for plain `&`); compare labels with the baseline.
- [ ] Restore a dashboard with 10+ vis widgets. Expected: widget titles, tooltips (langtext) and title links (URL) as baseline; boot time not longer than baseline.
- [ ] Console: `getKDB().api.metricsTree.resolveMetricByCode("<known code>")` returns `resolved: true`; `("  <known code>  ")` also resolves (input is trimmed); an unknown code returns `resolved: false` with empty strings. `getKDB().api.metricsTree.getState().lifecycle` is `"ready"`.
- [ ] Run once as a user **with** and once **without** the superuser right. Expected: Kennzahlen with `FREIGABE = 0` appear only for the superuser (with the "(Beta)" tooltip suffix); the loading overlay clears in both cases.
- [ ] Close and reopen the dashboard (see 4.3). Expected: no console errors; `getKDB().api.metricsTree.getState()` is `undefined` on the disposed instance; after a reopen the tree is populated again.
