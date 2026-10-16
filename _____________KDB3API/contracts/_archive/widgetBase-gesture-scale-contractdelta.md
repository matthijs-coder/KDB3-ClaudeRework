# Contract Delta: armed move and resize follow the pointer under canvas scale

> Delta on `contracts/widgetBase.md` (armed move § around line 400, armed resize § around line 432, acceptance 23, approval log 2026-09-30).
> Contract-only until this delta is approved. No production code is approved by a draft.

---

**Status:** `Implemented` (PO vastenburg, 2026-10-13). Contract review green, then code review green.
**Owner:** `widgetBase` (gesture). Shared read: `core/utils/readElementScale`. Drop behavior stays in `dragDrop`.
**Authoring AI:** Cursor coordinator, 2026-10-13

---

## 1. Problem

With a canvas CSS transform, `s = getBoundingClientRect().width / offsetWidth` is not 1. Armed move writes jQuery UI viewport math into `style.left` / `style.top` without dividing by `s`. The widget jumps away from the pointer at gesture start (`startLeft * s + (s - 1)` when the dropbox border is 1px, margin 0, scroll 0). After that, each mouse pixel adds one layout pixel, so the pointer and the widget separate. At `s < 1` a drag that stops on the visual edge lands short of the client edge. At `s > 1` the client edge is hit before the pointer reaches the visual edge. At `s = 1` this error is 0.

Armed resize has the same undivided mouse delta on width and height. East, south, and southeast keep `x` and `y`, so the size error shows up as the corner running ahead of or behind the pointer.

A second, smaller jump is out of scope here: a widget parked on the dropbox border-box (`offsetWidth`) is about 2px outside the resize client-box (1px border each side, padding 0, content-box). The first resize shrinks width and height onto `clientWidth` / `clientHeight`. That remains.

jQuery UI 1.13 has no scale option. `containment`, `grid`, `helper`, `cursorAt`, and `appendTo` do not stop the unscaled write.

## 2. What stays

- The legal gesture box stays the dropbox `clientWidth` / `clientHeight` in layout CSS pixels, remeasured on every event. jQuery `containment` stays off. Right and bottom edges may sit on the inner edges of that box.
- East, south, and southeast change width and/or height only. `x` and `y` stay at the gesture-start layout. North and northeast may change `y` and keep `x`. West and southwest may change `x` and keep `y`. Northwest may change both. The axis is the resizable instance `axis` string, not `ui.axis`. A missing axis is not north.
- Minimum size stays in the widgetBase clamp: text 100×50, live and visualization 300×300.
- Drop still divides by the same `s`. History replay and take-from-launchpad still do not use the gesture clamp. `applyWidgetBaseLayoutHistoryReplay.js` dispatches the stored layout frame only.
- No CSS change to the dropbox border, padding, or outline. No new `_KDB` namespace. No new service. `readElementScale` is not registered on `_KDB.utils`.

## 3. Classification

**(b) Contract change.** `widgetBase.md` (PO vastenburg, 2026-09-30) approves the gap: the move/resize clamp does not divide by canvas scale, and Cognos zoom other than 1 stays a known gap. Closing that gap for armed gestures is a contract change, not a bugfix inside the current sentence.

The 2px border-box inset is not a breach of the client-box rule. Resize already enforces that rule. This delta does not move the legal edge to `offsetWidth`.

## 4. Design

### 4.1 Scale read

One pure function, `KDB3/js/core/utils/readElementScale.js`. Input: an element. Output: `{ scaleX, scaleY }`.

For each axis: `getBoundingClientRect()` length divided by `offsetWidth` or `offsetHeight`. If the element is missing, the offset is not greater than 0, or the ratio is not finite and greater than 0, that axis is `1`. This is the formula in `resolveAvatarScale` (`startDragSession.js`).

`startDragSession.js` deletes `resolveAvatarScale` and imports this function. Drop math in `placeWidgetOnCanvas.js` does not change.

Do not add the function to `core/utils/__orchestratorUtils.js`. That factory already has 10 AMD imports. Callers import the file directly. `widgetBase` does not import `startDragSession.js` or any other dragDrop internal.

`s` is measured once, at gesture start, on the dropbox element (`shell.parentElement`). It is not measured again on later move or resize events. A scale that changes during the gesture stays the start value, same as jQuery's cached offsets.

### 4.2 Pointer delta

Do not invert jQuery's `left = startLeft * s + (s - 1)`. That constant assumes a 1px border, margin 0, and scroll 0.

`applyScaledPointerDelta` is the only function that file returns, and it owns the gesture-start storage. The existing `fromLayout` assignment in the start callback of `widgetResizeInteraction.js` and of `widgetMoveDraggableInit.js` calls it with the start event and stores only the layout it returns. Those callbacks gain no new line. On that call the effect reads the layout, `pageX`, `pageY`, and `readElementScale` on `shell.parentElement`. The interaction files do not record the pointer or the scale themselves, and they do not import `readElementScale`.

