# Module Contract: `widgetText`

> Full CP-1 contract for the text-content composed-port tranche. Design authority lives in `_____________KDB3API/architecture/_archive/widgets-domain-blueprint.md`; this contract makes the `widgetText` implementation scope explicit and keeps base/settings/history ownership outside this module.

---

**Status:** `Draft CP-1`
**Owner module / service:** `widgetText`
**Type:** `feature module` (content / consequence owner)
**Authoring AI:** GPT-5.5, 2026-06-16
**Reviewed by:** `<pending CP-1 approval>`
**Production alignment note:** 2026-06-17 cleanup audit found production already contains split action/runtime/history files, staged `widget_textEdit` replay, scoped fixed-font/readable-colour style injection, a Cognos `fontSize` sync touchpoint and the legacy `textFitted` automatic-font path. These are treated as existing behavior for cleanup/refactor work and must not be removed during behavior-preserving optimization without a separate CP decision.
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Composed-Port Scope

`widgetText` is a new text-content owner assembled from REDESIGN2 text-widget behavior, laatsteOriginal text-widget helpers and the widgets-domain blueprint. It is not a 1-to-1 port of one legacy folder.

Target production path:

```txt
_____________KDB3API/KDB3/js/dashboard/widgets/widgetText/
```

This tranche owns text content creation, inline content editing, text-node resolution and CSS-only text styling consequences (`fontSize`, text header/restyle, derived readable text colour for text widgets). It does not own widget shell movement, canvas layout, launchpad routing, settings panel rendering, settings values, settings history, shell colour/background, move/resize/delete, or cross-module replay orchestration.

No production behavior code may be generated until this CP-1 contract is approved. The execution spec in `widgetText-port-execution-spec.md` is a handoff document, not approval to code.

## 1. Evidence And Deliberate Deltas

| Evidence | Use in this contract |
|---|---|
| `architecture/_archive/widgets-domain-blueprint.md` | Authority for base/content/settings split, dispatch APIs, `_KDB.state.widgets.text`, write-after-apply discipline and §12 full-contract requirements. |
| `contracts/widgetBase.md` | `widgetBase` owns shell/frame/drop placement and dispatches `widgetText/contentCreate` after text drop. |
| `contracts/widgetSettings.md` | `widgetSettings` owns panel-control values and settings history; it dispatches `applyFontSize` / `applyRestyle` / `commitTextEdit` to `widgetText`. |
| `contracts/historyService.md` | History steps are serializable and pushed only through `_KDB.services.history.pushCommittedStep(step)`. |
| Production gap investigation | `widgetText` is already bootstrapped and mounted, but current handlers are scaffold no-ops; `widgetSettings` and `widgetBase` already dispatch to `widgetText`. |
| REDESIGN2 text investigation | Editable-node resolution, inline edit lifecycle, `applyTextWidgetFontSize`, `applyTextWidgetRestyle`, title-icon routing and legacy text history behavior. |
| laatsteOriginal text investigation | Earlier `textWidgets` helper behavior: starting text, responsive font fit, restyle class quirks, icons/header gaps and DOM/settings drift. |
| `architecture/_archive/textWidgetSettings.md` | Reference UI snapshot (single-line legacy DOM dump) for Text, Schriftgröße and Umstylen controls and their DOM attributes. |

Deliberate deltas versus legacy:

- `contentCreate` is new target behavior. REDESIGN2/laatsteOriginal created text content through launchpad/drop orchestration; target content creation is explicitly owned by `widgetText` after `widgetBase` places the shell.
- The canonical content value is `_KDB.state.widgets.text.byId[widgetId].content.text`. Legacy wrote text into `settings.text` or left DOM as source of truth.
- `fontSize`, `restyle` and colour/background setting values and their settings history belong to `widgetSettings`. `widgetText` applies text-content CSS consequences only and reports success/failure. For text widgets, readable text colour is a derived consequence of a committed background colour, not a canonical setting value.
- `commitTextEdit` owns only `widget_textEdit` history for confirmed inline content changes.
- Text settings title dropdown selection remains display-only for text widgets. Production may dispatch `widgetText/applyTitle`; target supports it as an intentional skip result. Actual editing starts through `widgetText/commitTextEdit` from the Text icon click.
- Automatic responsive font sizing is included in this tranche because current text settings expose `Default (Automatic)` and both legacy sources treat automatic fitting as a primary font behavior. This is a rule-aligned port of behavior, not a new setting owner.
- Header icons from laatsteOriginal are not included. The REDESIGN2 text settings panel has no icons route, production `intentDispatchMap` has no icons target, and the blueprint does not assign icons ownership in this tranche.
- The laatsteOriginal `setRestyle` toggle-off-on-same-style quirk is not carried forward. Target `applyRestyle` is idempotent: it removes known text header classes and applies the requested class or clears them. This aligns with settings commit-after-apply and predictable replay.
- The laatsteOriginal `"reinigen"` clear-only restyle value is accepted as a compatibility input if it appears in a payload, but current production settings use `layout` option keys/values and do not require a visible `"reinigen"` control.

