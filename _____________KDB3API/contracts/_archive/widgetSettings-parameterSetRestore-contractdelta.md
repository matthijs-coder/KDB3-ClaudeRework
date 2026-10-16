# Contract Delta: `widgetSettings` Parameter-Set Restore

> Delta on top of `contracts/widgetSettings.md` and `contracts/writeback.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved`
**As-built 2026-08-16:** Restore batch remains `handleParameterSetRestoreBatch` + `parameterSetRestoreBatchCommits`; not routed through startup seed (`handleSeedDefaults` / `applyVisStartupSeedBatch`). `skipHistory`, `parameterSetRunId`, `WRITEBACK_WIDGET_RESTORE_FAILED`, and fail-fast semantics unchanged.
**Parent contract:** `contracts/widgetSettings.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08
**Reviewed by:** `PO (vastenburg): descriptive-key sync, widgetCorrelation naming, code moved to widgetBase step 24, sequences removed from project scope, approved 2026-07-12`

---

## 1. Purpose

`writebackSet.restore(v3)` must restore committed widget settings after `widgetBase` has created runtime widget ids. Widget settings restore must use owner state/commit paths, not DOM dropdown replay.

`code` (metric identity) is not consumed here: it is handed to the content-create orchestration at step 24 (`widgetBase` delta §4a, PO decision 2026-07-12).

## 2. Consumed v3 Fields

`wgts` entries are descriptive-key objects (`writeback.md` §4.5/§4.5.1). `widgetSettings` consumes:

For `"vis"` entries:

| Key | Setting |
|---|---|
| `type` | `visType` |
| `dim` | `dimension` |
| `topn` | `topNChoice` |
| `vals` | explicit `showValues` (`1` → true, `0` → false); omitted → inherit |
| `grp` | explicit `grouping` grain; omitted → inherit; present illegal-for-`type` → leave absent |
| `iter` | explicit `iterator` (`1` → true, `0` → false); omitted → inherit (`hasOwnProperty` only) |
| `wzbar` | explicit Zoomleiste (`1` → true, `0` → false); omitted → inherit (`hasOwnProperty` only) |
| `vcap` | explicit Werte beschriftung (`1` → true, `0` → false); omitted → inherit (`hasOwnProperty` only) |
| `ctcol` | content/settings colour |

For `"txt"` entries:

| Key | Setting |
|---|---|
| `fsize` | `fontSize` |
| `bgcol` | shell colour |
| `style` | `restyle` |

`"txt"` `bgcol` (shell colour) is a widgetSettings committed setting. Its shell application is handed off to `widgetBase` through the existing colour-consequence path.

## 3. Public Dispatch

Required action (payload as dispatched by `runWidgetRestore.js` step 25; `source`, `runId`, `skipHistory` are injected by `dispatchOwnerPhase`):

```js
_KDB.api.widgetSettings.dispatch({
  type: "widgetSettings/parameterSetRestoreBatchRequested",
  payload: {
    widgets: v3.wgts,
    widgetCorrelation,
    source: "writebackSet",
    runId,
    skipHistory: true
  }
});
```

`widgetCorrelation` maps `entryIndex` (index in `v3.wgts`) to `{ widgetId, kind, tabIdx }` as returned by `widgetBase/parameterSetRestoreRequested`.

Reset action used by `widgetBase/parameterSetResetRequested`:

```js
_KDB.api.widgetSettings.dispatch({
  type: "widgetSettings/parameterSetResetRequested",
  payload: {
    widgetIds,
    source: "writebackSet",
    runId,
    status,
    skipHistory: true
  }
});
```

This action clears committed widget settings owned by widgetSettings for the supplied runtime widget ids. It must not remove widget shells, text content or visualization bindings.

Return contract:

```js
Promise<{
  ok: boolean,
  applied: string[],
  skipped: Array<{ entryIndex, code }>,
  diagnostics: Array<{ code, entryIndex?, setting?, message }>
}>
```

## 4. Canonical Sentinels

The owner delta must align with `writeback.md` §4.7. Omitted optional key = owner default; a present key carries a valid non-sentinel value.

| Setting | Canonical v3 | Omit/default |
|---|---|---|
| `dim` | string | `"none"`, `""`, `null` -> omitted |
| `topn` | string | `"none"`, `""`, `null` -> omitted |
| `ctcol` | colour token/string | omitted when owner default |
| `"txt"` `bgcol` | colour token/string | omitted when owner default |
| `fsize` | number | omitted when owner default (`"automatic"`) |
| `style` | owner-defined token/object | omitted when owner default |

(sequences removed from project scope, PO 2026-07-12)

## 5. Restore Semantics

The owner must:

1. validate `runId`;
2. consume runtime `widgetCorrelation` from `widgetBase`;
3. build committed settings batches per runtime `widgetId`;
4. apply committed settings through owner reducer/effects;
5. trigger text-widget style consequences after commit:
   - `widgetText/applyFontSize` for `fsize`;
   - `widgetText/applyRestyle` for `style`;
   - `widgetBase/applyColour` for `"txt"` `bgcol` shell colour;
6. avoid history writes when `skipHistory === true`;
7. return diagnostics per entry/setting.

Consequence payloads must include:

```js
{
  source: "writebackSet",
  runId,
  skipHistory: true,
  isParameterSetRestore: true
}
```

`parameterSetRestoreBatchRequested` must await these consequences before resolving successfully for the affected text widget.

The owner must not:

- create widgets;
- commit or store `code` (metric identity, step 24);
- mutate widgetBase layout directly except through approved colour consequence;
- write widgetText content;
- run widgetVis binding directly.

## 6. Failure Modes

| Condition | Behavior |
|---|---|
| missing runtime widget id in `widgetCorrelation` | skip entry with diagnostic |
| stale `runId` | cancel with `WRITEBACK_RESTORE_CANCELLED` |
| text style consequence failure | return per-widget diagnostic before widgetText content restore; `writebackSet` decides abort/degrade |
| unsupported setting | diagnostic; do not silently drop |

## 7. Acceptance

- `"txt"` `bgcol` is committed by widgetSettings and reaches widgetBase only via consequence.
- `fsize` and `style` are committed by widgetSettings and handed off to widgetText through explicit consequences.
- `code` never flows through widgetSettings.
- No DOM dropdown replay is required.
- `skipHistory: true` prevents settings restore history entries.
- Resulting committed settings can be consumed by `widgetVis`.
