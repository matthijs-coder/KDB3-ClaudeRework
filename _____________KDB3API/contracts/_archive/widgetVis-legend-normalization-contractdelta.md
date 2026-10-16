# Contract Delta: `widgetVis` Legend-Caption Normalization

> Delta on top of `contracts/widgetVis.md`.
> PO-approved product rule; converting agent implements the pipeline in `widgetVis/view/legend/`.

---

**Status:** `Approved-for-implementation`
**Parent contract:** `contracts/widgetVis.md`
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6, 2026-08-26
**Reviewed by:** `PO (vastenburg): pipeline (not vis-type config); List is hash-only; BEENDET namePart when firstWord is beendet; legend-item hover follows caption textContent — approved 2026-08-26; golden vector 11 (org-code # without ALLE/BEENDET) confirmed live 2026-08-27`

---

## 1. Purpose

Legend captions from Cognos include technical hash prefixes (`#`), organisation markers (`ALLE` / `BEENDET`), and extra spaced-pipe parts (gender, year, Dienststelle). `widgetVis` must rewrite **visible legend caption `textContent`** after render so users see short labels such as `2026 | M06(Alle)`.

This is a **string pipeline** in `view/legend/`. It is not vis-type config. Do not add files under `KDB3/js/core/config/visualizations`. Do not put the algorithm in `widgetVis/config`. Optional tiny marker constants may live at factory scope in the legend JS files.

Call graph stays: `runLegendSanitizers` and `sanitizeLegendCaptionMutation` already call `sanitizeLegendCaptionText`. Public AMD path `legendCaptionText.js` exports `sanitizeLegendCaptionText`, `replaceTooltipInLegendTitle`, and `sanitizeLegendTitleLine` (LINE `.lgd-title` only).

Sweep/observer **timing** (observer before `applyBinding`; sweep before post-render properties; query-root observe + caption-only filter) is specified in `contracts/widgetVis-legend-caption-flash-contractdelta.md`. This delta does not change that sequencing. Live caption assemble is hash then keep-order for **all** vis types; this file remains the hash-step contract.

**LINE DST-first (Approved-for-implementation 2026-09-02, same PR):** `.lgd-title` for settings `visType` matching `String(visType).trim().toLowerCase() === "line"` is specified in `contracts/widgetVis-legend-line-dst-first-contractdelta.md`. **Keep-order captions for all vis types** (compose not called): `contracts/widgetVis-legend-keep-order-non-list-contractdelta.md`. Vectors 1–11 describe hash; compose outputs are not live. Flags per segment. LINE titles still in the L1 delta.

## 2. Pipeline

Caption shape: `[prefix | ] [year | ] code|MARKER#rest`

**Delimiters**

- Legend parts split only on spaced pipe: `/[\s\u00A0\u2007\u202F]+\|[\s\u00A0\u2007\u202F]+/`.
- Bare `|` inside a token (`M06|ALLE`) is the marker delimiter, not a legend-part delimiter.
- Spaces around `#` are trimmed (`M06|BEENDET # 3a2_03aB3`).

Flags `doesEndWithGesamt` / `hasBeendet` are computed **per hash segment** (not the whole caption), case-insensitive. Authority: `widgetVis-legend-line-dst-first-contractdelta.md` (Approved-for-implementation 2026-09-02, same PR as LINE DST-first slots). Vectors 1–11 in this file still hold because Gesamt/BEENDET sit on the hash segment.

### Step 1 — hash-segment normalization

If the full caption has spaced pipes: map this step over each part, rejoin with `" | "`. Else: this step on the whole string.

For a segment with `#` not first/last character:

- `beforeHash` / `afterHash` (trimmed)
- internal pipe in `beforeHash` → `namePart` + `markerPart`
- `firstWord(afterHash)` = first token of `afterHash` split on whitespace (including NBSP variants)

| Marker | Condition | Result |
|---|---|---|
| `ALLE` | **segment** ends with `gesamt` | `namePart(Alle)` |
| `ALLE` | **segment** includes `beendet` | `namePart(Beendet)` |
| `ALLE` | else | `namePart` |
| `BEENDET` | `afterHash` empty **or** `firstWord(afterHash)` is `beendet` (case-insensitive) | `namePart(Beendet)` |
| `BEENDET` | else | `firstWord(afterHash)(Beendet)` |
| no internal alle/beendet marker, `#` present | | `firstWord(afterHash)` (fallback: whole `afterHash` if no token) |
| no `#` or `#` first/last character | | segment unchanged |

`BEENDET` is a deliberate PO delta versus KDB2 (KDB2 would emit `BEENDET(Beendet)` for `M06|BEENDET#BEENDET - …`).

### Step 2 — compose (not live)

Live assemble does **not** call compose for any visType (`contracts/widgetVis-legend-keep-order-non-list-contractdelta.md`). `composeLegendCaptionParts.js` was **deleted** 2026-09-02 (PO dead-code cleanup). Historical algorithm (was used for Prognose / stacked / pie):

- If no spaced pipe: return step-1 text.
- If exactly 2 parts and the second matches `/\((alle|beendet)\)\s*$/i`: return as-is.
- Else: `last` = last part; `year` = first part matching `/^\d{4}$/`; `prefixParts` = all except last and except that year index; `prefix` = first prefix part if any.
- Result = `[prefix if present, year if present, last]` joined `" | "`.
- Do not invent a year Cognos did not include.
- Known KDB2 quirk: if `last` **is** the year, year may duplicate. Port this compose as specified. Do **not** invent `cleanLineLegendTextKeepYear`.

