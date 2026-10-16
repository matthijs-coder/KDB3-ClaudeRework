# Execution Spec: visualization dimension `setCustomLabel`

> Mechanical spec for grok 4.6 army. Architecture lives in `visualization-dimension-custom-label-contractdelta.md` (**Approved**, PO vastenburg 2026-09-02). Do **not** re-decide host API, inner-ring home, facet name, no-dim skip, empty-label ban, `[Tooltip]` bind, legend DOM, or `dataQuery.js`.
> Coordinator writes this spec only. Army reads rules, writes JS, dual-reviews. No harness.

---

**Status:** `Frozen` — PO vastenburg Cognos ack 2026-09-02 (List header + chart legend title pick up instance custom label). Dual review GREEN.
**Module / contract:** `_____________KDB3API/contracts/visualization-dimension-custom-label-contractdelta.md` (parents already one-line patched: `cognosHostService.md`, `widgetBindingPlan.md`, `widgetBindingApply.md`, `widgetVis.md`)
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-02
**Executing AI:** grok 4.6 army (W1–W4)
**Reviewer:** fresh grok 4.6 dual review (mechanical + semantic) then PO Cognos

---

## Exclusive allowlists (no two writers on the same file)

### W1 inner ring

**May edit:** `KDB3/js/core/cognosAPI/visualization.js` only.

**Must not edit:** `__orchestratorCognosAPI.js` (already 10 AMD; `visualization.js` already imported), `dataQuery.js`, any `cognosHost/**`, `widgetBinding*`, `widgetVis/**`.

**Hard cap:** file **≤200** lines after edit. Current **177**. Wrapper must fit in **≤23** lines. If the edit would exceed 200: **stop**, do not ship, report to captain. Do not ping PO unless it cannot fit.

### W2 cognosHost + facade

**May create:** `KDB3/js/core/services/cognosHost/facets/visualization/write/setCustomLabelInSlot.js`

**May edit:**

- `KDB3/js/core/services/cognosHost/facets/visualization/buildVisualizationSlotSurface.js`
- `KDB3/js/core/services/widgetBindingApply/effects/createCognosBindingFacade.js`

**Must not edit:** `visualization.js` (W1), `createVisualizationAdapter.js`, `visualizationErrorCodes.js`, `__orchestratorCognosHost.js`, `createVisualizationAdapter.js`, `applySlots.js`, `slotApplyHelpers.js`, `widgetBindingPlan/**`.

### W3 planner

**May edit:** `KDB3/js/core/services/widgetBindingPlan/slots/resolveSlotColumnIds.js` only.

**Must not edit:** `buildSlotPlan.js` (already copies `resolved.options`), `topBottomOptions.js`, `applySlotComposition.js`, `slotActivity.js`, `buildVisResetOnlyPlan.js`, any Cognos file.

### W4 apply

**May edit:**

- `KDB3/js/core/services/widgetBindingApply/effects/applySlots.js`
- `KDB3/js/core/services/widgetBindingApply/effects/slotApplyHelpers.js`

**Must not edit:** `runApplySlotsFiltersPhase.js` (7 AMD — no 8th import), `createCognosBindingFacade.js` (W2), `bindingApplyStepHelpers.js`, `applyTopBottom.js`.

---

## Section A. Pre-flight read list

