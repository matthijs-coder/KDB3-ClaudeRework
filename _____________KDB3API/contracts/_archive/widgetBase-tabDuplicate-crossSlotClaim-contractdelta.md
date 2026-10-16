# Contract Delta: tab duplicate claims free shells from other slots when the insert slot has none

**Parents:** `contracts/tabs-tabCrud-contractdelta.md` §3.4 (shell capacity), `contracts/widgetBase-tabMutation-contractdelta.md` §2 (duplicate apply, capacity check)
**Work package:** WP-D
**Status:** `Superseded` (2026-10-06) — PO: widget DOM nodes are never moved across tabs; widgets are rebuilt on the destination slot's own (Cognos-registered) stock. Donor shells from other slots violate that model. Replaced by the tab-mutation rebuild revision (WP-R, see `futureTodo/handover-captain-prompt-2026-10-06-b.md`). §1–§2 evidence stays valid.

---

## 1. Problem (live evidence 2026-10-06)

Duplicate of the tab at position 2 (4 vis widgets) commits with `outcome: "degraded"`. Only `widgetApply` is `degraded`, `diagnostics: []`. Tabs and filters of the copy are correct, but the copy has **no widgets**. Console on the insert slot (position 3, `…765b63_00000002`): its launchpad slot holds 5 `text` and 7 `dataTables` shells (all `hasContent: yes`) and **no** `visualization` shell. Source: 4 × `kind: "vis"`.

## 2. Mechanism (verified in code)

1. Prepare serializes the source onCanvas vis/text frames and forecasts capacity on the **insert slot only** (`handlePrepareTabMutation.js:51-77`, per channel `VISUALIZATION` / `TEXT`). The forecast `expectedDegradedEntries` is stored but never read anywhere.
2. Apply shifts the onCanvas widgets right (park + take, same shells), then claims one parked shell **per entry from the insert slot's launchpad slot** for the matching pad (`placeSerializedWidgetEntry.js:30-35,122-127` → `resolveDropClaim.js:51-108`).
3. The insert slot's own vis shells were all in use on its canvas, so they moved right with its content. Its vis pad is empty → every vis claim fails → `degradedEntries` (not copied into `diagnostics`) → toast `TAB_MUTATION_DEGRADED_TEXT`.
4. Not changed today (claim, pad, `hasContent`, fill are as of `2eefcda`); WP-P / A1 are not involved. Any duplicate whose insert slot has no free vis shell of its own fails the same way.

## 3. Classification

- **(c)** Behaviour matches `tabs-tabCrud-contractdelta.md` §3.4 ("exhausted stock = per-entry degraded"), but the per-slot stock model makes the copy empty whenever the insert slot used all its vis shells.
- **(a)** `widgetBase-tabMutation-contractdelta.md:43` says the capacity forecast exists "so the saga can surface it"; it is computed and never surfaced. Per-entry failures leave `widgetApply.diagnostics` empty, so `MutationResult` cannot say why.

## 4. Design (PO 2026-10-06: fall back to other slots, then a clear message)

1. **Claim order per entry (duplicate only):** the insert slot first (today). If it has no eligible shell for the pad, try the **reveal slot** (the hidden slot the duplicate makes visible), then every other slot in ascending `tabIdx` order. Eligible = today's claim rule (parked in a launchpad slot of that pad, `hasContent === yes`). Claimed shells are then placed on the insert tab exactly as today (`takeFromLaunchpad` with `tabId: plan.insertSlot.tabId`).
2. **Capacity forecast** in prepare counts the same pool in the same order (insert slot, then reveal slot, then others) per pad. Owner-local as today.
3. **Remaining shortage:** per-entry degraded as today, plus a diagnostic per skipped entry `{ code: "WIDGET_BASE_DUPLICATE_NO_FREE_SHELL", sourceWidgetId, kind }` in `widgetApply.diagnostics`, so it reaches `MutationResult.diagnostics`. The duplicate toast shows a specific text with the number of skipped widgets (wording: D-D2).
4. **Unchanged:** delete, move, restoreDeleted, writeback restore step 24 (shared `placeSerializedWidgetEntry`: the fallback is opt-in for duplicate only), filter phases, shift, rollback (`createdWidgetIds` already covers claimed shells).
5. **Known side effect:** a shell claimed from another slot stays registered by Cognos on that slot's page (same gap as today's shifts; `futureTodo/widgetBase-cognosModelParent-futuretodo-2026-10-06.md`). The donor slot has one free shell less.

## 5. Decisions

- **D-D1 direction (PO 2026-10-06):** fallback to other slots, then a clear message.
- **D-D2 toast text:** open — proposal: "Die Registerkarte wurde kopiert, aber {n} Widget(s) konnten nicht übernommen werden: keine freien Widgets verfügbar."
- **D-D3 donor order:** reveal slot first, then ascending `tabIdx` (pre-check may propose otherwise).

## 6. Pre-check (to do)

P1 How `resolveDropClaim` / `launchpad/readSlotWidgets` can be asked for another slot without changing step-24 behaviour (option flag on `placeSerializedWidgetEntry` or duplicate-side loop); budgets (`placeSerializedWidgetEntry.js` is at 150 lines). P2 Does anything later route a widget by its **original** slot (launchpad slot id, `cor_page_id`, Cognos container at discovery/startup, GET collector, lazy routing, delete-park target) so that a donor shell misbehaves after duplicate, save, reload or undo? P3 Rollback of claimed donor shells: parked back to which slot? P4 Where the duplicate toast text and code are built (`confirmAndDispatchTabDuplicate.js`, `tabs/config/defaults.js:45`) and how to pass the skipped count. P5 Contract text sync targets.

## 7. Out of scope

Cognos model parent; content-permutation redesign (move content, not shells); shell creation; colour bugs.

## 8. Acceptance (draft)

1. Same dashboard: duplicate tab 2 → the copy shows all 4 vis widgets with correct content and filters; no toast.
2. A duplicate where the whole dashboard has fewer free vis shells than needed: copy has as many as possible; toast states the number skipped; `MutationResult.diagnostics` lists them.
3. Undo of the duplicate (if supported) / rollback on failure: no orphan shells, donor shells back in a launchpad slot.
4. Delete, move, restoreDeleted, writeback restore: unchanged.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | PO vastenburg | Live console evidence (insert slot has no vis stock); direction D-D1 chosen. |