Replace production `classifyLegendCaptionParts` keep-first-last-year (≥3 parts). Do not stack the old classifier on top of this pipeline. Remove the `less_than_three_parts` skip — 1–2 part captions **must** be hash-normalized.

### Step 3 — List

Return step-1 only (hash runs; compose does not). After keep-order-all this is the same assemble as every vis type. This **changes** previous production, which skipped List entirely.

### Step 4 — tooltip / a11y

Legend-item hover follows the caption `textContent`. Do not change `syncTooltipMetadata.js`. Do not add `aria-label` / `title` on captions. Title-header tooltip on `.widgetHeader .widgetTitle` stays as in `widgetVis.md` §13 (aggregation parenthesis is owned by `contracts/widgetVis-title-aggregation-contractdelta.md`; this legend delta does not own title composition).

## 3. Public helper contract

```js
sanitizeLegendCaptionText(_text, _options) → { text, changed, ... }
replaceTooltipInLegendTitle(_text, _dimensionLabel) → { text, changed }
sanitizeLegendTitleLine(_text, _dimensionLabel) → { text, changed }
```

Callers only need `text` and `changed`. Unused `classifications` internals may be dropped. Caption assemble does not branch on `_options.visType` (hash then keep-order for every visType, including `null` / empty). LINE `.lgd-title` uses `sanitizeLegendTitleLine`; Prognose and others keep `replaceTooltipInLegendTitle`. Caption keep-order: `contracts/widgetVis-legend-keep-order-non-list-contractdelta.md`. LINE titles: `contracts/widgetVis-legend-line-dst-first-contractdelta.md`.

## 4. Golden vectors

These must hold as the **hash** step. Live assemble is hashed Cognos order for every visType; compose outputs are not live (vector 8 dropping `Männlich` is not live). Vector 10 List hash-only is unchanged and now matches all vis types.

1. `2026 | M06|ALLE#MA 06 - Rechnungs- und Abgabenwesen Gesamt` → `2026 | M06(Alle)`
2. `M06|ALLE#MA 06 - Rechnungs- und Abgabenwesen Gesamt` → `M06(Alle)`
3. `2026 | M06|ALLE#MA 06 - Rechnungs- und Abgabenwesen` (no Gesamt) → `2026 | M06`
4. `M06|BEENDET#BEENDET - Beendeten OE(M06)` → `M06(Beendet)`
5. `M06|BEENDET # 3a2_03aB3 - Aconto - BA 3(Endedatum: 31.10.2020)` → `3a2_03aB3(Beendet)`
6. `m | 2026 | M06|ALLE#MA 06 - Rechnungs- und Abgabenwesen Gesamt` → `m | 2026 | M06(Alle)`
7. `Männlich | 2026 | M06|ALLE#MA 06 - Rechnungs- und Abgabenwesen Gesamt` → `Männlich | 2026 | M06(Alle)`
8. `m | Männlich | 2026 | M06|ALLE#MA 06 - Rechnungs- und Abgabenwesen Gesamt` → live `m | Männlich | 2026 | M06(Alle)` (historical compose dropped `Männlich`; not live)
9. `m | M06|ALLE#MA 06 - Rechnungs- und Abgabenwesen Gesamt` → `m | M06(Alle)`
10. List `visType` + vector 8 → hash only, keep extra prefix: `m | Männlich | 2026 | M06(Alle)`
11. `2026 | M06|MA6#MA6 - Rechnungs- und Abgabenwesen` → `2026 | MA6`

Locked table row: no internal ALLE/BEENDET marker, `#` present → `firstWord(afterHash)`. Hash step PO-confirmed live 2026-08-27. Live captions then keep Cognos spaced-pipe order (compose year + last is not live).

## 5. Out of scope

- Vis-type config under `core/config/visualizations` or `widgetVis/config`.
- `syncTooltipMetadata.js` (chart tooltip pipe-part annotation).
- Caption `aria-label` / `title` (KDB2 aria-only sync is **not** ported here).
- Chart tooltip **text** rewrite.
- `widgetBindingPlan` hash helper (`sanitizeWidgetDownstreamDisplayValues.js`).
- `KDB.js`, `.cursor/rules`, legacy trees.
- Rewriting historical `widgetVis-port-execution-spec.md` as if the original composed port included this pipeline (a one-line pointer is allowed).

## 6. Files

| Path | Role |
|---|---|
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/normalizeLegendHashSegment.js` | Step 1 (hash / ALLE / BEENDET). |
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/composeLegendCaptionParts.js` | Historical step 2; **deleted 2026-09-02** (dead-code cleanup). Algorithm remains in this file §2. |
| `KDB3/js/dashboard/widgets/widgetVis/view/legend/legendCaptionText.js` | Orchestrates hash then keep-order (no compose call); public AMD: `sanitizeLegendCaptionText`, `replaceTooltipInLegendTitle`, `sanitizeLegendTitleLine`. |
| `contracts/widgetVis.md` | Parent sync (§1, §13, §17, §19, §20, approval log). |
| `contracts/futureTodo/widgetVis-legend-normalization-backlog.md` | Closed by this delta. |
