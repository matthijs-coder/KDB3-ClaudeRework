# Contract Delta: `widgetVis` Title Aggregation Suffix

> Delta on top of `contracts/widgetVis.md` §13.
> `Implemented` — PO vastenburg **green** 2026-09-02 (live canvas).

---

**Status:** `Implemented` — PO vastenburg **green** 2026-09-02 (live canvas). **Grouping-A Implemented** 2026-09-11 evening: inherit titelhaakjes green; helper uses grain pack + factory (no `branchKey`).
**Parent contract:** `contracts/widgetVis.md`
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6, 2026-09-01; grouping-A amend captain 2026-09-11
**Reviewed by:** `PO (vastenburg): List two-captions 2026-09-01 evening; live canvas green 2026-09-02; grouping-A inherit titelhaakjes green 2026-09-11 evening.`

---

## 1. Purpose

Visible visualization **header title** and the header **`title` tooltip** must show the Aggregationstyp caption(s) that the widget actually binds, in parentheses, immediately after the Kennzahl display name.

This documents an **already-applied** kennzahl local filter. It does not create the filter. Binding remains `widgetBindingPlan.buildLocalFilters` / `widgetBindingApply`.

**Deliberate delta versus lastOriginal `alterVisTitle`:** lastOriginal always read `kennzahlDefaults[code].allOther.filter` (Line/Prognose charts showed e.g. `(Monatsdurchschnitt)` while the query was `Stichtag`). This delta uses the **same lookup as binding**, so title and data match. Live: grain pack + factory (grouping-A Implemented 2026-09-11). Current config shards: **113** kennzahl codes.

## 2. Composition

Visible title parts, space-joined, empty parts omitted:

1. **base** — `metric.display` (fallback `code`, then existing DOM/Cognos fallbacks in `buildVisualizationTitleText`)
2. **aggregation** — `(caption)` or `(caption, caption)` from §3; omit when no captions
3. **dimension** — `nach <dimension>` when dimension is not default/none (unchanged)
4. **Top-N** — `Top-<n>` only when dimension is non-default **and** `topNResultValues` is non-empty (unchanged; pre-render may still omit Top-N)

Example: `Mitarbeiter*innen - Anzahl (Stichtag) nach Geschlecht Top-10`

Header tooltip: `langtext` (fallback `code + ": " + display`) + **the same aggregation string as the visible title** + the same dimension/Top-N suffixes. Chart tooltip (`syncTooltipMetadata`) and legend captions are unchanged.

Aggregation is a **config consequence** of `metric.code` + **applied kennzahl pack** (grouping-delta **§12.5**). Title does **not** own the grouping control, history, or writeback. Title only reads the **same factory** as `buildLocalFilters`. Grouping is a layout token, not a caption picker. Parentheses follow the Aggregationstyp the factory binds, not the Zeitebene label.

## 3. Grain pack and include lookup

Reuse the binding pack, do not invent a second map. Config reads go through `config/resolveVisualizationBindingConfig.js` only (parent §7.0). Do not deep-read `_KDB.config.visualizations.*` from the title helper. Do not call full `resolveBindingContext`.

**Live (grouping-A JS 2026-09-11):** pack + factory. The vis-type `branchKey` path is retired.

1. `visType` = `settings.visType || resolveDefaultVisualizationType(_KDB)` (same as `continueBindingPipeline` / `buildBindingSpec`). Raw `null` / `""` without this default would inherit the wrong grain while the widget binds **Line**.
2. Normalize via `resolveVisPropBucketKey` (never use raw `line` / `pie` / `Prognose` / `StackedBar` / `StackedColumn` / `com.ibm.vis.custom.prognoseyear` as kennzahl slot keys).
3. Pack key **identical** to `widgetBindingPlan/filters/buildLocalFilters.js` and grouping-delta **§12.5**: Prognose → `stichtag`; List legal `jahr` → `jahr`, List default / `jahrStichtag` → `list`; XOR vis maps `jahr` → `jahr` and `stichtag` / `jahrStichtag` / H / V → `stichtag`. Illegal token → that vis `defaultGrain` then this table. Helper on `resolveVisTypeIdentity`; barrel re-export; no new AMD-9 import. **Do not** restore the vis-type ternary. **Do not** hard-return List → `list` once List `jahr` exists.
4. Captions from the **shared factory** (pack + `jahrCaption` → Caption-path include: `stichtag` → `Stichtag`, `jahr` → `jahrCaption`, `list` → both). `formatType` stays on the code root; it is **not** a title input. Title must **not** read `jahrCaption` itself. Empty `{}` is truthy — do not use empty packs as inherit.
5. Factory include only (Aggregationstyp). Ignore leftover Monat/Jahr exclude rows.
6. Truthy captions, `join(", ")`, wrap as `(…)`. Empty / missing code / empty include → no parentheses (vector 8).

