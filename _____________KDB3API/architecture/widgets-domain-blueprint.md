# Widgets Domain Architecture Blueprint (CP-1)

> Meta-architecture blueprint for the widgets domain of the KDB3 redesign. This document records the CP-1 design decisions agreed with the user; it precedes any port tranche. Deeper per-module detail lives in the per-module contracts under `_____________KDB3API/contracts/`.

---

**Status:** `CP-1 agreed (design)` — implementation not started
**Domain:** `widgets`
**Authoring AI:** Planner (Claude Opus 4.8), 2026-06-06
**Reviewed by:** user (design agreed across CP-1 sparring sessions, 2026-06-05/06)
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.
**Source surveys:** `widgets-legacy-survey-redesign2.md`, `widgets-legacy-survey-laatsteoriginal.md`, `widgets-current-architecture-touchpoints.md`.

---

## 0. Scope

This blueprint defines the **target architecture and port order** for the widgets domain. It does **not** contain production code or full per-module contracts. Contract stubs (titles/outline) accompany this document; full contracts are written per tranche, immediately before that module is ported (Module Contract First per `feature-structure.mdc`).

No `.cursor/rules/` change is required: cross-module request/response uses dispatch-choreography (option C), not named query methods on feature APIs, so `module-public-api.mdc` stays as-is.

**Authority note:** this blueprint is accepted as **architecture authority** for the widgets domain; it is **not** an implementation prompt. Before each tranche, a concrete Module Contract First document must specify exact public-API signatures, action payload schemas, canonical state writes, runtime ownership, DOM boundaries, Cognos touchpoints, history behaviour, rollback/error behaviour, supersession/`opSeq` behaviour, and acceptance checks. The §12 requirements are mandatory inputs to those contracts.

## 1. Headline findings driving the design

- **Legacy has only two real widget types: `text` and `visualization` (live).** `topN` is a visualization capability backed by a borrowed hidden LIST helper table; `datatable` is the Cognos `"List"` visType (mostly passive). The new four-token taxonomy is a deliberate new decomposition, not a legacy fact.
- **The widget "frame" (identity, placement, lifecycle, launchpad routing, move/resize) is type-agnostic; the "content" (text/vis/topN/datatable) is type-specific.** This drives a base/content split.
- Cross-type concerns (registry, drop handling, placement, launchpad routing) want a single owner; content behaviour is genuinely per-type.

## 2. Module & service map

**Feature modules (each dispatch-style `_KDB.api.<module>`):**

| Module | Responsibility |
|---|---|
| `widgetBase` | Type-agnostic widget core: identity/registry, `kind`/`role`/`ownerWidgetId`, `tabId`/`tabHandle`, placement (onCanvas/inLaunchpad/removed), launchpad pad/slot routing, move/resize mechanics + canvas layout (`x/y/w/h`), lifecycle, handling of `canvas:dropValidated`, and applying shell-level effects (e.g. background colour) on request. |
| `widgetSettings` | Settings control-surface: owns the **panel-control VALUES** (vis: dimension/sequences/visType/topNChoice; text: fontSize/restyle; colour) + their **history steps**, and the panel/dropdown UI lifecycle (build/place/bind/open/close, per-type rendering). On commit it dispatches the value to the consequence-owner, which derives/applies. Owns no derived state. |
| `widgetText` | Text content: inline text edit (content) + its history; derives/applies text styling (fontSize/restyle) on request from `widgetSettings`; editable-node resolution. |
| `widgetVis` | Visualization content: derives + applies all consequences of vis settings (slots/binding/render) via the binding services; title, datasource, legend/tooltip, drillthrough; **maximize/focus-mode** (vis-only); dienststelle downstream entry. Owns derived/working state, **not** the control values. |
| `widgetTopN` | TopN resolution: resolution state machine, helper-table claim/resolution, hierarchy rewrite, descriptor; returns result values to `widgetVis`. |
| `widgetDataTable` | Datatable (List) content: mostly passive; launchpad routing target; can be claimed as a TopN helper. |

