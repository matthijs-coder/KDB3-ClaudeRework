# Contract Delta: TopN filter re-trigger and stale NewestStichtag pin

> Delta on top of `contracts/widgetTopN-newestStichtag-contractdelta.md` and `contracts/widgetTopN.md` §8.1.1.
> PO 2026-10-15: a confirmed global filter re-triggers TopN; a confirmed tab filter re-triggers TopN for widgets on that tab. PO 2026-10-15, later: NewestStichtag is one row, Jahr then Monat. Every TopN refresh awaits a fresh read of that row through the existing tableData service before the widgets run. A call that arrives while that read is in flight joins it. No Jahr, or the maximum year, keeps that row’s month. Any other year uses that year and Monat `DEZ`.

---

**Status:** `Draft`
**Parent contract:** `contracts/widgetTopN-newestStichtag-contractdelta.md`
**Also amends:** `contracts/widgetVis.md` (filter confirm may re-enter the existing TopN resolve)
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.7 coordinator, 2026-10-15
**Reviewed by:** pending subagent review

---

## 1. What this delta changes

Two gaps, one slice.

**Trigger.** A confirmed dashboard filter does not enter the TopN gate. The visible chart can repaint from Cognos page context while the helper keeps the last Jahr/Monat include and the chart keeps the last TopN members.

**Stale caption.** The pin read already awaits. `reloadTable` → `readQueryRows` → `waitForQueryResult` fulfills on the first probe with `itemCount > 0`. A previous NewestStichtag row already has items, so the promise returns that row. `markTableLoaded` then stores it as `lifecycle: "ready"` and `freshness: "fresh"`. `waitForRows` returns that cache when `lifecycle === "ready"`. `ensureFreshRows` returns it when `lifecycle === "ready"` and `freshness === "fresh"`. None of those waits observe a later Cognos run. A fixed sleep is not a finish signal. The measured click (global Jahr `2025`, post-render caption `202609.71694`) already completed discover `reloadTable`, one `renderWidget`, and the second `reloadTable`, and the helper was pinned to Jahr `2026` Monat `SEP`.

This delta does **not** add a second wait, a sleep, or a year-match poll. The first successful read in a session uses that existing sequence and stores the caption as the session maximum. NewestStichtag is the dashboard maximum, not a Jahr-dependent month, so a later Jahr confirm does not run that sequence again. No Jahr, or a Jahr equal to that maximum year, keeps the maximum month. Any other Jahr, lower or higher, pins that Jahr and Monat `DEZ` from the existing Pad B map.

---

## 2. Period pin after the existing read

The §2.3 sequence of the parent delta stays the only NewestStichtag read, and every TopN refresh awaits it before the widgets run: discover `reloadTable`, `readTableState` for `widgetId`, one stamped `renderWidget`, second `reloadTable`. Parse only that second result’s one data row. Column order is the column order of the row. The first column is Jahr: a four-digit year (`2026`). The second column is Monat: a Pad B caption (`SEP`, `DEZ`, `JAN` … `NOV`), not a `YYYYMM` cell and not `202609`. Read each cell from `d`, then `display`, `label`, `caption`, `value`, `v`, `u`. A Monat caption must be a value of `monthCodeToCaption`; a two-digit key of that map is accepted and stored as the caption. Do not slice six digits from one cell. This supersedes the parent parse that required `/^\d{6}/`. Do not call `waitForRows`, `ensureFreshRows`, or `readRows`. Do not change `waitForQueryResult`. Do not require `rowCount > 0`. Do not pass `Infinity` as a new budget. Do not insert a timer between `renderWidget` and the second `reloadTable`. A second call while `periodPinRead` is set joins that promise and does not start a second `renderWidget`. Do not return `maxPeriodPin` or `sessionPeriodPin` instead of this read.

**Fresh row.** The PO keeps NewestStichtag on the dashboard maximum: Jahr `2026` and Monat `SEP` this month. Each TopN refresh reads that row again through `tableData.reloadTable`. `sessionPeriodPin` stores the pin just applied. It is not a reuse cache. Boot does not preload the list (`load: false` stays).

