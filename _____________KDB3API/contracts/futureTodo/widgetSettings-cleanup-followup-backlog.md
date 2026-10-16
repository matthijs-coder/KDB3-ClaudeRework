# Future Todo: `widgetSettings` Cleanup Follow-Up

## Context

The 2026-06 `widgetSettings` behavior-preserving cleanup round (tranches 1–4 + CP-2) is **closed**.

Delivered in that tranche:

- monolith splits (`dispatchWidgetSettingsIntent.js` 490→106, `handleSeedDefaults.js` 399→127, panel/placement under 120);
- shared helpers (`resolvePanel`, `resolveRenderRoot`, `closeVisibleDropdowns`, `seedDefaultsApplyResults`, `resolveCanonicalVisOptionValue`, `dropdownPopulateHelpers`, `configuredDefaultOptionUtils`, etc.);
- controller import reduction (12→6 via `routeWidgetSettingsDispatch.js`);
- dead code removal (empty `domBoundary` / `historyBoundary` / `viewBoundary`, unused `noopDispatchEffect.js`);
- file-size compliance (all module JS files ≤ 150 lines; 73 files total);
- no `console.log` / `console.debug` in module scope.

Public API (`mount`, `destroy`, `dispatch`, `getState`), state shape, action types, events and `contracts/widgetSettings.md` were intentionally unchanged.

---

## Deferred Module Items

Do **not** implement opportunistically. Each item needs explicit approval and, where noted, runtime evidence.

### S1 — `__controller` entry naming on state/helpers

**Current:** several state/effect files export named functions (`commitWidgetSettingValue`, `applyVisStartupSeedBatch`, …) instead of `__controller` per `naming.mdc` / `amd.mdc`.

**Risk:** rename-only churn across AMD imports; no functional gain unless paired with a module-wide naming pass.

**Before change:** decide whether widget modules treat multi-export AMD objects as an accepted pattern for small helpers (already used in `seedDefaultsApplyResults`, `panelDropdownUi`, etc.).

### S2 — `cloneState` vs cross-widget `cloneSerializable`

**Current:** `state/cloneState.js` duplicates the JSON deep-clone pattern used in `widgetBase/state/cloneSerializable.js`. Inline `cloneSerializable` also exists in `commitWidgetSettingValue.js`.

**Risk:** silent catch returns `undefined` (`cloneState`) vs raw value (`commitWidgetSettingValue`) — behavior differs on non-serializable input.

**Before change:** confirm whether a shared helper under `widgets/_shared/` or `_KDB.utils` is approved; unify return semantics explicitly.

### S3 — Vis dropdown safeguard parity (dimension / visualization)

**Current:** only TopN has dedicated pending/revert (`topNDropdownSafeguard.js`). Dimension and visualization use generic static populate without the same commit-after-apply DOM revert path in view/.

**Risk:** asymmetric UX on apply failure for non-TopN vis dropdowns (contract §4 describes safeguard for dimension/visType/topN — verify runtime parity).

**Before change:** reproduce failure paths in Cognos; if gap confirmed, extend safeguard pattern without duplicating TopN-only logic.

### S4 — `bindWidgetSettingsPanel` error swallowing on pointer handlers

**Current:** `onPanelPointerDown`, `onDocumentPointerDown`, `onPanelFocusOut`, `disableMoveResizeModes` log errors but do not rethrow.

**Risk:** stale UI (open dropdowns, armed move/resize) if a handler throws mid-flow.

**Before change:** decide whether panel binders should convert to structured `{ ok: false }` callbacks or remain boundary-isolation per `error-handling.mdc`.

### S5 — `recordWidgetSettingSeedStatus.js` repetitive try/catch wrappers

**Current:** four near-identical try/catch blocks on thin state writes.

**Safe refactor:** single internal guard helper at factory scope — behavior-preserving if log prefixes and rethrow semantics stay identical.

### S6 — `config/options.js` vs `_KDB.config.options` registration

**Current:** module-local option lists in `config/options.js`; runtime may also read `_KDB.config.options.color` for colour dropdowns.

**Before change:** confirm canonical source-of-truth per `kdb-object.mdc`; avoid dual registration without contract delta.

### S7 — Soft-band file trims (127–135 lines)

**Current largest files:** `orchestrateResetToLaunchpad.js` (135), `buildWidgetVisSettingsSnapshot.js` (127), `handleSeedDefaults.js` (127), `configuredDefaultOptionUtils.js` (125).

**Note:** all within hard limit (150). Further splits are cosmetic unless a file grows again.

---

## Cross-Module Follow-Up

### Disposed-dispatch discipline (project-wide)

`widgetSettings` returns `{ ok: true, skipped: true, reasonCode: "MODULE_DISPOSED" }` on post-destroy dispatch (same family as `widgetVis`, `widgetTopN`, `widgetText`).

Align with project-wide standard if `widgetBase` / `launchpad` `ok: false` pattern is chosen — see `futureTodo/widgetTopN-cleanup-followup-backlog.md` §Cross-Module.

### Settings-delete undo smoke path

**Depends on:** `widgetBase` fix for `handleTakeFromLaunchpad` (`normalizeLayout` → `_normalizeWidgetLayout`) — required for launchpad-transfer undo replay.

**Verify in Cognos:**

1. widget drop → seed defaults;
2. dropdown commit + settings history undo/redo;
3. settings-delete → launchpad → undo (base replay + `restoreCommittedSettings`).

### Contract completion

`contracts/widgetSettings.md` remains **Draft CP-1** stub. Full contract (per-control history keys, replay payload shapes, settings-slot DOM boundary) is a **documentation tranche**, not part of the closed cleanup.

---

## Hygiene / Audit (low priority)

### Empty `dom/` folder

Boundary stub files were removed; `widgetSettings/dom/` may be empty. Remove folder or repopulate when a real DOM boundary adapter is specified in contract.

### AMD multi-export objects

Several new helper modules return `{ fnA, fnB }` instead of a single export. Optional audit: align with `amd.mdc` §multi-export smell or document as accepted helper pattern for this module.

### Import-count watch

`finalizeVisIntentResult.js` and `dispatchWidgetSettingsIntent.js` approach 7–8 imports after splits — still under 10; monitor on next feature tranche.

---

## Explicit Non-Goals (remain closed)

- Changing publieke API, state shape, events or dispatch action names without contract update.
- Renaming British `colour` / `COMMIT_COLOUR` to US English without project-wide widget vocabulary pass.
- Moving `warnedMissingApi` factory-closure in `dispatchToTargetApi.js` to `_KDB.runtime` (would change warning suppression behavior).
- Editing `.cursor/rules/` or authority docs as part of this follow-up.
- Legacy tree reads/edits (`_______REDESIGN2/`, `_______KDB3/`, `TEST/`).

---

## Suggested Trigger To Reopen

Reopen this backlog when **one** of these is true:

1. Cognos smoke test exposes vis dropdown revert/pending gap (S3);
2. settings-delete undo/redo fails after widgetBase launchpad replay fixes;
3. a new `widgetSettings` feature tranche adds controls or history keys (contract + file growth);
4. project-wide disposed-dispatch or clone-helper standard is approved (S1/S2);
5. `buildWidgetVisSettingsSnapshot` or seed pipeline grows back over 150 lines.

Until then, consider `widgetSettings` cleanup **complete**.