**Shared services (named-method `_KDB.services.<service>`):**

| Service | Responsibility |
|---|---|
| `widgetBindingPlan` | Pure: build a declarative binding plan (slots + filters + datasource + visType + mirror) from a spec. No DOM, no Cognos, no state writes. |
| `widgetBindingApply` | Cognos apply/render of a binding plan against a target widget id (datasource/visType/slots/local filters/render-wait), returns result/diagnostics. No `_KDB.state.widgets` writes. |

Consumers of both services: `widgetVis` (visible widget) and `widgetTopN` (helper widget) — two proven consumers, justifying promotion now.

**Existing services consumed:** `tableData`, `history`.

**Shared pure files (not a module, not a service):** a small `dashboard/widgets/_shared/` of precisely-named pure helpers — e.g. a serializable-clone, a stale/supersession comparator, the shared widget-state schema/term conventions. No `_KDB.*` surface; AMD-imported by the modules. (The settings-bar builder is now `widgetSettings`'s own view, not a shared helper.)

> Note: `widgetLaunchpadBridge` and a separate `_widgetCore` layer were considered and **dropped** — with `widgetBase` owning placement/launchpad routing for all widgets, the launchpad-movement logic is `widgetBase`'s own effects (single owner, no single-consumer service), and the remaining shared bits are the `_shared/` pure files.

## 3. CP-1 acceptance matrix

| Decision | Outcome |
|---|---|
| Top-level shape | Per-type **content** modules + one type-agnostic **`widgetBase`** module (base/content split). |
| Widget types | `text`, `vis`, `topN`, `datatable` as four content modules; `topN`/`datatable` are first-class modules (not vis decorators) but topN has no standalone widget — it serves vis. |
| State ownership | Nested per-owner under `_KDB.state.widgets.{base,settings,text,vis,topN,dataTable}`; one canonical writer per sub; **no `_KDB.state.widgets` root writer** (mirrors the `_KDB.state.filters.<module>` precedent). |
| Public API | Six dispatch-style feature modules `_KDB.api.{widgetBase,widgetSettings,widgetText,widgetVis,widgetTopN,widgetDataTable}`. No named query methods on feature APIs (option C chosen). |
| Shared services | `widgetBindingPlan` (pure) + `widgetBindingApply` (Cognos apply/render); promoted now (two consumers: vis + topN). |
| Shared pure code | `dashboard/widgets/_shared/` precisely-named pure helpers (clone, stale-comparator, schema conventions). No vague `core`/`helpers` bucket. |
| vis ↔ topN | **Option C — dispatch choreography** (see §6.2) with the five-rule contract. No rule change. |
| dienststelle downstream | `dienststelle` dispatches `_KDB.api.widgetVis.dispatch({ type: "widgetVis/dienststelleChanged", ... })`. The legacy `visualizationWidget` placeholder name resolves to `widgetVis`. |
| Canvas placement owner | `widgetBase` (was unowned). |
| Drop handling | `widgetBase` subscribes `canvas:dropValidated`, creates the frame record + id, places the shell, then dispatches `widget<Type>/contentCreate`. After successful content creation it starts `widgetSettings/placeControls` + `widgetSettings/seedDefaults` when settings are available. |
| Launchpad | Pads aligned 1:1 with content modules + a catch-all, all per-tab: `text`/`visualization`/`dataTables`/`topN`/`otherResources`. `widgetBase` owns send/take/route-all + pad classification, coordinating with `_KDB.api.launchpad` via selectors. Label streamlining vs legacy (note below the table). |
| Tabs | `tabId` + `tabHandle` stored in the `widgetBase` record; `tabs` module owns tab identity; widgets reference tab ids. |
| Maximize / focus-mode | Owned by `widgetVis` (vis-only Cognos focus mode; not a frame geometry change). |
| Settings | **`widgetSettings` module** owns the panel-control VALUES + the panel UI + the settings history steps. On commit it dispatches the requested value to the consequence-owner (vis settings → `widgetVis`; text styling → `widgetText`; colour → `widgetBase`), which **derives/applies**; `widgetSettings` writes the canonical value only after confirmed apply. Inline text edit (direct manipulation) stays with `widgetText`; drag/resize with `widgetBase`. Gear show/hide read from the `kdbControl` toggle. |
| Authoring mode | **No authoring gating** of widget editing (legacy did not gate on authoring). Gear show/hide is the `kdbControl` settings-buttons toggle. Authoring coupling deferred as an optional later improvement. |
| History | **Input-level steps, no derived snapshots.** Panel-control changes → `widgetSettings` steps (small: control value `old→new`); layout (move/resize) → `widgetBase`; inline text edit → `widgetText`; create/drop → `widgetBase`. Replay re-injects the input through the normal commit path and the consequence-owner **re-derives** all effects (e.g. a dimension change rebuilds all slots) — the large derived state is never snapshotted. Steps via `_KDB.services.history`; widget ids stable for replay. |
| Supersession | One `opSeq` + `AbortController` per widget in module runtime; serializable `pending` marker in state. |
| Parameter-set / write-back restore | **Out of scope** (not part of the current project). History undo/redo + replay-restore only. |
| Rule change | None (option C). |

> **Launchpad pad-label streamlining (widgets alignment).** Production launchpad channels align 1:1 with the content modules plus one catch-all:
> - All channels are **per-tab**: `text` — widgetText; `visualization` — widgetVis; `dataTables` — widgetDataTable; `topN` — widgetTopN / topN-helper parking; `otherResources` — anything outside the four type channels.
> - Remap vs legacy labels: legacy `shapes` → `dataTables`; legacy `dataTables` → `topN`; `text`/`visualization` unchanged. The legacy `shapes` **catch-all role** is taken over by the new `otherResources` channel.
> - `launchpad.md` carries the matching pad-key delta (apply with approval).

## 4. State ownership (proposed) and shapes

> Proposed `stateOwnership.md` delta (see §9): replace the single `_KDB.state.widgets | widgets module` entry with per-owner entries below. No root writer for `_KDB.state.widgets`.

| State subtree | Canonical writer |
|---|---|
| `_KDB.state.widgets.base` | `widgetBase` |
| `_KDB.state.widgets.settings` | `widgetSettings` |
| `_KDB.state.widgets.text` | `widgetText` |
| `_KDB.state.widgets.vis` | `widgetVis` |
| `_KDB.state.widgets.topN` | `widgetTopN` |
| `_KDB.state.widgets.dataTable` | `widgetDataTable` |

Shape sketch:

```js
_KDB.state.widgets = {
  base: {
    byId: {
      "<widgetId>": {
        kind: "text" | "vis" | "datatable",
        role: "primary" | "topNHelper",
        ownerWidgetId: null,                 // set for a topN helper
        tabId: "<tabId>", tabHandle: 0,
        placement: "onCanvas" | "inLaunchpad" | "removed",
        launchpadPad: null,                  // "text"|"visualization"|"dataTables"|"topN"|"otherResources" (legacy shapes->dataTables, legacy dataTables->topN)
        layout: { x, y, width, height } | null, // only when onCanvas (text/vis)
        lifecycle: "idle",                   // canonical vocabulary
        pending: { kind: null },             // serializable marker only
        errorCode: null, errorMessage: null
      }
    }
  },
  // CONTROL VALUES (history-tracked, input-level) — owner: widgetSettings
  settings: {
    byWidget: { "<widgetId>": {
        // vis controls:  dimension, sequences, visType, topNChoice
        // text controls: fontSize, restyle
        // any:           colour
        pending: { kind: null }, errorCode: null } },
    ui: { openForWidgetId: null }            // transient panel UI state
  },
  // DERIVED / WORKING content (NOT history-tracked; re-derived from settings)
  text: { byId: { "<widgetId>": { content: { text }, pending: { kind: null }, errorCode: null } } },
  vis:  { byId: { "<widgetId>": {
            derived: { titleText, topNResultValues },  // re-derived from settings + topN
            maximized: false,                // vis-only focus-mode flag
            pending: { kind: null }, errorCode: null } } },
  topN: { byOwner: { "<visWidgetId>": {
            resolutionStatus: "idle",        // domain status: idle|pending|error (not lifecycle)
            helperWidgetId: null, resultValues: [], excludeItemId: null, errorCode: null } } },
  dataTable: { byId: { "<widgetId>": { pending: { kind: null }, errorCode: null } } }
};
```

Runtime objects (AbortControllers, promises, supersession tokens, live DOM) live under `_KDB.runtime.<module>[widgetId]`, never in state. DOM-as-source-of-truth, module-global drillthrough buffers, and jQuery `.data()` history snapshots from legacy are **not** ported; the drillthrough buffer moves to `_KDB.runtime.widgetVis[id]`.

## 5. Public API surfaces and runtime buckets

```js
_KDB.api.widgetBase      = { mount, destroy, dispatch, getState };
_KDB.api.widgetSettings  = { mount, destroy, dispatch, getState };
_KDB.api.widgetText      = { mount, destroy, dispatch, getState };
_KDB.api.widgetVis       = { mount, destroy, dispatch, getState };
_KDB.api.widgetTopN      = { mount, destroy, dispatch, getState };
_KDB.api.widgetDataTable = { mount, destroy, dispatch, getState };

_KDB.services.widgetBindingPlan  = { buildPlan /* spec -> declarative plan, pure */ };
_KDB.services.widgetBindingApply = { applyBinding, destroy /* Cognos, target-parametrized */ };
```

Representative actions (owner of the control VALUE + its history vs the consequence-owner that derives/applies):

- `widgetBase`: `dropCreate`, `move`, `resize` (layout + layout history), `applyColour` (apply shell background on request — value/history at `widgetSettings`), `routeToLaunchpad`, `takeFromLaunchpad`, `remove`, `routeAllToLaunchpad`.
- `widgetSettings`: `openPanel`, `closePanel`, `placeControls`, `seedDefaults`, and the value-committing controls that own the history step: `commitDimension`, `commitSequences`, `commitVisType`, `commitTopNChoice`, `commitFontSize`, `commitRestyle`, `commitColour`. Each value commit dispatches `apply*` to the consequence-owner first, then commits the value and pushes the small step only after confirmed apply. `seedDefaults` follows the same apply-before-write rule but creates no history. `syncPanelFromState` after undo/redo.
- `widgetVis`: `contentCreate`, `dienststelleChanged`, `applyDimension`, `applySequences`, `applyVisType` (derive + apply via binding services; no own setting-history), `maximizeToggle` (vis focus-mode + its own history), `topNResolved` (inbound from topN).
- `widgetTopN`: `resolveRequested` (inbound from vis), `cleanup`.
- `widgetText`: `contentCreate`, `commitTextEdit` (inline edit — owns its history), `applyFontSize`, `applyRestyle` (apply on request from `widgetSettings`).
- `widgetDataTable`: `contentCreate`, `validateClaimable`, `releaseClaim`.

Runtime: `_KDB.runtime.<module>[widgetId] = { domRefs, listeners, abortControllers, observers, timers, pendingPromises, opSeq }` per `runtime.mdc`. `opSeq` + the current `AbortController` are the single per-widget supersession mechanism (replacing legacy's cycleId/mySeq/topN sequenceId mix).

## 6. Communication patterns

### 6.1 Defaults
- Command/notification to a known owner → `_KDB.api.<owner>.dispatch(...)`.
- Cross-module fact → `_KDB.events` (only with a real consumer + catalog entry).
- Request/response with a return value → named-method **service** (`widgetBindingPlan`/`widgetBindingApply`) or, within the widgets domain, the dispatch choreography below.

### 6.2 vis ↔ topN (option C — dispatch choreography) + five-rule contract
- `widgetVis` → `widgetTopN.dispatch({ type: "widgetTopN/resolveRequested", payload: { ownerVisId, ... } })`.
- `widgetTopN` resolves asynchronously (claim helper, plan via `widgetBindingPlan`, apply via `widgetBindingApply` on the helper target, read + hierarchy-rewrite).
- `widgetTopN` → `widgetVis.dispatch({ type: "widgetVis/topNResolved", payload: { ownerVisId, resultValues, excludeItemId, status } })`.

Five-rule contract that makes C safe:
1. Direct dispatch to **mounted modules** (no pub/sub listeners) — no listener race/cleanup/duplication.
2. Correlation by the **visualization `widgetId`** — no requestId protocol.
3. `widgetTopN` **always emits a terminal result** (`success` | `error` | `noHelperAvailable`) within a bounded time (render timeout) — never a silent no-answer.
4. **Supersession token** (`opSeq`) — stale `topNResolved` is ignored.
5. **Error encoded in the payload** — vis handles the error branch.

Loading is modelled as widget **lifecycle state** (loading until re-render complete), not as an await duration.

### 6.3 Other flows
- **Settings change (forward + undo via one path)**: `widgetSettings` owns the control VALUE and the small history step (`{ control: old→new }`). It dispatches `apply*` to the consequence-owner (`widgetVis`/`widgetText`/`widgetBase`) first; after confirmed apply, it commits the value and pushes the history step for user changes. **Undo** re-injects the old value through the same commit path; the consequence-owner re-derives. No derived state is snapshotted, and only one point (the consequence-owner's apply) is driven by both user and replay. Property: undo is a **re-apply against current data**, not a frozen restore (matches what legacy actually did for data-shape keys).
- **dienststelle → widgetVis**: `_KDB.api.widgetVis.dispatch({ type: "widgetVis/dienststelleChanged", payload })`; vis may request topN resolution, then calls `widgetBindingPlan` + `widgetBindingApply`. `dienststelle` never talks to topN or the binding services directly.
- **Drop**: `dragDrop` emits `canvas:dropValidated`; `widgetBase` subscribes, creates the frame record + id + places the shell (clamp/coordinates), then dispatches `widget<Type>/contentCreate` to the content module resolved from `draggedElementType`. For visual widgets, `contentCreate` is the per-widget registration/readiness gate; after it succeeds, `widgetBase` starts `widgetSettings/placeControls` and `widgetSettings/seedDefaults`. `seedDefaults` waits on `widgetVis/waitUntilContentReady` and then dispatches startup `apply*` actions. Startup defaults create no history, and seed failure does not roll back the placed widget.
- **Startup**: bootstrap order — `await launchpad.mount()` (ready), then mount widget modules; each module (or `widgetBase`) routes its widgets to the per-tab launchpad pad via `widgetBase`. Fallback `launchpad:ready` event only if ordering proves insufficient.

## 7. Settings model

`widgetSettings` is its own module that owns the **control surface** and the **control VALUES**; the content/frame modules own the **meaning** (the derived consequences). This split keeps history small: the step stores only the input (e.g. `dimension: a→b`), never the derived slot/binding state.

- **Ownership**: `widgetSettings` owns `_KDB.state.widgets.settings` — the panel-control values (vis: dimension/sequences/visType/topNChoice; text: fontSize/restyle; colour) + the transient panel UI state (`openForWidgetId`), and the **settings history steps**.
- **Rendering & placement**: `widgetSettings` builds/places/binds the gear + panel per widget type (text vs vis differ), mounting into the widget's shell settings-slot (provided by `widgetBase`) via a scoped query. Dropdown options are always present; the selected option reflects the stored value.
- **Commit & consequence**: on a control change, `widgetSettings` dispatches `apply*` to the consequence-owner first — vis settings → `widgetVis`; text styling → `widgetText`; colour → `widgetBase`. The consequence-owner **derives + applies** all effects (slots/binding/render/CSS). Only after confirmed apply does `widgetSettings` commit the canonical value and, for user changes, push the small history step. Startup defaults use the same confirmation discipline but no history.
- **What stays with the manipulator (not widgetSettings)**: drag/resize → `widgetBase` (layout + its own history); inline text edit → `widgetText` (content + its own history); maximize/focus-mode → `widgetVis`.
- **Undo/redo**: replay re-injects the stored value via the same commit→apply path; the consequence-owner re-derives. `widgetSettings` re-syncs its panel display (`syncPanelFromState`) if open. The value lives in state, so a closed panel is irrelevant.
- **Gear visibility**: `widgetSettings` reads the `kdbControl` settings-buttons toggle (legacy "Buttons verstecken" / `dashboardSettingIcons`); no authoring coupling.

### §7.1 Absent control sentinels

Vis settings `dimension` and `topNChoice` support an explicit "no selection" state via the control sentinel `"none"` (UI label "Ohne"). This is not a domain entity:

- Settings/history store the control sentinel `"none"` after confirmed apply (not a dimension key or TopN id).
- `widgetVis` interprets absent semantics and normalizes before binding (`null` / default kind).
- Binding plan uses `null` / default kind only; never looks up `dimensions["none"]`.
- Cognos mirror may use host token `"default"` for cleared values; that is not the settings control value.

| Layer | No dimension | No topN |
|---|---|---|
| UI / settings state | `"none"` | `"none"` |
| Binding `dataConfig` | `null` | default kind |
| Cognos mirror | `"default"` | `"default"` |

Cross-reference: `contracts/widgetSettings.md` §4.1, `contracts/widgetVis.md` §7.1.1–§7.1.2.

## 8. Folder layout (per `feature-structure.mdc`)

```txt
KDB3/js/dashboard/widgets/
  _shared/                       // pure helpers (no _KDB surface)
    state/cloneSerializable.js
    state/areWidgetValuesEqual.js
  widgetBase/
    config/  state/  view/  effects/  events/
    createWidgetBaseController.js
    __orchestratorWidgetBase.js
  widgetSettings/  ( config/ state/ view/ (panel + per-type controls + buildWidgetSettingsBar) effects/ + controller + orchestrator )
  widgetText/    ( config/ state/ view/ effects/ + controller + orchestrator )
  widgetVis/     ( config/ state/ view/ effects/ + controller + orchestrator )
  widgetTopN/    ( config/ state/ effects/ + controller + orchestrator )
  widgetDataTable/ ( config/ state/ effects/ + controller + orchestrator )

KDB3/js/core/services/
  widgetBindingPlan/   ( createWidgetBindingPlanService.js + __orchestrator… )
  widgetBindingApply/  ( createWidgetBindingApplyService.js + __orchestrator… )
```

## 9. Contract / authority-doc deltas (PROPOSALS — not yet applied)

Each delta below requires explicit user approval before the file is edited, and is best applied with the tranche that needs it.

| Target | Proposed delta | Apply when |
|---|---|---|
| `architecture/stateOwnership.md` | Replace `_KDB.state.widgets \| widgets module` with the six per-owner entries (§4), incl. `_KDB.state.widgets.settings \| widgetSettings`. | Start of `widgetBase` tranche. |
| `contracts/launchpad.md` | The deferred "widget movement" scope is owned by `widgetBase`; document the pad/slot selectors `widgetBase` consumes; per-tab pads confirmed. | `widgetBase` tranche. |
| `contracts/dragDrop.md` | Document `widgetBase` as the `canvas:dropValidated` subscriber that finishes placement. | `widgetBase` tranche. |
| `architecture/eventSubscribe.md` | Add `widgetBase` as subscriber of `canvas:dropValidated`. Add `launchpad:ready` only if the bootstrap-ordering fallback is needed. | `widgetBase` tranche. |
| `contracts/dienststelle.md` | Replace the `visualizationWidget` placeholder with `_KDB.api.widgetVis.dispatch({ type: "widgetVis/dienststelleChanged" })`. | `widgetVis` tranche. |
| `architecture/openDesignCandidates.md` | Move `widgetBindingService` from candidate to adopted (as `widgetBindingPlan` + `widgetBindingApply`). | First binding-service tranche. |

No `.cursor/rules/` change (option C).

## 10. Port roadmap (base-first)

| # | Tranche | Notes / dependencies |
|---|---|---|
| 0 | Contracts + approved deltas | Full per-module/service contracts (from the stubs) + the §9 deltas that the tranche needs. |
| 1 | `_shared/` + `widgetBase` | Foundation: registry/state, lifecycle, placement (clamp/layout), move/resize, launchpad routing (per-tab, via `_KDB.api.launchpad`), `canvas:dropValidated` handling, startup route-all, `applyColour`. Needs launchpad/dragDrop/stateOwnership deltas. |
| 2 | `widgetSettings` | Panel framework (build/place/bind, per-type controls), control-value state, settings history steps, commit→`apply*` dispatch + `syncPanelFromState`. Both content tranches depend on it. |
| 3 | `widgetText` end-to-end | Simplest content type: contentCreate on drop, inline text edit (`widget_textEdit`), `applyFontSize`/`applyRestyle` from `widgetSettings`. Proves base↔settings↔content. |
| 4 | `widgetBindingPlan` + `widgetBindingApply` | Needed before vis binding. |
| 5 | `widgetVis` | Drop/content, `applyDimension`/`applySequences`/`applyVisType` (derive via the services), title/legend/tooltip/drillthrough, maximize/focus-mode, dienststelle inbound. Needs dienststelle delta. |
| 6 | `widgetDataTable` | Passive: registry, launchpad routing, helper-claim support. |
| 7 | `widgetTopN` | Resolution state machine + helper claim/resolution via the binding services; vis↔topN choreography. |
| 8 | History replay | Replay handlers for the selected `widget_*` keys, after the binding flow stands. |

MVP history keys: `widget_canvasDrop`, `widget_launchpadTransfer`, `widget_layoutMove`, `widget_layoutResize` (base/lifecycle), then `widget_textEdit` (tranche 3). The settings keys (`widget_setting_dimension`/`visType`/`sequences`/`topNChoice`/`fontSize`/`restyle`/`colour`, owned by `widgetSettings`) arrive with their control's tranche — not MVP, and for vis they depend on the binding pipeline.

## 11. Open items / deferred investigation

- **Investigation-debt gate (blocks two full contracts).** Treat as gates, not just contract-writing. Before the `widgetVis` full contract: the full legend/tooltip normalization (`#`/`ALLE`/`Beendet`) needs a targeted investigation. Before the `widgetBase` full contract: the laatsteOriginal external widget lifecycle (launchpad send/take, `dragAndDropLifecycleHelpers`, `wbParameterSetWidgetsHelpers`) should be surveyed.
- **`widgetId` source & stability (resolve before `widgetBase` tranche).** The registry is keyed by `widgetId` and the vis↔topN correlation depends on it, but the id source is undefined: Cognos-assigned for widgets existing at startup vs KDB-assigned at drop-create, and its stability within a session (required for history replay). Define this before `widgetBase`.
- **Settings-slot DOM boundary:** content mounts its panel into its own header via a scoped query from `[data-kdb-widget-id]`; documented portal-style exception.
- **`placement` final field name** (currently `placement`; `placementStatus` considered).

## 12. Per-tranche full-contract requirements (execution-readiness gate)

This blueprint is design only. Each tranche's Module Contract First document MUST add, before any code is generated:

- **Public-API signatures + action payload schemas.** Every action uses the envelope `{ type, widgetId, opSeq?, payload }`; each action documents required fields, canonical state writes, runtime writes, side-effects, history behaviour, error behaviour and supersession behaviour.
- **Uniform mount/destroy semantics.** `mount(_options)` = module-level initialization only. Per-widget creation is `dropCreate` (`widgetBase`) / `contentCreate` (content modules), never `mount`. `destroy()` = module teardown; per-widget teardown is `remove` (`widgetBase`) / a content-cleanup action. `getState()` returns a read-only snapshot, never a live mutable reference.
- **Lifecycle stays canonical.** `lifecycle` uses only `lifecycleVocabulary.md` terms (`idle/initializing/loading/ready/error/disposed`, + `mounted/destroying`). Placement (`onCanvas/inLaunchpad/removed`) is the separate domain field. Do **not** introduce a custom merged lifecycle enum (e.g. `launching/active/launchpad/removing`).
- **History per action — input-level, by owner.** `widgetBase`: `dropCreate` yes (after successful `contentCreate`), `move`/`resize` (coalesced), `routeToLaunchpad`/`takeFromLaunchpad` decide. `widgetText`: `commitTextEdit` yes (inline content). `widgetSettings` (control-value steps, small input old→new): `dimension`/`sequences`/`visType`/`topNChoice`/`fontSize`/`restyle`/`colour`. `applyColour`/`apply*` on the consequence-owner and `topNResolved` carry **no** history. Steps are committed only after the consequence-owner confirms the successful effect. Replay re-injects the input; consequence-owner re-derives (no derived snapshot).
- **Write-after-apply discipline.** `widgetSettings` commits a control VALUE (and pushes its step) only after the consequence-owner confirms apply success (`widgetBindingApply` success / render confirmation for vis; CSS apply for text/colour); on failure it keeps the previous value + sets `errorCode` + clears `pending`. The consequence-owner stores derived/working state only, never the canonical control value.
- **Error taxonomy.** Per-module `errorCode` namespaces, e.g. `WIDGET_BASE_DROP_FAILED`, `WIDGET_BASE_LAUNCHPAD_TARGET_MISSING`, `WIDGET_VIS_BINDING_APPLY_FAILED`, `WIDGET_TOPN_NO_HELPER_AVAILABLE`, `WIDGET_DATATABLE_CLAIM_DENIED`.
- **Binding services need the most detail.** `widgetBindingPlan` + `widgetBindingApply` contracts must fully specify plan input spec, output shape, datasource target, slot mapping, local/tab filters, render-wait + timeout, rollback, diagnostics, error codes, and exactly what is / is not a state write or Cognos side-effect. `widgetVis`/`widgetTopN` cannot be implemented safely before these exist.

### widgetBase blocking decisions (resolve before tranche 1)
- **Launchpad DOM ownership:** `launchpad` resolves pad/slot and returns a target via its public API; `widgetBase` moves its own shell into that target. No unscoped `document.querySelector` in `widgetBase`; no reaching into launchpad runtime.
- **contentCreate rollback:** on content-module failure after the frame record + shell are created, `widgetBase` runs deterministic rollback — clean runtime listeners/domRefs created so far, then either remove the frame or set `lifecycle: "error"` per a fixed rule. History is committed only after both shell placement and `contentCreate` succeed.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-06-06 | `CP-1 agreed (design)` recorded | user | Base/content split, per-type content modules, `widgetBase`, option C for vis↔topN, two binding services, per-tab launchpad, no authoring gating, deltas as proposals. |
| 2026-06-06 | `widgetSettings` module + input-level history | user | Settings promoted to its own module owning panel-control VALUES + small input-level history steps; `widgetVis`/`widgetText` own only derived/working state and re-derive on replay (no derived snapshots); all panel controls (incl. colour/fontSize) → `widgetSettings`, drag/resize → `widgetBase`, inline text edit → `widgetText`. Launchpad pads streamlined to 5 per-tab channels (`text/visualization/dataTables/topN/otherResources`; legacy `shapes`→`dataTables`, `dataTables`→`topN`). |