## 2. Purpose

`widgetText` owns the text content inside a widget frame. It creates/locates the text DOM region after a text drop, starts and confirms inline editing, writes confirmed content into its owned state subtree, applies font size/restyle/readable-colour consequences requested by `widgetSettings`, and returns structured reports so `widgetSettings` can commit its own control values.

`widgetText` is a consequence owner for text styling, not a settings owner. It never stores canonical `fontSize`, `restyle`, `layout`, `colour` / `backgroundColor` or settings-panel UI values, and never pushes settings history.

## 3. Ownership

Canonical state subtree:

```js
_KDB.state.widgets.text = {
  lifecycle: "idle",
  byId: {},
  errorCode: null,
  errorMessage: null
};
```

Per-widget text state:

```js
_KDB.state.widgets.text.byId[widgetId] = {
  widgetId: "<cognos-dom-id>",
  content: {
    text: ""
  },
  pending: {
    kind: null,
    opSeq: null
  },
  errorCode: null,
  errorMessage: null
};
```

Ownership rules:

- `widgetText` is the only writer of `_KDB.state.widgets.text`.
- `widgetText` writes `content.text` only after a confirmed inline edit or content creation default.
- `widgetText` writes its own `pending`, `errorCode` and `errorMessage` fields for text-content operations and apply failures.
- `widgetText` never writes `_KDB.state.widgets.base`, `_KDB.state.widgets.settings`, `_KDB.state.history`, `_KDB.state.launchpad`, `_KDB.state.kdbControl`, or filter state.
- `widgetText` never stores DOM nodes, jQuery objects, listener handles, timers, AbortControllers or Cognos objects in state.
- `widgetText` may read current settings values only through action payloads from `widgetSettings` or published selectors when a later replay/restore path is approved.

Lifecycle subset for the module-level state: `idle`, `initializing`, `ready`, `error`, `disposed`. Per-widget records do not introduce their own lifecycle field in this tranche; `pending` and `errorCode` cover operation status.

## 4. Runtime

Owner namespace:

```js
_KDB.runtime.widgetText = {
  domRefs: {},
  listeners: {},
  subscriptions: {},
  abortControllers: {},
  observers: {},
  timers: {},
  pendingPromises: {},
  styleElements: {},
  historyReplayHandlerContribution: null,
  byId: {}
};
```

Per-widget runtime:

```js
_KDB.runtime.widgetText.byId[widgetId] = {
  domRefs: {
    shellEl: null,
    contentEl: null,
    editableEl: null,
    paragraphEl: null,
    spanEl: null,
    textNodeForFont: null
  },
  listeners: {},
  abortControllers: {},
  observers: {},
  timers: {},
  pendingPromises: {},
  styleElements: {
    fontSize: null,
    textColor: null
  },
  fontSize: null,
  opSeq: 0,
  editSession: {
    isActive: false,
    originalText: null,
    startedAt: null
  }
};
```

Runtime rules:

- `opSeq` is the single stale-result guard per text widget.
- DOM refs are re-resolved per action because Cognos or widget shell movement may rebuild inner nodes.
- Inline edit listeners are stored under the per-widget `listeners` or an AbortController under `abortControllers.edit`.
- Production font-size/readable-colour consequences may use `styleElements.fontSize`, `styleElements.textColor`, `fontSize` and scoped `<style>` elements to preserve the current `textFitted`/Cognos-host/readable-text behavior. Cleanup must remove those resources.
- Responsive/font-fit timers are stored under `timers.fontFit` when used and cleared before a newer fit or cleanup.
- `historyReplayHandlerContribution` is a runtime contribution for the history replay collector; it is cleared during module cleanup.
- `destroy()` sets `_isDisposed = true` first, aborts controllers, removes listeners, clears timers/pending promises, clears per-widget runtime entries and marks module state `disposed`.
- Per-widget cleanup in this tranche is owned by `widgetText/cleanupContent`; module `destroy()` cleans all remaining per-widget runtime.

## 5. Public API

Feature module surface:

