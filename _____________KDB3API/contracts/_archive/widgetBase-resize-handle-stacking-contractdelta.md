# Contract Delta: widgetBase resize handles above open settings bar

> PO vastenburg 2026-09-02: adapted **A**, **not C**. While resize is armed, KDB jQuery UI handles must paint above `.KDB_widgetSettings.KDB_visible`. Do not raise Cognos `.resizeEdge`.

---

**Status:** `Implemented` — PO Cognos **green** 2026-09-02 (“werkt prima”). Dual review: mechanical PASS; semantic YELLOW on dropdown stacking (documented; accepted).
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-02
**Reviewed by:** PO vastenburg — adapted A 2026-09-02; Cognos green 2026-09-02
**Related rules:** `dom.mdc`, `feature-structure.mdc`, `naming.mdc`

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/widgetBase.md` | `resizeToggle` handle chrome stacking while armed |
| `contracts/widgetSettings.md` | Open panel stays z-index 9999; does not own handle stacking |

---

## 0. Diagnosis

| Layer | Fact |
|---|---|
| Settings open | `.KDB_widgetSettings.KDB_visible` is `position:absolute; top:0; z-index:9999; transform: translateY(-30px)` inside `.widgetContentWrapper`. Covers the widget top edge. |
| KDB resize | `widgetBase/resizeToggle` enables jQuery UI on the shell. Handles are `.ui-resizable-handle` (n/e/s/w/ne/se/sw/nw), CSS `z-index:1000`, appended as **direct children of `.widget`**. |
| jQuery UI | Inline `z-index:90` on each handle (option default). Beats stylesheet `1000` without `!important`. |
| Cognos | `.resizeEdge.resizeEdgeBorder.borderTop` is host selection chrome. KDB does not create it. `.resizeEdge.topRight` stays crushed maximize hit-target. |
| Wrapper | `.widgetContentWrapper` has no z-index/transform. Settings 9999 and handles share the widget stacking context. Settings wins. |

**Type:** product chrome stacking. Not a contract-vs-code mismatch on API. Handles were contracted without a z-index vs the settings bar.

---

## 1. Purpose

Top KDB resize squares (middle-top, top-left, top-right) must be fully visible and hittable while the settings bar is open. Side and bottom handles stay as today.

---

## 2. Product

| Surface | Stacking |
|---|---|
| Armed KDB handles `.widget.resizable-div.resizable-active .ui-resizable-handle` | **Above** open settings bar |
| Open settings bar `.KDB_widgetSettings.KDB_visible` | Unchanged **9999** |
| Settings dropdowns `.KDB_IconsDropdown` | Unchanged **10050** / **10051** inside the settings stacking context (parent `9999` + `transform`). They cannot paint above widget-shell handles at **10020**. Numeric `10050 > 10020` does not escape that context. |
| Cognos `.resizeEdge` / `.resizeEdgeBorder` | **Unchanged** (out of this WP) |
| Native `.resizeEdge.topRight` | Crush unchanged. Do not uncrush, do not `display:none` |

No JS. No new CSS file. No widgetBase.css. Handle rules stay in `KDB3/css/widgets/widgetVis.css` (existing home).

---

## 3. CSS (only implementation surface)

In the **existing** grouped rule in `widgetVis.css` (`.widget` / `.liveWidget` / `.textWidget` + `.resizable-div.resizable-active .ui-resizable-handle`):

Change `z-index: 1000;` to:

```css
z-index: 10020 !important;
```

`!important` is required to beat jQuery UI inline `zIndex: 90`. Numeric **10020** is above the settings stacking context **9999**. Dropdown **10050** is a descendant of that context and therefore still paints **under** the handles if they overlap. That is accepted for adapted A (handles must win vs the bar). Do not portal dropdowns in this WP.

Do not add a second rule. Do not change width/height/position/`top`. Do not edit `widgetSettings.css`, `pdfCapture.css`, `jquery-ui.css`, or `widgetResizeInteraction.js`.

---

## 4. Out of scope

- Raising `.resizeEdge` / `.resizeEdgeBorder` (proposal C).
- Lowering settings z-index; collapsing the panel during resize; `pointer-events: none` on the bar.
- Changing resizable option `zIndex` in JS.
- Move-handle stacking (already 9999).
- PDF hide-set, leftover-hide, maximize crush, focus-mode panel.

---

## 5. Acceptance

1. Resize armed + settings open: n / nw / ne squares fully visible above the grey bar; click-drag works.
2. e / s / w / se / sw unchanged except stacking (same 10020).
3. Opening vis/dim/TopN while resize is armed: menus stay in the settings stacking context. If an 8px handle overlaps a menu, the handle wins. Not a defect against adapted A.
4. Cognos `.resizeEdge*` and crushed `.resizeEdge.topRight` unchanged.
5. No JS diff.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | Draft → Approved | PO vastenburg | Adapted A (`10020 !important` on KDB handles). No C. |
| 2026-09-02 | Approved → Implemented | PO vastenburg | Cognos green. Dropdown stacking YELLOW left as documented. |
