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
- [ ] Console helpers (pure-Cognos layer kept): `Object.keys(getKDB().cognosAPI)` lists 10 themes; `getKDB().cognosAPI.visualization.getLocalFiltersList(<widgetId>)` and `getKDB().cognosAPI.widgets.getWidget(<id>)` still work.
- [ ] Console: `var s=getKDB().services.cognosHost; s.filters===s.filters && s.widgets===s.widgets` is true; `Object.keys(s.visualization).length` is 16; `Object.keys(s.widgets)` has no `getWidgetType`.
- [ ] Table with a slow query (> 2 s): loads, no `DATAQUERY_WAIT_TIMEOUT` in the console, time to first rows not visibly slower (the poll now backs off from 100 ms up to 1 s).
- [ ] Toggle a vis widget's selection 10x, switch tabs 5x, duplicate and delete a vis widget 5x, switch dashboard edit/consume mode 3x: `getKDB().runtime.cognosHostService.subscriptions.length` returns to its start value; selection-driven features and the KDB authoring state still follow; no `[cognosHost.*]` errors.
- [ ] Rapid filter changes (10 within 3 s) during a tab switch (page-context wait): no `FILTERS_*` errors; a heap snapshot before/after shows a flat "EventListener" count.
- [ ] Table/vis widgets load after a tab switch (canvas waits); no `CANVAS_WAIT_*` in the console. Rename a tab and reload: the name persists.
- [ ] Share link (board id, BI base URL), footer user name and PDF file name still show; PDF export on 2 different tabs (capture root).
- [ ] Remove one required chrome selector via DevTools before load (e.g. rename the toolbar class): one alert appears once; optional misses only log `console.debug`.
- [ ] Home dialog: the BI home perspective and app view open; the cubes-unavailable message still shows with an errored data source.
- [ ] Teardown + reopen the dashboard: no `[cognosHost.*]` errors.

### WS-B Binding plan/apply + tableData
- [ ] For each chart type (`Line`, `Pie`, `StackedBar`, `StackedColumn`, `List`, and the Prognose line chart): add, then change dimension, then change Kennzahl. Expected: renders identically to baseline. Console check, if you want to compare: `window.top.getKDB().services.widgetBindingPlan` is present.
- [ ] Rapid toggling: switch chart type / dimension 5 times in quick succession. Expected: ends with the last choice, no stale render, no error.
- [ ] TopN: set TopN, then "Ohne" (clear-only path). Expected: chart same as baseline; helper restored (see 2.3/2.4).
- [ ] Forced timeout: while a widget renders, switch to another tab. Expected: no hang; same message (if any) as baseline.
- [ ] All tables load on boot (same table count as baseline; `getKDB().state.tableData` shows all `lifecycle` = `ready` and the same `rowCount` per table, see 1.7); Dienststelle/Sicht popups and the metrics tree are populated.
- [ ] Zeitebene/grain: on a Line and a List widget switch Zeitebene (Jahr, Stichtag, Stichtag pro Jahr). Expected: same filters and data as baseline.
- [ ] Hierarchy filter: with a Dienststelle selected below the top level, add a vis widget. Expected: the chart is filtered to that org as on baseline; with an unconfirmed selection no filter is applied.
- [ ] Empty data: pick a Kennzahl/filter combination without data. Expected: the same empty hint as baseline.
- [ ] Change a filter that triggers a table reload (Sicht/Stichtag/Dienststelle): the dependent table returns to `ready` with the same `rowCount` as baseline, and the parked widget (table with `parkFilter`) gets its local filter back.
- [ ] Failing table (rename a table widget title, hard reload): one toast "Tabellendaten konnten nicht geladen werden: <name>", entry `lifecycle: "error"`, other tables load normally.
- [ ] `getKDB().services.tableData.readTableState()` returns the whole map; after destroy/re-open there are no console errors from `tableData`.

### WS-C Writeback + properties
- [ ] Save/load round-trip for **every vis type** (Line, Pie, StackedBar, StackedColumn, List, Prognose) and every Zeitebene (grain, e.g. Jahr / Stichtag / Stichtag pro Jahr). Expected: after save + reload the widgets are identical.
- [ ] Load Set B (old v2) and compare with baseline (1.11). Corrupt JSON test: paste broken JSON into the parameter-set content. Expected: a visible message or the same behaviour as baseline, no hang.
- [ ] Share URL with a **valid** `parameterId` loads; with an **invalid** `parameterId` the dashboard opens empty with the same message as baseline.
- [ ] Save while a **non-first tab** is active; reopen. Expected: lands on the same tab as baseline.
- [ ] Destroy + re-boot 3x in one browser tab (close/reopen the dashboard). Expected: no growth in console warnings, restore still works on the 3rd time (see 4.3).
- [ ] `spec.json` properties still readable: header title/subtitle come from the saved header property.
- [ ] Save, then immediately switch tabs or close the dashboard: the save overlay disappears without lag and there is no console error from persist landing after destroy.
- [ ] Save in a dashboard with 2+ visible tabs while on the second tab: the host lands on the first tab for the Cognos save popup, then returns to the second tab; the overlay is gone afterwards.
- [ ] Load parameter set A, then quickly load B before A finishes: A ends `cancelled`, B is applied, the loading overlay disappears and undo/redo is not polluted.
- [ ] Destroy the dashboard while a restore or the URL-share startup is running: no console errors after destroy, and the save overlay still disappears.
- [ ] Default restore with a stalled lifecycle (DevTools breakpoint before `ready`): after 180 s the console shows `WRITEBACK_TIMEOUT` and the outcome is `cancelled`. Without the block a normal boot restores as baseline.
- [ ] Destroy + re-boot 3x without reload: `top.WBParameterGetFunction.__kdbOwner` is set on the live boot; a kept reference from a destroyed boot reads `null`. Heap snapshot shows one live `_KDB`.
- [ ] "Ein neues Dashboard erstellen" is the first option of `#selectParameterSet`, also after the select re-renders and when the save/load slot mounts late (up to 0.5 s). No KDB `MutationObserver` on `document.body`.
- [ ] Discard-confirm cancel reverts the select and restores nothing.
- [ ] Developer mode on/off follows `KDB_developerMode`; after destroy and re-boot there is at most one `[data-kdb-hidedata-hint]` badge.
- [ ] One save + one load cycle: no duplicate console lines for the same failure compared with baseline.
- [ ] Share link with a valid id restores that set (it overrides the default); an invalid id shows the info message once; a read-only share link (no save/load slot) works and shows no console errors.
- [ ] v2 (Set B) load produces the same dashboard as baseline.