```js
_KDB.api.widgetText = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

Method contracts:

| Method | Signature | Contract |
|---|---|---|
| `mount(options)` | `({ defaultText?: string, autoFitDelayMs?: number } = {}) => boolean` | Initializes `_KDB.state.widgets.text` and `_KDB.runtime.widgetText`. Does not create per-widget content; per-widget creation is `contentCreate`. |
| `destroy()` | `() => void` | Idempotent module teardown; sets `_isDisposed` before cleanup and removes all owned runtime resources. |
| `dispatch(action)` | `(action: WidgetTextAction) => Promise<object>` | Single command entry. All state/effect actions route through this method. Post-disposal calls no-op and warn once. |
| `getState()` | `() => object | undefined` | Returns a cloned snapshot of `_KDB.state.widgets.text`; never returns live mutable state. |

No named commands are added to `_KDB.api.widgetText`.

### 5.1 Action Envelope

Every public action uses:

```js
{
  type: "widgetText/<actionName>",
  widgetId: "<required for per-widget actions>",
  opSeq: 1,
  payload: {}
}
```

`widgetId` is canonical in the envelope. Payloads must not repeat `widgetId`; if a production caller still repeats it in `payload.widgetId`, the values must match or dispatch returns `WIDGET_TEXT_WIDGET_ID_CONFLICT`.

Normalized dispatch result:

```js
{
  ok: boolean,
  widgetId?: string,
  opSeq?: number,
  skipped?: boolean,
  stale?: boolean,
  status?: "success" | "error" | "aborted",
  reportToSettings?: object,
  errorCode?: string,
  errorMessage?: string,
  diagnostics?: object,
  reasonCode?: string
}
```

`reportToSettings` is for `widgetSettings` only. `widgetText` does not commit settings values or settings history directly.

## 6. Action Payloads And Behaviour

### `widgetText/contentCreate`

Payload:

```js
{
  dropRequest: {
    draggedElementType: "text" | string,
    payload: {
      text?: string,
      title?: string,
      defaultText?: string
    },
    sourceKind: "toolboxTextButton" | string,
    tabId?: string | null
  },
  payload?: object,
  sourceKind?: string,
  isHistoryReplay?: boolean
}
```

Behavior:

1. Validate the action envelope and resolve/capture `opSeq`.
2. Resolve the shell by `widgetId` using a scoped DOM resolver; missing shell returns `WIDGET_TEXT_SHELL_MISSING`.
3. Resolve or create the text content boundary inside the shell. The target DOM structure is:

```txt
<widget shell id=widgetId>
  .widgetContentWrapper
    .staticContent
      .textFillNoScroll
        .note-editable
          p
            span
