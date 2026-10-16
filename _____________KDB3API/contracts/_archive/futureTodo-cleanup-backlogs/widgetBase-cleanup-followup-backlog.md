# Future Todo: `widgetBase` Cleanup Follow-Up

## Context

The 2026-06 `widgetBase` behavior-preserving cleanup round (batches 1–5 + CP-2) is **closed**.

Delivered in that tranche:

- merge `cleanLive*` / `cleanText*` → `dashboard/widgets/widgetBase/launchpadTransfer.js` (`cleanWidgetForTransfer`);
- shared helpers (`ensureWidgetBaseRuntime`, `normalizeWidgetLayout`, replay dispatch, owner-doc, interaction shared, mount startup);
- file-size compliance (all module JS files ≤ 150 lines);
- view/history dedup (`resolveOwnerDocument`, `applyShellLayoutStyles`, `isNumericLayout`, `dispatchWidgetBaseReplay`);
- error-handling alignment (orchestrator boundary, silent-catch fixes, entry try/catch on key effects);
- selector clone optimization;
- post-close fixes: `_normalizeWidgetLayout` in `handleTakeFromLaunchpad`; `LEGACY_REMAP` removed; `resolveWidgetShell` in `handleRemove` + `applyWidgetColour`.

Public API (`mount`, `destroy`, `dispatch`, `getState`), action types, state shape and history keys were intentionally unchanged.

---

## Deferred Module Items (optional polish)

Do **not** implement opportunistically. Each item needs explicit approval and a behavior-preservation check.

### B1 — Error-code taxonomy

**Current:** several non-drop failures still return `WIDGET_BASE_DROP_FAILED` (e.g. unknown action in controller, colour apply failures).

**Proposed:** introduce distinct codes (`WIDGET_BASE_UNKNOWN_ACTION`, colour/layout-specific codes) per contract §14.

**Risk:** callers or harnesses that match exact `errorCode` strings.

**Before change:** grep all `widgetBase` dispatch consumers and history replay paths.

### B2 — `cloneSerializable` → shared util

**Current:** module-local `state/cloneSerializable.js` (same pattern as `widgetVis`, `widgetTopN`, binding services).

**Proposed:** single helper under `KDB3/js/core/utils/` or `_KDB.utils` when a project-wide utils cleanup is approved.

**Risk:** catch/return parity (`undefined` vs original ref on failure).

### B3 — History replay promise rejection handling

**Current:** shared `dispatchWidgetBaseReplay` converts missing API to `Promise.resolve(false)`; some replay chains lack explicit `.catch` logging at the outer handler boundary.

**Proposed:** add `.catch` → `false` + `console.error` on canvas/launchpad/delegate replay entry points only where rejections are possible today.

**Risk:** low; additive logging only if return shape stays `false`.

### B4 — `createWidgetBaseReducer` nested reducer (AMD)

**Current:** inner `widgetBaseReducer` nested inside factory return (common Redux pattern).

**Proposed:** hoist to factory-scope named function if strict AMD full-compact enforcement is required.

**Risk:** low; no behavior change if reducer logic unchanged.

### B5 — `handleRouteToLaunchpad` broad `.catch`

**Current:** outer `.catch` maps all transfer failures to `WIDGET_BASE_LAUNCHPAD_APPEND_FAILED` with message `"Pre-transfer cleanup failed."`

**Proposed:** narrow catch to `cleanBeforeTransfer` only; let move/stale errors surface with correct codes.

**Risk:** **medium** — changes visible error mapping for some failure modes.

### B6 — `cleanWidgetForTransfer.resolveWidgetEl`

**Current:** still uses `document.getElementById` for element-or-id resolution inside transfer clean (shell is usually already resolved by caller).

**Proposed:** use `resolveWidgetShell(_KDB, widgetId)` when id-only path is taken.

**Risk:** low–medium in iframe/owner-document edge cases; align with `handleRemove` / `applyWidgetLayout`.

### B7 — Doc sync: `LEGACY_REMAP`

**Current:** removed from `config/launchpadChannels.js` (unused).

**Remaining:** `contracts/_archive/widgetBase-port-execution-spec.md` still lists `LEGACY_REMAP` in launchpad config return shape.

**Action:** doc-only delta when next contract sync tranche runs.

---

## Cross-Module Follow-Up

### Content cleanup delegation (separate tranche)

`widgetBase` transfer clean is **frame-only** today (`cleanLaunchpadWidget` + runtime bucket teardown). Settings-delete already orchestrates `widgetVis/cleanupContent` before `routeToLaunchpad`.

**See:** `futureTodo/widgetBase-cleanup-delegation-to-content-owners.md`

Do not fold routine `routeToLaunchpad` content teardown into `widgetBase` without:

1. contract deltas on `widgetBase`, `widgetVis`, `widgetText`;
2. distinction between **light transfer clean** vs **settings-delete full clean**;
3. acceptance on startup parking, user transfer, settings-delete undo/redo.

### Disposed-dispatch discipline

**Current:** `widgetBase` returns `{ ok: false, errorCode: "WIDGET_BASE_DESTROY_FAILED" }` on post-destroy dispatch.

**Inconsistency:** `widgetVis` / `widgetSettings` / `widgetTopN` often use `ok: true` + `skipped` / `aborted`.

Treat as project-wide mini-contract — see `widgetTopN-cleanup-followup-backlog.md` cross-module section.

### Legacy runtime teardown in transfer clean

**Current:** `cleanWidgetForTransfer` still disposes `_KDB.state.widgets[widgetId].listeners/subscriptions` (legacy bridge).

**Future:** remove when no production path writes per-widget legacy buckets; verify with content-owner runtime ownership first.

---

## Explicit Non-Goals (remain closed)

- Reintroducing `LEGACY_REMAP` without launchpad pad-config tranche approval.
- Content-owner Cognos slot/filter clearing inside `widgetBase`.
- Changing public API, action envelope, or history step keys without contract update.
- Editing `.cursor/rules/` or authority docs as part of follow-up polish.

---

## Suggested Trigger To Reopen

Reopen this backlog when **one** of these is true:

1. a new failure mode needs clearer `errorCode` taxonomy (B1);
2. project-wide `cloneSerializable` / disposed-dispatch standard is approved (B2 + cross-module);
3. content-cleanup delegation tranche is scheduled (delegation doc);
4. iframe/owner-document shell resolution bug is observed (B6);
5. a new `widgetBase` feature tranche touches route/transfer/replay paths.

Until then, consider `widgetBase` cleanup **complete**.