Each writer reads **in order**, then echoes **one sentence per item** before producing files. Captain rejects a writer that skips the echo.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` is the only global; this WP does not mint a new top-level key, `_KDB.api.canvas`, or a new service.
2. `_____________KDB3API/.cursor/rules/state.mdc` — no foreign-state writes; this WP does not add a reducer or `_KDB.state` field.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no new runtime bucket; no new listeners/subscriptions.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — named methods on existing surfaces; Outcome on the facet; no mixed return shapes.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events in this WP.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150 except inner-ring `visualization.js` ≤200 this WP; orchestrator ≤120; no `helpers`/`common`/`shared` folders; Module Contract First already satisfied by the Approved delta.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — `_` prefix on boundary inputs; English identifiers; no new lifecycle term.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on named executables and host-call boundaries; facet never throws to the caller; empty label is failed Outcome / apply error, not a host call.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no DOM in this WP (no List header rewrite, no legend caption sanitizer).
10. `_____________KDB3API/.cursor/rules/amd.mdc` — full-compact `define([...], function (...) { ... })`; no new nested functions inside an entry body (factory-scope only); no ES modules in `KDB3/js/**`.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle term; disposed/abort use existing Outcome helpers.
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — three rings. Inner ring may use `__getDashboardAPI`. Ring 1 calls `_KDB.cognosAPI.visualization.*` only. widgetBindingApply effects call stamped/facade facet ops, never `__getDashboardAPI` / `_KDB.cognosAPI`. This WP is a **new op** on the existing `visualization` facet, not a new facet.
13. `_____________KDB3API/contracts/visualization-dimension-custom-label-contractdelta.md` — instance `dataItem.setCustomLabel(label)`; label = dropdown key; no-dim skip; empty forbidden; only dimension-carrier `columnId`; apply after add then sort.
14. This execution spec.

---

## Section B. Folder tree

No new folders. One new file:

```
KDB3/js/core/services/cognosHost/facets/visualization/write/setCustomLabelInSlot.js
```

Edits only: paths in the W1–W4 allowlists.

---

## Section C. Per-file specifications

### C1. `KDB3/js/core/cognosAPI/visualization.js` (W1)

- **Role:** inner-ring host wrapper (existing).
- **Lines:** 177 → **≤200**.
- **AMD imports:** keep `define([], function () {`.
- **Factory:** `function __controller(_KDB)` — unchanged signature. Do not use `_KDB` inside the new method (file already ignores it for host calls).
- **Entry change:** add one method on the existing returned object, **after** `removeLocalFilter`, **before** the object close. Existing methods stay. Do not extract the object into factory-scope (grandfathered nested methods).
- **Method name:** `setCustomLabel`
- **Parameters:** `_widgetId, _slotId, _columnId, _label`
- **Must not** return a host handle. Return `undefined` after a successful set. Empty / non-string `_label`: **return without** calling the host (facet already maps empty to `VISUALIZATION_INVALID_ID`).
- **Host chain:** `__getDashboardAPI().getCanvas().getContent(_widgetId).getFeature("Visualization").getSlots().getSlot(_slotId).getDataItemList()`
- **Match:** `getColumnId() === _columnId`, else `getId() === _columnId`. Never `getLabel() === "Tooltip"`.
- **Call:** `item.setCustomLabel(_label)`. If that function is missing: `throw new Error("HOST_CAPABILITY_MISSING")`.
- **Miss:** no list / no matching item: `throw new Error("ITEM_NOT_FOUND")`.
- **Exact body (keep this compact; do not pretty-expand into >23 net new lines):**

```js
        setCustomLabel: function (_widgetId, _slotId, _columnId, _label) {
          var list, i, item, id;
          if (typeof _label !== "string" || !_label) { return; }
          list = __getDashboardAPI().getCanvas().getContent(_widgetId).getFeature("Visualization").getSlots().getSlot(_slotId).getDataItemList();
          for (i = 0; i < (list ? list.length : 0); i += 1) {
            item = list[i];
            id = item && typeof item.getColumnId === "function" ? item.getColumnId() : null;
            if (id !== _columnId) { id = item && typeof item.getId === "function" ? item.getId() : null; }
            if (id === _columnId) {
              if (typeof item.setCustomLabel !== "function") { throw new Error("HOST_CAPABILITY_MISSING"); }
              item.setCustomLabel(_label);
              return;
            }
          }
          throw new Error("ITEM_NOT_FOUND");
        }
```

- **Rules to apply:**
  - `amd.mdc` — keep empty deps; no new AMD; no ES module.
  - `naming.mdc` — `_` on the four parameters.
  - `feature-structure.mdc` — ≤200.
  - `cognos-adapter.mdc` — `__getDashboardAPI` only here; never leak the `item` handle.
  - `error-handling.mdc` — throw on miss/capability; empty label is a no-op return (facet is the Outcome boundary). File-level try/catch around `__controller` stays as-is.
  - `dom.mdc` — no DOM.

---

### C2. `KDB3/js/core/services/cognosHost/facets/visualization/write/setCustomLabelInSlot.js` (W2, new)

- **Role:** visualization facet write (ring 1).
- **Lines:** target ~50 (copy `setVisTitle.js`); hard ≤150.
- **AMD imports (literal order):**
  1. `"../resolveVisualizationHostApi.js"`
  2. `"../buildVisualizationOutcome.js"`
  3. `"../config/visualizationErrorCodes.js"`
- **Factory parameters:** `_resolveVisualizationHostApi`, `_buildVisualizationOutcome`, `_visualizationErrorCodes`
- **Factory-scope helpers (same as title; do not nest inside `__controller`):**
  - `function isAborted(_options)`
  - `function isValidWidgetId(_widgetId)`
- **Entry:** `async function __controller(_ctx, _widgetId, _slotId, _columnId, _label, _options)`
- **Return:** `Promise<Outcome>` via `_buildVisualizationOutcome`. **Never throw** to the caller.
- **Body steps:**
  1. If `_ctx.isDisposed()` → `buildDisposed()`.
  2. If `isAborted(_options)` → `buildAborted("aborted")`.
  3. Invalid if: `!isValidWidgetId(_widgetId)` **or** `_slotId == null || _slotId === ""` **or** `_columnId == null || _columnId === ""` **or** `typeof _label !== "string" || _label === ""` → `buildFailed(_visualizationErrorCodes.INVALID_ID, [])`. **Do not** call the inner ring.
  4. try:
     - `visualizationApi = _resolveVisualizationHostApi(_ctx._KDB)`
     - `!visualizationApi` → `HOST_UNAVAILABLE`
     - `typeof visualizationApi.setCustomLabel !== "function"` → `HOST_CAPABILITY_MISSING`
     - **Inner-ring call (widgetId-first — do not copy `setVisTitle` reversed args):**  
       `await Promise.resolve(visualizationApi.setCustomLabel(_widgetId, _slotId, _columnId, _label));`
     - If disposed or aborted after await → `buildAborted("aborted-after-effect")`
     - else `buildOk()`
  5. catch:
     - `console.error("[cognosHost.visualization.setCustomLabelInSlot] failed", { widgetId: _widgetId, slotId: _slotId }, error);`
     - If `error && error.message === "ITEM_NOT_FOUND"` → `buildFailed(_visualizationErrorCodes.ITEM_NOT_FOUND, [diagnostic])`
     - Else if `error && error.message === "HOST_CAPABILITY_MISSING"` → `buildFailed(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, [diagnostic])`
     - Else `WRITE_FAILED` (same diagnostic pattern as `setVisTitle.js`).
- **Do not** walk `getDataItemList` in this file. Do not call `__getDashboardAPI`. Do not add error-code constants.
- **Rules to apply:**
  - `amd.mdc` — 3 imports; helpers at factory scope; `__controller` has no nested functions.
  - `naming.mdc` — `_` on `__controller` parameters.
  - `feature-structure.mdc` — write/ folder; ≤150.
  - `cognos-adapter.mdc` — ring 1: `_resolveVisualizationHostApi` → `_KDB.cognosAPI.visualization` only.
  - `error-handling.mdc` — try/catch; Outcome; never throw.
  - `module-public-api.mdc` — named facet method via bind on slot surface, not a new public `_KDB` key here.

---

### C3. `KDB3/js/core/services/cognosHost/facets/visualization/buildVisualizationSlotSurface.js` (W2)

- **Role:** slot-surface composer.
- **Lines:** 20 → ~22. Stay ≤150.
- **AMD imports (5, this order):**
  1. `"./write/clearAllSlots.js"`
  2. `"./write/addDataItemsToSlot.js"`
  3. `"./write/setTopBottomOnSlot.js"`
  4. `"./write/sortDataItemInSlot.js"`
  5. `"./write/setCustomLabelInSlot.js"`
- **Factory parameters (5):** `_clearAllSlots`, `_addDataItemsToSlot`, `_setTopBottomOnSlot`, `_sortDataItemInSlot`, `_setCustomLabelInSlot`
- **Entry:** `function __controller(_ctx)` — add one bind, same pattern:  
  `setCustomLabelInSlot: _setCustomLabelInSlot.bind(null, _ctx)`
- **Do not** reorder existing binds except appending the new one after `sortDataItemInSlot`.
- **Rules to apply:** `amd.mdc` (4→5, under 10); `naming.mdc`; `feature-structure.mdc`; `cognos-adapter.mdc`.

---

### C4. `KDB3/js/core/services/widgetBindingApply/effects/createCognosBindingFacade.js` (W2)

- **Role:** apply-effects Cognos facade.
- **Lines:** 97 → ~99. Stay ≤150. AMD stays **1**.
- **Change 1:** on the `facade` object, immediately after `setTopBottomOnSlot` (before `sortDataItemInSlot`):  
  `setCustomLabelInSlot: bindNamed(visualizationFacet, "setCustomLabelInSlot"),`
- **Change 2:** in `isComplete()`, add `this.setCustomLabelInSlot &&` in the **same PR** (after `this.setTopBottomOnSlot &&` is fine).
- **Forbidden:** a `wrap*` reversed-arg helper. Do **not** copy `wrapSortDataItem` / `sortDataItemOnFacet`.
- **Rules to apply:**
  - `amd.mdc` — keep 1 import; no nested **new** functions (`isComplete` stays grandfathered).
  - `naming.mdc`
  - `feature-structure.mdc` — ≤150
  - `cognos-adapter.mdc` — facade binds the stamped visualization facet; no `__getDashboardAPI`
  - `error-handling.mdc` — existing try/catch around facade construction stays
  - `module-public-api.mdc` — named method; `isComplete` remains the completeness gate

---

### C5. `KDB3/js/core/services/widgetBindingPlan/slots/resolveSlotColumnIds.js` (W3)

- **Role:** slot column-id resolver (plan; **no Cognos**).
- **Lines:** 87 → stay ≤150. `__controller` is 56 lines today (limit 60): put extra logic in **factory-scope** helpers in **this file**.
- **AMD:** unchanged (5). Do not add imports.
- **Factory-scope (add; never inside `__controller`):**

```js
  function catalogDimensionMissing(_dim, _dimKey, _dimAffects, _slotName) {
    return !!(_dimKey && !_dim && _dimAffects === _slotName);
  }

  function buildSlotResolveOptions(_source, _selectedDimensionId, _dimKey) {
    var options = { source: _source };
    if (_selectedDimensionId && _dimKey) {
      options.customLabel = { columnId: String(_selectedDimensionId), label: String(_dimKey) };
    }
    return options;
  }
```

- **`__controller` body additions (only):**
  1. After `var dim = _resolveSlotDefaults.dimensionEntry(dataConfig);` add:  
     `var dimKey = _normalizeDefaultValue(dataConfig.dimension);`
  2. After that, before `if (dim)`: if `catalogDimensionMissing(dim, dimKey, dimAffects, slotName)` return  
     `{ ok: false, errorCode: "WIDGET_BINDING_PLAN_SLOT_MISSING_DIM_ITEM", legacyError: "missingSelectedDimensionItemId" }`
  3. Replace the final return with:  
     `return { ok: true, columnIds: columnIds, options: buildSlotResolveOptions(source, selectedDimensionId, dim && dim.key) };`
- **Emit rules:** `customLabel` only when `selectedDimensionId` is set **and** `dim.key` is a non-empty string. That already implies real dim + `dimAffects === slotName` (prepend path). `columnId` is catalog `itemId` **verbatim** (keep `[Tooltip]`). `label` is `dim.key` (dropdown key: `Altersgruppe`, `Berufsfamilie`, `Dienstverhältnis`, `Geschlecht`, `Lehrlinge`).
- **Do not** emit on TopN helper (`dimensionSelectionAffects === "disabled"` → prepend never sets `selectedDimensionId`). Do not emit empty `label` / empty `columnId`. Do not add an `"Ohne"` sentinel. Do not strip `[Tooltip]`. Do not touch Jahr/DST/Kennzahl ids.
- **Rules to apply:**
  - `amd.mdc` — helpers at factory scope; `__controller` no new nested functions; stay ≤60 for `__controller`.
  - `naming.mdc`
  - `feature-structure.mdc` — plan slots folder; ≤150
  - `cognos-adapter.mdc` — **zero** Cognos / `__getDashboardAPI` / `_KDB.cognosAPI`
  - `state.mdc` — no `_KDB.state` writes
  - `error-handling.mdc` — lookup miss returns plan failure object (existing code style; no throw)

---

### C6. `KDB3/js/core/services/widgetBindingApply/effects/slotApplyHelpers.js` (W4)

- **Role:** apply-slots pure helpers.
- **Lines:** 58 → ~80. Stay ≤150. AMD stays `define([], ...)`.
- **Add factory-scope helper (no nested functions, no `.forEach` callback in the new helper):**

```js
  function resolveCustomLabel(_slot) {
    var slotOptions = _slot && _slot.options && typeof _slot.options === "object" ? _slot.options : null;
    var customLabel = slotOptions ? slotOptions.customLabel : null;
    var label;
    var columnId;
    if (!customLabel) {
      return { present: false };
    }
    label = customLabel.label;
    columnId = customLabel.columnId;
    if (typeof label !== "string" || label === "" || columnId == null || String(columnId) === "") {
      return { present: true, invalid: "WIDGET_BINDING_APPLY_SLOT_FAILED" };
    }
    return { present: true, columnId: String(columnId), label: label };
  }
```

- **Export** `resolveCustomLabel` on the returned object next to `resolveSortSpecs`.
- **Do not** import Cognos helpers. Do not take `_cognosBinding`.
- **Rules to apply:** `amd.mdc` (0 imports); `naming.mdc`; `feature-structure.mdc`; `cognos-adapter.mdc` (no host); `error-handling.mdc` (pure validation; no try/catch required on this helper).

---

### C7. `KDB3/js/core/services/widgetBindingApply/effects/applySlots.js` (W4)

- **Role:** apply-effects slot writer.
- **Lines:** 115 → **≤150**. `__controller` is already ~107 (grandfathered over 60). **Do not** split a new phase file. **Do not** nest a function inside `__controller`.
- **AMD:** keep 2 (`slotApplyHelpers`, `bindingApplyStepHelpers`).
- **Insert after successful add + abort check (after `appliedSlotCount += 1` and the abort at lines 66–68), before the sort surface guard.**
- **Declare** `var customLabel;` with the other vars.
- **Body (no reversed sort wrap):**

  1. `customLabel = _slotApplyHelpers.resolveCustomLabel(slot);`
  2. If `customLabel.present` is false → do nothing (fall through to sort).
  3. If `customLabel.invalid` → return `{ ok: false, errorCode: customLabel.invalid, errorMessage: "customLabel is invalid for slot " + String(slot && slot.slotName) }` — **not** a silent skip.
  4. If `typeof _cognosBinding.setCustomLabelInSlot !== "function"` → `WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING` / `"setCustomLabelInSlot is unavailable."` (same shape as the sort guard).
  5. `mapped = _bindingApplyStepHelpers.mapFacetOutcome(await Promise.resolve(_cognosBinding.setCustomLabelInSlot(widgetId, String(slot.slotName || ""), customLabel.columnId, customLabel.label, { signal: _signal })));`
  6. aborted → `{ ok: false, aborted: true }`; `!mapped.ok` → `return mapped`.
- **Argument order:** `(widgetId, slotName, columnId, label, { signal })` — **not** sort’s reversed facade order.
- Empty `columnIds` already `continue`s before add → custom label also skipped (correct for empty-slot / filter-only never reaches this file).
- **Rules to apply:**
  - `amd.mdc` — 2 imports; no nested functions in `__controller`
  - `naming.mdc`
  - `feature-structure.mdc` — ≤150; no new file
  - `cognos-adapter.mdc` — `_cognosBinding` only; no `_KDB.cognosAPI` / `__getDashboardAPI`
  - `error-handling.mdc` — existing try/catch stays; empty label fails locally; host miss after add fails via `mapFacetOutcome`

---

## Section D. Reducer behavior table

N/A. No reducer / no new action types.

---

## Section E. Published selectors

N/A.

---

## Section F. Public API wiring

- Surface: `_KDB.cognosAPI.visualization.setCustomLabel(widgetId, slotId, columnId, label)` (inner ring; existing namespace).
- Surface: `_KDB.services.cognosHost.visualization.setCustomLabelInSlot(widgetId, slotId, columnId, label, { signal? })` → `Promise<Outcome>` (existing facet, new op; adapter/orchestrator unchanged).
- Apply: `_cognosBinding.setCustomLabelInSlot(...)` via `bindNamed`.
- Plan: `SlotPlanItem.options.customLabel?: { columnId, label }`.
- widgetVis: **no** new method; stays on `applyBinding`.
- No `_KDB.runtime` / `_KDB.state` changes.

---

## Section G. Harness HTML spec

N/A. No harness.

---

## Section H. Harness JS spec

N/A.

---

## Section I. Mock extensions

N/A for this WP. Dual review is contract-vs-code. PO verifies in Cognos.

---

## Section J. Acceptance criteria

Writers self-verify before reporting:

1. Every allowlisted file exists; no file outside the writer’s allowlist was modified.
2. Each file matches Section C, including `Rules to apply`.
3. Full-compact AMD; no ES modules in `KDB3/js/**`.
4. `visualization.js` ≤200. Every other edited/new JS ≤150.
5. No new nested functions inside W2/W3/W4 entry bodies. W1 adds one method on the existing returned object (grandfathered style).
6. No `__getDashboardAPI` / `_KDB.cognosAPI` from ring-1 writers except via `_resolveVisualizationHostApi` in `setCustomLabelInSlot.js`. W3/W4: none.
7. No forbidden tree (`TEST/`, `_______KDB3/`, `_______REDESIGN2/`, `.cursor/rules/*.mdc`, parent contracts unless a sentence is proven stale — then stop).
8. No-dim / Ohne: no `customLabel` on the plan item; no host call.
9. Real dim: `customLabel.label` is the dropdown key; `columnId` is catalog `itemId` (may contain `[Tooltip]`).
10. Empty label never reaches `dataItem.setCustomLabel`.
11. Apply order: add → custom label (if present) → sort.
12. Facade uses `bindNamed`, not reversed sort wrap; `isComplete` includes the new op.
13. `__orchestratorCognosAPI.js` still 10 AMD. `runApplySlotsFiltersPhase.js` still 7 AMD. `createVisualizationAdapter.js` untouched.
14. Report Section L (echo + line counts + deviations).

---

## Section K. Forbidden actions

- Edit `.cursor/rules/*.mdc` or this spec’s parents unless a live file proves a stale one-liner (then **stop** for captain/PO).
- Edit `visualization-dimension-custom-label-contractdelta.md` (Approved). Deviation → stop, captain updates delta first.
- `__orchestratorCognosAPI.js` 11th import; new `cognosAPI/visualization/*.js`; `dataQuery.js`; new cognosHost facet; `_KDB.api.canvas`.
- `getLabel() === "Tooltip"` matcher; `addDataItems({ columnId, name })`; `cleanDataIdForList`; legend/title sanitizers; List header DOM; `dimensions.js` unique names.
- Copy `sortDataItemInSlot` reversed facade wrap.
- Call `setCustomLabel` with `""`.
- Folders `helpers` / `common` / `shared`. ES modules. Git commit/push. Skip Section A echo.

---

## Section L. Reporting template

Each writer’s final response:

1. **Pre-flight echo** — numbered summaries (Section A).
2. **File checklist** — path, line count, matches spec | deviation.
3. **Deviations** — path, deviation, motivation, rule. If none: `none`.
4. **Self-verification** — Section J pass/fail.
5. **Open questions** — only true blockers (would exceed 200 on `visualization.js`, grey new facet, etc.).

---

## Section M. Reviewer handoff

Fresh subagents (not the writers), after all four slices land:

1. Mechanical: AMD, `_` prefix, try/catch, line caps (`visualization.js` ≤200), import counts, no foreign state, no host leaks from ring 1 / apply-effects, no `__getDashboardAPI` outside `cognosAPI/`.
2. Semantic: no-dim skip; real dim always sets dropdown key; empty label never reaches host; only dimension `columnId`; apply after add then sort; List header + chart legend title are expected to pick up Cognos custom label (no DOM rewrite in this WP).
3. ReadLints on all touched `.js`.
4. Decide: accept, army fix MUST holes, or escalate (delta update).

**PO Cognos (after dual review GREEN):**

1. List + Geschlecht (or other Tooltip-dimension): column header is the dropdown name, not `Tooltip`. Cells still Tooltip-attribute values (except Altersgruppe level bind).
2. Line/stacked/pie + dimension: legend title uses the dimension key instead of leading `Tooltip`.
3. Ohne: no empty custom label; Cognos names unchanged.
4. Jahr / Dienststelle columns still show their Cognos names.
5. Dashboard spec is not dirtied beyond the widget instance.

---

> End of execution spec.
