# Launch prompt — post-NMS-slim futureTodos (history → parameterSet gaps → optional folders)

Paste into a **fresh** agent chat. Planner + Composer 2.5 implement/review + Grok cross-review.
PO = vastenburg. Tests in Cognos. Module Contract First.

Do **not** redo WP-SLIM. Do **not** continue overdesign. Re-read live files.
This prompt **points** at existing futureTodo / contract files; do not invent a
fourth backlog.

---

COMPLEX TASK — KDB3 remaining product work after NMS dest-write slim + Cognos
green. Execute in this **order**. Last task is folder regroup and is **optional**.

Project root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`
Target: `_____________KDB3API/`
Branch: `tabs`. Do **not** push. Commit only if PO asks.

AUTHORITY (highest first):
- architecture/stateOwnership.md
- architecture/projectStructureRules.md
- _____________KDB3API/.cursor/rules/ (do not edit .mdc)
- contracts/writeback.md
- contracts/tabs-tabCrud-contractdelta.md (§7 History / D-CRUD-2)
- contracts/nativeMultiSelect.md (live kale owner; `pageContextPlain` is gone)
- contracts/historyService.md
- contracts/futureTodo/nms-slim-handoff-launch-prompt.md (**DONE** 2026-08-16)
- contracts/futureTodo/parameterSet-tabMutation-consolidation-refactor-prompt.md
  (WP0–WP8 — do not redo; WP5 not merged)
- contracts/futureTodo/writeback-restore-deferred-backlog.md
- contracts/futureTodo/pageContextPlain-filter-owner-backlog.md
  (historical; live owner is `nativeMultiSelect` — treat P0/P1 notes as stale
  where they conflict with `nativeMultiSelect.md`)

Predecessor (closed):
`contracts/futureTodo/nms-slim-handoff-launch-prompt.md`
WP-SLIM + widget layout keepers + PO Cognos smoketest **green 2026-08-16**.
Dest write is name+dest scope; source clear is itemId; dest-miss skip+warn;
no `filterScopeMatchesTarget`; GET page collect is `listUnowned(scopeId)` only.

**T1 closed 2026-08-16.** T2 live:
`contracts/futureTodo/t2-parameterSet-gaps-launch-prompt.md`.
As-built 2026-08-17 (not parked, not Cognos-green):
`contracts/futureTodo/writeback-restore-deferred-backlog.md` § T2 as-built.
Do **not** continue T2 in the T1b kale-history chat.

---

## 0. Closed — do not reopen

- NMS tab-MOVE dest-write slim (name + dest scope; dest `itemId` in `byScope`).
- Widget GET/SET x,y keepers (`collectWidgets`, `placeSerializedWidgetEntry`,
  drop `tabId` on `PLACE_ON_CANVAS_SUCCEEDED`).
- WP0–WP4, WP6–WP8 consolidation. **WP5 not merged** (restore-batch ≠ seed).
- NMS GET/SET global kale without `tab` (P2). Tab-CRUD still does **not**
  permute global — that is design, not a gap.
- Canvas-discovery (`readCanvasDiscoverySources` / `discoverCanvasWidgets` /
  `waitForScopedShells`).

Line budget: JS ≤150, orchestrator ≤120, controller fn ≤60, ≤10 AMD imports.
No `helpers/` `common/` `misc/` `shared/`. No new `_KDB.*` without PO.
Shared tabMutation kernel stays
`KDB3/js/core/utils/filters/tabMutationRun/` (stateless AMD, **not** on
`_KDB.utils` / api / services). Do not add `_KDB.services.tabMutation`.

---

## T1 — History (product; contract first; PO GO per owner)

Inventory and authority live in
`contracts/futureTodo/nms-slim-handoff-launch-prompt.md` **§6**.
Do not invent `history/` inside an owner that has no history files today.
historyService never writes owner state. Parameter restore / tab-mutation
already use `skipHistory: true` — keep that unless the new contract says
otherwise.

| Owner | Today | This task |
|---|---|---|
| SS / DS / sicht / header / footer / kdbControl / widgetBase / widgetSettings / widgetText | already have history | do **not** rebuild |
| `widgetVis` | no `widgetVis/history/` | check live whether vis-option undo is settings-owned; only add if PO confirms a gap |
| `tabs` | **no frames** (D-CRUD-2) | **first history product**: write `contracts/tabs-history-contractdelta.md` (move first), wait PO GO, then implement. Replay via `_KDB.api.tabs.dispatch` + `isHistoryReplay`. See `tabs-tabCrud-contractdelta.md` §7 |
| `nativeMultiSelect` | **no history** (P0: no history/events) | kale value undo is **new product**. Contract update of `nativeMultiSelect.md` **before** code. PO GO required. Follow SS/DS `history/` pattern if approved |
| `specialSingleSelect` | SET sync only | out of this run unless PO picks it |

STOP after each contract. Do not implement history for tabs and NMS in one
undiscussed blob. Tabs-history (move) before NMS kale-history unless PO
reverses that.

Cognos after each approved history WP: undo/redo of that owner only.
Do not expect kale undo until the NMS history WP is done.

**T1 closed 2026-08-16 (do not reopen):**
- T1a `tabs_move` — Cognos green (MOVE → Undo → Redo). Nested owners `skipHistory`.
- T1b kale-value undo — Cognos green (`filter_nativeMultiSelect`; filterDock confirm-only; DOM labels + `{d,u}` map; no poll).
- `widgetVis/history/` — skip (settings-owned).
- `specialSingleSelect` history — out unless PO picks it.

---

## T2 — ParameterSet / writeback product gaps (PO picks; not missing glue)

**T2 item 2 closed 2026-08-16** (classification, not restore). See `contracts/writeback-t2-item2-contractdelta.md`.
**T2 item 3 closed 2026-08-16** (skip-by-design, not restore). See `contracts/writeback-t2-item3-contractdelta.md`.

These are **expres not in the current pipeline** unless PO promotes them.
Source lists (read, do not copy into a mega-spec):

- `nms-slim-handoff-launch-prompt.md` **§5** “Expres níet”
- `contracts/futureTodo/writeback-restore-deferred-backlog.md`
- `contracts/writeback.md` (v3 schema; missing dest = skip, no host create)

Candidate items (each needs its own contract delta + PO GO before code):

1. v2-import / `writebackMap` (today: skeleton; v2 → `WRITEBACK_UNSUPPORTED_LEGACY_FORMAT`)
2. `tbl` / `topn` widgets, `widget-localFilters`, launchpad-only widgets — **closed 2026-08-16** (classification, not restore; `writeback-t2-item2-contractdelta.md`)
3. Special/multi-filters outside `sels` and `pcfs` — **closed 2026-08-16** (`writeback-t2-item3-contractdelta.md`)
4. status `"sichtChange"` (rejected / reserved — see deferred backlog §5.1)
5. Header-icoon (`head.icon`)
6. `classifyFilterInstance` `HOST_ITEM_UNKNOWN` silencing (accepted leftover —
   do not “fix” unless PO wants a diagnostic policy change)
7. Other deferred writeback items in `writeback-restore-deferred-backlog.md`
   (canvas-barrier 2.1, abort activeIndex, `waitForInflightTraversals`, …)

Planner presents a **short pick-list** to PO at the start of T2. Implement
**only** what PO selects, one item (or one tightly bound pair) per WP, Cognos
between WPs. Do not start the whole list.

NMS SET dest-write already uses `lookupNativeMultiSelectApiByName`. Tab-mutation
must keep using that lookup **without** calling `parameterSetHostApply` (SET
codes `SKIPPED` / `RESTORE_FAILED` stay out of tab-mutation). Dest-miss for
kale stays skip+warn, `ok: true`. Do not flatten onto DS/SS apply-fail.

---

## T3 — Folder regroup (**last**, **optional**, explicit PO GO)

Not required for behaviour. SS / DS / NMS `actions/` are all still **flat**.
Do **not** move NMS alone (three owners would diverge). Skip unless PO says
**GO folder regroup** after T1/T2 are done or explicitly parked.

If GO, one WP covering **nativeMultiSelect + singleSelect + dienststelle**:

- `actions/tabMutation/` — prepare/apply/delete/move/duplicate/restore/resync +
  owner `tabMutationSupport` / writes
- `actions/parameterSet/` — route/clear/restore/hostApply/context + GET collect
  where it lives in `actions/`
- `effects/parameterSet/` **only** if an effect is parameterSet-specific.
  Shared lookups (`lookupNativeMultiSelectApi`, `lookupNativeMultiSelectApiByName`,
  `listUnownedNativeMultiSelectItems`, `stripTabpanel`) stay in `effects/`
- **No** `history/` under NMS unless T1 already created NMS history files
- **No** second tabMutation kernel; no `_KDB.services.tabMutation`
- Behaviour-neutral: AMD paths + contract folder trees only. Diff-walk
  callers/return shapes/diagnostics. Then Cognos MOVE + `set(get())`

Preferred layout remains `config/ state/ view/ effects/ adapters/ events/`.
Vague folder names forbidden (`helpers/` `common/` `misc/` `shared/`).

If PO says skip: record “folders remain flat” as-built on the three owner
contracts and stop.

---

## Process

1. Planner: read live files + this prompt + pointed futureTodos. Confirm T0
   closed. Present T1 contract plan; wait PO GO.
2. Composer 2.5 implement one WP; Composer initial review; Grok cross-review;
   planner final.
3. STOP for PO Cognos after each WP that touches host behaviour.
4. Repeat for the next PO-picked item.
5. T3 only after T1/T2 finished or parked, **and** explicit PO GO. Optional.

FORBIDDEN without PO: new `_KDB.*`, `.mdc` edits, canvas-discovery, WP5 merge,
reopening dest-write alias matching, mixing SET diagnostic codes into
tab-mutation, creating NMS `history/` without a contract, folder moves before
T3 GO, flattening NMS dest-skip into apply-fail.

SUCCESS: remaining product items from §6/§5 of the slim handoff are either
implemented under a contract + Cognos, explicitly PO-deferred, or (folders)
left flat by PO choice. Working tree on those paths is not a mixed overdesign.
