# Module contract: kdbControl

**Type:** feature module.

This contract describes the redesigned kdbControl surface. Skeleton-only iteration: no full behavior; see Section 10.

Collapsed hit target: while `kdb-control_collapsed` is on `#kdb-control-root`, `.widget.KDB3Widget` and that root do not hit-test except `#kdb-control-arrow`. See [kdbControl-collapsed-hit-target-contractdelta.md](./_archive/kdbControl-collapsed-hit-target-contractdelta.md).

---

## User decisions (Phase 1.4)

| ID | Decision |
|----|----------|
| **Q1** | **Deferred:** no `controlDefinitions[]` in the skeleton (no UI in skeleton; adds noise). Revisit in Phase 4 when builders need a serialisable data source. |
| **Q2** | **Nested state:** `_KDB.state.kdbControl` uses `{ framework, toolbox, settings, authoringMode }` plus top-level `lifecycle` (and any other documented top-level fields). Aligns with canonical-writer / subsystem ownership. **CP-1 addendum:** the canonical dashboard authoring boolean **`isAuthoring`** is **not** owned under `_KDB.state.kdbControl`; it lives under **`_KDB.state.authoring`** (writer: **`authoring`** module). Any `authoringMode` subtree under `kdbControl` must not duplicate that truth — see [kdbControl-authoring-mode-contractdelta.md](./_archive/kdbControl-authoring-mode-contractdelta.md). |
| **Q3** | **Superseded by CP-1 authoring (2026-05-13):** the 2026-05-12 decision *“`authoringMode` remains a kdbControl subsystem”* is **replaced**. **Canonical authoring mode** is owned by the dashboard-level **`authoring`** module (`_KDB.state.authoring`, `_KDB.api.authoring`). **`kdbControl` is consumer only:** initial sync via **`readIsAuthoring(_KDB)`** from **`authoring/state/selectors.js`**, subscribe to **`authoring:entered`** / **`authoring:exited`**, store unsubscribe fns under **`_KDB.runtime.kdbControl.subscriptions`** keys **`authoringEntered`** / **`authoringExited`**, teardown in **`kdbControl.destroy()`**. Full contract: [kdbControl-authoring-mode-contractdelta.md](./_archive/kdbControl-authoring-mode-contractdelta.md). |
| **Q4** | **Per-subsystem orchestrators only (superseded by the as-built layout in §9, where `framework/` became `panel/`):** `framework/`, `toolbox/`, `settings/`, `authoringMode/` each have their own `__orchestrator*.js`. **Omit** `view/__orchestratorView.js` (would duplicate `dashboard/canvas/kdbControl/index.js`). **CP-1:** an `authoringMode/` orchestrator may exist only as **port glue / subscriber wiring** to the **`authoring`** module (events + selectors); it does **not** own `_KDB.state.authoring.isAuthoring`. |
| **S1** | **CP-1 settings (2026-05-13):** Dashboard / visualization defaults / comment defaults / control-panel colors live under **`_KDB.state.kdbControl.settings`** with reducer actions and published selectors per [_archive/kdbControl-settings-cp1-contractdelta.md](./_archive/kdbControl-settings-cp1-contractdelta.md). No persistence, no foreign writes, no placeholder mirror for those fields. **2026-09-02:** SU/developer-mode slice superseded by [kdbControl-developer-mode-toggle-contractdelta.md](./_archive/kdbControl-developer-mode-toggle-contractdelta.md). |
| **S2** | **Settings refinement — canvas intents (2026-05-13):** na reducer-commit voor dashboard breedte/hoogte/achtergrond en **Settings-Buttons** (`hideWidgetSettingsButtons`) is **not** a canvas intent. kdbControl toggles class `kdb-widget-chrome-always` on `.dashboardFrame` per [kdbControl-widget-chrome-always-contractdelta.md](./_archive/kdbControl-widget-chrome-always-contractdelta.md). Width, height and background may still call **`_KDB.api.canvas.dispatch({ type, payload })`** as a placeholder; missing hook → one `console.warn`; no writes to `_KDB.state.dashboard` / `canvas`. Zie [_archive/kdbControl-settings-cp1-contractdelta.md](./_archive/kdbControl-settings-cp1-contractdelta.md) §2b. **SU / developer-mode is not a canvas intent** — [kdbControl-developer-mode-toggle-contractdelta.md](./_archive/kdbControl-developer-mode-toggle-contractdelta.md). Steuerungspanel-kleuren blijven **shell-only**. Hintergrundfarbe paints `#kdb-control-content`; Button-Farbe paints the collapse arrow, top toggles and section heads; Aktionsbutton-Farbe paints `.kdb-control_action-button`. **innere Farbe** (`innerBackgroundColor`) paints the inner containers only — [kdbControl-inner-color-contractdelta.md](./_archive/kdbControl-inner-color-contractdelta.md). |

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

