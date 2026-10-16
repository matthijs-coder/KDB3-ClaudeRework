# Execution Spec: tab-mutation frame caption

> Mechanical spec. Architecture is `contracts/loadingService-tab-mutation-caption-contractdelta.md` (**Approved**). Do not re-decide the frame sheet, the page-overlay suppression, the headlines, or the initial slots.

---

**Status:** `Executed` — review PASS-WITH-NITS. Live acceptance (Section E) still open. Not `Implemented`.
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** one Grok 4.7 writer (`grok-4.7-xhigh-fast`)

---

## Exclusive allowlist

**May create:**

- `KDB3/js/dashboard/tabs/effects/formatTabMutationCaption.js`

**May edit:**

- `KDB3/js/core/services/loadingService/config/loadingLabels.js` — four keys only
- `KDB3/js/dashboard/tabs/actions/runTabMutationSaga.js` — start, initial line, `finally` finish. One new AMD import.
- `KDB3/js/dashboard/tabs/effects/traverseTabs.js` — replace the page-overlay `start` condition only. One new AMD import. File stays ≤150 lines.

**Must not edit:** `applyTabPageLoading.js`, `publishRestoreTabCaption.js`, `config/actionTypes.js`, widget rebuild, `loadingAnimation.css`, loadingService effects, PDF, writeback SET.

Current sizes: `traverseTabs.js` 149, `runTabMutationSaga.js` 103, `applyTabPageLoading.js` 150 (do not touch), `runTabMutationOwnerPhases.js` 147 (do not touch).

---

## Section A. Pre-flight

Echo one sentence each, then write. Do not paste the rule files.

1. `kdb-object.mdc` through `cognos-adapter.mdc` (the ten rules) plus `lifecycleVocabulary.md`
2. The approved delta §2 and §3
3. This spec

---

## Section B. Rules per file

| File | Rules |
|---|---|
| `loadingLabels.js` | German only here. Pure config. |
| `formatTabMutationCaption.js` | `amd.mdc`, `naming.mdc`, `error-handling.mdc`. Import only `../state/selectors.js`. No DOM, no Cognos, no events. Catch and return. Never throw. |
| `runTabMutationSaga.js` | `error-handling.mdc`. The new `finally` must not swallow saga errors. Do not reorder steps. Do not catch the existing phase failures. |
| `traverseTabs.js` | Stay ≤150 lines. The `finally` that finishes `kdb-tab-page-loading` stays. |

---

## Section C. Work

### C1. Labels

Add exactly:

| Key | DE |
|---|---|
| `tabMutationCopy` | Registerkarte wird kopiert |
| `tabMutationDelete` | Registerkarte wird gelöscht |
| `tabMutationMove` | Registerkarte wird verschoben |
| `tabMutationRestore` | Gelöschte Registerkarte wird wiederhergestellt |

### C2. `formatTabMutationCaption.js`

`define` returns one object: `{ messageForPlan, syncTraverseLine }`.

`messageForPlan(_KDB, _plan)` reads the physical `index` from:

| `_plan.operation` | Field |
|---|---|
| `move` | `sourceSlot.index` |
| `delete` | `deletedSlot.index` |
| `duplicate` | `sourceSlot.index` |
| `restoreDeleted` | `insertSlot.index` |

Those objects have no `name`. Read the live tab with `selectors.readTabByIndex(_KDB, index)` or `readVisibleTabs`. `{name}` is that tab’s `name` when it is a non-empty string. `{n}` is the 1-based index in `readVisibleTabs`, matched by physical `index`. `{m}` is that list’s length when the slot is in it. Hidden slot: name only, or `""` when the name is empty. Do not read `names.byIndexAfter`. Do not invent `Tab N`.

Key choice is the same four-way table as `publishRestoreTabCaption.js` `messageForSlot` (`tabProgressNamedCounted`, `tabProgressCounted`, `tabProgressName`, or `""`). Do not copy the role walk.

`syncTraverseLine(_KDB, _state, _options)` returns `false` unless `_options.source === "tabsMutation"`. Physical index is `_options.tabIndex` when `scope === "singleTab"`, otherwise `_state.activeIndex`. Build the message the same way. Call `updateLoadingMessage({ mountKey: "tabs-mutation-loading", message })`. Return that boolean. On throw, warn `[tabs.formatTabMutationCaption] failed` and return `false`.

