# Contract Delta: `kdbControl` / tabs edit-UI for Tab-CRUD

> Delta on top of `contracts/kdbControl.md` and `contracts/_archive/tabs-edit-ui-contractdelta.md`, downstream of `contracts/_archive/tabs-tabCrud-contractdelta.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved — PO 2026-08-10; messageService integration replaces the native-confirm placeholder (updated 2026-07-15)`
**Parent contracts:** `contracts/kdbControl.md`, `contracts/_archive/tabs-edit-ui-contractdelta.md`
**Depends on:** `tabs-tabCrud-contractdelta.md` (§1 D-CRUD-2/4/6, §2.4 MutationResult, §8 error codes), `contracts/messageService.md` (Approved 2026-07-15; `confirm`/`choose`/`notify`/`showAlert`)
**Type:** `feature module contract delta`
**Authoring AI:** Fable 5, 2026-07-14 (messageService sync 2026-07-15)
**Reviewed by:** writeback function planner 2026-07-15 (cross-review A–E pass over the tab-CRUD document set); PO vastenburg 2026-08-10.

---

## 1. Purpose & Ownership

Two UI surfaces expose tab-CRUD; both are *dispatch-only* — all domain logic lives in the tabs saga:

1. **Tab edit icons** (delete / duplicate / move) — rendered by the **tabs owner** itself (`dashboard/tabs/editUi/icons.js` (`renderTabEditIcons`)) onto the tab buttons during an edit session. Today all three are `aria-disabled="true"` with a console-log click stub (`onDeferredIconClick`).
2. **kdbControl toolbox** — hosts the edit-target radios and the `tabs.add` button (`kdbControl/panel/bindToolboxActions.js`). Radios still dispatch `tabs/selectEditTarget` via `safeTabsDispatch`. Add click goes through `dispatchToolboxTabsAdd.js` (consult `getState().canAdd`; false → `_KDB.services.message.notify` same copy as duplicate, no `tabs/add`). Delete / duplicate / move stay on the **tabs-owned** edit icons, not the toolbox.

Ownership stays as-is: the icons remain tabs-owned DOM/effects; kdbControl remains the host shell and dispatch relay. This delta does **not** move the icons into kdbControl.

## 2. Enablement Rule (per D-CRUD-2 build order)

An icon flips from deferred to enabled **only when its operation is end-to-end available** (saga + all owner dispatches shipped and smoketested). Concretely per tranche:

| Tranche | Icon enabled | Dispatch on click |
|---|---|---|
| 1 | delete | `{ type: "tabs/delete", payload: { tabIndex, tabId, source: "tabsEditUi" } }` |
| 2 | move | `{ type: "tabs/move", payload: { tabIndex, tabId, targetPosition, source: "tabsEditUi" } }` |
| 3 | duplicate | `{ type: "tabs/duplicate", payload: { tabIndex, tabId, source: "tabsEditUi" } }` |

Not-yet-shipped icons keep the current deferred behavior (`aria-disabled`, log-only stub) — no hidden icons, no dead buttons that look alive. Mechanism (2026-07-15): enablement is gated per operation on an explicit config flag in the tabs owner (`TAB_DELETE_UI_ENABLED`, Wave 1: `false`; flipped to `true` 2026-08-12 after the tranche-1 Cognos smoketests passed), flipped only when the operation's end-to-end smoketests pass — code being deployed does not by itself enable the icon.

## 3. Interaction Semantics

