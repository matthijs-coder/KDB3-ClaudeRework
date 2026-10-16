# Execution spec: kdbControl framework visual parity reset

**Status:** Ready for execution
**Contract:** [kdbControl.md](../kdbControl.md) Section 14
**Mapping:** [kdbControl-framework-visual-parity-mapping.md](./kdbControl-framework-visual-parity-mapping.md)
**Authoring AI:** GPT-5.5, 2026-05-12
**Executing AI:** cheap AI, next pass
**Reviewer:** supervising AI / user

---

## Section A. Pre-flight echo

The executing AI must read these files before editing and must echo one sentence per item before producing files:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` top-level namespaces are fixed; feature code receives `_KDB` as an argument and does not invent namespaces.
2. `_____________KDB3API/.cursor/rules/state.mdc` — `_KDB.state` is serializable owner-written state; this reset must not add or reshape state.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — live DOM refs and AbortControllers belong under `_KDB.runtime.<owner>` and must have cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — kdbControl keeps the existing dispatch-style API; no new public methods.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events or hardcoded event names are allowed in this visual reset.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — files stay focused, AMD entry names remain canonical, and delegated execution follows this spec.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — technical ids/classes/comments are English; German is user-facing label text only.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables/subscribers/async per error-handling.mdc.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — builders create detached DOM, placers attach it, sync mutates classes; no DOM refs in state.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — production-shaped JS uses compact AMD with factory-scope helpers only.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — kdbControl lifecycle subset remains unchanged.
12. `_____________KDB3API/contracts/kdbControl.md` — Section 14 is the approved visual parity reset contract.
13. `_____________KDB3API/contracts/kdbControl-framework-visual-parity-mapping.md` — selector translation source for this reset.
14. This execution spec.

Execution may not start until the echo is present.

---

## Section B. Legacy read inputs

Legacy is read-only. Read only the files listed here, and do not copy their classes as shims:

- `_______KDB3/KDB3/css/kdbControl.css`
- `_______KDB3/KDB3/css/toggleButton.css`
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlShell.js`
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlHeader.js`
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlMainToggles.js`
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlMainBlocks.js`
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlSettingsSkeleton.js`
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/buildControlToolboxSkeleton.js`
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkCollapse.js`
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkTopToggles.js`
- `_______KDB3/KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkSectionToggles.js`

Read toolbox/settings deep builders only to confirm later-slice geometry; do not implement their content in this reset.

---

## Section C. Files in scope

Only these files may be changed:

```txt
TEST/kdbControl-port/kdbControl/framework/buildControlShell.js
TEST/kdbControl-port/kdbControl/framework/buildControlMainBlocks.js
TEST/kdbControl-port/kdbControl/framework/buildControlMainToggles.js
TEST/kdbControl-port/kdbControl/framework/buildControlHeader.js
TEST/kdbControl-port/kdbControl/framework/syncFrameworkViewFromState.js
TEST/kdbControl-port/kdbControl/framework/placeControlShell.js
TEST/kdbControl-port/harness/css/kdb-control-harness-base.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice1.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice2.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice3.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice4.css
TEST/kdbControl-port/harness/index.html
```

Do not change reducers, action names, public API, events, state shape, controller teardown, services, Cognos adapters, legacy files, rules or templates.

---

## Section D. Required implementation order

1. DOM reset: rebuild the sandbox shell with legacy-equivalent current-named wrappers.
2. Shell CSS: replace flex shell assumptions with grid shell/content geometry.
3. Header/settings/save-load/main-toggle row CSS: restore the legacy vertical rhythm.
4. Main block and section geometry: restore button-then-container sections and open-body placement.
5. Cleanup: remove inline layout styles in builders when CSS owns the same layout role.

Stop and report if any step requires new state, new reducer actions or a public API change.

---

## Section E. Per-file specifications

### `TEST/kdbControl-port/kdbControl/framework/buildControlShell.js`

- **Role:** view builder.
- **Target:** 80-130 lines.
- **Required DOM shape:**
  - Build `#kdb-control-root.kdb-control`.
  - Build `#kdb-control-content.kdb-control__content` as the first child of root.
  - Build `#kdb-control-arrow.kdb-control__collapse-arrow` as the second child of root.
  - Inside content, append in this order:
    1. header from `buildControlHeader`;
    2. settings outer wrapper `#kdb-control-settings-outer.kdb-control__settings-outer`;
    3. empty save/load spacer `#kdb-control-save-load-slot.kdb-control__save-load-slot`;
    4. main toggles from `buildControlMainToggles`;
    5. main blocks wrapper from `buildControlMainBlocks`.
  - The settings panel returned by `buildControlMainBlocks` is appended inside the settings outer wrapper.
  - The metrics/toolbox main block wrapper is appended in the main blocks row.
  - The primitive gallery may stay inside metrics, but must remain hidden or debug-only through CSS.
