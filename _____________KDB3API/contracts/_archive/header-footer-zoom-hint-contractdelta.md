# Contract Delta: header/footer zoom hint (WP5)

> When Kopfzeile or Fußzeile becomes visible, tell the user once they can use Cognos zoom “An Seite anpassen”. Do not fire two toasts.

---

**Status:** `Approved` (PO vastenburg, 2026-09-07) — Cognos **green** 2026-09-07. **Trigger parked inactive** (PO): `_notifyZoomHint(...)` call sites commented in header/footer effects; helper + labels + AMD imports stay. Re-enable by uncommenting the calls. Do not treat as dead code.  
**Type:** `feature-module contract delta`  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (tick **5** only after Cognos green)  
**Naslag:** `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` §5  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-07  
**Parents:** `contracts/header.md`, `contracts/footer.md`, `contracts/kdbControl-header-footer-toolbox-contractdelta.md`, `contracts/messageService.md`

---

## 1. Purpose

Legacy hinted after header **or** footer turned on, but header+footer both called the toast (duplicate). Port the copy; fix the double.

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | **One** toast per activation burst. Owner folder `dashboard/header/` (not `dashboard/canvas/header/`, not `dashboard/chrome/`). Footer may **call** the header-owned helper. Not a router service. |
| 2 | Collapse: `_KDB.services.message.notifyAnchored` on **the same connected** `_KDB.runtime.header.domRefs.rootEl`, `code: "HEADER_FOOTER_ZOOM_HINT"` (dedupeKey defaults to `code`). Live `notify()` **ignores** `code`/`dedupeKey` — do **not** use Glass `notify` for this WP. Do **not** reopen `messageService.md` Q4. Do **not** query filter dock. |
| 3 | Copy (exact DE): `Sie können das Zoom-Symbol oben rechts im Dashboard verwenden und dort „An Seite anpassen“ auswählen, um die Dashboard-Größe an geänderte Header-/Footer-Einstellungen anzupassen.` Key: `_KDB.config.labels.de.header.zoomFitToPageHint`. Footer does not own a second string. |
| 4 | Fire when **that module’s** chrome `status` transitions **to** `"active"` from `idle` or `removed` (toolbox **or** restore). Predicate: `prev.status !== "active" && next.status === "active"`. **Not** on subtitle-only. **Not** on `active` → `removed`. Live actions: `header/toggle\|show\|hide`, `footer/toggle\|show\|hide` — **no** `setTopHeader`. |
| 5 | Skip `__mountSync`, `__unmount`, and `action.options.isHistoryReplay === true`. Header mount lies about prev (`snapshotChrome(_initialState())` is always idle) — skip is mandatory. Footer mount passes current state as prev (predicate already false). Restore uses `skipHistory` only — **do not** skip restore inner `show`. |
| 6 | Bootstrap first paint that stays `idle`: no toast. Boot restore that sets `active`: toast **once** (lock 2). |
| 7 | No Cognos zoom API. No new events. No new `_KDB` namespace / lifecycle term / cognosHost facet. |
| 8 | Footer-only **cannot** fire unless `readHeaderStatus === "active"` (controller, restore, history). Helper on footer is still required for **header already active → then footer on**. |
| 9 | Restore both-on: `runNormalRestore.js` **and** `runNewDashboardReset.js` dispatch `header/parameterSetRestoreRequested` then `footer/parameterSetRestoreRequested`. Inner `show` is in each `handleParameterSetRestore.js` (`skipHistory` only). `mapV2HeaderFooter.js` maps footer `turnedOn` and header `turnedOn` **plus** `text`→`title` and icon stem — **do not edit** that mapper. Do **not** edit the restore runners. |

Grey-ownership: toast **text** = header labels; footer AMD-imports the header helper (lock 3.1 exception).

---

## 3. Locked mechanism (proposal series 2026-09-07)

Second army pass (consequences / duplication / MUST / hook sites): recommendation **HOLD**. Patches below are part of the lock.

### 3.1 Files

