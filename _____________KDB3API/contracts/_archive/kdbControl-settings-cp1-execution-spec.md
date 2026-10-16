# Execution Spec: kdbControl settings (CP-1 sandbox tranche)

**Status:** Ready for execution  
**Contracts:** [kdbControl.md](./kdbControl.md), [kdbControl-settings-cp1-contractdelta.md](./kdbControl-settings-cp1-contractdelta.md)  
**Phase:** Sandbox port — settings state + binding + sync only (no production tree)  
**Authoring AI:** Execution AI — 2026-05-13  
**Executing AI:** _(to be filled)_  
**Reviewer:** _(user)_

**Scope boundary:** Touch **only** files under `TEST/kdbControl-port/kdbControl/` (listed below), optionally `TEST/kdbControl-port/harness/harness.js` for debug helpers (line budget). **Same tranche:** apply **`kdbControl.md` edits** listed in §14 (docs sync). No `_______KDB3/`, no `.mdc` edits, no `_____________KDB3API/.cursor/rules/` edits.

**CP-1 hard forbiddens (implementing AI must grep-verify):**

- No `cognosAPI`, `_KDB.cognos`, **Cognos-backed canvas property writes**, persistence, history, writeback, `tableDataService` usage in touched files.
- **Allowed (sandbox refinement):** optional host hook **`_KDB.api.canvas.dispatch`** for **deferred canvas-owner intents** only (no real canvas module, no writes to `_KDB.state.dashboard` / `canvas` / `widgets` / `header` / `footer`); see [kdbControl-settings-cp1-contractdelta.md](./kdbControl-settings-cp1-contractdelta.md) §2b.
- No writes to `_KDB.state.widgets`, `_KDB.state.header`, `_KDB.state.footer`, `_KDB.state.dashboard`, `_KDB.properties` (reads of `config.options` for color palette remain allowed per existing gallery).
- No `document.body` / `document.documentElement` global mutations; all DOM queries/mutations stay under `runtime.kdbControl.domRefs` subtree (e.g. `contentEl`, `rootEl`) as today.
- No new `_KDB.events.emit` / request-events for settings.

**Exception to generic template Section K:** modifying `_____________KDB3API/contracts/kdbControl.md` is **required** in §14 — limited to listed sections only.

---

## 1. Pre-flight rule echo (implementing AI)

Before writing code, read in order and echo **one sentence per item** (numbered) in the first implementation response.

| # | Source | Echo (executing AI restates in own words) |
|---|--------|---------------------------------------------|
| 1 | `_____________KDB3API/.cursor/rules/state.mdc` | Single canonical writer per subtree; reducer owns `kdbControl` state; no foreign writes; selectors read-only. |
| 2 | `_____________KDB3API/.cursor/rules/runtime.mdc` | Runtime buckets + cleanup; AbortController preferred; teardown on destroy. |
| 3 | `_____________KDB3API/.cursor/rules/module-public-api.mdc` | `kdbControl` exposes `mount` / `destroy` / `dispatch` / `getState` only; granular reads via selectors. |
| 4 | `_____________KDB3API/.cursor/rules/events.mdc` | No new events for this slice; no request-events for settings commits. |
| 5 | `_____________KDB3API/.cursor/rules/dom.mdc` | DOM work scoped to placed shell; state changes via dispatch only. |
| 6 | `_____________KDB3API/.cursor/rules/feature-structure.mdc` | File roles, line budgets, orchestrator vs controller discipline. |
| 7 | `_____________KDB3API/.cursor/rules/naming.mdc` | Slash-actions; English identifiers; boundary `_` prefix. |
| 8 | `_____________KDB3API/.cursor/rules/error-handling.mdc` | try/catch on mount/destroy in controller; reducers non-throwing. |
| 9 | `_____________KDB3API/.cursor/rules/amd.mdc` | Single `define([...], function...)`; helpers at factory scope. |
| 10 | `_____________KDB3API/.cursor/lifecycleVocabulary.md` | kdbControl `lifecycle` subset unchanged by settings actions unless error path. |
| 11 | [kdbControl-settings-cp1-contractdelta.md](./kdbControl-settings-cp1-contractdelta.md) | Full file: shape, actions, DOM map, no shims. |
| 12 | This execution spec | Full file. |

---

## 2. File tree and line targets

Root: `TEST/kdbControl-port/kdbControl/`.

