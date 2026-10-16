# Launch prompt — captain handoff 2026-08-18 ~12:32

> **Superseded** as lead prompt by
> `contracts/futureTodo/captain-handoff-2026-08-18-1357-launch-prompt.md`
> (queue closed; remaining letters left). Keep this file for as-built of the
> 12:32–13:54 session. Do not paste this one into a fresh chat.

Paste into a **fresh** agent chat. Recommended: sterk thinking-model as
**planner / implementation captain**; **cursor grok 4.6** for bounded
investigate / implement / review subagents. PO = vastenburg.

Do **not** continue the previous captain chat (token context full).
Do **not** re-run a full futureTodo / remaining-issues / structure-audit
inventory. Evidence is already consumed. Re-read **live** files only for the
WP PO names.

This prompt **points** at existing files. Do **not** invent a fourth backlog.

---

COMPLEX TASK — KDB3 continuation after T2 green + Track S/R + A1 delete
history + duplicate history + letter B + rename history. You are the **next
team captain / planner**. You implement tranche-for-tranche with exclusive
grok-4.6 allowlists. You do **not** write production JS yourself. You do not
start a new architecture.

Project root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`
Target: `_____________KDB3API/`
Branch: `tabs`. Do **not** push. Commit only if PO asks.

Working tree is **heavily uncommitted** (S/R/splits + this session’s Track P).
That is not an invitation to rewrite closed tracks or to invent a mega-commit.

AUTHORITY (highest first):

1. **This prompt** (PO decisions, predecessor recommendations, order, forbidden).
2. Live `KDB3/js/**` + the module contract of any file you touch.
3. `architecture/stateOwnership.md`
4. `architecture/projectStructureRules.md`
5. `_____________KDB3API/.cursor/rules/` — **do not edit `.mdc`** unless PO asks.
6. Pointed files (read, do not copy into a mega-spec):
   - `architecture/structure-remediation-log.md` (**append only**, structure WPs)
   - Previous handoff (partially stale on Track P; keep closed-track forbids):
     `contracts/futureTodo/captain-handoff-2026-08-17-2337-launch-prompt.md`
   - `contracts/futureTodo/post-t2-green-inventory-launch-prompt.md`
     (stale: S8–S14, Batch B, A1/dup/B/rename not in that snapshot)
   - `contracts/futureTodo/nogOpen_2026_08_17_0200.md` (02:00 snapshot; stale)
   - `contracts/futureTodo/writeback-restore-deferred-backlog.md` (§2.4 owned by B)
   - Track P owning deltas listed in §0

---

## Role (how the last captain actually worked)

You **plan, lock product, exclusive-allowlist, decide**. Subagents
(**cursor grok 4.6**) do investigation, JS, and review. Dual review
(mechanical + semantic) after every WP. Do not accept diffs blind.

Do **not** write a new `*-execution-spec.md` as a fourth backlog. The GO’d
contract delta **is** the spec; put the exclusive allowlist in the
implementer prompt.

Do **not** mix Track P with cosmetic nits (family `finally` clones,
`_planHelpers` alias, `__controller` vs sibling names). **Do** fix product
holes found in review (example: rename replay resolving via open edit session).

Cognos: **do not stop the train**. Record “Needs PO Cognos” on the delta.
PO bundles rounds. Last bundle (A1+dup+B) is **green**. Rename is a **new**
WP and still needs its own Cognos.

---

## 0. PO decisions already made (do not reopen)

| Decision | Meaning |
|---|---|
| T2 is **GREEN** | Do not reopen v2-map, `head.icon` GET/SET, 5a/5b/5c, mapping SSOT |
| A1 delete history **Cognos green 2026-08-18** | `tabs_delete` + `tabs/restoreDeleted`. Do not redo |
| Duplicate history **Cognos green 2026-08-18** | `tabs_duplicate`. Undo = `tabs/delete` clone; redo = `restoreDeleted`. **Never** replay `tabs/duplicate` |
| Letter **B Cognos green 2026-08-18** | `missingShells` on `tabWidgetsEnsureRouted` + page-context poll. Do not fold **C** |
| Rename history **code in**; Cognos **not** in that bundle | `tabs_rename`. Needs PO Cognos (labels + GET v3 names + undo during open edit on another tab) |
| Cognos smoketest **deferred per WP** | Continue coding; PO tests in a round later |
| `KDB.js` **excluded** from the 150-line rule | Never split `KDB.js` for file-size |
| Other files **>150: leave** | Size campaign closed |
| Batch B resolved | KEEP_CLICK; `window.top.WBParameter*`; SET returns `RestoreResult`; no leaf-verb campaign |
| Batch C | **C1 leave-until-bug** unless PO names **C2** |
| Captain does not write JS | Grok 4.6 exclusive allowlist; no two writers on the same file |

Track S / R / R6 / remaining mechanical splits: **done**. Do not redo.

Live tabs history keys (`collectReplayHandlers.js`): `tabs_move`, `tabs_delete`,
`tabs_duplicate`, `tabs_rename`. No `tabs_*` beyond those.

---

## 1. First message (PO has not named the next letter)

Present §2 pick-list (short). Recommend **O** until rename Cognos, or **rename
Cognos** if PO is at the host. **F only if PO names F.** **STOP.** No contract,
no code, until a letter (or Cognos-GO on rename).

Do not re-ask Batch B, split `KDB.js` / remaining >150, T2, A2, C/G/H.

T3 stays parked unless PO says **GO folder regroup**.

---

## 2. What is open — prepared, not started

### 2.1 Must still happen (PO / host)

| Item | Status | Advise | Extra info needed? |
|---|---|---|---|
| **Rename Cognos** | Code implemented; delta `Implemented — awaiting PO Cognos` | **Yes — next host round** | Checklist already on the delta. Include: undo while **another** tab’s inline edit is open (must **not** rename the session tab — replay resolve was fixed after review) |
| A1+dup+B Cognos | **GREEN 2026-08-18** | Done. Do not retest unless a regression shows | — |

Owning file:
`contracts/tabs-history-rename-contractdelta.md`

### 2.2 Prepared product letters (investigated this session; **not started**)

| Pick | What | Advise | Why / extra info |
|---|---|---|---|
| **F** | Header icon toolbox **or** `header/setIcon` history | **NEVER** (PO 2026-08-18: one icon forever) | Code already one-icon. No picker to delete. Writeback `iconKey` / `setIcon` kept. |
| **O** | Park Track P | Default for leftover letters | — |
| **T3** | Folder regroup SS/DS/NMS `actions/` | **Done 2026-08-18** | `parameterSet/` + `tabMutation/` |
| **rename** (code) | Already implemented | Do not redo | Cognos only remains |

### 2.3 Parked until PO names them (do not prepare a WP from this prompt)

| Pick | Advise | Why |
|---|---|---|
| **C2** Batch C disposed/dispatch unify | **Leave** (PO 2026-08-18) | C1 leave-until-bug. No live user-visible bug. |
| **S16** `widget_removed` replay | **Leave** (PO 2026-08-18) | No live remove UI; needs D for a real undo |
| **D** shell-create | **Leave** (PO 2026-08-18) | Needs Cognos `createWidget` spike. Reopen only if live SET hits “no parked shell” |
| **E** `dataSourceContext` | **Leave** (PO 2026-08-18) | Until datasource switching is a product |
| **Rename Cognos** | **Leave** (PO 2026-08-18) | Code in; host round whenever convenient. Not this queue. |
| **N** `v2FieldMap.js` | Never | Aliases already inline in `mapV2VisWidget.js` |

### 2.4 Never this queue

- A2 blob (delete+dup+rename in one WP) — already split across three WPs
- Re-inventory from audits / `nogOpen` / “v2 map not implemented”
- Reopen T0/T1/T2, WP5 merge, canvas-discovery, `sichtChange`
- Split `KDB.js` or remaining >150 **for the cap** (gallery, `topNGate`, `bindWidgetSettingsPanel`, `visualization.js`, historyService, kennzahlDefaults, `bindingSpecs`, `bwOldToNewMap`, `tables.js`)
- Gallery split / rewrite
- **C** global `waitFor:"canvas"` / per-widget paint on activate — fights 5c PO #3/#4
- **G** `tabs:changed` suppress whole SET / **H** filt-only success landing — fights 5b #8/#9
- Shell-create (D), `dataSourceContext` (E) without PO
- New `_KDB.*`, `.mdc` edits, third audit, updating `structure-audit.md`
- Reintroduce `stage*HistoryReplayHandler.js` (live: `createTabsHistoryReplayHandler.js` + inline stage in `__orchestratorTabs.js`)
- Hang a **new saga import** on `runTabMutationSaga.js` — **10/10 AMD**. Next mutation-history WP must split first. Rename did **not** use the saga (push in `applyTabsRenameEffects.js`)

---

## 3. Preferred order (predecessor default)

```txt
1. First message: pick-list F / O / T3 / rename-Cognos. Recommend:
   rename Cognos if PO is testing; else O (park code) or F only if they name it.
   STOP.
2. If PO says Cognos on rename: they test; you record Approved — Cognos green
   on tabs-history-rename-contractdelta.md. No code.
3. If PO names F: compact header_iconChange delta (history only). STOP for GO.
   Then grok 4.6 implement. Do not add toolbox in the same WP.
   If F needs gallery: STOP and ask.
4. If PO says GO folder regroup: T3 behaviour-neutral AMD only.
5. If PO names C2 / S16 / D: that WP only, contract first.
6. Never start F+toolbox, A2, C, G, H, size-splits from silence.
```

If PO says **O**: one-line as-built on this file (or the rename delta) and
**stop product work**.

If A1-rename Cognos is green and PO wants more code without naming F: **ask
again**. Do **not** invent a letter. The remaining advisable code WP is F
(history-only) and it is **not** worth doing without an explicit name.

---

## 4. As-built map (this session — do not redo)

| WP | Status | Owning delta | Live pattern (do not reopen) |
|---|---|---|---|
| MOVE | Cognos green 2026-08-16 | `tabs-history-contractdelta.md` | `tabs_move`; saga push; self-inverse `tabs/move` |
| A1 delete | Cognos green 2026-08-18 | `tabs-history-delete-contractdelta.md` | `tabs_delete`; undo = **`tabs/restoreDeleted`** (not another delete); redo = `tabs/delete` |
| Duplicate | Cognos green 2026-08-18 | `tabs-history-duplicate-contractdelta.md` | `tabs_duplicate`; inverted vs delete: undo = `tabs/delete` clone; redo = `restoreDeleted`; **never** `tabs/duplicate` on replay (new ids + stock leak). `parkedWidgetIds` = `created[].widgetId`, **not** parked−moved. Filter slice = **SOURCE** at prepare |
| B | Cognos green 2026-08-18 | `writeback-restore-missingShells-contractdelta.md` | Phase `missingShells` number; leftover shells **not** `degraded` (would flip SET). ≤2 extra ensures. Page-context poll 2500ms/3 then still `TARGET_MISSING`. 5c activate files **untouched**. Not C |
| Rename | Implemented; **Needs PO Cognos** | `tabs-history-rename-contractdelta.md` | `tabs_rename`; self-inverse `tabs/rename`; push in rename **effects** (not saga). Replay: `preserveEditSession` + skip cleanup. **Replay resolve:** `isHistoryReplay` / `source:"historyReplay"` uses payload `tabIndex`/`tabId`, **not** `sessionTabIndex` |

Delete undo is **not** self-inverse. Duplicate redo is **not** a fresh duplicate.
Rename **is** self-inverse (MOVE-class).

`applyTabsDeleteHistoryReplay.js` serves **delete + duplicate** (distinguisher:
`typeof insertTabIdx === "number"` → restoreDeleted, else delete). Rename has
its **own** apply module. Do not overload further.

---

## 5. Process (copy)

1. Read this prompt. **No audit re-read.**
2. First message: §2 pick-list. **STOP.**
3. After a named letter: one grok 4.6 explore (`file:line`) of **that** item
   only. Then compact contract delta. **STOP for GO** unless PO already said
   GO on that letter.
4. Grok 4.6 implements **one** WP, exclusive allowlist, no two agents on the
   same file. Captain reviews via two grok 4.6 reviewers (mechanical +
   semantic). Product nits: fix. Cosmetic nits: leave.
5. Cognos: record on the delta; continue. Do not wait.
6. Track P as-built on the **owning contract delta**. Structure WPs append
   `architecture/structure-remediation-log.md`. Do not update
   `structure-audit.md`.

Line budget for **new or newly split** JS: executable ≤150, orchestrator ≤120,
controller fn ≤60, ≤10 AMD imports. **Does not apply to `KDB.js`.** Does not
justify splitting files already over 150.

No `helpers/` `common/` `misc/` `shared/`. No leftover suffixes. No new
`stage*HistoryReplayHandler`.

Known leftover (do not “fix while here”):
- `tabs/effects/bindTabRenameEditSession.js` 9-line compatibility barrel
- `runTabMutationSaga.js` **10 AMD imports** (cap)
- kdbControl destroy: `abortAllControllers` before gallery `rt.listeners`
- Track S locks (widget teardown, no `Date.now` in history/metricsTree reducers,
  `KDB.js` destroy order, gallery AbortSignal, vis `rejectAllTopNGateWaiters`)
- P12: GET `maxUserTabs` fallback is `MAX_USER_TABS` not `Infinity`
- Batch C split is real, no live bug — C1 leave

---

## 6. Predecessor note to PO (already sent; do not re-litigate)

Default remaining: **rename Cognos** (host) then **O** or named **F**
(history-only). T3 / C2 / S16 / D / remaining >150 / gallery: not in the
default queue.

F is the original “smaller alt” to A1. Context changed: A1/dup/B are green;
icon catalog is still one PNG. Starting F from silence wastes a WP on dead
undo.

---

## OPDRACHT — start hier

1. Confirm live `collectReplayHandlers.js` still has
   `tabs_move` / `tabs_delete` / `tabs_duplicate` / `tabs_rename` and **no**
   `header_iconChange`. One grep, not a new audit.
2. Present pick-list **rename-Cognos / F / O / T3**. Recommend rename Cognos
   if they are at the host; else **O** for code; **F** only if they name it.
   Mention C1 standing unless they say C2. **STOP.**
3. After PO names a letter: that WP only, contract first, grok 4.6 bounded,
   captain does not write JS, Cognos deferred, log on the owning delta.

Target is **not** more architecture. Target is the next **named** slice
without reopening closed tracks.

---

## As-built this captain session (2026-08-18)

- **T3** Implemented (dirty-tree B). See `contracts/filters-t3-actions-folder-regroup-contractdelta.md`.
- **O** 2026-08-18 ~13:30 — dual grok-4.6 explore: no live user-facing hole left on named paths. Remaining letters **PARK** (high confidence): F dead undo (no icon picker), C2 leave-until-bug, S16 no UI + blocked by D, D needs Cognos `createWidget` spike, E not a product. Rename Cognos still awaiting host. **Stop product work** until PO names a letter or runs the host round.
- **F** 2026-08-18 ~13:44 — PO: one icon forever. No JS cleanup (already one-icon). Picker + icon-history **never**. Contracts locked (`header.md`, T2-item4, deferred-backlog §4).
- **Leave remaining 2026-08-18 ~13:54** — PO: all still-(partly)-open letters stay left. No C2 / S16 / D / E / Rename-Cognos this queue. Next captain: do not reopen; no new inventory.
- **Handoff 13:57** — next chat: `contracts/futureTodo/captain-handoff-2026-08-18-1357-launch-prompt.md`. This file superseded as launch prompt.