**CP-1 status:** Approved by user on 2026-05-12 via implementation instruction for the attached visual parity delta; see [kdbControl-framework-visual-parity-reset-spec.md](./_archive/kdbControl-framework-visual-parity-reset-spec.md).

---

## 1. Purpose

kdbControl is the left-side Dashboard-Steuerung panel: a collapsible shell with header, top-level view toggles (Kennzahlen / Toolbox), a settings panel, and authoring awareness **as a subscriber** (DOM/class sync only).

**Subsystems:** `framework`, `toolbox`, `settings`. **Authoring (CP-1):** `kdbControl` does **not** own canonical authoring state; it consumes **`authoring`** module facts (events + `readIsAuthoring`). A port-time **`authoringMode/`** folder may still exist for wiring glue, but it is **not** the canonical writer of `isAuthoring` — see [kdbControl-authoring-mode-contractdelta.md](./_archive/kdbControl-authoring-mode-contractdelta.md).

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
| `abortControllers` | `frameworkView`: `AbortController` for visual-only click / keydown / input listeners owned by this tranche. **`settingsForm` (CP-1 settings):** `AbortController` for settings-form commit listeners under `settings/` wiring — see [kdbControl-settings-cp1-contractdelta.md](./_archive/kdbControl-settings-cp1-contractdelta.md) §7. Future subsystem controllers use these buckets, not `listeners`, when the resource is an `AbortController`. |
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

**CP-1 — authoring read:** **`readIsAuthoring(_KDB)`** is owned and exported by the **`authoring`** module (**`authoring/state/selectors.js`**), not `kdbControl/state/selectors.js`. `kdbControl` imports it for initial authoring DOM sync and complements it with `authoring:entered` / `authoring:exited` subscriptions per [kdbControl-authoring-mode-contractdelta.md](./_archive/kdbControl-authoring-mode-contractdelta.md).

**Internal writers:** `writeFrameworkView` where present in the port tree; **`settings` subtree is reducer-only** (no `writeSettingsSnapshot` — superseded by CP-1 settings slice per [kdbControl-settings-cp1-contractdelta.md](./_archive/kdbControl-settings-cp1-contractdelta.md) §9). Framework tranche 1 writes framework UI state through reducer actions only; DOM binders dispatch visual-only actions and do not mutate `_KDB.state.kdbControl.framework` directly.

---

## 6. Events

**CP-1 (2026-05-13) — toolbox header/footer:** Kopfzeile / Fußzeile / Untertitel / title-edit radios are **known-owner** controls. The sandbox port (`TEST/kdbControl-port/`) wires them to **`_KDB.api.header.dispatch`** and **`_KDB.api.footer.dispatch`** with `payload.source: "kdbControl"` per [kdbControl-header-footer-toolbox-contractdelta.md](./_archive/kdbControl-header-footer-toolbox-contractdelta.md) §4. On the owner modules, chrome visibility is domain field **`status`** (`idle` \| `active` \| `removed`) — **chrome presence**, not the **`lifecycle`** vocabulary used for `kdbControl`’s own mount/dispose (`header.md` / `footer.md`). **Do not** emit `header:*Requested` / `footer:toggleRequested` for those flows. Catalog: [eventSubscribe.md](../architecture/eventSubscribe.md) (`header:confirmedChanged` fact + superseded request rows).

**Emits** (kdbControl-owned request-events remaining in this contract):

| Name |
|------|
| `tabs:toolRequested` |

**Subscribes** (handles stored on **`authoringEntered`** / **`authoringExited`**; **teardown:** only **`kdbControl.destroy()`** clears these keys and unsubscribes — see `_____________KDB3API/contracts/_archive/kdbControl-authoring-mode-contractdelta.md` §7):

| Name |
|------|
| `authoring:entered` |
| `authoring:exited` |

**Toolbox read-sync (CP-1):** `kdbControl` may subscribe to **`header:confirmedChanged`** solely to refresh toolbox DOM from published **`header`** / **`footer`** selectors (`syncFrameworkViewFromState`); it must not mirror header/footer truth under `_KDB.state.kdbControl`. Teardown: `_KDB.runtime.kdbControl.subscriptions.headerFooterToolboxReadSync`.

Catalog entries: `_____________KDB3API/architecture/eventSubscribe.md`.

