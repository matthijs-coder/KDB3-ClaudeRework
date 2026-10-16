# Execution Spec: parameterset tab line on the restore overlay

> Mechanical spec. Architecture is `contracts/loadingService-tab-progress-caption-contractdelta.md` (**Approved**, D-L1..D-L4). Do not re-decide layout, copy, scope, or target.

---

**Status:** `Executed` — review PASS. Live acceptance (Section E) still open. Not `Implemented`.
**Module / contract:** writeback SET caller of `loadingService`. Parents stay untouched until the delta is `Implemented`.
**Phase:** `extension`
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** one Grok 4.7 writer (`grok-4.7-xhigh-fast`)
**Reviewer:** independent Grok 4.7 review + coordinator spot-check + PO live test (Section K)

---

## Exclusive allowlist (one writer)

**May create:**

- `KDB3/js/core/services/writeback/set/effects/publishRestoreTabCaption.js` only. Do not add `formatRestoreTabCaption.js`. The token replace is a factory-scope function in the publisher file.

**May edit:**

- `KDB3/js/core/services/loadingService/config/loadingLabels.js` — the five keys in Section C only
- `KDB3/js/core/services/writeback/set/effects/loadingGuards.js` — start options only
- `KDB3/js/core/services/writeback/set/effects/bindVisPerActiveTab.js` — one call after a successful step-27 activate; signature gains `_KDB`
- `KDB3/js/core/services/writeback/set/effects/runWidgetRestore.js` — the `bindVisPerActiveTab` call passes `_KDB` first
- `KDB3/js/core/services/writeback/set/effects/runNormalRestore.js` — one call after step 28 returns

**Must not edit:** `loadingService` effects, `createLoadingService.js`, `loadingAnimation.css`, `traverseTabs.js`, `applyTabPageLoading.js`, `postParameterSetRestoreTraverse.js`, `listDashboardSlots.js`, dashboardPdf, `KDB.js`, `.cursor/rules/**`, any contract other than this spec's approval log (the coordinator owns that).

Current sizes the writer must not blow past 150 lines or 10 imports: `bindVisPerActiveTab.js` 86 lines / 2 imports; `runWidgetRestore.js` read the file and keep the edit to the call; `runNormalRestore.js` 92 lines / 5 imports; `loadingGuards.js` 71 lines / 1 import; `loadingLabels.js` 22 lines / 0 imports.

---

## Section A. Pre-flight (before any file)

Echo one sentence each, numbered, then write. Do not paste the rule files into the report.

1. `kdb-object.mdc`
2. `state.mdc`
3. `runtime.mdc`
4. `module-public-api.mdc`
5. `events.mdc`
6. `feature-structure.mdc`
7. `naming.mdc`
8. `error-handling.mdc`
9. `dom.mdc`
10. `amd.mdc`
11. `cognos-adapter.mdc`
12. `contracts/loadingService-tab-progress-caption-contractdelta.md` §2 and §3
13. This spec

---

## Section B. Rules to apply

| File | Rules |
|---|---|
| `loadingLabels.js` | `naming.mdc` (German only in the catalog). Pure config, no try/catch. |
| `publishRestoreTabCaption.js` | `amd.mdc` (token replace is a factory-scope function, not a nested function and not a second file), `naming.mdc`, `error-handling.mdc`, `module-public-api.mdc` (tabs via `selectors.js` only; loading via `_KDB.services.loading`). `state.mdc` (read tabs state, do not write it). `cognos-adapter.mdc` (no `_KDB.cognosAPI`). No DOM. |
| `loadingGuards.js` | `error-handling.mdc`. Keep the existing warn-and-return. Do not let caption setup throw out of the guard. |
| `bindVisPerActiveTab.js`, `runWidgetRestore.js`, `runNormalRestore.js` | `amd.mdc`, `error-handling.mdc`. The publisher must not throw into the restore. Do not reorder steps. Do not change `required`, `forceShow`, or failure codes. |

---

## Section C. Work

### C1. Labels

Add exactly:

| Key | DE |
|---|---|
| `tabProgressNamedCounted` | Registerkarte {n} von {m}: {name} |
| `tabProgressNamed` | Registerkarte {n}: {name} |
| `tabProgressCounted` | Registerkarte {n} von {m} |
| `tabProgressNumber` | Registerkarte {n} |
| `tabProgressName` | {name} |

Keep every existing key. Do not put these strings in any other file.

### C2. Token replace, inside the publisher file

Factory-scope function `formatRestoreTabCaption(_KDB, _messageKey, _params)` in `publishRestoreTabCaption.js`. Not a separate file. Not nested inside `__controller`.

- Read `_KDB.config.labels.de.loading[_messageKey]`. Missing label, missing config, or a throw: `console.error("[writebackSet.formatRestoreTabCaption] failed", error)` and return `""`.
- Replace `{n}`, then `{m}`, then `{name}`, each at most once. `{name}` last.
- A missing param leaves that token out only by choosing another key in C3. This function does not decide which key. It only substitutes.

### C3. `publishRestoreTabCaption.js`

`define` imports only `../../../../../dashboard/tabs/state/selectors.js` (the relative id writeback GET uses in `collectTabs.js`). It does not import `listDashboardSlots.js`, `formatPdfLoadingCaption.js`, or any loadingService file.

`__controller(_KDB, _run, _request)` returns nothing useful. The whole body is try/catch. On failure: `console.warn("[writebackSet.publishRestoreTabCaption] failed", error)` and return. Never throw.

