# Contract Delta: Prognose legend — keep Stichtag, collapse dim (product B)

> Sibling of `contracts/widgetVis-legend-dim-token-collapse-contractdelta.md`. Does **not** rewrite LINE dual-era. Does **not** drop Stichtag. Does **not** revive `composeLegendCaptionParts.js`.
> Slots already ACCEPT: `contracts/widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md`. This delta is captions only.
> PO (vastenburg) 2026-09-06: army stress-test of B; captain recommendation held with two MUST-FIX refinements (reserve three tail slots; dropdown visType, not Cognos-id-only).

---

**Status:** `Implemented` — Jahr-last B live; **gate/tail superseded** by `widgetVis-prognose-jahr-before-stichtag-segmentindex-contractdelta.md` §3 (Jahr at n-2). Dual-era LINE freeze still holds.
**Parent:** `widgetVis-legend-dim-token-collapse-contractdelta.md`, `widgetVis-legend-keep-order-non-list-contractdelta.md`, `widgetVis.md` §13
**Type:** `feature module contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-06
**Reviewed by:** army contract CLEAR `74ea9528`; PO (vastenburg) implement-green 2026-09-06

---

## 0. Product lock

Keep Stichtag in Prognose legend captions. Collapse the Geschlecht-style dim pair only (`m | Männlich` → `m`).

Typical hashed 5-token (dim-pair + DST + Stichtag + Jahr):

```text
m | Männlich | Stelle(Alle) | M06 | 2024
→
m | Stelle(Alle) | M06 | 2024
```

- Stichtag stays (series member). Dropping it is Option C — **out of scope**.
- LINE D1–D3, D5 and List D6 stay frozen.
- 4-token Prognose stays on **live dual-era** (no B-branch).
- Titles stay `replaceTooltipInLegendTitle` (LINE titles remain `=== "line"` only).
- No new Cognos facet. No `segmentIndex`. No slot / `bindingSpecs` edits.

---

## 1. Why dual-era is not enough

Live collapse skips **year + DST only**. Jahr-last Prognose is `… | DST | Stichtag | Jahr`, so DST is mis-read as Stichtag. Prefix becomes three parts → exact-2 does not fire. **Only moving DST to year−2 without reserving Stichtag** still leaves Stichtag in the prefix (`[m, Männlich, M06]`, length 3) → still no drop. **Forbidden implementation.**

Token count cannot separate LINE D1 (`m | Männlich | DST | Jahr`, 4 tokens) from Prognose MAG (`MAG | Stelle | M06 | Jahr`, 4 tokens). Therefore B is **Prognose-only**. A global year−2 rule would break LINE D1.

---

## 2. visType gate (Prognose-only)

Callers pass `settings.visType` (dropdown **value**), not the Cognos bindingSpecs bucket.

| Role | Exact string | Must match B? |
|---|---|---|
| Live dropdown / `settings.visType` | `com.ibm.vis.custom.prognoseyear` | **yes — this is what flows** |
| Cognos / `bindingSpecs` bucket | `com.ibm.vis.custom.prognoseyearlinechart` | yes (belt if it leaks into legend) |
| Catalog / `normalizeVisualizationType` target | `Prognose` | yes **only** via the existing normalizer, never as the sole raw `=== "Prognose"` check |
| UI dropdown **label** | `Prognose` | not stored as `settings.visType` |
| LINE | `line` | **never** |
| List | `list` | skip collapse in `legendCaptionText.js` (unchanged) |

**Canonical check (preferred):** existing `normalizeVisualizationType(_visType) === "Prognose"` (already aliases the two IBM ids + `prognose` + `Prognose`).

**Fallback** if that helper cannot be imported without breaking 150 / 10-import caps: `String(_visType).trim()` exact-equals **either** IBM id. Do **not** use raw `=== "Prognose"` as the only check (misses live dropdown). Do **not** `.includes("line")`. Do **not** `.includes("prognose")`. Do **not** `isLineLikeVisType`. No substring visType gates.

Null / empty visType: **not** Prognose → live dual-era (5-token dim-pair stays uncollapsed).

---

## 3. Algorithm (after hash, non-List)

> **Superseded B-gate:** Jahr-last (`parts[n-1]`) and reserve `n-1` Jahr / `n-2` Stichtag below are **not** live. Live B: `widgetVis-prognose-jahr-before-stichtag-segmentindex-contractdelta.md` §3 (`parts[n-2]` Jahr; reserve n-1 Stichtag, n-2 Jahr, n-3 DST; prefix `slice(0, n-3)`). Dual-era LINE freeze in the else-path still holds.

Same split as collapse: `/[\s\u00A0\u2007\u202F]+\|[\s\u00A0\u2007\u202F]+/`. Trim parts. `n = parts.length`.

**B-branch** when **all** hold:

1. visType is Prognose per §2
2. `n >= 5`
3. last part `parts[n - 1]` matches `/^\d{4}$/` (Jahr last — **this index**, not live dual-era `findFirstYear === last`). Index-only; **no** month regex.

Then **exactly one** collapse path (never B then dual-era on the survivors — that would drop DST from B1):

- Reserve (keep): `n-1` Jahr, `n-2` Stichtag, `n-3` DST
- Prefix = `parts[0]` through `parts[n-4]` **inclusive** (JS: `parts.slice(0, n - 3)`). For `n === 5` the prefix is **exactly** indices `0` and `1` (`m`, `Männlich`). `slice(0, n-4)` is **forbidden** (one token → silent no-op).
- If prefix length is **exactly 2**, drop prefix[1]; else no drop (0, 1, ≥3)
- Rejoin survivors in **original Cognos order** with `" | "`. Return. **Do not** run dual-era on that result.

**Else:** live dual-era **byte-same** (`widgetVis-legend-dim-token-collapse-contractdelta.md` §1). Do not rewrite year−1 DST for LINE. Do not reuse `findFirstYear` as the B predicate.

Stichtag token shape is index-only (`M06`, hashed `M06(Alle)`, `PKZ`). Do not detect months by regex (`Jun` / `Juni` collide with org codes; `M06` is also a DST golden in old D4).

List skip stays **first** in `legendCaptionText.js` (`toLowerCase() === "list"` → hashed only, never call collapse). Collapse may receive visType for the Prognose branch; non-Prognose must run today’s dual-era **instead of** B, not after B.

---

## 4. Golden vectors (after hash)

| # | visType | Input | Output |
|---|---|---|---|
| B1 / new D4 | `com.ibm.vis.custom.prognoseyear` | `m \| Männlich \| Stelle(Alle) \| M06 \| 2024` | `m \| Stelle(Alle) \| M06 \| 2024` |
| B1-belt | `com.ibm.vis.custom.prognoseyearlinechart` | same as B1 | same as B1 |
| B3 | `com.ibm.vis.custom.prognoseyear` | `Stelle(Alle) \| M06 \| 2024` | unchanged (n=3, no B-branch) |
| B4 | `com.ibm.vis.custom.prognoseyear` | `m \| Männlich \| M06 \| 2024` | `m \| M06 \| 2024` (4-token dual-era; Stichtag in DST slot) |
| MAG residual | `com.ibm.vis.custom.prognoseyear` | `MAG \| Stelle(Alle) \| M06 \| 2024` | `MAG \| M06 \| 2024` (**live dual-era**; Stelle dropped — not a fake B pass) |
| B6 | `list` | B1 input | B1 input unchanged (hash-only; List skip **before** collapse) |
| B7 / D1 | `line` | `m \| Männlich \| AKH(Alle) \| 2024` | `m \| AKH(Alle) \| 2024` |
| B7b | `line` | B1 5-token input | dual-era only (prefix length 3 → **unchanged** 5-token; B-branch **must not** run) |
| B8 / parked old D4 | `com.ibm.vis.custom.prognoseyear` | `m \| Männlich \| 2026 \| M06(Alle)` | `m \| 2026 \| M06(Alle)` (Jahr not last → dual-era) |
| B9 | `null` / `""` | B1 input | B1 input unchanged (not Prognose; prefix length 3) |
| D2 D3 D5 D6 | as collapse delta | unchanged | unchanged |

6-token (e.g. MAG + dim-pair + DST + Stichtag + Jahr): B-branch fires; prefix length 3 → **no** dim drop. **Never** a second collapse pass on any B or dual-era result.

---

## 5. Files

| Path | Role |
|---|---|
| `widgetVis/view/legend/collapseLegendCaptionDimParts.js` | B-branch: reserve three tail indices then exact-2; else dual-era. Grow in place if ≤150; else new sibling. Pass `_visType` (or a boolean already gated by the orchestrator). try/catch on export. |
| `widgetVis/view/legend/legendCaptionText.js` | Keep List skip. Pass visType into collapse (or gate Prognose here and pass a reserve-tail flag). Prefer existing `normalizeVisualizationType`. |
| `contracts/widgetVis-legend-dim-token-collapse-contractdelta.md` | Pointer + D4 retarget to B1; park old Jahr-first D4 |
| `contracts/widgetVis.md` §13 | **Verbatim add** after the existing non-List exact-2 sentence (do **not** rewrite that global sentence into reserve-3): Exception — Prognose only (`normalizeVisualizationType === "Prognose"` or exact IBM ids): when hashed `parts.length >= 5` and the last part is a 4-digit year, reserve DST+Stichtag+Jahr (keep) then exact-2 on the remaining prefix; do not run dual-era on that result. Authority: this B delta. |
| `contracts/widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md` §2 | Close PO gate: B chosen |

**Do not edit:** hash file, observer/flash/`KDB_visible`, titles, `bindingSpecs.js`, slots, `KDB.js`, LINE dual-era for non-Prognose, compose (deleted).

---

## 6. Out of scope

- Option A / C
- Dropping Stichtag from captions
- Changing LINE / List / stacked / pie **slots**
- Global dual-era rewrite
- Month/org regex DST detection
- Title helpers, tooltip-text rewrite, empty Stelle, TopN `slotsChanged`

---

## 7. If this cannot be done

If B1 cannot be produced without `.includes("line")`, a visType switch in `resolveSlotColumnIds`, dropping Stichtag, or growing a file past 150 without a sibling split: **stop**, PO, do not improvise.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-06 | `Draft` (army-checked holes patched; JS still needs PO implement-green) | coordinator | Exclusive B-or-dual-era; inclusive prefix `slice(0, n-3)`; last-part year gate; dropdown id on B1; no substring visType. |
| 2026-09-06 | `Approved-for-implementation` | PO (vastenburg) | Implement-green. Agent B legend JS. |
| 2026-09-06 | `Implemented` + review ACCEPT-WITH-NOTES | Agent B `a610bc5c`; review `dae90179` + adversarial CLEAN `89fa9aef` | B1 keeps Stichtag. LINE D1/B7b frozen. Exclusive B-or-dual-era. Notes: futureTodo/series status (captain stamp). |
| 2026-09-07 | Jahr-last B-gate superseded (pointer) | Agent B (legend retarget) | Live B is §3 of `widgetVis-prognose-jahr-before-stichtag-segmentindex-contractdelta.md`. Dual-era LINE freeze unchanged. |
