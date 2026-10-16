# Contract Delta: hide vis settings maximize / focus unmaximize chrome

> Delta on top of `contracts/widgetVis.md` and `contracts/widgetSettings.md`.
> PO 2026-09-02: vis widgets currently show maximize in two places. Hide the settings-container button (and the focus-panel unmaximize twin) so the user does not see them. Keep click/dispatch wiring. Canvas proxy `.kdb-widget-maximize` remains the visible enter control. Cognos `.collapseSvg.focusMode` (Ausblenden) remains the visible exit control.

---

**Status:** `Implemented` — CSS review PASS 2026-09-02; PO Cognos test **green** 2026-09-02.
**Parent contract:** `contracts/widgetVis.md`
**Also amends:** `contracts/widgetSettings.md` (intent routing note); `contracts/widgetVis-drillthrough-focus-restore-contractdelta.md` (focus panel icon list is DOM, not visual)
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-02
**Reviewed by:** PO vastenburg — OPT-A chosen 2026-09-02 (chat "ok. A"); Cognos green 2026-09-02

---

## 0. Diagnosis (contract vs code)

| Layer | What it says / does |
|---|---|
| `widgetVis.md` §12 | Canvas proxy `.kdb-widget-maximize` is the outside-frame enter control. Sentence **“Settings `.KDB_maximizeButton` stays.”** requires the settings-bar button to remain as a second visible surface. Native `.resizeEdge.topRight` stays in DOM, visually crushed. |
| `widgetVis.md` `maximizeToggle` | Settings-panel clicks dispatch `widgetVis/maximizeToggle`. Observer is shared with native expand. Focus chrome clones settings into `.KDB_focusModeSettingsPanel`. |
| Focus-restore delta | Focus panel list: info / vis / dim / TopN / **unmaximize**. Canvas proxy **hidden** in expand. Ausblenden stays. |
| `widgetSettings.md` | Live maximize control must dispatch `widgetVis/maximizeToggle`. Does not require the icon to be visible. |
| Live code | `controlDefinitions.js` `live[]` includes `{ kind: "maximize", className: "KDB_maximizeButton" }`. Text defs have **no** maximize. `filterFocusPanelIcons` strips maximize from the clone; `appendFocusUnmaximizeButton` adds `.KDB_unmaximizeButton`. Canvas proxy plant + `bindCanvasMaximizeIconClick` unchanged. CSS already hides text-widget maximize and expand-mode canvas proxy. |

**Type:** product chrome delta. Contract and code **agree** on two visible maximize surfaces. This is not a contract-vs-code mismatch and not a broken toggle. The canvas proxy over-supplied a second enter control; PO now hides the settings/focus copies.

---

## 1. Purpose

Vis widgets: the user must **see** only

- **enter:** canvas proxy `.kdb-widget-maximize` (right-outside the widget frame, existing column);
- **exit:** Cognos `.collapseSvg.focusMode` (Ausblenden).

The settings-bar maximize and the focus-panel unmaximize stay in the DOM and keep their existing dispatch paths. They are layout-hidden (`display: none`).

---

## 2. Product (what the user sees)

| Mode | Visible maximize / restore chrome | Hidden (still in DOM) |
|---|---|---|
| Canvas, widget selected | `.kdb-widget-maximize` | `.liveWidget .KDB_widgetSettings .KDB_maximizeButton` |
| Canvas, widget not selected | none (existing `.widget:not(.nodeSelected) > .kdb-widget-maximize` hide) | settings maximize still hidden |
| Focus / expand | Ausblenden only | canvas proxy (already hidden); `.KDB_focusModeSettingsPanel .KDB_unmaximizeButton`; any cloned `.KDB_maximizeButton` |

Unchanged: info / vis / dim / TopN on the focus panel. No PKZ on that panel. Text widgets: still no maximize control in `text[]`; existing `.textWidget .KDB_widgetSettings .KDB_maximizeButton { display: none }` stays.

---

## 3. CSS (only implementation surface)

No new CSS file. No JS change.

`KDB3/css/widgets/widgetSettings.css` — **do not** only append `.KDB_maximizeButton` to the font/text/title hide list. Those kinds are not in `live[]`, so that list never fights the icon SHOW rule. Maximize **is** a header `.dataWidgetIcon`. Beat this existing rule (specificity 0,4,0):

```css
.KDB_widgetSettings .KDB_widgetSettingsHeaderRow .KDB_widgetSettingsIcons > .dataWidgetIcon {
  display: inline-flex;
}
```

Required hide (0,6,0, no `!important`):

```css
.liveWidget .KDB_widgetSettings .KDB_widgetSettingsHeaderRow .KDB_widgetSettingsIcons > .dataWidgetIcon.KDB_maximizeButton {
  display: none;
}
```

