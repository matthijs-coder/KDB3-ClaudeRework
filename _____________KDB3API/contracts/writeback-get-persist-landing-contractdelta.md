# Contract Delta: writeback GET persist-landing (A′)

> Save-host persist window after a valid GET: WritebackTabel’s page current **and** `.KDB3Widget` followed onto that page, **then** stringify.
> This is **not** collect completeness. Hidden-tab GET collect stays as in `writeback-get-visibleDashboard-contractdelta.md`.
> Amends `writeback.md` §2.1 / §3; `writeback-get-visibleDashboard-contractdelta.md` §1 / §2 row 4 / §4; `tabs-writeback-readiness-contractdelta.md` §11; `kdbControl-tabFollow-contractdelta.md` §2 (GET must emit a final `tabs:changed` after persist traverse).

---

**Status:** `Implementing` frozen on Cognos groen 2026-09-02 (A′ land + hold after land-gate revert).
**Parent:** `contracts/writeback.md` §2.1, §3;
`contracts/writeback-get-visibleDashboard-contractdelta.md` §1, §2 row 4, §4;
`contracts/tabs-writeback-readiness-contractdelta.md` §11;
`contracts/kdbControl-tabFollow-contractdelta.md` §2
**Type:** `core service contract delta`
**Authoring AI:** Cursor Grok 4.6 (persist-landing captain), 2026-09-01; hold patch: persist-popup-hold captain, 2026-09-01
**Reviewed by:** PO vastenburg — 2026-09-01 A′ go; 2026-09-02 Cognos groen after land-gate revert (jump + persist).
**Related:** `leftover-widgets-developer-hide-contractdelta.md` (WritebackTabel excluded from hide; **CSS not in this WP**); SET `emitLandingTabChanged` pattern (copy, **do not overload** `tabs/postParameterSetRestoreTraverseRequested`)

---

## 1. Purpose

External save (`WBParameterGetFunction`) persists while Cognos still has the **current dashboard page**. WritebackTabel (leftover widget, title `WritebackTabel` / `WritebackTable`) does **not** follow tabs. The KDB host (`.KDB3Widget` / `#kdb-control-save-load-slot`) **does**. Saving from tab 2+ can therefore stringify a valid v3 while the leftover table’s page is not current → new name missing from `#selectParameterSet`, **no** German `Dashboard speichern`.

`writeback-get-visibleDashboard-contractdelta.md` §1 called KDB2 `moveToFirstTabAndBack` a collect hack and dropped it. That classification is **right for collect**, **wrong for persist**. This delta restores the persist constraint as a **second GET pass** after validate, not as `collectWidgets.needsTraversal`.

---

## 2. PO decisions (2026-09-01) — closed

| # | Choice | Decision |
|---|---|---|
| 1 | Fault | Our GET persist window. Not the extension. Not v3 missing a parameterset **name**. |
| 2 | Symptom | Missing dropdown name only. No German `Dashboard speichern` ⇒ `collect()` did not throw. |
| 3 | Product | **A′** persist-land after collect. Not B (KDB2 `#saveParameterSet` + opacity 0 + 8500ms). Not C (last-known-good snapshot). Not D (collector-only). |
| 4 | Control widget | Follows the user tab (`kdbControl` tab-follow `appendChild`). WritebackTabel does not. GET cannot CRUD that table. |
| 5 | Name | Typed in the extension UI. Missing option = host did not persist/refresh. |

Do not reopen B/C/D, inbound share, FilterDock, PDF, tab CRUD, WritebackTabel CRUD, `syncBridge`.

---

## 3. Sequence (normative)

Owner: `_KDB.services.writebackGet` (named helper it calls). **Not** `cognosWritebackBridge.js`.

**Gate:** persist-landing runs only when `collect(options)` is opted in (`source: "bridge"` from the Cognos GET bridge). Ungated / test / internal `collect()` must **not** mutate tabs. Do **not** skip land when the persist popup is not visible from the KDB document (iframe/top mismatch). Popup identity gates **restore/hold only**.