```

4. If legacy shell markup already contains `.textFillNoScroll .note-editable`, reuse it and re-resolve refs.
5. If the editable structure is absent, create the minimal content structure above inside the existing shell content slot. `widgetText` must not move the shell or create settings chrome.
6. Determine initial text from `dropRequest.payload.text`, then `dropRequest.payload.title`, then `payload.defaultText`, then module option `defaultText`, then `"Text hier eingeben"`.
7. Write initial text to `.note-editable p` and `_KDB.state.widgets.text.byId[widgetId].content.text`.
8. Initialize per-widget runtime refs and clear pending.
9. Return `{ ok: true, widgetId, opSeq, status: "success" }`.

History:

- `contentCreate` does not push `widget_textEdit`.
- Drop/create history is owned by `widgetBase` (`widget_canvasDrop`) after shell placement and content creation succeed.

Failure:

- Returns normalized failure and writes only `widgetText` owned error state.
- `widgetBase` decides whether content-create failure rolls back the shell/frame.

### `widgetText/commitTextEdit`

Payload:

```js
{
  source: "settingsIcon" | "historyReplay" | "programmatic" | string,
  selectText?: boolean,
  commitOnBlur?: boolean,
  isHistoryReplay?: boolean,
  nextText?: string,
  previousText?: string
}
```

Behavior for user/icon start:

1. Validate `widgetId`, resolve editable nodes and ensure the text record exists.
2. If no `nextText` is supplied, start an inline edit session:
   - set `contenteditable="true"` on `editableEl`;
   - set `data-kdb-text-edit-active="1"`;
   - store `{ isActive:true, originalText, startedAt }` in runtime;
   - bind `focusout`, `keydown` and cleanup listeners through an AbortController.
3. On `focusout`, read the next text from `paragraphEl || editableEl`, normalize it to a string, clean the edit session and dispatch/continue the same action as a confirmed commit.
4. On `Escape`, restore `originalText`, clean the edit session and return a skipped result with `reasonCode: "WIDGET_TEXT_EDIT_CANCELLED"`.
5. On confirmed commit, compare `previousText` from state/runtime to `nextText`.
6. If unchanged, write no state/history and return `{ ok:true, skipped:true, reasonCode:"WIDGET_TEXT_UNCHANGED" }`.
7. If changed, write `_KDB.state.widgets.text.byId[widgetId].content.text = nextText`, sync `.note-editable p`, clear pending/error and push `widget_textEdit` unless `isHistoryReplay`.
8. If the current font target has `responsiveFontSize`, schedule automatic font re-fit after commit using the owned timer bucket.

Behavior for replay/programmatic commit:

- When `nextText` is supplied, do not start a contenteditable session. Apply the text directly through the confirmed commit path with `isHistoryReplay` honored.

History step:

```js
{
  key: "widget_textEdit",
  timestamp: 1710000000000,
  old: { widgetId: "widget-id", text: "before" },
  new: { widgetId: "widget-id", text: "after" }
}
```

History is pushed only when text changed, after DOM and owned state both succeeded, and never during replay.

### `widgetText/applyFontSize`

Payload:

```js
{
  kind?: "fontSize",
  source: "user" | "startup" | "historyReplay" | string,
  optionKey?: "default" | "automatic" | "8px" | "10px" | string,
  optionValue?: "Automatic" | "automatic" | "8px;" | "8px" | string,
  previousValue?: string | null,
  nextValue?: string,
  isHistoryReplay?: boolean
}
```

Behavior:

1. Normalize the requested value from `nextValue`, then `optionValue`, then `optionKey`.
2. `"default"`, `"Default"`, `"Automatic"`, `"automatic"`, empty string and `null` normalize to `"automatic"`.
3. Fixed pixel values normalize by trimming whitespace and an optional trailing semicolon. Valid fixed values match `/^[1-9][0-9]{0,2}px$/`.
4. Resolve `textNodeForFont` as `spanEl || paragraphEl || editableEl`.
5. For `"automatic"` in the current production implementation:
   - preserve the existing automatic-font host behavior: `textFitted` is applied and layout reflow/resize is triggered where needed;
   - clear or bypass scoped fixed-font overrides for the widget;
   - synchronize Cognos `fontSize` when the shell exposes the current host property API.
6. For fixed pixel values in the current production implementation:
   - remove automatic-fit styling from the target path where applicable;
   - apply a scoped widget-specific font-size style so Cognos/host styling does not override the chosen value;
   - synchronize Cognos `fontSize` when the shell exposes the current host property API.
7. Do not write `fontSize` into `_KDB.state.widgets.text` or `_KDB.state.widgets.settings`.
8. Return `reportToSettings` so `widgetSettings` can commit its own value and `widget_setting_fontSize` history when appropriate.

Note: the earlier CP-1 draft described a pure `responsiveFontSize` + binary-fit implementation. Production currently uses the behavior above. Cleanup work is behavior-preserving and must not replace this font path unless a separate functional change is approved.

Success result:

```js
{
  ok: true,
  widgetId,
  opSeq,
  status: "success",
  reportToSettings: {
    control: "fontSize",
    kind: "fontSize",
    previousValue: "<from payload or null>",
    nextValue: "<normalized settings value>",
    appliedValue: "automatic" | "14px",
    diagnostics: {
      target: "span" | "paragraph" | "editable",
      responsive: true | false,
      fittedPx?: number
    }
  }
}
```

History:

- No `widgetText` history.
- `widgetSettings` owns `widget_setting_fontSize` after successful apply.

### `widgetText/applyRestyle`

Payload:

```js
{
  kind?: "layout" | "restyle",
  source: "user" | "startup" | "historyReplay" | string,
  optionKey?: "default" | "zentriert" | "rahmen(alle)" | string,
  optionValue?: "KDB_widgetHeader_defaultStyle" | "KDB_widgetHeader_centeredStyle" | string,
  previousValue?: string | null,
  nextValue?: string,
  isHistoryReplay?: boolean
}
```

Behavior:

1. Normalize the requested restyle from `nextValue`, then `optionValue`, then `optionKey`.
2. Resolve the widget shell by `widgetId`.
3. Remove every known legacy text header class matching `KDB_widgetHeader*` from the shell.
4. If the normalized value is `"default"` or `KDB_widgetHeader_defaultStyle`, apply the default class.
5. If the normalized value is `"reinigen"` or an empty clear sentinel, leave all header classes removed.
6. If the normalized value is a known `KDB_widgetHeader*` class, add that class.
7. If the value is an option key, map it through the module restyle map to the corresponding class.
8. Do not toggle off a class merely because it was already present; repeated apply is idempotent.
9. Do not write `restyle` / `layout` into `_KDB.state.widgets.text` or `_KDB.state.widgets.settings`.
10. Return `reportToSettings` so `widgetSettings` can commit its own value and `widget_setting_restyle` history when appropriate.

Success result:

```js
{
  ok: true,
  widgetId,
  opSeq,
  status: "success",
  reportToSettings: {
    control: "restyle",
    kind: "layout",
    previousValue: "<from payload or null>",
    nextValue: "<normalized settings value>",
    appliedClass: "KDB_widgetHeader_centeredStyle",
    diagnostics: {
      clearedClasses: ["KDB_widgetHeader_defaultStyle"],
      appliedClass: "KDB_widgetHeader_centeredStyle"
    }
  }
}
```

History:

- No `widgetText` history.
- `widgetSettings` owns `widget_setting_restyle` after successful apply.

### `widgetText/applyReadableTextColor`

Payload:

```js
{
  source: "user" | "startup" | "historyReplay" | "widgetSettings" | string,
  textColor: "#ffffff" | "#000000" | string,
  backgroundColor?: string,
  isHistoryReplay?: boolean
}
```

Behavior:

1. Validate `widgetId` and resolve/capture `opSeq`.
2. Treat `textColor` as a required derived value supplied by the caller.
3. Apply a scoped `<style>` element under `_KDB.runtime.widgetText.byId[widgetId].styleElements.textColor`.
4. Scope the color rule to the text widget shell and its text-content descendants only.
5. Do not write `colour`, `backgroundColor` or `textColor` into `_KDB.state.widgets.text` or `_KDB.state.widgets.settings`.
6. Do not push history; `widgetSettings` owns colour value/history and `widgetBase` owns shell/background colour apply.
7. Return success/failure for diagnostics. `widgetSettings` may call this as best-effort after a successful colour commit.

History:

- No `widgetText` history.
- No settings history; the setting was already committed by `widgetSettings/commitColour`.

### `widgetText/applyTitle`

Payload:

```js
{
  kind?: "title",
  source: "dropdown" | "user" | "historyReplay" | string,
  optionKey?: string,
  optionValue?: string,
  isHistoryReplay?: boolean
}
```

Behavior:

- Current production `widgetSettings` may route text title dropdown selections to `widgetText/applyTitle`.
- For text widgets, legacy REDESIGN2 treated the title dropdown as display-only; actual edit starts from the Text icon.
- Target behavior returns an intentional skip:

```js
{
  ok: true,
  widgetId,
  skipped: true,
  reasonCode: "WIDGET_TEXT_TITLE_DROPDOWN_DISPLAY_ONLY"
}
```

`widgetText/applyTitle` writes no state, applies no DOM changes and pushes no history.

### `widgetText/cleanupContent`

Payload:

```js
{
  reason: "routeToLaunchpad" | "settingsDelete" | "remove" | "destroy" | "historyReplay" | string,
  clearDom?: boolean,
  isHistoryReplay?: boolean
}
```

Behavior:

- Abort any inline edit session and font-fit work for the widget.
- Remove listeners/timers/AbortControllers owned by `widgetText`.
- Clear per-widget runtime refs.
- For `reason: "remove"` or `"destroy"`, remove the text record from `_KDB.state.widgets.text.byId` or leave a disposed diagnostic only if implementation needs post-destroy inspection.
- For `reason: "routeToLaunchpad"` / `"settingsDelete"`, keep serializable content state so undo/take-back can restore the text body through a later replay/restore path.
- Do not move the shell, remove settings controls, write base placement, or push history.

## 7. Editable Node And DOM Boundaries

`widgetText` owns only the text content subtree inside an already-owned widget shell. It may query inside the shell resolved by `widgetId`; it must not run unscoped global content queries except for the documented shell lookup by exact id.

Editable-node resolver contract:

```js
resolveTextEditableNodes(_KDB, widgetId, shellEl?) => {
  shellEl,
  contentEl,
  editableEl,
  paragraphEl,
  spanEl,
  textNodeForFont
}
```

Resolution order:

1. `shellEl` is the supplied shell or exact `#${widgetId}` lookup.
2. `editableEl` is `.textFillNoScroll .note-editable`, then `.note-editable`, then `#${widgetId}Editable` if contained in the shell.
3. `paragraphEl` is `editableEl.querySelector("p")`.
4. `spanEl` is `editableEl.querySelector("span")`.
5. Text edit read/write target is `paragraphEl || editableEl`.
6. Font target is `spanEl || paragraphEl || editableEl`.

