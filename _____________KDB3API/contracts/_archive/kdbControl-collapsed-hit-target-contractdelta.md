# Contract Delta: collapsed kdbControl does not keep the host rectangle as a hit target

> Delta on `contracts/kdbControl.md` (collapse geometry: zero-width content column + 30px strip; classes `kdb-control_collapsed` / `kdb-control_content_hidden`). Does not change D3 in `contracts/widgetBase-parameterSetRestore-dropboxTarget-contractdelta.md` (no z-index change) or `contracts/kdbControl-tabFollow-contractdelta.md` (the host still moves).
> CSS from §4 is in `shell.css`. No other production change is approved by this document.

---

**Status:** `Approved` — code in tree 2026-10-13, pending PO live test
**Owner:** `kdbControl` (CSS on the shell; the host rule targets the Cognos widget that already wraps the shell)
**Authoring AI:** Cursor coordinator, 2026-10-13
**Related:** [kdbControl.md](../kdbControl.md), [kdbControl-framework-visual-parity-mapping.md](./kdbControl-framework-visual-parity-mapping.md), [widgetBase-parameterSetRestore-dropboxTarget-contractdelta.md](./widgetBase-parameterSetRestore-dropboxTarget-contractdelta.md) §4 D3

---

## 1. Problem (live, 2026-10-13)

A widget moved left until it lies even partly behind the open control cannot be edited after the control is collapsed. The menu is gone. Clicks at that height still miss the widget.

## 2. Mechanism

`#kdb-control-root` stays `width: 100%`, `height: 100%`, `position: relative`, `z-index: 9999`, `background: transparent` (`KDB3/css/kdb-control/shell.css`). Collapse only sets `grid-template-columns: 0 30px` on that root and hides `#kdb-control-content` (`display: none` via `.kdb-control_content_hidden` in `base.css`, plus `pointer-events: none` on the content rule in `shell.css`). `pointer-events` is not set on the root or on `.widget.KDB3Widget`. Transparent background does not open a hole. The root border box still hit-tests.

The host `.widget.KDB3Widget` is a sibling of user `.widget` shells in the tab page. Tab follow appends that host last (`followActiveTab.js`). It has no `z-index`, `opacity`, `transform`, or `filter` in KDB CSS, so it does not trap the root's `z-index: 9999`.

Two layers, both required:

- A selected shell (`.widget.nodeSelected` at `z-index: 2` in `widgetVis.css`) loses to the root at `9999`.
- An unselected shell is stack level 0. Skipping the root still lands on the host, because the host is the later sibling and still fills the Cognos widget box.

`pointer-events` inherits. `none` on an ancestor removes descendants unless they set `auto`.

The launchpad is not in the host. It is parked on `document.body` (`#KDB_HideSpot`). Expanded controls live in `#kdb-control-content`, which collapse already removes from hit-testing.

## 3. Classification

**(b) Contract gap.** The collapse rules require a zero-width content column, a 30px strip, and the two classes. They never say the empty host rectangle must stop taking clicks. Code matches that geometry. D3 forbids solving this by changing z-index. The move clamp allows `x` at the dropbox edge, so overlap is legal.

Not (a): the classes, the grid, and the content hide match the written collapse rules.

## 4. Design

One file: `KDB3/css/kdb-control/shell.css`. No JS. No new class. No new file. No z-index, width, or height change.

1. On the existing collapsed-root rule (`#kdb-control-root.kdb-control.kdb-control_collapsed`), add `pointer-events: none`. Keep `grid-template-columns: 0 30px`.
2. Add one host rule:

```css
.widget.KDB3Widget:has(> #kdb-control-root.kdb-control_collapsed) {
  pointer-events: none;
}
```

The child combinator matches `placeControlShell.js`: the shell is appended onto `.KDB3Widget` and tab follow moves the host, not the shell. `:has` is already used in `KDB3/css` (including `kdb-control/panels.css`). Do not also select `#kdb3widget`. That id is not the live host.

