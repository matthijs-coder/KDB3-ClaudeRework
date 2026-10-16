# Execution Spec: `widgetText` (`full port`)

> Execution handoff for implementing `widgetText` after CP-1 approval of `contracts/widgetText.md`. This spec is mechanical: the executing AI implements the approved contract and does not make architecture decisions.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/widgetText.md`
**Phase:** `full port`
**Authoring AI:** GPT-5.5, 2026-06-16
**Executing AI:** `<pending>`
**Reviewer:** `<user / supervising planner>`
**Production alignment note:** 2026-06-17 cleanup execution is behavior-preserving against the current production module. Executor AIs must preserve existing split files, replay staging, scoped font/readable-colour styles, `textFitted` automatic font behavior and the current Cognos `fontSize` host sync unless a reviewer explicitly approves a functional delta.

---

## Section A. Pre-flight read list

The executing AI must read each file below before producing code and must echo one sentence per item. File creation starts only after the reviewer accepts the echo.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` - `_KDB` has fixed top-level namespaces; `widgetText` publishes only under `_KDB.api.widgetText`.
2. `_____________KDB3API/.cursor/rules/state.mdc` - `_KDB.state` is serializable and owner-written only; this module writes only `_KDB.state.widgets.text`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` - DOM refs, listeners, timers, AbortControllers and promises live under `_KDB.runtime.widgetText` and every resource needs cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` - feature modules expose one dispatch-style surface `{ mount, destroy, dispatch, getState }` with disposed-state guards.
5. `_____________KDB3API/.cursor/rules/events.mdc` - known-owner communication uses direct dispatch; this module emits and subscribes to no events in this phase.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` - implementation follows the approved contract, canonical orchestrator/controller layout and file-size discipline.
7. `_____________KDB3API/.cursor/rules/naming.mdc` - technical names are English, files use precise verb+noun names and actions use `widgetText/<actionName>`.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` - named executables and async/timer/listener effects use local try/catch; reducers and pure one-liners are exempt.
9. `_____________KDB3API/.cursor/rules/dom.mdc` - live DOM refs stay in runtime, queries are scoped to the widget shell, and view code does not write state.
10. `_____________KDB3API/.cursor/rules/amd.mdc` - production JS uses one full-compact AMD `define([...], function (...) { ... })` per file; no ES modules.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` - module lifecycle values are canonical; per-widget operation status uses `pending`, not lifecycle synonyms.
12. `_____________KDB3API/architecture/widgets-domain-blueprint.md` - authority for base/content/settings split, state ownership, communication and §12 full-contract requirements.
13. `_____________KDB3API/contracts/widgetText.md` - approved source of truth for this implementation.
14. `_____________KDB3API/contracts/widgetSettings.md` - authority for settings-owned values/history and apply-before-commit interaction with `widgetText`.
15. `_____________KDB3API/contracts/widgetBase.md` - authority for shell placement, `contentCreate` caller behavior and rollback boundary.
16. `_____________KDB3API/contracts/historyService.md` - authority for `pushCommittedStep` and deferred replay boundary.
17. `_____________KDB3API/architecture/textWidgetSettings.md` - reference UI snapshot for text, fontSize and restyle payload attributes.
18. This execution spec.

Forbidden pre-flight behavior: do not read legacy JS or production JS trees directly. Use the legacy/current mapping below. If implementation needs more evidence, stop and ask the planner for a read-only investigation subagent.

## Section B. Folder tree

Current production may edit only these production files under the target path:

```txt
_____________KDB3API/KDB3/js/dashboard/widgets/widgetText/
  __orchestratorWidgetText.js
  createWidgetTextController.js
  widgetTextDispatchContext.js
  config/
    actionTypes.js
    defaults.js
    restyleClasses.js
  state/
    initialState.js
    createWidgetTextReducer.js
    selectors.js
    cloneSerializable.js
  runtime/
    initializeRuntime.js
    ensureWidgetRuntime.js
  view/
    forceTextDomReflow.js
    resolveWidgetTextShell.js
    resolveTextEditableNodes.js
    buildTextContentDom.js
    placeTextContentDom.js
    syncTextContentDom.js
    applyTextFontSize.js
    applyTextRestyle.js
  actions/
    handleContentCreate.js
    handleCommitTextEdit.js
    commitConfirmedText.js
    startInlineTextEdit.js
    handleApplyFontSize.js
    handleApplyRestyle.js
    handleApplyTitle.js
    handleApplyReadableTextColor.js
    handleCleanupContent.js
    normalizeDispatchResult.js
    routeWidgetTextDispatch.js
  effects/
    bindInlineTextEdit.js
    commitWidgetTextHistory.js
    cleanupWidgetTextRuntime.js
    manageScopedTextFontStyle.js
    manageScopedTextColorStyle.js
  history/
    stageWidgetTextHistoryReplayHandler.js
    createWidgetTextHistoryReplayHandler.js
    applyWidgetTextHistoryReplay.js
