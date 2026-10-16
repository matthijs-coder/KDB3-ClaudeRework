# Contract Delta: settings dropdown closes outside the flyout

> Delta on `contracts/widgetSettings.md` (panel/gear/dropdown UI lifecycle) and the undefined “outside click” sentences in `contracts/widgetSettings-vis-toggle-panel-wp1-contractdelta.md` G5 and `contracts/widgetSettings-vis-toggle-panel-wp2-contractdelta.md`.
> Plan approval 2026-10-15 is CP-1. Production code follows this delta.

---

**Status:** `Implemented` (PO vastenburg, Cognos test green 2026-10-15).
**Owner:** `widgetSettings` (canvas bind + outside-pointer helper). Focus twin: `widgetVis` `bindFocusPanelInteractions` only.
**Type:** `feature module contract delta`
**Authoring AI:** Cursor coordinator, 2026-10-15
**Parents this delta amends:** `widgetSettings.md`; WP1 G5 / WP2 “outside click closes”
**Related:** `widgetSettings-value-caption-contractdelta.md` (keep-open set already includes `valueCaption`; closer files stay frozen)

---

## 1. Problem

WP1 / WP2 already say a settings flyout closes on outside click. They never define “outside”. Live `onDocumentPointerDown` keeps the flyout open when `panel.contains(target)` or `#widgetId.contains(target)`. The panel is mounted inside that shell, so a chart, header, text-body, or empty-panel click never closes. The focus/maximize clone has no document closer.

Keep-open on `showValues` / `iterator` / `zoom` / `valueCaption` option pick already matches. That is not this hole.

## 2. What stays

- Keep-open kinds: option pick does not close `showValues` / `iterator` / `zoom` / `valueCaption`. Other kinds still close-on-pick.
- Other-icon toggle, gear, and action icons without a dropdown: unchanged (close, then toggle or dispatch).
- Panel icon path bind ~70 / focus ~38: inner-nest empty pixels still toggle the outer flyout shut (WP2 residual). Do not change that test.
- `closeVisibleDropdowns.js`, focus `domQueries.js`, and `panelDropdownUi.js` stay frozen for this wave.
- `isInsideWidgetShell` remains the gate for `disableMoveResizeModes` only. kdb edit-mode skip stays.
- No stay-open helper for all dropdowns. No global document listener. No new service. No new `_KDB` namespace.

## 3. Classification

**(b) Contract change.** “Outside” is now: a `pointerdown` whose target is not inside a `.KDB_IconsDropdown` of that panel and is not the owning icon of a **visible** dropdown of that panel. Widget body and empty panel chrome are outside. That sentence is not in the parent or in WP1/WP2.

## 4. Design

Document `pointerdown` **capture** stays. Inside (keep open) is only:

1. `target.closest(".KDB_IconsDropdown")` contained by that panel (nested iterator / zoom / valueCaption hosts count; they need not carry `KDB_visible`), or
2. `target.closest(iconSelector)` contained by that panel, when that icon’s first `.KDB_IconsDropdown` is `KDB_visible`.

Canvas icon selector: `settingsIconChildSelector`. Focus icon selector: `focusPanelPointerIconSelector`.

Everything else closes that panel’s visible flyouts: chart, header, text body, empty panel chrome, info/title, other widget, canvas. Same law for vis and text, canvas and the focus clone.

After a canvas close, `disableMoveResizeModes` runs only when the target is **not** inside the widget shell. Focus does not call `disableMoveResizeModes`.

The trigger-icon exemption is required because the document listener is capture: without it, a same-icon click closes first and `toggleDropdown` reopens. Do not exempt every settings icon.

### 4.1 Files

| File | Change |
|---|---|
| `widgetSettings/view/panelOutsidePointerBehavior.js` | Add `shouldKeepDropdownsOpen(panel, target, iconSelector)`. No new AMD file. |
| `widgetSettings/view/bindWidgetSettingsPanel.js` | `onDocumentPointerDown`: keep open via the helper; then `closeDropdowns`; `disableMoveResizeModes` only if not `isInsideWidgetShell`. Stay ≤220. Do not edit the option keep-open kind-set or the inner-nest `=== dropdown` test. |
| `widgetVis/effects/focusMode/bindFocusPanelInteractions.js` | Local document capture closer; close with `hidePanelDropdowns`; dispose both listeners. Do not call `bindWidgetSettingsPanel`. Do not use `panelRootAttr`, `getElementById`, or `abortControllers["panel:"+id]`. |

### 4.2 Text to land in `widgetSettings.md` when this delta is implemented

After the panel/gear/dropdown lifecycle sentence, add:

> A settings dropdown stays open only while the pointer is inside a `.KDB_IconsDropdown` of that panel or on the owning icon of a visible dropdown of that panel. A pointerdown anywhere else — widget body, empty panel chrome, another widget, or the document — closes that panel’s visible flyouts. Keep-open kinds still stay open on option pick. `isInsideWidgetShell` is not a dismiss test; it only gates `disableMoveResizeModes`. The focus clone uses the same dismiss hit-test and its own document listener.

## 5. Decisions

- **D1 Hit-test.** Inside = open flyout subtree ∪ trigger icon of a visible flyout. Not the panel. Not the widget shell.
- **D2 Capture + icon exemption.** Keep document capture. Exempt only the owning visible-dropdown icon so same-icon toggle still closes.
- **D3 Focus.** Local closer and dispose. Never bind the canvas panel binder onto the clone.
- **D4 Extract.** Predicate lives on the existing outside-pointer helper. Not a service.
- **D5 Residuals.** Inner-nest empty-pixel toggle. Cognos iframe interior (parent sees only the iframe node). Bind 150-line split.

## 6. Acceptance

1. Vis Zusatzoptionen open: Aus / Std / Ein keeps it open. Chart, header, empty panel, or another widget closes it.
2. Same icon while open: closes. No close-then-reopen flicker.
3. Other icon while one is open: previous closes, the other opens.
4. Text fontSize / colour / layout open: text-body click closes. Option pick still closes (not keep-open).
5. Focus/maximize: pointerdown outside the clone flyout closes the clone dropdowns. Canvas `panel:` abort controller is not aborted.
6. Move/resize: a click on the same widget does not disarm. A click outside the widget still disarms (kdb edit mode unchanged).
7. `closeVisibleDropdowns.js` and focus `domQueries.js` are not edited. Bind stays ≤220.

## 7. Out of scope

Inner-nest empty-pixel toggle. Timers extract to meet the 150-line bind hard limit. A global document listener. Iframe-interior close. Kind-set changes. PDF capture of an already-open flyout.

## 8. Approval log

| Date | Status | Approver | Note |
|---|---|---|---|
| 2026-10-15 | CP-1 | PO vastenburg | Plan “Settings-dropdown sluit buiten de flyout” approved; implement O6. |
| 2026-10-15 | Implemented | Coordinator + review | Code matches O6. Parent purpose sentence text-synced. |
| 2026-10-15 | Test green | PO vastenburg | Live Cognos: dismiss works. |
