# Contract Delta: `footer` page indicator from tab index

> Delta on top of `contracts/footer.md`.
> Replaces hardcoded `#KDB_footer_pageIndicator` `"1"` with **physical tab index + 1**.
> **PO 2026-09-02:** first tab → `1`, second → `2`. No JS in this document.

---

**Status:** `Approved-for-implementation`
**Parent contract:** `contracts/footer.md`
**Also amends:** `contracts/footer.md` §8 selectors; `architecture/eventSubscribe.md` `tabs:changed` subscriber row.
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-02
**Reviewed by:** PO (vastenburg) 2026-09-02 — paint lock `index + 1`

---

## 0. Diagnosis

| Layer | Fact |
|---|---|
| Chrome | `buildFooterChrome.js` sets `pageInd.textContent = "1"` once. `pageIndicatorEl` is stored. |
| View | `syncFooterFromState.js` **never** paints the page indicator. |
| Tabs | Canonical `activeIndex` is 0-based **physical** Cognos index. Published `readActiveTabIndex(_KDB)` returns that number or `null`. |
| Tab switch | Does **not** run footer effects. Footer must subscribe to fact `tabs:changed`. |

**Type 3:** contract silent; code stub `"1"`.

---

## 1. Purpose

When footer chrome is **`active`**, the right-column page indicator shows **`String(activeIndex + 1)`** from tabs.

- Source: published **`readActiveTabIndex`**, not `_KDB.state.tabs` in the view, not `tabs:changed.tabIdx` (writeback / null for helper).
- Helper tab physical **5** → `"6"` (PO: physical + 1).
- **Do not** store page on `_KDB.state.footer` (tabs owns the number; same pattern as `readHeaderTitleText`).

---

## 2. Paint

`syncFooterFromState` when `active` and `pageIndicatorEl`:

- `idx = readActiveTabIndex(_KDB)`
- if `typeof idx === "number"` → `textContent = String(idx + 1)`
- else **do not write** (`null + 1 === 1` would fake the old stub). DOM keeps last paint or chrome `"1"`.

`buildFooterChrome` may keep initial `"1"` (overwritten on first successful sync).

---

## 3. Subscribe

Footer **subscribes** to `tabs:changed` (emitter: tabs). Handler re-runs footer effects with internal type **`__tabsSync`** (`source: "bootstrap"`): ensure/sync only — **not** `__mountSync` (must not restart `update_date` / created-user loads).

- Constant via `footer/events/eventNames.js` re-export of `tabs/events/eventNames.js` `CHANGED`. No string literal `"tabs:changed"` in the controller.
- Handle: `_KDB.runtime.footer.subscriptions.tabsChanged`
- Teardown: `footer.destroy()` unsubscribes (same as `headerConfirmedChanged`).
- Controller AMD stays **9**. Effects orchestrator AMD stays **5**. Do not inline `placeFooter` to free a slot.

Clone the existing header-bus pattern in `createFooterController.js` (grandfathered nested handler). File stay ≤ 150.

Unknown reducer types already `return state` — `__tabsSync` must **not** hit the reducer (effects-only, like `__mountSync`).

---

## 4. Selectors

`footer/state/selectors.js` adds 2nd AMD `../../tabs/state/selectors` and re-exports `readActiveTabIndex`. View keeps 1 AMD (footer selectors).

---

## 5. Out of scope

- Footer state / history / writeback of the page number.
- Cognos URL, Data Excellence Conform, `canvasExtensionBottom`.
- Changing tabs owner / `activeIndex` meaning.
- 10th controller import, 6th effects import.

---

## 6. Approval log

| Date | Actor | Note |
|------|-------|------|
| 2026-09-02 | PO | Page = tab index + 1. |
| 2026-09-02 | captain | Army: selector live; subscribe required; AMD walls; null guard. |