Keep the existing `.textWidget .KDB_widgetSettings .KDB_maximizeButton { display: none }` rule.

`KDB3/css/widgets/widgetVis.css` — next to `.expandModeContainer .KDB_focusModeSettingsPanel` rules:

```css
.KDB_focusModeSettingsPanel .KDB_maximizeButton,
.KDB_focusModeSettingsPanel .KDB_unmaximizeButton {
  display: none !important;
}
```

`!important` only on the focus-panel rule so it beats `.expandModeContainer .KDB_focusModeSettingsPanel.KDB_visible` descendants if a generic icon `display` wins. Do not `display: none` native `.resizeEdge.topRight` (already crushed with `visibility` / `pointer-events`; `enterFocusMode` still clicks that node).

Do **not** hide `.kdb-widget-maximize` on the canvas (keep current selected-widget SHOW and expand hide).

PDF capture already hides `.KDB_maximizeButton` / `.KDB_unmaximizeButton` / `.kdb-widget-maximize` under `#main.kdb-pdf-capturing`. No `pdfCapture.css` change.

---

## 4. Forbidden (click / ownership)

Do not edit, fold, or “simplify” these because the icon is hidden:

- `actions/handleMaximizeToggle.js`
- `effects/bindCanvasMaximizeIconClick.js`
- `effects/installCanvasMaximize.js` / place / build / cleanup canvas maximize
- `effects/widgetFocusMode.js` / `enterFocusMode` / `exitFocusMode` / native `.resizeEdge.topRight` click
- `widgetSettings` `controlDefinitions.js`, `intentDispatchMap.js`, `buildDownstreamIntentAction.js`, `dispatchWidgetSettingsIntent.js`
- `buildFocusPanel.js` `appendFocusUnmaximizeButton` / `filterFocusPanelIcons`
- `bindFocusPanelInteractions.js`

Do not remove the live maximize definition. Do not stop appending the focus unmaximize button. Do not `.click()` the hidden settings node from the canvas proxy. Dispatch remains:

- canvas proxy → `widgetVis/maximizeToggle` with `source: "user"`, omit `nextMaximized`;
- settings / focus icon (if reached) → existing `widgetSettings` intent → `widgetVis/maximizeToggle`;
- PDF programmatic → existing `source: "programmatic"`.

---

## 5. Parent patches

| File | Change |
|---|---|
| `widgetVis.md` §12 canvas-proxy bullet | Replace “Settings `.KDB_maximizeButton` stays.” with: Settings `.KDB_maximizeButton` stays in the live settings DOM and dispatch map; CSS-hide it on `.liveWidget` (`contracts/widgetVis-settings-maximize-chrome-hide-contractdelta.md`). |
| `widgetVis.md` `maximizeToggle` step 6 | Add: focus panel still clones allowed settings icons and appends unmaximize; unmaximize (and any cloned maximize) is CSS-hidden. Visible exit is Ausblenden. |
| `widgetSettings.md` maximize routing | Add: for live/vis widgets the maximize control remains a dispatch source but is not user-visible; canvas proxy is the visible enter control (`widgetVis` chrome). |
| Focus-restore delta §2 | Panel still **contains** unmaximize in the DOM; it is not user-visible after this delta. List “info / vis / dim / TopN” as the **visible** set. |

---

## 6. Out of scope

- Focus-mode history / persisted maximize restore
- Changing canvas proxy geometry (`right: -26px`, 25×25)
- Uncrushing `#maximize_32_v7` or native `.resizeEdge.topRight`
- Text-widget maximize (not in `text[]`)
- Removing settings maximize from `controlDefinitions.js`
- New events, state fields, or public API methods

---

## 7. Acceptance

1. Selected vis widget: one visible maximize — the outside-frame canvas proxy. Settings bar has no visible Vollbild icon.
2. Focus mode: no visible unmaximize / Vollbild on `.KDB_focusModeSettingsPanel`. Ausblenden still visible. Info / vis / dim / TopN still visible.
3. Canvas proxy click still enters focus. Ausblenden (and programmatic PDF exit) still exit. Hidden nodes may still dispatch if clicked in DOM tools.
4. Text widgets unchanged. Native crush unchanged. PDF capture hide-set unchanged.

---

## 8. History

| Date | Note |
|---|---|
| 2026-09-02 | PO: hide duplicate settings/focus maximize chrome; keep handlers. Coordinator diagnosis: Type product-delta, not contract-vs-code fail. First CSS pass lost to `.dataWidgetIcon { display: inline-flex }` (0,4,0); hide raised to 0,6,0. PO chose OPT-A after army review (proxy isolation + call-sites + layout/a11y). Cognos host test green. |
