# Contract Delta: `widgetVis` Parameter-Set Restore

> Delta on top of `contracts/widgetVis.md` and `contracts/writeback.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved`
**Parent contract:** `contracts/widgetVis.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08
**Reviewed by:** `PO (vastenburg): descriptive-key sync, widgetCorrelation naming, contentCreate-at-step-24 arrival approved 2026-07-12`

---

## 1. Purpose

`writebackSet.restore(v3)` must trigger visualization binding after widget shells exist and committed widget settings have been restored. `widgetVis` owns binding, content readiness, Dienststelle gates and stale-run cancellation for visualization widgets.

## 2. Inputs

`widgetVis` does not consume v3 entries directly as persisted data. It consumes:

- runtime `widgetCorrelation` from `widgetBase` (`entryIndex` -> `{ widgetId, kind, tabIdx }`);
- per-widget content context created during step 24: `widgetBase` orchestrates `widgetVis/contentCreate` per restored `"vis"` entry with the metric identity from `code` and restore metadata (PO decision 2026-07-12, widgetBase delta §4a);
- committed settings snapshots from `widgetSettings`;
- confirmed Dienststelle hierarchy state/gate;
- content readiness for visualization widgets.

## 3. Public Dispatch

Required action (payload as dispatched by `runWidgetRestore.js` step 27; `source`, `runId`, `skipHistory` are injected by `dispatchOwnerPhase`):

```js
_KDB.api.widgetVis.dispatch({
  type: "widgetVis/parameterSetBindingRequested",
  payload: {
    widgetCorrelation,
    source: "writebackSet",
    runId,
    skipHistory: true
  }
});
```

Cancel/reset action used by `widgetBase/parameterSetResetRequested`:

```js
_KDB.api.widgetVis.dispatch({
  type: "widgetVis/parameterSetCancelBindingsRequested",
  payload: {
    widgetIds,
    source: "writebackSet",
    runId,
    status,
    skipHistory: true
  }
});
```

This action cancels pending binding work and clears widgetVis-owned runtime binding state for the supplied runtime widget ids. It must not remove widget shells, settings or text content.

Return contract:

```js
Promise<{
  ok: boolean,
  bound: string[],
  skipped: Array<{ widgetId, code }>,
  diagnostics: Array<{ code, widgetId?, message }>
}>
```

## 4. Binding Semantics

The owner must:

1. validate `runId`;
2. select visualization widgets from `widgetCorrelation` (`kind === "vis"`);
3. wait for widget content readiness (existing owner gates; no new canvas-wide render barrier, PO decision 2026-07-12);
4. read committed settings from `widgetSettings`;
5. wait for Dienststelle hierarchy gate when binding depends on Dienststelle;
6. wait for TopN/helper readiness where relevant;
7. run the existing binding pipeline with a **deferred render wait** (bugfix sync 2026-07-13): the apply call passes `renderWait: { waitForStart: false, waitForComplete: false }` to `widgetBindingApply`. Restore originally bound widgets while their tab was usually inactive; Cognos fires no render events on inactive pages, so awaiting them burned the full 12s vis timeout per widget, sequentially. Since 2026-10-06 writeback shows each vis tab before dispatching this action with only that tab's correlation subset (`writeback-step27-bindPerActiveTab-contractdelta.md`); this owner is unchanged by that and keeps the deferred render wait (P3). `renderWidget` is still triggered; the visible render is owned by the post-restore tab traversal (`writeback.md` §6.4 render semantics / step 28);
8. avoid history writes when `skipHistory === true`;
9. ignore stale async completions when runId changes.

The owner must not:

- create widget shells;
- mutate widgetBase layout;
- commit widgetSettings values;
- restore text content.

## 5. `sichtChange` Downstream Sync

`status === "sichtChange"` is not supported in writeback tranche 1.

If a later tranche promotes `status === "sichtChange"` in production, widgetVis (or an approved downstream owner) must expose:

```js
_KDB.api.widgetVis.dispatch({
  type: "widgetVis/syncDownstreamAfterSichtChangeRequested",
  payload: {
    widgetCorrelation,
    source: "writebackSet",
    runId,
    skipHistory: true
  }
});
```

This action must clear/rebuild downstream local filter/slot effects equivalent to legacy `syncDownstreamWidgetsAfterRestore`. Until that later tranche is approved, the bridge must reject `"sichtChange"` with `WRITEBACK_UNSUPPORTED_STATUS`.

## 6. Failure Modes

| Condition | Behavior |
|---|---|
| stale `runId` | cancel/ignore completion with `WRITEBACK_RESTORE_CANCELLED` |
| content readiness timeout | diagnostic `WRITEBACK_WIDGET_BINDING_DEGRADED` and skip affected widget binding; return `ok: false` when the widget is a supported tranche-1 `"vis"` entry unless caller explicitly allowed degraded binding |
| Dienststelle gate timeout | diagnostic `WRITEBACK_WIDGET_BINDING_DEGRADED` and skip affected widget binding; return `ok: false` when the binding is required for a supported tranche-1 `"vis"` entry |
| missing committed settings | diagnostic `WRITEBACK_WIDGET_RESTORE_FAILED` and skip affected widget; return `ok: false` for supported tranche-1 `"vis"` entries |
| unsupported widget kind | ignored; widgetBase/widgetSettings already diagnosed |

## 7. Acceptance

- Binding runs only after widgetBase and widgetSettings restore.
- Content context per `"vis"` entry originates from the step-24 `contentCreate` orchestration, never from widgetSettings.
- Dienststelle-dependent widgets wait for confirmed Dienststelle state.
- Supported tranche-1 visualization widgets do not silently pass as restored when binding was skipped.
- Stale async binding cannot mutate a newer restore run.
- `sichtChange` is either fully supported through downstream sync or explicitly unsupported.
