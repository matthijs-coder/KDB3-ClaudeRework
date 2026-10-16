# Execution Spec: `widgetSettings` Top-N grouping toast (WP3)

> Mechanical spec for grok 4.6 implementers. Architecture lives in `widgetSettings-topn-grouping-toast-contractdelta.md` (PO **Approved** 2026-09-07). Do not re-open the proposal series. No harness. Existing production widgetSettings only.

---

**Status:** `Reviewed`  
**Module / contract:** `contracts/widgetSettings.md` + `contracts/widgetSettings-topn-grouping-toast-contractdelta.md`  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-07  
**Executing AI:** grok 4.6 subagent, 2026-09-07  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos green 2026-09-07

---

## Exclusive allowlist

**May create:**

- `KDB3/js/dashboard/widgets/widgetSettings/config/widgetSettingsLabels.js`
- `KDB3/js/dashboard/widgets/widgetSettings/effects/validateTopNGroupingDimension.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetSettings/__orchestratorWidgetSettings.js` (labels merge + AMD 4→5 only)
- `KDB3/js/dashboard/widgets/widgetSettings/effects/dispatchWidgetSettingsIntent.js` (hook + AMD 8→9 only)

**Must not edit:** `handleApplySetting.js`, `topNGate.js`, `actionRouter.js`, `bindWidgetSettingsPanel.js`, `finalizeVisIntentResult.js`, `topNDropdownSafeguard.js`, `warnSettingsMessage.js`, `widgetTopN/**`, `widgetVis/**` (including `gates/topNGate.js`), `KDB.js`, `historyService/**`, `messageService/**`, `contracts/widgetSettings.md` / `widgetVis.md` / `widgetTopN.md` (parent one-liners = captain **after** JS dual-review), `.cursor/rules/*.mdc`, git.

**Must not create:** `notifyWidgetSettingsWarning.js`; `gates/` / `helpers/` / `common/` / `shared/`; reason-code constants file; `executeIntent` extract file; any `widgetBindingPlan` import.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB` namespaces; labels under `_KDB.config.labels.de.*`; no new top-level namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — widgetSettings owns `_KDB.state.widgets.settings`; no foreign writes; this WP does not write `topNChoice`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no new runtime buckets; panel DOM via existing `resolvePanel` / `domRefs`.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new `_KDB.api.widgetSettings` methods; no new `messageService` methods.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — contract first; effects file not a new module; file-size / AMD caps.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files; German UI string only in labels; `optionKey` not `optionValue`.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on named executables; missing messageService → `console.warn` + still block.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — panel-scoped `querySelector` only; no `document.querySelector` / `getElementById`.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; factory-scope named helpers; no nested subfunctions; no async IIFE.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle terms; do not set `record.errorCode` on this block.
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no Cognos; no `_KDB.cognosAPI` / `__getDashboardAPI`.
13. `_____________KDB3API/contracts/widgetSettings-topn-grouping-toast-contractdelta.md` — Approved WP3 law (toast, revert, no dispatch, snapshot dimension, AMD 8→9).
14. This execution spec.

---

## Section B. Folder tree (create / edit order)

```
KDB3/js/dashboard/widgets/widgetSettings/
  config/widgetSettingsLabels.js                         (new)
  effects/validateTopNGroupingDimension.js               (new)
  __orchestratorWidgetSettings.js                        (edit)
  effects/dispatchWidgetSettingsIntent.js                (edit)