DOM writes allowed:

- create/reuse the minimal text content boundary during `contentCreate`;
- set text content in the edit target;
- toggle `contenteditable` and `data-kdb-text-edit-active` during inline edit;
- add/remove `responsiveFontSize` and `style.fontSize` on the font target;
- add/remove known `KDB_widgetHeader*` classes on the widget shell for text restyle;
- add/remove scoped readable text-colour `<style>` elements owned by `_KDB.runtime.widgetText`.

DOM writes forbidden:

- moving the widget shell between canvas and launchpad;
- changing shell geometry, drag/resize handles or base placement;
- creating/removing settings panel controls;
- applying shell background/colour;
- reading or writing another module's runtime DOM refs;
- storing live DOM in `_KDB.state`.

## 8. Readers / Writers

Published selectors from `widgetText/state/selectors.js`:

| Selector | Reads | Returns |
|---|---|---|
| `readWidgetTextState(_KDB)` | `_KDB.state.widgets.text` | Cloned text subtree or `undefined`. |
| `readTextRecord(_KDB, widgetId)` | `_KDB.state.widgets.text.byId[widgetId]` | Cloned text record or `undefined`. |
| `readTextContent(_KDB, widgetId)` | `_KDB.state.widgets.text.byId[widgetId].content.text` | String text or `undefined`. |
| `readTextPending(_KDB, widgetId)` | `_KDB.state.widgets.text.byId[widgetId].pending` | Cloned pending marker or `undefined`. |

