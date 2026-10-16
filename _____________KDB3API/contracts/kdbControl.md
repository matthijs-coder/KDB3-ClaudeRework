# Module contract: kdbControl

**Type:** feature module.

This contract describes the redesigned kdbControl surface. Skeleton-only iteration: no full behavior; see Section 10.

Collapsed hit target: while `kdb-control_collapsed` is on `#kdb-control-root`, `.widget.KDB3Widget` and that root do not hit-test except `#kdb-control-arrow`. See [kdbControl-collapsed-hit-target-contractdelta.md](./kdbControl-collapsed-hit-target-contractdelta.md).

---

## User decisions (Phase 1.4)

| ID | Decision |
|----|----------|
| **Q1** | **Deferred:** no `controlDefinitions[]` in the skeleton (no UI in skeleton; adds noise). Revisit in Phase 4 when builders need a serialisable data source. |
| **Q2** | **Nested state:** `_KDB.state.kdbControl` uses `{ framework, toolbox, settings, authoringMode }` plus top-level `lifecycle` (and any other documented top-level fields). Aligns with canonical-writer / subsystem ownership. **CP-1 addendum:** the canonical dashboard authoring boolean **`isAuthoring`** is **not** owned under `_KDB.state.kdbControl`; it lives under **`_KDB.state.authoring`** (writer: **`authoring`** module). Any `authoringMode` subtree under `kdbControl` must not duplicate that truth — see [kdbControl-authoring-mode-contractdelta.md](./kdbControl-authoring-mode-contractdelta.md). |
| **Q3** | **Superseded by CP-1 authoring (2026-05-13):** the 2026-05-12 decision *“`authoringMode` remains a kdbControl subsystem”* is **replaced**. **Canonical authoring mode** is owned by the dashboard-level **`authoring`** module (`_KDB.state.authoring`, `_KDB.api.authoring`). **`kdbControl` is consumer only:** initial sync via **`readIsAuthoring(_KDB)`** from **`authoring/state/selectors.js`**, subscribe to **`authoring:entered`** / **`authoring:exited`**, store unsubscribe fns under **`_KDB.runtime.kdbControl.subscriptions`** keys **`authoringEntered`** / **`authoringExited`**, teardown in **`kdbControl.destroy()`**. Full contract: [kdbControl-authoring-mode-contractdelta.md](./kdbControl-authoring-mode-contractdelta.md). |
| **Q4** | **Per-subsystem orchestrators only:** `framework/`, `toolbox/`, `settings/`, `authoringMode/` each have their own `__orchestrator*.js`. **Omit** `view/__orchestratorView.js` (would duplicate `__orchestratorKdbControl`). **CP-1:** an `authoringMode/` orchestrator may exist only as **port glue / subscriber wiring** to the **`authoring`** module (events + selectors); it does **not** own `_KDB.state.authoring.isAuthoring`. |
| **S1** | **CP-1 settings (2026-05-13):** Dashboard / visualization defaults / comment defaults / control-panel colors live under **`_KDB.state.kdbControl.settings`** with reducer actions and published selectors per [_archive/kdbControl-settings-cp1-contractdelta.md](./_archive/kdbControl-settings-cp1-contractdelta.md). No persistence, no foreign writes, no placeholder mirror for those fields. **2026-09-02:** SU/developer-mode slice superseded by [kdbControl-developer-mode-toggle-contractdelta.md](./kdbControl-developer-mode-toggle-contractdelta.md). |
| **S2** | **Settings refinement — canvas intents (2026-05-13):** na reducer-commit voor dashboard breedte/hoogte/achtergrond en **Settings-Buttons** (`hideWidgetSettingsButtons`) is **not** a canvas intent. kdbControl toggles class `kdb-widget-chrome-always` on `.dashboardFrame` per [kdbControl-widget-chrome-always-contractdelta.md](./kdbControl-widget-chrome-always-contractdelta.md). Width, height and background may still call **`_KDB.api.canvas.dispatch({ type, payload })`** as a placeholder; missing hook → one `console.warn`; no writes to `_KDB.state.dashboard` / `canvas`. Zie [_archive/kdbControl-settings-cp1-contractdelta.md](./_archive/kdbControl-settings-cp1-contractdelta.md) §2b. **SU / developer-mode is not a canvas intent** — [kdbControl-developer-mode-toggle-contractdelta.md](./kdbControl-developer-mode-toggle-contractdelta.md). Steuerungspanel-kleuren blijven **shell-only**. Hintergrundfarbe paints `#kdb-control-content`; Button-Farbe paints the collapse arrow, top toggles and section heads; Aktionsbutton-Farbe paints `.kdb-control_action-button`. **innere Farbe** (`innerBackgroundColor`) paints the inner containers only — [kdbControl-inner-color-contractdelta.md](./kdbControl-inner-color-contractdelta.md). |

