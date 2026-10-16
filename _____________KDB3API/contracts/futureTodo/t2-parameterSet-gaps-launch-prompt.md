# Launch prompt — T2 parameterSet / writeback product gaps

Paste into a **fresh** agent chat. Planner + Composer 2.5 implement/review + Grok
cross-review. PO = vastenburg. Tests in Cognos. Module Contract First.

Do **not** continue the T1b kale-history chat. Do **not** reopen T0 / T1.
Re-read live files. This prompt **points** at existing futureTodo / contract
files; do not invent a fourth backlog.

Predecessor (closed):
`contracts/futureTodo/post-nms-slim-futuretodo-launch-prompt.md`
T0 slim + T1 history **Cognos green 2026-08-16**.

---

COMPLEX TASK — KDB3 T2: PO-picked parameterSet / writeback **product** gaps.
These were expres not in the T0/T1 pipeline. They are not missing glue.

Project root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`
Target: `_____________KDB3API/`
Branch: `tabs`. Do **not** push. Commit only if PO asks.

AUTHORITY (highest first):
- architecture/stateOwnership.md
- architecture/projectStructureRules.md
- _____________KDB3API/.cursor/rules/ (do not edit .mdc)
- contracts/writeback.md (v3 schema; missing dest = skip, no host create)
- contracts/nativeMultiSelect.md (live kale owner; `pageContextPlain` is gone)
- contracts/historyService.md (do not rebuild T1 history)
- contracts/futureTodo/writeback-restore-deferred-backlog.md
- contracts/futureTodo/nms-slim-handoff-launch-prompt.md **§5** “Expres níet”
  (**DONE** T0; §6 history table is **stale** — T1 shipped)
- contracts/futureTodo/parameterSet-tabMutation-consolidation-refactor-prompt.md
  (WP0–WP8 — do not redo; WP5 not merged)
- contracts/futureTodo/pageContextPlain-filter-owner-backlog.md
  (historical; P0/P1 notes stale where they conflict with `nativeMultiSelect.md`)

---

## 0. Closed — do not reopen

- **T0 / WP-SLIM:** NMS dest-write name + dest scope; dest-miss skip+warn;
  GET page collect `listUnowned(scopeId)` only. Widget GET/SET x,y keepers.
- **T1a:** `tabs_move` history. Nested owners dispatch `{ skipHistory: true,
  source: "tabsMutation" }`. Cognos green 2026-08-16.
- **T1b:** kale-value undo. Step key `filter_nativeMultiSelect`. filterDock
  confirm-only (`confirmedLabels` at native OK). `{d,u}`: `d` display (e.g.
  `"2022"`), `u` TM1 MUN. No host poll. Cognos green 2026-08-16.
- `widgetVis/history/` — skip (settings-owned).
- NMS GET/SET global kale without `tab` (P2). Tab-CRUD still does **not**
  permute global — design, not a gap.
- WP0–WP4, WP6–WP8 consolidation. **WP5 not merged** (restore-batch ≠ seed).
- Canvas-discovery (`readCanvasDiscoverySources` / `discoverCanvasWidgets` /
  `waitForScopedShells`).

Line budget: JS ≤150, orchestrator ≤120, controller fn ≤60, ≤10 AMD imports.
No `helpers/` `common/` `misc/` `shared/`. No new `_KDB.*` without PO.
Shared tabMutation kernel stays
`KDB3/js/core/utils/filters/tabMutationRun/` (stateless AMD, **not** on
`_KDB.utils` / api / services). Do not add `_KDB.services.tabMutation`.

NMS SET dest-write already uses `lookupNativeMultiSelectApiByName`.
Tab-mutation must keep using that lookup **without** calling
`parameterSetHostApply` (SET codes `SKIPPED` / `RESTORE_FAILED` stay out).
Dest-miss for kale stays skip+warn, `ok: true`. Do not flatten onto DS/SS
apply-fail.

---

## 1. First message (mandatory)

Read live contracts + this prompt. Then present **only** this pick-list to PO.
**STOP. Do not write a contract delta or code until PO names a number (or
park).**

| # | Item | Notes |
|---|---|---|
| 1 | v2-import / `writebackMap` | **Open.** Skeleton; v2 → `WRITEBACK_UNSUPPORTED_LEGACY_FORMAT` |
| 2 | `tbl` / `topn`, `widget-localFilters`, launchpad-only widgets | **Closed 2026-08-16** (contract-close, no restore WP). See `contracts/writeback-t2-item2-contractdelta.md`. |
| 3 | Special/multi-filters outside `sels` and `pcfs` | **Closed 2026-08-16** (skip-by-design, no restore WP). See `contracts/writeback-t2-item3-contractdelta.md`. |
| 4 | Header-icoon (`head.icon`) | **Implemented 2026-08-16** — `writeback-t2-item4-contractdelta.md`. Awaiting PO Cognos. |
| 5 | Writeback barriers | **5a/5b/5c code shipped, none Cognos-green.** As-built + leftovers: `writeback-restore-deferred-backlog.md` (T2 as-built 2026-08-17). Deltas `writeback-t2-item5a/b/c-contractdelta.md`. |
| 6 | Other deferred item | Name the § from `writeback-restore-deferred-backlog.md` |
| park | Park T2 | Record as PO-deferred; do not start T3 |

Do **not** start without GO:

- status `"sichtChange"` (rejected / reserved — deferred backlog §5.1)
- `classifyFilterInstance` `HOST_ITEM_UNKNOWN` silencing (accepted leftover)
- WP5 merge, canvas-discovery, T1 history, T3 folder regroup
- new `_KDB.*`, `.mdc` edits, host-item create, flattening NMS dest-skip

One item (or one tightly bound pair) per WP. Contract delta + PO GO **before**
code. Cognos after each WP that touches host behaviour. Do not start the
whole list.

If PO says **park T2**: write a one-line as-built on
`post-nms-slim-futuretodo-launch-prompt.md` (“T2 parked YYYY-MM-DD”) and stop.
Do not start T3.

---

## 2. T3 is out of this chat

Folder regroup (`actions/tabMutation/` + `actions/parameterSet/` for
**nativeMultiSelect + singleSelect + dienststelle** together) needs explicit
**GO folder regroup** after T2 is done or parked. SS/DS/NMS `actions/` are
still flat on purpose. Do not move NMS alone. NMS already has `history/` from
T1b — do not invent a second one.

---

## 3. Process

1. Planner: live files + this prompt. Confirm T0/T1 closed. Pick-list. **STOP.**
2. After PO pick: contract delta only. **STOP** for GO.
3. Composer 2.5 implement one WP; Composer initial review; Grok cross-review;
   planner final.
4. STOP for PO Cognos.
5. Repeat for the next PO-picked item, or stop if PO parks.

SUCCESS: each promoted T2 item has a contract + Cognos, or T2 is explicitly
parked. Working tree is not a mixed overdesign. No T1 files churned “while
here”.