```text
1. Collect on the current tab (existing collectors; visible-dashboard traverse unchanged).
2. normalizeV3 + validateV3. Stop here on failure (existing notifySaveFailed).
3. Capture state.tabs.activeIndex (user tab).
4. If already the first visible dashboard slot → skip land click.
5. Else land on first visible dashboard tab (physical 0 when the visible prefix is contiguous).
6. Landing MUST let kdbControl tab-follow run (or equivalent host appendChild).
7. Wait until host.parentNode === page of that slot (follow retry budget 400ms × 10).
8. Return the validated object. Bridge JSON.stringify(v3) only after that return.
9. Do not restore the user tab before return. Do not await popup-gone inside collect (deadlock).
10. After return: fire-and-forget hold. If a persist smq-popup is seen, restore only when it
    is absent from document.body. If it is never seen, keep polling — do not restore on the
    first empty tick. Stuck cap 30s then restore. No restore while a seen popup still exists.
```

Collect traverse (`scope: "visibleDashboard"`, `restoreActiveTab: true`, no `restoreTabIndex`) stays **collect-only**. Reusing it as persist landing restores the **user** tab **before** stringify. **Forbidden.**

---

## 4. Landing click path (live army 2026-09-01)

There is **no** public chrome-click that omits `pendingPromises.traverse`. `clickTabChromeButton` is traverse-internal. GET must not call it, scrape chrome, or write `_KDB.state.tabs`.

`tabs/traverse` **always** sets `pendingPromises.traverse`. While that (or `startup` / `tabMutation`) is set, `followActiveTab.isTraversalInFlight` ignores `tabs:changed`. After await, the traverse commit has already written `activeIndex`, so the 120ms observer no-ops. **Without a post-await landing emit, the host stays on the user page.** SET already emits (`postParameterSetRestoreTraverse.js` `emitLandingTabChanged`, `source: "postRestoreTraverse"`). GET has no equivalent today.

`tabs/parameterSetActivateTabRequested` returns `{ skippedActivation: true }` with **no click** when `hasTabInnerFrame` is already true (normal after boot). **Forbidden** for this WP.

**Required landing path:**

1. Wait until `runtime.tabs.pendingPromises.startup` and `.traverse` are clear.
2. Tabs owner: `tabs/traverse` `scope: "singleTab"`, `tabIndex` = first **visible** dashboard physical index (`listDashboardSlots` `visible === true`; equals 0 under contiguous prefix), `restoreActiveTab: true`, `restoreTabIndex` = that index, `waitFor: "canvas"`, `includeHiddenDashboardTabs: false`, `source: "writebackGet"`.
3. **Await** until `dispatchTabsTraverse` has deleted `pendingPromises.traverse`.
4. Tabs owner emits `tabs:changed` (`tabIndex`, `tabIdx`, `tabId`, `pageId`, `firstActivation: false`, `source: "writebackGetPersistLanding"`). Copy SET emit shape. GET must not emit the bus.
5. Do **not** overload `tabs/postParameterSetRestoreTraverseRequested` (needs SET `runId`, walks all visible tabs, `waitFor: "widgetsRendered"`).
6. New tabs action allowed, e.g. `tabs/writebackGetPersistLandingRequested`, that owns steps 1–4. Follow does not branch on `source`; **do not** edit `followActiveTab.js`.

`waitFor: "canvas"` is enough (page exists). Do **not** promote persist-landing to `waitFor: "widgetsRendered"`. Hidden dashboard tabs still not clicked.

---

## 5. Host wait, restore, failure

**Host wait (GET helper):** after landing emit, poll until `.KDB3Widget` `parentNode` is the landing page element (`document.getElementById(pageId)`). Bounded by follow’s 400ms × 10 (~4s). Document-scoped query is an explicit exception for this helper (same nodes follow already uses). Do **not** read `_KDB.runtime.kdbControl`.

**Delayed restore (popup-lifetime hold):** after collect returns (stringify/persist can run on page 0), fire-and-forget: stay on the landing tab until the persist popup is **absent from `document.body`** (save complete **or** user cancelled — same outcome). Then chrome-equivalent activation of the captured user index. Same follow-must-run rule as landing (reuse the tabs persist action with the captured index; not `parameterSetActivateTabRequested`; not GET `TRAVERSE_PAYLOAD`).

