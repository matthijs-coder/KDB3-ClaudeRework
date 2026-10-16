# Contract Delta: tabs add at max visible (WP8)

> Toolbox “Tab hinzufügen” when no hidden user tab remains. Same toast as duplicate-at-max. Do not dispatch `tabs/add`.

---

**Status:** `Approved` — PO vastenburg 2026-09-07. Proposal series locked. Spec: `contracts/tabs-add-max-visible-toast-execution-spec.md`. Cognos green 2026-09-07.  
**Type:** `feature-module contract delta`  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (**8** `[x]`, Cognos green 2026-09-07)  
**Naslag:** `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` §8  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-07  
**Parents:** `contracts/tabs.md`, `contracts/kdbControl-tabsCrud-contractdelta.md`, `contracts/messageService.md`

---

## 1. Purpose

Duplicate already toasts `TAB_DUPLICATE_MAX_VISIBLE_TEXT`. Add at max used to dispatch and fail with an English diagnostic and no UI. Shipped: toolbox consults `canAdd` on click and `notify`s instead.

---

## TODO — Proposal series (**locked** 2026-09-07)

Army: live facts + proposal series + second-pass (click path, helper home, MUST/parents). **KEEP** all three. PO: “if recommendation holds, go.”

| # | Question | Locked |
|---|---|---|
| 1 | Disable/hide vs click-to-toast | **Keep clickable.** Consult `canAdd` on click. Do **not** disable/hide in `syncFrameworkTabEditUi.js` or `fillToolboxTabs.js`. Native `disabled` / hide fails acceptance 1. Visual dim is out of WP8. |
| 2 | File split (binder is **148**, AMD 0) | New `kdbControl/framework/dispatchToolboxTabsAdd.js`. Extract **whole** `onTabsAddClick`. Do **not** grow the binder past 150. Do **not** overflow-split comments/radio clusters. Rejected candidate: `tabs/effects/confirmAndDispatchTabAdd.js`. |
| 3 | kdbControl → `tabs/effects/*` vs API-only | **API-only.** `_KDB.api.tabs.getState()` / `dispatch` + `_KDB.services.message.notify`. No AMD into `tabs/effects/*`, `tabs/config/*`, or `readTabsForKdbControl`. No 5th `createTabsController` method. `bindFrameworkView.js` stays AMD 7. |

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | User copy = **same sentence** as `TAB_DUPLICATE_MAX_VISIBLE_TEXT`: `Maximale Anzahl an Registerkarten erreicht.` Do **not** revive hardcoded “5”. Count remains `readTabsForKdbControl` / `state.limits`. (`MAX_USER_TABS: 5` and toolbox “Tab 5” radios are **not** toast copy.) |
| 2 | Before `tabs/add`: if a **live** `getState()` snapshot has `canAdd !== true`, `notify({ severity: "warning", message, code: "TABS_MAX_VISIBLE" })`. **No** dispatch. Duplicate notifies **after** `tabs/duplicate`; add **pre-checks** so the reducer never sees a doomed add from this button. Glass `notify` ignores `code`; still pass `code` (duplicate clone + shared vocab). Do not switch to `notifyAnchored`. |
| 3 | Toolbox **must consult `canAdd` on click** in `dispatchToolboxTabsAdd.js`. Fill stays one-shot and always creates the button. Sync file does **not** touch add. |
| 4 | Fail-closed if `typeof notify !== "function"`: no dispatch; `console.warn`. Guard is on **`notify`**, not `confirm`. |
| 5 | Do not add `message.confirm` on add. |
| 6 | Delete / duplicate / move unchanged. Do not reuse `warnSettingsMessage.js`. |
| 7 | Reducer `TABS_NO_HIDDEN_TAB` / `"No hidden user tab is available."` stays an English diagnostic. **Not** user copy. **Not** `TABS_MAX_VISIBLE`. Do not `notify` from `reduceTabsAction.js`. Do not change `dispatchTabsAction.js` (it may still commit a doomed add if something else dispatches). |
| 8 | Missing tabs API, missing `getState`, or disposed snapshot (`undefined`): **no** max-visible toast, **no** dispatch, `console.warn`. Toast only when a real snapshot has `canAdd !== true`. Do not treat “no snapshot” as the max-visible user message. |
| 9 | German string in the helper is a **cloned literal** (MUST: kdbControl must not import `tabs/config/defaults.js`). Duplicate keeps `TAB_DUPLICATE_MAX_VISIBLE_TEXT` as its SSOT. No new `labels.de.*` merge in WP8. No hardcoded `5` in the clone. |

---

## 3. Locked files

