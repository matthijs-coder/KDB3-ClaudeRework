# Launch prompt — toast-port captain (WP2)

Paste into a **fresh** agent chat. Do **not** continue wave-1 chats. Do **not** load `agent-transcripts`.

You are **planner / team captain**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`). PO = vastenburg. Talk **Dutch**. Artifacts **English**; UI German under `labels.de.*`.

**You are WP2 only** (investigation **#2** of 8 — Dienststelle empty OK toast). Wave 1 is `[x]`. Do **not** take WP6, WP7, SSS, or any wave-1 number. Ignore “first open box” if it would send you to another WP.

---

## Start here (this order)

1. `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` — standing orders + **row 2** only.
2. Naslag **Number 2 only**: `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md`
3. Stub **§WP2 + review notes WP2** (not whole file as law): `contracts/futureTodo/toast-message-port-wave2-2026-09-07.md`
4. `_____________KDB3API/.cursor/rules/feature-structure.mdc` (workflow only). Army echoes MUST.

There is **no** Draft delta yet. First deliverable: write `contracts/dienststelle-empty-ok-toast-contractdelta.md` (or the name you and PO agree) from the stub + naslag. Status `Draft`. **Proposal series open.** Then army series. Then recommendation to PO. **No JS** until Approved.

**First PO line (Dutch):** “WP2 is Stub; ik schrijf een Draft-delta; daarna proposal series; geen JS.”

---

## Product intent (not mechanism)

- User OK on **empty** Dienststelle → default applied → toast. **Not** writeback restore H2/H3 notifies.
- Owner: `dienststelle`. Method candidate: `notifyAnchored` on the filter block, else `notify`. Copy direction: legacy German with `_filterName`.
- **Must not:** SSS; writeback restore copy; `KDB.js`; unguarded toast on startup `applyDienststelleDefault.js` (also used at boot).

Live facts (inputs, not law): OK handler `routeDienststelleDispatch.js` (`clickedOk`); toast candidate `userCommit` / `commitFromUser` only.

---

## Proposal series (mandatory before Approved)

≥2 options, pros/cons, one recommendation, for at least:

1. Toast site (`userCommit` only vs other).
2. `_filterName`: display `Dienststelle` vs `Dienststelle_BW` / `Dienststelle_DEZPV`.
3. Skip set (`isHistoryReplay` + non-user defaulting; no live cascade/suppress).
4. One toast vs N when empty OK defaults multiple page scopes.
5. File split / AMD (do not grow oversized live files).

---

## Do not

Dump `KDB.js` / full `dienststelle.md`. Edit `.mdc`. Tick PROGRAM **2** before Cognos green. Start WP6/7. Invent a new `messageService` method.
