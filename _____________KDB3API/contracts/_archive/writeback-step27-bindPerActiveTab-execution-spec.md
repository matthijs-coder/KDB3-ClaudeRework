# Execution Spec: step 27 binds vis widgets per active tab (WP-T)

> Mechanical spec for Grok 4.7. Architecture lives in `writeback-step27-bindPerActiveTab-contractdelta.md` (**Approved**, PO vastenburg 2026-10-06). Do **not** re-decide `forceShow`, abort semantics, `deferRenderWait`, grouping order, phase names or fallback.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo Section A before producing files.

---

**Status:** `Executed` — review PASS, committed `2fd7f24`, Section K live green 2026-10-06 (spec review 2026-10-06: 2 MUST-FIX + 5 NITs patched before execution)
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** grok 4.7 (W1)
**Reviewer:** coordinator + grok 4.7 review + PO Cognos

---

## Exclusive allowlist

**May create:**

- `KDB3/js/core/services/writeback/set/effects/bindVisPerActiveTab.js`

**May edit:**

- `KDB3/js/core/services/writeback/set/effects/runWidgetRestore.js` (step-27 block only)
- `KDB3/js/dashboard/tabs/actions/parameterSetActivateTab.js` (the two inner-frame skip conditions + header comment line only)

**Must not edit:** everything else — incl. `dispatchOwnerPhase.js`, `createRunContext.js`, `restoreConstants.js`, `runNormalRestore.js`, `ensureTabWidgetsRouted.js`, any `widgetVis/**`, `widgetTopN/**`, `widgetBase/**`, tabs effects/traverse, contracts, `.mdc`. No commit/push.

## Section A. Pre-flight read list

Echo one sentence per row before editing.

1. `.cursor/rules/kdb-object.mdc`
2. `.cursor/rules/state.mdc` — no state writes.
3. `.cursor/rules/runtime.mdc` — no new runtime keys.
4. `.cursor/rules/module-public-api.mdc` — writeback talks to owners only via `run.dispatchOwnerPhase` (`_KDB.api.<owner>.dispatch`).
5. `.cursor/rules/events.mdc` — no events.
6. `.cursor/rules/feature-structure.mdc` — ≤150 per file; orchestration files ≤120.
7. `.cursor/rules/naming.mdc` — new file returns `__controller`.
8. `.cursor/rules/error-handling.mdc`
9. `.cursor/rules/amd.mdc` — one define, named factory-scope helpers, no nested functions, `.js` suffix on relative imports (as siblings).
10. `.cursor/rules/cognos-adapter.mdc` — no host access in this WP.
11. `contracts/writeback-step27-bindPerActiveTab-contractdelta.md` §3–§5.
12. `contracts/tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md` §2–§4 (activate result shape).
13. Live files: `runWidgetRestore.js`, `dispatchOwnerPhase.js` (spec fields `phaseName, owner, type, payload, required, degradedAllowed, failureCode`; returns `{ ok, degraded, result }`; throws `_constants.ABORT` / `CANCELLED`), `createRunContext.js` (`run.options`, `run.abortedByOwner`), `restoreConstants.js` (`ABORT`), `parameterSetActivateTab.js`, `widgetBase/actions/handleParameterSetRestore.js:71` (correlation shape `{ [entryIndex]: { widgetId, kind, tabIdx } }`).
14. This spec.

## Section C. Per-file specifications

#### `dashboard/tabs/actions/parameterSetActivateTab.js` (edit, P1)

- Both skip conditions (`if (_hasTabInnerFrame(_ctx._KDB, slot.tabId, slot.pageId)) {`, currently ~lines 47 and 55) become
  `if (payload.forceShow !== true && _hasTabInnerFrame(_ctx._KDB, slot.tabId, slot.pageId)) {`
- Header comment: append one line: `forceShow: true (step 27 only) does not take the inner-frame skip; guards and a missing slot still return without a click. See writeback-step27-bindPerActiveTab-contractdelta.md.`
- Nothing else. Line count must stay ≤ 150 (live 139–140 → +1).
- **Rules to apply:** `feature-structure.mdc`, `amd.mdc`.

#### `core/services/writeback/set/effects/bindVisPerActiveTab.js` (create)

- **AMD imports (2):** `"../../schema/errorCodes.js"`, `"../config/restoreConstants.js",` (keep the sibling trailing comma after the last dependency) → `_errorCodes`, `_constants`.
- **Entry:** `async function __controller(_run, _widgetCorrelation)`; the factory ends with `return __controller;`. The function returns `undefined`; may throw `_constants.ABORT` / `_constants.CANCELLED` (propagated from `_run.dispatchOwnerPhase` or own abort).
  **No try/catch in `__controller`.** Copy `runWidgetRestore.js`, which has none, so `_constants.ABORT` and `_constants.CANCELLED` reach `executeRestoreRun` unchanged. Do not copy `ensureTabWidgetsRouted.js` (it converts non-CANCELLED errors into ABORT) or `runFilterRestore.js` (it logs and rethrows, which would log the sentinel).