**Selected Jahr on a Jahr confirm or Jahr undo.** The highest year parsed from that action’s `{ d, u }` values. An empty list is `null`. Do not read the scope that just changed with `getValues()` or `readDrillthroughJahrYear`. Precedence:

- A page confirm with a year uses that year.
- A page confirm with no year uses the global host year only. It stays `null` when global is empty.
- A global confirm uses the active tab’s host year when that tab has one, because that tab was not the filter just changed. Otherwise it uses the confirm year, which may be `null`.

A non-Jahr confirm, a lone dropdown, and a deferred global wave do not carry a confirm year. They use `readDrillthroughJahrYear` with no scope argument: active tab, then global. Do not copy that reader. An optional scope argument may limit it to one scope. Do not parse the NewestStichtag Jahr column with `parseInt` of a longer token (`parseInt("202609")` is not the year). `widgetTopN` does not import it.

**Maximum year.** `Number` of the four characters already sliced into `jahrFilterValue.d`. Both sides are numbers before compare. `"2026" !== 2026` is not a mismatch. Test `null` before `Number` (`Number(null)` is `0`).

| Selected Jahr | Maximum year | Helper Jahr | Helper Monat |
|---|---|---|---|
| `null` | any parsed year | maximum year | mapped maximum month |
| equal | same number | maximum year | mapped maximum month |
| any other year | lower or higher than the selection | `String(selected)` | `monthCodeToCaption["12"]` (`DEZ`) |

A year older than the maximum ends in December. A year newer than the maximum also ends in December; that month can be empty in the cube. It is not a whitelist of `2025`. If `"12"` is missing from the map, fail `WIDGET_TOPN_STICHTAG_UNAVAILABLE`. Do not write the literal `"DEZ"` from a second map. Do not synthesize `DEZ` for a missing, unparsable, empty, or equal-year selection.

A lone TopN dropdown and a filter wave both use this same branch. The dropdown does not wait for other widgets. Both await a fresh NewestStichtag read unless one is already in flight.

---

## 3. Filter confirm re-triggers TopN

Kale undo fires the wave only after `writeFilter` returns `ok: true`. A live dock confirm fires it after `TAB_MUTATION_SCOPE_WRITE`, and the Jahr year comes from `prepared.newValues`, not from `getValues()`. The filter commit does not await the wave. A failed vis apply must not roll the host write back.

**Global confirm.** Every on-canvas vis widget that has a dimension and a non-default `topNChoice` (`null`, `""`, `"none"`, `"default"` are default). Widgets on the active tab run in this wave. Widgets on any other tab are recorded by `tabId` and run when that tab is shown. A hidden page does not `renderWidget`.

**Tab confirm.** The same test, limited to `payload.tabId` from the dock handoff (the active tab at click time). Do not use native-multi `scopeKey` as the widget tab id when it is null; the handoff `tabId` is the join key. Widgets on other tabs are untouched.

**Hidden tab.** A page-context write for a tab that is not active does not `renderWidget`. Record `scopeType`, `tabId`, `isJahr`, `filterType`, and, for a page Jahr confirm, `selectedYearKnown` plus `selectedYear`. A deferred global wave does not keep the global OK year as that tab’s Jahr; when the tab is shown, the host read is stable and §2 runs without a confirm year. When that tab is shown, run this wave once from the pin step through the fan-out, then clear the mark. The replay does not fan out without a pin. An OK click on the visible tab runs immediately.

**Jahr confirm** (native multi-select only). The dock handoff has no `itemId`. Jahr is the row whose `itemIdHint` or `filterConfig.itemId` equals `topNHelper.resolveTableEntry(kennzahlenTable).jahrColumnId`. Single-select finalize never receives Jahr. The wave passes `selectedYearKnown: true` and the year parsed from `newValues` (null when the list is empty). Every Jahr wave awaits one shared parent-§2.3 read, then §2. Pass the resulting pin into each widget. The gate must not read NewestStichtag again for those widgets.

**Every other confirmed dock filter** except Dienststelle and Sicht. Await the same parent-§2.3 read, then §2. While `periodPinRead` is in flight, join that read. Boot must not preload it (`load: false` stays). `waitForRows` / `ensureFreshRows` stay forbidden. Dienststelle’s own vis rebind reaches the gate without a supplied pin, so that path awaits the same read too. It still does not enter this wave.