### WS-D Feature services (message, loading, history, PDF, drillthrough)
- [ ] Toasts/dialogs: trigger an info message (restore with fallback), a share dialog and a confirm dialog ("discard unsaved changes"). Expected: placement unchanged; scroll/resize keeps them in place; closing leaves no dark backdrop.
- [ ] Spinners: dashboard load, tab switch, widget render, PDF export, parameter-set save. Expected: each shows and ends; when idle `Object.values(getKDB().state.loading).map(e=>e.activeCount)` returns all zeros.
- [ ] Undo/redo after header edit, widget move, tab rename, filter change; double-click undo quickly. Expected: stack steps correctly; after loading a parameter set the undo stack is empty (`window.top.getKDB().services.history.getSnapshot().stack.length === 0`).
- [ ] PDF export with 1 tab, with 5+ tabs, with a widget in focus mode (Vollbild), with legend charts (swatch colours/shapes in the PDF), and cancel/abort mid-export. Expected: output equals baseline; class `kdb-pdf-capturing` removed afterwards; the original tab is selected again.
- [ ] Drillthrough: click a header icon and a datapoint on a line/pie/table widget for 3-4 org/year combinations (BW and DEZPV). Expected: the target URL (Network tab or `window.open` target) equals baseline.
- [ ] Toast storm: trigger 5 anchored + 2 global notifications (e.g. repeated restore fallback). Run `kdbCount` (section 0) while open and after all closed. Expected: while open at most +1 `scroll` and +1 `resize` on `window`; after close back to baseline.
- [ ] Anchored toast whose anchor disappears (switch tab while it shows). Expected: it moves to the global position within a frame, no console error.
- [ ] Open and close a confirm dialog 10 times (Esc, Abbrechen, OK). Expected: no `.kdb-message-backdrop` left in Elements; `getKDB().runtime.messageService.queues.activeModalRequest === null`.
- [ ] Spinner watchdog (optional): `getKDB().services.loading.startLoading({mountKey:"smoke-test", watchdogMs:2000})`. Expected: the spinner disappears after ~2 s; no dialog (non-boot key).
- [ ] Boot watchdog dialog still appears once if boot hangs (throttle the network to "Offline" right after load start): same title/text as baseline.
- [ ] Per-widget spinners during a full tab render: spinners appear and disappear as before; the page does not jump.
- [ ] History: 6 header edits -> Undo possible exactly 5 times. `getKDB().services.history.isWritebackRestoreActive()` is `false` when idle and `true` while a parameter-set load spinner shows.
- [ ] PDF long export with abort: start a 5+ tab export, wait 10 s, abort. Expected: at most one `[dashboardPdf.*]` console line for the abort, button usable, class `kdb-pdf-capturing` gone, original tab active.
- [ ] PDF vendor path (dynamic `require`): export once. Expected: the PDF downloads; Network shows `jspdf.umd.min.js` and `html2canvas.min.js` loaded from `core/libraries/` with HTTP 200 (a wrong path shows the alert "PDF vendors are not available.").
- [ ] PDF vendor failure: block `html2canvas.min.js` in DevTools Network and export. Expected: alert "PDF vendors are not available." (as baseline); after unblocking, a second export works.
- [ ] PDF content: title page, one page per visible tab (footer "Seite n: <tab>"), "Anhang" with filter rows, legend swatches as coloured chips, no maximize/PKZ buttons; after exporting with a maximized widget, the widget is maximized again.
- [ ] Drillthrough: the console no longer shows a `[drillthrough.openDrillthrough]` URL log line (intended); the opened URL equals baseline.
- [ ] Drillthrough icon click before the hierarchy is loaded (reload, click immediately): wait window "Bitte einen Moment Geduld..." then navigates to the PKZ report.

### WS-E Toolbar controls (wienKi, pdf, history, share)
- [ ] Button order and icons in the toolbar are unchanged from baseline. DOM order, left to right: Share (Teilen), WienKI, PDF, History (Undo/Redo). Confirm the visual order once in Cognos. Test with the dark and the light Cognos theme (icon inversion).
- [ ] PDF busy state: while exporting, the PDF button is disabled/busy; afterwards enabled.
- [ ] Share dialog opens, "Nur Lesen" toggle works, read-only link hides the KDB chrome.
- [ ] Undo/redo enabled state follows the history (disabled at start, enabled after a change).
- [ ] Wien-KI: click opens the info dialog ("Wien-KI öffnen", copy-prompt) and the assist popup window.
- [ ] Performance tab (record 10 s, switch tabs, hover): exactly **one** `MutationObserver` on the body for the toolbar (see section 4).
- [ ] Close/reopen the dashboard: exactly one toolbar (no duplicate buttons).

#### WS-E (toolbarControls module)
- [ ] Declared order in `toolbarControls/config.js` (Share, WienKI, PDF, History) matches the DOM: inspect the action bar `.leading` element and confirm the four roots appear in exactly this order, identical to baseline.
- [ ] Reload the dashboard 3 times: icons, labels, tooltips and spacing are identical to baseline (same CSS classes and `data-kdb-*` attributes).
- [ ] DevTools console: `getKDB().runtime.toolbarControls.observers` has exactly one entry (`toolbar`) while all four buttons are mounted; no `runtime.historyControls`, `runtime.pdfExportControls`, `runtime.shareControls` or `runtime.wienKiControls` objects exist any more.
- [ ] Toolbar re-render: switch tabs, open and close a dialog, toggle authoring mode. The four buttons stay in order, never duplicate, and Undo/Redo still react to clicks afterwards (baseline bug: the Undo/Redo click handler stayed dead after Cognos rebuilt the toolbar).
- [ ] Switch the Cognos theme between light and dark (reload): PDF icon is black on light and white on dark; Teilen icon is inverted on dark.
- [ ] PDF export error: with the PDF service failing (for example block the capture), the button recovers (label "PDF", not busy) and the console shows a single `[pdfExportControls.export]` entry.
- [ ] Wien-KI: popup opens at the right edge of the screen; the console shows no `[wienKiControls.openWienKiPopup]` warnings in the normal case.
- [ ] Share via URL: open a share link with `readOnly=1`; the dashboard has the class `kdb-share-read-only` (KDB chrome hidden); a link without the token removes it.
- [ ] Close the dashboard: all four toolbar buttons disappear, `runtime.toolbarControls` has no observer, timer or pending wait left (DevTools: no `MutationObserver` for the toolbar remains).

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

#### F1 tabs
- [ ] Add (kdbControl "+"), then rename a tab by clicking it in edit mode: type a new name, **Enter** commits, **Esc** restores the old name, clicking elsewhere commits. Expected: the label follows, the edit icons (rename, delete, duplicate, move) disappear after the session ends.
- [ ] Delete, duplicate and move (position dialog) a tab, each followed by undo and redo (history buttons). Expected: names, order, widgets and filters follow in both directions; the caption "Tab n von m: name" shows on the loading cover while a mutation runs.
- [ ] While a delete/duplicate/move runs, look at the edit icons of another tab. Expected: they are greyed out (`aria-disabled="true"`) and clicking them does nothing; they work again after the mutation ends.
- [ ] Delete down to one visible tab, and duplicate up to the maximum. Expected: a plain notice at each limit (no error alert), nothing changes.
- [ ] Reload and watch the first seconds. Expected: one startup traversal over the tabs (no endless flipping), no console error, the originally active tab is active at the end.
- [ ] Parameter-set restore (Set A, then Set B, then reset to defaults) with several tabs: names, visibility and the landing tab follow; no console error `[tabs.*]`.
- [ ] PDF export on a dashboard with 3 or more tabs (uses the traverse). Expected: every tab is visited, export completes, the original tab is active afterwards. Cancel an export mid-way: no console error.
- [ ] Console: `const k = window.top.getKDB(); const orig = k.utils.readCurrentTab;` close the KDB3 widget, then `k.utils.readCurrentTab === orig` (the saved original is back); reopen: `readCurrentTab` is a different (tabs-aware) function again and `k.utils.readCurrentTab()` still returns the current tab.
- [ ] Destroy + re-mount twice. Expected: tab editing, mutations and undo/redo work after each re-mount; no `[tabs.*] called after destroy` warnings while idle.
- [ ] Traverse timeout leaves no stuck cover. Console: `await window.top.getKDB().api.tabs.dispatch({ type: "tabs/traverse", payload: { scope: "allDashboard", timeoutMs: 50 } })`. Expected: it resolves `false`, a `TABS_TRAVERSE_TIMEOUT` is recorded in the tabs state, the loading cover is gone and the original tab is active again after a moment.
- [ ] Rename while the kdbControl view throws still succeeds. Console: `const k = window.top.getKDB(); const orig = k.api.kdbControl.syncView; k.api.kdbControl.syncView = () => { throw new Error("x"); };`, rename a tab, then `k.api.kdbControl.syncView = orig`. Expected: the new name is shown and stays, only a `[tabs.syncKdbControlView]` warning appears (no rename failure alert).