3. On the existing arrow rule (`#kdb-control-arrow.kdb-control__collapse-arrow`), add `pointer-events: auto`. The arrow inherits `none` from the collapsed root and from the host. It is the only control that must stay clickable while collapsed. Keyboard `Enter` / `Space` on the focused arrow do not depend on `pointer-events`; the `auto` declaration is what keeps the click.

`pointer-events: none` on the root alone is not enough. The host box would still take unselected widgets. `pointer-events: none` on the host alone passes clicks through only because the root inherits it when that rule matches. Do not skip either declaration. The root declaration is the fallback, not a second mechanism: it keeps a selected widget passing through if the host rule does not match.

Expanded state: the host selector requires `kdb-control_collapsed`. When that class is absent, host and root hit-testing stay as they are today. Content keeps its existing hide rules. Do not add another collapsed selector for the content.

## 5. Decisions

- **Pass-through:** while collapsed, the host rectangle and the root do not hit-test, except the arrow.
- **No z-index:** D3 stands. Do not raise `.widget` and do not lower the root.
- **No host resize:** the Cognos widget box stays. The grid stays `0 30px`.
- **No second collapsed flag:** do not toggle a class on `mountTargetEl`. That ref may be the render parent when `.KDB3Widget` is missing, and the class would copy `kdb-control_collapsed`.
- **No resize-edge exception:** do not set `pointer-events: auto` on `.resizeEdge`. Consumer editing does not need it. Those edges inherit `none` while collapsed.

## 6. Text sync at Implemented

In `kdbControl.md`, directly under the intro paragraph (after "Skeleton-only iteration…"), add one sentence:

`Collapsed hit target: while `kdb-control_collapsed` is on `#kdb-control-root`, `.widget.KDB3Widget` and that root do not hit-test except `#kdb-control-arrow`. See kdbControl-collapsed-hit-target-contractdelta.md.`

Do not rewrite the visual-parity geometry rows.

## 7. Out of scope

- z-index, move/resize clamp, tab-follow reparent, launchpad placement.
- Shrinking `.KDB3Widget` or moving the 30px strip.
- A host class in `syncFrameworkPanelChrome.js`.
- `#kdb3widget` in the selector.
- Restoring Cognos `.resizeEdge` hits while collapsed.
- Share-read-only: `#kdb-control-root` is already `display: none` there. An expanded control in that mode can still leave the host box as a hit target. Pre-existing. Not this delta.
- PDF capture already sets `display: none` on the host. `pointer-events` does not change that.

## 8. Accepted limits

- The arrow column stays hot: grid tracks `0` and `30px` pack at the start, so the left 30px of the host, full host height, still captures. A widget under that strip is not clickable there. The rest of the former panel is.
- While collapsed, a click in the empty interior does not select or resize the control widget in Cognos. Expand first, then select or resize it.
- `:has` requires the same floor already documented for other KDB CSS (Chrome 105+, Firefox 121+, Safari 15.4+).

## 9. Acceptance

1. Collapse the control. A widget that intersects the host but not the left 30px strip can be selected. Its settings control and move handle receive the click.
2. A widget that was not selected before the click can be selected through that same empty area.
3. The arrow still collapses and expands, by click and by `Enter` / `Space` when it is focused.
4. Expanded, the panel controls still receive clicks. The host rule does not match.
5. The diff does not change `z-index`, host `width` / `height`, JS, or the move clamp.

## 10. Forbidden

- `pointer-events: none` only on the root.
- `pointer-events: auto` on `.resizeEdge` or on `#kdb-control-content`.
- A new class, a new file, or an edit outside `shell.css` plus the one sentence in `kdbControl.md`.
- Changing `grid-template-columns`, the content `display: none` rule, or tab follow.

---

## Approval log

| Date | Actor | Note |
|------|-------|------|
| 2026-10-13 | PO vastenburg | Proceed: hypothesis re-checked, pass-through on host + root approved, resize-edge exception and host class rejected as extra. |
| 2026-10-13 | implementer | shell.css pass-through and the one kdbControl.md sentence; PO live test still open. |
