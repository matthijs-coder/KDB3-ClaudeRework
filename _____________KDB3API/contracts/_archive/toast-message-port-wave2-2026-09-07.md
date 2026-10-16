# Stub — wave 2 toast port (WP 2, 6, 7)

> **Wave-1 gate is open** (`PROGRAM` boxes 1, 3, 4, 5, 8 `[x]`, 2026-09-07). Wave 2 is the **active** wave.
>
> Captains: write **real** `*-contractdelta.md` files from this stub + naslag, run the PROGRAM **proposal series** TODO (options + pros/cons + recommendation — do not lock mechanism in the stub), present to PO, then execution spec, then army. Do not code from this stub alone. Prefer the numbered handoffs `toast-message-port-wp2-captain-handoff-2026-09-08.md` / `wp6` / `wp7`.

Program: `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md`  
Naslag: `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` §§2, 6, 7  
Captain standing orders: same as the PROGRAM (256k, army reads/writes/reviews, quality over speed).

Order inside wave 2: **2 → 6 → 7** (empty Dienststelle is local; 6 and 7 share a dialog shell — design 6 first).

---

## WP2 — Dienststelle empty OK → default toast

- **Not** restore H2/H3 (those are live writeback `notify`s).  
- Trigger: user OK on **empty** hierarchy; default applied. Skip during PS restore / cascade suppress (legacy).  
- Owner: `dienststelle` (folder currently has **zero** messageService).  
- Method: `notifyAnchored` on the filter block if connected, else `notify`.  
- Copy direction: legacy `Für den ${_filterName}-Filter ist mindestens eine Auswahl erforderlich. Ohne Auswahl wird automatisch der voreingestellte Standardwert für die (aktuellen) Reiter gesetzt.` Map `_filterName` to current Sicht names (`Dienststelle_BW` / `Dienststelle_DEZPV` or current display names — army confirms).  
- `applyDienststelleDefault.js` stays the default applier; toast is extra, not a second default.  
- **Must not:** specialSingleSelect; writeback restore copy; `KDB.js`.

---

## WP6 — Cubes unavailable home dialog

- **Shipped (await Cognos green):** `contracts/cubes-unavailable-home-dialog-contractdelta.md`  
- Spec: `contracts/home-dialog-wp6-wp7-execution-spec.md`  
- Chrome: two Startseite body choices + header `×`; `showCancel: false` (no footer Nein). Tab-move `choose` still has Nein.

---

## WP7 — 5-minute load watchdog dialog

- **Shipped (await Cognos green):** `contracts/loadingService-watchdog-dialog-contractdelta.md`  
- Second caller of `presentHomeChoice` (watchdog title/body). Timing 300s. PDF `watchdogMs` 1800000 untouched.

---

## Shared OOS for wave 2

Invert alert, geodata popover, SSS, wave-1 numbers, English dimension copy.

---

## Review notes (2026-09-07 — research only, not Approved)

Live facts for the future wave-2 captain. Do not code from this section.

### WP2 live hook

- User OK: `dashboard/filters/dienststelle/effects/routeDienststelleDispatch.js` (`clickedOk` → `runUserConfirmReconcile`). Still silent.
- Empty → `userCommit` via `resolveDienststelleReconcileMode.js`; default write via `walkDienststellePageContextScopes.js` → `applyDienststelleDefault.js`.
- `applyDienststelleDefault.js` is also used on **startup** (`reconcileDienststelleHostScopes.js`). Unguarded toast there would fire on boot. Candidate: `userCommit` / `commitFromUser` only.
- `dienststelle/` has zero `messageService`. Writeback restore `notify`s stay out (`writeback/set/effects/notifyRestoreOutcome.js`).
- No live `cascade` / `suppress` flags in current dienststelle. PS restore is a different action path (not `clickedOk`).

### WP6 live hook

- `hasErrorDataSource` / cube / `Daten-Cubes` in `KDB3/js`: **none**. `KDB.js` generic `showAlert` is render-fail only. **BLOCKED-ON-PO** — do not fake a detector. `KDB.js` beyond bootstrap still needs explicit PO.
- `message.choose` live caller today: tab-move only (`tabs/effects/confirmAndDispatchTabMove.js`) — position picker, not close/minimize.

### WP7 live hook

- `scheduleLoadingWatchdog.js`: `DEFAULT_WATCHDOG_MS = 300000` then `finishLoading` only.
- PDF `watchdogMs: 1800000` in `dashboardPdf/effects/manageLoadingSession.js` is a separate session. Do not touch.

### Open Questions (PO when wave 2 starts)

1. **WP2 toast site:** lock toast to `userCommit` / `commitFromUser` only (not startup `applyDienststelleDefault`)?
2. **WP2 `_filterName`:** both Sichten use display `visibleFilterLabel: "Dienststelle"` (`dienststelleDefinitions.js`); keys are `Dienststelle_BW` / `Dienststelle_DEZPV`. Display name vs key in the German sentence?
3. **WP2 skip set:** skip only `isHistoryReplay` + non-user defaulting (no cascade/suppress in current tree)?
4. **WP2 once vs per-tab:** global empty OK can default multiple page scopes — one toast or N?
5. **WP6:** no detector → cancel WP6, or invent a new poll (needs PO + likely `KDB.js`)? Cancel WP6 ⇒ WP7 `showAlert` one-OK fallback (already in stub).
6. **WP6/7 chrome:** who maps `choose` ids to Cognos close/minimize, and does WP7 share that shell? Tab-move `choose` is not two nav actions.