### WS-G kdbControl (control primitives)
- [ ] In a widget settings panel / header editor: colour inputs (typing a hex value, picking from the palette), palette closes on outside-click, toggle switches (Ein/Aus) and radios work as on baseline.
- [ ] Close/reopen the dashboard, then `getEventListeners(document).mousedown.length` is the same as after a first boot (no extra listener).

#### G (kdbControl restructure)
- [ ] Control panel opens with the same layout and texts: header "Dashboard-Steuerung" with settings and info icons, toggles "Kennzahlen"/"Toolbox", sections Kommentar / Tab / Kopfzeile/Fußzeile, and Dashboard / Diagramme / Kommentare / Steuerungspanel (settings icon opens the settings panel; clicking Toolbox twice returns to Kennzahlen).
- [ ] Collapse arrow: click and Enter/Space collapse and expand the panel; arrow glyph flips.
- [ ] Settings panel, all 13 inputs: width/height accept `300mm`, `20cm`, `800px`; a value below the minimum (e.g. `1px`) is raised to the minimum with an info message; `abc`, `12` (no unit) and `0mm` show a warning and change nothing. Colour inputs update on typing/picking; palette opens on focus/click, closes on Esc, outside click and focus-out; picking a swatch fills the input and the dashboard/panel colour changes.
- [ ] Toolbox, Kopfzeile/Fußzeile: header/footer/subtitle switches follow the real header/footer state (also after a header edit or undo); the "Titel bearbeiten" radios start title/subtitle editing.
- [ ] Toolbox, Tab: "Tab hinzufügen" adds a tab (blocked message at the maximum); the "Tab 1..5" radios follow the visible tabs and select the tab edit target (one request per click, not two).
- [ ] Toolbox, Kommentar: click/drag the Kommentar button onto the canvas creates a text widget on the first, a lazily loaded and the last tab.
- [ ] Settings undo/redo: change dashboard width, background colour, panel colour, "Buttons verstecken" and developer mode; undo and redo each (values and panel colours follow).
- [ ] Parameter-set restore (Set A / Set B / "new dashboard"): canvas size, colours, switches come back; no extra undo steps afterwards.
- [ ] Switching tabs moves the control panel with the active tab (also on a tab that renders late); during startup traversal it does not hop between tabs.
- [ ] Close and reopen the dashboard: one control panel only; `getEventListeners(document).mousedown.length` equals the first boot; no `#kdb-control-root` left behind after close.

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

WS-I details. In the console use `const getKDB = window.top.getKDB;`.
- [ ] Boot (BW): `getKDB().runtime.dienststelle` has the 7 buckets plus `parameterSetRunId`, `tabMutationRunId`, `tabMutationSnapshots` and `tabsFacet`. `typeof getKDB().runtime.dienststelle.historyReplayHandlerContribution.apply === "function"`.
- [ ] Open the Dienststelle popup (BW, then DEZPV): labels stay hidden until sanitized, then show without `#`/`|` artefacts (DEZPV option display sanitized). `#filterDockContainer` has `KDB_dienststelleActive_<Sicht>` and matches `getKDB().state.filters.dienststelle.activeFilterKey`.
- [ ] Confirm a global selection. Charts update after the ~600 ms widget notify. During that window `getKDB().runtime.dienststelle.timers.userNotify` looks like `{kind:"timeout", id:…}`; afterwards the key is gone. Exactly one Undo step; Undo and Redo restore chip and charts.
- [ ] Confirm a page-scoped selection on tab 2, switch tabs and back: only tab 2 shows it. The writeback GET (save Set A) contains it for that tab.
- [ ] Clear the selection, then OK: the anchored message "Für den Dienststelle-Filter ist mindestens eine Auswahl erforderlich…" appears and the default is reapplied.
- [ ] Switch Sicht BW <-> DEZPV three times quickly: no stale chip; the hierarchy reloads once per switch; no console errors.
- [ ] Restore Set A and Set B. The old BW label maps (diagnostic `WRITEBACK_DIENSTSTELLE_BW_LABEL_MAPPED` in the writeback result). An invalid value gives the same fallback info message as baseline.
- [ ] Tab duplicate, move, and delete + undo with page-scoped values: the values follow the tab.
- [ ] Start a tab mutation and trigger a table reload: no Dienststelle reconcile runs while `getKDB().runtime.tabs.pendingPromises.tabMutation` is set.
- [ ] Drillthrough from a vis widget: the org values match baseline. In the console, `getKDB().api.dienststelle.getCurrentHierarchySnapshot({pageScopeId:"active"})` has the same keys as baseline.
- [ ] PDF export: the attachment rows list Dienststelle global and per-tab values as on baseline.
- [ ] `const s = getKDB().api.dienststelle.getState(); s !== getKDB().state.filters.dienststelle` (still a copy). `getKDB().api.dienststelle.dispatch({type:"dienststelle/syncRequested",payload:{}}) === getKDB().state.filters.dienststelle` (now the live reference, intentional).
- [ ] Destroy: `getKDB().api.dienststelle.destroy()` within 600 ms after a confirm has finished (inside the deferred widget-notify window). The pending `userNotify` timer is cancelled: no widget notify and no errors afterwards. A `destroy()` issued synchronously in the same tick as the confirm is not covered; the reconcile chain still completes and notifies, as on baseline. `Object.keys(getKDB().runtime.dienststelle.timers).length === 0`, `historyReplayHandlerContribution === null`. A second `destroy()` is silent. `dispatch(...)` warns once `[dienststelle.dispatch] called after destroy`.
- [ ] Console during all of the above: no `[dienststelle.history] push skipped`, no `[dienststelle.widgetVis.dispatch]` info lines.

### WS-J Sicht + specialSingleSelect
- [ ] Sicht BW and DEZPV: option list, default selection and table loads match baseline.
- [ ] Personengruppe popup (only available for Sicht BW): open, select, confirm, "Alle", cancel; switch Sicht to DEZPV. Expected: the filter is hidden/disabled as on baseline.
- [ ] Dienststellenleitung popup: same flow as Personengruppe.
- [ ] Restore Set A / Set B with Sicht = DEZPV and with Personengruppe set. Expected: same values as saved.
- [ ] Boot: console shows no `[sicht.` / `[specialSingleSelect.` errors or warnings. `getKDB().api.sicht.getState().lifecycle` and `getKDB().api.specialSingleSelect.getState().lifecycle` = `ready` (same as baseline).
- [ ] Startup default: fresh boot with no parameter set. Expected: Sicht shows the same default (BW or DEZPV) as baseline; Dienststelle follows; no history step is created (Undo button stays disabled).
- [ ] Sicht popup: open it. Expected: the BW/DEZPV options carry `KDB_sichtOptionBw` / `KDB_sichtOptionDezpv`, "Alle" is hidden (`KDB_sichtHideAlle`), duplicate options are hidden, unavailable options are greyed (`KDB_sichtOptionDisabled`) exactly as on baseline.
- [ ] Switch Sicht BW -> DEZPV -> BW, then Undo twice and Redo twice. Expected: Sicht, Dienststelle and Personengruppe/Dienststellenleitung follow each step as on baseline; `#filterDockContainer` carries `KDB_sssSicht_BW` when Sicht = BW and `KDB_sssSicht_DEZPV` when DEZPV.
- [ ] Rapid switch: change Sicht 3 times within ~2 s. Expected: the special filters end in the state matching the last Sicht (no stale visibility), console quiet.
- [ ] Parameter set "Neues Dashboard" / clear: Sicht resets as on baseline; restore Set A (Sicht = DEZPV): Sicht, Dienststelle, special filters restored; no `WRITEBACK_SICHT_*` warning that baseline does not show.
- [ ] Share URL (`?parameterId=` Set A): same values as on baseline after load.
- [ ] Destroy/re-boot (section 4.3 recipe): after destroy, `getKDB().api.sicht.getState()` and `.api.specialSingleSelect.getState()` return `undefined`; `getKDB().api.sicht.dispatch({type:"sicht/syncRequested"})` logs exactly one `[sicht.dispatch] called after destroy` warning; after re-boot everything works again and listener counts match section 0.

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
- [ ] With 10 widgets placed, `getEventListeners(document).pointerdown.length` equals the baseline + 1 (not + 10).
- [ ] Open a dropdown in a widget's settings panel, then click empty canvas (KDB edit mode off). Expected: the dropdown closes, and move/resize mode turns off for widgets not under the pointer. With edit mode on, the modes stay.
- [ ] Load a parameter set that has styled widgets (colour, font size, TopN, visType). Expected: the widgets and their settings match the set, and the console shows no `[widgetBase.` / `[widgetSettings.` errors.
- [ ] Focus mode: click the info icon (also the one in the main settings panel) and change one dropdown. Expected: no new console error (the info kind returns `WIDGET_SETTINGS_KIND_UNSUPPORTED` without dispatch), and the dropdown applies.
- [ ] Change a widget's dropdown option (for example Diagrammtyp), then undo and redo. Expected: the option and the widget follow each step. Repeat with a Dimension change that clears TopN (coupled Dimension -> TopN clear): one undo restores both the Dimension and the TopN choice, one redo clears TopN again.
- [ ] `window.top.getKDB().api.widgetBase.dispatch({type:"widgetBase/remove", widgetId:"<id>", payload:{reason:"user"}})`. Expected: `runtime.widgetSettings.domRefs["<id>"]`, `abortControllers["panel:<id>"]` and `abortControllers["toolbar:<id>"]` are gone; undo restores the widget with its settings panel working.
- [ ] Move a widget launchpad->canvas and canvas->launchpad, then undo/redo each. Expected: the settings panel and toolbar are restored and respond on every step.
- [ ] After a successful tab duplicate/delete/move: `Object.keys(window.top.getKDB().runtime.widgetBase.tabMutationSnapshots)` is empty.

