# Execution Spec: legend dim-token collapse

> Authority: `contracts/widgetVis-legend-dim-token-collapse-contractdelta.md`. Do not invent.

---

**Status:** `Frozen` — PO green 2026-09-02
**Delta (authority):** `_____________KDB3API/contracts/widgetVis-legend-dim-token-collapse-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-02
**Executing AI:** grok 4.6 subagent 12bb446e-50a5-4ca6-87c9-e67217a303e8
**Reviewer:** grok 4.6 review agent 099dc0c8-503a-4862-b6f7-665c372beef7 — ACCEPT-WITH-NOTES

---

## Section A. Pre-flight

Echo one sentence per: kdb-object, state, runtime, module-public-api, events, feature-structure, naming, error-handling, dom, amd, cognos-adapter.

Read the delta, this spec, live `legendCaptionText.js`. Measure line counts. Extract a sibling if `legendCaptionText.js` would exceed 150.

---

## Section B. Files

```
_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/view/legend/collapseLegendCaptionDimParts.js  (new)
_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/view/legend/legendCaptionText.js  (edit)
_____________KDB3API/contracts/widgetVis.md  (§13 caption bullet + §17 file list)
_____________KDB3API/contracts/widgetVis-legend-keep-order-non-list-contractdelta.md  (one pointer)
```

Do **not** edit `composeLegendCaptionParts.js`, `normalizeLegendHashSegment.js`, observer files, bindingSpecs, slots.

---

## Section C.

#### `collapseLegendCaptionDimParts.js`

- **Role:** pure string helper, AMD export one function `collapseLegendCaptionDimParts(_hashedText)`
- **Lines:** target < 80, hard 150
- Same spaced-pipe regex as hash file (copy the literal; do not change hash file).
- Factory-scope named helpers (no nested functions in the export body):
  - split parts
  - find first `/^\d{4}$/` index (−1 if none)
  - resolve DST index per contract
  - drop second prefix index if prefix count === 2
  - join survivors `" | "`
- If no spaced pipe or fewer than 2 parts: return input string.
- try/catch on the exported function; `console.error("[widgetVis.collapseLegendCaptionDimParts] failed", err)`; rethrow.
- **Rules:** amd, naming (`_hashedText`), error-handling, feature-structure, dom (strings only).

DST index (must match contract):

```
if yearIndex >= 0 && yearIndex === parts.length - 1 && yearIndex > 0
  dstIndex = yearIndex - 1
else
  dstIndex = parts.length - 1
```

#### `legendCaptionText.js`

- After hash: if `String(visType).trim().toLowerCase() === "list"` return hashed; else `collapseLegendCaptionDimParts(hashed)`.
- Null-safe visType like existing title gate (`visType == null ? "" : visType`).
- Import the new sibling. Keep public AMD exports. Titles unchanged.
- Do not revive compose import.
- **Rules:** amd, module-public-api, error-handling, feature-structure ≤150.

#### Parent

- `widgetVis.md` §13: after hash, non-List dim collapse (exact-2); List hash-only. Point to this delta. §17 list the new file.
- Keep-order delta: one sentence that keep-order is followed by this collapse for non-List.

---

## Section J. Acceptance

Vectors D1–D6 from the delta. Compose file untouched. No `.includes("line")`. Observer untouched.

Stop and report if the contract cannot be followed.

---

## Section L. Report SHORT

Pre-flight echoes; line counts; D1–D6; compose SHA note; risks.