```

Do not create `events/`, `adapters/`, CSS, tests or harness files in this phase.

## Section C. Evidence mapping table

The executing AI must not re-read legacy or production JS. Use this mapping as evidence and stop if more evidence is needed.

| New production file | Legacy/current evidence | Composition / alignment note |
|---|---|---|
| `__orchestratorWidgetText.js` | Current scaffold orchestrator; blueprint public API | Keep existing bootstrap surface, register `_KDB.api.widgetText`, no business logic. |
| `createWidgetTextController.js` | Current scaffold controller; `widgetVis` action-router/report pattern | Replace scaffold no-op dispatch with rule-aligned dispatch routing and disposed-state guards. |
| `config/actionTypes.js` | Production expected actions from `intentDispatchMap` and `dispatchContentCreate` | Declare `contentCreate`, `commitTextEdit`, `applyFontSize`, `applyRestyle`, `applyTitle`, `cleanupContent` and internal reducer actions. |
| `config/defaults.js` | REDESIGN2/laatsteOriginal starting text and auto-fit defaults | Declarative default text, automatic font min/max/delay and CSS selector defaults. |
| `config/restyleClasses.js` | REDESIGN2 `applyTextWidgetRestyle`, laatsteOriginal `setRestyle`, settings snapshot options | Maps option keys/values to `KDB_widgetHeader*` classes and known class removal list. |
| `state/*` | Blueprint state shape + legacy text content/state split | New `_KDB.state.widgets.text` owner state; no settings values. |
| `view/resolveWidgetTextShell.js` | Current production shell id boundary; DOM rule | Exact id shell resolver only; no foreign runtime reads. |
| `view/resolveTextEditableNodes.js` | REDESIGN2 `resolveTextWidgetEditableNode` | Re-resolve `.textFillNoScroll .note-editable`, `p`, `span`, font target per action. |
| `view/buildTextContentDom.js` | Legacy text widget content shape | Build detached minimal `.staticContent .textFillNoScroll .note-editable p span` structure only when absent. |
| `view/placeTextContentDom.js` | Legacy text content placement; current base/content split | Place content inside existing shell content wrapper; never move shell. |
| `view/syncTextContentDom.js` | REDESIGN2 text commit/replay DOM sync | Write text to `paragraphEl || editableEl`, preserve scoped node discipline. |
| `view/forceTextDomReflow.js` | Current production layout behavior | Preserve existing reflow/resize side effects used by automatic font layout. |
| `view/applyTextFontSize.js` | REDESIGN2 `applyTextWidgetFontSize`, laatsteOriginal `setFontSize` / `adjustFontSizeToFit`, current production `textFitted` path | Preserve current `textFitted`/scoped-style/Cognos `fontSize` sync behavior; no settings state writes. |
| `view/applyTextRestyle.js` | REDESIGN2 `applyTextWidgetRestyle`, laatsteOriginal `setRestyle` | Idempotent remove-known-classes then apply mapped class; no toggle quirk. |
| `actions/handleContentCreate.js` | WidgetBase content-create handoff + legacy drop-created text | Create/reuse content DOM, write initial content state, return success/failure for base rollback. |
| `actions/handleCommitTextEdit.js` | REDESIGN2 `startTextWidgetTextEdit` + `commitWidgetTextEdit`, laatsteOriginal `changeText` | Route start vs direct replay/programmatic commit. |
| `actions/startInlineTextEdit.js` | Current production split from commit handler | Start inline edit, install callbacks and preserve current DOM/state text-source priority. |
| `actions/commitConfirmedText.js` | Current production split from commit handler | Confirm text, sync DOM/state and push `widget_textEdit` only on changed confirmed content. |
| `actions/handleApplyFontSize.js` | REDESIGN2 `commitTextWidgetFontSizeChange` + apply-only split | Normalize payload, mark pending, call view apply, return `reportToSettings`; no history. |
| `actions/handleApplyRestyle.js` | REDESIGN2 `commitWidgetLayoutChange` text branch + apply-only split | Normalize layout/restyle payload, call view apply, return `reportToSettings`; no history. |
| `actions/handleApplyTitle.js` | REDESIGN2 text title dropdown early return; production `applyTitle` route | Intentional display-only skip with `reasonCode`, no state/DOM/history. |
| `actions/handleApplyReadableTextColor.js` | Current production readable text colour requirement for text widgets | Public consequence route for scoped text colour after `widgetSettings/commitColour`; no settings value/history. |
| `actions/handleCleanupContent.js` | Legacy reset/take-back cleanup split + widgetSettings delete boundary | Abort text runtime and optionally remove text record; never move shell or cleanup settings. |
| `actions/normalizeDispatchResult.js` | `widgetVis` normalized result/report pattern; current scaffold result shape | Uniform `{ ok, widgetId, opSeq, status, reportToSettings, errorCode }`. |
| `actions/routeWidgetTextDispatch.js` | Current production router | Keep all public action routes and unknown-action result behavior. |
| `effects/bindInlineTextEdit.js` | REDESIGN2 inline edit focusout/Escape; laatsteOriginal `changeText` | Listener/timer ownership with AbortController and controller callback injection. |
| `effects/commitWidgetTextHistory.js` | REDESIGN2 `widget_textEdit`; `historyService.pushCommittedStep` | Push serializable `widget_textEdit`; return failure if history service rejects/absent after state/DOM success. |
| `effects/cleanupWidgetTextRuntime.js` | Runtime rules + legacy cleanup | Abort controllers, remove listeners, clear timers/promises/domRefs/editSession. |
| `effects/manageScopedTextFontStyle.js` | Current production fixed-font behavior | Preserve scoped `<style>` creation/removal for fixed text font sizes. |
| `effects/manageScopedTextColorStyle.js` | Current production readable text colour behavior | Preserve scoped `<style>` creation/removal for derived readable text colour. |
| `runtime/initializeRuntime.js` / `runtime/ensureWidgetRuntime.js` | Current production runtime split | Initialize module/per-widget runtime buckets, including current font style and replay contribution fields. |
| `history/*` | Current production history replay staging | Stage/apply `widget_textEdit` replay through runtime contribution. |

## Section D. Per-file specifications

Every production file uses AMD full-compact form and returns exactly one value. Factory-scope helpers are allowed; nested function definitions inside entry functions, callbacks or return paths are forbidden.

### `__orchestratorWidgetText.js`

- **Role**: module orchestrator.
- **Lines**: target 45, hard limit 90.
- **AMD imports**:
  - `"./createWidgetTextController.js"`
  - `"./state/selectors.js"`
- **Entry function**: `__orchestrator(_KDB, _options)`.
- **Body steps**:
  1. Ensure `_KDB.api` exists.
  2. Ensure `_KDB.state.widgets` and `_KDB.runtime` exist without replacing existing namespaces.
  3. Create controller with `{ _KDB, options: _options || {}, selectors: _selectors }`.
  4. Assign `_KDB.api.widgetText = controller`.
  5. Return controller.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `kdb-object.mdc`, `module-public-api.mdc`, `error-handling.mdc`.

### `createWidgetTextController.js`

- **Role**: controller factory.
- **Lines**: target 140, hard limit 150.
- **AMD imports**:
  - `"./config/actionTypes.js"`
  - `"./state/initialState.js"`
  - `"./state/createWidgetTextReducer.js"`
  - `"./state/cloneSerializable.js"`
  - `"./actions/handleContentCreate.js"`
  - `"./actions/handleCommitTextEdit.js"`
  - `"./actions/handleApplyFontSize.js"`
  - `"./actions/handleApplyRestyle.js"`
  - `"./actions/handleApplyTitle.js"`
  - `"./actions/handleCleanupContent.js"`
  - `"./actions/normalizeDispatchResult.js"`
- **Entry function**: `createWidgetTextController(_deps)`.
- **Body steps**:
  1. Capture `_KDB`, options, selectors, reducer and closure `_isDisposed`.
  2. Expose exactly `mount`, `destroy`, `dispatch`, `getState`.
  3. `mount` initializes `_KDB.state.widgets.text` and `_KDB.runtime.widgetText`, then marks lifecycle ready.
  4. `dispatch` validates envelope, routes public actions, dispatches internal reducer writes and normalizes results.
  5. `destroy` sets `_isDisposed = true`, calls runtime cleanup for every widget, clears module runtime buckets and marks disposed.
  6. `getState` returns cloned `_KDB.state.widgets.text`.
- **Rules to apply**: `amd.mdc`, `module-public-api.mdc`, `state.mdc`, `runtime.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`.

### `config/actionTypes.js`

- **Role**: action constants.
- **Lines**: target 70, hard limit 100.
- **Return value**: object constants for public and internal actions listed in `widgetText.md` §6 and §8.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.

### `config/defaults.js`

- **Role**: declarative defaults.
- **Lines**: target 45, hard limit 80.
- **Return value**: object with `defaultText`, `automaticFontSize`, `autoFitDelayMs`, `minFontSizePx`, `maxFontSizePx`, content selector strings and edit data attrs.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `dom.mdc`.

### `config/restyleClasses.js`

- **Role**: declarative class map.
- **Lines**: target 70, hard limit 110.
- **Return value**: object with known class list, option key map and clear/default semantics.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `dom.mdc`.

### `state/initialState.js`

- **Role**: initial state builder.
- **Lines**: target 35.
- **Entry function**: `createInitialWidgetTextState()`.
- **Return value**: fresh `{ lifecycle:"idle", byId:{}, errorCode:null, errorMessage:null }`.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `lifecycleVocabulary.md`, `naming.mdc`.

### `state/createWidgetTextReducer.js`

- **Role**: reducer factory.
- **Lines**: target 135, hard limit 150.
- **AMD imports**:
  - `"../config/actionTypes.js"`
  - `"./initialState.js"`
  - `"./cloneSerializable.js"`
- **Entry function**: `createWidgetTextReducer()`.
- **Reducer behavior**: implement Section E only; no DOM, Cognos, events, history, timers, Promise work or throws.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `naming.mdc`, `error-handling.mdc` (reducers exempt from try/catch).

### `state/selectors.js`

- **Role**: published selectors.
- **Lines**: target 70.
- **Return value**: object with selectors from Section F.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `module-public-api.mdc`, `naming.mdc`.

### `state/cloneSerializable.js`

- **Role**: pure clone helper.
- **Lines**: target 25.
- **Entry function**: `cloneSerializable(_value)`.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `naming.mdc`.

### `view/resolveWidgetTextShell.js`

- **Role**: DOM resolver.
- **Lines**: target 55.
- **Entry function**: `__controller(_KDB, _widgetId)`.
- **Must do**: resolve exact shell by id, reject missing id, store no refs by itself, return DOM node or `null`.
- **Rules to apply**: `amd.mdc`, `dom.mdc`, `runtime.mdc`, `naming.mdc`, `error-handling.mdc`.

### `view/resolveTextEditableNodes.js`

- **Role**: DOM resolver.
- **Lines**: target 85.
- **Entry function**: `__controller(_KDB, _widgetId, _shellEl)`.
- **Must do**: implement resolver order from `widgetText.md` §7 and return `{ shellEl, contentEl, editableEl, paragraphEl, spanEl, textNodeForFont }`.
- **Rules to apply**: `amd.mdc`, `dom.mdc`, `runtime.mdc`, `naming.mdc`, `error-handling.mdc`.

### `view/buildTextContentDom.js`

- **Role**: view builder.
- **Lines**: target 70.
- **Entry function**: `__controller(_initialText, _options)`.
- **Must do**: build detached content subtree only; no placement, state or listener binding.
- **Rules to apply**: `amd.mdc`, `dom.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`.

### `view/placeTextContentDom.js`

- **Role**: view placer.
- **Lines**: target 85.
- **Entry function**: `__controller(_KDB, _widgetId, _shellEl, _contentEl)`.
- **Must do**: place content under existing shell content wrapper/static content; never move shell; return resolved nodes.
- **Rules to apply**: `amd.mdc`, `dom.mdc`, `runtime.mdc`, `naming.mdc`, `error-handling.mdc`.

### `view/syncTextContentDom.js`

- **Role**: view mutator.
- **Lines**: target 55.
- **Entry function**: `__controller(_nodes, _text)`.
- **Must do**: set text on `paragraphEl || editableEl`, keep span structure if present, return applied text.
- **Rules to apply**: `amd.mdc`, `dom.mdc`, `state.mdc` (no state writes), `naming.mdc`, `error-handling.mdc`.

### `view/applyTextFontSize.js`

- **Role**: view mutator.
- **Lines**: target 140, hard limit 150.
- **AMD imports**:
  - `"../config/defaults.js"`
- **Entry function**: `__controller(_KDB, _widgetId, _nodes, _fontSizeValue, _options)`.
- **Must do**: normalize `automatic` / px values, preserve the current production `textFitted` automatic-font path, scoped fixed-font style path and Cognos `fontSize` host sync, and return diagnostics.
- **Must not do during cleanup**: replace this with the earlier draft `responsiveFontSize` binary-fit path unless the reviewer approves a functional behavior change.
- **Rules to apply**: `amd.mdc`, `dom.mdc`, `runtime.mdc` (timer ownership), `naming.mdc`, `error-handling.mdc`.

### `view/applyTextRestyle.js`

- **Role**: view mutator.
- **Lines**: target 90.
- **AMD imports**:
  - `"../config/restyleClasses.js"`
- **Entry function**: `__controller(_KDB, _widgetId, _shellEl, _restyleValue)`.
- **Must do**: normalize key/value/class, remove known classes, apply mapped class or clear, return diagnostics.
- **Rules to apply**: `amd.mdc`, `dom.mdc`, `naming.mdc`, `error-handling.mdc`.

### `actions/handleContentCreate.js`

- **Role**: action handler.
- **Lines**: target 140, hard limit 150.
- **AMD imports**:
  - `"../view/resolveWidgetTextShell.js"`
  - `"../view/resolveTextEditableNodes.js"`
  - `"../view/buildTextContentDom.js"`
  - `"../view/placeTextContentDom.js"`
  - `"../view/syncTextContentDom.js"`
- **Must do**: validate payload, capture `opSeq`, reuse or create content DOM, write text state through reducer dispatch, update runtime refs and return normalized success/failure.
- **Must not do**: move shell, create settings controls, push history.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `runtime.mdc`, `dom.mdc`, `module-public-api.mdc`, `error-handling.mdc`.

### `actions/handleCommitTextEdit.js`

- **Role**: action handler.
- **Lines**: target 150, hard limit 150.
- **AMD imports**:
  - `"../view/resolveWidgetTextShell.js"`
  - `"../view/resolveTextEditableNodes.js"`
  - `"./commitConfirmedText.js"`
  - `"./startInlineTextEdit.js"`
- **Must do**: start inline edit when no `nextText`, direct commit when `nextText` exists, cancel on Escape, write state/DOM on confirmed change and push `widget_textEdit` unless replay.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `runtime.mdc`, `dom.mdc`, `module-public-api.mdc`, `error-handling.mdc`.

### `actions/commitConfirmedText.js`

- **Role**: confirmed commit helper bundle.
- **Lines**: target 120, hard limit 150.
- **Must do**: end edit DOM, re-resolve refs, preserve current state-first previous-text priority, sync DOM/state, push `widget_textEdit` unless replay and refit automatic font through the current production font path.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `runtime.mdc`, `dom.mdc`, `error-handling.mdc`.

### `actions/startInlineTextEdit.js`

- **Role**: inline edit start helper.
- **Lines**: target 120, hard limit 150.
- **Must do**: start contenteditable session, preserve current DOM-first original-text priority, bind confirm/cancel callbacks and keep edit runtime cleanup behavior.
- **Rules to apply**: `amd.mdc`, `runtime.mdc`, `dom.mdc`, `error-handling.mdc`.

### `actions/handleApplyFontSize.js`

- **Role**: action handler.
- **Lines**: target 115.
- **AMD imports**:
  - `"../view/resolveWidgetTextShell.js"`
  - `"../view/resolveTextEditableNodes.js"`
  - `"../view/applyTextFontSize.js"`
- **Must do**: normalize payload, mark/clear pending, apply CSS, return `reportToSettings`, write no settings/history.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `runtime.mdc`, `dom.mdc`, `module-public-api.mdc`, `error-handling.mdc`.

### `actions/handleApplyRestyle.js`

- **Role**: action handler.
- **Lines**: target 105.
- **AMD imports**:
  - `"../view/resolveWidgetTextShell.js"`
  - `"../view/applyTextRestyle.js"`
- **Must do**: normalize payload, mark/clear pending, apply class swap, return `reportToSettings`, write no settings/history.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `runtime.mdc`, `dom.mdc`, `module-public-api.mdc`, `error-handling.mdc`.

### `actions/handleApplyTitle.js`

- **Role**: action handler.
- **Lines**: target 35.
- **Entry function**: `__controller(_deps, _action, _context)`.
- **Must do**: return intentional skip `{ ok:true, skipped:true, reasonCode:"WIDGET_TEXT_TITLE_DROPDOWN_DISPLAY_ONLY" }`.
- **Rules to apply**: `amd.mdc`, `module-public-api.mdc`, `naming.mdc`, `error-handling.mdc`.

### `actions/handleApplyReadableTextColor.js`

- **Role**: action handler.
- **Lines**: target 65.
- **AMD imports**:
  - `"../effects/manageScopedTextColorStyle.js"`
- **Must do**: accept `widgetText/applyReadableTextColor`, require `payload.textColor`, apply scoped readable text colour through the owned effect, return diagnostics, and write no settings values/history.
- **Must not do**: apply shell background colour, push history, call `widgetSettings`, or expose `widgetText/effects/*` to foreign modules.
- **Rules to apply**: `amd.mdc`, `module-public-api.mdc`, `runtime.mdc`, `dom.mdc`, `naming.mdc`, `error-handling.mdc`.

### `actions/handleCleanupContent.js`

- **Role**: cleanup action handler.
- **Lines**: target 90.
- **AMD imports**:
  - `"../effects/cleanupWidgetTextRuntime.js"`
- **Must do**: abort/clear per-widget runtime, keep or remove text state according to reason, no shell movement.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `runtime.mdc`, `dom.mdc`, `error-handling.mdc`.

### `actions/normalizeDispatchResult.js`

- **Role**: result normalizer.
- **Lines**: target 65.
- **Entry function**: `__controller(_result, _fallback)`.
- **Must do**: normalize all success/failure/skip/stale result shapes without throwing.
- **Rules to apply**: `amd.mdc`, `module-public-api.mdc`, `naming.mdc`.

### `effects/bindInlineTextEdit.js`

- **Role**: DOM listener effect.
- **Lines**: target 130, hard limit 150.
- **Entry function**: `__controller(_KDB, _widgetId, _nodes, _callbacks, _options)`.
- **Must do**: install `focusout` and `keydown` listeners with AbortController when possible, store cleanup under runtime, call injected callbacks for confirm/cancel, no state writes.
- **Rules to apply**: `amd.mdc`, `runtime.mdc`, `dom.mdc`, `error-handling.mdc`, `naming.mdc`.

### `effects/commitWidgetTextHistory.js`

- **Role**: history effect.
- **Lines**: target 70.
- **Entry function**: `__controller(_KDB, _widgetId, _previousText, _nextText, _options)`.
- **Must do**: build `widget_textEdit` step and call `_KDB.services.history.pushCommittedStep(step)` unless replay/skip; return `{ ok:boolean }`.
- **Rules to apply**: `amd.mdc`, `state.mdc` (no direct history writes), `module-public-api.mdc`, `error-handling.mdc`, `naming.mdc`.

### `effects/cleanupWidgetTextRuntime.js`

- **Role**: runtime cleanup effect.
- **Lines**: target 90.
- **Entry function**: `__controller(_KDB, _widgetId)`.
- **Must do**: abort controllers, remove listener descriptors, clear timers/promises, clear domRefs and editSession for one widget or all widgets when widgetId omitted.
- **Rules to apply**: `amd.mdc`, `runtime.mdc`, `dom.mdc`, `error-handling.mdc`, `naming.mdc`.

## Section E. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `widgetText/mountStarted` | `mount()` | Ensure initial text state and clear module error | `idle -> initializing` |
| `widgetText/mountSucceeded` | `mount()` success | Set module lifecycle ready | `initializing -> ready` |
| `widgetText/registerContent` | `contentCreate` success | Upsert `byId[widgetId]` with `{ widgetId, content:{ text }, pending:{ kind:null, opSeq:null }, errorCode:null, errorMessage:null }` | none |
| `widgetText/commitTextContent` | confirmed text edit or replay | Update `byId[widgetId].content.text`; clear error/pending | none |
| `widgetText/markPending` | action starts current work | Set `byId[widgetId].pending = { kind, opSeq }` | none |
| `widgetText/clearPending` | action settles current work | Reset pending to `{ kind:null, opSeq:null }` when opSeq matches | none |
| `widgetText/errorRecorded` | boundary failure | Set module or per-widget `errorCode` / `errorMessage`; module-level errors set lifecycle error | `* -> error` for module-level only |
| `widgetText/cleanupContentSucceeded` | cleanup action | Remove per-widget record only for `remove`/`destroy`; otherwise keep content and clear pending/runtime flags | none |
| `widgetText/destroy` | `destroy()` | Set module lifecycle disposed; keep cloned byId only if implementation chooses diagnostics, otherwise clear byId | `* -> disposed` |

## Section F. Published selectors

| Selector | Reads | Returns |
|---|---|---|
| `readWidgetTextState(_KDB)` | `_KDB.state.widgets.text` | Cloned text subtree or `undefined`. |
| `readTextRecord(_KDB, widgetId)` | `_KDB.state.widgets.text.byId[widgetId]` | Cloned text record or `undefined`. |
| `readTextContent(_KDB, widgetId)` | `_KDB.state.widgets.text.byId[widgetId].content.text` | String text or `undefined`. |
| `readTextPending(_KDB, widgetId)` | `_KDB.state.widgets.text.byId[widgetId].pending` | Cloned pending marker or `undefined`. |

## Section G. Public API wiring

- Surface: `_KDB.api.widgetText`.
- Methods exposed: `mount`, `destroy`, `dispatch`, `getState`.
- `_KDB.runtime.widgetText` initialization: `domRefs`, `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`, `styleElements`, `historyReplayHandlerContribution`, `byId`, and per-widget `styleElements.fontSize`, `styleElements.textColor` / `fontSize`.
- `_KDB.state.widgets.text` initialization: `initialState.js` shape.
- Dispatch result shape: normalized shape from `widgetText.md` §5.1.
- Public actions accepted: `widgetText/contentCreate`, `widgetText/commitTextEdit`, `widgetText/applyFontSize`, `widgetText/applyRestyle`, `widgetText/applyTitle`, `widgetText/applyReadableTextColor`, `widgetText/cleanupContent`.

## Section H. Acceptance criteria

The executing AI must self-verify all of the following before reporting back:

1. Every file in Section B exists and no extra production files are created.
2. No `events/eventNames.js`, CSS, test, harness or legacy file is created/edited.
3. Every file uses full-compact AMD and returns exactly one value.
4. No file contains nested function declarations inside entry functions, callbacks or return paths.
5. No file exceeds the declared hard limit.
6. Public API is exactly `{ mount, destroy, dispatch, getState }`.
7. `dispatch` handles all public action types and unknown actions return `WIDGET_TEXT_UNKNOWN_ACTION`.
8. `mount` / `destroy` have local try/catch and disposed-state guards.
9. Reducer is pure and writes only `_KDB.state.widgets.text`.
10. Runtime cleanup removes listeners, aborts controllers, clears timers/promises and dom refs.
11. `contentCreate` creates/reuses text content DOM but never moves the shell or creates settings controls.
12. `commitTextEdit` pushes `widget_textEdit` only after changed confirmed state+DOM commit, never during replay.
13. `applyFontSize` and `applyRestyle` return `reportToSettings` and write no settings values/history.
14. `applyTitle` is an intentional display-only skip.
15. No data/query Cognos calls are introduced; the existing `fontSize` host property sync remains behavior-preserving.
16. Foreign modules call `widgetText` readable text colour only through `_KDB.api.widgetText.dispatch`; they do not import `widgetText/effects/*`.
16. No code reads forbidden `_KDB.dropdownOptions`; config comes from payloads/local config/`_KDB.config.options`.
17. `ReadLints` passes for all edited/new `.js` files.

## Section I. Forbidden actions

- Do not modify any `.mdc` file under `_____________KDB3API/.cursor/rules/`.
- Do not modify architecture authority docs or templates. Contract/spec edits are supervisor-owned, not executor-subagent-owned.
- Do not read or modify legacy trees: `_______REDESIGN2/`, `laatsteOriginal/`, `_______KDB3/` or `TEST/`.
- Do not modify `KDB.js` unless CP-2 proves a missing mount-order issue and the reviewer approves a contract/spec delta.
- Do not create new top-level `_KDB.*` namespaces.
- Do not write foreign state or read foreign runtime.
- Do not emit new events or create event constants.
- Do not commit, push or change git config.
- Do not invent behavior beyond this spec; deviation requires stopping and reporting.

## Section J. Reporting template

The executing AI's final response must include:

1. Pre-flight echo: 18 numbered summaries from Section A.
2. File checklist: every path created/edited with line count and "matches spec | deviation".
3. Deviations: file path, deviation, motivation and rule consulted.
4. Self-verification: pass/fail per Section H.
5. Open questions for reviewer.

## Section K. Reviewer handoff

The supervising AI or human reviewer verifies:

1. Pre-flight echo is present and correct.
2. Every file from Section B exists and no extra files were created.
3. `ReadLints` is run on all implementation files.
4. Each file satisfies its `Rules to apply`.
5. Imports resolve and `KDB.js` already has a single `widgetText` registration/mount.
6. CP-2 diff-walk confirms no foreign writes, no leaked runtime resources and no scaffold no-op behavior remains for the public actions.