### WS-M widgetVis + widgetDataTable
- [ ] Drillthrough header icon and datapoint icon: compare URLs for 3-4 org/year combinations (see WS-D).
- [ ] Line, pie, stacked bar and list widgets: change vis type, dimension and TopN. Console check (optional): `plan.slots` / `localFilters` of the last binding identical to baseline.
- [ ] Performance tab with 15-20 vis widgets: re-render (change Jahr) and Dienststelle change. Expected: not slower than baseline; only **one** focus-mode `MutationObserver`.
- [ ] Maximize ("Vollbild") and restore ("Normale Größe") a widget; legend remains correct; toggling legend items works.
- [ ] Remove a widget, then change Dienststelle. Expected: no console error, the removed widget does not reappear and no hidden re-render happens.
- [ ] Data tables (widgetDataTable): behaviour as baseline (it is a no-op stub; nothing must visibly change).
- [ ] Park a vis widget to the launchpad, change Dienststelle, take it back: it shows the new Dienststelle data (guards D2).
- [ ] Park a vis widget, then undo: it returns with its settings and data. Then save: the widget is in the saved state, with no `WRITEBACK_WIDGET_RESTORE_FAILED` (guards D1).
- [ ] Remove a vis widget, then save and reload: the widget stays gone, there is no console error, and `_KDB.runtime.widgetVis.byId` has no entry for it.
- [ ] Line chart with Prognose and 3+ series: hover, resize and change dimension. Legend captions never show raw `a | b | c` text, not even for a frame (rAF legend).
- [ ] Two vis widgets: maximize A via the icon, collapse it, then use Cognos-native expand on B and collapse. Each widget's focus panel and maximize state is correct, and `_KDB.runtime.widgetVis.observers.focusMode` is a single observer.
- [ ] Datapoint drillthrough icon appears after selecting datapoints in a maximized widget, and again after restore and after park/take.
- [ ] TopN widget plus a Jahr filter change: one `widgetTopN/resolveRequested` per qualifying widget, and the resulting `plan.slots` are identical to before the refactor.
- [ ] Load a parameter set with 3+ vis widgets (one with TopN): all of them bind, with no `WIDGET_VIS_BINDING_PREREQUISITE_TIMEOUT` and no stale TopN data.
- [ ] Settings reset (parameterSetReset) on a vis widget: the widget empties as before and no legend or focus observer survives in `_KDB.runtime.widgetVis.byId[id].observers`.

### WS-N Text + TopN widgets, header, footer, launchpad
- [ ] Launchpad: pads and entries are the same and in the same order; the visible tabs in the launchpad match the canvas tabs (`dashboard` role tabs); the helper tab is not shown.
- [ ] Header: toggle visibility, edit title and subtitle, confirm; undo/redo; save/reload restores it.
- [ ] Footer: created-by user and update date show; after a parameter-set restore the footer is as saved.
- [ ] Text widget: add, edit text, font size (Schriftgröße), colour, background colour (Hintergrundfarbe), alignment (Zentriert), border presets (Rahmen); delete it. Expected: no leftover `<style>` tags (check Elements: search `kdb` in `<head>`), no `contenteditable` left after leaving edit mode or after close/reopen.
- [ ] TopN widget flows (see 2.3/2.4) unchanged.

#### N1 widgetTopN
- [ ] **N1.1 Owner chart no longer waits for the helper cleanup (intended change) + lease outcome.** Prepare: a tab with 2-3 TopN vis widgets and one spare LIST in `#KDB_topNPad`; record the pad children first: `[...document.querySelectorAll('#KDB_topNPad [data-kdb-launchpad-pad="topN"] > *')].map(e => e.id)`. Then (a) set "Top 5" on one chart, (b) change Top 5 -> Top 10 -> Top 3 quickly, (c) confirm a different global Jahr (wave over all TopN charts on the tab). Time each from the click to the chart showing the new values (stopwatch or DevTools Performance) and compare with the same steps on the baseline build. Expected: each chart appears about the helper cleanup render time (up to ~5 s per chart, serial in the Jahr wave) earlier than baseline, never later; values as baseline. Lease outcome after each step (wait ~5 s for the background cleanup): the pad snippet returns the same helper ids as recorded; `Object.values(getKDB().runtime.widgetTopN.byOwner).map(r => r.helperPlacement)` is all `null`; `Object.keys(getKDB().runtime.widgetTopN.pendingPromises)` is `[]` (no cleanup left running); after (a) and (b) `byOwner[visId].lastHelperPlan === null` for the changed chart; no chart shows `WIDGET_TOPN_NO_HELPER_AVAILABLE`; the console shows no `[widgetTopN.placeHelperAfterOwner] restore failed`, no `[widgetTopN.postResolutionCleanup] cleanup failed` and no `[widgetTopN.settleHelperCleanup] helper cleanup did not settle` warning. Repeat (c) and reload the dashboard during the wave once: no console error from widgetTopN.
- [ ] **N1.2 widgetTopN module conversion (no behaviour change).** On a vis widget: set a dimension and Top 5 (values appear, the helper is back in its pad slot, no title editor is left open on the helper), change N to Top 10, set "Ohne", change the grouping dimension, then undo/redo the TopN steps. Expected: same charts and same values as baseline. Console: no widgetTopN error, no `[widgetTopN.dismissHelperTitleEdit] dismiss failed` warning, and `getKDB().api.widgetTopN.getState()` returns an object with `lifecycle: "ready"` and one `byOwner` entry per TopN chart. Not covered here: deleting a TopN chart does not release its helper claim (known leak, Phase 2).

