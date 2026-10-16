# Contract Delta: `widgetVis` drillthrough icons — focus SHOW + canvas restore

> Delta on top of `contracts/widgetVis.md` and `contracts/widgetVis-drillthrough-service-contractdelta.md`.
> PO 2026-09-01: after maximize→unmaximize, T1 and S2 must return on the canvas column. In focus mode both icons must be visible (T1 always; S2 when peek has real categories), visually under Cognos `.collapseSvg.focusMode` (Ausblenden). DOM host may stay; look is what matters. Placement recommendation **A** (CSS on existing hosts), fallback **B** only if A cannot land under Ausblenden.

---

**Status:** `Implemented` — PO vastenburg **green** 2026-09-02 (focus column + no expand borders; canvas unchanged)
**Parent contract:** `contracts/widgetVis.md`
**Also amends:** `contracts/widgetVis-drillthrough-service-contractdelta.md` (§5b canvas-only, §8 Focus, acceptance #6); `contracts/widgetVis-port-execution-spec.md` (exit path)
**Related:** `contracts/drillthrough.md` (unchanged — URL/open only); PDF hide unchanged
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6, 2026-09-01
**Reviewed by:** `PO vastenburg — plan approved 2026-09-01 (chat "ok")`

---

## 1. Purpose

Maximize/focus wipes or rebinds drillthrough chrome onto the Cognos expand clone. Exit disposes only `.KDB_focusModeSettingsPanel`. T1 click on the canvas is unbound; S2 is removed. Listed re-installs (contentCreate / post-render / unpark) do not run on a normal unmaximize.

This delta adds **focus-exit re-install** and **focus-mode SHOW** for T1 + S2. It does not change URL assembly, assets, or the canvas column metrics.

---

## 2. Product (what the user sees)

**Focus / expand**

- Cognos `.collapseSvg.focusMode` (Ausblenden) stays. Canvas maximize proxy stays **hidden**.
- Directly **under** Ausblenden: 25×25 stack, **no borders** (canvas 3-side borders stay).
  - T1 (`pkzDrillthrough.png`) always, when `enableDrillthrough` is on.
  - S2 (`datapoint_pkzDrillthrough.png` / `kdb-datapoint-pkz`) only when F1c peek/subscribe reports **real** `categories[]`.
- Click opens PKZ-AT via `_KDB.services.drillthrough` (same as canvas).
- `.KDB_focusModeSettingsPanel` still clones info / vis / dim / TopN and still appends unmaximize in the DOM. **Visible** icons: info / vis / dim / TopN. Unmaximize is CSS-hidden (`contracts/widgetVis-settings-maximize-chrome-hide-contractdelta.md`). **No** PKZ clone on that panel.

**Back on canvas**

- Column top→bottom: maximize proxy, T1, S2 (S2 only if categories still real).
- Both clicks work again. No empty hole, no duplicates.
- `.widget:not(.nodeSelected)` hide stays intended.

---

## 3. Diagnosis (do not “fix” the wrong layer)

| Layer | Verdict |
|---|---|
| `contracts/drillthrough.md` / service | Correct. Not this bug. |
| Parent + T1 consumer | T1 SHOW on expand `.widgetIcons` is specified. **Exit re-install is not.** |
| Parent + S2 | S2 is specified **canvas-only / hide in expand**. Product now **SHOW** in expand. Contract hole, not a code accident. |
| Code | Enter plants T1 on the clone and **rebinds** `listeners.drillthroughIconClick` off the canvas anchor. S2 `removeDatapointIcon` when expanded. Exit only `disposeFocusModeChrome`. |

Do not treat leftover-hide or PDF CSS as the primary vanish path. If both icons are gone while the widget stays `.nodeSelected`, the mechanism is missing canvas re-plant + S2 delete, not `.widget:not(.nodeSelected)`.

---

## 4. Hosts (escalated to B — live 2026-09-01)

**A failed visually.** Live dump: Ausblenden is a sibling of `.preview` at `top:4px; right:4px` (24×24, y≈167). T1/S2 planted on the clone were `display` visible at y≈228 / z-index 2, under `.KDB_focusModeSettingsPanel` (z-index 65). User cannot see them.

**B:** plant T1 + S2 in `.kdb-expand-drillthrough-column`, inserted **after** `.collapseSvg.focusMode` (do not mutate that button). Same 25×25 stack, **no borders** (canvas 3-side borders stay), `right: 4px`, first icon `top: 32px` (4+24+4). Hide in-widget T1/S2 copies under `.expandModeContainer .widget`.

| Mode | T1 host | S2 host |
|---|---|---|
| Canvas | `.widgetHeader .widgetIcons` | `.widget.liveWidget.maximizable` root, TR sibling |
| Focus | `.expandModeContainer > .kdb-expand-drillthrough-column` | same column |

Do not mutate `.collapseSvg.focusMode`. Reuse `collapseSvgFocusModeSelector`. Forbidden: `.KDB_focusModeSettingsPanel`; S2 in header `.widgetIcons` or TR.

Canvas column metrics **unchanged**:

| Icon | `top` | `right` | box |
|---|---|---|---|
| `kdb-widget-maximize` | `-1px` (code; parent `top: 0` is stale) | `-26px` | 25×25, 3-side border |
| T1 wrapper `:has(.kdb_hyperlink_icon)` | `31px` | `-26px` | same |
| `kdb-datapoint-pkz` | `63px` | `-26px` | same |

Expand CSS (B): 25×25, `border: none`; **hide** maximize proxy; **show** T1 and S2 (S2 only if planted). Override `top` so the stack sits visually under Ausblenden. Precedent: `.expandModeContainer .liveWidget .KDB_widgetSettingsIcons { right: 80px }` already dodges Ausblenden — Ausblenden overlaps the widget top-right.

Remove these hide rules (they contradict SHOW):

```css
.expandModeContainer .kdb-datapoint-pkz { display: none !important; }
.expandModeContainer .kdb-datapoint-pkz .kdb_hyperlink_icon { display: none !important; }
```

Keep:

```css
.expandModeContainer .kdb-widget-maximize { display: none !important; }
.expandModeContainer .widget .widgetHeader .dataWidgetIcon:has(.kdb_hyperlink_icon),
.expandModeContainer .widget > .kdb-datapoint-pkz { display: none !important; }
```

Do **not** add `.expandModeContainer .kdb_hyperlink_icon { display: inline-block }` or `.expandModeContainer .widget:not(.nodeSelected) .kdb_hyperlink_icon` SHOW (A leftover). Column icons are not under `.widget`; canvas hide never applies to them. A SHOW on the clone would fight B hide.

`.widget:not(.nodeSelected)` hide stays for **canvas**. The Cognos expand clone has **no** `nodeSelected` (evidence HTML). B hide of in-widget copies does **not** depend on `nodeSelected`. Do not add `nodeSelected` to the clone.

S2 box / PNG under the expand column must **not** require `.maximizable`. Canvas S2 rules stay `.maximizable`.

---

## 5. Focus ENTER

`activateFocusModeChrome` already calls `installAllDrillthrough`. Keep that. Do **not** grow `installDrillthrough.js` or `installAllDrillthrough.js`.

**T1:** locate-or-create on `.kdb-expand-drillthrough-column`; re-bind click; `domRefs.drillthroughIconEl` = expand wrapper. Accepted that this unbinds the canvas click — **exit must re-bind**. Hide cloned T1 still sitting on expand `.widgetIcons`.

**S2:** **Stop** `if (isWidgetExpanded) removeDatapointIcon`. Plant on the **same column** when peek/subscribe has real categories. When expanded, **skip** canvas `maximizable` / `resizeEdge` gates (clone has neither). On that skip, do **not** `removeDatapointIcon` for a “not maximizable” expand host — that was deleting canvas S2. Hide/remove only on `deselect` / `clearAll` / empty peek / `enableDrillthrough` false. `domRefs.datapointDrillthroughIconEl` = expand wrapper while expanded.

Maximize proxy: still CSS-hidden in expand. Do not plant a proxy under Ausblenden.

---

## 6. Focus EXIT (fourth re-install moment)

After confirmed collapse (expand clone gone) and after `disposeFocusModeChrome`, re-install via existing `installAllDrillthrough` (do not grow it):

1. T1 locate-or-create on **canvas** `.widgetHeader .widgetIcons` + click re-bind. Point `domRefs.drillthroughIconEl` at the canvas wrapper.
2. S2 via the merger’s existing subscribe-replace + `syncFromPeek` on the **canvas** maximizable widget. Re-plant if categories still real; otherwise no S2 node. Point `domRefs.datapointDrillthroughIconEl` at the canvas wrapper or null.
3. F1c: **allow** `installAllDrillthrough`’s per-widgetId subscribe replace. Do not add a peek-only exit path or a second S2 installer.
4. Maximize proxy: existing canvas plant stays. Not a drillthrough concern.

**Call sites (both; install is idempotent):**

- `widgetFocusMode.exitFocusMode` after chrome dispose — user, programmatic PDF exit/restore, and already-collapsed. This is the **owned** unmaximize API.
- Observer collapse after chrome dispose — native Ausblenden when `focusMode.observedExpanded === true`.

New effect `effects/syncDrillthroughAfterFocusExit.js`: if still expanded → skip; else `installAllDrillthrough({ _KDB, widgetId })`. `enableDrillthrough: false` still skips inside the merger.

**Teardown must not re-plant** (no extra skip flag):

- `cleanupVisualizationContent` and `disposeWidgetRuntime` stay on `exitNativeFocus` then `disposeFocusMode`. They must **not** call `exitFocusMode` or the new effect.
- `exitNativeFocus` must **not** call the new effect.
- `disposeFocusMode` / `disposeFocusModeChrome` must **not** call the new effect. Chrome dispose sets `observedExpanded: false` and disconnects the observer (clears `timers.focusCheck`) **in the same turn** as `exitNativeFocus`, so a later observer callback sees `observedExpanded !== true` and returns without sync.
- If route/remove first dispatches `maximizeToggle` `{ nextMaximized: false }` and later `cleanupContent` with `clearDrillthrough`, a brief re-plant then cleanup remove is accepted. Do not invent a teardown token for that.

---

## 7. Runtime

One ref per icon (`drillthroughIconEl`, `datapointDrillthroughIconEl`). After enter they may point at clone nodes; after exit they must point at canvas nodes (or null). `cleanupDrillthroughDecorations` still only on `cleanupContent` / destroy — **not** on unmaximize (would delete canvas chrome if a stale expand node is already detached; do not start calling it on exit).

Never `widget.querySelector(".kdb_hyperlink_icon")`.

---

## 8. What changes in parents (this delta wins until patched)

| Place | Change |
|---|---|
| `widgetVis.md` maximizeToggle step 7 | After dispose chrome + `maximized:false`, run focus-exit drillthrough sync (§6). |
| `widgetVis.md` §12 T2 S2 | Drop “Canvas-only; hide under `.expandModeContainer`”. Add expand host + SHOW when categories real. |
| `widgetVis.md` §13 Focus bullet | T1 + S2 SHOW in expand; visual column under Ausblenden (CSS, hosts in §4). Exit is a re-install moment. Still no settings-panel clone. |
| `widgetVis.md` §17 folder | Add `effects/syncDrillthroughAfterFocusExit.js`. |
| `widgetVis.md` §19 | Keep “no clone onto `.KDB_focusModeSettingsPanel`”. B is live: plant **after** `.collapseSvg.focusMode` in `.kdb-expand-drillthrough-column`; do not mutate the button. |
| drillthrough-service-delta §5b / §8 / acceptance #6 | S2 is **not** canvas-only. SHOW in expand. Exit re-install. Visual under Ausblenden. |
| port-execution-spec maximize exit | Same as step 7. |

---

## 9. Files

| Path | Role |
|---|---|
| `KDB3/js/dashboard/widgets/widgetVis/effects/syncDrillthroughAfterFocusExit.js` | **Add.** Skip if still expanded; else `installAllDrillthrough`. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/widgetFocusMode.js` | Call exit-sync after chrome dispose on the exit path (including already-collapsed). Stay ≤150. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/focusMode/focusModeObserver.js` | Call exit-sync on observed collapse. Stay ≤150. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/syncDatapointDrillthroughChrome.js` | Remove expand-remove short-circuit. Plant on expand host when expanded. |
| `KDB3/js/dashboard/widgets/widgetVis/view/ensureExpandDrillthroughHost.js` | Create/reuse `.kdb-expand-drillthrough-column` after `.collapseSvg.focusMode`. |
| `KDB3/js/dashboard/widgets/widgetVis/view/placeDatapointDrillthroughIcon.js` | When expanded, plant S2 on the expand column; canvas path stays maximizable/TR. |
| `KDB3/css/widgets/widgetVis.css` | Hide in-widget clone copies. Column 25×25, `border: none`. Keep maximize hide. No A SHOW-beats-hide. |
| `effects/installDrillthrough.js` / `installAllDrillthrough.js` | T1 host switch only (column when expanded). Do not grow for S2. |
| `contracts/widgetVis.md` | Parent sync §8. |
| `contracts/widgetVis-drillthrough-service-contractdelta.md` | Parent sync §8. |

Split before 150 lines. No new events. No `_KDB.cognosAPI` in widgetVis. No `window._KDB` in deep files.

---

## 10. Out of scope

- `p_p_*` / URL / `window.open` — `contracts/drillthrough.md`
- New visualization facet; `content.on` / `_KDB.cognosAPI` in widgetVis
- Cloning PKZ onto `.KDB_focusModeSettingsPanel` / extending `filterFocusPanelIcons`
- Showing the maximize proxy in expand
- Mutating `.collapseSvg.focusMode` or planting PKZ **on** that button (B plants a sibling **after** it)
- PDF hide-set changes
- Title `.kdb_hyperlink`
- Focus-mode history / persisted maximize restore
- Growing `installDrillthrough.js`

---

## 11. Acceptance

1. Maximize → unmaximize (settings, canvas proxy, or Ausblenden): T1 is back on the canvas column and **clickable**; S2 is back if peek still has real categories.
2. In focus: T1 visible under Ausblenden; S2 visible there only with real categories; maximize proxy hidden; settings panel **visible** icons info / vis / showValues (not List) / dim / TopN (unmaximize CSS-hidden); no PKZ on the settings panel. Show-values List hide: `contracts/widgetVis-show-values-contractdelta.md`.
3. No duplicate T1/S2 after post-render, unpark, or repeated maximize cycles.
4. `enableDrillthrough: false` still skips plant/click/service.
5. Cleanup/destroy still goes through `cleanupDrillthroughDecorations.js` and does **not** re-plant on the way out.
6. Service build/open codes stay on the service; wiring failures stay `WIDGET_VIS_DRILLTHROUGH_FAILED`.

---

## Changelog

| Date | Notes |
|---|---|
| 2026-09-01 | Focus-exit re-install + S2 SHOW in expand + CSS column under Ausblenden (A). PO plan approval. |
| 2026-09-01 | §6: allow `installAllDrillthrough` F1c replace; teardown stays `exitNativeFocus` (no skip flag). Code review PASS. |
| 2026-09-01 | Live: expand clone has no `nodeSelected` / `maximizable` / TR. SHOW must beat hide; S2 plant skips those gates on expand host. CSS/JS review PASS. |
| 2026-09-01 | Escalate to B: live coords put A icons under settings (z 65) while Ausblenden is outside `.preview`. Column after `.collapseSvg`. |
| 2026-09-02 | Expand T1/S2 `border: none`. Canvas 3-side borders unchanged. PO green. |
| 2026-09-02 | Dead A leftover: drop column SHOW-beats-hide + unused `iconPath` pass; `resolveWidgetEl` canvas-only. Contract §4/§5 now match B. |
| 2026-09-02 | Army re-check (2×): **STOP**. No extract/DRY/`drillthroughIconPath`/collapse-fallback. Accept canvas S2 orphan if deselect-while-expanded. Freeze pending PO refresh. |
