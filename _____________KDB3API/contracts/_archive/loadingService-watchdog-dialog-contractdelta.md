# Contract Delta: 5-minute load watchdog dialog (WP7)

> After the **boot** overlay watchdog fires at 300s, still `finishLoading`, then the **same** two-action home dialog as WP6 with watchdog copy. Timing stays. PDF overlay watchdog stays 1800000. Chrome = WP6 `presentHomeChoice` (not `showAlert`, not a second shell).

---

**Status:** `Implemented` — Cognos green 2026-09-08 (PO). PROGRAM **7** `[x]`.  
**Type:** `shared-service contract delta`  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (**7** `[x]` — Cognos green 2026-09-08)  
**Naslag:** `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` §7  
**Stub:** `contracts/futureTodo/toast-message-port-wave2-2026-09-07.md` §WP7  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-08  
**Parents:** `contracts/loadingService.md` (Q9 timing), `contracts/loadingService-overlay-coverage-contractdelta.md` (boot `mountKey`), `contracts/messageService.md` (Q3 / Q10; existing methods only)  
**Sibling:** `contracts/cubes-unavailable-home-dialog-contractdelta.md` — PO KEEP + Approved mechanism 2026-09-08. WP7 **must** call `presentHomeChoice`. Do not invent a shell.

---

## 1. Purpose

**Practical goal:** after a **stuck boot load**, the spinner already goes away (`finishLoading`). The user is left on a partial canvas (unparked Cognos widgets stay `visibility: hidden`) with **no explanation**. WP7 shows **why**.

**Message (exact DE):**

- Title: `Dashboard nicht vollständig geladen`
- Body: `Das Dashboard oder die benötigten Daten konnten nicht innerhalb von 5 Minuten vollständig geladen werden. Möglicherweise ist ein Fehler aufgetreten.`

**Trigger:** boot overlay watchdog fires. Live: `startLoading` with `mountKey: "kdb-root-loading-animation-mount"` (`.pageViewContent`, `messageKey: "dashboard"`, default `300000` ms) then **still running** at timeout → `runWatchdogFinish`. Play-loading off → no `startLoading` → no timer → no dialog. Finish before 300s clears the timer → no dialog.

This sentence does not mention Startseite. **Buttons + `navInstruction`** stay WP6 `labels.de.homeDialog` (Cognos-test follow-up: `Dashboard schließen` / `Dashboard minimalisieren` + `Wechseln Sie zur Startseite.` concatenated in `presentHomeChoice`). WP7 does not map nav itself and does **not** duplicate those strings in `labels.de.loading`.

---

## 2. Contract ↔ live (before any JS)

**Parent `loadingService.md` and live code match.** Q9 preserves watchdog **timing**. `scheduleLoadingWatchdog.js` `DEFAULT_WATCHDOG_MS = 300000` then **only** `finishLoading`. No home dialog in the parent contract and none in the folder. This is **not** a code↔contract break.