**Approval:** Approved on 2026-05-12 by user (recommendations applied verbatim above). **CP-1 (2026-05-13):** authoring aspects of **Q2**–**Q4** are extended/superseded as stated in those rows; **Q3** text from 2026-05-12 is **not** the active rule for canonical `isAuthoring`.

## User decisions (framework tranche 1)

| ID | Decision |
|----|----------|
| **F1** | **No `controlDefinitions[]` yet:** framework tranche 1 builds inert DOM primitives only. |
| **F2** | **Framework UI state in state:** expand/collapse and visible-panel state live in `_KDB.state.kdbControl.framework`; transient DOM/listener refs stay in `_KDB.runtime.kdbControl`. |
| **F3** | **Placeholder-only config:** dropdown, radio and input option lists may exist only to support browser verification; they carry no real dashboard semantics. |
| **F4** | **No register API yet:** do not expose `registerControl` or `registerCustomControl`; static built-ins only and the public API remains minimal. |

**CP-1 status:** Approved by user on 2026-05-12 for framework tranche 1; execution spec may be written.

## User decisions (framework visual parity reset)

| ID | Decision |
|----|----------|
| **VR1** | **Structural reset approved:** replace the current flex-card visual-parity direction with a legacy-equivalent CSS grid shell/content stack while preserving Strategy B: current English technical ids/classes and state values (`metrics`, `toolbox`, `settings`), no legacy class shims. |
| **VR2** | **Subcontainer scope:** the next reset spec keeps toolbox/settings section bodies empty or inert. Deep visual-only subcontainer DOM from toolbox/settings builders is deferred to a later tranche after shell geometry is green. |

**CP-1 status:** Approved by user on 2026-05-12 via implementation instruction for the attached visual parity delta; see [kdbControl-framework-visual-parity-reset-spec.md](./kdbControl-framework-visual-parity-reset-spec.md).

---

## 1. Purpose

kdbControl is the left-side Dashboard-Steuerung panel: a collapsible shell with header, top-level view toggles (Kennzahlen / Toolbox), a settings panel, and authoring awareness **as a subscriber** (DOM/class sync only).

**Subsystems:** `framework`, `toolbox`, `settings`. **Authoring (CP-1):** `kdbControl` does **not** own canonical authoring state; it consumes **`authoring`** module facts (events + `readIsAuthoring`). A port-time **`authoringMode/`** folder may still exist for wiring glue, but it is **not** the canonical writer of `isAuthoring` — see [kdbControl-authoring-mode-contractdelta.md](./kdbControl-authoring-mode-contractdelta.md).

**Framework tranche 1 purpose:** build the reusable static control framework: buttons, inputs, radio buttons, dropdown containers, expandable/collapsible groups and containers. Controls are inert except for visual browser-verification interactions such as panel open/close, collapse/expand and placeholder value display.

---

## 2. Ownership

**Owns:**

- `_KDB.state.kdbControl.*`
- `_KDB.runtime.kdbControl.*`
- Public surface `_KDB.api.kdbControl`

**Foreign-write paths:** none. Other modules do not write kdbControl-owned state directly; they call the public API. All state transitions that mutate kdbControl-owned subtrees go through the kdbControl reducer (dispatch path).

**State nesting (approved):** `framework`, `toolbox`, `settings`, and (where still present in port trees) `authoringMode` are first-class child objects under `_KDB.state.kdbControl`. The `lifecycle` field remains at the `kdbControl` root unless a later decision moves per-subsystem lifecycles. **CP-1:** `_KDB.state.authoring` is the canonical home for **`isAuthoring`**; `kdbControl` does not treat `_KDB.state.kdbControl.authoringMode` as the source of that boolean.

**Framework tranche 1 state shape (approved for CP-1):**

```js
_KDB.state.kdbControl.framework = {
  activeTopPanel: "metrics",
  openSectionId: null,
  isCollapsed: false,
  placeholderInputs: {},
  placeholderSelections: {}
};
```