- **Rules to apply:**
  - `amd.mdc` — compact AMD, named `__controller`, helpers at factory scope only.
  - `dom.mdc` — builder creates detached DOM only; no listener binding and no state writes.
  - `naming.mdc` — current English ids/classes; visible German text only through child builders.
  - `feature-structure.mdc` — focused builder, under hard line limit.

### `TEST/kdbControl-port/kdbControl/framework/buildControlMainBlocks.js`

- **Role:** view builder.
- **Target:** 70-120 lines.
- **Required shape:**
  - Return an object with `mainBlocks`, `metrics`, `toolbox` and `settings`.
  - `mainBlocks` is `#kdb-control-main-blocks.kdb-control__main-blocks`.
  - `metrics` keeps `#kdb-control_metrics_container.kdb-control__panel.kdb-control__panel-metrics`.
  - `toolbox` keeps `#kdb-control_toolbox_container.kdb-control__panel.kdb-control__panel-toolbox`.
  - `settings` keeps `#kdb-control_settings_container.kdb-control__panel.kdb-control__panel-settings`.
  - Append metrics and toolbox to `mainBlocks`; do not append settings there.
  - Preserve exact section ids and labels:
    - `toolboxComments` / `Kommentar`
    - `toolboxTabs` / `Tab`
    - `toolboxHeaderFooter` / `Kopfzeile/Fußzeile`
    - `settingsDashboard` / `Dashboard`
    - `settingsCharts` / `Diagramme`
    - `settingsComments` / `Kommentare`
    - `settingsControlPanel` / `Steuerungspanel`
  - Each section remains a head followed by a separate body container.
- **Rules to apply:**
  - `amd.mdc` — no nested helper functions.
  - `dom.mdc` — inert DOM only; no state writes or listeners.
  - `naming.mdc` — English technical ids; German labels only as text.
  - `feature-structure.mdc` — focused builder, line limit respected.

### `TEST/kdbControl-port/kdbControl/framework/buildControlMainToggles.js`

- **Role:** view builder.
- **Target:** 40-70 lines.
- **Required shape:**
  - Render exactly two top toggles: `metrics` with visible label `Kennzahlen`, and `toolbox` with visible label `Toolbox`.
  - Do not render a text `Einstellungen` top toggle.
  - Keep `[data-panel-id]` for existing binder behavior.
- **Rules to apply:**
  - `amd.mdc` — compact AMD, helpers at factory scope only.
  - `dom.mdc` — no listener binding or state writes.
  - `naming.mdc` — no technical `kennzahlen`.

### `TEST/kdbControl-port/kdbControl/framework/buildControlHeader.js`

- **Role:** view builder.
- **Target:** 60-100 lines.
- **Allowed changes only:**
  - Keep title and settings/info icons.
  - Keep settings as the way to select the settings panel.
  - Adjust classes or image source fallback only if needed for the reset structure.
  - Do not add real info navigation or Cognos behavior.
- **Rules to apply:**
  - `amd.mdc` — compact AMD.
  - `dom.mdc` — inert DOM; no listeners.
  - `naming.mdc` — English classes; German accessibility labels are user-facing.

### `TEST/kdbControl-port/kdbControl/framework/syncFrameworkViewFromState.js`

- **Role:** view mutator.
- **Target:** 100-150 lines.
- **Required sync:**
  - Toggle `kdb-control_collapsed` on root and `kdb-control_content_hidden` on content.
  - Toggle `kdb-control_settings-open` on content when `activeTopPanel === "settings"`.
  - Show `metrics` and `toolbox` in the main blocks row; show `settings` in the settings outer row.
  - Keep top toggle selected state only for `metrics` and `toolbox`.
  - Keep settings icon selected when `activeTopPanel === "settings"`.
  - Keep section shell open/selected classes based on `openSectionId`.
  - Do not mutate `_KDB.state` directly.
- **Rules to apply:**
  - `amd.mdc` — event handlers and helpers at factory scope only.
  - `dom.mdc` — mutator applies DOM classes only; no rebuild and no state writes.
  - `runtime.mdc` — any one-time wiring flag stays under `_KDB.runtime.kdbControl`, not on DOM nodes or AbortSignal.
  - `state.mdc` — reads existing state only.