Internal reducer actions:

| Action type | Purpose |
|---|---|
| `widgetText/mountStarted` | Initialize state/runtime and set module lifecycle `initializing`. |
| `widgetText/mountSucceeded` | Set module lifecycle `ready`. |
| `widgetText/registerContent` | Create/update a per-widget text record after contentCreate. |
| `widgetText/commitTextContent` | Write confirmed `content.text`. |
| `widgetText/markPending` | Set per-widget pending marker and optional `opSeq`. |
| `widgetText/clearPending` | Clear per-widget pending marker. |
| `widgetText/errorRecorded` | Record module or per-widget `errorCode` / `errorMessage`; module-level failures set lifecycle `error`. |
| `widgetText/cleanupContentSucceeded` | Remove/keep per-widget text record according to cleanup reason. |
| `widgetText/destroy` | Transition module lifecycle to `disposed`; runtime already cleaned. |

Reducers are pure and perform no DOM, Cognos, event, timer, Promise or history effects.

## 9. Events

Emitted events: none in this tranche.

Subscribed events: none in this tranche.

No `events/eventNames.js` is created. A fact-event may be added only when a real external consumer exists and `architecture/eventSubscribe.md` is updated.

## 10. Dependencies

- `_KDB` as injected boundary input.
- `_KDB.services.history.pushCommittedStep(step)` for `widget_textEdit`.
- `_KDB.api.widgetSettings` as caller/consequence consumer only; `widgetText` does not call back into settings for apply commits in this tranche.
- `_KDB.api.widgetBase` as the owner that calls `contentCreate` and may later call `cleanupContent`; `widgetText` does not write base state.
- `_KDB.api.widgetText.dispatch({ type: "widgetText/applyReadableTextColor", ... })` as the public route used by `widgetSettings` after committed text-widget colour changes. `widgetSettings` must not import `widgetText/effects/*` directly.
- `_KDB.config.options` or local `config/restyleClasses.js` for restyle class mapping. New code must not use forbidden `_KDB.dropdownOptions`.
- Widget shell DOM resolved by exact `widgetId`.

Deep files receive dependencies through AMD imports and controller options. They do not discover `_KDB` through `window`.

## 11. Cognos Touchpoints

`widgetText` performs no Cognos data/query calls in this tranche. Current production does synchronize the text widget `fontSize` host property as part of the behavior-preserving font apply path; cleanup work must preserve that touchpoint unless a separate functional delta is approved.

Text widgets are treated as DOM/contenteditable content inside a Cognos widget shell already placed by `widgetBase`. If a future Cognos wrapper is needed to mirror title/text body into a host property, that requires a contract delta because it may affect content ownership, restore and writeback semantics.

## 12. History Behaviour

History service is called only after confirmed successful effects. Steps are JSON-serializable and keyed by stable `widgetId`.

| Action | History |
|---|---|
| `contentCreate` | No `widgetText` history; base drop history owns create/drop. |
| `commitTextEdit` | Commit `widget_textEdit` after confirmed text state + DOM write when text changed; no history on cancel, unchanged, failed edit or replay. |
| `applyFontSize` | No `widgetText` history; `widgetSettings` owns `widget_setting_fontSize`. |
| `applyRestyle` | No `widgetText` history; `widgetSettings` owns `widget_setting_restyle`. |
| `applyReadableTextColor` | No `widgetText` history; `widgetSettings` owns colour setting history. |
| `applyTitle` | No history; display-only skip. |
| `cleanupContent` / destroy / error / stale | No history. |