Framework tranche 1 emits none of the remaining request-events above. Buttons, inputs, radio buttons, dropdowns and expand/collapse controls are inert except for visual state and harness-visible placeholder values **except** the CP-1 header/footer toolbox slice, which dispatches to owner APIs as documented.

Before any later tranche emits `tabs:toolRequested` or reintroduces `header:*Requested` / `footer:*Requested` for the same known-owner flows, the contract must document the `events.mdc` motivation for request-events despite known owners, or keep direct owner `dispatch` per [kdbControl-header-footer-toolbox-contractdelta.md](./_archive/kdbControl-header-footer-toolbox-contractdelta.md).

---

## 7. Dependencies

**Reads / calls (survey baseline; no new invented integrations in skeleton):**

- `_KDB.elements.*`
- `_KDB.config.options.*`
- `_KDB.properties.*`
- `_KDB.data.tables`
- `_KDB.state.tablesLoaded`
- **`authoring` module reads (CP-1):** `readIsAuthoring(_KDB)` from **`authoring/state/selectors.js`** (initial DOM/class sync); optional read-only peek at `_KDB.state.authoring` only if the selector contract allows — prefer the published selector.

**CP-1 settings slice:** no **`_KDB.properties` writes** and no **Cognos** calls for settings commits **except** the developer-mode toggle, which calls **`_KDB.api.properties.applyDeveloperMode`** and does not write the Cognos spec — [kdbControl-developer-mode-toggle-contractdelta.md](./_archive/kdbControl-developer-mode-toggle-contractdelta.md). `_KDB.config.options` reads (e.g. color palette) may remain as today for harness-only gallery behavior. Remaining settings shape: [_archive/kdbControl-settings-cp1-contractdelta.md](./_archive/kdbControl-settings-cp1-contractdelta.md).

**Canvas intents (S2, receiver is pageSurface):** after a successful reducer commit for dashboard width, height, or background, kdbControl calls **`_KDB.api.canvas.dispatch`** (`effects.js`, `dispatchCanvasIntent`) with the archive §2b intent types. kdbControl does not paint the page and does not call Cognos. The apply owner is [pageSurface.md](./pageSurface.md). **`hideWidgetSettingsButtons`** still stamps `.dashboardFrame` ([kdbControl-widget-chrome-always-contractdelta.md](./_archive/kdbControl-widget-chrome-always-contractdelta.md)). No `_KDB.state.dashboard`. If **`dispatch` is missing**, **one** `console.warn` per load. **Not** for developer mode. Do not edit `settingsPostDispatchSideEffects.js` for this slice.

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

As built after the Phase 1 module-template rework (33 files). `authoringMode/` no longer exists inside kdbControl: canonical authoring ownership is the `authoring` module (see the CP-1 contractdelta). There are no per-subsystem `__orchestrator*.js` files; only `dashboard/canvas/kdbControl/index.js` (the registrar).

```txt
KDB3/js/dashboard/canvas/kdbControl/
  index.js            # createKdbControlController / registerKdbControl: { mount, destroy, dispatch, getState, syncView }
  actions.js          # dispatch action runner: settings commits, dimension gate, framework view sync decision
  dimensionGate.js    # dashboard width/height validation before commit
  effects.js          # owner dispatches (dispatchCanvasIntent -> _KDB.api.canvas), developer-mode apply, paint, authoring subscriptions
  settingsForm.js     # settings input read/dispatch and bindSettingsForm
  history.js          # settings history steps and replay handler
  restore.js          # parameterSet restore of kdbControl settings
  state/
    actionTypes.js    # kdbControl/* action type constants
    initialState.js   # { lifecycle, framework, toolbox, settings, ... }
    reducer.js        # pure reducer (framework + settings actions)
    selectors.js      # published selectors (settings, defaults, framework panel/section/collapsed)
  config/
    domSelectors.js   # DOM selectors for the control shell
    icons.js          # icon asset paths
    labels.js         # labels and handbook URL
    settingsDefaults.js # default settings values
    settingsInputs.js # settings input specs and action builders
  panel/
    index.js            # mounts the panel: place shell, bind view, follow active tab, header/footer read-sync subscription
    buildControlShell.js# shell, header, main toggles, collapse arrow
    buildSettingsPanel.js # settings panel sections (dashboard, charts, comments, control panel)
    buildToolboxPanel.js  # toolbox panel sections (comments, tabs, header/footer)
    settingsRows.js     # two/one-input rows, dimension inputs
    createPanelElement.js # DOM element factory for the panel builders
    bindPanelToggles.js # panel/section toggle activation
    bindControlInputs.js# input and switch bindings
    bindToolboxActions.js # toolbox buttons, tab edit, comment drag source
    syncView.js         # syncFrameworkViewFromState (sections, panel chrome)
    syncFormControls.js # form control sync from state
    followActiveTab.js  # re-parent the KDB3 widget host to the active tab page
    primitives/         # colorField.js, colorPalette.js, formRows.js, toggleSwitch.js
```

