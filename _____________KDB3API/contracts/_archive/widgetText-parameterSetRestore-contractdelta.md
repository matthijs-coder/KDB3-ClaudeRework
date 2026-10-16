# Contract Delta: `widgetText` Parameter-Set Restore

> Delta on top of `contracts/widgetText.md` and `contracts/writeback.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved`
**Parent contract:** `contracts/widgetText.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08
**Reviewed by:** `PO (vastenburg): descriptive-key sync and widgetCorrelation naming approved 2026-07-12`

---

## 1. Purpose

`writebackSet.restore(v3)` must restore text widget content through the `widgetText` owner. Style/settings for text widgets are owned by `widgetSettings` and `widgetBase`, not `widgetText`.

## 2. Consumed v3 Fields

`wgts` entries are descriptive-key objects (`writeback.md` §4.5/§4.5.1). For `"txt"` entries `widgetText` consumes:

| Key | Meaning |
|---|---|
| `text` | text content |

`widgetText` does not consume:

- `fsize` (`fontSize`);
- `bgcol` (shell colour);
- `style` (`restyle`);
- widget layout;
- tab targets.

## 3. Public Dispatch

Required action (payload as dispatched by `runWidgetRestore.js` step 26; `source`, `runId`, `skipHistory` are injected by `dispatchOwnerPhase`):

```js
_KDB.api.widgetText.dispatch({
  type: "widgetText/parameterSetRestoreRequested",
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
_KDB.api.widgetText.dispatch({
  type: "widgetText/parameterSetResetRequested",
  payload: {
    widgetIds,
    source: "writebackSet",
    runId,
    status,
    skipHistory: true
  }
});
```

This action clears text content/runtime owned by widgetText for the supplied runtime widget ids. It must not remove widget shells, style settings or visualization bindings.

Return contract:

```js
Promise<{
  ok: boolean,
  applied: string[],
  skipped: Array<{ entryIndex, code }>,
  diagnostics: Array<{ code, entryIndex?, message }>
}>
```

## 4. Restore Semantics

The owner must:

1. validate `runId`;
2. consume runtime `widgetCorrelation` from `widgetBase`;
3. apply `text` as committed text content through owner reducer/effects;
4. avoid history writes when `skipHistory === true`;
5. ignore non-`"txt"` entries.

The owner must not:

- consume font size/restyle directly from v3;
- apply shell colour;
- move or create widget shells.

## 5. Style Consequences From `widgetSettings`

Although `widgetText/parameterSetRestoreRequested` consumes only text content, `widgetText` must still expose owner-approved consequence actions used by `widgetSettings` after committed settings restore:

```js
_KDB.api.widgetText.dispatch({
  type: "widgetText/applyFontSize",
  payload: { widgetId, fontSize, source: "writebackSet", runId, skipHistory: true, isParameterSetRestore: true }
});

_KDB.api.widgetText.dispatch({
  type: "widgetText/applyRestyle",
  payload: { widgetId, restyle, source: "writebackSet", runId, skipHistory: true, isParameterSetRestore: true }
});
```

These are consequences of `widgetSettings/parameterSetRestoreBatchRequested`; they are not direct v3 consumption by `widgetText`.

## 6. Failure Modes

| Condition | Behavior |
|---|---|
| missing runtime widget id in `widgetCorrelation` | skip entry with diagnostic |
| stale `runId` | cancel with `WRITEBACK_RESTORE_CANCELLED` |
| owner content apply failure | diagnostic; `writebackSet` decides abort/degrade |

## 7. Acceptance

- Only text content is restored by this owner.
- Style/settings fields are not consumed by `widgetText` directly from v3.
- Font size/restyle may be applied only as widgetSettings consequences with restore metadata.
- `skipHistory: true` prevents text restore history entries.