```
TEST/kdbControl-port/kdbControl/
  events/eventNames.js                         MODIFY  target +25 lines (hard 80)
  state/initialState.js                        MODIFY  target 55 (hard 120)
  state/createKdbControlReducer.js            MODIFY  target +140 lines (hard 280)
  state/selectors.js                          MODIFY  target 75 (hard 150)
  state/writers/writeSettingsSnapshot.js       DELETE (remove AMD module; no remaining imports)
  framework/bindFrameworkPrimitiveVisuals.js   MODIFY  target +40 lines (hard 200)
  framework/bindFrameworkKdbActionToggles.js   MODIFY  target +35 lines (hard 120)
  framework/syncFrameworkViewFromState.js      MODIFY  target +95 lines (hard 280)
  framework/buildControlMainBlocks.js          MODIFY  target +40 lines (hard 220)
  settings/__orchestratorSettings.js           MODIFY  target 45 (hard 120)
  settings/bindSettingsForm.js                CREATE  target 130 (hard 220)
  effects/__orchestratorEffects.js               MODIFY  target 20 (hard 60)
  effects/settingsPostDispatchSideEffects.js   CREATE  target 95 (hard 180)
  createKdbControlController.js                MODIFY  target +35 lines (hard 220)
```

**Harness (optional, small):**

```
TEST/kdbControl-port/harness/harness.js       MODIFY optional +35 lines (hard 280 total)
TEST/kdbControl-port/harness/adapters/createMockKdb.js   MODIFY optional — mock `_KDB.api.canvas.dispatch` logging
```

If harness changes are omitted, acceptance uses existing **Log state** plus manual inspection of `getState().settings`.

---

## 3. Per-file specifications

### `kdbControl/events/eventNames.js`

- **Role:** Event / action constants.
- **AMD:** keep existing deps; add six string constants for settings actions matching contractdelta §4 exactly (e.g. `ACTION_SETTINGS_SET_DASHBOARD_DIMENSION: "kdbControl/settings/setDashboardDimension"`, …).
- **Rules:** `naming.mdc` (slash-actions); `amd.mdc`.

### `kdbControl/state/initialState.js`

- **Role:** Initial `kdbControl` state.
- **Body:** Replace `settings` with the normative object from contractdelta §3. Remove `snapshot`, `dashboardDimensions`, `controlPanelColors`. Remove from `framework.placeholderSelections` the keys `dashboard.settingsButtons.toggle` and `dashboard.suButtons.toggle` (truth lives in `settings.dashboard` booleans only).
- **Rules:** `state.mdc`; `amd.mdc`.

### `kdbControl/state/createKdbControlReducer.js`

- **Role:** Reducer — pure; shallow-copy pattern consistent with existing `copyFramework` style; add `copySettings` or inline shallow merge for `settings` subtree.
- **Handlers:** Implement all six action types from contractdelta §4; invalid payload → return `state` unchanged. `toggleDashboardChrome`: only flip when `key` is exactly `"hideWidgetSettingsButtons"` or `"hideSuButtons"`.
- **Rules:** `state.mdc`; `naming.mdc`; `amd.mdc`.

### `kdbControl/state/selectors.js`

- **Role:** Published readers.
- **Body:** Remove `readSettingsSnapshot`, `readDashboardDimensions`, `readControlPanelColors`. Add `readDashboardSettings`, `readControlPanelSettings`, `readVisualizationDefaults`, `readCommentDefaults` returning the corresponding `s.settings.*` objects; if `s.settings` missing, return objects matching empty defaults from contractdelta §3 (defensive, same shapes).
- **Rules:** `state.mdc`; `module-public-api.mdc` (selectors as granular reads); `amd.mdc`.

### `kdbControl/state/writers/writeSettingsSnapshot.js`

- **Role:** N/A — **delete file**; ensure no `define([... "./writers/writeSettingsSnapshot"` imports remain anywhere under `TEST/kdbControl-port/`.

### `kdbControl/framework/bindFrameworkPrimitiveVisuals.js`

- **Role:** Primitive events.
- **Change:** For `data-placeholder-input-id` in the **settings id denylist** (contractdelta §6 first column), **do not** dispatch `ACTION_FRAMEWORK_SET_PLACEHOLDER_INPUT` (settings binder owns commits). Denylist must include: `dashboardWidth`, `dashboardHeight`, `dashboardBg`, `graphWidth`, `graphHeight`, `graphBg`, `commentWidth`, `commentHeight`, `commentBg`, `panelBg`, `panelButton`, `panelActionButton`.
- **Rules:** `dom.mdc`; `amd.mdc`.

### `kdbControl/framework/bindFrameworkKdbActionToggles.js`

- **Role:** Checkbox `change` for `data-kdb-action`.
- **Change:** For `dashboard.settingsButtons.toggle` and `dashboard.suButtons.toggle`, dispatch **`kdbControl/settings/toggleDashboardChrome`** with payload `{ key: "hideWidgetSettingsButtons" }` or `{ key: "hideSuButtons" }` respectively (map toggle action string → key). Do **not** dispatch `ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION` for these two.
- **Rules:** `dom.mdc`; `module-public-api.mdc`; `amd.mdc`.

### `kdbControl/framework/syncFrameworkViewFromState.js`

