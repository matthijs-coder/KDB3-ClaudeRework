# Contract Delta: `widgetVis` Legend-Caption Flash Sequencing

> Delta on top of `contracts/widgetVis.md`.
> PO-approved product rule (A+B, not C); converting agent implements sequencing in `widgetVis` effects + `view/legend/`.
> String pipeline is unchanged: `contracts/widgetVis-legend-normalization-contractdelta.md` (§4 golden vectors, including org-code vector 11).

---

**Status:** `Approved-for-implementation`
**Parent contract:** `contracts/widgetVis.md`
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6, 2026-08-26
**Reviewed by:** `PO (vastenburg): go with coordinator recommendation A+B, not C — approved 2026-08-26`

---

## 1. Purpose

Users see raw Cognos legend captions for ~0.5s after render. `sanitizeLegendCaptionText` is correct; it runs too late.

Captions paint during `renderWidget` → `whenRenderComplete`. `handleApplyBindingSuccess` then awaited post-render `applyVisualizationProperties` (~7–8 sequential Cognos writes) **before** `applyPostRenderCleanup` / `runLegendSanitizers`. The legend observer installed after that sweep, and only on `.Legend`; missing `.Legend` skipped with `no_legend_root`. `contentCreate` installs the focus observer, not the legend observer. `mutationNeedsLegendSanitize` treated every `childList` / `characterData` as interesting, so the observer could not watch the whole widget content.

This delta moves **sweep + observer** earlier and arms the observer on the widget **query root** with a caption-only mutation filter. It does not change the caption string pipeline.

## 2. Sequence

Cleanup mode (`reason === "cleanup"` or `forceEmpty === true`) skips all of the following.

### Before `applyBinding`

In `effects/continueBindingPlanAndApply.js`, after a successful plan and a registered `applyBinding`, **before** `applyService.applyBinding` (not cleanup):

1. Resolve the legend query root (`resolveLegendQueryRoot` — BEM content when it matches `isVisualizationContentRoot`, otherwise the widget shell).
2. Install the legend `MutationObserver` on that **query root** (subtree). Do not require `.Legend` to exist; `no_legend_root` is not a skip reason on this path.
3. Skip install without throwing only when there is no node (`no_query_root`), the opSeq is stale, `MutationObserver` is unavailable, or cleanup mode. Do **not** skip because the node is the widget shell (`observe_root_is_shell` is not a skip).

### After confirmed apply success (current `opSeq`, not cleanup / stale)

In `effects/buildDerivedPatch.js` `handleApplyBindingSuccess`:

1. **Immediately** run legend sweep + observer install (`view/sweepLegendCaptions.js` → `resolveLegendQueryRoot` + `syncLegendVisibility`).
2. **Then** await `applyVisualizationProperties({ phase: "postRender", force: true })`.
3. **Then** keep existing `applyPostRenderCleanup` (title + legend again + tooltip).

Do not delay with sleep, retry loops, or `legendTextDebounce` as a sanitize delay.

## 3. Observer

- Storage stays `_KDB.runtime.widgetVis.byId[id].observers.legendText`. Disconnect-first on reinstall. Disconnect on cleanup/dispose remains as implemented.
- Observe BEM content when present, otherwise the widget shell, so restore paint still rewrites captions; observer writes stay caption-text-only (no `KDB_visible`). One observe root (subtree), not only `.Legend, .legend`. Log that the observe root is the query root (`queryRoot` or `shell`). See §3.1.
- `mutationNeedsLegendSanitize` must not full-scan every SVG `childList` when the observer watches widget content:
  - `characterData`: parent is a legend caption host.
  - `childList`: target is a caption host **or** a legend root (`.Legend` / `.legend`) **or** an added/removed **element** that **is** a caption host or legend root. Do **not** `querySelector` inside `svg` / `g` / `path`. Optional descendant query only on non-SVG added/removed elements.
  - `attributes` + `id`: existing caption-child behavior.
- Shared host matchers live in `view/legend/matchLegendCaptionHost.js` (`isLegendCaptionHostElement`, `isLegendRootElement`). `sanitizeLegendCaptionMutation.js` and `mutationNeedsLegendSanitize.js` both import that file. `legendCaptionDom.js` may import `matchLegendCaptionHost` for caption collection. It must not create an AMD cycle through `legendCaptionDom` ↔ `sanitizeLegendCaptionMutation`.

Queries stay on `resolveLegendQueryRoot` / content `runtime.domRefs.contentEl`. No `document.querySelector` for captions. `resolveVisualizationContent` may still use a documented shell lookup for `contentCreate` / title.

## 3.1 Observer writes (load icon flash, 2026-08-26)

Dashboard load: KDB icons flash at intrinsic SVG size when the legend observer toggles global `.KDB_visible { display: block }` during first Cognos paint (`deferRenderWait` restore). Captions must keep working. Unpark sweep stays.

Keep:

- Observer on the query root **before** `applyBinding` (cleanup skip unchanged).
- Sweep before post-render properties; unpark sweep + install.
- Caption-only mutation filter; no `no_legend_root` skip.

Observer callback MUST NOT:

- `classList.add` / `remove` `KDB_visible` (global `.KDB_visible { display: block }` restyles the document).
- Run a full `runLegendSanitizers(queryRoot)` (that scans the whole content root and toggles title visibility).

