# Contract Delta: iterator relevant types and Standard = on

> Reopens the WP2 iterator lock. Zoomleiste is unchanged. PO vastenburg 2026-09-28: Cognos offers `widget.iterator` on Pie, Line, StackedBar, and StackedColumn.

---

**Status:** `Approved` — 2026-09-28 PO vastenburg. Host confirmed for Line and both stacked types.  
**Type:** `feature-module contract delta`  
**Authoring AI:** Cursor Grok 4.7 coordinator, 2026-09-28  
**Parents:** `contracts/widgetSettings-vis-toggle-panel-wp2-contractdelta.md` (§3, §5 family-gate, §6 allowlist)

---

## 1. Purpose

The toggle-cluster icon no longer means only “Werte anzeigen”. Iterator is a relevant control on Pie, Line, StackedBar, and StackedColumn. For those types, Standard (unset) turns the host iterator on. Prognose, List, and TopN stay without iterator chrome.

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | Icon tooltip in `controlDefinitions.js` `showValues.title` is **`Zusatzoptionen`**. Toolbar glyph is **`KDB3/images/adjust.svg`**: two horizontal sliders, top knob right (an), bottom knob left (uit), 32×32 filled, same family as `grouping.svg`. Not glyph `99` / `showValues.svg`. The nest row phrase stays **`Werte anzeigen`** (CSS `::before`). Not `_KDB.config.labels.de`. |
| 2 | Iterator chrome (keep-DOM, CSS on `data-kdb-vis-type`, widget **and** focus panel in the same rule): show for **pie, line, stackedbar, stackedcolumn**. Hide for **prognose**. List keeps the whole icon hidden. |
| 3 | Host key remains **`widget.iterator`**. `ITERATOR_HOST_BY_TYPE` adds **Line, StackedBar, StackedColumn** next to Pie. Do not add Prognose, List, or TopN. Do not put the key in `definitions.js`. |
| 4 | Unset iterator stays **absent** (Family A). Chrome still marks **Standard** (`inherit`). Do **not** seed `true`. Do **not** add iterator to startup kinds. |
| 5 | Effective host value when the field is absent: **true** for Pie, Line, StackedBar, StackedColumn; **false** for every other type. Explicit `true` / `false` always win (`typeof === "boolean"`). Aus stays off. |
| 6 | That effective default applies on inherit-apply **and** on `stampIteratorZoomHosts`. Zoom unset stays **false**. Do not change the zoom allowlist. |
| 7 | Omitted `iter` on old parameter sets stays absent and therefore becomes host-on for the four types on the next overlay. That is the visualization-specific standard. |
| 8 | KEEP-all-vis of an explicit boolean is unchanged. Switching vis type while unset picks up the new type’s effective default. |
| 9 | Showing Iterator on Line / Stacked* next to Zoomleiste uses two grid rows in `widgetSettings.css`: Iterator phrase+host row 3, Zoomleiste phrase+host row 4. Prognose remounts Zoomleiste to row 3. Pie hides Zoom. Do not pin both extras to row 3. No JS, no new row wrapper. |

---

## 3. Files

| File | Action |
|---|---|
| `widgetSettings/config/controlDefinitions.js` | Title `Zusatzoptionen`. Icon file `adjust.svg`. |
| `css/widgets/widgetSettings.css` | Drop line / stackedbar / stackedcolumn from the iterator hide rule. Leave prognose. Both prefixes. Split Iterator / Zoomleiste onto grid rows 3 and 4; Prognose remounts Zoomleiste to row 3 (lock 9). |
| `widgetVis/effects/applyIteratorZoom.js` | Host map + effective boolean. Stay ≤150 lines. |
| `widgetSettings-vis-toggle-panel-wp2-contractdelta.md` | Operative rows amended to match this delta. |

**Must not:** seed helpers, `definitions.js`, showValues overlay, zoom maps, a new visibility engine, `labels.de`.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-28 | Draft → Approved | PO vastenburg | Cognos `widget.iterator` on Line and both stacked types. Standard = on for Pie, Line, StackedBar, StackedColumn. No seed. |
| 2026-09-28 | Approved clarification | PO vastenburg | Line/Stacked Iterator and Zoomleiste are separate rows (3 and 4). Prognose Zoomleiste remounts to row 3. |
| 2026-09-28 | Approved | PO vastenburg | Toolbar icon `adjust.svg`: two sliders, top knob right, bottom knob left. |