- **Role:** View sync from state.
- **Change:** After or within existing sync steps, apply **settings-driven** sync inside `contentEl` (or gallery root):
  - For each denylisted `data-placeholder-input-id`, set `input.value` from the mapped `settings` string field.
  - For the two dashboard toggle checkboxes (`data-kdb-action` values above), set `checked` from `settings.dashboard.hideWidgetSettingsButtons` / `hideSuButtons` **without** dispatching reducer actions.
- **Rules:** `dom.mdc`; `amd.mdc`.

### `kdbControl/settings/bindSettingsForm.js` (NEW)

- **Role:** Attach non-capturing listeners on `contentEl` for settings commits.
- **Factory:** `define(["../events/eventNames"], function (_eventNames) { "use strict"; … })`.
- **Export:** function `bindSettingsForm(_ctx, _signal)` where `_ctx` matches `frameworkBindContext` shape minimally: `{ _KDB, dispatch, getState, contentEl }` (may accept full ctx).
- **Behavior:**
  - Query `contentEl` for inputs with denylisted `data-placeholder-input-id`.
  - **Width / height fields** (`dashboardWidth`, `dashboardHeight`, `graphWidth`, `graphHeight`, `commentWidth`, `commentHeight`): dispatch on **`change`**, **`blur`**, and **`keydown`** when key is **Enter** (`preventDefault` on Enter to avoid stray form submission).
  - **Color / text color fields** (`dashboardBg`, `graphBg`, `commentBg`, `panelBg`, `panelButton`, `panelActionButton`): same as width/height **plus** listen to **`input`** so palette swatch updates (which fire `input` only) commit immediately without requiring blur.
  - Do **not** dispatch when the parsed action would be a no-op duplicate of current state (optional optimization; not required for CP-1).
- **Rules:** `dom.mdc` (dispatch only, no direct state assign); `runtime.mdc` (use `_signal`); `amd.mdc`.

### `kdbControl/settings/__orchestratorSettings.js`

- **Role:** Wiring after shell exists.
- **Parameters:** `function __orchestratorSettings(_KDB)`.
- **Body:** Read `runtime.kdbControl.domRefs.contentEl`; create `new AbortController()`; assign `runtime.kdbControl.abortControllers.settingsForm = ctrl`; call `bindSettingsForm` with `{ _KDB, dispatch: _KDB.api.kdbControl.dispatch, getState: _KDB.api.kdbControl.getState, contentEl }` and `ctrl.signal`. If `contentEl` or API missing, no-op safely.
- **Note:** `dispatch`/`getState` must be the same surface as framework binders use — obtain from `frameworkBindContext` if not yet on `_KDB.api` at call order; **execution order fix:** `__orchestratorSettings` runs from `createKdbControlController.mount` **after** `_fw(_KDB, { dispatch, getState })` so `frameworkBindContext` exists — pass `dispatch`/`getState` from that same `{ dispatch, getState }` closure in `mount` by changing `__orchestratorSettings` signature to `__orchestratorSettings(_KDB, _surface)` mirroring `_fw(_KDB, _surface)`. **Required:** update `createKdbControlController` to call `_st(_KDB, { dispatch: dispatch, getState: getState });`
- **Rules:** `feature-structure.mdc` (thin orchestrator); `amd.mdc`.

### `kdbControl/createKdbControlController.js`

- **Role:** Lifecycle.
- **Change:** Pass `_surface` into `_st`. In `destroy`, after framework teardown order, **`abort`** `abortControllers.settingsForm` if present (mirror `frameworkView` abort pattern). Ensure `settingsForm` abort runs **before** nulling `frameworkBindContext` if that ordering matters; recommended: abort `settingsForm` then existing `frameworkView` abort sequence unchanged, or abort both controllers where `abortControllers` is cleared.
- **Rules:** `runtime.mdc`; `error-handling.mdc`; `module-public-api.mdc`.

---

## 4. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle |
|-------------|---------|------------------|-----------|
| `kdbControl/settings/setDashboardDimension` | binders | Merge string into `settings.dashboard.width` or `.height` | none |
| `kdbControl/settings/setDashboardColor` | binders | `settings.dashboard.backgroundColor` | none |
| `kdbControl/settings/setControlPanelColor` | binders | One of `controlPanel` color fields by `role` | none |
| `kdbControl/settings/setVisualizationDefault` | binders | One field under `defaultsNew.visualization` | none |
| `kdbControl/settings/setCommentDefault` | binders | One field under `defaultsNew.comment` | none |
| `kdbControl/settings/toggleDashboardChrome` | toggle `change` | Flip boolean for allowed `key` | none |

Invalid payload on any row: **no state change**.

---

## 5. Dispatch → action mapping (bindSettingsForm)

