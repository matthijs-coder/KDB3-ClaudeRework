# Execution Spec: vis grouping — pie + Dienststelle (empty Repeat still planned)

> Mechanical spec for grok 4.6 army. Architecture: `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` **§14.3 item 4**.
> Echo Section A **before** producing files. Do not stamp pie+DST `Implemented`. Do not start C/E/toast.

---

**Status:** `Executed` — PO canvas green 2026-09-12. Grouping-delta §14 `Implemented`.
**Module / contract:** grouping-delta §14.3
**Phase:** `extension` (slot activity: hierarchy policy activates empty Repeat)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-12
**Executing AI:** grok 4.6 army
**Reviewer:** captain + dual grok 4.6 review

---

## Waves

One exclusive writer.

## Exclusive allowlists

### W-ACTIVITY

**May edit:** `KDB3/js/core/services/widgetBindingPlan/slots/slotActivity.js`

A slot is active when raw is non-empty **or** `visTypeConfig.slotComposition[slotName].hierarchy` exists. Keep the existing `dimensionSelectionAffects` extra-collect. AMD unchanged. Stay ≤150.

**Must not:** `resolveSlotColumnIds.js`, `buildSlotPlan.js`, `buildHierarchyFilter.js`, grain, visTypes, overlay.

### Nobody

`applyGrainOverlayOnClone.js`, `applySlotComposition.js`, `sorting.js`, `KDB.js`, `bindWidgetSettingsPanel.js`, writeback `grp`, chrome, legend, `.mdc`, contracts (captain).

---

## Section A. Pre-flight

Read in order; echo **one sentence** each. Do not paste rule bodies.

1–11. The 10 MUST `.mdc` + `cognos-adapter.mdc`
12. grouping-delta **§14.3**
13. This spec
14. Live `slotActivity.js`

Also echo: empty Repeat-V with hierarchy policy must be collected; no DST on Segment; do not restore wipe; do not edit `buildHierarchyFilter`.

---

## Section B. Files

```
KDB3/js/core/services/widgetBindingPlan/slots/slotActivity.js
```

---

## Section C. Per-file edits

### W-ACTIVITY — `slotActivity.js`

Add a factory-scope helper (name it `hasHierarchyPolicy`):

```js
function hasHierarchyPolicy(_visTypeConfig, _slotName) {
  var composition = _visTypeConfig && _visTypeConfig.slotComposition;
  var slotPolicy = composition && composition[_slotName];
  return !!(slotPolicy && slotPolicy.hierarchy);
}
```

In `collectActiveSlotNames`, after the raw-active check, also collect when the helper is true:

```js
if (slotRawIsActive(visTypeConfig[slotName]) || hasHierarchyPolicy(visTypeConfig, slotName)) {
  active.push(slotName);
}
```

Do not change `slotRawIsActive`. Do not add AMD imports. Keep `dimensionSelectionAffects` append as today.

---

## Section D. Done when

- Empty `repeatVertical: ""` on pie `jahr` / `jahrStichtag` is collected because Repeat-V has a hierarchy policy.
- H Repeat-H still collected from raw Jahr (policy extra is harmless).
- No other files edited.

## Must not

Restore Repeat-V wipe. Put DST on Segment. Edit `buildHierarchyFilter.js`. C/E/toast. Stamp `Implemented`.

---

**Handoff:** JS after §14 `Approved`. Dual review GREEN/GREEN → captain sets spec `Executed`. Await PO canvas: Repeat-V = Dienststelle, not Lokale Filter. Captain does not certify Cognos.
