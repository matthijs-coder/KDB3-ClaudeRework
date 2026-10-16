# Contract Delta: `widgetBase` Parameter-Set Restore

> Delta on top of `contracts/widgetBase.md` and `contracts/writeback.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved`
**Parent contract:** `contracts/widgetBase.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08
**Reviewed by:** `PO (vastenburg): descriptive-key sync, widgetCorrelation naming, code-at-step-24 and claim-only shell supply approved 2026-07-12; T2 item 2 skip-class §5 2026-08-16`
**Related:** `contracts/writeback-t2-item2-contractdelta.md`

---

## 1. Purpose

`writebackSet.restore(v3)` needs `widgetBase` to claim/create widget shells, place them on restored tab targets and return a runtime widget correlation. Widget ids are not persisted in v3.

This restore action is not the pre-restore clear/reset path. Existing widgets must be reset first through `widgetBase/parameterSetResetRequested` as defined in `contracts/widgetBase-parameterSetReset-contractdelta.md`; that reset parks widgets on the launchpad so this restore can claim them.

## 2. Consumed v3 Fields

`wgts` entries are descriptive-key objects (`writeback.md` §4.5/§4.5.1). `widgetBase` consumes:

| Kind | Consumed keys |
|---|---|
| `"vis"` | `tab`, `x`, `y`, `w`, `h`, `kind`, `bgcol` (frame colour), `code` (metric/content identity, see §4a) |
| `"txt"` | `tab`, `x`, `y`, `w`, `h`, `kind` |

`"txt"` `bgcol` (shell colour) is not consumed directly by `widgetBase`. It arrives only through the `widgetSettings` colour-consequence path.

## 3. Public Dispatch

Required action (payload as dispatched by `runWidgetRestore.js` step 24; `source`, `runId`, `skipHistory` are injected by `dispatchOwnerPhase`):

```js
_KDB.api.widgetBase.dispatch({
  type: "widgetBase/parameterSetRestoreRequested",
  payload: {
    widgets: v3.wgts,
    tabTargets,
    source: "writebackSet",
    runId,
    skipHistory: true
  }
});
```

Return contract:

```js
Promise<{
  ok: boolean,
  widgetCorrelation: {
    [entryIndex: string]: {
      widgetId: string,
      kind: "vis" | "txt",
      tabIdx: number
    }
  },
  diagnostics: Array<{ code, entryIndex?, message }>
}>
```

`entryIndex` is the index of the entry in `v3.wgts`. Unfulfillable entries are absent from `widgetCorrelation` and carry a per-entry diagnostic.

## 4. Restore Semantics

The owner must:

1. validate `runId`;
2. iterate supported widget entries in v3 order;
3. resolve `tabIdx` through `tabTargets`;
4. claim a widget shell through the owner-approved launchpad claim path (shells parked by `parameterSetResetRequested`), or create one where an owner-approved create path exists (see §4b);
5. apply layout `x,y,w,h`;
6. apply `"vis"` `bgcol` (frame colour) where present;
7. orchestrate per-entry content-context creation with the metric identity (§4a);
8. after successful content-context creation, dispatch post-placement settings-chrome startup through the shared `dispatchWidgetSettingsPlaceControls` effect (`widgetSettings/placeControls`) with `isHistoryReplay: true` and `source: "writebackSet"` so `seedDefaults` is skipped — committed values arrive in step 25 (§4c);
9. return the `entryIndex` -> runtime `widgetId` correlation map;
10. avoid history writes when `skipHistory === true`.

The owner must not:

- read or apply `"txt"` `bgcol` shell colour from v3 directly;
- write widgetSettings values;
- write widgetText content;
- run widgetVis binding;
- persist or assume v3 widget ids.

### 4a. `code` / Content-Context Orchestration (PO decision 2026-07-12)

`code` is metric/content identity, not a committed setting. Per restored `"vis"` entry, `widgetBase` orchestrates content-context creation like a real drop: it dispatches the owner-approved drop-create path (`widgetVis/contentCreate`) with the metric identity from `code` and restore metadata (`source: "writebackSet"`, `runId`, `skipHistory: true`, `isParameterSetRestore: true`). `widgetText` receives its drop-equivalent content-region creation the same way where its owner contract requires it. `widgetSettings` never commits or stores `code`.

Metric enrichment (PO decision 2026-07-14): the metric descriptor (display, langtext, metricsTable, url) is resolved live from the metrics tree through `_KDB.api.metricsTree.resolveMetricByCode(code)` (`metricsTree-resolveMetricByCode-contractdelta.md`) — the same canonical lookup the drop path uses. The former `widgetBase`-owned tree walker (`effects/resolveMetricDescriptorFromTree.js`) is removed. When the lookup is unresolved, the entry degrades as before: the widget title falls back to the code and a `WRITEBACK_SKIPPED_BY_DESIGN` diagnostic is emitted.

### 4c. Post-Placement Settings Chrome (PO decision 2026-07-14)

Restored widgets previously landed on canvas without the settings gear/panel: step 24 stopped after content-context creation while the drop path (`widgetBase.md` §`dropCreate` rule 10) and history replay (`delegateLaunchpadTransferSettingsReplay`) both dispatch `widgetSettings/placeControls` after successful placement/content. Step 24 now follows the same shared effect:

- per successfully content-created `"vis"`/`"txt"` entry, dispatch `dispatchWidgetSettingsPlaceControls` with `{ widgetId, kind, shellEl, layout, isHistoryReplay: true, source: "writebackSet" }`;
- `isHistoryReplay: true` makes `placeAllWidgetControls` skip `seedDefaults` (owner rule): committed values are applied by the step-25 `widgetSettings` batch;
- failure of `placeControls` is non-fatal for the entry (parent rule `widgetBase.md` `dropCreate` rule 12): the entry stays in `widgetCorrelation`, a diagnostic may be recorded, no rollback;
- fire-and-forget is not allowed here: the dispatch is awaited so step 25 never races the control DOM it decorates.

**As-built 2026-08-12:** the per-entry restore loop in `handleParameterSetRestore.js` delegates placement to `effects/placeSerializedWidgetEntry.js` (`guard.kind: "parameterSetRunId"`). Behavior-neutral: same v3 order, guards, and diagnostics; an unexpected throw remains run-fatal.

**As-built 2026-08-16:** restore `contentCreate` dispatch remains on public wrapper `effects/dispatchRestoreContentCreate.js` (vis+text only, `widget.code` metric lookup, restore payload flags); shared metric/API lookup lives in `effects/dispatchContentCreateShared.js`.

**As-built 2026-08-16 (layout after contentCreate):** `placeSerializedWidgetEntry` re-applies `x,y,width,height` via `applyWidgetLayout` after successful `contentCreate` and before `placeControls`. Layout-apply failure is degraded (`WRITEBACK_WIDGET_RESTORE_FAILED` diagnostic, entry stays `ok: true`), not a structural restore abort. Units remain px.

### 4b. Shell Supply (PO decision 2026-07-12)

`widgetBase` has no free-standing programmatic shell-create path in this tranche: shells originate from Cognos drops and are parked on the launchpad by `parameterSetResetRequested`. Restore therefore:

- claims parked shells matching the requested `kind` first;
- may use an owner-approved Cognos create wrapper if the implementation round establishes one;
- otherwise fails the entry honestly with `WRITEBACK_WIDGET_RESTORE_FAILED` (no silent skip, no fake shells). Shell-create for surplus entries is a backlog item (`contracts/futureTodo/`).

## 5. Unsupported Kinds

Tranche 1 supports:

- `"vis"` (including vis `type: "list"`)
- `"txt"`

Kind `"tbl"` (Cognos List/datatable shells, pad dataTables, stub `widgetDataTable`) and helper kind `"topn"` (role `topNHelper`, pad `topN`) are **skipped by design**. GET omits them; they are not restore targets. Distinct from vis key `wgts[].topn` (`topNChoice`), which is live.

`WRITEBACK_WIDGET_KIND_UNSUPPORTED` is emitted only if those kinds still appear in `wgts`. widgetBase then skips the entry (no claim, no `contentCreate`). There is no `WIDGET_FIELDS.tbl` / `.topn`.

## 6. Failure Modes

| Condition | Behavior |
|---|---|
| missing tab target | fail entry with `WRITEBACK_TABS_TARGET_MISSING` |
| unsupported kind | diagnostic `WRITEBACK_WIDGET_KIND_UNSUPPORTED` |
| stale `runId` | cancel with `WRITEBACK_RESTORE_CANCELLED` |
| claim/create failure (incl. no shell available) | fail entry with `WRITEBACK_WIDGET_RESTORE_FAILED`; `writebackSet` decides abort/degrade |
| content-context create failure | fail entry with `WRITEBACK_WIDGET_RESTORE_FAILED` |
| stale async completion | ignored when runId no longer matches |

## 7. Acceptance

- Widget restore does not depend on persisted widget ids.
- Widget restore starts only after `widgetBase/parameterSetResetRequested` completed successfully for the same `runId`.
- `widgetCorrelation` is available before widgetSettings/widgetText/widgetVis restore.
- `"vis"` `code` reaches widgetVis only through the step-24 content-context orchestration, never through widgetSettings.
- `"txt"` shell colour reaches widgetBase only through widgetSettings consequence.
- Unfulfillable entries produce honest per-entry diagnostics instead of partial silent success.
- `skipHistory: true` prevents layout/create restore from pushing user history.