**Do not await popup-gone inside `collect()`** (deadlock: extension persist starts only after GET returns).

**Popup identity:** first `smq-popup` that is a **direct `document.body` child** (live helper `readDirectBodySmqPopup`). Prefer the document KDB runs in; also `window.top.document.body` only if that document is different. If several `smq-popup` exist, the save dialog is the one whose `h1.api-title` text contains `parameterset` (case-insensitive). Ignore KDB `#WB > #preloader-object`. Watching the popup node as persist-busy is in; clicking or filling `#saveParameterSet` is out.

**Trigger:** restore keys off **popup node absence**, not `#preloader-object` display and not a short clock. Live predecessor (200ms poll of `#preloader-object` inside that popup; restore on loader hide, **8s if never seen**, **20s if never hides**) is **too weak**: those clocks restore while `smq-popup` can still be on `body` (user still in the dialog). Forbidden: restore at 8s while `smq-popup` still exists. Forbidden: restore on loader `display:none` while `smq-popup` is still in `body`.

**If popup never appears:** internal `collect()` already skips land/restore (`source !== "bridge"`). Bridge GET still **lands**. Restore watch: do **not** treat “no popup on the first tick” as gone (that yanks in 200ms and skipped land when land was gated on the same helper). Poll until seen-then-gone, or 30s stuck cap. **Do not** invent an 8s yank.

**Fallback clock:** only if the popup **was seen** and then the node is stuck for a **long** safety cap (order **30s+**, not 8s). Prefer “node gone”.

**Cancel** the watch on: user `tabs:changed` (`source` ≠ `writebackGetPersistLanding`), SET `parameterSetRestoreActive`, GET re-entry, `destroy()`. If the user switches tabs by hand while the popup is still open, do not fight them. Timer id: `_KDB.runtime.writeback.timers.persistRestoreTab`. Watch lives in `scheduleWritebackGetPersistRestore.js` (`applyWritebackGetPersistLanding.js` is at the 150-line cap). This is **not** KDB2 B: no `#saveParameterSet` scrape, no opacity 0.

**Landing / restore miss:** best-effort. Log. **Still return** valid v3. **No** `notifySaveFailed`, **no** `WRITEBACK_COLLECTOR_FAILED`, **no** German `Dashboard speichern`. Payload is already valid.

---

## 6. Widget layout (same WP, not the name bug)

Drop GET live DOM layout merge in `collectWidgets.js` (`mergeDomLayoutIntoFrame` / `resolveWidgetShell`). Stamp `layout` from owner frame `lastCanvasLayout` else `layout` (same source as duplicate `serializeWidgetFrame` / `resolveCanvasLayoutFromFrame`). Do **not** import widgetBase internals; read owner `getState()` only. Do **not** fold persist-landing into `needsTraversal`.

---

## 7. Bridge

`cognosWritebackBridge.js` `bridgeGet` stays thin:

```js
const v3 = await writebackGet.collect({ source: "bridge" });
return JSON.stringify(v3);
```

No tab clicks, no host wait, no scrape of `#saveParameterSet` / `#selectParameterSet`. SET helpers `readSelectedParameterSet` / `selectParameterSetById` stay off the GET path. No `_KDB.cognosAPI` / `__getDashboardAPI`. Stringify stays on the bridge; landing wait stays inside `collect` before it returns the object.

---

## 8. Files expected (after PO ack of this hold patch)

A′ land files already exist. This patch changes **restore/hold only**.

| File | Change |
|---|---|
| `writeback/get/scheduleWritebackGetPersistRestore.js` | Restore watch: popup-gone (not loader-hide / 8s / 20s). Optional `api-title` / `parameterset` identity. 30s+ stuck cap only if popup was seen. |
| `writeback/get/applyWritebackGetPersistLanding.js` | **150 cap.** Do not thicken. Popup-present skip stays in schedule or a one-line call; no land-before-collectors. |
| `writeback/get/createWritebackGetService.js` | Land after validate when `source === "bridge"` only. **No** popup-present gate on land. |