The start callback runs first. After it returns, jQuery UI 1.13.1 `_mouseDrag(event, true)` writes `style.left` and `style.top` from `_generatePosition` and skips the drag callback. The drag callback runs on a later mousemove. On move start only, the effect wraps the draggable instance `_mouseDrag`. The wrapper calls the original method. When the second argument is `true`, it then sets `style.left`, `style.top`, and `this.position` back to the gesture-start layout. A real drag leaves the scaled `ui.position` in place. No microtask. Resize `_mouseStart` does not call `_mouseDrag`, so resize does not install that wrapper.

On each later event, `dx = pageX - startPageX`, `dy = pageY - startPageY`. Do not read `ui.position` or `ui.size` as input. Mutate the existing `ui.position` and `ui.size` objects. Do not replace them.

**Move.** `x = startX + dx / scaleX`, `y = startY + dy / scaleY`. The effect passes the shell's current `offsetWidth` and `offsetHeight` into the clamp, as `applyMoveDragClamp` does now, and writes the returned `x` and `y` onto the existing `ui.position`. The plain clamp does not update `ui` itself. Shell width and height stay the start style. The stop handler still calls `readWidgetLayoutFromDom` on `style` after jQuery has written `ui.position` to `style.left` and `style.top`. `oneShot` still reads the mode at stop time and then calls `disableMoveMode` with `deferUntilStop: false`.

**Resize.** Only the axes in the resizable instance `axis` string change, using `dx / scaleX` and `dy / scaleY`:

| Axis | `x` | `y` | width | height |
|---|---|---|---|---|
| `e` | start | start | start + dx/sx | start |
| `s` | start | start | start | start + dy/sy |
| `se` | start | start | start + dx/sx | start + dy/sy |
| `w` | start + dx/sx | start | start − dx/sx | start |
| `sw` | start + dx/sx | start | start − dx/sx | start + dy/sy |
| `n` | start | start + dy/sy | start | start − dy/sy |
| `ne` | start | start + dy/sy | start + dx/sx | start − dy/sy |
| `nw` | start + dx/sx | start + dy/sy | start − dx/sx | start − dy/sy |

Before the minimum clamp, west and southwest keep the east edge, and north and northeast keep the south edge. The existing west/north overshoot in D5 still applies after that clamp: it sets width or height to the minimum without moving `x` or `y` back, so the opposite edge shifts and the shell can leave the client box. That is not a failure of this delta. At `s = 1`, `delta / s` is the delta.

The effect then calls `clampShellToDropbox` with `mode: "resizeUi"`, `$widget`, `origin`, and the widget minimums (100×50 or 300×300). The clamp reads width and height from that same `ui.size`, sets `x` and `y` to the origin for east, south, and southeast, and writes only the clamped size back onto that object. It does not load jQuery's unscaled size again. The second `_applyChanges` keeps that size, because `this.size` is the same object.

The dropbox page is not a scroll parent (`canvas.css` sets no overflow on `[kdb_dropbox]` / `.page.pagegenericPage`). Do not add a scroll term.

### 4.3 jQuery minimum must not gate the callback

Resizable `_mouseDrag` runs `_respectSize` before the user callback, and skips the callback when the props object is empty. With `minWidth` / `minHeight` set to the widget minimum, a scale above 1 pins the size early. Dragging back out of that band leaves props empty, so the callback never applies the scaled size.

Set jQuery `minWidth` and `minHeight` to `0` both where `.resizable({...})` is created and where `resizable("option", "minWidth"|"minHeight")` is applied on enable. The widgetBase clamp remains the only minimum (100×50 or 300×300). jQuery's default minimum of 10 must not apply.

### 4.4 Files

| File | Change |
|---|---|
| `KDB3/js/core/utils/readElementScale.js` | New. One returned function. |
| `KDB3/js/dashboard/canvas/dragDrop/session/startDragSession.js` | Replace the private scale function with the import. Drop behavior unchanged. |
| `KDB3/js/dashboard/widgets/widgetBase/effects/applyScaledPointerDelta.js` | New. One returned function. Owns start storage, the move `_mouseDrag` wrapper, the scaled `ui` write, and the clamp call. |
| `KDB3/js/dashboard/widgets/widgetBase/effects/widgetMoveDraggableInit.js` | The existing `fromLayout` assignment calls the effect and stores only the returned layout. The drag callback calls the same function. |
| `KDB3/js/dashboard/widgets/widgetBase/effects/widgetResizeInteraction.js` | Swap the clamp import for the effect. The existing `fromLayout` assignment calls it. Set both jQuery minimums to 0. No new line in the start callback. |
| `KDB3/js/dashboard/widgets/widgetBase/effects/clampShellToDropbox.js` | No scale. Still `f(rect, box)`. |