`widget_textEdit` replay handler registration is present in production through the module runtime contribution collected by `historyService`. Cleanup work must preserve this staging unless the history replay tranche explicitly changes the contract. The replay semantics are:

- undo dispatches `widgetText/commitTextEdit` with `nextText: step.old.text`, `isHistoryReplay: true`;
- redo dispatches `widgetText/commitTextEdit` with `nextText: step.new.text`, `isHistoryReplay: true`;
- replay must not push a second history step;
- replay applies through the same text state + DOM write path as user commits.

## 13. Error Taxonomy

| Code | Meaning |
|---|---|
| `WIDGET_TEXT_MOUNT_FAILED` | Module mount failed. |
| `WIDGET_TEXT_DESTROY_FAILED` | Destroy cleanup boundary caught an error. |
| `WIDGET_TEXT_WIDGET_ID_MISSING` | Required envelope `widgetId` is missing. |
| `WIDGET_TEXT_WIDGET_ID_CONFLICT` | Envelope `widgetId` conflicts with payload `widgetId`. |
| `WIDGET_TEXT_SHELL_MISSING` | Widget shell cannot be resolved by id. |
| `WIDGET_TEXT_EDITABLE_MISSING` | Editable/content node cannot be resolved or created. |
| `WIDGET_TEXT_CONTENT_CREATE_FAILED` | Content creation failed after validation. |
| `WIDGET_TEXT_EDIT_START_FAILED` | Inline edit session could not start. |
| `WIDGET_TEXT_EDIT_COMMIT_FAILED` | Confirmed text commit failed. |
| `WIDGET_TEXT_FONT_VALUE_INVALID` | Font-size payload cannot be normalized to `automatic` or a px value. |
| `WIDGET_TEXT_FONT_TARGET_MISSING` | Font target cannot be resolved. |
| `WIDGET_TEXT_FONT_APPLY_FAILED` | Font CSS apply or responsive fit failed. |
| `WIDGET_TEXT_RESTYLE_VALUE_INVALID` | Restyle payload cannot be mapped to a known class/clear/default. |
| `WIDGET_TEXT_RESTYLE_TARGET_MISSING` | Restyle shell target cannot be resolved. |
| `WIDGET_TEXT_RESTYLE_APPLY_FAILED` | Restyle class apply failed. |
| `WIDGET_TEXT_COLOR_VALUE_MISSING` | Readable text-colour payload is missing. |
| `WIDGET_TEXT_COLOR_APPLY_FAILED` | Scoped readable text-colour apply failed. |
| `WIDGET_TEXT_HISTORY_COMMIT_FAILED` | Text changed but history step push failed after owned state/DOM commit. |
| `WIDGET_TEXT_CLEANUP_FAILED` | Per-widget cleanup failed. |
| `WIDGET_TEXT_UNKNOWN_ACTION` | Dispatch received an unsupported action type. |

Errors are logged once at the boundary with operation context. Foreign state is never written on error.

## 14. Supersession

Each per-widget operation gets an `opSeq` from `_KDB.runtime.widgetText.byId[widgetId].opSeq`. Async or delayed work captures the current value and checks it before writing state, mutating DOM, committing history or returning a success report.

Stale continuations return:

```js
{ ok: false, widgetId, opSeq, stale: true, status: "aborted" }
```

Starting a new inline edit aborts any existing edit session for the same widget before installing listeners. Starting a new automatic font fit clears the prior font-fit timer for the same widget.

`widgetText` must not use multiple competing sequence fields. `opSeq` is the only stale-result guard.

## 15. Folder Layout