- **Body:**
  1. `const allowDegraded = _run.options.allowDegradedWidgetBinding === true;`
  2. `const groups = groupVisByTab(_widgetCorrelation);`
  3. **Fallback** — `groups.length === 0`: exactly today's dispatch, then return:
     `await _run.dispatchOwnerPhase({ phaseName: "widgetVisBinding", owner: "widgetVis", type: "widgetVis/parameterSetBindingRequested", payload: { widgetCorrelation: _widgetCorrelation }, required: !allowDegraded, degradedAllowed: allowDegraded, failureCode: _errorCodes.codes.WRITEBACK_WIDGET_BINDING_DEGRADED });`
  4. `let didAnyBindFail = false;` For each `group` (sequential `for…of`):
     - `await _run.dispatchOwnerPhase({ phaseName: "tabActivateForWidgets", owner: "tabs", type: "tabs/parameterSetActivateTabRequested", payload: { tabIdx: group.tabIdx, includeHiddenDashboardTabs: true, restoreActiveTab: false, forceShow: true }, required: true, failureCode: _errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING });`
     - `const bind = await _run.dispatchOwnerPhase({ phaseName: "widgetVisBinding", owner: "widgetVis", type: "widgetVis/parameterSetBindingRequested", payload: { widgetCorrelation: group.entries }, required: false, degradedAllowed: allowDegraded, failureCode: _errorCodes.codes.WRITEBACK_WIDGET_BINDING_DEGRADED });`
     - `if (!bind || bind.ok !== true) { didAnyBindFail = true; }`
  5. After the loop: `if (didAnyBindFail) { _run.abortedByOwner = true; throw _constants.ABORT; }`
     `bind.ok` is read **after** `degradedAllowed` coercion in `dispatchOwnerPhase`: when `allowDegraded` is true a failed owner bind stays `degraded` and must not throw (`writeback.md` §6.6.1). The flag must be set here because a `required: false` failure does not set it inside `dispatchOwnerPhase`.
- **Factory-scope helper** `groupVisByTab(_correlation)` (try/catch: `console.error("[writeback.bindVisPerActiveTab] grouping failed", err); throw err;`):
  - Not an object → `[]`.
  - Keys sorted numerically (`Number(a) - Number(b)`); for each entry with `entry && entry.kind === "vis" && entry.widgetId && typeof entry.tabIdx === "number"`: find/create group by `tabIdx` in **first-seen** order (do not sort groups by `tabIdx`); `group.entries[key] = entry` (keep the original `entryIndex` key and entry object unchanged).
  - Returns `[{ tabIdx, entries }]`. Use a plain loop; no nested functions (sort comparator as factory-scope `compareNumericKeys`).
- Lines target 50–90 (hard 150).
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `module-public-api.mdc`, `feature-structure.mdc`.

#### `core/services/writeback/set/effects/runWidgetRestore.js` (edit)

- Add import `"./bindVisPerActiveTab.js"` → `_bindVisPerActiveTab` (keep existing import style incl. trailing comma).
- Replace the step-27 block (comment + `hasVis` + `allowDegraded` + dispatch, ~lines 59–71) with:

```js
    // Step 27: widgetVis binding per active tab (writeback-step27-bindPerActiveTab-contractdelta.md).
    const hasVis = normalized.wgts.some(function (widget) { return widget && widget.kind === "vis"; });
    if (hasVis) {
      await _bindVisPerActiveTab(run, widgetCorrelation);
    }
```

- Steps 23–26 unchanged. Result ≤ 75 lines.
- **Rules to apply:** `amd.mdc`, `feature-structure.mdc`.

## Section J. Acceptance (self-verification)

1. Three files per allowlist; nothing else.
2. `parameterSetActivateTab.js` diff = 2 conditions + 1 comment line; ≤150.
3. `bindVisPerActiveTab.js`: AMD 2, `__controller(_run, _widgetCorrelation)`, no try/catch in `__controller`, no nested functions, grouping first-seen by numeric `entryIndex`, `forceShow: true` + `restoreActiveTab: false` on activate, bind `required: false` + `degradedAllowed: allowDegraded`, single `ABORT` with `run.abortedByOwner = true` after the loop, fallback identical to the old dispatch.
4. `runWidgetRestore.js` ≤75 lines, AMD 3.
5. `node --check` on all three files.
6. Report: echoes, file checklist (lines, AMD), deviations, Section J pass/fail.

## Section K. Live acceptance (PO)

Fresh load, no observer, Cognos breakpoint armed, restore `oude parameterset.txt`:

1. Breakpoint not hit; `nativeMultiSelectRestore` ok (WP-J regression).
2. One `tabActivateForWidgets` + `widgetVisBinding` pair per vis tab after `widgetSettingsRestore`; all `widgetVisBinding` ok; no `awaiting_topN`; no toast "Tabellendaten konnten nicht geladen werden: model00000193df6a1936_00000000".
3. Step 28 runs (restore lands on first visible tab); `outcome` `committed` or `degraded` only from singleSelect bookkeeping (futureTodo).
4. If TopN still times out: report which tab / widget; delta returns to `Draft`.

## Section L. Forbidden

Editing `widgetVis`/`widgetTopN`/`dispatchOwnerPhase`/`restoreConstants`; new phase names; changing steps 18/23 payloads; sorting groups by `tabIdx`; passing `scopeId`/`tabId` in the vis payload; commit/push; improvising (stop and report).
