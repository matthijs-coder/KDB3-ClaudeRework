# Contract Delta: `metricsTree` Metric Descriptor Lookup (`resolveMetricByCode`)

> Delta on top of the metricsTree module behavior (no standalone parent contract exists; module facts per `architecture/structure-audit.md` §2.13).
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved`
**Owner module:** `metricsTree`
**Consumers:** `widgetBase` (drop + parameter-set restore content-create), future consumers needing metric metadata by code
**Type:** `feature module contract delta`
**Authoring AI:** Fable 5, 2026-07-14
**Reviewed by:** `PO (vastenburg): API-over-DOM lookup and single-enrichment-point approach approved 2026-07-14`

---

## 1. Purpose

The v3 writeback schema persists only the semantic metric `code` for `"vis"` widgets (`writeback.md` §4.5: "display/tooltips never stored"). All other metric metadata (display name, langtext, dxmeta url, metrics table) must be re-resolved live from the metrics tree when needed.

Today three widget-on-canvas paths (drop, history replay, parameter-set restore) resolve metric metadata differently: drop reads the dragged anchor attributes, restore uses an ad-hoc BFS walker owned by `widgetBase` (`effects/resolveMetricDescriptorFromTree.js`) that returns only `display` + `metricsTable`. This delta establishes **one canonical lookup** owned by the tree.

## 2. Public API

`metricsTree` exposes one read-only method on its controller API:

```js
_KDB.api.metricsTree.resolveMetricByCode(code)
```

Return value (synchronous, plain serialisable object, never `null`):

```js
{
  resolved: boolean,          // true when a leaf with matching code was found
  code: string,               // echo of the requested code (trimmed)
  display: string,            // a_attr.display, "" when unresolved
  langtext: string,           // a_attr.langtext (falls back to a_attr.title), "" when unresolved
  title: string,              // a_attr.title, "" when unresolved
  metricsTable: string,       // owning sourceKey, "" when unresolved
  url: string,                // a_attr["data-url"], "" when unresolved
  draggedElementType: string  // a_attr.draggedElementType, "" when unresolved
}
```

Rules:

1. Lookup source is **`_KDB.state.metricsTree` only** (walk `sourceOrder` → `bySource[sourceKey].nodes`, match leaf `a_attr.code`). No DOM queries, no Cognos calls, no jQuery. The DOM anchor attributes and `a_attr` are built from the same node builder (`state/buildMetricsTreeNodes.js` + `state/buildMetricsTreeLeafNode.js`), so state is authoritative.
2. Read-only: no state mutation, no dispatch, no history.
3. First match wins in `sourceOrder` order (codes are unique per source; cross-source duplicates resolve deterministically).
4. Empty/missing code, tree not loaded (`lifecycle !== "ready"`) or code not found all return `resolved: false` with empty string fields — never throw.
5. This is a selector-style read method (same category as `getState()`), justified as a narrow public read surface per `stateOwnership.md`; it is not a dispatch action because it produces no state change.

## 3. Consumer Rules

- `widgetBase` content-create dispatchers (drop `dispatchContentCreate.js` and restore `dispatchRestoreContentCreate.js`) must obtain the metric descriptor through this API. Drop may use the drag payload fields as **fallback** when the lookup is unresolved (the dragged anchor is evidence the metric exists even if the state walk misses); restore has no fallback and degrades per its own contract.
- **As-built 2026-08-16:** both wrappers delegate `resolveMetricByCode` through `effects/dispatchContentCreateShared.js`; drop fallbacks vs restore skip-by-design behavior unchanged.
- `widgetBase/effects/resolveMetricDescriptorFromTree.js` (ad-hoc BFS in the wrong owner) is removed; its behavior is superseded by this API.
- Consumers must tolerate `resolved: false` (tree not mounted/loaded yet, or code removed from the tree) and apply their own degrade rules; this API gives no readiness guarantee.

## 4. Placement

- Implementation lives in `metricsTree/state/` (e.g. `state/resolveMetricByCode.js`), wired onto the controller API in `createMetricsTreeController.js`.
- File limits per `projectStructureRules.md` (150 lines executables).
- **As-built 2026-08-17 (size-split):** mount pipeline + dataload live in `effects/runMetricsTreeMount.js`; runtime ensure/clear in `runtime/ensureMetricsTreeRuntime.js` and `runtime/clearMetricsTreeRuntime.js`; leaf node shape in `state/buildMetricsTreeLeafNode.js` called from `state/buildMetricsTreeNodes.js`. Public API unchanged (`mount`, `destroy`, `dispatch`, `getState`, `resolveMetricByCode`). `Date.now()` stamps `lastBuildAt` / `lastRenderedAt` / `readyResolvedAt` on controller dispatch payloads; reducer fallbacks stay `0`.

## 5. Explicitly Out of Scope

- A code-indexed map for O(1) lookup (BFS over state is sufficient at current tree sizes; may be added later inside `metricsTree` without contract change).
- Readiness/await semantics (`waitUntilReady`): restore keeps its existing degrade path when the tree is not ready.
- Persisting any of the descriptor fields in v3 (writeback stores `code` only, unchanged).