```txt
KDB3/js/dashboard/widgets/widgetText/
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

No `events/eventNames.js` is created because `widgetText` emits no events in this tranche.

## 16. Bootstrap Registration

Production bootstrap registration appears already present:

- `KDB.js` imports `./dashboard/widgets/widgetText/__orchestratorWidgetText.js`;
- feature registration assigns `_KDB.api.widgetText`;
- feature mounting calls `_KDB.api.widgetText.mount({})`;
- root destroy calls `destroyFeatureApi(this.api.widgetText)`.

This tranche must not add duplicate registration. CP-2 must confirm import/mount order and note any integration gap, but expected production work is inside `widgetText`, not `KDB.js`.

## 17. Out Of Scope

- Editing `.cursor/rules/`, templates or legacy trees.
- Widget shell placement, launchpad routing, move/resize/delete and base history — owner: `widgetBase`.
- Settings panel UI, dropdown options, canonical `fontSize` / `restyle` values and settings history — owner: `widgetSettings`.
- Shell colour/background apply — owner: `widgetBase` as consequence-owner for `widgetSettings`; derived readable text colour for text content is owned by `widgetText/applyReadableTextColor`.
- Visualization binding, title, datasource, drillthrough, maximize and Dienststelle downstream — owner: `widgetVis`.
- Header icons / icon dropdown behavior.
- Parameter-set/writeback restore.
- Cross-module integration tests.
- Browser harness or `TEST/` sandbox.
- Applying blueprint §9 authority-doc deltas.

## 18. Open Questions For CP-1 Approval

1. **Q1 state path:** approve `_KDB.state.widgets.text.byId[widgetId].content.text` as the only canonical text content write; fontSize/restyle remain in `_KDB.state.widgets.settings`.
2. **Q2 public surface:** approve dispatch-style `_KDB.api.widgetText = { mount, destroy, dispatch, getState }` with no named helpers.
3. **Q3 runtime:** approve `_KDB.runtime.widgetText.byId[widgetId]` with `domRefs`, `listeners`, `abortControllers`, `timers`, `pendingPromises`, `opSeq` and `editSession`.
4. **Q4 events:** approve no emitted/subscribed events and no `events/eventNames.js` in tranche 1.
5. **Q5 disposed discipline:** approve `_isDisposed` controller guard and post-destroy no-op dispatch/mount behavior per `module-public-api.mdc`.
6. **Q6 apply report:** approve the `reportToSettings` shapes for `applyFontSize` and `applyRestyle`.
7. **Q7 automatic font:** production currently preserves the legacy `textFitted`/scoped-style/Cognos-sync font path; replacing it with `responsiveFontSize` binary-fit is a separate functional decision.
8. **Q8 text edit trigger:** approve icon click / `commitTextEdit` as the only interactive text edit trigger; `applyTitle` dropdown route is display-only skip.
9. **Q9 legacy restyle quirk:** approve dropping laatsteOriginal toggle-off-on-same-style behavior in favor of idempotent class apply.
10. **Q10 history replay:** production currently records `widget_textEdit` and stages its replay handler through runtime contribution; cleanup must preserve this unless the history replay tranche changes the contract.
11. **Q11 readable text colour:** approve `widgetText/applyReadableTextColor` as the public consequence route for text-widget readable text colour after `widgetSettings/commitColour`; it is best-effort and does not own background colour or colour history.

## 19. Acceptance Checks

CP-1 is acceptable when:

1. Public API is exactly `{ mount, destroy, dispatch, getState }`.
2. Every action payload above is implemented or explicitly deferred with a contract delta.
3. `_KDB.state.widgets.text` is the only state subtree written by `widgetText`.
4. `_KDB.runtime.widgetText` contains all non-serializable resources and has a complete cleanup path.
5. `contentCreate` creates/reuses text content DOM after `widgetBase` has placed the shell and does not push history.
6. `commitTextEdit` starts inline edit from the Text icon path and pushes `widget_textEdit` only after a real confirmed content change.
7. `applyFontSize` and `applyRestyle` apply DOM/CSS consequences only and return `reportToSettings`; they do not write settings values or history.
8. `applyReadableTextColor` applies only scoped text colour CSS through `widgetText` public dispatch; no other module imports `widgetText/effects/*` directly.
9. `applyTitle` is an intentional display-only skip, not a silent scaffold no-op.
10. Automatic/fixed font apply preserves the current `textFitted`/scoped-style/Cognos-sync behavior and clears owned timers/style resources on newer operations/cleanup.
11. Restyle apply is idempotent and does not preserve the legacy toggle-off quirk.
12. No `widgetText` code emits events or creates `events/eventNames.js`.
13. `widgetText` performs no data/query Cognos calls; the existing font-size host property sync is an approved production touchpoint for behavior-preserving cleanup.
14. No code reads legacy `_KDB.dropdownOptions`; option values come from payloads or `_KDB.config.options` / local config.
15. No code reads or writes foreign module runtime or state.
16. All lifecycle values are from `lifecycleVocabulary.md`.
17. Production files use AMD full-compact form and pass lints.
18. `KDB.js` bootstrap is not duplicated; CP-2 records that current mount exists or flags the exact missing registration.
19. The execution spec maps every new production file to legacy evidence and rule-alignment notes.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-06-06 | `Stub` | `<pending>` | Initial outline created with widget-domain blueprint. |
| 2026-06-16 | `Stub -> Draft CP-1` | `<pending>` | Full composed-port contract expanded for `widgetText`; includes production dispatch gap, text DOM boundaries, inline edit history, apply/report shapes and legacy deltas. |
