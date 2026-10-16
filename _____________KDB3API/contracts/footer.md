# Module contract: footer

**Status:** CP-1 approved (draft resolved; implementation follows execution specs).  
**Owner module:** `footer`  
**Type:** feature module  
**Related:** `stateOwnership.md` (subtree `_KDB.state.footer`), `module-public-api.mdc`, `state.mdc`, `runtime.mdc`, `dom.mdc`, `events.mdc`, `header.md`, [footer-update-date-contractdelta.md](./_archive/footer-update-date-contractdelta.md) (Datenaktualisierung from `update_date`; PO 2026-09-02), [footer-created-user-contractdelta.md](./_archive/footer-created-user-contractdelta.md) (Erstellt `userName`; PO 2026-09-02), [footer-page-indicator-contractdelta.md](./_archive/footer-page-indicator-contractdelta.md) (page = physical tab index + 1; PO 2026-09-02), [footer-cognos-url-contractdelta.md](./_archive/footer-cognos-url-contractdelta.md) (URL from `document.location`; DEX hardcoded; **Implemented** PO 2026-09-02)  
**Supersedes placeholder intent:** toolbox chrome drives **known owner** `footer` via `_KDB.api.footer.dispatch` — see [kdbControl-header-footer-toolbox-contractdelta.md](./_archive/kdbControl-header-footer-toolbox-contractdelta.md); legacy `kdbControl.md` §6 `footer:toggleRequested` is **not** the path for toolbox footer toggle once approved.

---

## 1. Purpose

Owns dashboard **Fußzeile** semantics: serialisable footer state (domeinveld **`status`** = chrome presence, niet module-**`lifecycle`**), footer region **mount/DOM**. **Reads** header truth for guards and **subscribes** to **`header:confirmedChanged`** for coordinated policy when header wijzigt zonder gelijktijdige footer-dispatch. Footer does not own a second zoom-hint copy; a header zoom-hint helper (not present in the current tree) was planned per [header-footer-zoom-hint-contractdelta.md](./_archive/header-footer-zoom-hint-contractdelta.md). **PO 2026-09-07:** trigger parked (commented `_notifyZoomHint` call in footer effects); import + header helper remain — not dead code.

---

## 2. Ownership

- **Canonical state subtree:** `_KDB.state.footer`  
- **Canonical runtime:** `_KDB.runtime.footer`  
- **Public surface:** `_KDB.api.footer`  
- **Foreign-write paths:** none.

### 2.1 State shape (CP-1 + update-date + created-user deltas)

```txt
_KDB.state.footer = {
  status: "idle" | "active" | "removed",
  aktualisierungsDatumRaw: string | null,
  aktualisierungsDatumFormatted: string | null,
  createdUserName: string | null
};
```

- **`status` (zelfde betekenis als header — domein chrome presence, niet `lifecycle`):**  
  - **`idle`** — nooit geplaatst/geactiveerd.  
  - **`active`** — zichtbaar en gemount.  
  - **`removed`** — eerder actief geweest en bewust verwijderd (footer-DOM weg volgens execution spec).
- **`aktualisierungsDatumRaw` / `aktualisierungsDatumFormatted`:** session-derived chrome cache from tableData `update_date` (vis-title `aktualisierungsDatum`). Not history, not writeback `foot`. Authority: [footer-update-date-contractdelta.md](./_archive/footer-update-date-contractdelta.md). German keys are PO-locked; grandfather on `initialState.js`.
- **`createdUserName`:** session-derived Cognos `UserProfile` `userName` (English key). Not history, not writeback `foot`. Authority: [footer-created-user-contractdelta.md](./_archive/footer-created-user-contractdelta.md). View coalesces `null`/`""` → `"unbekannt"`.

---

## 3. Runtime (`_KDB.runtime.footer`)