#### N2 widgetText
- [ ] Add a text widget from the launchpad: the default text ("Text hier eingeben") shows. Click the title icon to edit: the text is selected, typing works. Click outside (blur) commits; the new text stays. Start an edit again, type, press Esc: the original text returns and `contenteditable` is gone.
- [ ] Undo and redo the text edit (history controls): the text switches between old and new; no extra history entry is created by undo/redo.
- [ ] Font size (Schriftgröße): choose a fixed size (for example 24px), then "Automatisch". Expected: fixed size applies at once, automatic refits to the widget. After an edit with automatic size the text refits (a window resize event fires; this is expected).
- [ ] Restyle options (Rahmen alle/unterer/oberer, Zentriert, combinations, Reinigen): the header class on the widget changes as in the baseline; "Reinigen" removes all.
- [ ] Background colour (Hintergrundfarbe): pick a dark and a light colour on the text widget. Expected: the text colour follows (white on dark, black on light), also for the extreme values (white and black). In Elements the `<style id="KDB_widgetTextColor_...">` contains `color: #FFFFFF !important;` or `#000000`.
- [ ] Delete the text widget. Expected: no `<style id="KDB_widgetTextFontSize_...">` or `<style id="KDB_widgetTextColor_...">` left in `<head>` (search `KDB_widgetText`).
- [ ] Destroy during an open edit: start an edit (cursor in the text), then close/reopen the dashboard (or reload the KDB extension). Expected: no element with `contenteditable="true"` or `data-kdb-text-edit-active` remains on the text widget and its original text is shown.
- [ ] Parameter-set restore with two text widgets (different texts, one with fixed font size): save, reset/switch to another parameter set, restore. Expected: both texts and font sizes are restored; no history entry is created by the restore.
- [ ] Save and reload the dashboard: text content of each text widget is as saved (writeback reads `widgetText` state).

#### N3 header + footer
- [ ] Header on/off from the toolbox: header appears at the top of the page and disappears again; turning it off also hides the footer.
- [ ] Header title and subtitle edit: confirm with Enter, with blur (click elsewhere on the canvas) and with click outside; Esc / cancel keeps the old text. The subtitle row appears when text is committed and disappears when the text is empty.
- [ ] Footer toggle: works while the header is on; is blocked (switch stays off) while the header is off.
- [ ] Footer shows the new title right after a header title commit (footer on, edit the header title, confirm). Also after undo/redo of the title.
- [ ] Footer page indicator follows the active tab (switch tabs 1 -> 2 -> 3); update date and created-by user show.
- [ ] Undo/redo for each: header toggle, subtitle toggle, title edit, subtitle edit, footer toggle. Redo/undo of the header toggle with the footer on hides/shows the footer consistently.
- [ ] Save, reload and parameter-set restore: header on/title/subtitle/icon and footer on are restored; a saved dashboard without header comes back with header and footer off.
- [ ] DOM check (Elements): no `kdb-dashboard-header-draft*` inputs inside `#KDB_topHeader` and no zoom-hint toast after switching the header on. A header icon dispatched with an unsafe key (`getKDB().api.header.dispatch({type:"header/setIcon",payload:{source:"api",iconKey:"../x"}})`) falls back to `Stadt-wien`.
- [ ] Destroy and re-boot: no header or footer wrapper left from the old instance; no growth of `document` `pointerdown` listeners after repeated header edits (section 4.1).

#### N4 launchpad
- [ ] Load a dashboard with 3 tabs plus the helper tab. Console: `_KDB.api.launchpad.getState()` shows `lifecycle: "ready"`, one entry per dashboard tab in `tabs` (same order as the canvas tabs), the helper tab only in `helperTabIds`, and 5 pads (`visualization`, `text`, `dataTables`, `topN`, `otherResources`) each with one slot per tab. Elements: `#KDB_HideSpot > #KDB_widgetLaunchpad` has the 5 pad divs with one `.KDB_launchpadSlot` per tab.
- [ ] Drag a visualization, a text widget and a TopN widget from the launchpad pads onto the canvas of different tabs. Expected: each lands where dropped, TopN resolves its helper (helper widget is read through `launchpad/readSlotWidgets`), no console errors.
- [ ] Duplicate a widget and delete a widget. Expected: same result as baseline; the launchpad keeps parking the widgets (check `_KDB.api.launchpad.dispatch({type:'launchpad/readSlotWidgets',payload:{padKey:'visualization'}})` resolves `ok: true`).
- [ ] Save, reload the dashboard. Expected: same tabs and widgets, launchpad `getState()` as before, no widgets left outside their slots.
- [ ] Close/destroy the KDB widget (remove it from the dashboard or re-render). Expected: `#KDB_HideSpot` is removed from `document.body`, no leftover `#KDB_widgetLaunchpad`, no console errors.

### WS-O Core foundation (authoring, config, events, homeDialog, utils)
- [ ] **Authoring mode** (Cognos Edit ↔ View, the pencil/"Bearbeiten" button):
  - Each switch flips `getKDB().state.authoring.isAuthoring`, and `#kdb-control-root` gains or loses the class `kdb-control--authoring`. The tab bar behaves as on baseline.
  - Toggle 3×, then close/reopen and toggle again. Expected: one flip per toggle, no console errors.
  - After boot, `getKDB().runtime.authoring.dashboardFacet` is non-null and `getKDB().runtime.authoring.pendingDashboardFacetStamp` is `undefined` (the handshake is gone, authoring registers after the services).
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

## WS-K filterDock

Run section 1 first. "Baseline" = the same step on `main` before the merge.

- [ ] After boot: `window.top.getKDB().api.filterDock.getState()` returns `lifecycle: "ready"`, `filtersReady: true`, `errorCode: null`. `window.top.getKDB().runtime.filterDock.diagnostics` shows `mutationBatches` and `evaluations` counters that grow while you hover or click in the dock (`state.observedChildren` and `state.pendingSignals.mutationCount` stay at their initial values by design).
- [ ] Hover over every filter header in the dock for 10 s with no popup open. Expected: no console errors; Performance scripting time not above baseline.
- [ ] singleSelect popup: open, pick an option, "Alle", OK; re-open the **same** filter right away. Expected: custom popup and the selected-option highlight appear every time.
- [ ] Sicht and special single select (Personengruppe): open, select, OK; open, Cancel. Expected: the popup renders the custom options each time.
- [ ] Dienststelle with Sicht BW and with DEZPV: open the popup, wait 1 s, close it. Expected: hierarchy labels as baseline (BW: no popup-label resync; DEZPV: labels resynced); committed display text under the filter as baseline.
- [ ] Native multi-select (Jahr): open, tick 2 values, OK. Expected: values commit; click outside the dock while Jahr is the last-clicked filter produces no console error.
- [ ] Load Set A and the share URL (1.12). Expected: restore finishes in normal time (writeback waits for `filtersReady`; no stall of about 68 s).
- [ ] Filters with a double quote or backslash in the Dienststelle/filter name (if the data has any): open the popup. Expected: no `SyntaxError` in the console, the popup renders.
- [ ] Reload the dashboard with the Cognos filter dock disabled or hidden (or block it in the page): after about 30 s the console shows `[filterDock.mount] filter dock wait failed` once, `getKDB().api.filterDock.getState().errorCode` is `FILTER_DOCK_CHROME_WAIT_TIMEOUT`, and the dashboard stays usable.
- [ ] Close the dashboard and re-open it 3 times: no console errors; `getEventListeners(document).click.length` returns to baseline (the outside-click listener is removed on destroy).

## 6) WS-K metricsTree

Run after the WS-K metricsTree PR is merged. Baseline = the same dashboard on `main` before the merge. The jstree options changed (`force_text`) and drag markers are now set through node attributes, so check both.

