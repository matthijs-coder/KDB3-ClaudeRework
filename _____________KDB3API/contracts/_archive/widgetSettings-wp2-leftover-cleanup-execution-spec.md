# Execution Spec: WP2 leftover cleanup

> Mechanical. Architecture: `contracts/widgetSettings-wp2-leftover-cleanup-contractdelta.md` (**Approved**).
> Echo Section A first. Do not stamp Implemented. Do not start settingFamily / C / E / toast.

---

**Status:** `Executed` — leftover dual GREEN. Implemented.
**Module / contract:** widgetSettings-wp2-leftover-cleanup
**Phase:** cleanup
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-13
**Executing AI:** grok 4.6 army
**Reviewer:** captain + dual grok 4.6

---

## Section A. Pre-flight

Echo one sentence each, no bodies: kdb-object, state, runtime, module-public-api, events, feature-structure, naming, error-handling, dom, amd.

Then the cleanup delta. Then this spec.

Also echo: `wzbar` (5); no `settingFamily`; no Frozen showValues apply; walls ≤150; bind do-not-edit.

Production root: `_____________KDB3API/`. Paths under `KDB3/js/` unless noted.

Four exclusive writers, **parallel**.

---

## W-HOST

**May edit / add:**
- `dashboard/widgets/widgetSettings/view/isHostOwnedOption.js` (new, ≤30, AMD 1)
- `dashboard/widgets/widgetSettings/view/dropdownOptionSelection.js` (63→≤80, AMD 1→2)
- `dashboard/widgets/widgetSettings/view/markPanelOption.js` (45→≤50, AMD 1→2)

**Change:** Move the twin `isHostOwnedOption` into the new file. Both callers import and use it. Predicate stays `closest(_selectors.dropdownSelector) === host`. Same try/catch / log-or-rethrow as live. No bind/CSS.

## W-SNAP

**May edit:**
- `dashboard/widgets/widgetSettings/effects/visKindToControl.js`
- `dashboard/widgets/widgetSettings/effects/buildWidgetVisSettingsSnapshot.js` (144, slack 6)

**Change:** Stop exporting `KIND_TO_CONTROL` (keep as factory const). Snapshot return: drop `kindToControl` and `readEffectiveVisSnapshot`. Keep `isWidgetVisKind` + `build` / batch exports. Rename `appendExplicitShowValues` → `appendExplicitVisOverrides` (internal only). Do not change copy behavior.

**Must not:** finalize / downstream callers (they use `isWidgetVisKind` / `build`).

## W-NAME

**May edit:**
- `dashboard/widgets/widgetVis/effects/readEffectiveSettingsContext.js`

**Change:** Rename `copyOptionalShowValues` → `copyOptionalVisOverrides`. Same body, same call sites in this file. AMD unchanged.

## W-CSS-VAL

**May edit:**
- `KDB3/css/widgets/widgetSettings.css` (zoom-hide selectors ~720–728 only)
- `core/services/writeback/schema/validate/validateWidgetFields.js` (67)

**Change:** Drop IBM Prognose ids from zoom hide; keep `pie` + `prognose` on panel and focus. Validate: one `0|1` branch for `vals|iter|wzbar`; diagnostic text still includes the field name. File ≤150.

---

## Nobody

`handleApplySetting.js`, Frozen showValues, `handleApplyStartupSettings.js`, `parameterSetBindingHelpers.js` (inline copies stay), bind, stamp, populate, `KDB.js`, `sorting.js`, `.mdc`, settingFamily.

---

## Acceptance

- Per-host mark still isolates nest pills (no Werte-anzeigen wipe of extras).
- Snapshot callers still resolve `isWidgetVisKind` / `build`.
- GET/validate still reject non-`0|1` for `iter` / `wzbar` / `vals`.
- Mid-day: Prognose Zoomleiste hidden via `data-kdb-vis-type="prognose"`. **Superseded** evening: Prognose zoom **on** (WP2 contractdelta).
