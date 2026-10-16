# Contract Delta: click-ahead kdbControl tab-follow

> Amends `contracts/tabs-activationEvent-contractdelta.md` and `contracts/kdbControl-tabFollow-contractdelta.md`.
> Restores legacy click-time host move so kdbControl is already in the destination page when Cognos reveals it.

---

**Status:** `Implemented` — plan GO PO vastenburg 2026-09-04; Cognos acceptatie groen (PO, zelfde dag: revisit tab-follow instant)
**Parents:** `contracts/tabs-activationEvent-contractdelta.md`; `contracts/kdbControl-tabFollow-contractdelta.md`
**Also touches:** `architecture/eventSubscribe.md`; `KDB3/js/dashboard/tabs/events/eventNames.js`
**Does not amend:** `contracts/writeback-get-persist-landing-contractdelta.md` (host parent remains `document.getElementById(pageId)`; 400ms × 10 retry budget unchanged)
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6, 2026-09-04
**Related rules:** `events.mdc`, `runtime.mdc`, `naming.mdc`, `feature-structure.mdc`, `dom.mdc`, `cognos-adapter.mdc`

---

## 1. Purpose

On an already-visited tab, kdbControl appears ~1s late because follow waits for Cognos `aria-selected` plus a 120ms trailing debounce, then `appendChild`s the host. Cognos has already hidden the previous page, so the control is gone until chrome catches up.

Legacy (KDB2 / REDESIGN2) reparented the same host on the tab-list **click** (0–50ms), into a page node that already existed. This delta restores that timing without changing ownership, mount target, or GET persist.

## 2. New fact `tabs:activationStarted`

Tabs owns a **capture-phase** `click` listener on the Cognos tab list (selector registry `tabListSelector` / `tabButtonItemSelector`).

Emit **before** Cognos hides the old page, without committing `_KDB.state.tabs` (the observer still owns `tabs/activeTabObserved` + `tabs:changed`).

```js
_KDB.events.emit("tabs:activationStarted", {
  tabIndex: number,
  tabIdx: number | null,
  tabId: string | null,
  pageId: string | null,
  firstActivation: boolean,  // from current state; not a commit
  source: "userClick"        // diagnostic only
});
```

Rules:

- payload JSON-serialisable; no DOM nodes;
- no emit when the clicked item is the already-active tab (`tabIndex === state.activeIndex`);
- no emit without a usable `pageId`;
- no emit when the click is not on a real tab button (`closest(tabButtonItemSelector)`); edit-icon clicks are siblings without that ancestor and are ignored;
- no emit while `_KDB.runtime.tabs.pendingPromises.traverse || .startup || .tabMutation` (same skip as follow);
- listener: `{ capture: true, signal }` on `runtime.tabs.abortControllers.tabListClick`; abort on `tabs.destroy()`;
- constant home: `tabs/events/eventNames.js` `ACTIVATION_STARTED`.

`tabs:changed` semantics are unchanged (confirmation after chrome settle + state commit). widgetBase, dragDrop, footer, GET persist cancel/finish stay on `tabs:changed` only.

## 3. kdbControl follow

`followActiveTab.js` subscribes to **both** `tabs:activationStarted` and `tabs:changed`. Same handler: skip in-flight tabs work; `moveHostToActiveTab(pageId, 0)`.

- Mount target stays `document.getElementById(pageId)` then `pageEl.appendChild(host)`. Not a descendant `.pagegenericPage` unless that node **is** `pageId`. GET persist still checks `host.parentNode === getElementById(pageId)`.
- 400ms × 10 retry unchanged, only when `pageEl` or host is missing.
- Idempotent: a later `tabs:changed` for the same `pageId` is a no-op when the host is already there.
- New subscription slot `_KDB.runtime.kdbControl.subscriptions.tabsActivationStarted`; existing `tabsChanged` slot kept. Both wrappers clear `tabFollowRetry` before unsubscribe.

`placeControlShell.js` stays mount-only. No kdbControl state commit. No Cognos SDK. No follow branch on `source` or `firstActivation`.

## 4. Observer debounce (cheap extra)

`observeActiveTab.js`: 120ms trailing debounce **only** while traverse / startup / tabMutation is in flight (150ms click cadence). User / idle chrome mutations schedule the commit at **0ms** (still coalesced: a newer mutation resets the timer). This does not replace click-ahead.

## 5. Explicitly out of scope

- Host overlay / `position:fixed` / body chrome (would break GET persist).
- Changing the 400ms × 10 retry budget.
- Cloning the host per tab.
- `widgetBase` / `dragDrop` / footer subscribing to `tabs:activationStarted`.
- Startup all-tab iteration.

## 6. Acceptance

1. Revisit of an already-opened dashboard tab shows kdbControl in the same paint as the destination page (legacy-like; no extra ~1s).
2. First lazy open may still overlay + follow retry until the page node exists.
3. Capture click on the active tab, or on a tab-edit icon, does not emit and does not move the host.
4. Mechanical traverse / SET restore / GET persist landing still follow once via the existing final `tabs:changed` (click-ahead suppressed in-flight).
5. One `.KDB3Widget` node; GET persist parent check still `getElementById(pageId)`.
6. `destroy()` aborts `tabListClick` and clears both follow subscriptions + retry timer.
