# Contract Delta: WP2 leftover cleanup

> Name/extract only. No product change. No `settingFamily`. No C / E / toast.
> PO vastenburg 2026-09-13: cleanup WP with all leftover-only issues from the Implemented WP2 wrap-up hunt.

---

**Status:** `Implemented`
**Owner module / service:** `widgetSettings` (view/effects); `widgetVis` (copy helper name); writeback validate; `widgetSettings.css`
**Type:** `cleanup contract delta`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-13
**Reviewed by:** wrap-up dual leftover-only (dead-code + duplication hunters). PO GO this chat.
**Related rules:** `feature-structure.mdc`, `naming.mdc`, `amd.mdc`
**Family:** unchanged. KEEP-all-vis / `wzbar` / fail-close stay. Zoom hide in §2 #5 was mid-day law; **superseded** evening PO: Prognose Zoomleiste **on** (`widgetSettings-vis-toggle-panel-wp2-contractdelta.md`).

**Parents:** none (no product one-liners).

---

## 1. Purpose

Remove leftover-only mess from WP2 without changing canvas behavior.

## 2. In (all leftover issues)

| # | Issue | Fix |
|---|---|---|
| 1 | `isHostOwnedOption` twin in `dropdownOptionSelection.js` + `markPanelOption.js` | Extract `view/isHostOwnedOption.js`. Both import it. Same `closest(dropdownSelector) === host`. |
| 2 | `visKindToControl.js` exports unused `KIND_TO_CONTROL` | Keep map factory-scope. Export only `isWidgetVisKind` + `kindToControl`. |
| 3 | Snapshot barrel unused `kindToControl` + `readEffectiveVisSnapshot` | Drop those two from the return. **Keep** `isWidgetVisKind` (callers). Keep internal `buildEffectiveVisSnapshot`. |
| 4 | `appendExplicitShowValues` / `copyOptionalShowValues` also copy iterator/zoom/grouping | Rename to `appendExplicitVisOverrides` / `copyOptionalVisOverrides`. Same body. Do not merge the four-site boolean copies. |
| 5 | Zoom-hide CSS lists IBM Prognose ids that stamp never writes | Drop `com.ibm.vis.custom.prognoseyear` and `prognoseyearlinechart` from zoom hide. Keep `pie` + `prognose` (panel + focus). Do not add those ids to iterator hide. |
| 6 | `validateWidgetFields.js` three `0\|1` branches | One branch: `vals` \| `iter` \| `wzbar`; message still names the field. |

## 3. Out

- `_KDB.services.settingFamily` / registry / shared boolean copier
- Deleting pipeline `iterator`/`zoom` copies (`handleApplyStartupSettings` / binding helpers) — envelope, not dead
- Merging kind maps / CSS pill blocks / Frozen showValues
- `handleApplySetting.js`, `applyShowValues.js`, `definitions.js`, `KDB.js`, `sorting.js`
- Product / chrome / apply allowlists

## 4. Walls

Every touched JS file ≤150. New helper ≤30. AMD +1 on the two mark files. Bind stays 214 / ≤220 (do not edit).

## 5. Canvas

No new beat. Mid-day leftover did not change product. Evening WP2: Prognose Zoomleiste **shown**.

---

## Approval log

| Date | Status | Notes |
|---|---|---|
| 2026-09-13 | `Approved` | PO: cleanup WP with all leftover issues. |
| 2026-09-13 | `Implemented` | Dual GREEN. Mechanical HOLD was prior W-PROG-HIDE dirt on applyIteratorZoom, not this wave. No canvas beat. |