- [ ] Expand group nodes, search, clear the search, then try to drag a **group** row (expected: no drag ghost, nothing is dropped) and a **leaf** (expected: drag works and the widget receives the Kennzahl). Repeat after collapsing/expanding a group and after a search (leaf drag still works, group drag still blocked).
- [ ] Search for a Kennzahl by short text and by a word from its tooltip (langtext); type quickly and press Enter, click the magnifier icon, press Enter/Space on the icon. Expected: filtering as baseline.
- [ ] Search a name that contains `&`, `<` or an umlaut (for example `A&B <x>`). Expected: it is shown as literal text (no HTML interpreted, no `&amp;` artefacts for plain `&`); compare labels with the baseline.
- [ ] Restore a dashboard with 10+ vis widgets. Expected: widget titles, tooltips (langtext) and title links (URL) as baseline; boot time not longer than baseline.
- [ ] Console: `getKDB().api.metricsTree.resolveMetricByCode("<known code>")` returns `resolved: true`; `("  <known code>  ")` also resolves (input is trimmed); an unknown code returns `resolved: false` with empty strings. `getKDB().api.metricsTree.getState().lifecycle` is `"ready"`.
- [ ] Run once as a user **with** and once **without** the superuser right. Expected: Kennzahlen with `FREIGABE = 0` appear only for the superuser (with the "(Beta)" tooltip suffix); the loading overlay clears in both cases.
- [ ] Close and reopen the dashboard (see 4.3). Expected: no console errors; `getKDB().api.metricsTree.getState()` is `undefined` on the disposed instance; after a reopen the tree is populated again.

---

## 7) WS-H singleSelect + nativeMultiSelect

Run after the WS-H singleSelect and nativeMultiSelect PRs are merged. Baseline = the same dashboard on `main` before the merge. The checks in section 3 (WS-H) still apply; these cover what the refactor changed.

- [ ] **Out-click after reconcile**: open Geschlecht, pick a value, click outside the popup: the value reverts. Switch to another tab and back (this runs a reconcile), open Geschlecht again, pick a value, click outside: it reverts again (the old build could revert a stale record the second time). Then run `getEventListeners(document.querySelector(getKDB().elements.selectors.singleSelect.outClickCatcherSelector) || document.body)` in the console: the `click` count is 1 or less after 20 open/close cycles.
- [ ] **Tab mutation snapshots**: on tab 2 set one singleSelect value and two Jahr values. Delete tab 2 and undo, move tab 1 with tab 3, duplicate tab 2. After each step the filters follow the tab, and `getKDB().runtime.singleSelect.tabMutationSnapshots` and `getKDB().runtime.nativeMultiSelect.tabMutationSnapshots` are both `{}`.
- [ ] **Writeback round-trip**: save Set C with Geschlecht = a value and Jahr = 2 years (global and page level). Load Set A, then load Set C: both filters are restored. "New dashboard" clears: Geschlecht = "Alle", Jahr empty. Console: no `WRITEBACK_*` codes, and at most one log line per failure.
- [ ] **History**: change Geschlecht, then Jahr. Undo twice and redo twice: the values follow. A visible special filter follows the Geschlecht undo.
- [ ] **PDF export** right after boot (reconcile path): the export works and there is no `DASHBOARD_PDF_FILTER_PREPARATION_FAILED`.
- [ ] **Destroy and reopen** (section 4.3 cycle): after the reopen, `getKDB().runtime.singleSelect.timers` and `.abortControllers` are `{}` or hold only live entries, and `getKDB().runtime.nativeMultiSelect` has the 7 buckets (`domRefs`, `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`).
- [ ] **Committed display chip**: after a commit, the filter dock chip text matches the value, on a global filter and on a page filter. Try a filter label that contains a quote character if one exists.

### 7b) WS-H singleSelect behaviour changes (B1 core, C-final wiring)

Run after the singleSelect C-final PR is merged. Baseline = the same dashboard on the commit before the WS-H singleSelect PRs. Each step lists what to do in Cognos and what to expect. Use `const getKDB = window.top.getKDB; const ss = () => getKDB().state.filters.singleSelect;` in the console.

- [ ] **Out-click revert after reconcile (L2 rebind)**: open Geschlecht, pick a value, click outside the popup. Expected: the value reverts to the previous one and the popup closes. Switch to another tab and back (this runs a reconcile), open Geschlecht again, pick another value, click outside. Expected: it reverts again, and `ss().instancesById` has no entry whose `pendingSelection` still holds the abandoned value. Repeat on a tab-scoped singleSelect. Console: no `[singleSelect.outClickRevert] failed`.
- [ ] **Delegated commit**: change Sicht (delegates to Dienststelle), then a special filter (Personengruppe), then commit a plain singleSelect in the same session. Expected: each commit lands once (dock chip text, charts and Dienststelle hierarchy follow, no second write), `ss().errorCode` is `null`, `getKDB().runtime.singleSelect.delegatedOperationIds` has one entry per delegated commit (never more than 100) and does not grow on a repeated OK click, and a repeated click on OK within 1 s does not commit twice.
- [ ] **Chip text with a double quote**: use a singleSelect option whose label contains `"` (for example `Test "A"`; add one to the options table on a test dashboard if the data has none). Open the popup, select it, press OK. Expected: no `SyntaxError` or `Failed to execute 'querySelector'` in the console, the dock chip shows the full label with the quote, and re-opening the popup highlights that option.
- [ ] **Undo and redo of a singleSelect change**: change Geschlecht (A to B), then Altersgruppe, then Jahr. Press undo three times, then redo three times. Expected: after each step the host filter, the dock chip and the charts follow in order, no extra undo step is created by the replay (the undo stack count equals the number of changes), and `ss().errorCode` stays `null`. Undo the Geschlecht change while a Sicht-dependent special filter is visible: it follows. Do one change, undo it, then do a different change: redo is no longer available.
- [ ] **Boot reconcile (L1 timeout and abort)**: (a) Normal boot: reload the dashboard, wait for the filter dock, run `ss().inventory`. Expected: `freshness: "fresh"`, `errorCode: null`, no `SINGLE_SELECT_RECONCILE_TIMEOUT` in the console. (b) Slow dock: throttle CPU 6x (DevTools -> Performance -> CPU) and reload. Expected: either the same result as (a) (the inventory retries until the dock is there) or, if the dock needs more than the timeout (default 3 s, at most 10 s), `ss().inventory.errorCode === "SINGLE_SELECT_RECONCILE_TIMEOUT"` with `freshness: "stale"` and no stack trace loop; running `getKDB().api.singleSelect.dispatch({ type: "singleSelect/reconcileFilterInstances", payload: { reason: "filtersReady" } })` afterwards (CPU back to normal; prefix the call with `await` or use `.then(console.log)`) resolves to `ok: true`. (c) Abort: reload and close the dashboard within 1 s of the start. Expected: no console error after the close, no timer left (`getKDB().runtime` is gone or `runtime.singleSelect.abortControllers` is `{}`).
- [ ] **Destroy and reopen the dashboard**: open the dashboard, change one singleSelect, close it, reopen it, repeat 3 times (section 4.3). Expected: `getKDB().api.singleSelect.getState()` after the close is `undefined` and `dispatch` of any singleSelect action on the old controller does not throw; after the reopen `ss().lifecycle` is `"ready"`, `getKDB().runtime.singleSelect.abortControllers` and `.timers` are `{}` or hold only live entries, `getEventListeners(document).click.length` equals the first boot, and the history replay still works (undo after reopen restores the value).
- [ ] **Commit verification rollback (C8)**: in the console, wrap the host writer so it writes nothing: `const f = getKDB().services.cognosHost.filters; const w = f.writeFilter; f.writeFilter = async () => ({ ok: true });`. Open Geschlecht, pick a different value, press OK. Expected: the commit does not stick, the chip and the host filter keep the previous value, `ss().errorCode === "SINGLE_SELECT_COMMIT_VERIFICATION_MISMATCH"`, the console shows one `[singleSelect.commitConfirmedSelection] commit failed` line, and no stuck popup or `isCommitInProgress: true` (check `Object.values(ss().instancesById).some(i => i.isCommitInProgress)` is `false`). Then make the rollback fail too: `f.writeFilter = async () => { throw new Error("offline"); };` and commit again. Expected: `ss().errorCode === "SINGLE_SELECT_HOST_ROLLBACK_UNVERIFIED"` with an errorMessage naming the uncertain owner state, and still no stuck popup. Restore the writer: `f.writeFilter = w;`, reload, and confirm a normal commit works and `ss().errorCode` is `null`.
- [ ] **Tab mutation rollback with a singleSelect parameter**: on tab 2 set Geschlecht (tab-scoped) to a non-default value and one global singleSelect to another value. Delete tab 2, then restore it with undo. Expected: the tab is back, Geschlecht on tab 2 shows the value from before the delete, the global value is unchanged, and `getKDB().runtime.singleSelect.tabMutationSnapshots` is `{}`. Now force a failed rollback: delete tab 2 again and, before undo, go offline (DevTools -> Network -> Offline), press undo, then go back online. Expected: no stuck loading overlay, the console shows at most `TABS_MUTATION_ROLLBACK_INCOMPLETE` diagnostics (one log line per failure, no repeated errors), `tabMutationSnapshots` is `{}`, and after going online `ss().inventory.freshness` returns to `"fresh"` once you switch tabs; Geschlecht on tab 2 equals either the restored value or the default, never an empty or stale chip.

