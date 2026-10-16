# Stub — wave 3 specialSingleSelect follow-up

> **Draft delta exists (2026-09-08):** `contracts/specialSingleSelect-parameterSetRestore-rights-notify-contractdelta.md` — proposal series **locked**, Status `Draft`. Wait for PO Approved. Still **not** a legacy-message port. Investigation 2026-09-07: both trees are **silent** for Personengruppe (Lehrlinge = alias) and Dienststellenleitung. There was nothing to copy into `messageService`.
>
> **Paper now, JS later (PO 2026-09-08).** Intake, investigation, architecture notes, Draft/Approved delta, proposal series, and execution spec **may** run while wave 2 is still open. **Production JS/CSS is forbidden** until PROGRAM wave-2 boxes **2, 6, 7** are all `[x]` **and** this captain has **asked PO** in the SSS chat whether wave 2 is done and received yes.

Program: `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md`  
Naslag: `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` §SSS  
Parents: `contracts/specialSingleSelect.md` (read after PO scopes the work)  
Launch: `contracts/futureTodo/toast-message-port-sss-captain-handoff-2026-09-08.md`

Captain standing orders: same as PROGRAM (proposal series **after** PO has scoped wishes). Army compares this stub + parent + live `specialSingleSelect/**` **only after** the PO intake below.

---

## What this wave is

A **product intake** with PO, then paper (architecture / Draft delta / spec) if (and only if) PO wants a change. The captain’s first job is to **talk**, not to invent a port and not to write JS.

Open questions for that conversation (examples, not a backlog):

- Keep current Alle/Gesamt hide (other rows choosable) vs restore legacy “lock entire popup” (`pointer-events: none` on all rows when Alle denied)?
- Any UX besides that (banner, toast, copy, focus, restore)? Default until PO asks: **no** new toasts, **no** Leitung widget-banner (dead in legacy; `specialSingleSelect.md` §17 OOS).
- Anything else PO names. The list above is **not** exhaustive and **not** a recommended solution.

---

## What is fact, not law

- Silent on hide/show/auto-default in **both** trees — not a message gap.
- Live difference: current hides Alle/Gesamt rows only; legacy locked the whole list. Documented, not a mandate to revert.
- Zero `_KDB.services.message` in `specialSingleSelect/**` today.

---

## What the captain must not do

- Treat SSS as “missing toasts from the 8-gap table.”
- Call `_KDB.services.message` “just in case.”
- Write a Draft delta that already picks Alle-lock / banner / toast **before** PO states wishes.
- Change rights tables / Sicht BW vs DEZPV visibility without an Approved delta.
- Edit `singleSelect` generic popup as if it owned special rights.
- Take WP2 / WP6 / WP7. Do not edit wave-1 or wave-2 toast deltas.
- Write production JS/CSS, tick PROGRAM **SSS**, or self-certify Cognos green **before** the implement gate below.

---

## Implement gate (hard)

Before **any** production JS/CSS (including “tiny wiring”):

1. Re-read PROGRAM checklist **Wave 2** (rows **2, 6, 7**).
2. **Ask PO in Dutch**, in this chat, a yes/no question: whether wave 2 is complete (those three boxes `[x]`, Cognos green) **and** whether SSS implementation may start now.
3. Wait for an explicit **yes**. Stale handoffs, army “it looks done”, or a Draft that is Approved are **not** enough.

If any wave-2 box is still `- [ ]`, or PO says not yet: **stop at paper**. Keep the spec ready; do not start writers on `KDB3/js/**`.

---

## Start here

1. Read naslag SSS (facts). Do **not** ingest all of `specialSingleSelect.md` until PO has a topic.
2. **Intake (Dutch):** ask what PO wants changed, if anything. Offer the Alle-lock difference as one optional topic, not as the job.
3. Only if PO wants a change: investigate live `specialSingleSelect/**` (army), write architecture notes + **Draft** delta, then proposal series (options + pros/cons + recommendation). **No JS.** After Approved: execution spec. **Still no JS** until the implement gate.
4. If PO wants **no** change: tick SSS as cancelled / OOS with a one-line log — do not invent work.
