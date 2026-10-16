# Execution Spec: TopN filter re-trigger and stale NewestStichtag pin

> Mechanical spec for the implementer. Law is `contracts/widgetTopN-filter-retrigger-period-pin-contractdelta.md` (Draft until review stamp). Do not add a sleep, a year-match poll, or a second tableData wait. No commit unless the PO asks.

---

**Status:** `Draft`
**Module / contract:** `contracts/widgetTopN-filter-retrigger-period-pin-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.7 coordinator, 2026-10-15
**Executing AI:** pending
**Reviewer:** pending subagent review

---

## Exclusive allowlist

**May create:**

- `KDB3/js/dashboard/widgets/widgetVis/effects/applyTopNJahrMismatchPin.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/runTopNFilterConfirmWave.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/runTopNWaveFanOut.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/listTopNWaveWidgets.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/gates/topNGateWaiters.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/resolveWaveTabFromScope.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/readConfirmedJahrYear.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetVis/effects/gates/topNGate.js`
- `KDB3/js/dashboard/filters/singleSelect/effects/finalizeConfirmedCommit.js`
- `KDB3/js/dashboard/filters/nativeMultiSelect/actions/handleFilterDockConfirm.js`
- `KDB3/js/dashboard/filters/nativeMultiSelect/actions/handleNativeMultiSelectHistoryReplay.js` (fire the wave after success only)
- `KDB3/js/dashboard/filters/singleSelect/history/applySingleSelectHistoryReplay.js` (fire the wave after success only)
- `KDB3/js/dashboard/widgets/widgetTopN/effects/placeHelperAfterOwner.js`
- `KDB3/js/dashboard/widgets/widgetTopN/actions/dispatchResolveOutcome.js`
- `KDB3/js/dashboard/widgets/widgetTopN/runtime/ensureWidgetTopNRuntime.js` (lower numeric `opSeq` only)
- `KDB3/js/dashboard/widgets/widgetTopN/actions/handleResolveRequested.js` (stale return before `MARK_PENDING` only)
- `KDB3/js/dashboard/widgets/widgetVis/effects/readDrillthroughJahrYear.js` (optional scope argument only)
- `KDB3/js/core/config/tables.js` (NewestStichtag description string only)

**May edit, parse only:** `KDB3/js/dashboard/widgets/widgetVis/effects/resolveTopNJahrFilterValue.js`.

**Must not edit:** `inspectQueryResult.js`, `waitForQueryResult.js`, `waitForRowsInputs.js`, `ensureFreshRowsInputs.js`, `reloadTableInputs.js`, `readTableQueryResult.js`, `reloadNewestStichtagPeriodPin.js`, `extractTopNResult.js`, `readHelperTableRows.js`, `runHelperBinding.js`, `buildHelperBindingSpec.js`, `notifyVisualizationWidgetDienststelleChanged.js`, `handleDienststelleChanged.js`, `handleApplySetting.js`, `finalizeVisIntentResult.js`, `topNDropdownSafeguard.js`, `createWidgetVisController.js`, `actionRouter.js`, `resolveBindingPrerequisites.js`, `handleDisposeWidgetRuntime.js`, `handleParameterSetCancelBindings.js`, any other `widgetTopN` resolve/extract control flow, `.cursor/rules/*.mdc`, parent `widgetTopN.md` / `widgetVis.md` (captain sync after stamp).

**Must not create:** a second month map, a copied Jahr reader, a sleep helper, a year-match poll, a filter-dock `reloadTable` call.

---

## Section A. Pre-flight

Read the contract delta and this spec. Echo one sentence each for: the existing `reloadTable` await already returns on `itemCount > 0`; the lower arm is the only `DEZ` synthesis; the filter commit does not await the wave; Dienststelle is not hooked.

---

## Section B. Folder tree

```
KDB3/js/dashboard/widgets/widgetVis/
  effects/applyTopNJahrMismatchPin.js          (new)
  effects/listTopNWaveWidgets.js               (new)
  effects/runTopNWaveFanOut.js                 (new)
  actions/runTopNFilterConfirmWave.js          (new)
  effects/gates/topNGateWaiters.js             (new)
  effects/resolveWaveTabFromScope.js           (new)
  effects/gates/topNGate.js                    (edit)
KDB3/js/dashboard/filters/singleSelect/effects/finalizeConfirmedCommit.js   (edit)
KDB3/js/dashboard/filters/nativeMultiSelect/actions/handleFilterDockConfirm.js (edit)
KDB3/js/dashboard/filters/nativeMultiSelect/actions/handleNativeMultiSelectHistoryReplay.js (edit)
KDB3/js/dashboard/filters/singleSelect/history/applySingleSelectHistoryReplay.js (edit)
KDB3/js/dashboard/widgets/widgetTopN/effects/placeHelperAfterOwner.js       (edit)
KDB3/js/dashboard/widgets/widgetTopN/actions/dispatchResolveOutcome.js      (edit)
KDB3/js/dashboard/widgets/widgetTopN/runtime/ensureWidgetTopNRuntime.js     (edit)
KDB3/js/dashboard/widgets/widgetTopN/actions/handleResolveRequested.js      (edit)
```

---

## Section C. Per-file

### `applyTopNJahrMismatchPin.js`

- **Role:** apply contract §2. Every call awaits `resolveTopNJahrFilterValue` unless `periodPinRead` is already set.
- **Cap:** 150 lines. Imports: `resolveTopNJahrFilterValue.js`, `readDrillthroughJahrYear.js`, `topNHelper.js`, `initializeRuntime.js`. No `reloadNewestStichtagPeriodPin.js`. No `reloadTable`. No `renderWidget`.
- **Entry:** `__controller(_KDB, _metricsTable, _request)`. The gate passes `kennzahlenTable` and no request. The wave passes `null` and the wave payload. If `periodPinRead` is a promise, return that promise’s `.then` and do not call the resolver. Otherwise store `resolveTopNJahrFilterValue(_KDB)` in that slot. Do not return a stored `maxPeriodPin`. The caption reader takes only `_KDB`. A module-scope clear removes the slot only when it still points at this promise, and rethrows a resolver rejection. Do not `.catch` the resolver into a fulfilled pin.
- **Steps:** each caller applies §2 with its own `_request`. `selectedYearKnown === true` uses the request year and the scope precedence in the contract. Otherwise call `readDrillthroughJahrYear`. A `null` selected year returns the fresh pin before any `Number(selected)`. Maximum year is `Number(pin.jahrFilterValue.d)`. A non-finite year rejects `{ errorCode: "WIDGET_TOPN_STICHTAG_UNAVAILABLE", errorMessage }`. An equal year returns the fresh pin. Any other year returns `jahrFilterValue` `{ d, u }` = `String(selected)` and `monatFilterValue` `{ d, u }` = `topNHelper.monthCodeToCaption["12"]`. A missing `"12"` rejects the same object. Do not `Promise.reject` a string or `new Error`. Write the applied pin to `sessionPeriodPin`. Do not read that slot back as the next pin. No TEMP log. No string literal `DEZ`. Boot does not call this function.

### `resolveTopNJahrFilterValue.js`

- **Role:** turn the second `reloadTable` row into the maximum pin. Do not change `reloadNewestStichtagPeriodPin.js`.
- **Row:** one data row. First column Jahr, second column Monat. Ignore further columns.
- **Jahr:** four digits, `1900`–`2100`, and the following character is not a digit. `202609` is not a year. Store `{ d, u }` as that year.
- **Monat:** a `monthCodeToCaption` value (`SEP`, `DEZ`, …). A two-digit map key is stored as that caption. Anything else rejects `{ errorCode: "WIDGET_TOPN_STICHTAG_UNAVAILABLE", errorMessage }`. Do not slice `YYYYMM`. Do not write a literal `DEZ` here.
- **Cap:** 150. Keep the TEMP info log, with the Jahr text and the Monat text.

### `readConfirmedJahrYear.js`

- **Cap:** 150. No imports. `__controller(_values)` returns the highest year in `1900..2100` parsed from `d`, then `u`, or from a raw string. An empty list returns `null`. Do not read the host.

### `readDrillthroughJahrYear.js`

- Add an optional third argument `_scopeId`. When it is set, read only that scope. When it is omitted, keep active tab, then global. Do not change the host call.

### `topNGate.js`

Live file is 204 lines. Move `waitForTopN`, `cancelTopNGateWaiter`, `rejectAllTopNGateWaiters`, `resolveTopNGateWaiter`, and `isDefaultTopNChoice` to `topNGateWaiters.js`. Keep `resolveTopNPrerequisite` and `mapTopNPayloadToHelper` here, and re-export the waiter names. Do not create `startTopNHelperBind.js`. Existing importers stay on this path.

Imports after the move: `blockedResult.js`, `buildTopNHelperListConfig.js`, `applyTopNJahrMismatchPin.js`, `buildBindingSpec.js`, `normalizeDefaultValue.js`, `dispatchTopNCleanupWhenDimensionAbsent.js`, `topNGateWaiters.js`. Delete `logSichtJahrPin`.

A default TopN choice and a missing dimension return before any read and before the timer. When `input.periodPin` is present, do not call the resolver. When it is absent, call `applyTopNJahrMismatchPin` with `partialSpec.dataConfig.kennzahlenTable`. Arm `waitForTopN` after that pin is in hand, immediately before `widgetTopN/resolveRequested`. Keep the existing catch shapes: `destroyed`, `timedOut`, and `cancelled` are rethrown. Any other rejection keeps `errorCode` when the thrown value has one.

### `topNGateWaiters.js`

- **Cap:** 150. Imports: `defaults.js`, `ensureWidgetRuntime.js`.
- Move the five functions unchanged, except `waitForTopN` is called only after the pin is in hand.

### `runTopNFilterConfirmWave.js`

- **Role:** orchestrator, cap 120 lines, at most 10 AMD imports.
- **Entry:** `__controller(_KDB, payload)`. Payload: `scopeType` (`"global"` or `"pageContext"`), `tabId`, `scopeId`, `isJahr` (boolean), `filterType`, `selectedYearKnown` (boolean), `selectedYear` (number or `null`).
- **Skip:** `filterType` `dienststelle` or `sicht`. Do not add a `hierarchy` skip. Cancel and close never reach the native confirm. A dock confirm with history replay or `skipHistory` does not call this entry. Replay handlers call it themselves after success.
- **Widgets:** `listTopNWaveWidgets` returns the ids to run now. Global keeps on-canvas `kind === "vis"` frames that are not disposed, whose `topNChoice` is not `null`, `""`, `"none"`, or `"default"`, and whose dimension normalizes to present. Frames whose `tabId` is not the active tab are recorded for later instead of run. Tab scope uses `readCanvasWidgetsByTab(tabId)` with the same tests. Empty list returns without a read.
- **Context:** `runBindingPipeline` is not on `_KDB.api.widgetVis`. This file imports `controllerHelpers.js`, `state/selectors.js`, `state/createWidgetVisReducer.js`, `effects/resolveWaveTabFromScope.js`, `effects/listTopNWaveWidgets.js`, `effects/runTopNWaveFanOut.js`, `tabs/events/eventNames.js`, and `runtime/initializeRuntime.js`. `runTopNWaveFanOut.js` imports `runBindingPipeline.js` and `applyTopNJahrMismatchPin.js`. Call `controllerHelpers.ensureVisState(_KDB)`, then `buildContext` on a local instance `{ _KDB, selectors, reducer, isDisposed }` whose `dispatchInternal` forwards to `controllerHelpers.dispatchInternal`. Pass that context into the fan-out. Settings come from `context.readSettingsSnapshot(widgetId)`. Do not edit `createWidgetVisController.js` or `actionRouter.js`.
- **Page scope:** when `scopeType === "pageContext"` and `tabId` is absent, `await resolveWaveTabFromScope(_KDB, scopeId)` before the hidden-tab test. A null result returns without a pin and without a fan-out. Do not use `scopeId` as a widget tab id.
- **Hidden tab:** if `scopeType === "pageContext"` and `tabId` is not the active tab, store the payload and return before the pin step. A page confirm keeps `selectedYearKnown` and `selectedYear`. A global confirm stored for another tab sets `selectedYearKnown` false. A module-scope `onTabShown` subscribes once through `_KDB.events.subscribe` to `tabs/events/eventNames.js` `CHANGED` (`"tabs:changed"`). When the stored `tabId` is shown, it calls this same entry once with that payload and clears the mark. The replay runs Pin, then fan-out. Do not render while the tab is hidden.
- **Pin:** always call `applyTopNJahrMismatchPin(_KDB, null, payload)` and await it before fan-out. That call joins `periodPinRead` and does not start a second leftover `renderWidget`. It does not return `sessionPeriodPin` or `maxPeriodPin` instead of the table read. Do not seed a slot at boot.
- **Fan-out:** `runTopNWaveFanOut.js` awaits `runBindingPipeline` per widget, in order, with reason `"topN"`, the current settings snapshot, and `periodPin`. Do not use `Promise.all`. After each pipeline, dispatch `widgetTopN/cleanup` with `releaseClaim: true` and `clearHelperBinding: false`. A failed pipeline or release is logged and the loop continues. Do not dispatch `applyTopNChoice`. Do not push history. The wave file stays an orchestrator at or under 120 lines.
- **Supersede:** a new call bumps a wave id and does not call the caption resolver itself. After the pin await, if the id is no longer this wave, do not fan out. Do not pass a signal into `renderWidget` or `reloadTable`. A superseded rejection is `cancelled`, not `WIDGET_TOPN_STICHTAG_UNAVAILABLE`.
- **Runtime:** `_KDB.runtime.widgetVis.pendingPromises.periodPinWave` while in flight. `finally` deletes it when it still points at this wave. `periodPinRead` and `sessionPeriodPin` are the other two slots. Reuse of `sessionPeriodPin` does not write it.

### Filter call sites

- `finalizeConfirmedCommit.js`: after `applyConfirmedState` succeeds, if `filterScope === "global"` or the handoff has a `tabId`, call the wave and do not await it. Skip `filterType === "sicht"`. Pass `isJahr: false`. Jahr is native multi-select and never reaches this handoff. One new import, the wave. Do not import `topNHelper.js` here. A thrown wave must not throw out of finalize.
- `handleFilterDockConfirm.js`: after `TAB_MUTATION_SCOPE_WRITE`, fire the wave and do not await it. `scopeKey === "global"` → `scopeType: "global"`. Otherwise `scopeType: "pageContext"` and `tabId` from the payload. Fire also when `prepared.newValues.length === 0`. Do not fire when `payload.skipHistory === true` or `payload.isHistoryReplay === true`. The existing history return stays. Imports: the wave, `topNHelper.js`, and `readConfirmedJahrYear.js`. `isJahr` is true when `payload.itemIdHint` or `payload.filterConfig.itemId` equals `resolveTableEntry().jahrColumnId`. When `isJahr` is true, pass `selectedYearKnown: true` and `readConfirmedJahrYear(prepared.newValues)`. There is no handoff `itemId`. Do not compare `liveItem.itemId`. Do not add a filter-name whitelist. This file stays under 150 lines and under 10 imports.

### `resolveWaveTabFromScope.js`

- **Cap:** 150. Imports: `tabs/state/selectors.js` only. Call `_KDB.api.tabs.dispatch` with `tabs/resolveFilterScopeTargets` and `source: "topNFilterWave"`. Do not edit the tabs action.
- **Entry:** `__controller(_KDB, scopeId)` returns a promise of `tabId` or `null`. Empty `scopeId` returns `null`. Pass the scope id and `result.tabTargets` to `readTabScopeMatch`. Return `match.tab.tabId` only when `match.status === "ok"` and that id is a non-empty string. `missing`, `ambiguous`, a failed dispatch, and a throw return `null`. Log the miss. Do not throw to the caller.

### `handleNativeMultiSelectHistoryReplay.js`

After `TAB_MUTATION_SCOPE_WRITE`, call the wave and do not await it. Catch a sync throw, log it, and still return `true`. Do not let that throw reach the existing `return false`. `scopeKey === "global"` → `scopeType: "global"`. Otherwise `scopeType: "pageContext"` and `scopeId: scopeKey`. `isJahr` is `String(filterRef.itemId) === resolveTableEntry().jahrColumnId`. When `isJahr` is true, pass `selectedYearKnown: true` and `readConfirmedJahrYear(values)`. `filterType` is `"nativeMultiSelect"`. Dest-skip and a failed `writeFilter` return `false` and do not call the wave. Stay under 150 lines and under 10 imports.

### `applySingleSelectHistoryReplay.js`

The file is 82 lines and 5 imports. Add `topNHelper.js` and the wave. After `result.ok === true`, call the wave and do not await it. Catch a sync throw, log it, and still return `true`. Pass `scopeType` and `scopeId` from `resolved.record`. When `scopeType === "pageContext"` and `scopeId` is null, do not call the wave. `isJahr` compares `resolved.record.itemId` to `resolveTableEntry().jahrColumnId`. `filterType` is `"singleSelect"`. Do not edit `writeSelectionForReplay` or `finalizeConfirmedCommit` for this path.

### `placeHelperAfterOwner.js`

Remove the TEMP early return and the inline outline / position / size writes. `restoreHelperPlacement` moves the helper shell back to `placement.parentNode` / `placement.nextSibling` and calls `dismissHelperTitleEdit`. On failure it still dismisses the title edit and returns `false`.

### `dispatchResolveOutcome.js`

Remove the TEMP early return in `postResolutionCleanup`. The existing cleanup (`clearHelperBinding`, reason `postResolution`) runs again, including `shouldSkipPostResolutionCleanup` for `inspectionMode`.

### TEMP behavior

In `topNGate.js`, `placeHelperAfterOwner.js`, and `dispatchResolveOutcome.js`, delete the TEMP early returns and the `[sicht-jahr]` logs those edits already touch. Do not open `waitForQueryResult.js` or the other TEMP-log files to clean them.

### Stale opSeq

In `ensureWidgetTopNRuntime.js`, when `_requestedOpSeq` is a number lower than `ownerRuntime.opSeq`, return `_requestedOpSeq` before `abortOwnerResolve`. Do not replace the abort controller and do not assign `ownerRuntime.opSeq`. An equal or higher number keeps today’s abort-and-assign. A missing number still increments.

In `handleResolveRequested.js`, immediately after `beginOwnerOperation`, if `isStaleOpSeq` is true, return `_outcome.stale` and do not `MARK_PENDING` and do not claim the helper. The file is 148 lines and must stay ≤ 150. A replaced TopN gate waiter still rejects `{ cancelled: true, kind: "topN" }`, which `resolveBindingPrerequisites` already maps to `stale: true`. Do not map that path to `timedOut`. Do not edit `finalizeVisIntentResult.js`.

---

## Section D. Acceptance

1. First global Jahr `2025`, maximum row Jahr `2026` Monat `SEP`, no tab Jahr: one leftover sequence, helper include Jahr `2025` Monat `DEZ`, then each affected widget’s pipeline. No sleep. The year comes from `newValues`, not from `getValues()`.
2. Empty Jahr or selected `2026` with maximum row Jahr `2026` Monat `SEP`: helper Jahr `2026` Monat `SEP`.
3. Tab Jahr `2025`, global empty, maximum row Jahr `2026` Monat `SEP`: helper Jahr `2025` Monat `DEZ`. Widgets on other tabs are not rebound.
4. A non-Jahr global confirm also awaits `reloadTable` for `newestStichtag`, then runs the pipeline with that fresh pin.
5. Dienststelle OK does not enter the wave. Its own vis rebind awaits the same NewestStichtag read through the gate.
6. A second Jahr confirm during the first caption read joins it and does not call leftover `renderWidget` again. After that read is gone, the next Jahr confirm calls `renderWidget` again. The first wave does not fan out and does not surface as `WIDGET_TOPN_STICHTAG_UNAVAILABLE`. The dropdown stays on the committed TopN choice.
7. Selected `2027`, maximum row Jahr `2026` Monat `SEP`: helper Jahr `2027` Monat `DEZ`.
8. A hidden page-Jahr replay runs the pin step with the stored year before fan-out. A dropdown started while `periodPinRead` exists does not call `reloadTable`. The next dropdown, after that read is gone, calls `reloadTable` again.
9. An older numeric `opSeq` leaves the newer owner `opSeq` in place and returns stale before `MARK_PENDING`.
10. `node --check` on every edited file. No file over its cap (150, orchestrator 120). `topNGate.js` stays under 150 lines, keeps `resolveTopNPrerequisite` and `mapTopNPayloadToHelper`, and re-exports the waiter names. Its three current importers are not in the diff. `waitForQueryResult.js`, `createWidgetVisController.js`, and `actionRouter.js` are not in the diff. A native Jahr confirm sets `isJahr` from `itemIdHint` or `filterConfig.itemId`.
11. Undo of global Jahr from `2025` to none starts the wave once, does not await it, and does not push a history step. The pointer still moves. Dienststelle undo and Sicht undo do not call the wave. A page replay with no unique tab match does not fan out.

---

## Section E. Do not

- Edit the parent NewestStichtag delta’s reload sequence in code (`reloadNewestStichtagPeriodPin.js` behavior).
- Add `setTimeout` / `sleep` on the pin path.
- Compare caption year to the selected year inside `waitForQueryResult`.
- Read list `textContent`.
- Copy `readDrillthroughJahrYear.js`.
