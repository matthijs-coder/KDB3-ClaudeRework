# singleSelect popup-ready sync-only contractdelta

**Status:** CP-2 fix accepted  
**Date:** 2026-05-22  
**Relation:** Refines `singleSelect.md`, `singleSelect-port-execution-spec.md`, `filterDock-downstream-handoff-contractdelta.md`, and `filterDock-singleSelect-integration-contractdelta.md`.

---

## 1. Purpose

This delta documents the smoke-fix decision for `singleSelect/filterDockPopupReady`.

`singleSelect/filterDockPopupReady` is a readiness/sync notification only. It must not replay a user command.

## 2. Smoke Finding

The smoke test found an infinite OK-button flicker loop:

1. User clicks OK.
2. `filterDock` dispatches `singleSelect/filterDockStateChanged` with `interactionType: "confirm"`.
3. `singleSelect` starts commit.
4. Commit mutates DOM/classes/footer.
5. `filterDock` observer dispatches `singleSelect/filterDockPopupReady`.
6. `singleSelect` treated popup-ready like a command and ran confirm again.
7. The popup/OK state loop repeated.

## 3. Rule

For `singleSelect/filterDockPopupReady`, `singleSelect` must:

- map the handoff;
- ensure per-filter state;
- restore / hydrate / sync the popup;
- return immediately.

For `singleSelect/filterDockPopupReady`, `singleSelect` must not:

- derive interaction intent;
- apply pending selection;
- commit;
- cancel;
- close the popup;
- click original Cognos buttons;
- perform history or event side effects.

Only `singleSelect/filterDockStateChanged` may execute user commands.

## 4. Applied Hotfix Review

Already-applied production hotfix:

```js
if (options.actionType === "singleSelect/filterDockPopupReady") {
  return;
}
```

Location:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/runSingleSelectInteraction.js
```

Review result:

- Accepted for CP-2 fix scope.
- It runs after `_restorePopupSelection(...)`, so readiness sync still happens.
- It returns before `_deriveInteractionIntent(...)`, so confirm/cancel/option replay is blocked.
- It does not introduce a dock-level listener or observer.
- It does not read `_KDB.runtime.filterDock`.
- `ReadLints` on the touched `singleSelect` / `filterDock` files is clean at review time.

## 5. Follow-up Scope

This delta does not solve visual alignment, checkbox state cleanup, `.KDB_singleSelectFilter` class tagging, or OK/Cancel close integration. Those are covered by:

```txt
_____________KDB3API/contracts/singleSelect-visual-close-fix-spec.md
```