Source: `_KDB.config.visualizations.kennzahlDefaults` via existing `resolveKennzahlDefaults`. **Do not** read `_KDB.properties.kennzahlSpecificSlotDefaultObj`. **Do not** call Cognos `localFilters()`. **Do not** use the TopN-helper pin (live pin is **Stichtag**, not `Monatsdurchschnitt`).

Kennzahl factory include is the title source because binding upserts kennzahl defaults **after** vis-type `widgetFilter` on the same itemId (kennzahl wins). The factory must be grain-aware so pie/stacked Stichtag is not last-written by a Jahr caption.

## 4. Pipeline, strip, identity

- Put aggregation **after base, before** `nach` / Top-N. Do **not** push it onto `buildTitleSuffixParts` as `suffixParts[0]` — that array's skip is index-hardcoded (`i === 0` = dimension, `i === 1` = Top-N) and would skip the wrong parts.
- Header tooltip today joins only `buildTitleSuffixParts` (nach + Top-N). Aggregation **must** be prepended to that tooltip string as well (same computed `(caption[, caption])` as the visible title). Do not leave tooltip on nach/Top-N only.
- Pre-render (`applyPreRenderTitle` / `setVisTitle`) and post-render (`syncVisualizationTitle` DOM) use the **same** aggregation resolution. Aggregation must **not** depend on `helperTableResult` or `derived.topNResultValues`.
- `stripKnownRenderedSuffixes` / skip-if-present must treat the computed `(caption[, caption])` like `nach` / Top-N so Cognos `getVisTitle` fallback cannot double-append.
- Strip **that computed suffix only**, not an arbitrary trailing `(…)`.
- `contentCreate` seed `derived.titleText` stays unsuffixed `display`. Suffixed `titleText` is written only after confirmed title sync (`buildDerivedPatch` post-render).
- `readMetric` **must not** use `derived.titleText` as `display`. Use `derived.display` (fallback `code`). Otherwise a later apply leaks `(Stichtag)` into the base name.
- No 1000 ms tooltip delay (lastOriginal race / nested `<a>`). Write tooltip in the same post-render pass as the span.
- New small helper file for the lookup (do not grow `buildVisualizationTitleText.js` past the 150-line hard limit). AMD import count stays ≤6 per file; split if needed.

## 5. Golden vectors

Display = tree Kurztext. Suffix from current `kennzahlDefaults` shards. lastOriginal column is `allOther` only (not implemented).