`activeTopPanel`, `openSectionId` and `isCollapsed` are the only stateful browser-verification interactions in this tranche. `activeTopPanel` uses English technical values such as `"metrics"`, `"toolbox"` and `"settings"`; the visible UI label may still be "Kennzahlen". `openSectionId: null` means no inert group is open. `placeholderInputs` and `placeholderSelections` may hold inert form-control values for harness visibility only; they must not trigger Cognos calls, header integration, dashboard writes, widget/filter/launchpad/tab mutations, persistence, history commits or table-data work.

---

## 3. Runtime (`_KDB.runtime.kdbControl`)

| Key | Shape / role |
|-----|----------------|
| `domRefs` | `placedShell`, `rootEl`, `contentEl`, `arrowEl`, `mainTogglesEl`, `metricsContainerEl`, `toolboxContainerEl`, `settingsContainerEl`, plus per-primitive refs needed by framework tranche 1. |
| `listeners` | Non-abortable listener cleanup descriptors only, when a browser or API cannot use `AbortController`. Framework tranche 1 should prefer `abortControllers.frameworkView` and should leave `listeners` empty unless a concrete non-abortable cleanup path is required. |
| `abortControllers` | `frameworkView`: `AbortController` for visual-only click / keydown / input listeners owned by this tranche. **`settingsForm` (CP-1 settings):** `AbortController` for settings-form commit listeners under `settings/` wiring — see [kdbControl-settings-cp1-contractdelta.md](./kdbControl-settings-cp1-contractdelta.md) §7. Future subsystem controllers use these buckets, not `listeners`, when the resource is an `AbortController`. |
| `subscriptions` | `authoringEntered`: `() => void` (unsubscribe fn); `authoringExited`: `() => void`. |
| `pendingPromises` | `canvasDimensionBootstrap`: `Promise<void>`. Cleanup: abort underlying work via `AbortController`; ignore stale promise results after destroy or superseding init. |

---

## 4. Public API

**Surface:** `_KDB.api.kdbControl`.

**Style:** dispatch + reducer.

**Hard triggers (documentation):**

- At least three action families (settings, toolbox, framework subsystems each contribute).
- At least two external caller classes (future history integration; **authoring** transitions are owned by **`authoring`** module dispatch, not by `kdbControl` reducer).
- **CP-1:** `kdbControl` reducer handles **kdbControl-owned** UI state only; authoring enter/exit is observed via **`authoring:entered`** / **`authoring:exited`** and **`readIsAuthoring(_KDB)`**, not by owning `_KDB.state.authoring`.

**Methods:**

- `mount(options)` — attach shell, register runtime, subscribe where required.
- `destroy()` — teardown DOM, listeners, subscriptions, pending work.
- `dispatch({ type, payload })` — sole mutation path for kdbControl-owned state.
- `getState()` — read-only view of `_KDB.state.kdbControl` (or documented projection).

Framework tranche 1 does not add `registerControl` or `registerCustomControl`. Static built-in primitives are rendered by the framework subsystem and updated through the existing dispatch path only.

**Lifecycle subset (this module):** `idle`, `mounted`, `ready`, `error`, `disposed` (subset of `_____________KDB3API/.cursor/lifecycleVocabulary.md`; declared there under per-module subsets).

---

## 5. Readers / writers

**Published selectors** (exported from `state/selectors.js` per feature layout). With **approved nested state**, each reader reads from the subsystem indicated:

| Selector | Reads from |
|----------|------------|
| `readDashboardSettings` | `state.settings.dashboard` |
| `readControlPanelSettings` | `state.settings.controlPanel` |
| `readVisualizationDefaults` | `state.settings.defaultsNew.visualization` |
| `readCommentDefaults` | `state.settings.defaultsNew.comment` |
| `readFrameworkActiveTopPanel` | `state.framework.activeTopPanel` |
| `readFrameworkOpenSectionId` | `state.framework.openSectionId` |
| `readFrameworkCollapsed` | `state.framework.isCollapsed` |

`readVisibilityState` and `readFrameworkViewUi` belonged to the skeleton vocabulary and are not part of framework tranche 1 unless a later approved delta adds matching state fields. Framework tranche 1 selectors must match the state shape above.

**CP-1 — authoring read:** **`readIsAuthoring(_KDB)`** is owned and exported by the **`authoring`** module (**`authoring/state/selectors.js`**), not `kdbControl/state/selectors.js`. `kdbControl` imports it for initial authoring DOM sync and complements it with `authoring:entered` / `authoring:exited` subscriptions per [kdbControl-authoring-mode-contractdelta.md](./kdbControl-authoring-mode-contractdelta.md).

