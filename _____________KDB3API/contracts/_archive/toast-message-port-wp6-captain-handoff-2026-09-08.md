# Launch prompt — toast-port captain (WP6)

Paste into a **fresh** agent chat. Do **not** continue wave-1 chats. Do **not** load `agent-transcripts`.

You are **planner / team captain**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`). PO = vastenburg. Talk **Dutch**. Artifacts **English**; UI German under `labels.de.*`.

**You are WP6 only** (investigation **#6** of 8 — cubes unavailable home dialog). Wave 1 is `[x]`. Do **not** take WP2, WP7 (except: you **own the shared dialog shell** WP7 will reuse), SSS, or wave-1 numbers.

---

## Start here (this order)

1. `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` — standing orders + **row 6** only.
2. Naslag **Number 6 only**: `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md`
3. Stub **§WP6 + review notes WP6 + Open Question 5–6**: `contracts/futureTodo/toast-message-port-wave2-2026-09-07.md`
4. `feature-structure.mdc` (workflow). **`KDB.js` beyond bootstrap wiring needs explicit PO.**

There is **no** Draft delta yet. First deliverable: Draft `contracts/…-cubes-unavailable-contractdelta.md` (name with PO). **Proposal series open.** **No JS.** Do **not** dump `KDB.js` into this thread — army may grep `hasErrorDataSource` / cube / `Daten-Cubes` and report **file:line only**.

**First PO line (Dutch):** “WP6 is Stub; geen `hasErrorDataSource` in live JS (review 2026-09-07); ik start Draft + proposal series; ik fake geen cube-detector; geen JS.”

---

## Product intent (not mechanism)

- Legacy: detector → Type2 dialog, two actions (close dashboard / minimize).
- Current: **no** `hasErrorDataSource`. `message.choose` today is tab-move only (not nav). `KDB.js` `showAlert` is generic render-fail.
- Do **not** revive Glass footer two-button hacks. Do **not** invent a new `messageService` method — `choose` exists.
- Navigation ids: service returns id; **consumer** maps to Cognos close/minimize (`messageService.md` Q10 style).

---

## Proposal series (mandatory)

≥2 options, pros/cons, one recommendation, for at least:

1. **Detector:** cancel WP6 vs find a live equivalent vs new poll (needs **explicit PO** + likely `KDB.js`). **Do not fake** cube detection. Review-captain fact: ZERO `hasErrorDataSource` in `KDB3/js`.
2. Dialog surface: `message.choose` vs `showAlert` vs other existing method.
3. Who owns mapping choose-ids → host close/minimize (not WP7’s job to invent a second shell).
4. Shared chrome with WP7 (same shell, different copy) vs WP7-only `showAlert` if you recommend **cancel WP6**.

`KDB.js` edits are **out** until PO says yes.

---

## WP7 coordination

You design the **shell**. WP7 is a second caller. Do not write WP7’s delta. If you recommend cancel WP6, say so to PO — WP7 then uses one-OK `showAlert` fallback.

---

## Do not

Dump `KDB.js`. Fake `hasErrorDataSource`. Start WP2/SSS. Tick PROGRAM **6** before Cognos green.