| Bucket | Role |
|--------|------|
| `domRefs` | Footer root, mount slot. |
| `abortControllers` | Footer-local interactions, including `updateDate` for the table wait (abort own apply only; never `abortTable`). |
| `subscriptions` | o.a. `headerConfirmedChanged`: unsubscribe voor `header:confirmedChanged`; `tabsChanged`: unsubscribe voor `tabs:changed` (page indicator). |
| `dashboardFacet` | Stamped `cognosHost.dashboard` (created-user leftover). Effects read via `dashboard/controls/toolbarControls/shareButton.js` (`readDashboardFacet`). Not a live host handle. |

**Cleanup:** `footer.destroy()` clears subscriptions, DOM, runtime.

---

## 4. Public API (`_KDB.api.footer`)

- **Style:** dispatch + reducer.  
- **Methods:** `mount(options)`, `destroy()`, `dispatch({ type, payload })`, `getState()`.

**`SourceEnum` (CP-1):** `payload.source` is **`"kdbControl"` | `"api"` | `"bootstrap"`** (closed set).

### 4.1 Sandbox / DOM mount target

- Same contract class as `header`: **`mount({ mountTarget })`** inserts footer chrome into the sandbox **dashboard/canvas** shell, not inside `kdbControl`.

---

## 5. Dispatch actions

| `type` | Purpose |
|--------|---------|
| `footer/toggle` | Zelfde **toggle-logica** als header: **`idle` \| `removed` → `active`**, **`active` → `removed`**, **alleen** als header **`active`** is; als header **`idle`** of **`removed`** → **no-op** (footer kan niet actief worden). |
| `footer/show` | Naar **`active`** vanuit **`idle`** of **`removed`** **alleen** als `readHeaderStatus(_KDB) === "active"`; anders no-op. |
| `footer/hide` | **`active` → `removed`**; **`idle`** / **`removed`** → no-op. Preserves date fields and `createdUserName`. |
| `footer/applyUpdateDate` | Session write of `aktualisierungsDatumRaw` / `aktualisierungsDatumFormatted`. `payload.source: "bootstrap"`. Does not change `status` or `createdUserName`. See [footer-update-date-contractdelta.md](./_archive/footer-update-date-contractdelta.md). |
| `footer/applyCreatedUser` | Session write of `createdUserName`. `payload.source: "bootstrap"`. Does not change `status` or date fields. See [footer-created-user-contractdelta.md](./_archive/footer-created-user-contractdelta.md). |

---

## 6. Dependency / guard — header `idle` | `removed` (CP-1)

**Invariant:** footer **`status`** mag **niet** **`active`** zijn wanneer header **`idle`** of **`removed`** is.

| Regel | Gedrag |
|--------|--------|
| **G-dispatch** | Elke `footer/toggle` | `footer/show` die naar **`active`** zou gaan: eerst **`readHeaderStatus(_KDB)`**; alleen doorgaan bij **`"active"`**. |
| **G-header-removed** | Wanneer header naar **`removed`** gaat (via `header:confirmedChanged` en/of selector na commit): **als** footer **eerder `active` was** → zet **`footer.status = "removed"`**, footer-**DOM weg**; **als** footer **nooit `active` was** (`idle` gebleven) → **`footer.status = "idle"`** (ongewijzigd blijven mag; expliciet **`idle`** vasthouden). |

**Implementation locus:** `footer` reducer/effects: **B** = selector guards op elke muterende dispatch; **A** = subscription op **`header:confirmedChanged`** om **G-header-removed** toe te passen zonder race met alleen UI. **Nooit** `_KDB.state.header` muteren.

---

## 7. Reaction to header changes

| Approach | Rol (CP-1) |
|----------|------------|
| **A — `header:confirmedChanged`** | Verplicht voor **G-header-removed** wanneer header van buiten footer valt wordt verwijderd. |
| **B — `readHeaderStatus`** | Verplicht op **elke** `footer/*` dispatch die **`active`** kan worden. |

**Beide** blijven van kracht.

---

## 8. Selectors

`footer/state/selectors.js`: o.a. `readFooterStatus(_KDB)` → `"idle" | "active" | "removed"`; re-export `readHeaderStatus`, **`readHeaderTitleText`**, and **`readActiveTabIndex`** (from `tabs/state/selectors.js`; page indicator = that index + 1 when numeric).