**Internal writers:** `writeFrameworkView` where present in the port tree; **`settings` subtree is reducer-only** (no `writeSettingsSnapshot` — superseded by CP-1 settings slice per [kdbControl-settings-cp1-contractdelta.md](./kdbControl-settings-cp1-contractdelta.md) §9). Framework tranche 1 writes framework UI state through reducer actions only; DOM binders dispatch visual-only actions and do not mutate `_KDB.state.kdbControl.framework` directly.

---

## 6. Events

**CP-1 (2026-05-13) — toolbox header/footer:** Kopfzeile / Fußzeile / Untertitel / title-edit radios are **known-owner** controls. The sandbox port (`TEST/kdbControl-port/`) wires them to **`_KDB.api.header.dispatch`** and **`_KDB.api.footer.dispatch`** with `payload.source: "kdbControl"` per [kdbControl-header-footer-toolbox-contractdelta.md](./kdbControl-header-footer-toolbox-contractdelta.md) §4. On the owner modules, chrome visibility is domain field **`status`** (`idle` \| `active` \| `removed`) — **chrome presence**, not the **`lifecycle`** vocabulary used for `kdbControl`’s own mount/dispose (`header.md` / `footer.md`). **Do not** emit `header:*Requested` / `footer:toggleRequested` for those flows. Catalog: [eventSubscribe.md](../architecture/eventSubscribe.md) (`header:confirmedChanged` fact + superseded request rows).

**Emits** (kdbControl-owned request-events remaining in this contract):

| Name |
|------|
| `tabs:toolRequested` |

**Subscribes** (handles stored on **`authoringEntered`** / **`authoringExited`**; **teardown:** only **`kdbControl.destroy()`** clears these keys and unsubscribes — see `_____________KDB3API/contracts/kdbControl-authoring-mode-contractdelta.md` §7):

| Name |
|------|
| `authoring:entered` |
| `authoring:exited` |

**Toolbox read-sync (CP-1):** `kdbControl` may subscribe to **`header:confirmedChanged`** solely to refresh toolbox DOM from published **`header`** / **`footer`** selectors (`syncFrameworkViewFromState`); it must not mirror header/footer truth under `_KDB.state.kdbControl`. Teardown: `_KDB.runtime.kdbControl.subscriptions.headerFooterToolboxReadSync`.

Catalog entries: `_____________KDB3API/architecture/eventSubscribe.md`.

Framework tranche 1 emits none of the remaining request-events above. Buttons, inputs, radio buttons, dropdowns and expand/collapse controls are inert except for visual state and harness-visible placeholder values **except** the CP-1 header/footer toolbox slice, which dispatches to owner APIs as documented.

Before any later tranche emits `tabs:toolRequested` or reintroduces `header:*Requested` / `footer:*Requested` for the same known-owner flows, the contract must document the `events.mdc` motivation for request-events despite known owners, or keep direct owner `dispatch` per [kdbControl-header-footer-toolbox-contractdelta.md](./kdbControl-header-footer-toolbox-contractdelta.md).

---

## 7. Dependencies

**Reads / calls (survey baseline; no new invented integrations in skeleton):**

- `_KDB.elements.*`
- `_KDB.config.options.*`
- `_KDB.properties.*`
- `_KDB.data.tables`
- `_KDB.state.tablesLoaded`
- **`authoring` module reads (CP-1):** `readIsAuthoring(_KDB)` from **`authoring/state/selectors.js`** (initial DOM/class sync); optional read-only peek at `_KDB.state.authoring` only if the selector contract allows — prefer the published selector.

**CP-1 settings slice:** no **`_KDB.properties` writes** and no **Cognos** calls for settings commits **except** the developer-mode toggle, which calls **`_KDB.api.properties.applyDeveloperMode`** and does not write the Cognos spec — [kdbControl-developer-mode-toggle-contractdelta.md](./kdbControl-developer-mode-toggle-contractdelta.md). `_KDB.config.options` reads (e.g. color palette) may remain as today for harness-only gallery behavior. Remaining settings shape: [_archive/kdbControl-settings-cp1-contractdelta.md](./_archive/kdbControl-settings-cp1-contractdelta.md).

