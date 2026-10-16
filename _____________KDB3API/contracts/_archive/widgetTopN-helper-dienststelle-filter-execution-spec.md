# Execution Spec: TopN helper Dienststelle local filter

> Mechanical spec for the implementer. Law is `contracts/widgetTopN-helper-dienststelle-filter-contractdelta.md` (Draft until review stamp). The helper Dienststelle filter sends the raw host caption and `type: null`. Jahr, Monat, and non-helper hierarchy filters keep `type: "display"`. No commit unless the PO asks.

---

**Status:** `Draft`
**Module / contract:** `contracts/widgetTopN-helper-dienststelle-filter-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.7 coordinator, 2026-10-16
**Executing AI:** Cursor Grok 4.7 coordinator
**Reviewer:** pending subagent review

---

## Exclusive allowlist

**May create:**

- `contracts/widgetTopN-helper-dienststelle-filter-contractdelta.md`
- `contracts/widgetTopN-helper-dienststelle-filter-execution-spec.md`
- `KDB3/js/dashboard/filters/dienststelle/effects/collectAlignedHostDisplays.js`

**May edit:**

- `KDB3/js/dashboard/filters/dienststelle/effects/normalizeCognosDienststelleSelection.js`
- `KDB3/js/dashboard/filters/dienststelle/state/copyDienststelleValueEntries.js`
- `KDB3/js/dashboard/filters/dienststelle/state/selectors.js`
- `KDB3/js/dashboard/filters/dienststelle/actions/tabMutation/prepareTabMutation.js`
- `KDB3/js/dashboard/filters/dienststelle/actions/tabMutation/applyTabMutationScopeOps.js`
- `KDB3/js/dashboard/filters/dienststelle/effects/readDienststelleConfirmHistorySnapshot.js`
- `KDB3/js/dashboard/filters/dienststelle/effects/buildVisualizationWidgetDienststellePayload.js`
- `KDB3/js/dashboard/filters/dienststelle/effects/dienststelleScopeApplySupport.js`
- `KDB3/js/dashboard/filters/dienststelle/effects/applyDienststelleDefault.js`
- `KDB3/js/dashboard/filters/dienststelle/effects/readCurrentHierarchySnapshot.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/normalizeHierarchySnapshot.js`
- `KDB3/js/core/services/widgetBindingPlan/filters/buildHierarchyFilter.js`
- `KDB3/js/core/services/widgetBindingApply/effects/applyLocalFilters.js`
- `KDB3/js/core/services/cognosHost/facets/visualization/write/addOrReplaceLocalFilter.js`

**Must not edit:** `contracts/widgetTopN.md`, `contracts/widgetVis.md`, `contracts/widgetTopN-filter-retrigger-period-pin-contractdelta.md`, `contracts/widgetTopN-filter-retrigger-period-pin-execution-spec.md`, `sanitizeDienststelleVisibleLabel.js`, `waitForQueryResult.js`, `reloadNewestStichtagPeriodPin.js`, `resolveTopNJahrFilterValue.js`, `applyTopNJahrMismatchPin.js`, `syncDienststelleFromSicht.js`, `handleDienststelleHistoryReplay.js`, `uniqueAlignedUseDisplayValues.js`.

**Must not create:** a second host-caption field, a second type-stamp path, or a hardcoded Dienststelle member.

---

## Per-file

### `collectAlignedHostDisplays.js`

- **New.** `define` returns one function. No AMD imports. Cap 150.
- **Array argument:** same visits and push conditions as `extractDisplayValues` in `readCurrentHierarchySnapshot.js`. Non-empty string entry pushes `""`. Object with non-empty `displayValue`, else object with non-empty `useValue`, pushes `String(entry.hostDisplay)` when `hostDisplay` is a non-empty string, otherwise `""`.
- **Scope-map argument:** walk `Object.keys` in the same order as `collectPageContextUseValues`. Collect use values with the same push rules as `extractUseValues`. Collect host captions with the array walker. Keep a host caption at each index `uniqueAlignedUseDisplayValues` would keep, so the result length matches that page-context `displayValues` array. This walk lives here so `readCurrentHierarchySnapshot.js` stays at or under 150 lines.
- Returned function: local `try/catch`, log `[dienststelle.collectAlignedHostDisplays]`, rethrow.

### `normalizeCognosDienststelleSelection.js`

- In `normalizeHostValue`, set `hostDisplay` to `display` (the raw string, before sanitize). `displayValue` stays the sanitized caption. Keep the `[sicht-jahr] TEMP dienststelle value` log.

### Copies of `{ displayValue, useValue, source }`

Each of these also copies `hostDisplay`. Absent or empty becomes `""`.

- `copyDienststelleValueEntries.js` `copyValueEntry`
- `selectors.js` `copySelectionValues`
- `prepareTabMutation.js` `cloneValues`
- `applyTabMutationScopeOps.js` `cloneValues`
- `readDienststelleConfirmHistorySnapshot.js` `toValueObject` (`source` stays `"cognos"`)
- `buildVisualizationWidgetDienststellePayload.js` rebuilt `selection` (`source` stays the existing normalizer)

`prepareTabMutation.js` and `applyTabMutationScopeOps.js` clone with factory-scope helpers. No new nested function.

### `dienststelleScopeApplySupport.js`

- `toCognosValues`: `d` is `hostDisplay` when that string is non-empty, otherwise `displayValue`. `u` stays `useValue`.

### `applyDienststelleDefault.js`

- Same `d` preference in its own `toCognosValues`. When `hostDisplay` is absent, `d` stays `_defaultValue.displayValue` as it is today.

### `readCurrentHierarchySnapshot.js`

- Cap 150. One new import: `collectAlignedHostDisplays.js` as `_collectHostDisplays`. The file already has three imports; this is the fourth.
- `hostDisplayValues` is `_collectHostDisplays(dominant).concat(_collectHostDisplays(downstream))` at the same moment `displayValues` is built.
- `collectPageContextUseValues` sets `hostDisplayValues` from `_collectHostDisplays(scopeMap)` on the aligned result. The page-context branch concatenates that array when it concatenates `displayValues`.
- The returned resolution includes `hostDisplayValues` next to `displayValues`.

### `normalizeHierarchySnapshot.js`

- Cap 150. `buildResolutionBlock`: when `sourceResolution.hostDisplayValues` is an array, slice it onto the returned resolution.
- In the `applySelectionFallback` branch, when `selection.hostDisplay` is a non-empty string, set `hostDisplayValues` to `[that string]`.
- Existing `displayValues` behavior stays.

### `buildHierarchyFilter.js`

- Cap 150. `__controller` is already over 60 lines: do not grow its body. New logic is factory-scope.
- `collectTopNHelperHierarchyValues`: `d` comes from `hostDisplayValues[index]` when that string is non-empty, else `displayValues[index] || useValue`. `u` stays the use value.
- Descriptor `options.skipDisplayType` is `_spec.targetKind === "topNHelper"`. Other option fields stay.
- Keep `logHelperHierarchy` and the `[sicht-jahr] TEMP helper hierarchy` log.

### `applyLocalFilters.js`

- Cap 150. `__controller` is already over 60 lines. Replace only the `undefined` fourth argument of `addOrReplaceLocalFilter` with a factory-scope helper. That helper returns `{ skipDisplayType: true }` when `descriptor.options.skipDisplayType === true`, otherwise `undefined`. Do not add lines inside the controller beyond that replacement.

### `addOrReplaceLocalFilter.js`

- Cap 150. Factory-scope helper. When `filterOptions.skipDisplayType === true` and the filter is an object, `Object.assign` a copy with `type: null` and do not call `ensureDisplayType`. Otherwise call `ensureDisplayType`.
- The `[sicht-jahr] TEMP local filter` log receives the object actually passed to `addFilter`.
- Jahr and Monat do not set `skipDisplayType`, so they still go through `ensureDisplayType` and keep `type: "display"`.

---

## Acceptance

1. Vector 1: raw host caption is `hostDisplay` and helper `values[0].d`. `displayValue` and the visible label stay `3g_Ref_ZEB - Zentrale Einbringung`. Helper filter `type` is null, `exclude` is false, `action` is `keepexclude`, `overrideHierarchyDefaultSelection` is true. `u` is the rewritten member unique name. `itemId` is not a hardcoded member.
2. Vector 2: helper Jahr include and Monat include still have `type: "display"`, and `d` equals `u`.
3. Vector 3: `toCognosValues` writes Cognos `d` from non-empty `hostDisplay`, otherwise `displayValue`. A default with no `hostDisplay` still writes `displayValue`.
4. `hostDisplayValues` stays index-aligned with `displayValues`, including the page-context branch after first-seen useValue keep.
5. `skipDisplayType` is true only for `targetKind === "topNHelper"`.
6. TEMP logs named in the delta are still present. `sanitizeDienststelleVisibleLabel.js` and the must-not-edit list are not in the diff.
7. Every edited JavaScript file passes `node --check`. Every JavaScript file is at or under 150 lines by `(Get-Content path).Count`. `define` returns one value. Import bindings start with an underscore. No nested function inside an entry function.

---

## Do not

- Edit the parent contracts, the period-pin delta, or the period-pin spec.
- Edit `sanitizeDienststelleVisibleLabel.js`, `uniqueAlignedUseDisplayValues.js`, or the must-not-edit runtime files.
- Remove TEMP console logs.
- Hardcode a Dienststelle member.
- Opt Jahr or Monat out of `type: "display"`.
- Stamp this spec `Approved`.
- Commit or push.