| # | Code | visType + grain | Visible title | lastOriginal would have shown |
|---|---|---|---|---|
| 1 | `P_PS_K_01` | Line inherit / `stichtag` | `Mitarbeiter*innen - Anzahl (Stichtag)` | `(Monatsdurchschnitt)` |
| 2 | `P_PS_K_01` | Prognose (`stichtag` only) | `Mitarbeiter*innen - Anzahl (Stichtag)` | `(Monatsdurchschnitt)` |
| 3 | `P_PS_K_01` | List (`list` pack) | `Mitarbeiter*innen - Anzahl (Stichtag, Monatsdurchschnitt)` | `(Monatsdurchschnitt)` |
| 4 | `P_PS_K_01` | Pie / StackedBar / StackedColumn inherit / `jahr` | `Mitarbeiter*innen - Anzahl (Monatsdurchschnitt)` | `(Monatsdurchschnitt)` |
| 5 | `P_A_MOA_01` | Line inherit / `stichtag` | `mobiles Arbeiten - Anzahl der Mitarbeiter*innen (Stichtag)` | `(Anzahl im Zeitraum)` |
| 6 | `P_A_MOA_01` | Pie / Stacked* inherit / `jahr` | `… (Anzahl im Zeitraum)` | same |
| 7 | `P_PS_K_01` | Line `stichtag` + dimension `Geschlecht` + Top-10 with results | `Mitarbeiter*innen - Anzahl (Stichtag) nach Geschlecht Top-10` | `(Monatsdurchschnitt)` |
| 8 | unknown / missing code | any | no parentheses (Line data may still be Stichtag via widgetFilter) | no parentheses |
| 9 | Header tooltip for vector 1 | `P_PS_K_01: Mitarbeiter*innen - Anzahl (Stichtag)` (or tree `langtext` + ` (Stichtag)`) | langtext + `(Monatsdurchschnitt)` |
| 10 | `P_A_MOA_01` List | `… (Stichtag, Anzahl im Zeitraum)` | `(Anzahl im Zeitraum)` |
| 11 | `P_PS_K_01` | Line + explicit `jahr` | `Mitarbeiter*innen - Anzahl (Monatsdurchschnitt)` | n/a (no grouping control) |
| 12 | `P_PS_K_01` | Pie + explicit `stichtag` | `Mitarbeiter*innen - Anzahl (Stichtag)` | n/a |

Vector 1 is the expand-mode Line dump that currently shows no parentheses.

**Invariant (113 codes):** `stichtag` (Line inherit, Prognose) = `Stichtag`. `list` = `Stichtag` + `jahrCaption`. `jahr` (pie / Stacked* inherit, Line+explicit jahr) = `jahrCaption`. Closed caption set: `Stichtag`, `Monatsdurchschnitt`, `Summe`, `Summe im Zeitraum`, `Anzahl im Zeitraum`, `Quote im Zeitraum`, `Durchschnitt im Zeitraum`.

| Pattern (n) | Example | `stichtag` | `list` | `jahr` |
|---|---|---|---|---|
| 39 | `P_PS_K_01`, `P_A_MOA_05` | `(Stichtag)` | `(Stichtag, Monatsdurchschnitt)` | `(Monatsdurchschnitt)` |
| 27 | `P_A_MOA_02` | `(Stichtag)` | `(Stichtag, Summe)` | `(Summe)` |
| 26 | `P_A_MOA_04` | `(Stichtag)` | `(Stichtag, Summe im Zeitraum)` | `(Summe im Zeitraum)` |
| 9 | `P_A_MOA_01` | `(Stichtag)` | `(Stichtag, Anzahl im Zeitraum)` | `(Anzahl im Zeitraum)` |
| 8 | `P_A_MOA_06` | `(Stichtag)` | `(Stichtag, Quote im Zeitraum)` | `(Quote im Zeitraum)` |
| 4 | `P_ABS_K_KS_07` | `(Stichtag)` | `(Stichtag, Durchschnitt im Zeitraum)` | `(Durchschnitt im Zeitraum)` |

## 6. Out of scope

- Chart tooltip text rewrite; legend captions; caption `aria-label`.
- Owning the grouping dropdown, its history key, or its writeback field — `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` (B–D). This delta only **reads** effective grain + factory. **Supersedes** the 2026-09-01 line that forbade any settings Aggregationstyp/grain control.
- Binding filter merge / `kennzahlDefaults` reshape (grouping-A owns the factory + pack keys; title consumes them).
- TopN helper table title or its pin (live pin is **Stichtag**; do not retarget in grouping A/B).
- Dashboard header/footer `titleText`.
- PDF contract (capture photographs the widget DOM).
- lastOriginal 1000 ms tooltip timeout; pixel-parity with lastOriginal Line titles.
- Writing literal `"AggregationstypId"` as a kennzahl `itemId` (factory must emit the Caption path).
- Scraping Cognos `localFilters()` or `.KDB_optionSelected` for the label.

## 7. Files