**Canvas intents (S2, receiver is pageSurface):** after a successful reducer commit for dashboard width, height, or background, kdbControl calls **`_KDB.api.canvas.dispatch`** with the archive §2b intent types. kdbControl does not paint the page and does not call Cognos. The apply owner is [pageSurface.md](./pageSurface.md). **`hideWidgetSettingsButtons`** still stamps `.dashboardFrame` ([kdbControl-widget-chrome-always-contractdelta.md](./kdbControl-widget-chrome-always-contractdelta.md)). No `_KDB.state.dashboard`. If **`dispatch` is missing**, **one** `console.warn` per load. **Not** for developer mode. Do not edit `settingsPostDispatchSideEffects.js` for this slice.

**Framework tranche 1 dependencies:** `_KDB`, `_KDB.elements.selectors.kdbControl`, `_KDB.state.kdbControl.framework`, `_KDB.runtime.kdbControl`, placeholder framework config, and local DOM APIs only.

---

## 8. Cognos touchpoints

All Cognos access goes through `_KDB.cognosAPI` thin wrappers only:

- `cognosAPI.canvas.getCanvasPropertiesList`
- `cognosAPI.canvas.getCanvasPropertyValue`
- `cognosAPI.canvas.setCanvasPropertyValue`
- `cognosAPI.glassMessages.showToast`
- `cognosAPI.glassMessages.showMessageDialog`

No direct host SDK calls from kdbControl modules.

Framework tranche 1 has no Cognos touchpoints.

---

## 9. Folder layout

Target tree for port / skeleton (under consumer app or `TEST/kdbControl-port/` for harness). **Reflects Q1/Q4:** no `config/controlDefinitions.js`, no `view/__orchestratorView.js`. **`authoringMode/`** may remain as **port glue** only; **CP-1** canonical authoring ownership is **`authoring`** (see contractdelta). **Superseded:** Q3 “authoringMode stays inside kdbControl as subsystem owner of truth.”

**As-built 2026-08-17:** `framework/buildControlMainBlocks.js` remains the public AMD hub for toolbox/settings DOM construction; section and row builders live in sibling job files under `framework/`.

```
kdbControl/
  __orchestratorKdbControl.js
  createKdbControlController.js
  state/
    initialState.js
    copyState.js
    createKdbControlReducer.js
    reduceFrameworkActions.js
    reduceSettingsActions.js
    selectors.js
    writers/
      writeFrameworkView.js
  effects/
    __orchestratorEffects.js
    settingsPostDispatchSideEffects.js
  events/
    eventNames.js
  framework/
    config/
      placeholderControlOptions.js
    __orchestratorFramework.js
    buildControlShell.js
    buildControlHeader.js
    buildControlMainToggles.js
    buildControlMainBlocks.js
    appendTwoInputSplit.js
    appendSettingsChromeBlock.js
    createExpandableSection.js
    buildDimensionInputs.js
    fillDashboardSettings.js
    fillGraphSettings.js
    fillCommentSettings.js
    fillControlPanelSettings.js
    fillToolboxComments.js
    fillToolboxTabs.js
    fillToolboxHeaderFooter.js
    buildToolboxBlock.js
    buildSettingsBlock.js
    buildControlPrimitiveGallery.js
    createFrameworkElement.js
    placeControlShell.js
    bindFrameworkView.js
    bindFrameworkCollapse.js
    bindFrameworkTopToggles.js
    bindFrameworkSectionToggles.js
    bindFrameworkPrimitiveVisuals.js
    syncFrameworkViewFromState.js
  toolbox/
    __orchestratorToolbox.js
  settings/
    __orchestratorSettings.js
    bindSettingsForm.js
  authoringMode/
    __orchestratorAuthoringMode.js
```

**As-built size-split:** `createKdbControlController.js` remains the AMD path for `__orchestratorKdbControl.js` and still returns `{ mount, destroy, dispatch, getState, syncView }`. Mount/dispatch/cleanup live in `effects/mountKdbControlController.js`, `actions/dispatchKdbControlAction.js`, `actions/applySettingsAction.js`, `runtime/cleanupKdbControlRuntime.js`; history registration in `history/registerKdbControlHistoryReplayHandler.js`; view-sync helper in `effects/tryFrameworkSyncView.js`.

---

## 10. Out of scope (this contract iteration)

