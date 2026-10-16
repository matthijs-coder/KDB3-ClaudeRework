# Contract Delta: `widgetBase` Lazy Launchpad Routing Per Tab

> Delta on top of `contracts/widgetBase.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved (PO vastenburg), 2026-07-11 — implemented same day`
**Parent contract:** `contracts/widgetBase.md`
**Depends on:** `contracts/_archive/tabs-activationEvent-contractdelta.md` (`tabs:changed`)
**Consumed by:** `writebackSet` restore orchestration (`contracts/writeback.md` §6.4/§6.6)
**Type:** `feature module contract delta`
**Authoring AI:** Fable 5, 2026-07-11
**Reviewed by:** `<pending>`

---

## 1. Purpose

Legacy iterated all tabs at dashboard start and parked every canvas widget at the "hide spot", making all widgets reachable. KDB3 only routes the startup tab (`mountStartup.js` dispatches `ROUTE_ALL_TO_LAUNCHPAD` with `tabId: null` against the initially rendered tab). Cognos lazy-loads other tabs, so their pre-existing canvas widgets are never routed to the launchpad.

This delta adds an **idempotent, tab-scoped, coalesced "ensure routed"** capability that runs on a tab's first activation — regardless of whether that activation came from a user click, a tabs traverse, or a writeback restore. Idempotency (not source-branching) is the concurrency model: double triggers are harmless no-ops.

## 2. New Dispatch: `widgetBase/ensureTabWidgetsRouted`

```js
_KDB.api.widgetBase.dispatch({
  type: "widgetBase/ensureTabWidgetsRouted",
  payload: {
    tabId: string,          // runtime Cognos tabId of the (now active) tab
    reason: string,         // "tabActivated" | "writebackSet" | "api" — diagnostic only
    runId?: number          // present only when called from writebackSet
  }
})
```

Return shape (extends `normalizeDispatchResult` conventions):

```js
Promise<{
  ok: boolean,
  alreadyRouted: boolean,   // true when the tab was previously ensured and this call no-oped
  routed: number,
  skipped: number,
  failed: number,
  errorCode: string | null
}>
```

## 3. Semantics

1. **Tab-scoped:** internally reuses the existing `ROUTE_ALL_TO_LAUNCHPAD` path with `payload.tabId` set, so `discoverCanvasWidgets` only sees the activated tab's canvas. Scoping is DOM containment against the tab container element (`id === tabId`, same relation as `kdbControl-tabFollow-contractdelta.md` §2): an item is excluded only on positive evidence — both the tab container and the widget shell resolve and the shell is outside the container. Unresolvable elements never exclude (bugfix sync 2026-07-12: discovery previously applied the target-tab fallback without any exclusion, so a tab's first activation could park widgets of other tabs; id-namespace equality checks against Cognos layout ids proved unreliable and are not used).
1a. **Ownership guard:** widgets that `widgetBase` state already tracks (any `placement`, e.g. `onCanvas` or parked on the launchpad) are never routed by this path — they are not "pre-existing Cognos widgets" (§1). Discovery reports them as skipped with `WIDGET_BASE_WIDGET_ALREADY_OWNED` (bugfix sync 2026-07-12).
2. **Idempotent:** `_KDB.runtime.widgetBase.routedTabIds` (a set of tabIds) records tabs that completed a successful ensure. A repeated call for a routed tab resolves `{ ok: true, alreadyRouted: true, routed: 0 }` without touching DOM. The startup tab is seeded into `routedTabIds` when the mount-time `routeAllToLaunchpad` succeeds.
3. **Coalesced:** `_KDB.runtime.widgetBase.pendingRouteByTabId[tabId]` holds the in-flight promise; concurrent calls for the same tab await the same promise instead of double-routing.
4. **Empty-snapshot rule:** discovering zero canvas widgets marks the tab as routed **only after** `waitForTransferReady` confirmed canvas transfer readiness for that tab. A discovery that runs before Cognos finished rendering the lazily loaded tab must not poison `routedTabIds`; the existing transfer-ready wait plus the tabs-side activation delay (canvasReady semantics from `tabs-parameterSetRestore-contractdelta.md` D3) are the accepted readiness signal for tranche 2.
4a. **Lazy-render race (bugfix sync 2026-07-12, perf sync same day):** the canvas model can already list a tab's widgets while their shells are not in the DOM yet. Tab-scoped discovery therefore waits for the target tab container element and for **DOM presence** of the shells of model-known widgets without a resolvable shell — not for full widget render readiness; that wait stays per widget in `handleRouteToLaunchpad`. The shell wait (100ms poll) exits on full presence **or** on quiescence — no new shell appeared for ~400ms (shell insertion is a single burst once the page rendered; unattributable widgets of never-rendered tabs must not force the cap) — with ~2s as hard cap. Shell-less widgets whose model container resolution matches another tab's `tabId`/`pageId` (tabs `tabTargets` aliases) are excluded from the wait **and** from the scoped discovery pass: they never render during this activation, would otherwise always burn the full timeout, and would keep the tab permanently unroutable via `missingShells`. The exclusion requires a positive alias match — an unmatched or unresolvable id means the widget is waited on and diagnosed honestly. A routing pass that still ends with missing shells (`WIDGET_BASE_WIDGET_ID_MISSING` skips, surfaced as `missingShells`) must **not** mark the tab routed — it stays retryable on the next activation.
5. **Failure:** a failed ensure does **not** mark the tab routed; the next activation retries. `errorCode` follows existing `WIDGET_BASE_*` codes.
6. Routed widgets go through the normal `handleRouteToLaunchpad` path (history-less: `isHistoryReplay: false`, `reason` forwarded); no new launchpad semantics.