| File | Role |
|---|---|
| `KDB3/js/dashboard/header/effects/notifyZoomHint.js` | **New.** Header-owned helper. AMD 0. Export `__controller`. Binding `_notifyZoomHint`. |
| `KDB3/js/dashboard/header/config/headerLabels.js` | **New.** Flat DE object. One key: `zoomFitToPageHint` = lock-3 string. |
| `KDB3/js/dashboard/header/__orchestratorHeader.js` | Init then merge like shareControls: `_KDB.config = _KDB.config \|\| {}`; `_KDB.config.labels = _KDB.config.labels \|\| {}`; `_KDB.config.labels.de = _KDB.config.labels.de \|\| {}`; `_KDB.config.labels.de.header = Object.assign({}, _headerLabels, _KDB.config.labels.de.header \|\| {})` (existing keys win). AMD **2→3**. `try/catch` on the new merge (file has none today). Helper does **not** AMD-import this file. |
| `KDB3/js/dashboard/header/effects/__orchestratorHeaderEffects.js` | AMD **7→8**. **One** call after `__mountSync` return, **before** `HEADER_CONFIRMED_CHANGED`. |
| `KDB3/js/dashboard/footer/effects/__orchestratorFooterEffects.js` | AMD **5→6**. **One** call on the fallthrough path after `ensureFooterMounted` + `_syncFooterFromState` (the `__unmount` branch returns first — never a second call). |

**Approved-delta exception (one AMD edge):** `__orchestratorFooterEffects.js` may import `header/effects/notifyZoomHint.js`. It must **not** import `__orchestratorHeaderEffects.js` (`module-public-api` + AMD weight + chrome re-entry; header effects already imports footer **view** `syncFooterFromState`, not footer effects — not a true AMD cycle). Events + selectors remain the only other footer→header imports. This exception outranks `module-public-api` for **that one path** after PO Approved.

**Must not grow / must not edit:** `createHeaderController.js` (**152**), `createFooterController.js` (AMD **9**), both `handleParameterSetRestore.js`, both `apply*HistoryReplay.js`, `runNormalRestore.js`, `runNewDashboardReset.js`, `fillToolboxHeaderFooter.js`, `bindFrameworkKdbActionToggles.js`, `cleanupHeaderRuntime.js`, `createMessageService.js` / `showGlassToast.js` / `renderAnchoredNotification.js`, `mapV2HeaderFooter.js`, `KDB.js`, footer date/user/page/url files, `setDashboardZoom`.

**Must not add:** `dashboard/chrome/`; footer duplicate wrapper; runtime latch / new runtime bucket; `footer/config/*Labels.js`; new events; new `messageService` methods.

### 3.2 Helper arity and call sites

Live header: `__effects(_KDB, prevChrome, action)`. Live footer: `__effects(_KDB, action, prevState)` (**action before prev**).

Locked helper:

```js
function __controller(_KDB, _action, _prev, _next) { /* … */ }
```

| Caller | Call (after mount, helper owns skips) |
|---|---|
| Header effects | `_notifyZoomHint(_KDB, action, prevChrome, st)` **after** `if (t === "__mountSync") return;` |
| Footer effects | `_notifyZoomHint(_KDB, action, prevState, st)` once, after mount + footer sync (not on `__unmount`) |

Tolerate `_action === null` (`runFooterEffectsAfterMountTarget` passes `null`; prev === next → no toast). Each orch: **one** call. No second `notifyAnchored` block. No factory-closure latch.

### 3.3 Skip list and predicate (helper, null-safe)

Skip (return, no warn) when:

- `_action && _action.type === "__mountSync"`
- `_action && _action.type === "__unmount"` (footer destroy; header destroy does **not** send `__unmount` — cleanup only)
- `_action && _action.options && _action.options.isHistoryReplay === true`

If `!_prev || !_next`: return (no warn). Predicate: `_prev.status !== "active" && _next.status === "active"`.

Do **not** skip restore (`skipHistory` is not `isHistoryReplay`). Do **not** skip inner restore `header/show` / `footer/show`. Subtitle/title/icon actions keep `status === "active"` → predicate false (no re-toast).

### 3.4 Toast + anchor

Helper **reads** `_KDB.config.labels.de.header.zoomFitToPageHint`. Empty/missing label → `console.warn` + return (do not hardcode DE in effects).

Call `notifyAnchored` **only if** `rootEl && rootEl.isConnected === true`:

