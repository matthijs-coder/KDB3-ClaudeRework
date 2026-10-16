# Launch prompt — implement WP6 + WP7 (one chat)

Paste into a **fresh** agent chat. Do **not** continue the WP6 captain chat. Do **not** load `agent-transcripts`. Do **not** reopen the proposal series.

You are **planner / team captain**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`). PO = vastenburg. Talk **Dutch**. Artifacts **English**; UI German under `labels.de.*`.

**You implement WP6 and WP7 in this chat.** Detector, shell, nav, `KDB.js` wiring, and the 300s watchdog caller. Not WP2, SSS, or wave-1.

PO 2026-09-08: **KEEP WP6**. Filename OK. Go with captain recommendations: live `choose` (footer `Nein` + `×`); WP7 = **second caller** of `presentHomeChoice` (not `showAlert`). Mechanism **Approved**. PROGRAM boxes 6 and 7 stay `[ ]` until Cognos green.

---

## Start here (this order)

1. `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` — standing orders only (256k, army writes/reviews, no new `messageService` method).
2. `_____________KDB3API/contracts/home-dialog-wp6-wp7-execution-spec.md` — **law for files**. Exclusive allowlist.
3. `_____________KDB3API/contracts/cubes-unavailable-home-dialog-contractdelta.md` — locked package.
4. `_____________KDB3API/contracts/loadingService-watchdog-dialog-contractdelta.md` — locked WP7 (ignore leftover “showAlert now” prose in old Q2; the **locked table** wins).
5. `feature-structure.mdc` + `cognos-adapter.mdc`.

**First PO line (Dutch):** “WP6+WP7 mechanism is Approved; ik echo Section A; daarna JS op de allowlist; ik heropen de series niet; geen `showAlert` voor WP7; geen Glass-hack; PROGRAM 6/7 blijven open.”

---

## Directive product

**WP6:** boot, after spinner (`KDB.js` 327) before `startModules` (328), **await** cubes dialog if `cognosHost.dataSources.hasErrorDataSource` is `ok && data === true`. Copy: `Daten-Cubes nicht verfügbar` + body lock + `Startseite, Dashboard schließen` / `… minimalisieren`. Ids `home-close` / `home-minimize`. Close = ring-1 `location.replace` via `getDashboardBiBaseUrl` + `?perspective=home`. Minimize = `openAppView("home")`. Nein/×/Escape = stay, then mount.

**WP7:** `runWatchdogFinish` still `finishLoading` first; then if `mountKey === "kdb-root-loading-animation-mount"` call `showLoadingWatchdogDialog` → `presentHomeChoice` with loading watchdog title/body. Timing 300000. PDF 1800000 untouched.

**Adapter:** inner `cognosAPI` only from `cognosHost`. `homeDialog` and loading deep files use **stamps**. No `_KDB.services.homeDialog`. No `_KDB.cognosAPI` from `KDB.js` (except existing namespace mount/unmount).

---

## How you work

- Echo spec Section A (14+ one-liners) **then write files the same turn**.
- Army (`generalPurpose`) writes; exclusive allowlist. Second Grok pass: contract↔code after JS (file:line). Review briefs short.
- If a file would exceed JS 150 / orch 120 / AMD 10: stop, split, do not silently grow (except `KDB.js` ≤500 wiring).
- Do not dump `KDB.js` in chat.

---

## Do not

Re-open cancel WP6. Poll. tableData fake. WP7 `showAlert`. New `messageService` method. Hide `Nein`. Glass two-button footer. Tick PROGRAM 6/7. Commit unless PO asks. Touch `createMessageService.js` / tab-move / PDF `manageLoadingSession.js` / `createLoadingService.js` / `applyLoadingOverlay.js`.