- `tabs.add` wiring (known legacy gap).
- Save/load persistence beyond placeholders.
- Live widget binding.
- **Superseded for CP-1 sandbox (partial):** “full settings UI” as end-to-end product integration — the **four** settings sections listed in [kdbControl-settings-cp1-contractdelta.md](./kdbControl-settings-cp1-contractdelta.md) §1 may be implemented as **local `settings` state + sync** in `TEST/kdbControl-port/` per [kdbControl-settings-cp1-execution-spec.md](./kdbControl-settings-cp1-execution-spec.md); other settings/toolbox bodies remain inert.
- Real Cognos behavior (stubs / harness only).
- `controlDefinitions[]` and `config/controlDefinitions.js` until Phase 4 (Q1).
- Header integration and dashboard canvas writes.
- Widget, filter, launchpad or tab state mutations.
- Real actions behind buttons, inputs, radio buttons, dropdowns or expand/collapse controls.
- Persistence, writeback, tableDataService usage, Top N logic and history commits.

**Skeleton only** for this contract iteration.

---

## 11. Resolved questions (archive)

Original Q1–Q4 are resolved in **User decisions (Phase 1.4)** at the top of this document. **CP-1 authoring (2026-05-13)** supersedes **Q3** (and the Q2 addendum) for **where `isAuthoring` lives** and **how kdbControl participates**; see [kdbControl-authoring-mode-contractdelta.md](./kdbControl-authoring-mode-contractdelta.md).

Framework tranche 1 F1-Q1 through F1-Q4 are resolved in **User decisions (framework tranche 1)** at the top of this document. CP-1 was approved by the user on 2026-05-12.

---

## 12. Framework tranche 1 hand-off

**Status:** CP-2 green on 2026-05-12 after browser-level harness verification by the user.

**Delivered in sandbox:**

- Static kdbControl framework shell under `TEST/kdbControl-port/kdbControl/framework/`.
- Inert DOM primitives: buttons, input, radio group, dropdown, expandable groups, top-panel toggles and collapse control.
- Framework state under `_KDB.state.kdbControl.framework`: `activeTopPanel`, `openSectionId`, `isCollapsed`, `placeholderInputs`, `placeholderSelections`.
- Runtime ownership under `_KDB.runtime.kdbControl`: DOM refs in `domRefs`, AbortController in `abortControllers.frameworkView`, framework bind context under `frameworkBindContext`.
- Harness flow in `TEST/kdbControl-port/harness/index.html`: mount, toggle panels, open/close sections, collapse/expand, edit placeholders, log state, destroy.

**Review / fix history:**

- Initial execution matched the contract shape but needed one focused fix for line limits, nested listener functions inside `__controller`, and DOM expando context storage.
- A second user-approved focused fix removed `WeakMap` context storage and made handlers read the authoritative context from `_KDB.runtime.kdbControl.frameworkBindContext`.
- Final review found no `WeakMap`, no DOM context expandos, no German technical names, no event emits, no Cognos/service calls, no foreign state writes, and clean `ReadLints`.

**Out of scope remains:**

- Visual parity with the original kdbControl styling.
- Real settings/toolbox content and business actions.
- `controlDefinitions[]`.
- `registerControl` / `registerCustomControl`.
- Header/footer/tabs/widget/filter/launchpad integration.
- Cognos, persistence, writeback, history, tableDataService and Top N logic.

**Recommended next tranche:** framework visual parity and layout/CSS alignment against the legacy kdbControl shell, still inert unless a new contract delta approves behavior.

---

## 13. Framework tranche 2 visual parity delta

**Status:** CP-1 approved for execution (Strategy B); see [kdbControl-framework-visual-parity-execution-spec.md](./kdbControl-framework-visual-parity-execution-spec.md).

**Purpose:** make the sandbox framework visually resemble the legacy kdbControl shell while preserving tranche 1 behavior boundaries. This tranche targets layout and styling only: shell grid, collapse strip, header chrome, top toggles, selected/visible panel states, and basic toolbox/settings panel chrome.

**Approved strategy candidate:** Strategy B — keep redesigned English technical state, ids and classes, and rewrite / slice the needed legacy CSS concepts onto the current sandbox DOM. Do not add legacy classes as compatibility shims. German remains user-facing label text only.

**Legacy read-only sources:**

- `_______KDB3/KDB3/css/kdbControl.css` — primary shell, header, toggle, panel and collapsed-state styling reference.
- `_______KDB3/KDB3/css/toggleButton.css` — toggle-button styling reference when needed.
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlShell.js` — legacy shell structure reference.
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlHeader.js` — legacy header structure reference.
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlMainToggles.js` — legacy top toggle structure and classes.
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlMainBlocks.js` — legacy panel block structure.
- Legacy `syncFrameworkInitialView.js` / bind framework files may be read only to understand class application; behavior is not ported wholesale.
- `_____________KDB3API/contracts/kdbControl-framework-visual-parity-mapping.md` — mapping from legacy selectors / structure to current sandbox selectors / structure.