| Path | Role |
|---|---|
| `KDB3/js/dashboard/widgets/widgetVis/effects/resolveTitleAggregationLabel.js` | Grain pack + factory include lookup. Pure. Grouping-A may edit this file (same WP as the pack rename). |
| `KDB3/js/dashboard/widgets/widgetVis/effects/buildVisualizationTitleText.js` | Insert aggregation after base; extend strip/skip. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/syncVisualizationTitle.js` | `applyTooltipAndLink` only: prepend the same helper `(caption[, caption])` as the visible title. Do not re-implement lookup. Do not push aggregation onto `suffixParts`. |
| `KDB3/js/dashboard/widgets/widgetVis/controllerHelpers.js` | `readMetric`: stop using `derived.titleText` as `display`. |
| `contracts/widgetVis.md` | Parent sync §1, §7.0, §13, §17, §20, approval log. |
| `contracts/widgetVis-port-execution-spec.md` | One-line pointer on `syncVisualizationTitle` Must do. |
| `contracts/widgetVis-legend-normalization-contractdelta.md` | Header tooltip still follows parent §13; this delta does not own title composition. |

`applyPreRenderTitle.js` stays a call-site of the shared builder (no lookup). `syncVisualizationTitle.js` may call `resolveTitleAggregationLabel` for the tooltip prepend; it must not copy grain / factory / include logic.

## 8. Do not (implementing agents)

- Do not hardcode `.allOther.filter.AggregationstypId`.
- Do not look up `kennzahlDefaults["pie"]` / `["Prognose"]` / `["StackedBar"]` / `["StackedColumn"]` / raw `"line"` as slot keys.
- Do not skip `resolveDefaultVisualizationType` when `settings.visType` is null.
- Do not scrape `.KDB_optionSelected` or Cognos local filters for the label.
- Do not put aggregation on `derived` as a new field unless a later contract says so; `derived.titleText` already stores the full composed string after post-render.
- Do not call `setVisTitle` after render.
- Do not reuse `suffixParts` index `i===0` / `i===1` skip for the aggregation token.
- Do not implement **title-composition** files outside this §7 allowlist. The 2026-09-01 `Approved-for-implementation` stamp covers that title WP only. Grouping-A shard / planner / overlay / factory files are owned by `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md`, not this list.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-01 | `Draft` | Coordinator (Grok 4.6) | Option B holds with MUST-caveats (visType default, suffix-index trap, tooltip path, `readMetric` leak). Awaiting PO. |
| 2026-09-01 evening | List two-captions locked | PO (vastenburg) | List include join remains `(Stichtag, Monatsdurchschnitt)` — honest vs data, not lastOriginal allOther-only. Predecessor context full; next captain stamps Approved-for-implementation + implements. |
| 2026-09-01 evening | `Draft` → `Approved-for-implementation` | Coordinator (Grok 4.6); PO List lock already recorded | Pre-impl review: title JS missing suffix (not flood). Extra file: `syncVisualizationTitle.js` tooltip prepend. `readMetric` `titleText` leak confirmed WRONG. JS army next. |
| 2026-09-02 | `Approved-for-implementation` → `Implemented` | PO (vastenburg) | Live canvas green. Option B titles match bound data (Line `(Stichtag)`, List two captions). |
| 2026-09-02 | Cleanup challenge: leave JS | Coordinator (Grok 4.6); army CONFIRM_LEAVE_IT ×2 | Dual re-read after PO green. No this-tranche dead code. Parked P2 only (pre-existing barrel re-export, idempotent double strip, 2× helper). No production JS. |
| 2026-09-11 | Pending grouping-A amend | captain; PO A-shape lock | §2/§3/§5/§6: vis-type `branchKey` → grain packs + shared factory. Vectors 11–12. §6 no longer forbids the grouping control. Live JS unchanged until grouping-A Implemented. |
| 2026-09-11 | Draft NIT pass 2 | captain | §3 factory input = pack + `jahrCaption` (not `formatType`). Vector 7 columns. §7 grain wording. §8 allowlist scoped to title WP. |
| 2026-09-11 evening | Grouping-A inherit vectors green | PO vastenburg | Titelhaakjes match inherit defaults. Grouping delta Step A `Implemented`. |
| 2026-09-12 night | Grouping-F pack map | captain; PO F lock | §2/§3 follow grouping-delta §12.5. List+`jahr` = pack `jahr` (new vector). Dual List stays default `jahrStichtag`. No 4th factory pack. |
| 2026-09-12 | Grouping-F Implemented | PO vastenburg | Canvas green. Title still factory of applied pack, not Zeitebene label. |
