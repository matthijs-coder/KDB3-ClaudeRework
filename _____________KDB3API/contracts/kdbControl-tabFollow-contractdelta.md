# Contract Delta: `kdbControl` Tab-Follow

> Delta on top of `contracts/kdbControl.md`.

---

**Status:** `Approved (PO vastenburg), 2026-07-11 — implemented same day; CP-1 host-move redesign approved and implemented 2026-07-11 (PO)`
**Parent contract:** `contracts/kdbControl.md`
**Depends on:** `contracts/_archive/tabs-activationEvent-contractdelta.md` (`tabs:changed`); click-ahead 2026-09-04: `contracts/_archive/tabs-kdbControl-clickAhead-follow-contractdelta.md` (`tabs:activationStarted`)
**Type:** `feature module contract delta`
**Authoring AI:** Fable 5, 2026-07-11
**Reviewed by:** `<pending>`

---

## 1. Purpose

The kdb-control shell is placed once at mount inside the `.KDB3Widget` host element (`dashboard/canvas/kdbControl/framework/index.js` (`placeControlShell`)), which lives in the initially rendered tab's page/dropbox. When the user activates another tab, the control stays behind in the previous tab's (now hidden) container. The control must follow the active tab.

## 2. Behavior (CP-1, 2026-07-11)

> **CP-1 supersedes the original per-shell resolution:** instead of moving only the control shell into a per-tab `kdbWidget` match (which exists only in the first tab and therefore never resolved on other tabs), kdbControl moves the **entire `.KDB3Widget` host element** into the active tab's page/dropbox. The shell, its domRefs and the launchpad (also mounted in the host) all move along; `dashboard/canvas/kdbControl/framework/index.js` (`placeControlShell`) stays untouched.

`kdbControl` subscribes to `tabs:activationStarted` (click-ahead, same tick as the user click) **and** `tabs:changed` (`framework/followActiveTab.js`). Same move handler; `firstActivation` remains irrelevant. Click-ahead details: `contracts/_archive/tabs-kdbControl-clickAhead-follow-contractdelta.md`.

On `tabs:changed` (and on `tabs:activationStarted`):

- on every activation change (`firstActivation` irrelevant), resolve the active tab's **page element by id**: the event payload carries `pageId` (`_KDB.state.tabs.byIndex[*].pageId`), and the tab's page/dropbox element is `document.getElementById(pageId)` — a direct child of the tab container (`id === tabId`);
- **except during mechanical traversals** (bugfix sync 2026-07-13): while `_KDB.runtime.tabs.pendingPromises.traverse` or `.startup` is set, activation events are ignored — chasing every traverse click is useless DOM churn and stranded the host on an intermediate tab. The tabs owner emits one final `tabs:changed` for the landing tab after the post-restore traverse (`tabs-parameterSetRestore-contractdelta.md` §6), which performs the single host move;
- resolve the `.KDB3Widget` host document-wide (`_KDB.elements.selectors.root.kdbWidget`; the node exists exactly once, fallback `_KDB.elements.kdbWidget`);
- if `host.parentNode !== pageEl`, re-parent via `pageEl.appendChild(host)` — same node moved, never recreated, so shell wiring, domRefs and launchpad state survive unchanged;
- if the page element or host cannot be resolved (Cognos still lazy-rendering), retry every 400ms up to 10 times (~4s; `runtime.kdbControl.timers.tabFollowRetry`, one pending timer, a newer activation cancels it) — bugfix sync 2026-07-12: the original single retry was regularly beaten by first-activation lazy rendering, leaving the control behind until the second activation; final failure logs a warning and leaves the host in place — never throw into the event bus;
- events without a usable `pageId` (e.g. non-dashboard tabs) are ignored;
- subscription handles under `_KDB.runtime.kdbControl.subscriptions.tabsChanged` and `.tabsActivationStarted` (each wrapper clears the retry timer before unsubscribing), cleared in `destroy()`.

## 3. Design Notes

- `pageId` is the project-canonical key for the tab's dropbox (drag-drop binding reads the same parent/child relation in `bindDropboxes.js`); no Cognos DOM heuristics or `readCurrentTab` verification needed.
- Moving the whole host intentionally moves the **launchpad** with the control, so parked widgets are reachable on every tab (legacy-equivalent behavior).
- Related: dragDrop rebinds dropboxes on every `tabs:changed` activation (bounded repair poll) so lazily rendered pages get `kdb_dropbox="true"` / listeners (`dashboard/canvas/dragDrop/dropboxes/rebind.js` (`subscribeTabsChangedRebind`), catalog entry `tabs:changed`).

## 4. Interaction Rules

- Moving the host must not commit any `kdbControl` state; this is a pure DOM-placement effect.
- An open settings panel / edit interaction may lose focus on move (browser `appendChild` semantics); acceptable for this tranche, no focus-restore requirement.
- Order relative to widget routing is unconstrained: host move, dragDrop rebind and `widgetBase` ensure-routing are independent subscribers of the same event.

## 5. Acceptance

1. Activating another tab (manual click, traverse, or writeback) moves the `.KDB3Widget` host into that tab's page/dropbox; control and launchpad are visible and functional there.
2. Returning to the previous tab moves it back; no duplicate hosts or shells ever exist (same node moved).
3. Toolbox/metrics/settings wiring keeps working after ≥3 consecutive moves (nothing is rebuilt).
4. `destroy()` clears `subscriptions.tabsChanged`, `subscriptions.tabsActivationStarted`, and the pending retry timer.
5. A revisit of an already-opened tab shows the host in the destination page without waiting for `aria-selected` (click-ahead). First lazy render may still use the 400ms retry.