```js
_KDB.services.message.notifyAnchored({
  anchor: rootEl,
  code: "HEADER_FOOTER_ZOOM_HINT",
  message: label,
  severity: "info",
  durationMs: 10000
});
```

- `rootEl` = `_KDB.runtime.header.domRefs.rootEl` (not `root`, not footer `rootEl`, not filter dock). Header-owned helper may read header runtime; footer orch must **not**.
- Same `rootEl` identity for header-on and footer-on so `findDuplicate` (same anchor + `code`) collapses restore both-on and “footer on while first still showing”.
- If missing/disconnected: **return**. Do **not** call `notify()` (service would Glass-fallback and restore would **double**).
- Missing `services.message` / missing `notifyAnchored`: `console.warn("[header.notifyZoomHint] …")` + return. No throw.
- Named `__controller` + factory-scope helpers; local `try/catch`; do not rethrow into the orch catch as a second log.
- Severity `info` (legacy info toast). `durationMs: 10000` (legacy keep-visible; live anchored default is 5000 — pass explicitly).

### 3.5 History replay

Replay already `dispatch`es `header/show` / `footer/show` with `options.isHistoryReplay === true` through the same effects path. Helper skip list (lock 5): **no** zoom hint on undo/redo into `active`. Do not edit history apply files.

### 3.6 Out of this WP (documented, not silent)

- In-flight anchored toast whose `rootEl` is torn down on hide may Glass-fallback (`messageService.md` Q4). Acceptance 4 is “hide does not **fire** a new zoom hint”, not “messageService must not relocate an open toast”. No messageService edit.
- Visual surface is header chrome, not the legacy filter dock.
- `header:confirmedChanged` is **not** the toast trigger (too broad; misses footer-on).

---

## 4. Acceptance

1. Turn header on (footer already off) → **one** toast.  
2. Then turn footer on → **no second** toast while the first is still showing; if the first already dismissed, a second activation **may** toast again (acceptable).  
3. Turn both on in one restore → **one** toast.  
4. Hide header → no **new** zoom-hint fire.  
5. Footer-only (header not `active`) → no toast (live no-op).  
6. Missing `messageService` → helper no-op, `console.warn`, no throw.  
7. Undo/redo into `active` → no this toast.  
8. `__mountSync` / already-`active` remount → no this toast.

---

## 5. Parent one-liners (after dual review of JS, not before)

- `header.md` / `footer.md` §1: confirmed transition to `active` may show the zoom hint per this delta (`notifyAnchored` on header `rootEl`, `HEADER_FOOTER_ZOOM_HINT`); footer does not own a second copy; footer effects may import `header/effects/notifyZoomHint.js`.  
- `messageService.md` Q4 remains true (global `notify` still ignores `code`; collapse stays `notifyAnchored` only).

---

## 6. Open questions

None for this WP. Rejected: Glass `notify` + runtime latch; reopen Q4; filter-dock anchor; `dashboard/chrome/`; duplicate thin wrappers (PO-reject fallback only).

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-07 | Draft | coordinator | Wave 1 WP5. Deliberate anti-double vs legacy. |
| 2026-09-07 | Draft (patched) | review captain | Live: `notify()` ignores `code`/`dedupeKey`. Helper path corrected. Footer-only cannot fire. Controllers must not grow. |
| 2026-09-07 | Draft (NIT) | review captain | Dual-review: restore burst is `parameterSetRestoreRequested` then inner `show`. |
| 2026-09-07 | Draft | review captain | PO: proposal series TODO; mechanism not locked. |
| 2026-09-07 | Draft — series **locked** | coordinator + army | HOLD: `notifyAnchored` on `runtime.header.domRefs.rootEl`; helper `__controller(_KDB,_action,_prev,_next)`; labels `zoomFitToPageHint`; skip mount/unmount/replay; `durationMs: 10000`; one footer→header effects import. Dual-review A+B: no FAIL. Awaiting PO Approved. |
| 2026-09-07 | **Approved** | PO vastenburg | Mechanism locked. Execution spec next; JS after spec army review. |
| 2026-09-07 | Cognos **green**; trigger **parked** | PO vastenburg | Implement + dual-review done. After green: comment out `_notifyZoomHint` calls (keep helper/labels/AMD). Not dead code. |
