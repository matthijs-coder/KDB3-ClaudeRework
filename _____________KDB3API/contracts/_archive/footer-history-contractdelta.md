# footer — history integration (CP-1 contractdelta)

**Status:** Draft for CP-1 review.  
**Datum:** 2026-05-21  
**Relatie:** verfijnt `footer.md` §2 (ownership/state), §4/§5 (public API/actions), §6/§7 (header dependency), §9 (events), §10 (dependencies), §11 (folder layout), en sluit aan op `historyService.md`, `header-history-contractdelta.md`, `kdbControl-header-footer-toolbox-contractdelta.md` en `historyService-kdbControl-replay-bootstrap-contractdelta.md`.

---

## 1. Purpose

Deze delta legt vast hoe `footer` zijn eigen Fußzeile status-wijzigingen als undo/redo history steps commit en replayt.

Scope:

- Fußzeile toggle: `footer/toggle`, `footer/show`, `footer/hide` waar een confirmed `status` change ontstaat.
- Footer-owned replay handler contribution voor `historyService`.
- Header guard behavior during replay.

`kdbControl` blijft alleen UI/proxy-dispatcher voor toolbox controls. Het pusht geen footer history steps en replayt geen footer state.

---

## 2. Ownership

| Concern | Owner |
|---|---|
| `_KDB.state.footer` | `footer` reducer only. |
| `_KDB.state.history` | `historyService` only. |
| Footer status history step construction | `footer`. |
| Replay of footer status steps | `footer`, through `_KDB.api.footer.dispatch(...)` or footer-owned internal apply route. |
| Header status guard | `footer` reads published header selector; it never writes header state. |

Foreign writes blijven verboden:

- `footer` schrijft niet direct in `_KDB.state.history`; het gebruikt `_KDB.services.history.pushCommittedStep(step)`.
- `historyService` schrijft niet in `_KDB.state.footer`; replay loopt via the footer-owned handler.
- `kdbControl` schrijft niet in `_KDB.state.footer` en pusht geen footer history steps.

---

## 3. Step Model

Step key:

```txt
footer_chromeChange
```

Tracked target:

| Target | User action | Snapshot value |
|---|---|---|
| `footer.status` | Fußzeile toggle/show/hide | `"idle" | "active" | "removed"` |

Step shape:

```js
{
  key: "footer_chromeChange",
  timestamp: Date.now(),
  old: {
    target: "footer.status",
    value: "removed"
  },
  new: {
    target: "footer.status",
    value: "active"
  }
}
```

Not tracked:

- mount sync;
- DOM-only sync;
- footer hide caused by header removal with `source: "bootstrap"` unless CP-1 explicitly chooses to represent header/footer cascade as independent steps.

CP-1 recommendation: do not push footer history for automatic `footer/hide` triggered by `header:confirmedChanged` with `source: "bootstrap"`. Treat it as a consequence of header state, not a second user action.

---

## 4. Commit Rules

`footer` may call `_KDB.services.history.pushCommittedStep(step)` only when all of these are true:

1. The footer reducer accepted the action and returned a changed state.
2. The tracked target is `footer.status`.
3. `didChange === true`.
4. `options.skipHistory !== true`.
5. `options.isHistoryReplay !== true`.
6. `payload.source !== "bootstrap"` unless CP-1 explicitly authorizes system-generated steps.
7. `_KDB.services.history.pushCommittedStep` exists.

If `_KDB.services.history` is unavailable, the footer action still succeeds and history is skipped with at most one warning per page load/controller instance. Missing history service must not put `footer` into error state.

No replay path may push a new history step.

---

## 5. Replay Rules

Replay for `footer_chromeChange` applies the target snapshot selected by `historyService`:

- undo passes `step.old`;
- redo passes `step.new`.

Required replay options:

```js
{
  skipHistory: true,
  isHistoryReplay: true,
  forceApply: true,
  source: "api",
  direction: "undo" | "redo",
  step: step
}
```

CP-1 decision requested: use existing `SourceEnum` value `"api"` for history replay dispatches. Do not add `"historyReplay"` in this tranche because `footer` currently validates:

```txt
"kdbControl" | "api" | "bootstrap"
```

Replay action mapping:

| Desired value | Replay action |
|---|---|
| `"active"` | `footer/show` |
| `"removed"` | `footer/hide` |
| `"idle"` | stop and report unsupported unless implementation adds an explicit owner action; current reducer has no `footer/resetToIdle`. |

Header guard remains mandatory:

- Replay to `footer.status = "active"` may succeed only when `readHeaderStatus(_KDB) === "active"`.
- If header is not active, replay returns `false`, logs a focused warning, and does not throw.
- Replay to `removed` must be allowed regardless of header status.

Replay must:

- return `true` only when the owner state/effects apply route succeeds;
- return `false` for malformed target/value payloads;
- not throw through the history service boundary;
- not push a new history step;
- not mutate header state directly.

---

## 6. Header Dependency And Cascade Decision

Footer cannot be active when header is not active. Existing production behavior:

- `footer/toggle` and `footer/show` guard on `readHeaderStatus(_KDB) === "active"`.
- `footer` subscribes to `header:confirmedChanged`; when header becomes non-active and footer is active, it dispatches `footer/hide` with `source: "bootstrap"`.

CP-1 recommendation:

- Header removal remains a header history step.
- Automatic footer hide caused by `header:confirmedChanged` does not push an additional footer step.
- Undoing the header removal to active does not automatically restore a previously active footer unless the history stack contains a separate user footer step.

Rationale: one user action should create one history step; footer cascade is a policy consequence of header state, not a distinct footer user action.

Open decision: If product expects "undo header removal restores footer exactly as before", then header history snapshots must become combined header+footer snapshots. This delta recommends against that because it crosses ownership and complicates replay. Prefer independent owner steps plus documented cascade.

---

## 7. Runtime / Replay Handler Contribution

Footer stages a replay handler contribution during `footer.mount()` after `_KDB.runtime.footer` exists:

```txt
_KDB.runtime.footer.historyReplayHandlerContribution
```

Handler shape:

```js
{
  apply: function (_KDB, targetValue, step, context) {
    // delegates to footer-owned replay apply route
  }
}
```

No public `_KDB.api.footer.registerHistoryHandler` method is allowed.

If the handler contribution is stored in a standard bucket, use `_KDB.runtime.footer.adapters` only if the execution spec confirms this is clearer than a named runtime property. Do not introduce ad hoc bucket names beyond the documented contribution field without CP-1 approval.

Destroy cleanup:

- `footer.destroy()` must remove or null the staged contribution.
- Any replay runtime handles are footer-owned and cleaned by `footer.destroy()`.

---

## 8. Events And kdbControl Read-Sync

Footer emits no new event in this delta.

Existing subscription remains:

- `footer` subscribes to `header:confirmedChanged` for header removal policy.
- Teardown remains in `footer.destroy()`.

kdbControl checkbox UI must reflect footer replay after sync. Acceptable sync triggers:

- footer effects call `runtime.kdbControl.frameworkBindContext.syncView()` after replay/confirmed status changes; or
- a later kdbControl `history:changed` subscriber that only syncs view and writes no state.

CP-1 recommendation: prefer footer/header effects triggering kdbControl `syncView()` for this tranche, mirroring the existing header edit sync pattern.

---

## 9. Folder / File Placement

Recommended implementation placement:

```txt
KDB3/js/dashboard/footer/
  history/
    buildFooterHistoryStep.js
    maybePushFooterHistoryStep.js
    createFooterHistoryReplayHandler.js
    applyFooterHistoryReplay.js
    stageFooterHistoryReplayHandler.js
    readFooterHistorySnapshot.js
    isFooterHistoryTrackedTarget.js
```

Alternative names are acceptable only if they keep responsibilities equally focused and avoid vague folders.

Do not place footer replay code under:

```txt
core/services/historyService/
kdbControl/
helpers/
shared/
common/
manager/
```

---

## 10. Dependencies

New dependency:

| Dependency | Use |
|---|---|
| `_KDB.services.history` | Optional named-method service for `pushCommittedStep`. |
| `header/state/selectors.js` | Published `readHeaderStatus` guard, already used by footer. |

No dependency on `_KDB.history`.

No imports from `core/services/historyService/replay/*` inside `footer`.

No imports from `kdbControl` inside `footer`. kdbControl sync may use runtime context only as an existing UI sync hook; it must not become a state dependency.

---

## 11. Out Of Scope

- Header history step construction and replay, except dependency behavior documented here.
- Combined header+footer atomic history steps.
- Changing footer public API to named methods.
- Adding `"historyReplay"` to source enum unless CP-1 rejects `"api"`.
- Changing `historyService` public API.
- Native Cognos history.
- kdbControl pushing footer history steps.
- Porting filters/widgets/tabs/canvas replay.

---

## 12. CP-1 Questions

1. Approve `footer_chromeChange` as step key?
2. Approve `"api"` as replay `source` instead of adding `"historyReplay"`?
3. Approve that automatic `footer/hide` from `header:confirmedChanged` with `source: "bootstrap"` does not push a footer history step?
4. Approve footer replay to `"active"` returning `false` when header is not active?
5. Approve footer-owned `history/` folder and staged `historyReplayHandlerContribution`?
6. Approve that kdbControl only syncs view after footer replay and never owns or pushes these steps?

---

## 13. Acceptance Criteria

1. Fußzeile toggle/show/hide from user/API source creates one `footer_chromeChange` step after confirmed owner state change.
2. Automatic footer hide from header removal with `source: "bootstrap"` creates no footer history step.
3. Undo/redo restores footer owner state and DOM through footer-owned replay.
4. Replay to active fails cleanly when header is not active.
5. Replay creates no new history step.
6. `historyService` never imports footer files.
7. kdbControl pushes no footer history steps and performs no footer state writes.
8. kdbControl toolbox read view reflects footer replay after sync.

---

## Approval

| Datum | Actor | Note |
|------|-------|------|
| `<pending>` | `<pending CP-1>` | Draft delta awaiting review and approval. |