**Dienststelle and Sicht.** Their existing vis notify stays the only path. This wave must not also run, or one OK click rebinds twice (Dienststelle’s notify is deferred about 600 ms).

**Widget work.** For each selected widget, the existing binding pipeline with reason `topN` and the supplied pin, one widget after another. Not `Promise.all`: the one TopN pad rejects a second claim with `WIDGET_TOPN_NO_HELPER_AVAILABLE`. After each pipeline, dispatch `widgetTopN/cleanup` with `releaseClaim: true` and `clearHelperBinding: false` so the next owner can claim. Post-resolution cleanup stays `releaseClaim: false`. The pipeline rebinds the helper and the visible widget. It does not push settings history, does not change `topNChoice`, and does not call `revertTopNDropdownFromState`. Do not dispatch `widgetVis/applyTopNChoice` through widgetSettings.

**Supersede.** A newer confirm does not start a second parent-§2.3 sequence while one caption read is in flight. It joins that read. Leftover `renderWidget` accepts no abort signal, and this slice does not add one. The older wave does not fan out. Each joined caller applies §2 with the year it captured from its own OK. It does not read that year from the host when the caption returns. The aborted wave does not surface as `WIDGET_TOPN_STICHTAG_UNAVAILABLE`. A superseded per-widget pipeline returns `stale: true` and must not record an error after a newer success. When the requested `opSeq` is a number lower than the current owner `opSeq`, `beginOwnerResolve` returns that lower number and does not abort the current resolve and does not assign it. `handleResolveRequested` then returns the existing stale result before `MARK_PENDING` and before the helper claim. Live code aborts and assigns any numeric `opSeq`; this delta changes that. The 5000 ms TopN gate arms after the shared pin returns, not before the read.

**Dropdown during a wave.** A lone dropdown calls the same mismatch pin. That pin joins the in-flight caption promise and does not call `reloadTable` or `renderWidget` beside it. After that promise is gone, the next dropdown reads NewestStichtag again. The session slot is written when §2 returns a pin. Boot does not seed the slot (`load: false` stays).

Cancel and close do not start this wave. A confirm that leaves no selected values does, so an empty Jahr still takes the null arm. A dock confirm with `isHistoryReplay` or `skipHistory` does not start it. Replay does not go through that confirm.

**History undo and redo.** A successful kale replay and a successful single-select replay start this same wave after the host write. They do not push a filter step or a settings step. The history pointer moves when the replay returns `true`. The wave is not awaited. A throw from the wave must not change that return to `false`.

Kale replay is `handleNativeMultiSelectHistoryReplay`, after `writeFilter` returns `ok: true` and after `TAB_MUTATION_SCOPE_WRITE`, before `return true`. `isJahr` is `filterRef.itemId` compared with `resolveTableEntry().jahrColumnId`. Do not use `itemName`. When `isJahr` is true, pass `selectedYearKnown: true` and the year parsed from the replay `values` (null when the list is empty). `scopeKey === "global"` is a global wave. Any other `scopeKey` is page context and is passed as `scopeId`. An empty `values` array still starts the wave. A dest-skip (`return false`) does not.

Single-select replay is `applySingleSelectHistoryReplay`, after `replayCommittedSelection` returns `ok: true`, before `return true`. `scopeType` and `scopeId` come from the resolved record. `isJahr` compares that record’s `itemId` with `jahrColumnId`. Sicht and Dienststelle do not enter this function. `specialSingleSelect` does, and it starts the wave. A legacy page step with `scopeId` null does not.

Page `scopeId` is not a widget `tabId`. Resolve it with `tabs/resolveFilterScopeTargets`, then `readTabScopeMatch`. One `status: "ok"` result supplies `tab.tabId`. `missing` or `ambiguous` does not fan out and does not fail the pointer. A page replay whose tab is not active uses the hidden-tab rule above and does not `renderWidget` until that tab is shown.

Dienststelle replay and Sicht replay do not start this wave. Sicht undo with a Dienststelle dependency already dispatches `widgetVis/dienststelleChanged` from the Dienststelle replay. That remains the only rebind for those two.

