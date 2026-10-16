# Execution Spec: vis toggle panel WP1 polish 2 (geometry)

> Mechanical spec for grok 4.6 army. Architecture: `contracts/widgetSettings-vis-toggle-panel-wp1-contractdelta.md` (Implementing).
> Echo Section A **before** editing. Do not stamp `Implemented`. **Do not change the header string** this wave (`aus / Standard / ein` stays until PO locks `Std.`).

---

**Status:** `Executed` — W-CSS landed 2026-09-12. Header string unchanged. Await PO canvas + `Std.` lock.
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-12
**Executing AI:** grok 4.6 army

---

## Wave

One writer: **W-CSS**. No JS. `options.js` / bind / focus = nobody.

### Allowlist

**May edit:** `KDB3/css/widgets/widgetSettings.css` — the WP1 appended block only (from `WP1 showValues chrome` through end of that block).

**Must not:** shared `.KDB_IconsDropdown` rules ~255–339 (except winning on specificity from the scoped block). No `toggle-button.css`. No JS. No contracts.

---

## Section A

Echo one sentence each: 10 MUST `.mdc` + `cognos-adapter.mdc`; WP1 product spacing / pill-under-header / overflow / knob; this spec.

Also echo: header copy **unchanged**; `Std.` not this wave; no hatch; keep-open already shipped; no wrapper; no `KDB_ToggleButton`.

---

## Section C

Replace the open-layout + knob parts of the WP1 block. Keep S1 invert (gray track + blue inherit knob; Aus/Ein white knob). Keep hide `.textIcon` / radio / row-dash. Keep child `>` selectors.

**Layout (why the screenshot clipped)**

Header was forced into the 66px tracks (`grid-column: 2 / span 3`) → nowrap overflow + shared `overflow-y: auto` → horizontal scrollbar and `aus` / `ein` clipped. Pill was left-aligned under a clipped header.

**Do this**

```
grid-template-columns: max-content auto 22px 22px 22px auto;
grid-template-rows: auto 22px;
padding: 3px;          /* same as .KDB_IconsDropdown */
row-gap: 6px;          /* same as option pad-y */
column-gap: 0;
width: max-content;
overflow: visible;     /* kill scrollbar; three-class .KDB_visible wins vs shared overflow-y:auto */
```

- `::before` — still `content: "Werte anzeigen"`; `grid-column: 1; grid-row: 2; padding-right: 8px;` (option pad-x). `pointer-events: none`.
- `::after` — **keep** `content: "aus / Standard / ein"`; `grid-column: 2 / span 5; grid-row: 1; text-align: center; white-space: nowrap; pointer-events: none;`
- Options: `grid-row: 2`; `:nth-child(1|2|3)` → columns **3 / 4 / 5** (not 2/3/4). The two `auto` columns share leftover header width → pill centered under the header. Phrase stays left of the stack.
- Slabs still 22×22. `line-height: 0; font-size: 0;` (hidden label must not stretch the slab). Capsule first/last.

**Knob**

- 19×19 (slightly larger than live 18).
- Vertical + horizontal center in the slab: `top: 50%; left: 50%; transform: translate(-50%, -50%);` — not `top: 2px` (that left more gap below).
- Inherit knob still switch-on blue. Aus/Ein still `#fff`.
- `pointer-events: none`.

**Forbidden**

- `overflow: hidden`
- Editing shared `overflow-y: auto` / `padding: 3px` on all dropdowns
- Changing `::after` content to `Std.`
- Wrapper / `display: contents` / `KDB_ToggleButton`
- Re-introducing dashed / `#eee` / hatch / `minmax(22px, max-content)` columns

---

## Section D

- No scrollbar. Full `aus / Standard / ein` visible.
- Pill centered under that header. Phrase left, 8px gap.
- Pad 3px / row-gap 6px (dimension tokens).
- Knob 19px, optically centered in the track.
- Header string unchanged.

Captain does not certify Cognos.
