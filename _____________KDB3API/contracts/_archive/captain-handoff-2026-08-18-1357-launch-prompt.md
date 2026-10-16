# Launch prompt — captain handoff 2026-08-18 ~13:57

Paste into a **fresh** agent chat. Do **not** continue the 12:32 captain chat
(token context full). Recommended: sterk thinking-model as **planner /
implementation captain**; **cursor grok 4.6** for bounded investigate /
implement / review subagents. PO = vastenburg.

Do **not** re-run a full futureTodo / remaining-issues / structure-audit
inventory. Do **not** invent a fourth backlog. This prompt **points** at
existing files.

**Track P code queue is closed.** First message is a closed-list confirm, then
**STOP.** No letter to pick unless PO names new work.

---

You are the **next team captain / planner**. You do **not** write production
JS. Grok 4.6 does investigation, code, and dual review (mechanical +
semantic). Exclusive allowlists. No two writers on the same file. You do not
start a new architecture.

Project root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`
Target: `_____________KDB3API/`
Branch: `tabs`. Do **not** push. Commit only if PO asks.

Working tree is **heavily uncommitted** (Track S/R + tabs history + T3). That
is not an invitation to rewrite closed tracks or to invent a mega-commit.

AUTHORITY (highest first):

1. **This prompt** (PO leave-decision, closed tracks, forbidden).
2. Live `KDB3/js/**` + the module contract of any file you touch.
3. `architecture/stateOwnership.md`
4. `architecture/projectStructureRules.md`
5. `_____________KDB3API/.cursor/rules/` — **do not edit `.mdc`** unless PO asks.
6. Predecessor (stale first-message / pick-list; keep as-built + forbids):
   `contracts/futureTodo/captain-handoff-2026-08-18-1232-launch-prompt.md`

---

## 0. PO decisions (do not reopen)

| Decision | Meaning |
|---|---|
| T2 **GREEN** | Do not reopen v2-map, `head.icon` GET/SET, 5a/5b/5c, mapping SSOT |
| A1 / duplicate / B **Cognos green 2026-08-18** | Do not redo. Do not fold **C** into B |
| Rename history **code in** | `tabs_rename`. Host Cognos **left** (PO 2026-08-18 ~13:54). Record green only if PO later tests |
| **F NEVER** (PO 2026-08-18) | One icon forever. No picker, no `header_iconChange`. `iconKey` / `header/setIcon` stay for SET restore |
| **T3 done** 2026-08-18 | SS/DS/NMS `actions/` → `parameterSet/` + `tabMutation/`. Do not redo |
| **Leave remaining** (PO 2026-08-18 ~13:54) | C2, S16, D, E, Rename Cognos: **not this queue**. No new inventory |
| `KDB.js` / remaining **>150: leave** | Size campaign closed |
| Batch C | **C1 leave-until-bug**. C2 left |
| Captain does not write JS | Grok 4.6 exclusive allowlist |

Track S / R / R6 / mechanical splits: **done**. Do not redo.

Live tabs history keys: `tabs_move`, `tabs_delete`, `tabs_duplicate`,
`tabs_rename`. No `header_iconChange`. No `tabs_*` beyond those four.

---

## 1. First message (queue empty)

Confirm §0 closed list in one short table. Recommend **nothing to code**.
If PO is at the host and **asks** to log rename Cognos: they test; you record
on `contracts/tabs-history-rename-contractdelta.md` only. **STOP.**

Do not present F / T3 / C2 / S16 / D / E as picks. Do not re-ask Batch B,
`KDB.js`, >150, T2, A2, C/G/H, gallery.

If PO names **new** work: that WP only, live `file:line` first, compact delta,
**STOP for GO** unless they already said GO.

---

## 2. Left — not a pick-list

| Item | Status | Reopen only if |
|---|---|---|
| Rename Cognos | Code in; host left | PO tests and asks to stamp green |
| C2 disposed-shape | Leave | Live post-destroy bug, or PO names C2 |
| S16 `widget_removed` | Leave | Real remove-UI (today Löschen = launchpad park) **and** D |
| D shell-create | Leave | Live SET “no parked shell” + Cognos `createWidget` spike |
| E `dataSourceContext` | Leave | Datasource switching is a product |
| F icon picker/history | **Never** | — |
| T3 folder regroup | **Done** | — |
| N `v2FieldMap.js` | Never | — |

Owning deltas (do not redo):

- MOVE: `contracts/tabs-history-contractdelta.md`
- A1: `contracts/tabs-history-delete-contractdelta.md`
- Dup: `contracts/tabs-history-duplicate-contractdelta.md`
- B: `contracts/writeback-restore-missingShells-contractdelta.md`
- Rename: `contracts/tabs-history-rename-contractdelta.md` (`Implemented — awaiting PO Cognos`)
- T3: `contracts/filters-t3-actions-folder-regroup-contractdelta.md`
- F lock: `contracts/header.md` §10; `contracts/writeback-t2-item4-contractdelta.md`

---

## 3. Never this queue

- A2 blob; re-inventory / `nogOpen` / “v2 map not implemented”
- Reopen T0/T1/T2, WP5 merge, canvas-discovery, `sichtChange`
- Split `KDB.js` or remaining >150 **for the cap**
- Gallery split / rewrite (`buildControlPrimitiveGallery.js` **LOCKED**)
- **C** / **G** / **H** (fight 5c / 5b PO)
- New `_KDB.*`, `.mdc` edits, third audit, updating `structure-audit.md`
- Reintroduce `stage*HistoryReplayHandler.js`
- New saga import on `runTabMutationSaga.js` (**10/10 AMD**)

---

## 4. As-built (do not redo)

| WP | Status | Live pattern |
|---|---|---|
| MOVE | Cognos green 2026-08-16 | `tabs_move`; saga push; self-inverse `tabs/move` |
| A1 | Cognos green 2026-08-18 | undo = `tabs/restoreDeleted`; redo = `tabs/delete` |
| Duplicate | Cognos green 2026-08-18 | undo = `tabs/delete` clone; redo = `restoreDeleted`; **never** replay `tabs/duplicate` |
| B | Cognos green 2026-08-18 | `missingShells` number; leftover not `degraded`; page-context poll 2500ms/3 |
| Rename | Implemented; Cognos left | `tabs_rename`; push in **effects** not saga; replay resolve = payload tab, not session edit tab |
| T3 | Implemented 2026-08-18 | path-only; DS `restoreSupport.js` stays at `actions/` root |
| F | Never (one icon) | writeback spine kept; no picker JS to delete |

`applyTabsDeleteHistoryReplay.js` = delete **and** duplicate (`insertTabIdx`
number → restoreDeleted). Rename has its **own** apply. Do not overload.

Rename Cognos checklist (if PO later tests): rename → undo → redo; labels;
GET v3 names; undo while **another** tab’s inline edit is open (must **not**
rename the session tab).

---

## 5. Process (copy)

1. Read this prompt. **No audit re-read.**
2. First message: queue empty. **STOP.**
3. Named WP only: one grok 4.6 explore (`file:line`) → compact delta →
   **STOP for GO** unless already GO.
4. Grok 4.6 implements **one** WP, exclusive allowlist. Dual grok-4.6 review.
   Product nits: fix. Cosmetic nits: leave.
5. Cognos: record on the owning delta; do not wait. Do not start a Cognos
   round from silence (PO left host work).
6. Structure WPs append `architecture/structure-remediation-log.md`. Do not
   update `structure-audit.md`. Track P as-built on the owning delta.

Line budget for **new or newly split** JS: executable ≤150, orchestrator ≤120,
controller fn ≤60, ≤10 AMD imports. Not `KDB.js`. Does not justify splitting
files already over 150.

No `helpers/` `common/` `misc/` `shared/`. No leftover suffixes. No new
`stage*HistoryReplayHandler`.

Known leftover (do not “fix while here”):
- `tabs/effects/bindTabRenameEditSession.js` 9-line compatibility barrel
- `runTabMutationSaga.js` **10 AMD** (cap)
- kdbControl destroy: `abortAllControllers` before gallery `rt.listeners`
- Track S locks (widget teardown, no `Date.now` in history/metricsTree
  reducers, `KDB.js` destroy order, gallery AbortSignal, vis
  `rejectAllTopNGateWaiters`)
- P12: GET `maxUserTabs` fallback is `MAX_USER_TABS` not `Infinity`
- Batch C split is real, no live bug — C1 leave

---

## OPDRACHT — start hier

1. One grep: `collectReplayHandlers.js` still has `tabs_move` /
   `tabs_delete` / `tabs_duplicate` / `tabs_rename` and **no**
   `header_iconChange`.
2. Tell PO: Track P code queue **closed** (T3 done, F never, remaining
   letters left). Nothing to implement. **STOP.**
3. If they later name work or a Cognos stamp: that item only; captain does
   not write JS; grok 4.6 bounded.

Target is **not** more architecture and **not** a new letter queue.