---

## 4. Golden vectors

Parent vectors 2 and 3 stay when the caption year already equals the selected Jahr. Parent vector 1 is the null arm (empty selection). Vector 4 stays (bad read → error, no year-table fallback). Add:

| # | Selected Jahr | Maximum row | Helper Jahr | Helper Monat |
|---|---|---|---|---|
| 5 | global `2025`, no tab Jahr | Jahr `2026`, Monat `SEP` | `2025` | `DEZ` |
| 6 | tab `2025`, global empty | Jahr `2026`, Monat `SEP` | `2025` | `DEZ` |
| 7 | none | Jahr `2026`, Monat `SEP` | `2026` | `SEP` |
| 8 | global or tab `2026` | Jahr `2026`, Monat `SEP` | `2026` | `SEP` |
| 9 | global or tab `2027` | Jahr `2026`, Monat `SEP` | `2027` | `DEZ` (the December can be empty) |
| 10 | undo global Jahr from `2025` to none | Jahr `2026`, Monat `SEP` | `2026` | `SEP` (null arm; no new history step) |
| 11 | undo page Jahr while that tab is hidden | Jahr `2026`, Monat `SEP` | `2025` | `DEZ` after the tab is shown; no `renderWidget` while hidden |
| 12 | a second Jahr confirm, `2024`, after the previous read has finished | a new leftover `renderWidget`, row Jahr `2026` Monat `SEP` | `2024` | `DEZ` |

Vector 5 is the measured failure. The helper include is local Jahr `2025` and Monat `DEZ` on the same single apply the click already waits for. No extra query wait.

---

## 5. Failure

Parent §2.5 stays for a missing widget, a bad reload, a non-`/^\d{6}/` string, or an unmapped month. A year mismatch is not added to that list.

A filter-wave failure leaves the committed `topNChoice` in place. The dropdown is not moved to Ohne. The visible plan is not applied. The terminal code stays the pin, helper, or plan code (`WIDGET_TOPN_STICHTAG_UNAVAILABLE`, `WIDGET_TOPN_RESULT_EMPTY`, `WIDGET_BINDING_PLAN_TOPN_HELPER_FAILED`).

`WIDGET_VIS_BINDING_PLAN_FAILED` wrapping an empty helper is unchanged in this slice. A pin that returns rows does not hit that wrapper. An empty December still does.

---

## 6. Out of scope

- A sleep, a year-match poll, or a second `renderWidget` loop on the leftover.
- Changing `waitForQueryResult` / `inspectQueryResult`, including the `itemCount > 0` stop.
- `waitForRows`, `ensureFreshRows`, `readRows` as the NewestStichtag source.
- Leftover authoring, a year table, or Monat/Jahr as helper slot columns.
- Re-authoring the NewestStichtag widget. The PO keeps that list on the dashboard maximum.
- Copying the Dienststelle broadcast (that fan-out reads once per widget).
- Fixing the vis plan wrapper around `WIDGET_TOPN_RESULT_EMPTY`.

---

## 7. Files