When a mutation is interesting but in-place `sanitizeLegendCaptionMutation` does not rewrite: sanitize **caption text in the mutation target / added subtree only**. Do not `querySelectorAll` the whole query root. Do not scan the observe root itself as a fallback (that would be a full content-root scan).

`collectCaptionEntries` / inner caption selectors: if the scan root **is** `.Legend` / `.legend`, `querySelectorAll(".Legend .legendCaption")` misses children (the ancestor is the root). Use inner caption selectors (`.legendCaption` and `[data-visual-item="widget.legend.labels"]`) on a subtree root, and include the root itself if it is a caption host.

Legend observe/sweep root: BEM `.widget-content` / `.ba-common-widget__content` / `[data-kdb-widget-content]` when it matches `isVisualizationContentRoot`; otherwise the widget **shell**. Re-resolve at install/sweep (`resolveLegendQueryRoot`). Prefer BEM; if only the shell exists, observe/sweep that shell (`subtree: true`). Do **not** skip install for `observe_root_is_shell`. If BEM appears later, the next install/sweep writes it to `domRefs.contentEl` and reinstalls on BEM (disconnect-first). Do not promote the observe root from the observer callback. Do **not** change `resolveVisualizationContent` shell fallback for `contentCreate` / title.

Non-observer full sweeps (`runLegendSanitizers` from `syncLegendVisibility` / post-render / unpark): if the root is BEM, MAY toggle title `KDB_visible` and scan the content root; if the root is the shell, **captions only** (no title `KDB_visible` / no global restyle). If `fromObserver` is still passed into `runLegendSanitizers`, treat it as captions-only and no `classList` — the observer must not call that file.

Legend failure must not block `applyBinding`. If resolve returns null (no node), skip install without throwing.

Companion CSS (not widgetVis JS): always-on `input.svgIcon` size cap in `KDB3/css/widgets/widgetSettings.css`; `#KDB_HideSpot` selector case in `KDB3/css/hideSpot.css`. Do not put those CSS rules in this vis contract body.

## 4. Unpark

`widgetVis/ensureObservers`: unpark must **sweep + install**, not install-only. Cognos may re-paint captions when a widget returns to canvas without `contentCreate`. Sanitizers run at unpark.

## 5. Files

| Path | Role |
|---|---|
| `KDB3/js/dashboard/widgets/widgetVis/view/sweepLegendCaptions.js` | `resolveLegendQueryRoot` + `syncLegendVisibility` (sweep + observer). |
| `KDB3/js/dashboard/widgets/widgetVis/view/isVisualizationContentRoot.js` | True iff the node is BEM content / `data-kdb-widget-content`. |
| `KDB3/js/dashboard/widgets/widgetVis/view/resolveLegendQueryRoot.js` | Re-resolve; return BEM when present, otherwise the shell with `isShell`. Skip only when there is no node. |
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/matchLegendCaptionHost.js` | Shared `isLegendCaptionHostElement` / `isLegendRootElement`. |
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/sanitizeLegendCaptionSubtree.js` | Caption-only sanitize of a mutation target / added subtree. |
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/onLegendTextObserverRecords.js` | Observer hot path: in-place mutation, else subtree captions; never `runLegendSanitizers` / `KDB_visible`. |
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/runLegendSanitizers.js` | BEM sweeps may toggle title `KDB_visible`; shell sweeps are captions-only. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/buildDerivedPatch.js` | Sweep + observer **before** post-render properties. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/continueBindingPlanAndApply.js` | Observer on query root **before** `applyBinding`; skip only when there is no node / cleanup. |
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/installLegendTextObserver.js` | Observe BEM or shell; drop `no_legend_root` and `observe_root_is_shell` skips. |
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/observeLegendCaptionRoots.js` | Observe the single query root. |
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/mutationNeedsLegendSanitize.js` | Caption-only mutation filter (query-root observer). |
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/legendCaptionDom.js` | Caption collection (inner selectors on `.Legend` roots); re-exports `mutationNeedsLegendSanitize`. |
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/sanitizeLegendCaptionMutation.js` | Import shared host matchers. |
| `KDB3/js/dashboard/widgets/widgetVis/actions/handleEnsureObservers.js` | Unpark sweep + install. |
| `KDB3/css/widgets/widgetSettings.css` | Companion: always-on `input.svgIcon` 22px cap. |
| `KDB3/css/hideSpot.css` | Companion: `#KDB_HideSpot` id case. |
| `contracts/widgetVis.md` | Parent sync (§7.0, §13, `ensureObservers`, §17, approval log). |

## 6. Out of scope

- CSS hide / visibility cloak of raw captions (option C).
- Sleep, retry, or interval polling (do not port KDB2 delay).
- Reviving `legendTextDebounce` as a sanitize delay.
- Caption `title` / `aria-label`.
- `syncTooltipMetadata.js` text rewrite (tooltip still uses `resolveQueryRoot`, including shell fallback).
- `core/config/visualizations` and `widgetVis/config` vis-type tables.
- `KDB.js`, waiting for CSS onload, `widgetBindingPlan` hash helper, new `_KDB.state`, new events, new public API methods.
- Changing the caption string pipeline (hash / compose / List).
- Changing `resolveVisualizationContent` so `contentCreate` no longer has a shell fallback.
- Changing `leftoverWidgets.css` (visibility cloak until `.KDB_widgetSettings`).
- Dropping unpark sweep or observer-before-apply.
- Sizing all `.svgIcon` (non-input SVGs) or changing tab rules in `kdb.css`.
