# header + footer — history replay bootstrap glue (CP-1 contractdelta)

**Status:** Draft for CP-1 review.  
**Datum:** 2026-05-21  
**Relatie:** verfijnt `historyService-kdbControl-replay-bootstrap-contractdelta.md`, `header-history-contractdelta.md`, `footer-history-contractdelta.md`, en core bootstrap/service wiring in `KDB3/js/core/services/collectReplayHandlers.js`.

---

## 1. Purpose

Deze delta breidt de bestaande Strategy A late-bind replay bootstrap uit van alleen `kdbControl_settingsChange` naar owner contributions van `header` en `footer`.

Doel:

- `historyService` blijft generiek en vroeg geregistreerd.
- Header/footer stage owner-owned replay handler contributions tijdens `mount()`, nadat hun runtime buckets bestaan.
- Core bootstrap verzamelt staged contributions en late-bind ze via de bestaande bootstrap-private historyService bind route.
- Er komt geen public `registerHistoryHandler` API en geen legacy `_KDB.history` alias.

---

## 2. Ownership And Boundaries

| Concern | Owner |
|---|---|
| `_KDB.state.history` | `historyService`. |
| `_KDB.state.header` | `header`. |
| `_KDB.state.footer` | `footer`. |
| Header replay-handler contribution staging | `header`, after `_KDB.runtime.header` exists. |
| Footer replay-handler contribution staging | `footer`, after `_KDB.runtime.footer` exists. |
| Replay-handler map assembly | core bootstrap/service wiring through `collectReplayHandlers.js`. |
| Replay-handler late binding | `historyService` internal runtime adapter or equivalent orchestrator-private mechanism. |

Bootstrap glue may read these internal staged integration points:

```txt
_KDB.runtime.kdbControl.historyReplayHandlerContribution
_KDB.runtime.header.historyReplayHandlerContribution
_KDB.runtime.footer.historyReplayHandlerContribution
```

No module other than bootstrap/service glue may read or mutate another module's runtime contribution.

`historyService` must not import dashboard modules and must not write header/footer/kdbControl state.

---

## 3. Replay Handler Map

`collectReplayHandlers(_KDB)` should return a map containing each available contribution:

```js
{
  kdbControl_settingsChange: _KDB.runtime.kdbControl.historyReplayHandlerContribution,
  header_chromeChange: _KDB.runtime.header.historyReplayHandlerContribution,
  header_textChange: _KDB.runtime.header.historyReplayHandlerContribution,
  footer_chromeChange: _KDB.runtime.footer.historyReplayHandlerContribution
}
```

Rules:

- Include a key only when the contribution exists and has an `apply` function.
- Header may use one handler object for both `header_chromeChange` and `header_textChange`. That handler **must** branch on `step.key` and/or `step.old.target` / `step.new.target` before delegating to `applyHeaderHistoryReplay` (see `header-history-contractdelta.md` §8).
- Footer uses one handler object for `footer_chromeChange`.
- Missing handlers are allowed; `historyService` resolves undo/redo `false` for missing handlers.

---

## 4. Registration / Bind Order

Required order for active replay:

1. Early service bootstrap registers `historyService` with an empty or partial internal replay handler map.
2. Feature registration creates `_KDB.api.header`, `_KDB.api.footer`, `_KDB.api.kdbControl`.
3. `header.mount()` creates `_KDB.runtime.header` and stages `_KDB.runtime.header.historyReplayHandlerContribution`.
4. `footer.mount()` creates/uses `_KDB.runtime.footer` and stages `_KDB.runtime.footer.historyReplayHandlerContribution`.
5. `kdbControl.mount()` creates `_KDB.runtime.kdbControl` and stages `_KDB.runtime.kdbControl.historyReplayHandlerContribution`.
6. Bootstrap calls `_orchestratorServices(_KDB, { bindHistoryReplayHandlersOnly: true })`.
7. Service glue collects all currently staged handler contributions and late-binds them into the already-registered `historyService`.
8. `historyControls.mount()` uses `_KDB.services.history.undo()` / `redo()` with active owner replay.

Current KDB.js mount order already mounts `header`, `footer`, then `kdbControl` before the bind point. This delta should not require moving the bind point if that order remains.

---

## 5. Files Expected To Change

Expected production files:

```txt
KDB3/js/core/services/collectReplayHandlers.js
KDB3/js/dashboard/header/createHeaderController.js
KDB3/js/dashboard/footer/createFooterController.js
```

Expected new owner folders/files are defined by `header-history-contractdelta.md` and `footer-history-contractdelta.md`, not by this bootstrap delta.

`KDB3/js/KDB.js` should not need a behavior change if the current bind point remains after `header.mount()`, `footer.mount()` and `kdbControl.mount()`. If the implementation discovers otherwise, stop and escalate before editing `KDB.js`.

Do not modify:

```txt
KDB3/js/core/services/historyService/
```

unless the already-approved Strategy A late-bind implementation is missing or broken. This delta extends collected contributions; it does not change the historyService public API.

---

## 6. Runtime / Cleanup

Each owner cleans its own contribution:

| Runtime field | Cleanup owner |
|---|---|
| `_KDB.runtime.header.historyReplayHandlerContribution` | `header.destroy()` |
| `_KDB.runtime.footer.historyReplayHandlerContribution` | `footer.destroy()` |
| `_KDB.runtime.kdbControl.historyReplayHandlerContribution` | `kdbControl.destroy()` |
| `_KDB.runtime.history.adapters.bindReplayHandlers` | `historyService.destroy()` |

If the owner destroy runs before historyService destroy, the staged contribution may be cleared while historyService still has its internal map. This is acceptable during teardown because public service methods have disposed guards and root destroy calls feature destroys before service destroy. Do not add cross-owner cleanup from historyService into header/footer runtime.

---

## 7. kdbControl View Sync

History replay for header/footer must not make kdbControl a state owner.

Acceptable sync mechanisms:

1. Header/footer effects call `runtime.kdbControl.frameworkBindContext.syncView()` after confirmed replay or owner state change.
2. A later kdbControl view-only subscriber to `history:changed` calls `syncView()` and writes no state.

CP-1 recommendation: owner effects trigger `syncView()` in this tranche to keep the implementation local to header/footer replay and avoid adding a kdbControl subscription.

No kdbControl history step may be pushed for:

```txt
header.toggle
header.subtitle.toggle
footer.toggle
header title/subtitle text commits
```

---

## 8. Out Of Scope

- Changing `_KDB.services.history` public API.
- Adding public `_KDB.services.history.registerHistoryHandler`.
- Adding `_KDB.history`.
- Importing header/footer/kdbControl from `historyService`.
- Combined header+footer atomic replay in `historyService`.
- Canvas/filter/widget/tab replay handlers.
- History controls UI.
- Event catalog changes, unless a later implementation adds new events. This delta adds no events.

---

## 9. Acceptance Criteria

1. `collectReplayHandlers()` includes `header_chromeChange` when `_KDB.runtime.header.historyReplayHandlerContribution.apply` exists.
2. `collectReplayHandlers()` includes `header_textChange` when `_KDB.runtime.header.historyReplayHandlerContribution.apply` exists.
3. `collectReplayHandlers()` includes `footer_chromeChange` when `_KDB.runtime.footer.historyReplayHandlerContribution.apply` exists.
4. Existing `kdbControl_settingsChange` collection still works.
5. Header/footer contributions are staged during their owner `mount()` after runtime buckets exist.
6. Header/footer contributions are cleaned by owner `destroy()`.
7. No `historyService` file imports dashboard header/footer/kdbControl files.
8. No public history registration API is introduced.
9. Missing handler behavior remains `undo()` / `redo()` resolves `false`, no throw.
10. kdbControl read UI syncs after owner replay without kdbControl state writes.

---

## 10. CP-1 Questions

1. Approve adding `header_chromeChange`, `header_textChange`, and `footer_chromeChange` to `collectReplayHandlers()`?
2. Approve no KDB.js change if current bind point remains after header/footer/kdbControl mount?
3. Approve owner-effect-triggered kdbControl view sync instead of a kdbControl `history:changed` subscription?
4. Confirm no changes to `historyService` public API in this tranche?

**CP-1 approved defaults (no longer open):** one header handler for both header step keys with mandatory `step.key`/`target` branching; header text may ship in a separate execution tranche from chrome (see `header-history-contractdelta.md` §1.1).

---

## Approval

| Datum | Actor | Note |
|------|-------|------|
| `<pending>` | `<pending CP-1>` | Draft delta awaiting review and approval. |
