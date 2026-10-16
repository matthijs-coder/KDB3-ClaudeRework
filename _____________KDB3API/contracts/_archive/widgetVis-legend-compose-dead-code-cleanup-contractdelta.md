# Contract Delta: remove unused legend compose file + dead LINE helper

> PO (vastenburg) 2026-09-02: clean dead production after Dim→DST→Jahr / dim-collapse. Historical compose algorithm stays in `widgetVis-legend-normalization-contractdelta.md` (not live).

---

**Status:** `Implemented` — PO (vastenburg) **green** 2026-09-02
**Type:** `cleanup`
**Reviewed by:** `PO (vastenburg) 2026-09-02: ja — delete unused compose file; remove unused isLineVisualizationType from legendCaptionText.js; keep moveToIndex and historical deltas`

---

## Do

1. **Delete** `KDB3/js/dashboard/widgets/widgetVis/view/legend/composeLegendCaptionParts.js` (zero AMD callers).
2. **Remove** unused `isLineVisualizationType` from `legendCaptionText.js` only. Title gate stays in `runLegendSanitizers.js`. Keep `isListVisualizationType`. Public AMD exports unchanged.
3. Parent sync: `widgetVis.md` §13 (drop “remains in tree unused”) and §17 (remove the compose file from the tree). `widgetVis-legend-keep-order-non-list-contractdelta.md`: “do not delete compose” superseded by this delta.

## Do not

- Delete or change `moveToIndex` in `insertHierarchyId`.
- Delete historical contract deltas / execution specs.
- Touch `collapseLegendCaptionDimParts.js` algorithm, hash, observer, slots, `KDB.js`.
- Revive compose.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | `Approved-for-implementation` | PO (vastenburg) | Dead compose file + unused LINE helper only. |
| 2026-09-02 | Implemented (code) | subagent 9cec00d5 | File deleted; helper removed; greps zero. Review pending. |
| 2026-09-02 | Review ACCEPT | review agent 2ac97f5a | Compose gone; title gate and `moveToIndex` intact. |
| 2026-09-02 | `Implemented` PO green | PO (vastenburg) | Cleanup accepted with the rest of this work. |
