# Execution Spec: tabs add at max visible (WP8)

> Mechanical spec for Grok 4.6. Architecture lives in `tabs-add-max-visible-toast-contractdelta.md` (**Approved**, PO vastenburg 2026-09-07). Do **not** re-decide clickable vs disable, helper home, API-only vs `tabs/effects`, copy SSOT, or fail-closed on `notify`.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo every row in Section A **before** producing files.

---

**Status:** `Ready for execution` — army spec↔contract **SPEC-OK**; consequences NITs patched (`use strict`, `const`, J6, trampoline no-catch, notify two-check).
**Module / contract:** `contracts/tabs.md` + `contracts/tabs-add-max-visible-toast-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-07
**Executing AI:** grok 4.6 army (W1)
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist (one writer)

### W1 kdbControl toolbox add

**May create:**

- `KDB3/js/dashboard/canvas/kdbControl/framework/dispatchToolboxTabsAdd.js`

**May edit:**

- `KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkToolboxPlaceholderApis.js`

**Must not edit:** everything else. Including: `syncFrameworkTabEditUi.js`, `fillToolboxTabs.js`, `bindFrameworkView.js`, `warnSettingsMessage.js`, `reduceTabsAction.js`, `dispatchTabsAction.js`, `createTabsController.js`, `KDB.js`, `tabEditIconActions.js`, `confirmAndDispatchTabDuplicate.js`, `tabs/config/**`, `tabs/effects/**`, any new `tabs/effects/confirmAndDispatchTabAdd.js`, CSS, labels, parents (`tabs.md` / `kdbControl-tabsCrud-contractdelta.md` — captain writes those one-liners after Cognos green).

### Global must-not (W1)

`.cursor/rules/*.mdc`, `contracts/_archive/**` as live, `contracts/_template.md`, `_executionSpecTemplate.md`, git commit/push, folders `helpers` / `common` / `shared`, leftover `Support`, ES modules in `KDB3/js/**`, `_KDB.cognosAPI` / `__getDashboardAPI`, new cognosHost facet/op, new `messageService` method, `notifyAnchored`, `message.confirm` on add, `disabled` / `hidden` / `aria-disabled` on the add button, pending-`tabMutation` CONFLICT guard, physical Cognos tabs, new events / new `_KDB` namespace, 5th `createTabsController` method, AMD import of `dashboard/tabs/**` from kdbControl.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` via argument; no `window._KDB`; no new top-level namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — no foreign writes to `_KDB.state.tabs`; mutations only via `_KDB.api.tabs.dispatch`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — this WP creates no new runtime bucket; do not read `_KDB.runtime.tabs`.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — kdbControl must not import tabs `effects/` / `config/` / internal `state/` (except published registry, unused here); use `_KDB.api.tabs.getState` / `dispatch` and `_KDB.services.message.notify`.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150; orch ≤120; AMD >10 requires split; helper is a named framework file, not a leftover `Helpers` split.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — `verb+noun.js`; `_` on AMD/params only; German UI only under `labels.de.*` except this WP’s locked clone (lock 9).
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on the named helper; binder trampoline stays a thin filter (no new try/catch).
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no new query; binder keeps existing `BUTTON` + `data-kdb-action` filter; no `document.querySelector`.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; named functions at factory scope; no nested subfunctions in the new helper; no ES modules.
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` / `__getDashboardAPI`; no new facet.
12. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — do not invent lifecycle terms; disposed `getState` already returns `undefined` (lock 8).
13. `_____________KDB3API/contracts/tabs-add-max-visible-toast-contractdelta.md` — clickable add; `dispatchToolboxTabsAdd.js`; API-only; decision tree 1–4; clone German sentence; fail-closed on `notify`.
14. This execution spec.

---

## Section B. Folder tree (create order)

```
_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/framework/
  dispatchToolboxTabsAdd.js          (create)
  bindFrameworkToolboxPlaceholderApis.js   (edit)
```

No new folders.

---

## Section C. Per-file specifications

#### `KDB3/js/dashboard/canvas/kdbControl/framework/dispatchToolboxTabsAdd.js`

- **Role**: named click helper (single exported function, not `__controller`, not a listener).
- **Lines**: target 70–90 (hard 150).
- **AMD imports**: none. `define([], function () { ... })`.
- **First factory statement:** `"use strict";` (Approved delta + live binder/siblings).
- **Factory parameters**: none (empty `define` factory).
- **Factory-scope constants / flags** (not inside the entry function):
  - `const TABS_ADD_MAX_VISIBLE_TEXT = "Maximale Anzahl an Registerkarten erreicht.";`  
    Comment on the previous line, exact intent: `MUST exception: clone of tabs TAB_DUPLICATE_MAX_VISIBLE_TEXT; no tabs/config import; no labels.de merge this WP.`
  - `const TABS_MAX_VISIBLE_CODE = "TABS_MAX_VISIBLE";`  
    (live `_codes.MAX_VISIBLE` string; clone the literal; do not import `mutationCodes.js`)
  - `let didWarnMissingTabsDispatch = false;`
- **Factory-scope named helpers**: none beyond the entry function. Do not nest functions inside the entry.
- **Entry function**:
  - Name: `dispatchToolboxTabsAdd`
  - Parameters: `_KDB`
  - Body steps (in order), all inside one `try { ... } catch (err) { ... }`:
    1. `try {`
    2. `const tabsApi = _KDB && _KDB.api && _KDB.api.tabs;`
    3. **Path 1 (lock 8):** if `!tabsApi` OR `typeof tabsApi.getState !== "function"` → `console.warn("[kdbControl.dispatchToolboxTabsAdd] tabs getState unavailable — add blocked");` `return;`
    4. `const snapshot = tabsApi.getState();`
    5. **Path 1 continued:** if `snapshot === undefined` OR `snapshot === null` OR `typeof snapshot !== "object"` → same lock-8 `console.warn` as step 3; `return;`  
       Do **not** use `(snapshot && snapshot.canAdd) !== true` as the only gate (that toasts on `undefined`).
    6. `const svc = _KDB.services && _KDB.services.message;`
    7. **Path 2 (lock 4):** if `!svc || typeof svc.notify !== "function"` → `console.warn("[kdbControl.dispatchToolboxTabsAdd] messageService.notify unavailable — add blocked (fail closed)");` `return;`  
       Two-check form (same as duplicate / `warnSettingsMessage.js`). Do **not** write `typeof svc.notify` without the `!svc` guard (throws if `svc` is missing; catch would swallow). Do this **before** the max-visible toast so a max click with no `notify` never dispatches and never pretends to toast.
    8. **Path 3 (lock 2):** if `snapshot.canAdd !== true` → `svc.notify({ severity: "warning", message: TABS_ADD_MAX_VISIBLE_TEXT, code: TABS_MAX_VISIBLE_CODE });` `return;`  
       No `confirm`. No `notifyAnchored`. Message must not contain the character `5`.
    9. **Path 4:** if `typeof tabsApi.dispatch !== "function"` → if `!didWarnMissingTabsDispatch` then `didWarnMissingTabsDispatch = true;` `console.warn("[kdbControl] _KDB.api.tabs.dispatch is missing; toolbox tab placeholder actions are ignored.");` `return;`  
       This warn fires **only** on path 4. Do not emit it on paths 1–3.
    10. `tabsApi.dispatch({ type: "tabs/add", payload: { source: "kdbControl" } });`
    11. `} catch (err) { console.error("[kdbControl.dispatchToolboxTabsAdd] failed", err); }`  
        Catch: no toast, no dispatch, no rethrow.
  This new file and the binder stay `const`/`let` (live binder). Do not copy `var` from `confirmAndDispatchTabDuplicate.js` into either file.
- **Return value**: `dispatchToolboxTabsAdd` (the `define` factory returns this function).
- **Must not**: write `_KDB.state.tabs`; import any `dashboard/tabs/**`; call `safeTabsDispatch`; read `_KDB.runtime.tabs`; debounce; pending-mutation guard.
- **Rules to apply**:
  - `amd.mdc` — full-compact `define`; entry at factory scope; no nested subfunctions; no ES modules.
  - `naming.mdc` — `dispatchToolboxTabsAdd.js`; `_KDB` is the boundary param; no `confirm*` in the name; clone is the lock-9 exception to `labels.de.*`.
  - `feature-structure.mdc` — framework helper; ≤150 lines.
  - `module-public-api.mdc` — API-only (`getState` / `dispatch` / `notify`); no tabs internals.
  - `state.mdc` — no foreign tab state writes.
  - `error-handling.mdc` — try/catch on the named export; catch converts (log, no throw).
  - `events.mdc` — no events.
  - `cognos-adapter.mdc` — no host SDK.
  - `dom.mdc` — no DOM.

#### `KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkToolboxPlaceholderApis.js`

- **Role**: existing binder (`__controller` unchanged).
- **Lines**: live **148**, AMD **0**. After edit: **≤150**, AMD **1**. Hard 150. If a mechanical edit would exceed 150: **stop and report**; do not overflow-split comments/radios.
- **AMD imports** (replace `define([])`):
  - Keep a **single-line** header so the file does not grow from wrapping:  
    `define(["./dispatchToolboxTabsAdd"], function (_dispatchToolboxTabsAdd) {`
  - Do not add `.js` on this relative import (sibling framework files omit it).
- **Factory-scope named helpers**: keep all existing functions. Change **only** `onTabsAddClick` as specified. Do not add try/catch to `onTabsAddClick`. `error-handling.mdc`’s DOM-handler default does not apply to this trampoline (thin filter; helper owns the catch). Do not wrap `onTabsAddClick` — that would exceed 150 and double-log. Do not remove `safeTabsDispatch` (still used by `flushTabSelectEditTarget`).
- **`onTabsAddClick` body after edit** (factory scope, not nested):

```js
function onTabsAddClick(ev) {
  const t = ev.target;
  if (!t || t.tagName !== "BUTTON") return;
  if (t.getAttribute("data-kdb-action") !== "tabs.add") return;
  const _KDB = kdbForToolboxPlaceholders;
  if (!_KDB) return;
  _dispatchToolboxTabsAdd(_KDB);
}
```

  Replace the live `safeTabsDispatch(_KDB, { type: "tabs/add", payload: { source: "kdbControl" } });` line with `_dispatchToolboxTabsAdd(_KDB);`. Keep the BUTTON / `data-kdb-action` / `_KDB` guards.
- **`__controller`**: do **not** change. Keep `el.addEventListener("click", onTabsAddClick, { signal: _signal });`. Do not attach a second add listener. Do not restyle grandfathered inline comment listeners.
- **Return value**: still `__controller`.
- **Rules to apply**:
  - `amd.mdc` — one `define`; import order matches params; no ES modules. Do not add new nested functions.
  - `naming.mdc` — `_dispatchToolboxTabsAdd` AMD binding uses `_`.
  - `feature-structure.mdc` — ≤150; AMD 1 (smell 6 does not apply to this +1).
  - `error-handling.mdc` — trampoline stays a filter; try/catch lives in the helper.
  - `dom.mdc` — existing contentEl listener only; no new `document.querySelector`.

---

## Section D. Reducer behavior table

No reducer change. Do not edit `reduceTabsAction.js` / `reduceTabsRename.js`. `TABS_NO_HIDDEN_TAB` stays the English diagnostic if something else still dispatches `tabs/add`.

---

## Section E. Published selectors

No new selectors. Do not AMD-import `readTabsForKdbControl`. `canAdd` is read from `tabsApi.getState()` at click (computed each call on the coarse projection).

---

## Section F. Public API wiring

Unchanged. `_KDB.api.tabs` stays `{ mount, destroy, dispatch, getState }`. `_KDB.services.message.notify` already exists. Do not add methods.

---

## Section G–I. Harness / mocks

Omitted. No harness this WP.

---

## Section J. Acceptance criteria (self-verification before reporting back)

1. Both Section B files exist (new helper + edited binder).
2. Each file matches Section C, including `Rules to apply`.
3. Full-compact AMD `define`; new helper has zero nested functions.
4. Helper ≤150; binder ≤150.
5. No kdbControl AMD path into `dashboard/tabs/**`.
6. Section A `.mdc` reads are required. Do not modify `.mdc` or parent contracts. Do not read or modify the naslag trees listed in Section K (`TEST/dashboard/`, `_______KDB3/`, `_______REDESIGN2/`, `laatsteOriginal/`).
7. No `_KDB.state.tabs` writes from the helper.
8. Decision tree: missing snapshot → lock-8 warn, **no** toast; missing `notify` → lock-4 warn, **no** dispatch; `canAdd !== true` on a real object snapshot → `notify` warning with cloned German sentence and `code: "TABS_MAX_VISIBLE"`; else `tabs/add` with `{ source: "kdbControl" }` in **payload**.
9. Copy has no literal `5`.
10. Add button not disabled/hidden. Fill/sync untouched.
11. `bindFrameworkView.js` still AMD 7 (untouched).
12. Report: paths, line counts, AMD counts, deviations, 14 Section A echoes.

---

## Section K. Forbidden actions

- Modify any `.mdc` under `_____________KDB3API/.cursor/rules/`.
- Modify `contracts/_template.md` or `_executionSpecTemplate.md`.
- Modify the Approved delta except if the captain (not W1) is asked to patch it.
- Read or modify `TEST/dashboard/`, `_______KDB3/`, `_______REDESIGN2/`, `laatsteOriginal/` as write targets (legacy add copy in `configurationToolboxHelpers.js` is naslag-only; do not port the hardcoded `5`).
- Write CSS, tests, README, harness.
- Commit, push, or change git config.
- Invent behavior; stop and report instead.
- Skip Section A echoes.
- Create `tabs/effects/confirmAndDispatchTabAdd.js`.
- Grow the binder past 150.

---

## Section L. Reporting template (executing AI)

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **File checklist** — path, line count, AMD count, matches spec | deviation.
3. **Deviations** — path, deviation, motivation, rule.
4. **Self-verification** — pass/fail per Section J.
5. **Open questions** — only if the spec was silent and improvisation was required.

---

## Section M. Reviewer handoff

1. Verify 14 echoes.
2. Read both files.
3. Line count + AMD count vs Section C.
4. Confirm no `dashboard/tabs/**` import from kdbControl.
5. Confirm German clone exact: `Maximale Anzahl an Registerkarten erreicht.`
6. Decide: accept, fix-spec, or escalate. Parent one-liners (`tabs.md`, `kdbControl-tabsCrud-contractdelta.md`) wait until after dual review + Cognos green (captain, not W1).