```

---

## Section C. Per-file specifications

#### `KDB3/js/dashboard/widgets/widgetSettings/config/widgetSettingsLabels.js`

- **Role:** declarative DE labels (config)
- **Lines:** target 16 (hard 40)
- **AMD imports:** none (`define([], ...)`)
- **Factory parameters:** none
- **Factory-scope named helpers:** none
- **Entry:** none. Factory body: `"use strict";` then `return { … }`.
- **Return value:** object literal with **exactly one** key:

```js
{
  topNGroupingRequired: "Um die Top-N Funktion zu verwenden, muss zuerst eine Gruppierungsdimension gewählt werden."
}
```

- Exact DE string (lock 3). No other keys. No functions.
- **Rules to apply:**
  - `amd.mdc` — one `define([]);` config export; no nested functions.
  - `naming.mdc` — English key `topNGroupingRequired`; German value is UI copy.
  - `feature-structure.mdc` — `config/` folder; scannable.
  - `kdb-object.mdc` — this object is merged into `_KDB.config.labels.de.widgetSettings` by the orchestrator, not published as a new namespace.

---

#### `KDB3/js/dashboard/widgets/widgetSettings/effects/validateTopNGroupingDimension.js`

- **Role:** effect helper (pre-dispatch guard)
- **Lines:** target 110 (hard 150)
- **AMD imports** (literal order):
  1. `"../state/ensureWidgetSettingsByWidget.js"`
  2. `"../view/topNDropdownSafeguard.js"`
  3. `"../view/resolvePanel.js"`
  4. `"../config/selectors.js"`
- **Factory parameters:** `_ensureByWidget`, `_topNDropdownSafeguard`, `_resolvePanel`, `_selectors`
- **Factory-scope named helpers** (never inside `__controller`):
  - `function isAbsentSentinel(_value)` — if `_value == null` → `true`. If `typeof _value !== "string"` → `false` (**do not** call `.trim()` on non-strings). Else trim + lower-case: `true` iff `""` / `"none"` / `"default"`. Do **not** import `normalizeDefaultValue`.
  - `function readCommittedDimension(_KDB, _widgetId)` — `record = _ensureByWidget(_KDB, _widgetId)`; return `record.dimension`. Missing key → `undefined` → absent.
  - `function readTopNAnchor(_KDB, _widgetId)` — `panel = _resolvePanel(_KDB, _widgetId)`; if no panel, `null`. Else `panel.querySelector(_selectors.byAttr(_selectors.settingsIconKindAttr, "topN"))`; if that node exists and `isConnected === true`, return it. Else `panel.querySelector(_selectors.dropdownSelector + _selectors.byAttr(_selectors.dropdownKindAttr, "topN"))`; if connected, return it. Else `null`. **No** `document.querySelector`.
  - `function notifyGroupingRequired(_KDB, _anchor)` — read message from `_KDB.config.labels.de.widgetSettings.topNGroupingRequired` with **fallback** the lock-3 DE string. If `!(_KDB.services && _KDB.services.message)` → `console.warn("[widgetSettings.validateTopNGroupingDimension] messageService missing", message)` and return. Payload `{ code: "WIDGET_SETTINGS_TOPN_DIMENSION_ABSENT", message: message, severity: "warning" }`. If `_anchor` and `typeof svc.notifyAnchored === "function"` → `svc.notifyAnchored({ anchor: _anchor, code, message, severity })`. Else if `typeof svc.notify === "function"` → `svc.notify({ code, message, severity })`. Else same `console.warn`. Do **not** add an inner try/catch around `notifyAnchored` (service already falls back). Do **not** import `warnSettingsMessage.js`.
- **Entry function:**
  - Name: `__controller`
  - Parameters: `_KDB`, `_planned`
  - Body steps:
    1. `try` / `catch`: on catch `console.error("[widgetSettings.validateTopNGroupingDimension]", err); throw err` (executeIntent already converts to `INTENT_ERROR`).
    2. `planned = _planned || {}`.
    3. If `planned.type !== "widgetVis/applyTopNChoice"` → `return null` (continue dispatch). Continue is **only** `null`, never `{}`.
    4. If `isAbsentSentinel(planned.optionKey)` → `return null` (Ohne path; **do not** inspect `optionValue`).
    5. If `!isAbsentSentinel(readCommittedDimension(_KDB, planned.widgetId))` → `return null`.
    6. Call `_topNDropdownSafeguard.revertTopNDropdownFromState(_KDB, planned.widgetId)` (ignore boolean).
    7. If `planned.isHistoryReplay !== true`: `notifyGroupingRequired(_KDB, readTopNAnchor(_KDB, planned.widgetId))`.
    8. `return { ok: false, skipped: true, reasonCode: "WIDGET_SETTINGS_TOPN_DIMENSION_ABSENT" }`.
- **Return value:** `__controller`
- **Must not:** write `record.errorCode` / `record.topNChoice`; call `markTopNPending(true)`; call `_KDB.api.widgetVis`; emit events; read dimension dropdown DOM; check `source === "startup"`.
- **Rules to apply:**
  - `amd.mdc` — full-compact `define`; helpers at factory scope only.
  - `naming.mdc` — `__controller`; `_` on boundary params; English identifiers.
  - `feature-structure.mdc` — `effects/`; ≤150 lines; 4 AMD (under 6).
  - `error-handling.mdc` — try/catch on `__controller` and each named helper that is not a pure one-liner. `isAbsentSentinel` may be a pure helper without try/catch if it is a single return expression / trivial sentinel check.
  - `dom.mdc` — panel-scoped queries; live Element as `anchor`; no `fieldId`.
  - `state.mdc` — no `topNChoice` write; `ensureWidgetSettingsByWidget` is owner-internal read (may create empty record — same as safeguard).
  - `events.mdc` — no emit.
  - `module-public-api.mdc` — use existing `services.message.notifyAnchored` / `notify` only.

---

#### `KDB3/js/dashboard/widgets/widgetSettings/__orchestratorWidgetSettings.js`

- **Role:** module orchestrator (edit)
- **Lines:** live 56 → target ≤80 (hard 120). Do not add business logic.
- **AMD imports** (literal order, **5**):
  1. `"./config/widgetSettingsLabels.js"`
  2. `"./createWidgetSettingsController.js"`
  3. `"./state/initialState.js"`
  4. `"./runtime/initializeRuntime.js"`
  5. `"./history/createWidgetSettingsHistoryReplayHandler.js"`
- **Factory parameters:** `_widgetSettingsLabels`, `_createWidgetSettingsController`, `_initialState`, `_initializeRuntime`, `_createHandler`
- **Change `ensureNamespaces`:** also ensure `_KDB.config`, `_KDB.config.labels`, `_KDB.config.labels.de` objects exist (same pattern as shareControls). Keep existing `state` / `runtime` / `api` / `state.widgets` init.
- **Change `__orchestrator` body:** after `ensureNamespaces(_KDB)`, **before** `initializeState`:

```js
_KDB.config.labels.de.widgetSettings = Object.assign({}, _widgetSettingsLabels, _KDB.config.labels.de.widgetSettings || {});
```

- Do not move controller registration. Do not toast here.
- **Rules to apply:**
  - `amd.mdc` — AMD 5; named helpers stay at factory scope (`ensureNamespaces`, `initializeState`, `stageWidgetSettingsHistoryReplayHandler` already exist).
  - `naming.mdc` — `_widgetSettingsLabels` boundary import.
  - `feature-structure.mdc` — thin orchestrator; no validate/toast in orch.
  - `kdb-object.mdc` — merge into `_KDB.config.labels.de.widgetSettings` only.
  - `error-handling.mdc` — existing try/catch on orch / helpers stays.

---

#### `KDB3/js/dashboard/widgets/widgetSettings/effects/dispatchWidgetSettingsIntent.js`

- **Role:** intent dispatcher (edit)
- **Lines:** live 106 → target ≤120 (hard 150)
- **AMD imports** (literal order, **9** — PO locked 8→9):
  1. `"../config/intentDispatchMap.js"`
  2. `"./buildWidgetSettingsIntentDescriptor.js"`
  3. `"./dispatchToTargetApi.js"`
  4. `"./orchestrateResetToLaunchpad.js"`
  5. `"./buildDownstreamIntentAction.js"`
  6. `"./finalizeVisIntentResult.js"`
  7. `"./dispatchVisSettingsBatch.js"`
  8. `"./readSettingsPanelIconAttrs.js"`
  9. `"./validateTopNGroupingDimension.js"`
- **Factory parameters:** keep current eight names, then `_validateTopNGroupingDimension`.
- **Change `executeIntent` only.** After `planned` is built, **before** `_dispatchToTargetApi`:

```js
const blocked = _validateTopNGroupingDimension(_KDB, planned);
if (blocked) {
  return blocked;
}
```

- Do **not** skip via `source !== "startup"`.
- Do **not** call finalize when `blocked` is truthy.
- Do **not** extract `executeIntent` to a new file.
- Leave `dispatchIconIntent` / `dropdownOption` / `dispatchStartupDefault` / exports unchanged except they automatically hit the hook via `executeIntent`.
- **Rules to apply:**
  - `amd.mdc` — AMD 9 (under 10); no nested functions inside `executeIntent`.
  - `naming.mdc` — `_validateTopNGroupingDimension`.
  - `feature-structure.mdc` — file ≤150; hook is wiring + one return.
  - `error-handling.mdc` — existing `executeIntent` try/catch stays; blocked return is inside try.
  - `state.mdc` — blocked path never reaches vis apply / finalize commit.

---

## Section D. Reducer behavior table

**N/A.** No new actions. No reducer change. Blocked path never dispatches `widgetVis/applyTopNChoice`.

| Action type | This WP |
|---|---|
| `widgetVis/applyTopNChoice` | **Not dispatched** when dimension absent and optionKey not Ohne |
| existing vis/settings actions | unchanged |

---

## Section E. Published selectors

**N/A.** No new published selectors. Dimension is read via owner `ensureWidgetSettingsByWidget`, not a new `read*`.

---

## Section F. Public API wiring

- Surface unchanged: `_KDB.api.widgetSettings` (no new methods).
- `_KDB.services.message` unchanged (`notifyAnchored` / `notify` already exist).
- Labels: `_KDB.config.labels.de.widgetSettings.topNGroupingRequired` after orch merge.
- Runtime: no new buckets.
- State: no new keys; do not write `topNChoice` on the block path.

---

## Section G–I. Harness / mocks

**N/A.** No new harness. Do not add TEST HTML.

---

## Section J. Acceptance criteria (executing AI self-check)

1. Allowlist only: two new files + two edits. No other paths modified.
2. `dispatchWidgetSettingsIntent.js` AMD **9**. `__orchestratorWidgetSettings.js` AMD **5**. Guard AMD **4**. No file >150. Orch ≤120.
3. Dimension Ohne + user Top-10: toast via `notifyAnchored` (or `notify` if no connected anchor); dropdown reverted; **no** `widgetVis/applyTopNChoice`; no history push (`ok !== true`).
4. Dimension real + Top-10: guard returns `null`; existing pipeline.
5. Top-N Ohne (`optionKey` sentinel): guard returns `null`; existing `applyTopNChoice`.
6. Missing `services.message`: revert + `console.warn`; still `{ ok: false, skipped: true, reasonCode: "WIDGET_SETTINGS_TOPN_DIMENSION_ABSENT" }`; no dispatch.
7. `isHistoryReplay === true` + absent dimension + non-Ohne Top-N: revert; **no** grouping toast; same return shape; no dispatch.
8. Startup vis/topN still goes through `startupVisBatch` / `applyStartupSettings` — **not** edited; this toast cannot fire on seed.
9. No `document.querySelector` / `getElementById`. Anchor is a connected Element or omitted.
10. No import of `warnSettingsMessage.js`, `normalizeDefaultValue.js`, `widgetTopN/**`, `widgetVis/**`.
11. No new events, no new `_KDB` namespace, no `record.errorCode` write in the guard.
12. Factory-scope helpers only; `"use strict"` in new AMD factories.
13. Report: Section L.

---

## Section K. Forbidden actions

- Re-open proposal-series options (DOM dimension, binder hook, `ok: true` skip, extract `executeIntent`, labels in `options.js`).
- Edit forbidden files listed in the allowlist.
- Add `source !== "startup"` skip.
- Return `{ ok: true, skipped: true }` or `null` on the **block** path (`null` is only “continue”).
- Use `optionValue` to decide Ohne (`"10"` vs `"top-10"`).
- Pass `{ fieldId }` into `notifyAnchored`.
- Create `helpers/` `gates/` `common/` `shared/` leftover `Support`.
- Nested functions inside entry bodies / async IIFE.
- ES modules in `KDB3/js/**`.
- Commit / push / git config.
- Modify `.mdc`, `_template.md`, `_executionSpecTemplate.md`, or the Approved delta.
- Parent one-liners on `widgetSettings.md` / `widgetTopN.md` / `widgetVis.md` (captain after JS review).
- Skip Section A echo.
- Read `_______KDB3` / `_______REDESIGN2` for copy-paste. Legacy copy is the lock-3 string in this spec.

---

## Section L. Reporting template

1. Pre-flight echo (14 sentences).
2. File checklist: path, line count, AMD count, matches spec | deviation.
3. Deviations with motivation.
4. Self-verification of Section J (pass/fail each).
5. Open questions for captain/PO.

---

## Section M. Reviewer handoff

Captain: two **fresh** grok 4.6 reviews after JS (mechanical vs this spec; semantic vs Approved delta). Then PO Cognos: grouping Ohne + Top-10 → German toast, dropdown reverts, no Top-N helper; with a real dimension Top-10 still works; Ohne Top-N has no this toast; dashboard seed has no this toast.