Token replace: `{n}`, then `{m}`, then `{name}`, each once. Read labels from `_KDB.config.labels.de.loading`.

### C3. Saga

After `planResult.ok`, before `ensureSlots`, set `mutationLoadingStarted = false`, then:

```js
try {
  mutationLoadingStarted = startMutationFrame(_ctx, plan);
  // existing body, including its returns
} finally {
  if (mutationLoadingStarted) { finishMutationFrame(_ctx); }
}
```

`startMutationFrame` is a factory-scope function in this file, not nested inside the saga.

- If `_KDB.state.loading["writeback-set-loading"].isActive === true`, return `false` and do not start.
- Set the flag `true` immediately before `startLoading`, then call it. Mount element: the same `.dashboardFrame` read as `loadingGuards.js` (`_KDB.elements.selectors.root.dashboardFrame`, else `".dashboardFrame"`). `mountKey: "tabs-mutation-loading"`. `sessionMessageKey` from the operation table in C1 (`duplicate` → `tabMutationCopy`, `delete` → `tabMutationDelete`, `move` → `tabMutationMove`, `restoreDeleted` → `tabMutationRestore`). No `message` and no `messageKey`.
- Then `updateLoadingMessage({ mountKey: "tabs-mutation-loading", message: messageForPlan(...) })` when that message is a string. `""` is allowed and hides the stage line.
- Warn and continue on caption failure. Do not throw.

`finishMutationFrame` calls `finishLoading({ mountKey: "tabs-mutation-loading" })` only. Never the writeback key. Never `kdb-tab-page-loading`.

The `finally` must not `return` and must not hide the saga’s own rejection.

### C4. Traverse

Keep the define on its current lines so the file stays ≤150. Add the formatter import on the existing `define` line.

Replace the condition that starts the page overlay so that a `tabsMutation` traverse whose `syncTraverseLine` returns `true` does not call `applyTabPageLoading.start`. Every other source keeps today’s guard (`dashboardPdf` skipped, single-tab `writebackGet` skipped, otherwise start). The `finally` finish of `kdb-tab-page-loading` stays.

---

## Section D. Writer report

1. Section A echo.
2. `node --check` on each touched js file.
3. Line and import counts. `traverseTabs.js` ≤150. Saga imports = 11, and the new one is only the formatter.
4. Quote `startLoading` and the traverse condition.
5. Confirm `applyTabPageLoading.js`, `actionTypes.js`, and `publishRestoreTabCaption.js` have no diff.

---

## Section E. Live acceptance (PO)

Reload. Move a tab, delete a tab, copy a tab.

1. One sheet on the dashboard frame for the whole action, including the widget work. Headline is the German sentence for that operation.
2. The line under the spinner names the acted-on tab, visible position starting at 1. After the action it follows the landing tab.
3. No second caption `Registerkarte wird geladen` on top of that sheet.
4. Undo of a copy says `Registerkarte wird gelöscht`.
5. A parameterset restore still shows `Dashboard wird wiederhergestellt` and is not cleared by a tab action that does not run during it.
6. PDF captions unchanged.

---

## Section F. Forbidden

- A new `_KDB` namespace or `startLoading` field.
- Editing `applyTabPageLoading.js` or copying `readDashboardSlot`.
- Finishing `writeback-set-loading`.
- Swallowing a saga or host error inside the caption `catch`.
- German strings outside `loadingLabels.js`.

---

## Section G. Approval log

| Date | Status | Who | Note |
|---|---|---|---|
| 2026-10-06 | — → `Ready` | coordinator | Stress stood. Formatter is one new effect. Saga’s 11th import is that file only. |
| 2026-10-07 | review PASS-WITH-NITS → `Executed` | coordinator | [Review](2485d3aa-bf16-4e00-804e-a581b652f26d). Spot-check: flag is set at `formatTabMutationCaption.js:108` immediately before `startLoading`. Saga is 110 lines after the helpers moved. Live test still open. |