### `TEST/kdbControl-port/kdbControl/framework/placeControlShell.js`

- **Role:** view placer / runtime domRef writer.
- **Target:** 50-100 lines.
- **Allowed changes only:**
  - Add current wrapper refs if needed: `settingsOuterEl`, `mainBlocksEl`, `saveLoadSlotEl`.
  - Preserve existing refs used by binders: `rootEl`, `contentEl`, `arrowEl`, `mainTogglesEl`, `metricsContainerEl`, `toolboxContainerEl`, `settingsContainerEl`, `primitiveGalleryEl` if present.
- **Rules to apply:**
  - `amd.mdc` — compact AMD.
  - `dom.mdc` — placer attaches DOM and records live refs under runtime only.
  - `runtime.mdc` — refs live under `_KDB.runtime.kdbControl.domRefs`.
  - `state.mdc` — no state writes.

### Harness CSS files

Files:

- `TEST/kdbControl-port/harness/css/kdb-control-harness-base.css`
- `TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice1.css`
- `TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice2.css`
- `TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice3.css`
- `TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice4.css`

Required CSS responsibilities:

- Base: visibility primitives only (`.KDB_visible`, hidden panels, open section body).
- Slice 1: root grid, collapse column, collapsed grid state, content hidden state.
- Slice 2: content grid rows, header, settings outer row, save/load spacer and main toggles.
- Slice 3: main blocks, panels and section head/body geometry.
- Slice 4: primitive gallery hidden/debug-only policy.

Rules to apply:

- `naming.mdc` — current English classes; no legacy class shims.
- `feature-structure.mdc` — keep slices focused; do not copy the full legacy CSS wholesale.
- `dom.mdc` — CSS targets current selectors from the reset mapping.

### `TEST/kdbControl-port/harness/index.html`

- **Role:** harness HTML.
- **Allowed changes only:** CSS ordering comments or viewport sizing required by the visual checkpoint.
- **Rules to apply:** harness remains local; no Cognos scripts and no business actions.

---

## Section F. Acceptance criteria

1. `#kdb-control-root.kdb-control` uses CSS grid with a fixed `30px` right collapse column.
2. Expanded root has content column plus full-height collapse strip; collapsed root has zero-width content column plus the same vertical strip.
3. `#kdb-control-content.kdb-control__content` has explicit legacy-equivalent row slots: header, settings outer, save/load spacer, main toggles, main blocks.
4. Settings opens inside `#kdb-control-settings-outer`, not as a third card inside `#kdb-control-main-blocks`.
5. `#kdb-control-main-blocks` contains metrics/toolbox only.
6. Top toggles are exactly `Kennzahlen` (`metrics`) and `Toolbox` (`toolbox`).
7. Settings icon opens/selects settings using existing visual dispatch; info icon remains inert.
8. Toolbox/settings sections render as head followed by separate body container; selected section uses underline/selected state without enclosing the body inside the button.
9. Primitive gallery is hidden or debug-only for the visual parity checkpoint.
10. No API, reducer action, state shape, event, Cognos, service, business action, `controlDefinitions[]`, `registerControl` or `registerCustomControl` change.
11. No legacy class shims and no German technical ids/classes/values.
12. `ReadLints` on touched JS is clean.
13. Browser CP-2 at 1280x720 confirms shell proportions, collapse strip placement, header/toggle spacing and section geometry are closer to legacy than the previous flex-card result.

---

## Section G. Forbidden actions

- Do not edit any file under `_______KDB3/`, `_______REDESIGN2/` or `_______LAATSTEORIGINAL/`.
- Do not add real toolbox/settings content beyond empty/inert section bodies.
- Do not add Cognos calls, services, event emissions, persistence, writeback, history commits, tableDataService usage or Top N behavior.
- Do not add `controlDefinitions[]`, `registerControl` or `registerCustomControl`.
- Do not introduce new `_KDB.state.kdbControl.framework` fields.
- Do not change contracts, rules or templates during execution.
- Do not commit or push.

---

## Section H. Reporting template

Report back with:

1. Pre-flight echo summary.
2. Files changed with line counts.
3. Structural reset summary by slice A-D.
4. Acceptance criteria pass/fail for F1-F13.
5. Deviations, or `none`.
6. Screenshot/manual visual result summary and whether CP-2 browser verification is ready.