## 8) Phase 2

Phase 2 changes are listed per wave. "Baseline" = the same step on `main` before the wave merged; expected = baseline unless a delta is named.

### P2-W2 merged-area hygiene sweep

- [ ] PDF export: click the PDF button, let it finish. Expected: the PDF saves; title page, `Seite n: <tab>` footers, the `Anhang` page and its rows (Dashboard-Name, Filter, Daten-Quellen-Beladung, Quelle, Datenaktualität, Aktualisierungszyklus, Verwendetes System, Umgebung, Erstellungsdatum, Kennzahlen, Data Steward) read exactly as in a PDF exported on `main`; a tab without a name reads `Unbenannter Tab`.
- [ ] PDF abort: start an export, close the dashboard (or reopen it) mid-export. Expected: no error dialog; the console shows a debug line `stopped (disposed: the dashboard was closed during the export)` (new wording, was `stopped`). The button is usable again after reopening.
- [ ] Drillthrough from a header icon (vis widget with the drillthrough icon): opens a new tab with the Cognos drillthrough URL as on baseline. In the new tab's console `window.opener` is `null` (new). If the organisation hierarchy is not loaded yet, the wait window shows the "Bitte einen Moment Geduld" text and then navigates; it must not stay empty and it must not be reported as a blocked popup.
- [ ] Drillthrough from a datapoint (click a data point icon): same URL and window behaviour as the header icon. Close the dashboard while a wait window is still showing "Geduld": the wait window closes by itself (new, was left open) after the next destroy wiring lands (stage 2; until then it stays as on baseline).
- [ ] Header links: click the Benutzerhandbuch icon and the Dataspot icon. Expected: the same pages as on baseline (`getKDB().config.links.userManualUrl` / `dataSpotUrl` are the targets, inspect the `href` of `#KDB_userManual` / `#KDB_dataSpotIcon` parents).
- [ ] Text widget autofit after resize: add a text widget with font size `Automatic`, type a long text, resize the widget and the browser window, undo/redo a text edit and reload a saved set with several text widgets. Expected: the text refits as on baseline (a refit may now trail by one frame). Performance: with a saved set that has 5+ automatic text widgets, the restore shows one `resize` burst, not one per widget (Performance panel, optional).
- [ ] metricsTree: expand/collapse groups, type in the search box (typing, Enter, magnifier click), clear it, drag a leaf; then close and reopen the dashboard 3 times while the tree is still loading (close right after the first paint). Expected: tree and search as baseline, no console errors, no stuck loading overlay; `getKDB().api.metricsTree.getState()` is `undefined` on the disposed instance.
- [ ] Chrome alert text (only if you can force a missing required chrome selector, for example by blocking the page layout node): the alert reads `Teile der Dashboard-Oberfläche konnten nicht geladen werden. Bitte das Dashboard schließen und erneut öffnen. Details stehen in der Browser-Konsole.` with title `Dashboard`.
- [ ] Console after boot: `getKDB().config.labels.de` has `chrome`, `dashboardPdf` and `drillthrough`; `getKDB().elements.selectors.messageService` is `undefined` (intended).

### P2-X1

TopN abort signal: core `widgetBindingApply` now rejects a signal without `addEventListener`/`removeEventListener` (`WIDGET_BINDING_APPLY_INVALID_INPUT` before any Cognos call). Nothing in the app passes such a signal since PR #32, so every step here must behave exactly like `main`. **This cannot be verified without Cognos**: the timing of the helper render wait (up to the 5 s `helper` timeout) and of the background helper cleanup only exists in the real host. Keep DevTools open and the console filter on `widgetTopN` and `WIDGET_BINDING_APPLY`.

- [ ] **X1.1 TopN change on a chart: no extra delay, no apply error.** On a tab with a vis widget and a spare LIST in the `topN` pad, record the pad children first: `[...document.querySelectorAll('#KDB_topNPad [data-kdb-launchpad-pad="topN"] > *')].map(e => e.id)`. Set a dimension, then "Top 5", then "Top 10", then "Ohne". Time each from the click to the chart showing the new values (stopwatch) and compare with `main` before this change. Expected: same time as baseline (no new wait; the chart does not wait for the helper cleanup), correct values, **zero** console lines containing `WIDGET_BINDING_APPLY_UNEXPECTED_ERROR` or `WIDGET_BINDING_APPLY_INVALID_INPUT` or `Invalid AbortSignal`.
- [ ] **X1.2 Helper returns to its launchpad slot.** About 6 s after each step of X1.1, rerun the pad snippet. Expected: the same helper id as recorded is in the pad slot again, `Object.values(getKDB().runtime.widgetTopN.byOwner).map(r => r.helperPlacement)` is all `null`, `Object.keys(getKDB().runtime.widgetTopN.pendingPromises)` is `[]`, and no table remains next to the chart. Console: no `[widgetTopN.placeHelperAfterOwner] restore failed`, no `[widgetTopN.settleHelperCleanup] helper cleanup did not settle`. A `[widgetTopN.postResolutionCleanup] cleanup failed` warning is baseline behaviour (hidden helper may not render within 5 s); report its `errorCode`, and it must not be `WIDGET_BINDING_APPLY_UNEXPECTED_ERROR`.
- [ ] **X1.3 Rapid TopN toggling.** Click Top 5 -> Top 10 -> Top 3 -> "Ohne" -> Top 5 quickly (each click before the chart settles), on two charts of the same tab one after the other. Expected: the final charts show the last choice (no `WIDGET_TOPN_NO_HELPER_AVAILABLE`), helpers are back in the pad as in X1.2, and the console shows no `WIDGET_BINDING_APPLY_*` error code other than aborted-operation diagnostics already present on `main`.
- [ ] **X1.4 Other bindings are untouched.** Change the vis type, the dimension and the Zeitebene of a normal (non-TopN) chart, undo and redo each. Expected: as baseline, no `WIDGET_BINDING_APPLY_INVALID_INPUT` in the console.

### P2-W1

Bootstrap manifest, idempotent render, replay registration, loading watchdog contract, CSS cleanup. Keep DevTools open (console filter cleared).

