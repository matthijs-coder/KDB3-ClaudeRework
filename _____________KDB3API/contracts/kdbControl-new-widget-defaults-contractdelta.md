# kdbControl — defaults for new diagrams and comments

**Status:** Live-verified (PO vastenburg, 2026-09-24, Cognos test groen). Approved earlier the same day after the final pass.
**Datum:** 2026-09-24
**Relatie:** This is the later delta that [\_archive/kdbControl-settings-cp1-contractdelta.md](./_archive/kdbControl-settings-cp1-contractdelta.md) §2b required before `defaultsNew.visualization` and `defaultsNew.comment` may be applied. It does not edit that archive file. It outranks the size source in `dragDrop.md` and the startup colour source in `widgetSettings.md` for **new** `visualization` and `text` widgets only.

[kdbControl-inner-color-contractdelta.md](./kdbControl-inner-color-contractdelta.md), [pageSurface.md](./pageSurface.md), dashboard page size (`canv.w` / `canv.h`), page-background alpha, and kdbControl text contrast stay as they are. Do not apply this delta to those surfaces. `sett.dash.w` / `sett.dash.h` are not a widget-size source.

---

## 1. Purpose

Steuerungspanel defaults for **newly created** diagrams and comments take effect at create time. kdbControl keeps the values. Two existing modules read them. Already placed widgets do not change.

## 2. Ownership

kdbControl remains the only writer of:

```js
settings.defaultsNew.visualization // { width, height, backgroundColor }
settings.defaultsNew.comment       // { width, height, backgroundColor }
```

History key stays `kdbControl_settingsChange`. Writeback keys stay `sett.newwg.vis.w|h|bg` and `sett.newwg.txt.w|h|bg`. A settings change, parameter-set restore, undo, or redo of those keys writes state only. It does not resize or recolor a widget.

| Concern | Owner | Moment |
|---|---|---|
| Input, state, history, writeback | kdbControl | settings commit / restore |
| Width and height of a new widget | dragDrop | once, at drag-start |
| Background of a new widget | widgetSettings | once, inside the existing seed |
| Place the drag payload; paint colour | widgetBase | no policy read |

No new module. No new cognosHost facet. No `_KDB.cognosAPI` or `__getDashboardAPI()` from a feature.

## 3. Read API

Consumers do not read `_KDB.state.kdbControl`. They do not import kdbControl config, reducers, or colour tables.

```js
const snapshot = _KDB.api.kdbControl.getState();
const defaults = isText
  ? readCommentDefaults(snapshot)
  : readVisualizationDefaults(snapshot);
```

`getState()` returns the kdbControl state root. The functions are the published selectors in `kdbControl/state/selectors.js` (AMD import of that file only). `visualization` uses `readVisualizationDefaults`. `text` uses `readCommentDefaults`.

If `api.kdbControl` or `getState` is missing, treat the read as empty strings. Do not throw across the drag or seed boundary.

## 4. Size (dragDrop)

At drag-start, in the existing session builder, replace the local dimension parser and the `_KDB.properties` `*PropObj` branch.

- Read width and height through §3.
- Convert with the existing `_KDB.utils.convertUnitToPx`. Do not copy that parser. Do not import the writeback collector or kdbControl's dimension gate.
- Store px numbers on the drag session. Drop and place keep using that session payload.
- Empty string, `null`, or otherwise unparsable: use `dragDrop/config/defaults.js` — visualization `300×300`, text `300×75`. Do not use `|| 300` (that turns text height into 300). Do not fall back to `*PropObj` for this policy.
- `placeWidgetOnCanvas`, drag-avatar templates, and `publishValidatedDrop` do not read `defaultsNew`. Their existing payload fallbacks stay.

`startDragSession.js` stays ≤ 150 lines by replacing the old parser, not by adding a second copy. A new file is allowed only when that replacement would pass 150, and then only as one named helper in `dragDrop/session/`.

## 5. Colour (widgetSettings)

Inside `buildDefaultDescriptor` in `collectVisualStartupDefaults.js` only. Do not grow `handleSeedDefaults.js`.

- Read `backgroundColor` through §3 (`live` → visualization, `text` → comment).
- A non-empty hex replaces the panel/weiß `optionValue` (the selected default option, not only the fallback branch). Match palette key with the existing `findMatchingOption`. Then the existing `commitColour` → `widgetBase` `setColour` / `applyColour` path. No second paint.
- Empty or whitespace keeps the current weiß / `#ffffff` seed.
- `#00000000` stays transparent through that same path. Do not map it to `none` or to the page colour.
- The existing readable-text step inside `commitColour` stays. Do not add a contrast formula.

`collectVisualStartupDefaults.js` stays ≤ 150 lines.

## 6. Who is unchanged

Launchpad take, undo/redo of a drop, tab duplicate, and parameter-set restore of an existing widget do not read these defaults. Seed still skips when `isHistoryReplay` is set.

Widget kinds other than `visualization` and `text` are out of scope.

Changing the panel while a drag is in flight may size from the drag-start snapshot and colour from the later seed. That split is accepted.

## 7. Out of scope

- Resizing or recoloring widgets that are already on the canvas.
- Dashboard width, height, background, inner Farbe, page alpha, text-contrast rules.
- A shared helper in `core/utils` that chooses visualization vs comment. That would be a third owner.
- Editing the archive CP-1 file.