| Path | Change |
|---|---|
| `KDB3/js/dashboard/widgets/widgetVis/effects/resolveTopNJahrFilterValue.js` | Parse one row: first column Jahr, second column Monat caption. Do not parse `YYYYMM`. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/applyTopNJahrMismatchPin.js` | Every call awaits the table-service read unless one is in flight, then §2. A Jahr OK year is the request year, not a host read of the scope just changed. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/readConfirmedJahrYear.js` | **New.** Highest year in confirm or undo `{ d, u }` values, or `null`. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/readDrillthroughJahrYear.js` | Optional scope argument. Omitted scope keeps tab, then global. |
| `KDB3/js/core/config/tables.js` | Description only: NewestStichtag is the dashboard maximum, not Jahr-dependent. |
| `KDB3/js/dashboard/widgets/widgetVis/actions/runTopNFilterConfirmWave.js` | Orchestrator. A page Jahr deferral keeps `selectedYearKnown` and `selectedYear`. A global deferral does not. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/runTopNWaveFanOut.js` | **New.** One shared pin, then each widget's pipeline in order, then release the helper claim. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/listTopNWaveWidgets.js` | **New.** On-canvas vis ids for this wave, and the hidden tab ids to record. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/gates/topNGateWaiters.js` | **New, required.** Owns `waitForTopN`, `cancelTopNGateWaiter`, `rejectAllTopNGateWaiters`, `resolveTopNGateWaiter`, and `isDefaultTopNChoice`. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/gates/topNGate.js` | Keeps `resolveTopNPrerequisite` and `mapTopNPayloadToHelper`. Re-exports the waiter names. Supplied `periodPin` skips the read. The 5000 ms wait arms after the pin. |
| `KDB3/js/dashboard/filters/singleSelect/effects/finalizeConfirmedCommit.js` | After success, fire the wave. Not for Sicht. |
| `KDB3/js/dashboard/filters/nativeMultiSelect/actions/handleFilterDockConfirm.js` | After the scope write, fire the wave. Not for history replay. |
| `KDB3/js/dashboard/filters/nativeMultiSelect/actions/handleNativeMultiSelectHistoryReplay.js` | After a successful replay write, fire the wave. Do not await it. |
| `KDB3/js/dashboard/filters/singleSelect/history/applySingleSelectHistoryReplay.js` | After a successful replay, fire the wave. Do not await it. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/resolveWaveTabFromScope.js` | **New.** Page `scopeId` → one `tabId`, or no fan-out. |
| `KDB3/js/dashboard/widgets/widgetTopN/runtime/ensureWidgetTopNRuntime.js` | A lower numeric `opSeq` is returned and not assigned. The current resolve is not aborted. |
| `KDB3/js/dashboard/widgets/widgetTopN/actions/handleResolveRequested.js` | After `beginOwnerResolve`, a stale `opSeq` returns the existing stale result before `MARK_PENDING`. |
| `KDB3/js/dashboard/widgets/widgetTopN/actions/dispatchResolveOutcome.js` | Remove the TEMP skip of post-resolution cleanup. |
| `KDB3/js/dashboard/widgets/widgetTopN/effects/placeHelperAfterOwner.js` | Remove the TEMP “stay on canvas” return. Restore launchpad placement. |
| This file | Remains the law for the slice. The 2026-09-02 approval-log line “Jahr value from leftover” is superseded only for the lower arm in §2. |

`reloadNewestStichtagPeriodPin.js` stays the I/O sequence. It does not gain a timer. `resolveTopNJahrFilterValue.js` is the two-column parse. Its TEMP log stays, with Jahr and Monat text instead of a `YYYYMM` caption. `waitForQueryResult.js` and the helper read/extract files are not edited.

---

## 8. Do not

- Treat another `reloadTable`, `waitForRows`, or `ensureFreshRows` as a wait for a new Cognos run.
- Add a 500 ms (or any) sleep before the parsed reload.
- Poll until leftover `YYYY` equals the selected Jahr.
- Synthesize `DEZ` when the selected year is null or equal to the maximum year.
- Read the Jahr that this OK or undo just changed via `getValues()` or `readDrillthroughJahrYear`.
- Start a second NewestStichtag `renderWidget` while one caption read is in flight.
- Await the wave inside the filter commit.
- Re-enter TopN through `applyTopNChoice` / `finalizeVisIntentResult`.
- Hook Dienststelle or Sicht into this wave.
- Read the painted list DOM. The pin remains the two query cells: Jahr, then Monat.
- Parse one NewestStichtag cell as `YYYYMM`.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-15 | `Draft` | Coordinator | Existing tableData await returns the previous caption when `itemCount > 0`. No added sleep. Lower arm pins `DEZ`. Filter confirm re-triggers TopN. |
| 2026-10-15 | `Draft` | Coordinator | PO: NewestStichtag stays the dashboard maximum. One session read. Jahr OK year comes from the confirm values. Any other year pins `DEZ`. |
| 2026-10-15 | `Draft` | Coordinator | PO: NewestStichtag is one row, Jahr then Monat caption. The `YYYYMM` cell parse is superseded. |
| 2026-10-15 | `Draft` | Coordinator | PO: every TopN refresh awaits a fresh tableData read of that row. In-flight reads are joined. No session or max cache stands in for the read. |
