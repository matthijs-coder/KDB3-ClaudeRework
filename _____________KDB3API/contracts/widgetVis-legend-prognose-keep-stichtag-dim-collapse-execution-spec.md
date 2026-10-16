# Execution Spec: Prognose legend keep-Stichtag dim collapse (product B)

> Architectural decisions live in `contracts/widgetVis-legend-prognose-keep-stichtag-dim-collapse-contractdelta.md`. Do not invent. No JS until PO greens implementation after this spec is army-checked.

---

**Status:** `Executed` — review ACCEPT-WITH-NOTES (`dae90179`); adversarial CLEAN (`89fa9aef`)
**Delta (authority):** `_____________KDB3API/contracts/widgetVis-legend-prognose-keep-stichtag-dim-collapse-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-06
**Executing AI:** grok 4.6 Agent B `a610bc5c-a19b-430c-bd42-3c7a7fe7d26f`
**Reviewer:** fresh grok 4.6 review after implementation

No harness. Production tree `_____________KDB3API/` only.

---

## Exclusive allowlist (Agent B)

**May edit:**

- `_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/view/legend/collapseLegendCaptionDimParts.js`
- `_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/view/legend/legendCaptionText.js`
- `_____________KDB3API/contracts/widgetVis-legend-dim-token-collapse-contractdelta.md` — D4 retarget + pointer only
- `_____________KDB3API/contracts/widgetVis.md` — §13 caption bullet (3) + changelog one row
- `_____________KDB3API/contracts/widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md` — §2 close B (if captain has not already)

**Must not edit:** hash / `normalizeLegendHashSegment.js`; observer / flash / `KDB_visible`; title helpers; `bindingSpecs.js`; `applySlotComposition.js`; `resolveSlotColumnIds.js`; `KDB.js`; compose (deleted — do not revive); `.cursor/rules/**`.

If `collapseLegendCaptionDimParts.js` would exceed **150** lines: extract a factory-scope sibling (e.g. `reservePrognoseLegendTailParts.js`) instead of growing past the cap. Do not rewrite dual-era to “save lines”. `legendCaptionText.js` is already near 111/150 — keep the orchestrator thin (List skip + pass visType / flag).

Hard cap: JS file 150. `__controller` 60 does **not** apply to these helpers. No git commit/push.

---

## Section A. Pre-flight

Read, then echo **one sentence each** in the final report (captain pre-authorizes proceeding after echoes; do not wait for a second turn **once PO has greened implementation**):

1. `kdb-object.mdc`
2. `state.mdc`
3. `runtime.mdc`
4. `module-public-api.mdc`
5. `events.mdc`
6. `feature-structure.mdc`
7. `naming.mdc`
8. `error-handling.mdc`
9. `dom.mdc`
10. `amd.mdc`
11. `cognos-adapter.mdc` — D4: no new facet; captions are DOM text, not Cognos ops
12. Authority B delta + this spec
13. Live `collapseLegendCaptionDimParts.js` + `legendCaptionText.js` (no dumps)
14. Collapse dual-era §1 freeze (LINE year−1 DST) + `widgetVis.md` §13 caption bullets only

Confirm `normalizeVisualizationType` exists and aliases both IBM ids → `"Prognose"`. Prefer that check. Confirm callers already pass `settings.visType` into `legendCaptionText` / sanitizers (observer included).

---

## Section C. Per-file

#### `collapseLegendCaptionDimParts.js`

- **Role:** caption collapse helper.
- Keep dual-era path **byte-same** for non-B.
- B-branch **only** when Prognose + `n >= 5` + `parts[n-1]` matches `/^\d{4}$/` (not `findFirstYear`):
  - Reserve keep: index `n-1` Jahr, `n-2` Stichtag, `n-3` DST
  - Prefix = `parts.slice(0, n - 3)` (n=5 → indices 0 and 1). **Forbidden:** `slice(0, n-4)`
  - Exact-2 drop on that prefix only
  - Rejoin Cognos order `" | "`. **Return. Do not run dual-era on survivors.**
- Non-B: live dual-era **instead of** B, never after B.
- **Forbidden:** only moving DST to year−2 without reserving Stichtag; month regex; `.includes("line")`; `.includes("prognose")`; `isLineLikeVisType`; any substring visType gate.
- Signature: accept `_hashedText` and `_visType` (or a boolean `_reservePrognoseTail` already gated by the orchestrator). Underscore on boundary params. Factory-scope named helpers. try/catch on export.
- **Rules:** amd, naming, error-handling, feature-structure ≤150, cognos-adapter (no facet).

#### `legendCaptionText.js`

- List skip **first**, unchanged: `String(visType).trim().toLowerCase() === "list"` → hashed only, **never call collapse**.
- Non-List: call collapse once with visType (or Prognose flag). One collapse path per caption.
- Prognose detection: preferred `normalizeVisualizationType(visType) === "Prognose"`. Fallback: exact-equals `com.ibm.vis.custom.prognoseyear` **or** `com.ibm.vis.custom.prognoseyearlinechart`. Never raw-only `=== "Prognose"`. Never `.includes("line")`. Never `.includes("prognose")`.
- If using `_reservePrognoseTail` boolean: the orchestrator that sets it MUST use the same Prognose check; a Cognos-id-only setter is a silent no-op on live dropdown.
- Titles not in this file’s job. Do not change title branch in sanitizers.
- Titles not in this file’s job. Do not change title branch in sanitizers.
- **Rules:** amd, naming, error-handling, feature-structure ≤150, events/dom (text only).

#### Collapse parent delta D4

Replace live D4 row with B1 (new D4). Park old Jahr-first D4 in the B delta table (already there as B8) and one pointer sentence on the collapse delta: “Prognose Jahr-last 5-token is the B delta; dual-era else-branch still covers Jahr-not-last.”

Do not change D1–D3, D5, D6.

#### `widgetVis.md` §13

**Do not rewrite** the global “exactly-two prefix dim tokens” sentence into reserve-3 (that would break LINE D1). **Verbatim add** after it: Exception — Prognose only (`normalizeVisualizationType === "Prognose"` or exact IBM ids): when hashed `parts.length >= 5` and the last part is a 4-digit year, reserve DST+Stichtag+Jahr (keep) then exact-2 on the remaining prefix; do not run dual-era on that result. Authority: the B delta. Changelog one row.

---

## Section J. Acceptance

Must pass (hashed inputs):

1. B1 visType `com.ibm.vis.custom.prognoseyear` → `m | Stelle(Alle) | M06 | 2024` (Stichtag kept). Fail if unchanged 5-token (dead gate).
2. B1-belt visType `com.ibm.vis.custom.prognoseyearlinechart` → same as B1
3. B3 3-token → unchanged
4. B4 4-token DST-omit dim-pair → `m | M06 | 2024`
5. MAG 4-token → live dual-era `MAG | M06 | 2024` (Stelle dropped — residual, not a fail if documented)
6. B6 List → no collapse (skip before collapse)
7. B7 LINE D1 unchanged
8. B7b visType `line` + B1 5-token input → **unchanged** 5-token (B must not run)
9. B8 Jahr-first Prognose → dual-era `m | 2026 | M06(Alle)`
10. B9 empty visType + B1 input → uncollapsed 5-token
11. No `.includes("line")` / `.includes("prognose")`. No compose revival. No Stichtag drop on B1. No sequential B+dual-era. No `slice(0, n-4)`. No slot file edits. Both JS files ≤150.

Stop if the contract cannot be followed.

---

## Section K. Forbidden

- Production JS outside the two legend files (+ optional new sibling under `view/legend/` if 150-cap)
- Any substring visType gate (`.includes("line")`, `.includes("prognose")`, `isLineLikeVisType`)
- Shared Line+Prognose reverse helper; sequential B then dual-era; `slice(0, n-4)`
- visType switch in `resolveSlotColumnIds`
- Compose revival; commit / push
- Legacy trees: `_______KDB3`, `_______REDESIGN2`, `_remediation_backup`, `laatsteOriginal`

---

## Section L. Report (SHORT)

Pre-flight echoes; file checklist + line counts; vector table B1/B1-belt/B3/B4/MAG/B6/B7/B7b/B8/B9; confirm LINE dual-era untouched; exclusive B-or-dual-era; D4; open questions.
