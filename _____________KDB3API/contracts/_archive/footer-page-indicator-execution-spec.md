# Execution Spec: `footer` page indicator (`tab index + 1`)

> Mechanical spec. Architecture: `footer-page-indicator-contractdelta.md`. Do not store page on footer state. Do not `null + 1`.

---

**Status:** `Ready for execution`
**Module / contract:** `contracts/footer.md` + `contracts/footer-page-indicator-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-02
**Executing AI:** grok 4.6 subagent (captain assigns)
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist

**May edit:**

- `KDB3/js/dashboard/footer/state/selectors.js` (2nd AMD: tabs selectors; re-export `readActiveTabIndex`)
- `KDB3/js/dashboard/footer/view/syncFooterFromState.js` (paint page indicator)
- `KDB3/js/dashboard/footer/events/eventNames.js` (2nd AMD: tabs `CHANGED`; re-export `TABS_CHANGED`)
- `KDB3/js/dashboard/footer/createFooterController.js` (**no 10th AMD import**; subscribe/unsubscribe `tabsChanged`; stay ≤ 150)
- `architecture/eventSubscribe.md` (`tabs:changed` subscriber row for footer only)

**Must not edit:** reducer, `initialState.js`, `loadFooterUpdateDate.js`, `loadFooterCreatedUser.js`, `__orchestratorFooterEffects.js`, `buildFooterChrome.js`, tabs owner JS, `KDB.js`, history, writeback, `.mdc`, git.

---

## Section A. Pre-flight (echo one sentence each before files)

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc` — footer does not write `_KDB.state.tabs`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — handle under `subscriptions.tabsChanged`.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new public footer method.
5. `_____________KDB3API/.cursor/rules/events.mdc` — subscribe to existing fact; import emitter constant; no `"tabs:changed"` literal.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — controller AMD stay 9; effects stay 5.
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on the new handler.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — view uses published selector, not `_KDB.state.tabs`.
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/contracts/footer-page-indicator-contractdelta.md`
12. `_____________KDB3API/architecture/eventSubscribe.md` — `tabs:changed` payload `tabIndex` physical.
13. This spec.

---

## Section C. Per-file

#### `KDB3/js/dashboard/footer/state/selectors.js`

- **AMD (order, 2):** `"../../header/state/selectors"`, `"../../tabs/state/selectors"`
- Keep `readFooterStatus`, `readHeaderStatus`, `readHeaderTitleText`.
- Add `readActiveTabIndex: _tabsSelectors.readActiveTabIndex`
- **Rules:** `state.mdc`; `module-public-api.mdc`; `amd.mdc`.

#### `KDB3/js/dashboard/footer/view/syncFooterFromState.js`

- **AMD:** stay `"../state/selectors.js"` only.
- After title / dataAkt / centerDateUser, when `active` and `dr.pageIndicatorEl`:
  - `var idx = _selectors.readActiveTabIndex(_KDB);`
  - `if (typeof idx === "number") dr.pageIndicatorEl.textContent = String(idx + 1);`
- Never `String(idx + 1)` when `idx` is null. Never `_KDB.state.tabs`.
- **Rules:** `dom.mdc`; `amd.mdc`.

#### `KDB3/js/dashboard/footer/events/eventNames.js`

- **AMD (order, 2):** `"../../header/events/eventNames"`, `"../../tabs/events/eventNames"`
- Keep re-export `HEADER_CONFIRMED_CHANGED`.
- Add `TABS_CHANGED: _tabsEvents.CHANGED` (value must be the tabs constant, not a new string).
- Comment: re-export for subscribe only; footer does not emit.
- **Rules:** `events.mdc`; `amd.mdc`.

#### `KDB3/js/dashboard/footer/createFooterController.js`

- **AMD:** stay the **same 9** paths. Use existing `_footerEventNames` and `_footerEffects`.
- Nested `onTabsChanged` (clone `onHeaderConfirmed` style, grandfathered):
  1. try/catch; log `[footer.tabsChanged]`
  2. if `disposed` return
  3. `_footerEffects(_KDB, { type: "__tabsSync", payload: { source: "bootstrap" } }, _KDB.state.footer)`
  4. Do **not** dispatch a reducer action. Do **not** use `__mountSync` / `__unmount`.
- `mount`: after header subscribe block, same pattern for `TABS_CHANGED` → `subscriptions.tabsChanged` (unsubscribe previous if function).
- `destroy`: after header unsubscribe, unsubscribe `tabsChanged` and null the key.
- File ≤ 150 lines. Function already over 60-line cap — add only these subscribe lines.
- **Rules:** `events.mdc`; `runtime.mdc`; `error-handling.mdc`; `feature-structure.mdc` (no 10th import).

#### `architecture/eventSubscribe.md`

- Under `tabs:changed` **Subscribers**, add:
  - `footer` — file: `KDB3/js/dashboard/footer/createFooterController.js` — handler: `__tabsSync` → `syncFooterFromState` (page indicator). Ignore in-flight tabs work? **No suppression** (paint is cheap; widgetBase/kdbControl suppress for other reasons). Handle: `_KDB.runtime.footer.subscriptions.tabsChanged`. Teardown: `footer.destroy()`.
- Do not rewrite other subscriber rows.

---

## Section J

1. Active page indicator is `String(activeIndex + 1)` when index is a number.
2. Null index does not paint `"1"` via `null + 1`.
3. Tab switch while footer active updates the number (`tabs:changed`).
4. Controller AMD 9. Effects AMD unchanged (5).
5. No `_KDB.state.tabs` in the view. No footer page state field.
6. No `"tabs:changed"` string literal in the controller (constant re-export).
7. `__tabsSync` does not restart update-date / created-user (`__mountSync` only).
8. Report Section L.

---

## Section K

- 10th controller import; 6th effects import; inline `placeFooter`; edit tabs JS; store page on footer state; `tabIdx`; git commit; skip Section A.

---

## Section L

13 echoes; file checklist; deviations; J pass/fail; open questions.

## Section M

PO Cognos: Fußzeile on, tab 1 → `"1"`; switch to tab 2 → `"2"`; helper if opened → `"6"`.
