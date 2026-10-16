# Launch prompt — toast-port captain (WP7)

Paste into a **fresh** agent chat. Do **not** continue wave-1 chats. Do **not** load `agent-transcripts`.

You are **planner / team captain**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`). PO = vastenburg. Talk **Dutch**. Artifacts **English**; UI German under `labels.de.*`.

**You are WP7 only** (investigation **#7** of 8 — 5-minute load watchdog dialog). Wave 1 is `[x]`. Do **not** take WP2, WP6’s detector, SSS, or wave-1 numbers.

---

## Start here (this order)

1. `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` — standing orders + **row 7** only.
2. Naslag **Number 7 only**: `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md`
3. Stub **§WP7 + review notes WP7 + Open Question 5–6**: `contracts/futureTodo/toast-message-port-wave2-2026-09-07.md`
4. `feature-structure.mdc` (workflow). Do **not** dump `KDB.js`.

There is **no** Draft delta yet. First deliverable: Draft watchdog-dialog contractdelta from the stub. **Proposal series open.** **No JS.**

**First PO line (Dutch):** “WP7 is Stub; timing 300s blijft; ik schrijf Draft + proposal series; ik raak PDF-watchdog niet; geen JS. Shell volgt WP6 tenzij PO WP6 cancelt.”

---

## Product intent (not mechanism)

- Legacy: 300s → **same shell as WP6**, different title/body (`Dashboard nicht vollständig geladen` / 5-minute copy).
- Current: `scheduleLoadingWatchdog.js` `DEFAULT_WATCHDOG_MS = 300000` then **only** `finishLoading`. Timing stays.
- **Must not:** change PDF `watchdogMs` `1800000` (`dashboardPdf/effects/manageLoadingSession.js`). Do not put overlay on canvas. Do not invent a second choose-chrome if WP6 is building one.

---

## Shared shell with WP6 (hard)

- WP6 **owns** the two-action home-dialog chrome (`message.choose` + nav mapping), if PO keeps WP6.
- You are a **second caller** with watchdog copy.
- If WP6 is **cancelled**: fallback is `showAlert` with one OK (ask PO in your series — do not implement a second Type2 shell).
- You may **research in parallel** with WP6. You must **not** lock a competing shell. If WP6’s recommendation is not in yet: list options including “reuse WP6 chrome” and “showAlert fallback”; recommendation may be **blocked on WP6**.

---

## Proposal series (mandatory)

≥2 options, pros/cons, one recommendation, for at least:

1. Where to hook after the 300s timer (still `finishLoading`, plus dialog — where).
2. Reuse WP6 `choose` vs `showAlert` one-OK if WP6 cancelled.
3. File split in `loadingService` (do not grow files past 150 / AMD 10).

---

## Do not

Touch PDF overlay watchdog. Fake cube detection (WP6). Start WP2. Tick PROGRAM **7** before Cognos green.
