# Contract Delta: LINE legend captions/titles after Dienststelle-first series

> Delta on `contracts/widgetVis-legend-normalization-contractdelta.md` and `widgetVis.md` §13.
> Must ship with `contracts/widgetVis-line-dienststelle-series-order-contractdelta.md`. Slot-only DST-first would **break** the currently approved Jahr-first golden vectors.

---

**Status:** `Approved-for-implementation`
**Parent:** `contracts/widgetVis-legend-normalization-contractdelta.md` (Approved 2026-08-26; Jahr-first compose for non-LINE)
**Type:** `feature module contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-02
**Reviewed by:** `PO (vastenburg) 2026-09-02: S1 + L1 same PR`

Caption compose-skip is now global for every visType: `contracts/widgetVis-legend-keep-order-non-list-contractdelta.md`.

---

## 0. Diagnosis

Production **matches** the 2026-08-26 legend contract. It does **not** match LINE DST-first product behaviour.

Cognos builds caption strings; KDB only rewrites `textContent`. Nested series order also changes native hover tooltips even if DOM captions lag.

Today:

- Hash rewrite is per segment; **`gesamt` / `beendet` flags are whole-caption**.
- Compose `[prefix | year | last]` runs for every vis except List.
- If `last` is the year, year is appended again (`MAG | 2024 | 2024`).
- Vector 8 **drops** `Männlich`.
- `hasStatusSuffixInSecondPart` only when **exactly 2** parts and suffix on `parts[1]` — misses `AKH(Alle) | 2024`.
- Legend title: replace substring `tooltip` with dimension; **no** visType split; Line and Prognose share it.
- Settings `visType` for Line is `"line"`; Prognose UI is `"com.ibm.vis.custom.prognoseyear"` (does not equal `"line"`). Cognos Prognose id **contains** `"line"`.

`laatsteOriginal` still shares `cleanLegendText` for Line and Prognose. Dead KDB2 helpers `cleanLineLegendTextKeepYear` / `removeSecondSpacedPipeLegendPart` must **not** go on the KDB3 live path (they drop PKZ from `2024 | PKZ | MAG`).

---

## 1. visType gates (mandatory)

Pass `options.visType` as today (`settings.visType`).

| Gate | Test | Used for |
|---|---|---|
| List | `toLowerCase() === "list"` | hash only; no compose (unchanged) |
| LINE | `toLowerCase() === "line"` | keep-order captions; LINE title rules |
| Everything else (incl. Prognose) | neither of the above | **existing** hash+compose + existing title replace |

Forbidden as a LINE gate: `.includes("line")`, `isLineLikeVisType`, grouping with `com.ibm.vis.custom.prognoseyearlinechart`.

Do **not** assume “first token is always Dienststelle” in shared helpers. Prognose token 0 is still Jahr.

---

## 2. Hash flags — per segment

`readHashFlags` must run on **the segment being normalized**, not the full caption.

```js
// per segment, after split on spaced pipe
const endsWithGesamt = segmentLower.endsWith("gesamt");
const containsBeendet = segmentLower.includes("beendet");
```

ALLE + Gesamt/Beendet table is unchanged, but the flags are segment-local:

- `AKH|ALLE#… Gesamt` → `AKH(Alle)` whether that segment is first (LINE) or last (Prognose).
- After reverse, caption ending in `2024` must **not** drop `(Alle)`.

Spaced-pipe delimiter stays `/[\s\u00A0\u2007\u202F]+\|[\s\u00A0\u2007\u202F]+/`. Bare `|` inside a token is the marker, not a legend delimiter.

PO BEENDET-vs-KDB2 delta (namePart / firstWord) stays.

List still hash-only (compose skipped). Per-segment flags still apply to List.

---

## 3. Caption assemble — LINE vs others (do not share)

After hash:

- **`toLowerCase() === "line"`:** return the hashed spaced-pipe string **in Cognos order**. Do **not** call `composeLegendCaptionParts`. If the last token is a 4-digit year, do not also push an earlier year token (vacuous if compose is skipped). Keep Geschlecht’s two tokens (`m` and `Männlich`).
- **Prognose and all non-list, non-line:** keep `composeLegendCaptionParts` as specified in the 2026-08-26 delta (prefix + first year + last; known year-duplicate quirk when last is year).
- **List:** hash only.

`null` / empty `settings.visType` does **not** match LINE (same class of hole as List-skip-on-null). Do not fall back to the Cognos id (`prognoseyearlinechart`). Callers already pass `settings.visType` (dropdown default `"line"`). Optional fallback `lastAppliedVisType === "Line"` → LINE is a product decision; default **no** (stay on compose).

Do not put `cleanLineLegendTextKeepYear` or `removeSecondSpacedPipeLegendPart` on the live path.

LINE must not depend on `hasStatusSuffixInSecondPart` (2-part, suffix on `parts[1]`).

Flash sequencing (`widgetVis-legend-caption-flash-contractdelta.md`) is unchanged. Observer still must not toggle `KDB_visible`.

No `title` / `aria-label` on captions (KDB2: avoid double tooltip next to Cognos).

---

## 4. LINE legend titles (`.lgd-title`)

Today: `replaceTooltipInLegendTitle` replaces `tooltip` with dimension for **all** vis types.

**LINE only** (`toLowerCase() === "line"`):