- **Delete (tranche 1, no undo per D-CRUD-2):** click awaits `_KDB.services.message.confirm({ title, message })` — legacy copy: title `"Diese Registerkarte löschen?"`, message `"Der gesamte Inhalt dieser Registerkarte wird ebenfalls gelöscht."`, button labels are the service defaults (`Ja`/`Nein`). The handler dispatches `tabs/delete` **only** on `{ confirmed: true }`; every other result (`cancelled`, `dismissed`, `unavailable`, `destroyed`) is a no-op. Fail closed: when `_KDB.services.message` is missing or disposed, nothing is deleted (no native-`confirm` fallback — decided with the messageService approval 2026-07-15, superseding the earlier placeholder note).
- **Move (tranche 2):** the reorder UI translates to `tabs/move` (D-CRUD-4). Target-position choice uses `_KDB.services.message.choose` with **tabs-owned opaque position ids and labels** (messageService Q10) — the service renders and returns the choice, tabs computes the positions; specified in the tranche-2 execution spec. `_tabNumber` shown to the user is the logical 1-based position, never the array index (parent CRUD §4). **As-built 2026-08-12:** tranche-2 move choose-flow implemented (`confirmAndDispatchTabMove.js`, `message.choose` with 1-based position labels excluding current); icon click-handlers extracted to `tabEditIconActions.js`. `TAB_MOVE_UI_ENABLED` flipped to `true` 2026-08-12 after the Cognos smoketests passed.
- **Duplicate (tranche 3):** PO decision **D-DUP-confirm (2026-08-12):** `message.confirm` before dispatch — title `"Diese Registerkarte duplizieren?"` (legacy parity), fail-closed when service unavailable (`confirmAndDispatchTabDuplicate.js`); surfaces `TABS_MAX_VISIBLE`, conflict, degraded (`TAB_MUTATION_DEGRADED_TEXT`), and failure (`TAB_DUPLICATE_FAILED_TITLE`). `TAB_DUPLICATE_UI_ENABLED` flipped to `true` 2026-08-14 after Cognos smoketests passed. A `MutationResult.outcome === "degraded"` must be surfaced via `notify`/`showAlert`, not swallowed.
- **Add at max visible (WP8, 2026-09-07):** toolbox "Tab hinzufügen" stays clickable. kdbControl consults `getState().canAdd` on click (`dispatchToolboxTabsAdd.js`); false → `_KDB.services.message.notify` with the same copy as duplicate (`TAB_DUPLICATE_MAX_VISIBLE_TEXT`: `Maximale Anzahl an Registerkarten erreicht.`), no `tabs/add`. Cognos green 2026-09-07.
- All dispatches are fire-and-await: the click handler awaits the MutationResult and surfaces `ok: false` outcomes via `_KDB.services.message` (`TABS_MIN_VISIBLE`, `TABS_MUTATION_CONFLICT` → `notify` with severity `"warning"`; structural failures → `showAlert` with severity `"error"`). Conflict while another mutation runs → no-op with feedback, not a queue. Diagnostic-to-copy mapping is consumer-owned (messageService §1): the German texts live on the tabs/kdbControl side. Any copy that mentions a tab count derives it from the dashboard-role entries in `KDB3/js/core/config/dashboardSettings.js` (`tabs`, via `state.limits`) — never a hardcoded "5".
- During an in-flight mutation (`_KDB.runtime.tabs.pendingPromises.tabMutation`) the icons render disabled; the final `tabs:changed` (`source: "tabsMutation"`) re-syncs the toolbox view through the existing `syncFrameworkViewFromState` path — no new events, no new subscribers beyond what `followActiveTab.js` already needs (its suppression predicate gains `tabMutation`, see parent §3.5).
- **As-built 2026-08-13:** switching kdbControl edit-target radio commits the outgoing inline rename session (existing empty/unchanged/changed rules) before starting rename on the newly selected tab or leaving edit.

## 4. Acceptance

1. Tranche-1 build: delete icon live with awaited `message.confirm` (Ja/Nein, legacy copy); duplicate/move still visibly deferred.
2. Cancel/dismiss/unavailable/destroyed confirm results delete nothing; missing or disposed messageService deletes nothing (fail closed).
3. Clicking delete on the last visible tab surfaces `TABS_MIN_VISIBLE` via `message.notify`; nothing mutates. Count-bearing copy reflects the configured dashboard-tab count, not a literal "5".
4. A second click during a running mutation produces conflict feedback via `message.notify`, never a queued second saga.
5. After the final `tabs:changed`, toolbox radios/edit area reflect the new tab set without a manual refresh.
