# Contract Delta: TopN helper Dienststelle local filter

> Delta on top of `contracts/widgetTopN.md` §8.1.1.
> The TopN helper Dienststelle local filter writes the raw host caption as Cognos `d` and sets `type` to null. The visible Dienststelle label stays the sanitized caption. Jahr, Monat, and non-helper hierarchy filters keep `type: "display"`.

---

**Status:** `Draft`
**Parent contract:** `contracts/widgetTopN.md` §8.1.1
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.7 coordinator, 2026-10-16
**Reviewed by:** pending subagent review

---

## 1. What this delta changes

The helper hierarchy filter was stamping `type: "display"` and sending the sanitized Dienststelle caption as `values[].d`. Cognos then cannot resolve the member the way the host caption does, and the next host read loses the coded caption.

This slice keeps the sanitized string on the visible label and on `displayValue`. It stores the pre-sanitize host caption on each value as `hostDisplay` (`_raw.d` when present, otherwise `_raw.display`). The hierarchy snapshot carries a parallel `hostDisplayValues` array. The TopN helper local filter uses that raw caption as `d` and passes `type: null` through to `addFilter`.

`skipDisplayType` is set only when `targetKind === "topNHelper"`. Jahr and Monat do not set it. A non-helper hierarchy filter sets it false and still receives `type: "display"`.

---

## 2. Filter shape

The TopN helper Dienststelle local filter is written to Cognos as:

```js
{
  itemId: "[Personal_KDB_TM1].[Dienststelle].[Dienststelle_DEZPV]",
  exclude: false,
  action: "keepexclude",
  overrideHierarchyDefaultSelection: true,
  type: null,
  values: [{
    d: "M06|3g_Ref_ZEB#3g_Ref_ZEB - Zentrale Einbringung",
    u: "<member unique name already rewritten onto Personal_KDB_TM1>"
  }]
}
```

- `itemId` stays the hierarchy item id already produced for `Dienststelle_DEZPV`. Do not hardcode a member.
- `exclude` stays false. `action` stays `keepexclude`. `overrideHierarchyDefaultSelection` stays true.
- `type` is the value null. It is not the string `"display"`, and it is not omitted so that a later stamp can fill `"display"`.
- `values[0].d` is the raw host caption. Example: `M06|3g_Ref_ZEB#3g_Ref_ZEB - Zentrale Einbringung`.
- `values[0].u` is the member unique name already rewritten onto `Personal_KDB_TM1`. This slice does not change `u`.

Value entries gain `hostDisplay`, the raw caption before sanitize. `displayValue` stays the sanitized label.

The hierarchy snapshot resolution gains `hostDisplayValues`, a string array parallel to `displayValues`, same length and order. An entry with no host caption contributes `""`. The helper uses `hostDisplayValues[index]` when that string is non-empty, otherwise `displayValues[index]`, as `values[].d`.

---

## 3. What stays

**Visible label.** The sanitized caption stays the visible Dienststelle label. Example: `3g_Ref_ZEB - Zentrale Einbringung`. `sanitizeDienststelleVisibleLabel.js` is unchanged. `displayValue` stays that sanitized string.

**Jahr and Monat.** Helper Jahr include and Monat include keep `type: "display"`. Their `d` and `u` stay equal. They do not set `skipDisplayType`.

**Non-helper hierarchy filters.** A vis hierarchy filter whose `targetKind` is not `"topNHelper"` keeps the current `type: "display"` stamp.

**`u` rewrite.** Member unique names stay on the existing rewrite onto `Personal_KDB_TM1`. This slice does not change `u`.

**Host write round-trip.** A later KDB write of the same Dienststelle value through `toCognosValues` (history and tab-scope apply) sends Cognos `d` = `hostDisplay` when that string is non-empty, otherwise the existing `displayValue`. `u` stays `useValue`. The next host read can capture the raw caption again. A default value with no `hostDisplay` still writes `displayValue`.

---

## 4. Golden vectors

| # | Input | Result |
|---|---|---|
| 1 | Host `d` is `M06\|3g_Ref_ZEB#3g_Ref_ZEB - Zentrale Einbringung` | Sanitized label and `displayValue` are `3g_Ref_ZEB - Zentrale Einbringung`. `hostDisplay` is the raw caption. Helper local filter `d` equals the raw caption, `type` is null, `u` is the rewritten member unique name. The visible label stays the short caption. |
| 2 | Jahr include and Monat include on the helper | Both filters still have `type: "display"`. `d` and `u` are equal. `skipDisplayType` is not set on those descriptors. |
| 3 | A later KDB write of that Dienststelle value (history / tab scope apply via `toCognosValues`) | Cognos `d` is `hostDisplay` when `hostDisplay` is a non-empty string, otherwise the existing `displayValue`. The next host read can capture the raw caption again. |

---

## 5. Out of scope