## 4. Subscription: `tabs:changed`

`widgetBase` subscribes to `tabs:changed` (catalog: `architecture/eventSubscribe.md`):

- handler dispatches `ensureTabWidgetsRouted` on **every** activation with a non-null `payload.tabId` (bugfix sync 2026-07-12: the original `firstActivation === true` filter made §3.5's "next activation retries" unreachable — a raced first ensure could never be retried; idempotency via `routedTabIds` plus the startup-tab seed keep repeated activations a cheap no-op);
- fire-and-forget from the handler's perspective (errors logged, never thrown into the event bus);
- subscription handle under `_KDB.runtime.widgetBase.subscriptions.tabsChanged`, cleared in `destroy`.

There is **no writeback suppression flag**: if writeback activates a tab and the event handler races the orchestrator's explicit ensure call, both hit the same coalesced promise (§3.3) or the idempotency set (§3.2).

## 5. Writeback Restore Integration

Per amended `writeback.md` §6.4 step 23 / §6.6: after `writebackSet` activates a tab target (visible or hidden), it must `await _KDB.api.widgetBase.dispatch({ type: "widgetBase/ensureTabWidgetsRouted", payload: { tabId, reason: "writebackSet", runId } })` **before** dispatching `widgetBase/parameterSetRestoreRequested` for widgets on that tab. This guarantees pre-restore widgets on lazily loaded tabs are parked on the launchpad and claimable, matching the legacy park-then-restore order (`parkWidgetsForParameterSet` covers only already-discovered tabs).

Stale-guard: when `runId` is present and stale per widgetBase's `parameterSetRunId` convention (runtime key `_KDB.runtime.widgetBase.parameterSetRunId`, written only by `widgetBase/parameterSetResetRequested`; `parameterSetRestoreRunId` is the writeback-runtime counter feeding the same number space), the call resolves `{ ok: false, errorCode: "WRITEBACK_RESTORE_CANCELLED" }` without side effects; event-driven calls (no `runId`) are never stale-cancelled.

## 6. Explicitly Out Of Scope

- No startup all-tab iteration is reintroduced.
- No changes to drop/claim/transfer semantics or history behavior.
- kdbControl movement is a separate delta (`kdbControl-tabFollow-contractdelta.md`).

## 7. Acceptance

1. First manual activation of a lazily loaded tab with pre-existing canvas widgets routes them all to the launchpad exactly once; second activation no-ops (`alreadyRouted: true`).
2. Concurrent ensure calls for the same tab produce one routing pass (coalescing observable via a single set of `handleRouteToLaunchpad` dispatches).
3. A tab whose ensure failed is retried on next activation.
4. During `writebackSet.restore`, hidden-tab widgets saved in v3 are claimable after step 23 without manual pre-clicking of tabs.
5. `destroy` clears `subscriptions.tabsChanged`, `routedTabIds`, `pendingRouteByTabId`.