**Do not touch unless a later army review proves a one-line need:** `cognosWritebackBridge.js` (await only), `followActiveTab.js`, leftover CSS, SET post-restore, `parameterSetActivateTab.js`, collectWidgets `TRAVERSE_PAYLOAD`.

---

## 9. Parent sentence overrides

| Parent | Section | Override |
|---|---|---|
| `writeback.md` | §2.1 | Collect + normalize + validate **first**; persist land **after**. Owner APIs for widget layout (no live DOM merge). Landing miss is not fail-visible. `collect(options)` `source: "bridge"` gates land. Collect `visibleDashboard` traverse is **not** persist landing. |
| `writeback.md` | §3 | Thin bridge unchanged except pass `source`. Land + host-wait inside GET before return. Popup-lifetime hold **after** return; restore when `smq-popup` is gone, not on 8s. No WritebackTabel CRUD; no scrape; no new service. |
| visible-dashboard | §1 | “Hack, not collect” remains true for **collect**. Persist first-visible click is **in** as a separate GET pass. Hidden clicks stay forbidden. |
| visible-dashboard | §2 row 4 / §4 | `restoreActiveTab: true` without `restoreTabIndex` stays **collect** payload. Persist skip = already on first visible slot. Persist `waitFor: "canvas"` on `singleTab`. |
| tabs-readiness | §11 | Collect barrier **before** widget collectors stays. Persist pass **after** validate. No pre-stringify user-tab restore. |
| kdbControl tab-follow | §2 | Follow skip during traverse stays. GET persist **must** emit final `tabs:changed` after that promise clears (SET already does). |

---

## 10. Out of scope

- SET step 28 / `runNormalRestore.js`
- PDF traverse, inbound share, FilterDock, tab CRUD
- Hidden-tab GET **collect** (already visible-dashboard)
- `syncBridge` (`writeback.md` §3, unimplemented)
- Leftover-hide CSS
- KDB2 `#saveParameterSet` interceptor / 8500ms scrape — GET persist **cover** (not that hack) is `loadingService-overlay-coverage-contractdelta.md` (`.dashboardFrame`, copy `Dashboard wird gespeichert`)
- WritebackTabel CRUD
- New `_KDB.services.*`, new top-level `_KDB.*`, folders `helpers/` `common/` `shared/`
- Rewriting `followActiveTab.js` to special-case GET `source`

---

## 11. Acceptance (Cognos — PO)

1. From tab 3: save → popup → Okay → stay on tab 1 **until popup gone** → then back to tab 3; new name in `#selectParameterSet`.
2. From tab 3: open popup, **cancel** → popup gone → restore to tab 3; no German fail.
3. Save already on tab 1 still works.
4. User can sit in the name popup longer than 8s without being yanked to tab 3.
5. No `[writebackGet.collect]` fail-visible throw on happy path; no German `Dashboard speichern` on a successful collect.
6. Optional: `[aria-label="WritebackTabel"]` stays under page 0; `.KDB3Widget` follows.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-01 | `Draft` | — | Captain + army live-API confirm. No JS until PO ack. |
| 2026-09-01 | `Draft → Implementing` | PO vastenburg | Tab-1 save works. A′ go. Hold 1000ms. |
| 2026-09-01 | hold 1000 → 8000 | PO vastenburg | X1: stay on tab 1 → name appears. H1. Restore delay 8000ms. |
| 2026-09-01 | restore = loader hide | PO vastenburg | Wait `smq-popup #preloader-object` on `document.body`; 8s fallback. |
| 2026-09-01 | hold patch `Draft` | — | Popup-lifetime hold: restore on `smq-popup` absence, not 8s/loader-hide. No JS until PO ack. |
| 2026-09-02 | hold patch `Draft → Implementing` | PO vastenburg | “het werkt nu. groen”. Restore = popup-gone. Army JS. |
| 2026-09-02 | land gate reverted | PO vastenburg | Popup gate skipped A′ land. Bridge GET always lands; popup gates restore only. |
| 2026-09-02 | Cognos groen | PO vastenburg | After land-gate revert: jump + persist works again. |
