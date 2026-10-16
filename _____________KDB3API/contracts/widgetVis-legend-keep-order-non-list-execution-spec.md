# Execution Spec: legend keep-order all vis types (no compose call)

> Authority: `contracts/widgetVis-legend-keep-order-non-list-contractdelta.md`. Do not invent.

---

**Status:** `Frozen` — PO green 2026-09-02
**Delta (authority):** `_____________KDB3API/contracts/widgetVis-legend-keep-order-non-list-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-02
**Executing AI:** grok 4.6 subagent d92780be-6055-4fb8-b81a-d086d8809773 (Agent B — legend)
**Reviewer:** grok 4.6 review agent c391459a-cf6c-4946-91b3-8428e51059b2 — ACCEPT-WITH-NOTES

---

## Section A. Pre-flight

Echo one sentence per MUST-rule + cognos-adapter. Read the delta, this spec, live `legendCaptionText.js`, and parent pointers to sync.

Do not edit bindingSpecs or planner slots. Do not edit `composeLegendCaptionParts.js`.

---

## Section B. Files

```
_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/view/legend/legendCaptionText.js
_____________KDB3API/contracts/widgetVis-legend-normalization-contractdelta.md
_____________KDB3API/contracts/widgetVis.md
```

Optional: `widgetVis-legend-line-dst-first-contractdelta.md` one-line pointer that compose-skip is now global.

---

## Section C. Per-file

#### `legendCaptionText.js`

- `sanitizeLegendCaptionText`: after hash, return hashed text. Do **not** call compose for any visType (including null, Prognose ids, stacked, pie, LINE, List).
- Remove AMD import of `./composeLegendCaptionParts.js`.
- Keep `isLineVisualizationType` (titles). Remove `isListVisualizationType` if it becomes unused.
- Titles unchanged (`sanitizeLegendTitleLine` / `replaceTooltipInLegendTitle`).
- Hard cap 150. AMD factory-scope helpers. try/catch on exports.
- **Rules:** amd, naming, error-handling, feature-structure, module-public-api (same public AMD exports), dom (strings only).

#### `composeLegendCaptionParts.js`

- **Do not edit.**

#### Parent sync

- Normalization delta: live assemble is hash keep-order for all vis types; compose outputs of vectors 1–11 are not live; hash step still holds.
- `widgetVis.md` §13 caption bullets: hash then keep Cognos order; compose unused. Do not rewrite observer/flash bullets.

---

## Section J. Acceptance

1. Compose file SHA unchanged.
2. No compose import/call from `legendCaptionText.js`.
3. LINE titles still LINE-gated. Prognose titles still replaceTooltip.
4. No `.includes("line")`. No observer edits.

Stop and report if the contract cannot be followed.

---

## Section L. Report (SHORT)

Pre-flight echoes; line counts; confirm compose untouched; public AMD exports; parent bullets synced.