**Reads of header:** import **`readHeaderStatus`** (en andere gepubliceerde header-selectors) vanuit **`header/state/selectors.js`**; geen interne imports buiten het public selector-pad.

---

## 9. Events

- **Emit:** optionele footer-facts — buiten CP-1 tenzij later gevraagd.  
- **Subscribe:** **`header:confirmedChanged`**; **`tabs:changed`** (page indicator; handle `subscriptions.tabsChanged`; teardown in `footer.destroy()`).

---

## 10. Dependencies

- **`header`:** guards + subscription (geen gedeelde `headerFooter` module).  
- **Does not depend on** `kdbControl` for correctness.
- **`cognosHost.dashboard`:** stamped `runtime.footer.dashboardFacet` for `getUserName` only ([footer-created-user-contractdelta.md](./_archive/footer-created-user-contractdelta.md)). Footer does not call `_KDB.cognosAPI`.
- **Right-column URL (chrome, not state):** `document.location` host + first path segment (typically `/cognos`). Not `getDashboardBiBaseUrl`. **DEX** stays the literal `"Data Excellence Conform"`. Authority: [footer-cognos-url-contractdelta.md](./_archive/footer-cognos-url-contractdelta.md).

---

## 11. Folder layout

As built (exports per file). `__orchestratorFooter.js` is a shim over `index.js` (controller + `registerFooter`).

```txt
dashboard/footer/
  __orchestratorFooter.js                             shim over index.js (path kept for KDB.js)
  config.js                                           VALID_SOURCES, MOUNT_TARGET_TIMEOUT_MS, UPDATE_DATE_TABLE_INPUT, LABELS, ERROR_CODES
  effects.js                                          runFooterEffects
  history.js                                          pushFooterHistoryStep, createFooterReplayHandler
  index.js                                            registerFooter
  loadFooterData.js                                   loadFooterUpdateDate, loadFooterCreatedUser
  mountTarget.js                                      ensureFooterMountTarget, abortFooterMountTargetWait, waitForFooterMountTarget
  restore.js                                          restoreFooterParameterSet
  state.js                                            createInitialFooterState, reduceFooter
  view.js                                             ensureFooterChrome, removeFooterChrome, syncFooterView
  state/
    selectors.js                                      readFooterStatus, readHeaderStatus, readHeaderTitleText, readActiveTabIndex
```

---

## 12. Out of scope (this contract)

- Shared `headerFooter` module/service.  
- Request-events for toolbox → footer (**known owner** = `dispatch`).

---

## 13. Approval log

| Date | Actor | Note |
|------|-------|------|
| 2026-05-13 | user | CP-1: footer-**`status`** (domein chrome presence) gelijk aan header; guards + `header:removed` effect op `removed` vs `idle` — zie [kdbControl-header-footer-toolbox-contractdelta.md](./_archive/kdbControl-header-footer-toolbox-contractdelta.md) §2. |
| 2026-09-02 | PO | Datenaktualisierung from `update_date`: state fields + T1/F1. Delta [footer-update-date-contractdelta.md](./_archive/footer-update-date-contractdelta.md). |
| 2026-09-02 | PO | Erstellt user from Cognos `userName` via dashboard facet `getUserName`. Delta [footer-created-user-contractdelta.md](./_archive/footer-created-user-contractdelta.md). |
| 2026-09-02 | PO | Page indicator = physical tab index + 1. Delta [footer-page-indicator-contractdelta.md](./_archive/footer-page-indicator-contractdelta.md). |
| 2026-09-02 | PO | Footer Cognos URL from `document.location` (DEV/TEST/PROD host). DEX stays hardcoded. Delta [footer-cognos-url-contractdelta.md](./_archive/footer-cognos-url-contractdelta.md). |
| 2026-09-02 | PO | Cognos green. Footer URL leftover **Implemented** / spec **Frozen**. |