**Gap vs legacy (naslag #7):** both trees’ current law omit the Type2 home dialog. WP7 **adds** the **informational** surface via this delta. Do not treat live `finishLoading`-only as a bug against the parent.

**Legacy vs every current watchdog:** legacy showed the dialog **only** for `_mountPointTarget === "global"` (boot on `.pageViewContent`). Live default 300s also runs for widget/tab/metrics/save/restore overlays. Those must **not** get this dialog. PDF `watchdogMs: 1800000` / `mountKey: "dashboard-pdf-export"` is a **different** session — do not touch.

---

## TODO — Proposal series (**locked** — 2026-09-08)

| # | Question | Locked |
|---|---|---|
| 1 | Hook after 300s | **B:** `runWatchdogFinish` → `finishLoading` **then** `showLoadingWatchdogDialog`, same turn. Boot `mountKey` only. |
| 2 | Chrome | **A:** second caller of WP6 `presentHomeChoice` (watchdog title/body, same `home-close` / `home-minimize`). **Not** `showAlert`. **Not** a second `choose` implementation. |
| 3 | File split | **New** `effects/showLoadingWatchdogDialog.js`. Do not grow `applyLoadingOverlay.js` / `createLoadingService.js`. |
| 4 | Sessions | `mountKey === "kdb-root-loading-animation-mount"` only. |

### Q1 — hook + order

| | Option | Pros | Cons |
|---|---|---|---|
| A (inline) | Grow `runWatchdogFinish` inline | One file; 37 lines today | Mixes timer with message chrome |
| **B** | **`finishLoading` then new helper, same turn** (rec) | Q9 job first; overlay still lifts if dialog/`message` missing; same as live `reportRenderFailure`; portal `z-index: 100000` already above overlay `1000` | One vsync of spinner under dialog (harmless; finish is `setTimeout(0)`) |
| C | Dialog **before** `finishLoading` (legacy) | Legacy call order | No stacking gain (first paint same); if dialog throws, overlay can stick |
| D | Flag inside `finishLoading` / `removeLoadingOverlay` | One finish path | Pollutes every finish caller |
| E | `onTimeout` on `startLoading` / `KDB.js` | loadingService stays overlay-only | `KDB.js` beyond bootstrap; explicit PO |
| F | Hold overlay until OK | Hides incomplete canvas | White cover + backdrop sandwich; overlay is not full-viewport; fights Q9 |

**Recommendation:** **B**. Do not wait for overlay paint (naked incomplete-dashboard flash). Portal already wins stacking. Reject C/F on facts, not taste. Reject D, E.

### Q2 — chrome (WP7 stance; do not steal WP6)

WP6 Draft exists (`cubes-unavailable-home-dialog-contractdelta.md`). Series OPEN on **detector** A cancel vs B new dataSources facet. Live cognosHost: **no** close/minimize. Live `choose` = body N choices + **always** footer `Nein` + header ×. Tab-move is not this shell.

This copy never mentions Startseite / schließen / minimalisieren. After `finishLoading` the spinner is gone; Cognos chrome can still leave the dashboard. Hole = **no explanation**.

| | Option | Pros | Cons |
|---|---|---|---|
| A | Wait for WP6 Approved `choose` + nav ops | One shell if WP6 ships | Blocks an independent timeout message on WP6’s detector PO |
| B | `showAlert` one-OK **forever** | Matches informational copy | Refuses program reuse if WP6 later ships a helper |
| **C** | **`showAlert` now; swap to WP6 helper later** (rec) | Unblocks WP7; existing method; no competing shell; swap is copy-only | If WP6 never ships, chrome stays one-OK (acceptable for this sentence) |
| D | WP7 invents `choose` + nav now | Two Startseite buttons | **Forbidden:** competing shell; no host ops; Q3 Glass hack; loadingService must not map nav; raw `choose` would add footer **Nein** the sentence never asked |

**Recommendation:** **C**. `showAlert({ title, message, severity: "warning" })`; omit `acknowledgeLabel` → default `OK`. Later copy pack for a WP6 helper: same title/body; **ids/labels for Startseite stay WP6-owned**.

Do **not** re-ask PO “keep or cancel WP6” on this WP.

### Q3 — file split

| | Option | Pros | Cons |
|---|---|---|---|
| A | Grow `scheduleLoadingWatchdog.js` only | Fits 150/10 | Mixes Q9 timer with dialog |
| **B** | **New `showLoadingWatchdogDialog.js`** + timer calls it (rec) | Clear ownership; overlay files stay under AMD cap | Extra file |
| C | Extra `loadingDialogLabels.js` | Isolates dialog copy | Extra orch AMD; captions already in `loadingLabels.js` |

**Recommendation:** **B** + add keys on existing `config/loadingLabels.js` (19 lines, `_KDB.config.labels.de.loading`).

**Must not grow / must not edit:** `applyLoadingOverlay.js` (100 / AMD 7), `createLoadingService.js` (90 / AMD 6), `dashboardPdf/effects/manageLoadingSession.js`, `KDB.js`, `createMessageService.js`, tab-move `choose`, WP6 detector / `manageLoadingSession.js`.

### Q4 — session gate

Grep: boot key used as `startLoading` **only** in `KDB.js` (`startDashboardInitialization` when `KDBPlayLoadingImageToggle === true`). SET uses `writeback-set-loading` and **cannot** coalesce. Play-loading off / finish before 300s → no dialog. Same-key re-start would reset the timer; boot does not overlap.

| | Option | Pros | Cons |
|---|---|---|---|
| **A** | **`mountKey === "kdb-root-loading-animation-mount"`** (rec) | Approved overlay-coverage identity; unique live caller; `runWatchdogFinish` already has `mountKey` | Document the string; rename = WP7 follow-up |
| B | `messageKey === "dashboard"` | Today unique | Not passed into `runWatchdogFinish`; catalog reuse would false-fire |
| C | `startLoading({ watchdogDialog: true })` | No string coincidence | Public API + `KDB.js` |
| D | `watchdogMs === 300000` | Looks like “5 minutes” | Every non-PDF session is 300000; handler does not receive `watchdogMs` |

**Recommendation:** **A**. Captain locks this as engineering. Do not fire on: `kdb-widget-render-loading-*`, `kdb-tab-page-loading`, `kdb-metrics-tree-loading`, `kdb-control-save-load-slot-loading`, `writeback-set-loading`, `writeback-get-persist-loading`, `dashboard-pdf-export`.

---

## 3. Closed product decisions (intent)

| # | Lock |
|---|---|
| 1 | Timing **stays** `DEFAULT_WATCHDOG_MS = 300000`. Do not change the default. Do **not** change PDF `watchdogMs` **1800000**. |
| 2 | Watchdog **still** `finishLoading` (Q9). Dialog is **plus**, same turn, **after** finish. |
| 3 | Copy (exact DE) — title + body in §1. Keys under `_KDB.config.labels.de.loading.*` (names candidates). Empty/missing label → `console.warn`, no hardcoded DE in the helper. |
| 4 | Dialog **only** for boot `mountKey` `"kdb-root-loading-animation-mount"`. |
| 5 | **Chrome:** WP6 `presentHomeChoice` (two Startseite + header `×`; no footer Nein). Watchdog copy pack = title/body only. Button labels + `navInstruction` stay `labels.de.homeDialog`. `homeDialog` maps nav. loadingService does **not** call cognosHost or `choose` directly. Do **not** make WP7 close-only. |
| 6 | Existing `messageService` methods only. No new method. No native `alert`. No Glass footer two-button hack (`messageService.md` Q3). |
| 7 | Do **not** put overlay on canvas. Do not move the boot overlay onto `.pagegenericPage`. |
| 8 | No new events. No new `_KDB` namespace / lifecycle term. No new cognosHost facet/op **in loadingService**. `KDB.js` WP6 wiring only (not WP7). |
| 9 | Missing `presentHomeChoice` / `message.choose`: still `finishLoading`; `console.warn`; no throw. |
| 10 | Do not invent cube detection (WP6). Do not start WP2 / SSS / wave-1 numbers. |

---

## 4. Candidates (inputs until PO go)

| Path | Candidate role |
|---|---|
| `KDB3/js/core/services/loadingService/effects/scheduleLoadingWatchdog.js` | Keep timer + `finishLoading`. After fire: if boot `mountKey`, call helper. AMD 1→2. |
| `KDB3/js/core/services/loadingService/effects/showLoadingWatchdogDialog.js` | **New.** Boot-key gate already done by caller. Read `labels.de.loading` title/body; call `runtime.homeDialog.presentHomeChoice`. try/catch. No timer. No nav. |
| `KDB3/js/core/services/loadingService/config/loadingLabels.js` | New keys for title + body only. Overlay captions unchanged. |

Live fire path today: `startLoading` → `applyLoadingOverlay` → `scheduleLoadingWatchdog` → timeout → `runWatchdogFinish` → `finishLoading` only.

---

## 5. Out of scope

- PDF overlay session (`manageLoadingSession.js`, `watchdogMs: 1800000`).  
- WP6 cubes detector / `hasErrorDataSource` / `KDB.js` render-fail `showAlert`.  
- Tab-move `choose` (position picker).  
- Glass Type2 footer poll / clone / `kdb-two-button-footer`.  
- Overlay-coverage mount/CSS. Caption sandwich.  
- New `messageService` methods. Invert alert, geodata, SSS.

---

## 6. Acceptance (product)

1. Boot overlay still times out at **300s** and **always** `finishLoading` (overlay teardown unchanged when count hits 0).  
2. That boot timeout **also** shows the German title/body in §1 plus the two Startseite actions (WP6 helper).  
3. Widget / tab / metrics / save / restore 300s watchdogs: **finish only**, no this dialog.  
4. PDF 30-minute watchdog unchanged; no this dialog.  
5. No overlay drawn on the canvas.  
6. No second choose-chrome in loadingService (call WP6 helper only).  
7. Missing helper / `choose`: overlay still finishes; warn; no throw.  
8. Play-loading off, or boot finished before 300s: no this dialog.

---

## 7. Parent one-liners (after dual review of JS, not before)

- `loadingService.md` Q9: timing unchanged; boot watchdog **may** present the WP6 home dialog with this copy (not PDF / non-boot keys).  
- `loadingService.md` §7: watchdog helper calls `runtime.homeDialog.presentHomeChoice` (no new public loading method).  
- `messageService.md`: no method add; Q3/Q10 unchanged. WP6 owns nav mapping.

---

## 8. Open questions (PO)

**None remaining.** Cognos green 2026-09-08. PROGRAM **7** `[x]`.

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-08 | Draft | coordinator + army | Series **open**. Live matches parent Q9. |
| 2026-09-08 | Draft | coordinator + army | Second pass: stacking A; chrome C (`showAlert` now); gate A unique boot key. WP7 PO list emptied. |
| 2026-09-08 | **Approved** (mechanism) | PO via WP6 captain | Chrome **A**: `presentHomeChoice`. `showAlert` fallback cancelled. Spec `home-dialog-wp6-wp7-execution-spec.md`. |
| 2026-09-08 | JS dual-review | implement captain + army | No FAIL. Watchdog → `presentHomeChoice`. PROGRAM **7** still `[ ]` until Cognos green. |
| 2026-09-08 | PO follow-up | PO vastenburg | Inherits `showCancel: false` from `presentHomeChoice`. |
| 2026-09-08 | Cognos-test follow-up | PO + WP6 captain | Inherits shorter WP6 button labels + `navInstruction` concat. Watchdog title/body unchanged. Keep both Startseite ids. |
| 2026-09-08 | Copy/layout inherit | PO + WP6 captain | Inherits `Wechseln Sie zur Startseite.` + scoped equal-width choices in `messageService.css`. Watchdog title/body unchanged. |
| 2026-09-08 | Cognos green | PO vastenburg | PROGRAM **7** `[x]`. Hygiene army NIT only. |
