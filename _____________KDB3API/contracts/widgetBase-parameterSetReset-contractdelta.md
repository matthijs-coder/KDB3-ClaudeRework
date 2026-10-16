# Contract Delta: `widgetBase` Parameter-Set Reset

> Delta on top of `contracts/widgetBase.md`, `contracts/widgetSettings.md`, `contracts/widgetText.md`, `contracts/widgetVis.md` and `contracts/writeback.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved`
**Parent contract:** `contracts/widgetBase.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08
**Reviewed by:** `PO (vastenburg), approved 2026-07-10 with tranche-2 step-1 plan: reset parks shells to launchpad via the owner routeToLaunchpad path; skipHistory maps to the existing owner history-suppression mechanism (no new history machinery)`

---

## 1. Purpose

`writebackSet.restore(v3, status)` must clear existing dashboard widgets before a normal parameter-set restore and must clear widgets for `status === "newDashboard"` without consuming saved `v3.wgts` entries.

This reset is owner-backed. `writebackSet` may request and await it, but must not directly mutate widget reducer state, widget DOM, launchpad state, settings state, text state or visualization binding state.

## 2. Public Dispatch

Required action:

```js
_KDB.api.widgetBase.dispatch({
  type: "widgetBase/parameterSetResetRequested",
  payload: {
    source: "writebackSet",
    runId,
    status,
    skipHistory: true
  }
});
```

Required sub-owner actions:

```js
_KDB.api.widgetSettings.dispatch({
  type: "widgetSettings/parameterSetResetRequested",
  payload: { widgetIds, source: "writebackSet", runId, status, skipHistory: true }
});

_KDB.api.widgetText.dispatch({
  type: "widgetText/parameterSetResetRequested",
  payload: { widgetIds, source: "writebackSet", runId, status, skipHistory: true }
});

_KDB.api.widgetVis.dispatch({
  type: "widgetVis/parameterSetCancelBindingsRequested",
  payload: { widgetIds, source: "writebackSet", runId, status, skipHistory: true }
});
```

Equivalent action names are acceptable only if the widget owner delta documents the same reset/cancel semantics before implementation.

Return contract:

```js
Promise<{
  ok: boolean,
  resetWidgets: string[],
  skipped: Array<{ widgetId, code }>,
  diagnostics: Array<{ code, widgetId?, message }>
}>
```

## 3. Reset Semantics

`widgetBase` owns the reset orchestration for the widget subsystem.

The owner must:

1. validate `runId`;
2. clear or park existing dashboard widget shells through widgetBase-owned paths;
3. coordinate reset of committed widget settings through `widgetSettings/parameterSetResetRequested`;
4. coordinate reset of text content/runtime through `widgetText/parameterSetResetRequested`;
5. coordinate reset/cancellation of active visualization bindings through `widgetVis/parameterSetCancelBindingsRequested`. For `reason: "parameterSetReset"` that cancel clears slots and local filters and does not rebind the Cognos datasource, reapply slots, or render. A rebuilt live model rejects the later page-context filter write (`clearModelInvalid`). `settingsDelete` still rebuilds after its clear;
6. cancel or ignore stale async widget work for older restore runs;
7. avoid history writes when `skipHistory === true`;
8. return diagnostics for every widget that could not be reset cleanly.

The owner must not:

- restore any saved `v3.wgts` entry;
- create new widgets;
- bind visualization content;
- write filter, tabs, header/footer or kdbControl state.

## 4. Status Semantics

| Status | Required behavior |
|---|---|
| `"notDefaultParamSet"` / `"default*"` | reset existing widgets before `widgetBase/parameterSetRestoreRequested` creates restored widgets |
| `"newDashboard"` | reset existing widgets and leave no restored widgets on the dashboard |
| `"sichtChange"` | unsupported in tranche 1; writeback rejects before this action |

For `status === "newDashboard"`, a partial widget reset failure may continue only when the owner can guarantee the affected widget no longer participates in canvas layout, settings, text or visualization binding. Otherwise the reset returns `ok: false` and `writebackSet` aborts the reset flow.

## 5. Failure Modes

| Condition | Behavior |
|---|---|
| stale `runId` | cancel with `WRITEBACK_RESTORE_CANCELLED` |
| owner reset failure | return `ok: false` with `WRITEBACK_WIDGET_RESET_FAILED` |
| stale async widget completion | ignored when runId no longer matches |
| unsupported current widget kind during reset | reset through generic shell cleanup if possible; otherwise diagnostic and `ok: false` |

## 6. Acceptance

- No widget restore owner dispatch runs before `widgetBase/parameterSetResetRequested` completes for normal restore statuses.
- `status === "newDashboard"` never consumes `v3.wgts`.
- Widget reset does not push user history.
- After successful reset, no stale widget async completion can mutate the current restore run.