No-op when `run.loadingStarted !== true`, when `run.loadingHandle` is missing, or when `_KDB.services.loading.updateLoadingMessage` is not a function.

`_request` is one of:

- `{ tabIdx: <number> }` — step 27
- `{ landing: true }` — step 28

**Resolve the step-27 slot.** From `selectors.readTabsState(_KDB)`: walk `order`, take `byIndex[String(index)]`, keep entries with `role === "dashboard"`, pick index `tabIdx`. If `role` is missing on a walked entry, `console.warn` once and return without writing a caption. Do not use `index < maxUserTabs`. If the index misses, warn and return.

**Resolve the landing slot.** `selectors.readVisibleTabs(_KDB)[0]`. Empty list: publish `message: ""` (clears a stale step-27 line) and return.

**Choose the key.**

| Slot in `readVisibleTabs` (match physical `index`, not `tabId`) | Name is a non-empty string | Key |
|---|---|---|
| yes | yes | `tabProgressNamedCounted` |
| yes | no | `tabProgressCounted` |
| no | yes | `tabProgressName` |
| no | no | no key; message `""` |

`{n}` = visible index + 1. `{m}` = `readVisibleTabs().length`. `{name}` = `slot.name`.

Call:

```js
loading.updateLoadingMessage({
  handle: _run.loadingHandle,
  message: formatted
});
```

Do not pass `messageKey` on that call. `message: ""` with no `messageKey` already resolves to `""` (`resolveLoadingMessage.js:8-18`) and hides the stage node (`syncLoadingCaption.js:16-17`). Do not change those two files.

If `updateLoadingMessage` returns `false`, warn and return. Do not retry.

### C4. Start

In `startLoadingGuarded`, replace `messageKey: "dashboardRestore"` with `sessionMessageKey: "dashboardRestore"`. Do not also pass `message` or `messageKey`. Finish is unchanged.

### C5. Step 27

`bindVisPerActiveTab` stays `async`. The signature becomes `__controller(_KDB, _run, _widgetCorrelation)`. After the `tabActivateForWidgets` await returns (it throws on failure; do not catch it here), and before the vis bind of that group:

```js
_publishRestoreTabCaption(_KDB, _run, { tabIdx: group.tabIdx });
```

`runWidgetRestore.js` is the only caller (`bindVisPerActiveTab(run, widgetCorrelation)` today). Pass `_KDB` first. Do not call the publisher from step 23.

### C6. Step 28

In `runNormalRestore`, after the `tabsPostRestoreTraverse` await returns, call:

```js
_publishRestoreTabCaption(_KDB, run, { landing: true });
```

Call it even when the phase is degraded (`required: false`). Do not call it when the `if (normalized.tabs !== undefined || normalized.wgts !== undefined)` block is skipped. Do not edit the traverse payload.

---

## Section D. Self-check (writer report)

1. Echo Section A was done.
2. `node --check` on every created or edited js file.
3. Line count and AMD import count for each of those files. Flag anything over 150 lines or over 10 imports.
4. Quote the new `startLoading` options and one `updateLoadingMessage` call.
5. Confirm `listDashboardSlots.js`, `traverseTabs.js`, `applyTabPageLoading.js`, and `loadingAnimation.css` have no diff.
6. Confirm a throw inside the publisher cannot reject the restore (catch returns).

---

## Section E. Live acceptance (PO, after deploy)

Reload the dashboard. Restore a parameterset that builds more than one visible tab (the usual `WBParameterSet` run).

1. The overlay on the dashboard frame shows `Dashboard wird wiederhergestellt` above the spinner for the whole restore.
2. While vis tabs are shown, the line under the spinner is `Registerkarte {n} von {m}: {name}` with `{n}` the visible position (first visible tab is 1), not the internal slot index.
3. After restore settles, that line names the landing tab (first visible tab), then the overlay goes away. No leftover `Registerkarte wird geladen` from this change. The existing tab-page overlay may still appear during traverse; that is unchanged.
4. A tab with an empty name shows `Registerkarte {n} von {m}` with no colon.
5. PDF export captions are unchanged.

---

## Section F. Forbidden

- A new public field, event, state subtree, or spinner.
- Editing the tab-page overlay or WP-Q removal.
- Importing `listDashboardSlots.js` or any file under `tabs/` other than `state/selectors.js`.
- Inventing `Tab N` or a “wird aufgebaut” headline.
- Swallowing a restore-phase error inside the new caption call. The publisher catches its own failures only.
- Reordering restore steps or changing `forceShow`.

---

## Section G. Approval log

| Date | Status | Who | Note |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | coordinator | Tranche 1 per delta D-L3. Spec review not yet run. |
| 2026-10-06 | review PASS-WITH-NITS → `Ready` | coordinator | [Review](6661b32d-4a2b-47cd-bd8a-e1b2915b6c03). No must-fix. Nits folded: stays `async`; match physical `index` (`extractId` can be null); AMD path `../../../../../dashboard/tabs/state/selectors.js`. |
| 2026-10-06 | stress STAND, one-file shrink, PO go | coordinator | Consequences stand. One publisher file. Five catalog keys stay. |
| 2026-10-06 | review PASS → `Executed` | coordinator | [Review](e97da4aa-5254-4460-8126-7dd4e8910628). Spot-check: `loadingGuards.js:24-28` is `sessionMessageKey` only. Call sites `bindVisPerActiveTab.js:36` and `runNormalRestore.js:86`. Live test still open. |