| Path | Change |
|---|---|
| `KDB3/js/dashboard/canvas/kdbControl/framework/dispatchToolboxTabsAdd.js` | **New.** AMD 0. `"use strict"`. **Single exported function** (same shape as `confirmAndDispatchTabDuplicate.js`), not a second `__controller` and not a second listener. try/catch **here**, not in the binder trampoline. `_` on boundary params. `_KDB` passed in (binder closure `kdbForToolboxPlaceholders`), not from the event. Call `getState()` **at click**. Decision tree (do **not** use `(snapshot && snapshot.canAdd) !== true` — that toasts on `undefined` and violates lock 8): **(1)** no tabs API / `getState` not a function / snapshot `undefined` → lock 8 warn, return; **(2)** `typeof notify !== "function"` → lock 4 warn, return; **(3)** snapshot object and `canAdd !== true` → lock 2 `notify({ severity: "warning", message: <clone>, code: "TABS_MAX_VISIBLE" })` (`"TABS_MAX_VISIBLE"` is the live `_codes.MAX_VISIBLE` string; clone the literal, do not import `mutationCodes.js`), return; **(4)** else `tabs.dispatch({ type: "tabs/add", payload: { source: "kdbControl" } })`. On path (4), if `dispatch` is missing: the live once-warn (`_KDB.api.tabs.dispatch is missing; toolbox tab placeholder actions are ignored.`) must still fire once — local guard in this helper. Do **not** emit that warn on paths 1–3. One-line comment on the German clone: MUST exception (no `tabs/config` import; no `labels.de.*` merge this WP). |
| `KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkToolboxPlaceholderApis.js` | AMD 0→1 (`./dispatchToolboxTabsAdd`). Thin trampoline only: `BUTTON` + `data-kdb-action="tabs.add"` + `_KDB` from closure → helper. Stay ≤150 (148 today; no try/catch in the trampoline). Helper owns the add dispatch (bypasses `safeTabsDispatch` for this click). |

**Must not:** `tabs/effects/confirmAndDispatchTabAdd.js`; any kdbControl AMD of `dashboard/tabs/**`; `syncFrameworkTabEditUi.js`; `fillToolboxTabs.js`; `reduceTabsAction.js`; `dispatchTabsAction.js`; `createTabsController.js`; `KDB.js`; `tabEditIconActions.js`; `confirmAndDispatchTabDuplicate.js`; `warnSettingsMessage.js`; `bindFrameworkView.js`; physical Cognos tabs; pending-`tabMutation` CONFLICT guard (pre-existing saga hole, not WP8).

---

## 4. Out of scope

- Changing max visible count.  
- Duplicate confirm copy.  
- `tabs/add` semantics (still reveal hidden user tab).  
- New events / new `_KDB` namespace.  
- Disable / hide / `aria-disabled` / grab-cursor restyle at max.  
- New labels merge or published tabs copy constant.

---

## 5. Acceptance

1. All user tabs visible → add click → toast; visible count unchanged; **no** `tabs/add`.  
2. A hidden user tab exists → add works as today; no this toast.  
3. Duplicate at max still uses the **same** sentence.  
4. Copy never contains a literal `5`.  
5. Missing `notify` → no dispatch, `console.warn`.  
6. Missing/disposed `getState` → no dispatch, `console.warn`, **no** this toast.

---

## 6. Parent one-liners (after dual review + JS, not before)

- `tabs.md` `tabs/add`: kdbControl consults `getState().canAdd` on add click; false → `message.notify`, no dispatch.  
- `kdbControl-tabsCrud-contractdelta.md`: add max-visible uses the same notify copy as duplicate.

---

## 7. Open questions

None. Mechanism locked. Shipped. Cognos green 2026-09-07.

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-07 | Draft | coordinator | Wave 1 WP8. |
| 2026-09-07 | Draft (patched) | review captain | Extract `confirmAndDispatchTabAdd.js`. `canAdd` unused live. Fill is one-shot; sync UI must consult. Fail-closed on `notify`. |
| 2026-09-07 | Draft (dual-review NIT) | review captain | Live facts SOUND. Dropped §7 Q2–Q4 (already locks). Keep Q1 only. |
| 2026-09-07 | Draft | review captain | PO: proposal series TODO; mechanism not locked. |
| 2026-09-07 | Draft (mechanism locked) | WP8 captain | Series KEEP; second-pass KEEP-A/B + KEEP-RECOMMENDATION. Helper `dispatchToolboxTabsAdd.js`. Clickable. API-only. Copy clone. Waiting Approved. |
| 2026-09-07 | Draft (NIT patch) | WP8 captain | Dual-review B: APPROVE yes. Decision tree 1–4; single exported function; missing-`dispatch` once-warn only on success path. |
| 2026-09-07 | Draft (NIT patch) | WP8 captain | Dual-review A: APPROVE yes. try/catch in helper; `TABS_MAX_VISIBLE` literal; clone comment. Waiting PO Approved. |
| 2026-09-07 | **Approved** | PO vastenburg | Mechanism locked. Spec then JS. |
| 2026-09-07 | Cognos green | PO vastenburg | Dual-review APPROVE. Parent one-liners written. PROGRAM **8** ticked. |
