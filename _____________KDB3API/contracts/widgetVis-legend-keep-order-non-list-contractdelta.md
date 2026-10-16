# Contract Delta: legend keep-order for all non-List vis types

> Extends `contracts/widgetVis-legend-line-dst-first-contractdelta.md` (L1 LINE keep-order) to **every vis type except List**.
> Ships with `contracts/widgetVis-series-dim-dst-jahr-order-contractdelta.md`.
> Compose algorithm file stays unmodified and is **no longer called** from the live orchestrator.

---

**Status:** `Implemented` — PO (vastenburg) **green** 2026-09-02
**Parent:** `contracts/widgetVis-legend-normalization-contractdelta.md`, `contracts/widgetVis.md` §13
**Type:** `feature module contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-02
**Reviewed by:** `PO (vastenburg) 2026-09-02: keep-order captions for all non-List; List hash-only (already equivalent)`

---

## 0. Why

L1 skipped `composeLegendCaptionParts` only when `toLowerCase() === "line"`. Prognose / stacked / pie still composed `[prefix | year | last]`, which drops middle tokens (vector 8 dropped `Männlich`) and assumed Dienststelle last.

PO product: captions keep Cognos spaced-pipe order after hash for **all** vis types other than List. List was already hash-only. Hash-only and LINE keep-order are the same assemble step. After this delta the orchestrator **never** calls compose.

Prognose **series** stay Jahr-first this PR. **Captions (2026-09-02 follow-up):** after keep-order hash, non-List vis types collapse exactly-two dimension tokens (`m | Männlich` → `m`). List stays hash-only (both tokens). See `contracts/widgetVis-legend-dim-token-collapse-contractdelta.md`. Do **not** call compose.

---

## 1. Caption assemble

After per-segment hash (`readHashFlags` unchanged, vis-agnostic):

- Return the hashed spaced-pipe string in Cognos order for **every** `visType`, including `null` / empty / Prognose ids / stacked / pie / LINE.
- Do **not** call `composeLegendCaptionParts`.
- **Superseded 2026-09-02:** `composeLegendCaptionParts.js` **deleted** (`contracts/widgetVis-legend-compose-dead-code-cleanup-contractdelta.md`). Historical algorithm remains in `widgetVis-legend-normalization-contractdelta.md`.
- Remove the compose AMD import from `legendCaptionText.js` so there is no dead import.
- Gate must **not** use `.includes("line")` or `isLineLikeVisType`. After this change caption assemble does not need a visType branch. Keep `isLineVisualizationType` for **titles** only (`sanitizeLegendTitleLine` vs `replaceTooltipInLegendTitle`).

List remains hash-only (no behavior change).

Golden vectors 1–11 of the 2026-08-26 parent remain the **hash** step. Their **compose** outputs are no longer the live contract for any vis type. Live captions match hashed Cognos order (LINE vectors L1–L5 style: keep extra dim tokens; `(Alle)` on the Gesamt hash segment wherever it sits).

---

## 2. Titles / observer

Unchanged from L1:

- LINE titles: `sanitizeLegendTitleLine` (dim before DST leftover `Dienststelle-Geschlecht` is correct).
- Prognose and others: `replaceTooltipInLegendTitle`.
- Observer captions-only; no `.lgd-title`; no `KDB_visible` from observer.

---

## 3. Files

| Path | Role |
|---|---|
| `widgetVis/view/legend/legendCaptionText.js` | After hash, return hashed text; drop compose call + import |
| `widgetVis/view/legend/composeLegendCaptionParts.js` | **Deleted 2026-09-02** (dead-code cleanup). |
| `contracts/widgetVis-legend-normalization-contractdelta.md` | Pointer: compose not live; keep-order all vis types; vectors 1–11 = hash only |
| `contracts/widgetVis.md` | §13 caption bullets: hash then keep-order; compose unused |

Do not edit bindingSpecs / planner slots from the legend agent.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | `Approved-for-implementation` | PO (vastenburg) | Keep-order all non-List. Compose file stays, not called. Prognose captions keep-order even while series stay Jahr-first. |
| 2026-09-02 | Implemented + review ACCEPT-WITH-NOTES | review agent c391459a | Compose unused. Live vector 8 keeps `Männlich`. Unused `isLineVisualizationType` in `legendCaptionText.js` (title gate is in `runLegendSanitizers`). |
| 2026-09-02 | `Implemented` PO green | PO (vastenburg) | App accepted. Compose file later deleted (cleanup delta). |