CSS for the shell lives in `KDB3/css/kdb-control/` (`shell.css`, `panels.css`, `controls.css`).

---

## 10. Out of scope (this contract iteration)

- `tabs.add` wiring (known legacy gap).
- Save/load persistence beyond placeholders.
- Live widget binding.
- **Superseded for CP-1 sandbox (partial):** “full settings UI” as end-to-end product integration — the **four** settings sections listed in [kdbControl-settings-cp1-contractdelta.md](./_archive/kdbControl-settings-cp1-contractdelta.md) §1 may be implemented as **local `settings` state + sync** in `TEST/kdbControl-port/` per [kdbControl-settings-cp1-execution-spec.md](./_archive/kdbControl-settings-cp1-execution-spec.md); other settings/toolbox bodies remain inert.
- Real Cognos behavior (stubs / harness only).
- `controlDefinitions[]` and `config/controlDefinitions.js` until Phase 4 (Q1).
- Header integration and dashboard canvas writes.
- Widget, filter, launchpad or tab state mutations.
- Real actions behind buttons, inputs, radio buttons, dropdowns or expand/collapse controls.
- Persistence, writeback, tableDataService usage, Top N logic and history commits.

**Skeleton only** for this contract iteration.

---

## 11. Resolved questions (archive)

Original Q1–Q4 are resolved in **User decisions (Phase 1.4)** at the top of this document. **CP-1 authoring (2026-05-13)** supersedes **Q3** (and the Q2 addendum) for **where `isAuthoring` lives** and **how kdbControl participates**; see [kdbControl-authoring-mode-contractdelta.md](./_archive/kdbControl-authoring-mode-contractdelta.md).

Framework tranche 1 F1-Q1 through F1-Q4 are resolved in **User decisions (framework tranche 1)** at the top of this document. CP-1 was approved by the user on 2026-05-12.

---

## 12. Framework tranches 1 and 2 (archived)

The sandbox framework hand-off, visual parity delta and visual parity reset delta (formerly §12-§14) are archived in [_archive/kdbControl-framework-tranches-historical.md](./_archive/kdbControl-framework-tranches-historical.md). They describe the legacy and sandbox trees and no longer match the current layout.

## Approval log

| Date | Actor | Note |
|------|-------|------|
| 2026-05-12 | user | Approved after Q1–Q4; nested state; per-subsystem orchestrators; no controlDefinitions in skeleton; authoringMode stays subsystem (flag split in litmustest report). **Superseded for authoring truth 2026-05-13:** Q3 authoring ownership — see CP-1 row below. |
| 2026-05-13 | user | **CP-1 authoring-mode** approved: `source` enum `cognos-ui` \| `api` \| `bootstrap`; selector `authoring/state/selectors.js` · `readIsAuthoring(_KDB)`; runtime keys `authoringEntered` / `authoringExited`; `kdbControl` consumer-only; [kdbControl-authoring-mode-contractdelta.md](./_archive/kdbControl-authoring-mode-contractdelta.md). |
| 2026-05-12 | user | Approved framework tranche 1 delta: inert DOM primitives only; framework UI state under `_KDB.state.kdbControl.framework`; placeholder-only primitive config; no register API. |
| 2026-05-12 | user | CP-2 green for framework tranche 1 harness verification; hand-off recorded in Section 12. |
| 2026-05-12 | user | CP-1 approved for framework tranche 2 (Section 13): Strategy B visual parity; execution spec [kdbControl-framework-visual-parity-execution-spec.md](./_archive/kdbControl-framework-visual-parity-execution-spec.md). |
| 2026-05-12 | user | CP-1 approved for framework visual parity reset (Section 14): grid-shell structural reset; empty/inert section bodies first; execution spec [kdbControl-framework-visual-parity-reset-spec.md](./_archive/kdbControl-framework-visual-parity-reset-spec.md). |
| 2026-05-13 | user | **CP-1 settings:** `_KDB.state.kdbControl.settings` shape, reducer actions, selectors, sandbox wiring per [kdbControl-settings-cp1-contractdelta.md](./_archive/kdbControl-settings-cp1-contractdelta.md) and [kdbControl-settings-cp1-execution-spec.md](./_archive/kdbControl-settings-cp1-execution-spec.md); User decision **S1**. |
