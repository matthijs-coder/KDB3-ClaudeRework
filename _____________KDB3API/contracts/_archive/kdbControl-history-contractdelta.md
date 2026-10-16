# kdbControl — history integration (CP-1 contractdelta)

**Status:** Draft for CP-1 review.  
**Datum:** 2026-05-17  
**Relatie:** verfijnt `kdbControl.md` §4 (public API / dispatch), §5 (readers/writers), §6 (events), §7 (dependencies), §8 (Cognos touchpoints), §9 (folder layout) en §10 (out of scope). Deze delta gebruikt `historyService.md` als service-contract en houdt replay-eigenaarschap bij `kdbControl`, niet bij `historyService`.

---

## 1. Purpose

Deze delta legt vast hoe `kdbControl` dashboard/control-panel settings-wijzigingen op de centrale history stack commit en later via de eigen owner-boundary kan replayen.

De scope is **kdbControl settings history commit + replay integration**:

- user-commits van geselecteerde settings maken een serialiseerbare history step via `_KDB.services.history.pushCommittedStep(...)`;
- undo/redo replay voor `kdbControl_settingsChange` loopt via `kdbControl` zelf wanneer een approved internal replay-handler connection actief is, niet via dashboard-adapter imports in `historyService`;
- replay past dezelfde settings-apply route toe als een user commit, maar met `skipHistory`, `isHistoryReplay` en `forceApply`.

`historyService` blijft generiek: het bewaart stack/pointer en roept een handler aan wanneer die rule-aligned beschikbaar is. Het mag geen kdbControl internals importeren.

If the replay handler is not wired in the approved implementation scope, this tranche is commit-only: `pushCommittedStep` may still add `kdbControl_settingsChange` steps, but `undo()` / `redo()` for those steps resolve `false` at the `historyService` replay boundary.

---

## 2. Ownership

| Onderdeel | Eigenaar |
|---|---|
| `_KDB.state.kdbControl.settings` | `kdbControl` reducer (enige writer). |
| `_KDB.state.history` | `historyService` (enige writer). |
| History step construction for kdbControl settings | `kdbControl`, omdat alleen `kdbControl` de settings snapshot semantics kent. |
| Replay of `kdbControl_settingsChange` | `kdbControl`, via its public dispatch boundary or internal controller route owned by `kdbControl`. |

Foreign writes blijven verboden:

- `kdbControl` schrijft niet direct in `_KDB.state.history`; het gebruikt `_KDB.services.history.pushCommittedStep`.
- `historyService` schrijft niet in `_KDB.state.kdbControl`; replay moet via `kdbControl` owner logic.
- Replay mag niet direct dashboard/canvas/widgets/header/footer state wijzigen tenzij een eigenaar-API/dispatch dat later expliciet toestaat.

---

## 3. Step Model

Step key:

```txt
kdbControl_settingsChange
```

Step shape:

```js
{
  key: "kdbControl_settingsChange",
  timestamp: Date.now(),
  old: {
    target: "dashboard.width",
    value: {
      // target-specific serializable snapshot
    }
  },
  new: {
    target: "dashboard.width",
    value: {
      // target-specific serializable snapshot
    }
  }
}
```

`old` and `new` values must remain JSON-serializable. They must not carry DOM nodes, jQuery objects, functions, Cognos API objects, AbortControllers, Promise references or runtime handles.

Tracked targets, matching legacy:

| Target | Snapshot category |
|---|---|
| `dashboard.width` | dimension snapshot |
| `dashboard.height` | dimension snapshot |
| `dashboard.backgroundColor` | color snapshot |
| `controlPanel.backgroundColor` | color snapshot |
| `controlPanel.buttonColor` | color snapshot |
| `controlPanel.actionButtonColor` | color snapshot |
| `defaults.visualizationBackgroundColor` | color snapshot |
| `defaults.textBackgroundColor` | color snapshot |
| `dashboard.areSettingsButtonsHidden` | boolean toggle snapshot |
| `dashboard.areSuButtonsHidden` | boolean toggle snapshot |

Not tracked in this tranche, matching legacy:

| Target | Reason |
|---|---|
| `visualization.width` / `visualization.height` | Legacy default-size fields are not pushed to app history. |
| `text.width` / `text.height` | Legacy default-size fields are not pushed to app history. |
| Any new settings target | Behavior expansion, not direct-port rule-alignment. |

---

## 4. Public API / Dispatch Boundary

`_KDB.api.kdbControl` remains the dispatch-style feature module surface from `kdbControl.md`:

```js
_KDB.api.kdbControl = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

This delta adds no new public named method.

Replay enters through dispatch:

```js
_KDB.api.kdbControl.dispatch({
  type: "kdbControl/replaySettings",
  payload: {
    target: "dashboard.width",
    value: { /* serializable target snapshot */ },
    direction: "undo",
    step: { /* original history step */ }
  }
});
```

The controller/reducer/effects split remains:

- reducer mutates only `_KDB.state.kdbControl.settings`;
- effects apply DOM/Cognos/canvas-owner intents after reducer commits where already allowed by the settings contract;
- replay must use the same apply route as user commits, with history-push disabled.

If the current controller structure cannot express `kdbControl/replaySettings` without adding a public named method, stop and escalate before implementation.

This dispatch action is the owner-side replay endpoint. It is not by itself the historyService connection. The connection from `historyService` to this endpoint must use the CP-1-approved internal bootstrap/dependency-injection mechanism in §10 and §14.

---

## 5. Commit Rules

`kdbControl` may call `_KDB.services.history.pushCommittedStep(step)` only when all of these are true:

1. The settings apply succeeded.
2. The committed target is listed in §3 "Tracked targets".
3. `didChange === true`.
4. `options.skipHistory !== true`.
5. `options.isHistoryReplay !== true`.
6. `_KDB.services.history.pushCommittedStep` exists.

If `_KDB.services.history` is unavailable, the settings commit still succeeds and history is skipped with at most one `console.warn` per page load. Missing history service must not put `kdbControl` into lifecycle `error`.

The one-warning guard must live in the kdbControl controller closure or `_KDB.runtime.kdbControl`, never in `_KDB.state.kdbControl`.

The old and new snapshots are captured around the confirmed kdbControl-owned settings transition:

- `old` is the pre-commit target snapshot from `_KDB.state.kdbControl.settings`;
- `new` is the committed target snapshot after validation/normalization;
- the history step is pushed only after the state/effect commit is confirmed.

If a settings apply route is asynchronous, the history step is pushed only after the awaited apply route reports success.

No init, mount sync, DOM-only sync, visual refresh or replay path may push a history step.

---

## 6. Replay Rules

Replay for `kdbControl_settingsChange` applies the target snapshot selected by `historyService`:

- undo passes `step.old`;
- redo passes `step.new`.

The replay apply options are mandatory:

```js
{
  skipHistory: true,
  isHistoryReplay: true,
  forceApply: true,
  direction: "undo" | "redo",
  step: step
}
```

Required behavior:

- `skipHistory: true` prevents a replay from adding a new history stack entry.
- `isHistoryReplay: true` lets kdbControl distinguish replay from user commits.
- `forceApply: true` preserves legacy behavior where replay may re-apply DOM/Cognos/color effects even if the current state already appears equal.
- `forceApply: true` only forces the settings effect/application route; it must not bypass `skipHistory` and must not create a new history step.
- Replay returns a boolean success result to the history handler boundary.
- Malformed target/value payloads return `false` or dispatch a rule-aligned owner error action; they do not throw through the history service boundary.

Replay must return `false` when:

- `target` is not in the tracked target list in §3;
- `value` is missing or malformed for the target;
- `step.old.target` and `step.new.target` do not match;
- the existing settings apply route rejects the value.

Replay must not import or call legacy `__kdbControlSettingsHistoryAdapter.js` directly. Its behavior is ported into kdbControl-owned files.

---

## 7. Dependencies

New dependency:

| Dependency | Use |
|---|---|
| `_KDB.services.history` | Optional named-method service for `pushCommittedStep`; absent service means history is skipped. |

No dependency on `_KDB.history` is allowed.

No direct imports from `core/services/historyService/replay/*` are allowed inside `kdbControl`; the service boundary is `_KDB.services.history` for commits and `_KDB.api.kdbControl.dispatch` for replay.

If the kdbControl replay handler is not registered yet, `pushCommittedStep` may still commit steps, but undo/redo for `kdbControl_settingsChange` will resolve `false` at the `historyService` replay boundary. The CP-2 report must state whether replay is active or commit-only.

---

## 8. Events

This kdbControl tranche emits no new events and subscribes to no new events.

`history:changed` remains owned and emitted by `historyService`. `kdbControl` does not emit it and does not subscribe to it in this tranche.

No `eventSubscribe.md` update is needed for this kdbControl delta unless a later tranche adds a kdbControl-emitted fact-event or a kdbControl subscription.

---

## 9. Cognos / DOM Effects

Replay may re-use existing kdbControl-owned settings apply effects, subject to the already approved settings contract:

- dashboard width / height: may call existing approved canvas/Cognos or canvas-intent route if present in the current implementation contract;
- colors: may apply kdbControl-owned DOM shell effects or state-only defaults as documented in the settings contract;
- settings/SU button visibility toggles: may dispatch existing approved owner intents or apply kdbControl-owned DOM/class effects as documented.

This delta does not authorize new foreign state writes or new Cognos host wrappers. If a replayed target needs an effect whose owner is not already approved, stop and escalate.

---

## 10. Runtime / Cleanup

No new persistent runtime bucket is required for the commit path.

CP-1 recommendation: approve an internal bootstrap/dependency-injection connection for replay handlers. `historyService` may receive an internal `replayHandlers` map during service creation/bootstrap, and the bootstrap glue may provide a `kdbControl_settingsChange` handler that delegates to `_KDB.api.kdbControl.dispatch({ type: "kdbControl/replaySettings", ... })`.

This delta does not authorize a public `_KDB.services.history.registerHistoryHandler` method. If replay-handler registration cannot be achieved through approved internal bootstrap/dependency injection, implementation must stop before claiming undo/redo replay support and report commit-only behavior.

If implementation registers a replay handler through approved internal dependency injection or bootstrap glue, any handle/registration cleanup must live under the owning runtime bucket and be removed on owner destroy:

- kdbControl-owned replay registration handle: `_KDB.runtime.kdbControl.subscriptions` or another standard bucket only if the chosen mechanism creates a cleanup handle;
- historyService-owned internal replay handler registry remains internal to `historyService` and must not be exposed as a public registration API.

Do not introduce ad hoc runtime buckets. If a new bucket seems necessary, stop and escalate.

---

## 11. Folder / File Placement

Implementation should prefer focused files under existing kdbControl ownership folders:

```txt
KDB3/js/dashboard/canvas/kdbControl/
  history/
    buildControlSettingsHistoryStep.js
    isHistoryTrackedSettingsTarget.js
    applyControlSettingsHistoryReplay.js
```

Alternative placement under `settings/` is acceptable only if the execution spec shows that the files are tightly bound to the current settings subsystem and do not create vague helper folders.

File placement rules:

- `history/` is allowed because the responsibility is specific: kdbControl-owned history step construction and replay boundary.
- Do not place these files under `core/services/historyService/`.
- Do not place them under vague folders such as `helpers`, `shared`, `manager`, or `common`.

---

## 12. Out of Scope

- Migrating global history controls UI.
- Registering `historyService` in bootstrap, unless a separate bootstrap tranche has already done so.
- Adding `_KDB.history` compatibility.
- Adding public methods to `_KDB.api.kdbControl`.
- Adding public registration methods to `_KDB.services.history`.
- Porting filters/widgets/tabs/header/footer replay.
- Adding new history-tracked settings targets beyond legacy list.
- Changing history stack limit or history service behavior.
- Browser harness or `TEST/` sandbox work unless a separate execution spec explicitly asks for it.

---

## 13. Impact on `kdbControl.md`

This delta refines the main contract as follows:

| `kdbControl.md` section | Impact |
|---|---|
| §4 Public API | Adds `kdbControl/replaySettings` as a dispatch action; no new public method. |
| §5 Readers / writers | Settings commit path may build serializable history steps after confirmed owner writes; no foreign state writes. |
| §6 Events | No kdbControl events added; `history:changed` remains owned by `historyService`. |
| §7 Dependencies | Adds optional `_KDB.services.history` dependency for commits. |
| §8 Cognos touchpoints | Replay may re-use existing approved settings effects only; no new host wrappers. |
| §9 Folder layout | Allows a focused `history/` folder for kdbControl-owned step/replay files. |
| §10 Out of scope | History commits/replay for the listed settings targets are now in scope for this tranche; historyControls UI and other feature replay remain out of scope. |
| `historyService.md` replay boundary | Requires internal bootstrap/dependency-injection wiring for the `kdbControl_settingsChange` handler; no public registration API. |

---

## 14. CP-1 Questions

1. Approve `kdbControl/replaySettings` as a dispatch action on the existing `_KDB.api.kdbControl` surface?
2. Approve focused `kdbControl/history/` folder for step/replay files, or require placement under `settings/`?
3. Confirm that only the legacy tracked targets in §3 are in scope.
4. Confirm that missing `_KDB.services.history` skips history with one warning and does not fail the settings commit.
5. Approve the replay-handler connection mechanism:
   - **A / recommended:** `historyService` receives an internal `replayHandlers` map during service creation/bootstrap.
   - **B / equivalent if bootstrap owns the glue:** `kdbControl` contributes a `kdbControl_settingsChange` handler through approved internal bootstrap glue.
   - **C / fallback:** replay integration is deferred, and this tranche implements commit-only history steps.

---

## 15. Approval

| Datum | Actor | Note |
|------|-------|------|
| `<pending>` | `<pending CP-1>` | Draft delta awaiting review and approval. |
