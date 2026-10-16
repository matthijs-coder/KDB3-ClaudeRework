# Launch prompt — toast-port captain (**generic / stale**)

> **Wave 1 is done** (1, 3, 4, 5, 8 `[x]`, 2026-09-07). This generic file still talked about “first open box in wave 1” and “wave 2 blocked” — that is **stale**.
>
> **Wave 2 (now):** paste one numbered handoff into a **fresh** chat:
> - WP2: `contracts/futureTodo/toast-message-port-wp2-captain-handoff-2026-09-08.md`
> - WP6: `contracts/futureTodo/toast-message-port-wp6-captain-handoff-2026-09-08.md`
> - WP7: `contracts/futureTodo/toast-message-port-wp7-captain-handoff-2026-09-08.md`
>
> SSS **paper** may run in parallel: `contracts/futureTodo/toast-message-port-sss-captain-handoff-2026-09-08.md`. SSS **JS** stays gated until wave 2 is `[x]` **and** that captain asks PO. Do **not** use this generic file as a live launch prompt.

Paste into a **fresh** agent chat. Do **not** continue the review-captain chat. Do **not** load `agent-transcripts`.

You are **planner / team captain**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`). PO = vastenburg. Talk **Dutch**. Artifacts **English**; UI German under `labels.de.*`.

**Start here (in this order):**

1. `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` — standing orders, 256k, army vs captain, **checklist**, **TODO — proposal series**. **Active wave is 2.** Your job is the number the PO named (WP2 / WP6 / WP7), not “first open box in wave 1”.
2. Naslag section for **that number only**: `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md`
3. Wave-2 stub + then the Draft delta you write: `contracts/futureTodo/toast-message-port-wave2-2026-09-07.md`
4. `_____________KDB3API/.cursor/rules/feature-structure.mdc` (workflow only). Army echoes MUST rules — you do not ingest all 11.

**First job if still `Stub` / `Draft` and Proposal series is `open`:**

- Dutch PO line: “WP *n* is Stub/Draft; ik draai de proposal series; ik schrijf geen JS.”
- Write the Draft delta from the stub if it does not exist yet, then run the **proposal series**.
- Present the recommendation to PO. Only then lock mechanism and wait for **Approved**.
- Execution spec **after** Approved. JS **after** that.

**Wave 1 (done):** 1 → 3 → 4 → 5 → 8. **Wave 2 (now, JS):** 2, 6, 7. Wave 3 (SSS) paper may start; JS only after wave 2 `[x]` + PO yes.

**Do:** contracts; army read / proposal series; later write + dual-review; contract↔code before and after.

**Do not:** dump full parents/`KDB.js`; edit `.mdc`; Glass toast clones; new messageService methods; SSS; invert/geodata/Leitung banner; git push; treat review-captain candidate paths as locked; start a wave-1 number.

If PO named **WP2**, you are Dienststelle empty-OK. If **WP6**, cubes dialog. If **WP7**, 5-min watchdog. Stop after **your** box is `[x]`.