**Allowed changes for tranche 2:**

- Add CSS under `TEST/kdbControl-port/harness/css/` or `TEST/kdbControl-port/kdbControl/framework/css/`; the execution spec must choose one location and document why.
- Update `TEST/kdbControl-port/harness/index.html` to load the chosen CSS file(s).
- Update framework builders and `syncFrameworkViewFromState.js` only when the current sandbox structure is missing an element that is required for visual parity; prefer CSS mapped to current selectors over legacy class aliases.
- Preserve current framework state shape and reducer action set unless a later CP-1 delta explicitly approves a change.

**Forbidden in tranche 2:**

- No Cognos API calls.
- No header/footer/tabs/widget/filter/launchpad integration.
- No new public API methods.
- No `registerControl`, `registerCustomControl` or `controlDefinitions[]`.
- No real business behavior behind buttons, inputs, radio buttons, dropdowns, section toggles or collapse.
- No persistence, writeback, tableDataService, Top N or history commits.
- No legacy file modification, deletion or movement.
- No adding legacy classes as duplicate compatibility classes when a current sandbox selector can express the same visual role.

**Execution-spec requirements:**

- Write `_____________KDB3API/contracts/kdbControl-framework-visual-parity-execution-spec.md` after CP-1 approval.
- Include Section A pre-flight echo and per-file `Rules to apply` checklists.
- Scope the CSS port in slices: shell/collapse first, header/toggles second, panel chrome third; do not attempt full `kdbControl.css` wholesale.
- Use `kdbControl-framework-visual-parity-mapping.md` as the selector translation source: every CSS slice must state which legacy selector concept it maps to and which current selector implements it.
- Acceptance must include side-by-side visual checkpoints at a fixed viewport, plus anti-D1 (`mount` / `destroy` try/catch) and anti-D2 (runtime cleanup order and `abortControllers.frameworkView`).

**CP-1 question:** resolved — Strategy B and tranche 2 scope approved for execution; parity CSS and harness wiring follow the execution spec.

---

## 14. Framework visual parity reset delta

**Status:** CP-1 approved for execution; see [kdbControl-framework-visual-parity-reset-spec.md](./kdbControl-framework-visual-parity-reset-spec.md).

**Purpose:** recover visual parity by resetting the sandbox framework DOM and CSS to legacy-equivalent layout geometry before applying more screenshot polish. The current tranche-2 CSS/fix path corrected individual symptoms but left the sandbox as a flex-card layout, while legacy `kdbControl` is a grid shell with fixed content row slots, a full-height 30px collapse strip, a settings outer row and section grids.

**Approved strategy:** Strategy B remains binding. The implementation maps legacy DOM/CSS concepts onto current sandbox selectors and current English technical names. It must not add legacy class aliases solely to make old CSS apply, and it must not introduce German technical ids/classes/values.

**Legacy read-only sources:**

- `_______KDB3/KDB3/css/kdbControl.css` — primary geometry reference: shell grid, content rows, collapse strip, header, main toggles, section panel sizing.
- `_______KDB3/KDB3/css/toggleButton.css` — toggle switch geometry reference for later deep subcontainers only.
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlShell.js` — canonical legacy DOM order.
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlHeader.js` — header title/actions/icon order.
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlMainToggles.js` — two visible main toggles.
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlMainBlocks.js` — main block wrapper and metrics/toolbox containers.
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlSettingsSkeleton.js` and `buildControlToolboxSkeleton.js` — button-then-container section pairing.
- Toolbox/settings content builders may be read only for later visual subcontainer planning; this reset tranche does not port their business content.

**Required structural target:**

- `#kdb-control-root.kdb-control` represents legacy `#kdb-control_top-level_container` and uses CSS grid with a right collapse column of `30px`.
- `#kdb-control-content.kdb-control__content` represents legacy `#kdb-control_content_container` and owns legacy-equivalent row slots: header, settings outer, save/load spacer, main toggles and main blocks.
- A current-named settings outer wrapper represents legacy `#kdb-control_settings_outer-container`; the settings panel opens in that row and is not just another main-panel card.
- A current-named save/load spacer slot represents legacy `#kdb-control_save-load_container`; empty until the foreign extension injects children. Scoped loading overlay until first child: `loadingService-overlay-coverage-contractdelta.md`.
- A current-named main blocks wrapper represents legacy `#kdb-control_main-toggles-block_outer-container`.
- Main toggles remain exactly two visible buttons: user-facing `Kennzahlen` for technical `metrics`, and user-facing `Toolbox` for technical `toolbox`. Settings remains reachable through the header settings icon.
- Toolbox/settings section rows remain inert button-then-container pairs. Bodies are empty or neutral placeholders in this reset; deep content is later work.