`widgetResizeInteraction.js` is at the 150-line hard limit and has 4 imports. The clamp import is replaced, not added. The file stays at or under 150 lines and at 4 imports. `startDragSession.js` may go from 8 to 9 imports (smell, under the restructure line of 10). `__orchestratorUtils.js` is not touched.

### 4.5 Text to land in `widgetBase.md` when this delta is implemented

Armed-move sentence that today says the clamp does not divide by canvas scale, and that Cognos zoom other than 1 is a known gap, becomes:

> Armed move converts the pointer delta into layout pixels before the client-box clamp. `scaleX` / `scaleY` are `readElementScale` on the dropbox, measured once at gesture start. `x` and `y` are the gesture-start layout plus `pageX` / `pageY` delta divided by those scales. Width and height stay at the gesture start. The clamp then runs as today and still does not divide. At scale 1 the division changes nothing. Drop still divides by the same scale. History replay and take-from-launchpad do not use this gesture path.

Armed-resize sentence that today says the same Cognos-zoom gap applies, becomes:

> Armed resize converts the pointer delta into layout pixels on the active axes only, then runs the same client-box clamp. East, south, and southeast still do not change `x` or `y`. jQuery `minWidth` and `minHeight` are 0 so `_respectSize` cannot skip the resize callback. The widgetBase minimum stays in the clamp. The 2px inset between drop's border-box and this client-box is unchanged.

Acceptance 23 gains: at canvas scale other than 1, armed move keeps the pointer on the widget and can place the shell on the client edge; armed resize changes size by the scaled delta. The 2px border-box inset is explicitly not part of item 23.

Approval-log row: date 2026-10-13, status `Gesture scale`, approver PO vastenburg, note that the 2026-09-30 zoom gap is closed for armed move and resize only.

## 5. Decisions

- **D1 Scale.** Close the zoom gap for armed move and resize. Do not close it by changing CSS, and do not teach the clamp to divide.
- **D2 Formula.** Pointer delta from the gesture-start layout, divided by `s` measured once. No inverse of jQuery's border term. No per-event remeasure. No scroll term.
- **D3 jQuery min.** `minWidth` and `minHeight` on the resizable are 0. The clamp keeps the real minimum.
- **D4 Placement.** New effect file because `widgetResizeInteraction.js` cannot grow. Scale read is a core util imported by dragDrop and by that effect. Not a service, not `_KDB.utils`.
- **D5 Out of scope.** The 2px client-box inset. Dropbox border, padding, outline, and PDF. West/north minimum leaving the shell outside the client box after the clamp (already true in `clampShellToDropbox`). History, drop, and take-from-launchpad.

## 6. Out of scope

CSS on `.page.pagegenericPage` or `[kdb_dropbox]`. Making drop clamp to `clientWidth`. Making resize clamp to `offsetWidth`. Fixing the west/north minimum overshoot. `style.zoom` (it does not change this `s` when rect and offset scale together). Autoscroll. A microtask that restores `left` / `top` before paint.

## 7. Acceptance

1. Scale 1: starting a move does not move the shell. During the drag the shell stays with the pointer. The shell can sit on the dropbox client edge.
2. Scale other than 1, from a CSS transform on an ancestor of the dropbox: the shell does not jump to `startLeft * s` at gesture start. During the drag it follows the pointer visually one-to-one. The client edge is reachable when the pointer reaches the visual edge of that edge.
3. East, south, and southeast resize change width and/or height by the scaled pointer delta and leave `x` and `y` at the gesture-start layout.
4. Before the minimum clamp, west, north, and the four corners move only the edges named in the §4.2 table. After the clamp hits the minimum, the existing west/north overshoot may still shift the opposite edge. That overshoot is not a failure of this delta.
5. With scale 2, east handle, start width 200, minimum 100: dragging to a page delta of −200 and then back to −150 yields width 125, not a stuck 100. jQuery `minWidth` and `minHeight` are 0. The clamp still stops text at 100×50 and live/visualization at 300×300.
6. Scale 1, widget parked on the border-box: the first east/south resize may still shrink about 2px per overflowing axis. That is not a failure of this delta.
7. Drop placement, history replay, and take-from-launchpad do not call `applyScaledPointerDelta` or `readElementScale` except drop's existing use of the shared read. Replay does not divide a stored layout by scale a second time.
8. `readElementScale` matches the old `resolveAvatarScale` fallback. `__orchestratorUtils.js` does not import it.
9. `widgetResizeInteraction.js` stays at or under 150 lines and at 4 AMD imports. `clampShellToDropbox.js` does not read scale.
10. No new top-level `_KDB` key and no new service.