1. Split the Cognos hyphen field-name string on `-`.
2. Drop tokens that are `Tooltip` (any case), `Jahr` (any case), or a 4-digit year.
3. If a real dimension is selected (not `default` / `none`) and that token is missing, append it.
4. Default/none dimension → remaining label is **Dienststelle**, not `Dienststelle-Jahr-default`.

Join leftover tokens with `-`. “Dimension token missing” = case-insensitive match of the settings dimension label against leftover tokens; if absent, append `-<dimensionLabel>`.

Do **not** reuse `replaceTooltipInLegendTitle` for LINE (Prognose keeps that export). Add a second factory-scope helper (same AMD file or a sibling under `view/legend/`). `runLegendSanitizers` already passes `visType` for captions; the new work is the **title** branch.

Prognose and others keep the current tooltip-substring replace. Do **not** apply KDB2 `/(\-)[^-]*\-/` to a shared Line+Prognose path (silent Prognose regression).

Title DOM writes stay on the existing flash path: **BEM-content, non-observer sweeps only**. Observer and shell-root sweeps remain captions-only (`isCaptionsOnly`). Do not make the observer mutate `.lgd-title` or toggle `KDB_visible` to “fix” LINE titles.

Header widget title (`syncVisualizationTitle` / aggregation delta) is **not** this work.

---

## 5. Golden vectors

### 5.1 LINE (`visType` `"line"`) — new product

Assume hash already applied on DST segments. Spaced pipes.

| # | Input (Cognos-like after DST-first) | Output |
|---|---|---|
| L1 | `AKH\|ALLE#… Gesamt \| 2024` | `AKH(Alle) \| 2024` |
| L2 | `AKH\|ALLE#… \| 2024` (no Gesamt) | `AKH \| 2024` |
| L3 | `MAG \| 2024` | `MAG \| 2024` (no year duplicate) |
| L4 | `MAG \| m \| Männlich \| 2024` | `MAG \| m \| Männlich \| 2024` (keep both dim tokens) |
| L5 | `AKH(Alle) \| 2024` | `AKH(Alle) \| 2024` (no 2-part suffix bypass required) |

### 5.2 Non-LINE compose — keep 2026-08-26 vectors

Vectors 1–11 of `widgetVis-legend-normalization-contractdelta.md` remain the contract for **Prognose / stacked / pie** (Jahr-ish, DST last). Vector 10 remains List hash-only.

Do not retarget those vectors onto LINE.

### 5.3 Titles (LINE)

| Dimension | Cognos-like `.lgd-title` | Result |
|---|---|---|
| none/default | `Dienststelle-Jahr-Tooltip` (or similar hyphen soup) | `Dienststelle` |
| Geschlecht | `Dienststelle-Geschlecht-Jahr-Tooltip` | contains `Dienststelle` and `Geschlecht`; no `Tooltip`, `Jahr`, or `2024` |

Exact Cognos hyphen string is host-dependent; the drop/keep rules above are the test, not a frozen full string.

---

## 6. Other consumers (verify, do not change unless broken)

| Consumer | Expected |
|---|---|
| PDF | html2canvas of live tab; captions already sanitized in DOM. No extra builder. |
| PKZ year | `readDrillthroughVisYear` matches column label `jahr`/`year`, not index 0. |
| Writeback | Rebuild via plan; series order from planner, not stored columnIds. |

---

## 7. Files

| Path | Role |
|---|---|
| `widgetVis/view/legend/normalizeLegendHashSegment.js` | Flags per segment |
| `widgetVis/view/legend/legendCaptionText.js` | LINE keep-order vs List vs compose; LINE title helper |
| `widgetVis/view/legend/composeLegendCaptionParts.js` | Unchanged algorithm; **not** called for LINE |
| `widgetVis/view/legend/runLegendSanitizers.js` | Pass `visType`; LINE title path |
| `contracts/widgetVis-legend-normalization-contractdelta.md` | Pointer: LINE captions superseded; **Step-1 flags become segment-local for all vis types**; vectors 1–11 remain |
| `contracts/widgetVis.md` §13 caption bullets | Sync: LINE keep-order; others compose |

Do not edit `bindingSpecs.js` / planner slots from the legend agent.

---

## 8. Out of scope

- Changing Prognose series order or `segmentIndex`
- Chart tooltip text rewrite
- Caption `aria-label`
- Flash/observer timing
- Inventing `cleanLineLegendTextKeepYear`

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | `Draft` | coordinator | Mapping complete. No implementation until PO accepts. |
| 2026-09-02 | `Draft` (review) | coordinator | L1 recommended. Gate = toLowerCase; hash flags global; LINE title is a second helper; null visType does not imply LINE. |
| 2026-09-02 | `Approved-for-implementation` | PO (vastenburg) | S1 + L1 together, same PR. L1 chosen (not L2–L5; L4 forbidden). |
| 2026-09-02 | Blast-radius ACCEPT | review agent f366f380 | No shared Line+Prognose helper; LINE gate exact `=== "line"`; Prognose still compose + `replaceTooltipInLegendTitle`. |
| 2026-09-02 | Implemented (code) + review ACCEPT-WITH-NOTES | review agent 2ca358b6 | Gate/hash/keep-order/second title helper match L1. Residual: hyphen token `default` is not dropped; `Dienststelle-Jahr-Tooltip` still leftover `Dienststelle`. |