- [ ] **Boot.** Open the dashboard. Expected: boot overlay (if enabled) then all chrome as baseline; `Object.keys(window.top.getKDB().api)` lists the same names as baseline; `getKDB().state.rootLifecycle.lifecycle` is `"ready"`; no new console errors or warnings.
- [ ] **Authoring.** `getKDB().runtime.authoring.dashboardFacet` is non-null and `getKDB().runtime.authoring.pendingDashboardFacetStamp` is `undefined` (intended change: registration order, no handshake). Switch the dashboard between edit and preview: the kdbControl panel toggles its authoring look exactly as on baseline and `getKDB().api.authoring.getState().isAuthoring` follows.
- [ ] **Reopen = double boot.** Close the dashboard and reopen it (Cognos creates a second instance and disposes the first during the open sequence). Expected: dashboard fully styled during and after the reopen (no unstyled flash, no missing CSS), `window.top.getKDB` is a function and returns the newer instance (`getKDB().state.rootLifecycle.lifecycle === "ready"`), no console errors. Repeat 3 times.
- [ ] **`render()` twice from the console.** `const r = getKDB().getAPI().render; const p1 = r({}); const p2 = r({}); p1 === p2` is `true` and both resolve to the first result. Expected: nothing is registered or mounted again (no new overlay, no duplicated header/footer/tabs, `Object.keys(getKDB().api)` unchanged, no console output for identical options). Then `r({ parent: document.body })`: still the same promise and nothing mounts, but one console warning `[core.renderKDB] second render() ignored: it passed a different parent than the first call` (intended change; if this warning ever shows up in normal use, Cognos re-renders a live instance and the parent rebind needs its own path: report it). (Intended change: before, the second call re-registered and re-mounted everything.)
- [ ] **Undo/redo on all 18 replay keys** (history keeps 5 steps; do them in batches, each: change, Undo, Redo, compare with baseline): `kdbControl_settingsChange` (any kdbControl setting), `header_chromeChange` and `header_textChange` (header colour/text), `footer_chromeChange`, `filter_singleSelect`, `filter_sicht`, `filter_dienststelle`, `filter_nativeMultiSelect` (Jahr), `widget_canvasDrop` (drop a Kennzahl on an empty widget), `widget_launchpadTransfer` (launchpad to canvas), `widget_layoutMove`, `widget_layoutResize`, `widgetSettings_optionSelect` (widget settings dropdown), `widget_textEdit` (text widget), `tabs_move`, `tabs_delete`, `tabs_duplicate`, `tabs_rename`. Expected: every undo and redo restores the state as on baseline, no "Rückgängig machen ist fehlgeschlagen" / "Wiederholen ist fehlgeschlagen" toast, console without `handler missing`. Console check: `getKDB().services.history.registerReplayHandler` is a function; `getKDB().runtime.history.adapters` is `{}` (intended change: handlers are registered per key, once).
- [ ] **Cubes-unavailable dialog.** Open a dashboard whose data cubes are unavailable (or for a user without cube rights). Expected: the dialog "Daten-Cubes nicht verfügbar" with the same text and the two choices "Dashboard schließen" / "Dashboard minimalisieren" as baseline; each choice navigates as baseline. Close the dashboard while the dialog is still open: no dashboard content mounts afterwards and no second dialog or error appears (intended change: a render that finishes after destroy mounts nothing).
- [ ] **Slow-load watchdog dialog.** With the dashboard open run `getKDB().services.loading.startLoading({ mountKey: "kdb-root-loading-animation-mount", watchdogMs: 5000 })`. After 5 s the overlay disappears and the dialog "Dashboard nicht vollständig geladen" opens with the text "Das Dashboard oder die benötigten Daten konnten nicht innerhalb von 5 Minuten ..." and the two navigation choices, identical to baseline. Same call with `mountKey: "smoke-test"`: overlay lifts after 5 s, no dialog. Console: `getKDB().services.loading.registerWatchdogHandler` is a function.
- [ ] **CSS links removed after destroy.** Before closing: `document.head.querySelectorAll('link[rel="stylesheet"][href*="ext/KDB3/css"]').length` is the full set (20) and has no duplicates after reopen. After closing the dashboard (and no other KDB dashboard open): the same query returns `0` (intended change: the links used to stay). After a reopen the full set is back.
- [ ] **Listeners after destroy, 3 times.** Close and reopen the dashboard 3 times. Keep `const k = getKDB()` from the first open. Expected after each close: `window.top.getKDB` is gone (or the newer instance), `k.events === null`, `k.runtime.homeDialog === null`, `k.state.rootLifecycle.lifecycle === "disposed"`; `getEventListeners(document)` and `getEventListeners(window)` counts return to the baseline numbers (as in 4.3), Memory heap snapshot after the third cycle shows no growth in detached KDB nodes compared with baseline.

### P2-W3

Additive public APIs (no consumer uses them yet, so the app must behave exactly like `main`). Smoke = **CORE boot only** (section 1, items 1.1-1.14), then the console snippet below on the booted dashboard. Every line states the expected shape; any `Uncaught` or a differing shape is a failure.

- [ ] **P2-W3.1 CORE boot.** Run section 1 (1.1-1.14). Expected: as baseline, no new console errors or warnings.
- [ ] **P2-W3.2 New APIs on a booted dashboard.** Paste into the console of the dashboard frame (needs the live dashboard; the TopN part only if a vis widget exists):

```js
const k = window.top.getKDB();
const out = {};
// services.chrome: raw checks object plus no-throw wrappers
out.chromeChecks = Object.keys(k.services.chrome.readChromeChecks() || {}).sort();      // ["beginWait","endWait","ensureRuntime","recordSyncMiss","scheduleFlush","trackWait"]
const probe = Promise.resolve("el");
out.trackWaitIsPromise = k.services.chrome.trackWait("smoke.noop", probe) instanceof Promise;  // true
// elements.selectors: same values as the config catalogue
out.selectorGroups = Object.keys(k.elements.selectors).filter((g) => ["root","toolbar","dashboardPdf","footer","tab","tabs","dragDrop","page","filterDock","widget","focusMode","legend"].includes(g)).length; // 12
out.rootSelectors = k.elements.selectors.root.pageViewContent;                           // ".pageViewContent"
// widgetBinding
out.widgetBinding = [Object.keys(k.services.widgetBinding).sort(), k.services.widgetBinding.checkAvailable()]; // [["checkAvailable","run"], {ok:true, missing:null}]
// filterDock
out.filterDock = [typeof k.api.filterDock.getActiveFilterEl(), k.api.filterDock.isFiltersReady()];    // ["object" (null before a click, element after), true]
// kdbControl, launchpad, widgetText through AMD (the console has no AMD handle: use the API twins)
out.kdbControlSyncView = typeof k.api.kdbControl.syncView;                               // "function"
out.helperTabIds = k.state.launchpad.helperTabIds;                                       // array of strings (what readHelperTabIds copies)
out.textState = Object.keys((k.api.widgetText.getState() || {}).byId || {}).length;      // number of text widgets (what readTextById holds)
console.log(JSON.stringify(out, null, 1));
```

  Then click a filter in the dock (popup opens) and run `k.api.filterDock.getActiveFilterEl() instanceof Element` (expected `true`), and `k.api.filterDock.dispatch({ type: "filterDock/clickOriginalButtonRequested", payload: { filterKey: "x", buttonTid: "cancelClickable" } }).ok` (expected `false` for a non-matching `filterKey`, an object with `ok` and the usual filterDock state fields). Close the popup with a click outside.
- [ ] **P2-W3.3 Superuser reveal (readRightFlag switch).** As a superuser (superuser table first cell is `1`): the developer-mode toggle column in the kdbControl settings panel (`.kdb-control_dashboard-toggles-column--developer-mode-visible`) is visible and the metrics tree offers the release filter as on baseline; as a non-superuser both stay hidden. Expected: identical to `main` for both users.
- [ ] **P2-W3.4 Close + reopen once** (1.14). Expected: `Object.keys(window.top.getKDB().services)` contains `chrome` and `widgetBinding` on each new instance and the teardown logs no errors.
