# Execution Spec: LINE legend DST-first (L1)

> Cheap-AI implementation spec. Product architecture lives in the approved delta. This spec says HOW to build, not WHAT the product is. Do not invent.

---

**Status:** `Reviewed` — implementer grok 4.6 2026-09-02; review agent **ACCEPT-WITH-NOTES** (hyphen token `default` not dropped; golden `Dienststelle-Jahr-Tooltip` still leftover `Dienststelle`)
**Module / contract:** `_____________KDB3API/contracts/widgetVis.md`
**Delta (authority):** `_____________KDB3API/contracts/widgetVis-legend-line-dst-first-contractdelta.md`
**Parent (sync pointers):** `_____________KDB3API/contracts/widgetVis-legend-normalization-contractdelta.md`
**Companion (do not implement):** `_____________KDB3API/contracts/widgetVis-line-dienststelle-series-order-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-02
**Executing AI:** grok 4.6 subagent 097816cf-19de-46a8-9251-4824156c980e (Agent B — legend)
**Reviewer:** grok 4.6 review agent 2ca358b6-d0a5-4a9b-81f3-80166a342385 — ACCEPT-WITH-NOTES

---

## Section A. Pre-flight read list

Read each file **before** editing. Echo **one sentence per MUST-rule** in the final report (implement in the same turn; do not wait for a human).

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc`
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` (no new facet; string pipeline only)
12. The approved L1 delta (authority)
13. This execution spec
14. Live files in Section B (measure line counts first; do not assume prior sizes)

Do **not** read or edit: `bindingSpecs.js`, `widgetBindingPlan/slots/**`, KDB2/`laatsteOriginal` as a patch source.

---

## Section B. Folder tree

```
_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/view/legend/
  normalizeLegendHashSegment.js     (edit — flags per segment)
  legendCaptionText.js              (edit — LINE skip compose; public AMD)
  runLegendSanitizers.js            (edit — title branch LINE vs existing replace)
  composeLegendCaptionParts.js      (DO NOT EDIT — algorithm unchanged; not called for LINE)
  sanitizeLegendTitleLine.js        (NEW only if 150-cap on legendCaptionText.js)
_____________KDB3API/contracts/
  widgetVis-legend-normalization-contractdelta.md  (sync Step-1 flag wording + public helper)
  widgetVis.md                      (§13 caption bullets + §17 file list if new sibling)
```

Hard cap 150 lines per executable file. Extract sibling instead of exceeding. Observer / flash files: **do not edit**.

---

## Section C. Per-file specifications

#### `normalizeLegendHashSegment.js`

- **Role**: hash-segment normalizer (step 1)
- **Change**: `readHashFlags` on **the segment being normalized**, not the full caption. No `visType` argument. Hash stays vis-agnostic.
- Flags: `endsWithGesamt` / `containsBeendet` (case-insensitive) on that segment. ALLE + Gesamt/Beendet table otherwise unchanged.
- Applies to **all vis types** (not LINE-only). Vectors 1–11 remain because Gesamt/BEENDET sit on the hash segment.
- **Rules to apply**: `amd.mdc`; `naming.mdc`; `error-handling.mdc`; `feature-structure.mdc` (≤150); `dom.mdc` (string-only — no DOM).

#### `legendCaptionText.js`

- **Role**: public AMD orchestrator (`sanitizeLegendCaptionText`, title helpers)
- **Caption after hash**:
  - List: `String(visType).trim().toLowerCase() === "list"` → hash only (unchanged).
  - LINE: `String(visType).trim().toLowerCase() === "line"` → return hashed spaced-pipe string in Cognos order; **do not** call `composeLegendCaptionParts`.
  - Else (incl. Prognose Cognos ids, null, empty): call compose as today.
- Gate must use `trim().toLowerCase() === "line"`. Forbidden: `=== "line"` without lower; `.includes("line")`; `isLineLikeVisType`; Cognos-id matching; fallback to `definitions.defaultType` / `lastAppliedVisType`.
- **Titles**: second factory-scope helper (not reuse of `replaceTooltipInLegendTitle`). Algorithm:
  1. Split on `-`.
  2. Drop tokens that are `Tooltip` / `Jahr` (any case) or `/^\d{4}$/`.
  3. Join leftovers with `-`.
  4. If a real dimension is selected (not `default` / `none`) and the settings dimension label is missing (case-insensitive token match), append `-<dimensionLabel>`.
  5. Default/none → leftover is `Dienststelle` (not `Dienststelle-Jahr-default`).
- Public AMD: keep `sanitizeLegendCaptionText` + `replaceTooltipInLegendTitle`. Add a **second export** for the LINE title helper (or re-export a sibling). Prognose stays on `replaceTooltipInLegendTitle`.
- If this file would exceed 150 lines, extract `sanitizeLegendTitleLine.js` sibling and re-export from here.
- **Rules to apply**: `amd.mdc` (named helpers at factory scope; public return object); `module-public-api.mdc` (existing public AMD path unchanged as home); `naming.mdc`; `error-handling.mdc`; `feature-structure.mdc`; `dom.mdc` (strings only).

#### `runLegendSanitizers.js`

- **Role**: sweep sanitizer (captions + titles on BEM non-observer sweeps)
- **Change**: title branch — if LINE gate (`String(visType).trim().toLowerCase() === "line"`) call the new LINE title helper; else existing `replaceTooltipInLegendTitle`.
- Captions already pass `visType`; keep that.
- Do **not** change observer files. Do not call this from the observer. Do not toggle `KDB_visible` policy. Do not query `.lgd-title` from observer (observer stays captions-only).
- **Rules to apply**: `amd.mdc`; `dom.mdc` (existing sweep selectors; no new global query style); `error-handling.mdc`; `feature-structure.mdc` (≤150).

#### `composeLegendCaptionParts.js`

- **Do not edit.** Pure assembler. LINE-skip and List-skip live in `legendCaptionText.js`.

#### Parent contract sync

- `widgetVis-legend-normalization-contractdelta.md`: Step-1 table wording “whole caption” → **segment** for Gesamt/Beendet flags. Keep vectors 1–11. Public helper: document LINE title export. `_options.visType` is List-skip **and** LINE keep-order.
- `widgetVis.md` §13 caption bullets: (1) hash per segment all vis types; (2) compose unless List **or LINE**; (3) LINE keep-order after hash. Point to the L1 delta. §17 file list if a sibling is added. Do not rewrite flash/observer bullets.

---

## visType facts (do not guess)

| Surface | Value | LINE keep-order? |
|---|---|---|
| Dropdown Line | `"line"` | yes |
| `"Line"` (normalized) | after `toLowerCase()` | yes |
| Dropdown Prognose | `"com.ibm.vis.custom.prognoseyear"` | no — compose |
| Cognos Prognose id | `"com.ibm.vis.custom.prognoseyearlinechart"` | no — compose (`.includes("line")` would FALSELY match) |
| null / empty | | no — compose |

Callers pass `settings.visType` (dropdown), not the Cognos id.

---

## Section J. Acceptance criteria

1. Hash flags per segment, vis-agnostic. Vectors 1–11 still hold for non-LINE.
2. LINE vectors L1–L5 (keep-order, both Geschlecht tokens, `(Alle)` on DST-first Gesamt segment).
3. LINE gate is `String(visType).trim().toLowerCase() === "line"` only.
4. `composeLegendCaptionParts.js` byte-identical (no edits).
5. Second title helper; Prognose still uses `replaceTooltipInLegendTitle`.
6. Observer / flash / `KDB_visible` unchanged. Dead KDB2 helpers not on the live path.
7. Files ≤150 lines. AMD full-compact. No bindingSpecs / planner-slot edits.

---

## Section K. Forbidden actions

- Edit `bindingSpecs.js` or `widgetBindingPlan/slots/**`.
- Edit `composeLegendCaptionParts.js`.
- Reuse `replaceTooltipInLegendTitle` for LINE. Shared Line+Prognose regex `/(\-)[^-]*\-/`.
- `isLineLikeVisType` or `.includes("line")` as LINE gate.
- L4 “first token is DST” in shared helpers.
- Observer calling `runLegendSanitizers`, mutating `.lgd-title`, or toggling `KDB_visible`.
- Tooltip-text rewrite. Git commit/push. Invent L2–L5.
- If the contract cannot be followed: **stop and report**. Do not invent.

---

## Section L. Report (keep short)

1. Pre-flight: one sentence per MUST-rule + cognos-adapter.
2. File checklist: path, **measured** before/after line counts, matches spec | deviation.
3. Diffs summary (not full dumps). Confirm compose file untouched.
4. Contract-vs-code: gate string; hash vis-agnostic; LINE skip compose; title second helper; vectors 1–11 + L1–L5.
5. Public AMD exports list. Risks / open questions. Stop items if any.