| `data-placeholder-input-id` | Action | Payload |
|-------------------------------|--------|---------|
| `dashboardWidth` | `setDashboardDimension` | `{ dimension: "width", value }` |
| `dashboardHeight` | `setDashboardDimension` | `{ dimension: "height", value }` |
| `dashboardBg` | `setDashboardColor` | `{ value }` |
| `graphWidth` | `setVisualizationDefault` | `{ field: "width", value }` |
| `graphHeight` | `setVisualizationDefault` | `{ field: "height", value }` |
| `graphBg` | `setVisualizationDefault` | `{ field: "backgroundColor", value }` |
| `commentWidth` | `setCommentDefault` | `{ field: "width", value }` |
| `commentHeight` | `setCommentDefault` | `{ field: "height", value }` |
| `commentBg` | `setCommentDefault` | `{ field: "backgroundColor", value }` |
| `panelBg` | `setControlPanelColor` | `{ role: "background", value }` |
| `panelButton` | `setControlPanelColor` | `{ role: "button", value }` |
| `panelActionButton` | `setControlPanelColor` | `{ role: "actionButton", value }` |

Use `String(value)`; empty input → `""`.

---

## 6. Harness acceptance (manual CP-2)

1. Open harness, **Mount** kdbControl.
2. Open **Settings** panel; expand **Dashboard**, **Diagramme**, **Kommentare**, **Steuerungspanel** sections.
3. Edit each text/color field; use color swatch once; toggle both dashboard hide switches (**Settings-Buttons** toggle lives under **Diagramme**; **SU** toggle under **Dashboard**).
4. After each logical group, click **Log state** (or harness helper): confirm `_KDB.state.kdbControl.settings` matches edits; call selectors in console if helper added.
5. Confirm **`#harness-debug-log`** shows **`[canvas.dispatch]`** lines when committing dashboard width/height/background and **both** dashboard chrome toggles (**Settings-Buttons** under Diagramme, **SU** under Dashboard).
6. **Steuerungspanel** color commits visibly restyle the **kdbControl root**, **collapse arrow**, and **action buttons** inside the shell.
7. Collapse/expand panel or trigger `syncView` path (e.g. toggle top panel away and back to settings): **UI reflects state** (no stale inputs).
8. **Destroy** then Mount again: fields return to **empty / false** defaults.

---

## 7. Grep self-verification (implementing AI)

Run from repo root (PowerShell or ripgrep):

```text
rg "readSettingsSnapshot|readDashboardDimensions|readControlPanelColors|dashboardDimensions|controlPanelColors|settings\.snapshot" TEST/kdbControl-port/kdbControl
```

Expect **no hits** after implementation.

```text
rg "cognosAPI|_KDB\.properties\s*=" TEST/kdbControl-port/kdbControl
```

Expect **no hits** (assignment to properties; reads like config remain in gallery only).

---

## 8. Section L reporting (implementing AI)

Return: file checklist with line counts, grep results, confirmation denylist wired, confirmation `writeSettingsSnapshot.js` deleted, and `kdbControl.md` §14 edits applied.

---

## 14. Docs sync — `kdbControl.md` (required edits)

Implementing AI applies **only** these edits to `_____________KDB3API/contracts/kdbControl.md`:

1. **§3 Runtime table** — extend `abortControllers` row text to include `settingsForm` alongside `frameworkView` (CP-1 settings binders).
2. **§5 Readers / writers** — Replace the three old settings selector rows with the four new selectors from contractdelta §5. Replace internal writers sentence: remove `writeSettingsSnapshot`; state **settings subtree is reducer-only**; keep `writeFrameworkView` only if still accurate (if file removed from port, drop mention).
3. **§7 Dependencies** — Add short **CP-1 settings** bullet: this slice adds **no** `_KDB.properties` writes and **no** Cognos calls for settings commits; existing `_KDB.config.options` reads for palette unchanged.
4. **§9 Folder layout** — Remove `writers/writeSettingsSnapshot.js` from the code block list.
5. **§10 Out of scope** — Replace or qualify the bullet **“Full settings UI implementation”** with: *Superseded for CP-1 sandbox:* the four sections in [kdbControl-settings-cp1-contractdelta.md](./kdbControl-settings-cp1-contractdelta.md) §1 may be implemented as local state-bound behavior without persistence/integration; other settings/toolbox bodies remain inert.
6. **Approval log** (end of doc) — add one row: 2026-05-13 user — CP-1 settings state + selectors + contractdelta approved for sandbox execution per [kdbControl-settings-cp1-contractdelta.md](./kdbControl-settings-cp1-contractdelta.md).

Add cross-link at top **User decisions** optional: small row **S1** — Settings CP-1: `_KDB.state.kdbControl.settings` shape and actions per contractdelta (recommended one line).

---

## 15. Open questions

None for mechanical execution; any harness UX polish is optional under line caps.
