# Contract Delta: legend dim-token collapse (exactly two prefix parts)

> After hash keep-order. Does **not** revive `composeLegendCaptionParts` (`prefix | year | last`).
> PO (vastenburg) 2026-09-02: `m | Männlich` → `m`; List excluded; collapse only when there are **exactly two** tokens before Dienststelle.

---

**Status:** `Implemented` — PO (vastenburg) **green** 2026-09-02
**Parent:** `contracts/widgetVis-legend-keep-order-non-list-contractdelta.md`, `contracts/widgetVis-legend-normalization-contractdelta.md`, `contracts/widgetVis.md` §13
**Type:** `feature module contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-02
**Reviewed by:** `PO (vastenburg) 2026-09-02: eens — dual-era DST heuristic; exact-2 prefix; List hash-only; Cognos survivor order`

---

## 0. Product

Geschlecht (and similar) often emits **two** spaced-pipe tokens (`m` and `Männlich`). Users want the short code only.

Hash (Stelle `#` / `ALLE` / `Gesamt`) stays per segment and place-agnostic. This step runs **after** hash, on non-List vis types only.

Do **not** call `composeLegendCaptionParts` (year-duplicate when last is year; DST dropped when Jahr is last).

---

## 1. Algorithm (after hash)

Split on the same spaced-pipe delimiter as hash: `/[\s\u00A0\u2007\u202F]+\|[\s\u00A0\u2007\u202F]+/`. No delimiter → return hashed text unchanged.

Parts are trimmed. Indices:

1. **Year index** — first part matching `/^\d{4}$/`, or none.
2. **Dienststelle index**
   - If a year exists **and** that year is the **last** part **and** there is a part before it → DST = year index − 1 (LINE Dim→DST→Jahr: Jahr last).
   - Else → DST = last part (no year, **or** year not last = pre-shuffle / **Jahr-not-last** Prognose). Jahr-last Prognose with Stichtag is **not** this branch — see `widgetVis-legend-prognose-keep-stichtag-dim-collapse-contractdelta.md`.
3. **Prefix** — parts whose index is neither year nor DST, in original order.
4. **Collapse** — if prefix length is **exactly 2**, drop the second prefix part (keep the first). Length 0, 1, or ≥3: do not drop.
5. **Rejoin** survivors in **original Cognos order** with `" | "`.

Skip this entire step when `String(visType).trim().toLowerCase() === "list"` (hash-only; both dim tokens stay). Never `.includes("line")`. Never `isLineLikeVisType`. Never “token 0 is DST”.

---

## 2. Golden vectors (after hash)

| # | visType | Input | Output |
|---|---|---|---|
| D1 | `line` | `m \| Männlich \| AKH(Alle) \| 2024` | `m \| AKH(Alle) \| 2024` |
| D2 | `line` | `m \| AKH(Alle) \| 2024` | unchanged (one prefix) |
| D3 | `line` | `AKH(Alle) \| 2024` | unchanged (no prefix) |
| D4 | `com.ibm.vis.custom.prognoseyear` | `m \| Männlich \| Stelle(Alle) \| M06 \| 2024` | `m \| Stelle(Alle) \| M06 \| 2024` |
| D5 | `line` | `MAG \| 2024` | `MAG \| 2024` (not `MAG \| 2024 \| 2024`) |
| D6 | `list` | D1 input | hash-only: both dim tokens **kept** |

Prognose Jahr-last 5-token is the B delta; dual-era else-branch still covers Jahr-not-last.

---

## 3. Files

| Path | Role |
|---|---|
| `widgetVis/view/legend/collapseLegendCaptionDimParts.js` | New sibling if 150-cap; factory-scope named helpers; try/catch on export |
| `widgetVis/view/legend/legendCaptionText.js` | After hash: List → hashed; else collapse then return |
| `composeLegendCaptionParts.js` | **Deleted 2026-09-02** (dead-code cleanup). Do not revive. |
| `normalizeLegendHashSegment.js` | **Do not edit** (flags already per segment) |
| `contracts/widgetVis.md` §13 | Caption bullet: hash → (non-List) dim collapse |
| `contracts/widgetVis-legend-keep-order-non-list-contractdelta.md` | Pointer: keep-order then this collapse |

Titles / observer / flash unchanged.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | `Approved-for-implementation` | PO (vastenburg) | Dual-era DST; exact-2 prefix; List excluded; no compose revival. |
| 2026-09-02 | Implemented + review ACCEPT-WITH-NOTES | review agent 099dc0c8 | D1–D6 pass. File 85/150. Unused `isLineVisualizationType` leftover in orchestrator. |
| 2026-09-02 | `Implemented` PO green | PO (vastenburg) | App accepted. `m \| Männlich` → `m`. |