**Allowed changes for the reset tranche:**

- Update `TEST/kdbControl-port/kdbControl/framework/buildControlShell.js` to emit the legacy-equivalent current-named wrappers.
- Update `TEST/kdbControl-port/kdbControl/framework/buildControlMainBlocks.js` to return panels/wrappers needed by the shell reset while preserving current technical ids.
- Update `TEST/kdbControl-port/kdbControl/framework/syncFrameworkViewFromState.js` only for wrapper class syncing (`kdb-control_settings-open`, collapsed/content-hidden state and section selected/open classes).
- Update `TEST/kdbControl-port/kdbControl/framework/placeControlShell.js` only if the new wrappers require additional `domRefs`.
- Update harness CSS slices under `TEST/kdbControl-port/harness/css/` to express the reset geometry.
- Update `TEST/kdbControl-port/harness/index.html` only for CSS wiring or viewport sizing notes.

**Forbidden in the reset tranche:**

- No Cognos calls.
- No real business actions.
- No API surface changes.
- No reducer action or state shape changes.
- No `controlDefinitions[]`, `registerControl` or `registerCustomControl`.
- No header/footer/tabs/widget/filter/launchpad integration.
- No persistence, writeback, tableDataService, Top N or history commits.
- No legacy file modification, deletion or movement.
- No deep toolbox/settings content port unless a later CP-1 approves that visual slice.

**Execution-spec requirements:**

- Use `kdbControl-framework-visual-parity-reset-spec.md`.
- Include Section A pre-flight echo and per-file `Rules to apply` checklists.
- Make acceptance structural first: shell grid, content row slots, settings outer placement, save/load spacer, main blocks wrapper, full-height collapse strip, section button/body geometry.
- Require browser-level CP-2 visual verification after execution.

**CP-1 questions:** resolved — VR1 and VR2 above.

---

## Approval log

| Date | Actor | Note |
|------|-------|------|
| 2026-05-12 | user | Approved after Q1–Q4; nested state; per-subsystem orchestrators; no controlDefinitions in skeleton; authoringMode stays subsystem (flag split in litmustest report). **Superseded for authoring truth 2026-05-13:** Q3 authoring ownership — see CP-1 row below. |
| 2026-05-13 | user | **CP-1 authoring-mode** approved: `source` enum `cognos-ui` \| `api` \| `bootstrap`; selector `authoring/state/selectors.js` · `readIsAuthoring(_KDB)`; runtime keys `authoringEntered` / `authoringExited`; `kdbControl` consumer-only; [kdbControl-authoring-mode-contractdelta.md](./kdbControl-authoring-mode-contractdelta.md). |
| 2026-05-12 | user | Approved framework tranche 1 delta: inert DOM primitives only; framework UI state under `_KDB.state.kdbControl.framework`; placeholder-only primitive config; no register API. |
| 2026-05-12 | user | CP-2 green for framework tranche 1 harness verification; hand-off recorded in Section 12. |
| 2026-05-12 | user | CP-1 approved for framework tranche 2 (Section 13): Strategy B visual parity; execution spec [kdbControl-framework-visual-parity-execution-spec.md](./kdbControl-framework-visual-parity-execution-spec.md). |
| 2026-05-12 | user | CP-1 approved for framework visual parity reset (Section 14): grid-shell structural reset; empty/inert section bodies first; execution spec [kdbControl-framework-visual-parity-reset-spec.md](./kdbControl-framework-visual-parity-reset-spec.md). |
| 2026-05-13 | user | **CP-1 settings:** `_KDB.state.kdbControl.settings` shape, reducer actions, selectors, sandbox wiring per [kdbControl-settings-cp1-contractdelta.md](./kdbControl-settings-cp1-contractdelta.md) and [kdbControl-settings-cp1-execution-spec.md](./kdbControl-settings-cp1-execution-spec.md); User decision **S1**. |