- Parent sync of `contracts/widgetTopN.md` and `contracts/widgetVis.md` (after stamp).
- The period-pin delta and its execution spec.
- `sanitizeDienststelleVisibleLabel.js`.
- `waitForQueryResult.js`, `reloadNewestStichtagPeriodPin.js`, `resolveTopNJahrFilterValue.js`, `applyTopNJahrMismatchPin.js`.
- `syncDienststelleFromSicht.js` and `handleDienststelleHistoryReplay.js`. The reducer does not store those selection literals.
- Removing any TEMP console log, including `[sicht-jahr] TEMP dienststelle value`, `[sicht-jahr] TEMP local filter`, `[sicht-jahr] TEMP helper hierarchy`, and the helper stay-on-canvas / skip-reset TEMP.
- Hardcoding a Dienststelle member.
- Changing Jahr or Monat `d` / `u`.
- Commit or push.

---

## 6. Files

| Path | Change |
|---|---|
| `KDB3/js/dashboard/filters/dienststelle/effects/normalizeCognosDienststelleSelection.js` | `normalizeHostValue` adds `hostDisplay` as the raw caption before sanitize. TEMP log stays. |
| `KDB3/js/dashboard/filters/dienststelle/state/copyDienststelleValueEntries.js` | `copyValueEntry` copies `hostDisplay`, `""` when absent. |
| `KDB3/js/dashboard/filters/dienststelle/state/selectors.js` | `copySelectionValues` copies `hostDisplay`, `""` when absent. |
| `KDB3/js/dashboard/filters/dienststelle/actions/tabMutation/prepareTabMutation.js` | `cloneValues` copies `hostDisplay`, `""` when absent. |
| `KDB3/js/dashboard/filters/dienststelle/actions/tabMutation/applyTabMutationScopeOps.js` | `cloneValues` copies `hostDisplay`, `""` when absent. |
| `KDB3/js/dashboard/filters/dienststelle/effects/readDienststelleConfirmHistorySnapshot.js` | `toValueObject` copies `hostDisplay`, `""` when absent. |
| `KDB3/js/dashboard/filters/dienststelle/effects/buildVisualizationWidgetDienststellePayload.js` | Rebuilt selection copies `hostDisplay` so the normalize fallback can see it. |
| `KDB3/js/dashboard/filters/dienststelle/effects/dienststelleScopeApplySupport.js` | `toCognosValues` writes `d` from `hostDisplay` when that string is non-empty, otherwise `displayValue`. |
| `KDB3/js/dashboard/filters/dienststelle/effects/applyDienststelleDefault.js` | Same `d` preference. No `hostDisplay` keeps today's `displayValue`. |
| `KDB3/js/dashboard/filters/dienststelle/effects/collectAlignedHostDisplays.js` | **New.** One function. Array input mirrors `extractDisplayValues` and pushes the raw `hostDisplay` or `""`. Scope-map input returns page-context host captions index-aligned with `displayValues`. |
| `KDB3/js/dashboard/filters/dienststelle/effects/readCurrentHierarchySnapshot.js` | Puts `hostDisplayValues` on the resolution beside `displayValues`. One new import. |
| `KDB3/js/dashboard/widgets/widgetVis/effects/normalizeHierarchySnapshot.js` | Copies `hostDisplayValues` when the source array exists. Selection fallback with a non-empty `hostDisplay` sets `[that string]`. |
| `KDB3/js/core/services/widgetBindingPlan/filters/buildHierarchyFilter.js` | Helper `d` prefers `hostDisplayValues[index]`. Descriptor `skipDisplayType` is true only for `topNHelper`. TEMP log stays. |
| `KDB3/js/core/services/widgetBindingApply/effects/applyLocalFilters.js` | Fourth `addOrReplaceLocalFilter` argument is `{ skipDisplayType: true }` only when the descriptor says so. |
| `KDB3/js/core/services/cognosHost/facets/visualization/write/addOrReplaceLocalFilter.js` | `skipDisplayType` assigns `type: null` and does not call `ensureDisplayType`. TEMP log shows the object passed to `addFilter`. |
| This file | Law for the slice. Stays `Draft` until review stamp. |

---

## 7. Do not

- Hardcode a Dienststelle member on `itemId` or on `u`.
- Change `sanitizeDienststelleVisibleLabel.js`, or replace `displayValue` with the raw caption.
- Set `type: "display"` on the TopN helper Dienststelle filter, or omit `type` and let `ensureDisplayType` stamp it.
- Set `skipDisplayType` for Jahr, Monat, or any filter whose `targetKind` is not `"topNHelper"`.
- Change `u`, or the rewrite onto `Personal_KDB_TM1`.
- Remove TEMP console logs.
- Edit `waitForQueryResult.js`, `reloadNewestStichtagPeriodPin.js`, `resolveTopNJahrFilterValue.js`, `applyTopNJahrMismatchPin.js`, `syncDienststelleFromSicht.js`, or `handleDienststelleHistoryReplay.js`.
- Edit `contracts/widgetTopN.md`, `contracts/widgetVis.md`, or the period-pin delta and spec.
- Commit or push. Do not stamp this file `Approved`.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-16 | `Draft` | Coordinator | Helper Dienststelle local filter uses the raw host caption and `type: null`. Jahr, Monat, and non-helper hierarchy filters keep `type: "display"`. |
