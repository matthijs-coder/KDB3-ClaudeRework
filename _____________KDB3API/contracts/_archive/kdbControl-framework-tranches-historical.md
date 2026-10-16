# kdbControl: framework tranche 1 and 2 hand-offs (archived)

> Archived from `contracts/kdbControl.md` §12-§14 during the final docs pass. These sections describe the sandbox (`TEST/kdbControl-port/`) framework tranches against the legacy kdbControl shell. File paths below refer to the legacy and sandbox trees, not to the current repository layout. Current layout: `contracts/kdbControl.md` §9.


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

**Status:** CP-1 approved for execution (Strategy B); see [kdbControl-framework-visual-parity-execution-spec.md](./_archive/kdbControl-framework-visual-parity-execution-spec.md).

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
- `_____________KDB3API/contracts/_archive/kdbControl-framework-visual-parity-mapping.md` — mapping from legacy selectors / structure to current sandbox selectors / structure.

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

- Write `_____________KDB3API/contracts/_archive/kdbControl-framework-visual-parity-execution-spec.md` after CP-1 approval.
- Include Section A pre-flight echo and per-file `Rules to apply` checklists.
- Scope the CSS port in slices: shell/collapse first, header/toggles second, panel chrome third; do not attempt full `kdbControl.css` wholesale.
- Use `kdbControl-framework-visual-parity-mapping.md` as the selector translation source: every CSS slice must state which legacy selector concept it maps to and which current selector implements it.
- Acceptance must include side-by-side visual checkpoints at a fixed viewport, plus anti-D1 (`mount` / `destroy` try/catch) and anti-D2 (runtime cleanup order and `abortControllers.frameworkView`).

**CP-1 question:** resolved — Strategy B and tranche 2 scope approved for execution; parity CSS and harness wiring follow the execution spec.

---

## 14. Framework visual parity reset delta

**Status:** CP-1 approved for execution; see [kdbControl-framework-visual-parity-reset-spec.md](./_archive/kdbControl-framework-visual-parity-reset-spec.md).

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
