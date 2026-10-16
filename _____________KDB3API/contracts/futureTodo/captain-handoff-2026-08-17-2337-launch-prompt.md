# Launch prompt — captain handoff 2026-08-17 ~23:37

Paste into a **fresh** agent chat. Recommended: sterk thinking-model als
**planner / implementation captain**; **cursor grok 4.6** voor begrensde
verify- en implementatie-subagents. PO = vastenburg.

Do **not** continue the previous captain chat (token context full).
Do **not** re-run a full futureTodo / remaining-issues / structure-audit
inventory. Evidence is already consumed. Re-read **live** files only for the
WP PO names.

This prompt **points** at existing files. Do **not** invent a fourth backlog.

---

COMPLEX TASK — KDB3 continuation after T2 green + Track S/R/R6 + remaining
mechanical splits. You are the **next team captain / planner**. You implement
tranche-for-tranche with exclusive grok-4.6 allowlists. You do not start a
new architecture.

Project root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`
Target: `_____________KDB3API/`
Branch: `tabs`. Do **not** push. Commit only if PO asks.

Working tree may be uncommitted (S/R/remaining/splits). That is not an
invitation to rewrite those tracks.

AUTHORITY (highest first):

1. **This prompt** (PO decisions, predecessor recommendations, order, forbidden).
2. Live `KDB3/js/**` + the module contract of any file you touch.
3. `architecture/stateOwnership.md`
4. `architecture/projectStructureRules.md`
5. `_____________KDB3API/.cursor/rules/` — **do not edit `.mdc`** unless PO asks.
6. Pointed files (read, do not copy into a mega-spec):
   - `architecture/structure-remediation-log.md` (**append only**)
   - `contracts/futureTodo/post-t2-green-inventory-launch-prompt.md`
     (partially stale: S8/S9/S10/P12/S14/Batch B already done)
   - `contracts/futureTodo/nogOpen_2026_08_17_0200.md` (02:00 snapshot; stale
     on T2 Cognos-open, line counts, Track-S teardown, size hubs)
   - `contracts/futureTodo/writeback-restore-deferred-backlog.md`
   - `contracts/tabs-history-contractdelta.md` (MOVE only; Cognos green)
   - `contracts/tabs-tabCrud-contractdelta.md` §7 history still forbids frames
     except the MOVE delta
   - `contracts/widgetBase.md` §19 `widget_removed` replay deferred

---

## 0. PO decisions already made (do not reopen)

| Decision | Meaning |
|---|---|
| T2 is **GREEN** | Do not reopen v2-map, `head.icon` GET/SET, 5a/5b/5c, mapping SSOT |
| Cognos smoketest **deferred** | After a WP that touches host behaviour: **continue**. PO tests several issues in one Cognos round later |
| `KDB.js` **excluded** from the 150-line rule | Never split `KDB.js` for file-size |
| Other files **>150: leave** | Do **not** split remaining oversize files *because they are over 150*. That campaign is closed |
| Batch B resolved from contracts | KEEP_CLICK (no `setActiveTab`); `window.top.WBParameter*`; SET returns `RestoreResult`; dienststelle Cognos already in effects; no leaf-verb campaign; cognosHost tiny catalog already landed |
| Predecessor Batch C recommendation presented | PO has **not** overridden it. Default: **leave-until-bug** (see §3) |

Track S / R / R6 / remaining mechanical work: **done**. See the remediation log.
Do not redo S8 tabs traverse/controller/reducer, S9 `syncFrameworkViewFromState`,
S10 `waitForFilterInventory` timers, P12 `maxUserTabs` fallback, S14 metricsTree
`Date.now` → `0`, or the 2026-08-17 evening size splits (tabs rename/effects,
kdbControl reducer/controller/mainBlocks, launchpad, legend, header,
historyControls, dragDrop, metricsTree, `shapeTableRows`).

---

## 1. PO decisions **not** yet made (first message)

PO asked for recommendations on Track P next item and Batch C, then this
handoff. **They have not named a letter.** First message: present §2 pick-list
(short). **STOP. No contract delta, no code, until PO names a letter.**

Do not also re-ask Batch B. Do not also re-ask “split KDB.js / remaining >150”.

T3 folder regroup was asked earlier and **not answered**. Keep it on the list
as parked unless PO says **GO folder regroup**. Do not start T3 from silence.

---

## 2. Predecessor captain — what to do / investigate / never do

### 2.1 Absolutely still do (once PO names it)

**Default recommendation: A1 — tabs delete history only.**

Why: MOVE undo is Cognos-green (`tabs_move`). Delete/duplicate/rename CRUD is
live with **no** history keys. After a later delete, existing MOVE frames go
stale (MOVE delta §5). Pattern exists: `tabs/history/` +
`collectReplayHandlers` + nested owners already `skipHistory: true` on the
tab-mutation saga. Replay via existing `tabs/delete` + `isHistoryReplay`.
Do **not** invent `history.clear` unless the new delta says so.

Order **inside A1** (do not merge):

1. Compact `contracts/tabs-history-…` delta for **delete only** (key
   `tabs_delete`, replay payload, skipHistory nested, stale MOVE frames =
   apply `false` / pointer stays). **STOP for GO.**
2. Implement one WP (cursor grok 4.6, exclusive allowlist under
   `dashboard/tabs/history/` + `collectReplayHandlers.js` + saga push site).
   Do not touch gallery, `KDB.js`, canvas-discovery, WP5.
3. Planner reviews diff. Continue (Cognos later). Do **not** start duplicate
   or rename history in the same WP.

If PO instead names **F** or **B**, skip A1 and do that WP with the same
contract-first discipline (see §2.2). If PO names **O** (park Track P):
one-line as-built on this file and **stop product work**.

### 2.2 Recommended to investigate *only if PO picks it* (advisable?)

Do **not** investigate these in the first message. After PO picks, live-verify
that one item (`file:line`) then delta or park.

| Pick | Advisable? | Why | First slice |
|---|---|---|---|
| **A1** delete history | **Yes — default** | User-visible hole; pattern exists | Delta + delete only |
| **A2** delete+dup+rename together | **No** | Duplicate undo is a second product | Never one WP |
| **F** header icon toolbox + icon history | **Yes as smaller alt** | GET/SET icon is T2-4; UI+undo still missing | Toolbox picker **or** `header/setIcon` history first, not both if files collide with LOCKED gallery |
| **B** restore poll + `missingShells` in phase result | **Yes if SET-vs-lazy burns** | Honesty gap; 5c already waits canvas on activate | Delta; do not fold C into B |
| **O** park Track P | **Yes if PO wants a pause** | Mechanical track is closed; product needs a named pick | As-built line; stop |
| **T3** folder regroup | **Only with explicit GO** | SS/DS/NMS `actions/` still flat; three owners together | Behaviour-neutral AMD paths only |

**Investigate-then-maybe (do not start from this prompt):**

- **K** full content-cleanup delegation (`routeToLaunchpad` is still
  frame-only; settings-delete already calls `widgetVis/cleanupContent`).
  Ownership tranche; Track S invariant: no `_KDB.state.widgets[id]` teardown.
- **widget_removed** replay (committed, no handler). Only if PO names S16 /
  history completeness — not a drive-by inside A1.
- **F vs gallery lock:** toolbox lives under `framework/`;
  `buildControlPrimitiveGallery.js` is **LOCKED**. If F needs gallery, **stop
  and ask** — do not split or rewrite gallery.

### 2.3 Absolutely do not do

- Re-inventory from audits / `nogOpen` / remaining-issues Batch 1 thick
  wrappers / “v2 map not implemented”.
- Reopen T0/T1/T2, WP5 merge, canvas-discovery, `sichtChange`.
- Split `KDB.js`. Split remaining >150 **for the cap** (gallery, `topNGate`,
  `bindWidgetSettingsPanel`, `visualization.js`, historyService,
  kennzahlDefaults shards, `bindingSpecs`, `bwOldToNewMap`, `tables.js`).
- Gallery split. widgetBase adopt `tabMutationRun`. NMS `popupReady` on
  `OWNER_ROUTE_MAP`. dragDrop rebind-poll “fix”. Ceremonial SS reducer rewrite.
- Batch C disposed/dispatch **unify** or mini-contract-without-code, unless
  a **live bug** is shown or PO names **C2**.
- `setActiveTab` wrapper. `_KDB.cognosAPI.writeback`. Swallow SET to `void`.
- Shell-create (D) without a Cognos createWidget spike + PO.
- `dataSourceContext` (E) until datasource switching is a product.
- `v2FieldMap.js` (N) — aliases already inline in `mapV2VisWidget.js`.
- Legend `#`/`ALLE`/`Beendet` until PO shows a visible case.
- specialSingleSelect history / widgetDataTable cleanup (`tbl` skip-by-design).
- Global `waitFor:"canvas"` honesty / per-widget paint on activate (**C**) —
  fights 5c PO #3/#4.
- `tabs:changed` suppress whole SET (**G**) / filt-only success landing (**H**)
  unless PO reopens 5b #8/#9.
- Duplicate SS per-scope state (**I**) until a colliding dashboard is proven.
- New `_KDB.*`, `.mdc` edits, third audit, updating `structure-audit.md`.
- Reintroduce `stage*HistoryReplayHandler.js` (R3). Live name:
  `kdbControl/history/registerKdbControlHistoryReplayHandler.js`.
- Mix Track P product with cosmetic renames in one WP.
- Flatten NMS dest-skip into DS/SS apply-fail.

### 2.4 Order (if PO follows the predecessor default)

```txt
1. First message: pick-list A1 / F / B / O / T3. STOP.
2. A1 contract delta (delete only). STOP for GO.
3. A1 implement + planner review. Continue (Cognos later).
4. STOP. Ask: next is A1-follow-up (duplicate history), F, B, or park?
5. Only then that next WP. Never A2 blob.
```

If PO says **F** instead of A1: swap step 2–3 to F (delta then code).
If PO says **O**: stop after step 1 as-built.
S-rem size campaign: **already finished**. Do not insert S8/S9 before A1
unless PO explicitly parks product and asks for more structure — and even
then **do not** split remaining >150 for the cap.

---

## 3. Batch C (disposed / dispatch) — standing recommendation

Predecessor investigation (leave in force until PO overrides):

- Split is **real**: vis/settings/dataTable `ok: true`+skipped; topN
  `ok: true`+aborted; widgetText `ok: false`+skipped; widgetBase `ok: false`.
- **No live user-visible bug.** Destroy is `KDB.destroy()` only; history
  service dies after features. Latent `ok === true` callers exist but are
  not a session path today.
- Canonical *later* widget shape if a WP is named:
  `{ ok: false, skipped: true, reasonCode: "MODULE_DISPOSED" }`.
  Do **not** use `WIDGET_*_DESTROY_FAILED` for post-destroy dispatch.
  Do **not** change Family A (parameterSet `{ ok: false, diagnostics }`)
  or launchpad `waitUntilReady` boolean.
- Action-name constants / ceremonial reducers / `collectReplayHandlers`
  self-register: **on-touch / leave**.
- `runtime.widgets[id]` vs `byId`: **already byId**. Not open work.

**C1 leave-until-bug** = default. **C2** only if PO names a dedicated WP.

---

## 4. Known leftovers (do not “fix while here”)

- `tabs/effects/bindTabRenameEditSession.js` is a 9-line compatibility barrel
  (three re-exports). R0 smell; public path kept on purpose.
- `tabs/effects/applyTabsEffects.js` hub is thin; rename/sync/hydrate jobs
  sit beside it. Do not re-split.
- kdbControl destroy: `abortAllControllers` **before** gallery `rt.listeners`
  cleanup. Preserve if you touch destroy.
- Track S locks (touch only if the named WP truly needs the file, then keep
  invariants): `cleanWidgetForTransfer.js` (no `_KDB.state.widgets[id]`
  teardown), widgetSettings timers registry, history reducer no `Date.now`,
  `KDB.js` destroy order (`metricsTree` after `filterDock`, before
  `kdbControl`; services all except `widgetBindingPlan`), gallery AbortSignal
  listeners, widgetVis `rejectAllTopNGateWaiters` before runtime wipe.
- P12: GET `maxUserTabs` fallback is `MAX_USER_TABS` not `Infinity`. Do not
  revert.
- S14: metricsTree reducer fallbacks are `0`; controller still stamps
  payloads. Do not put `Date.now()` back in the reducer.

---

## 5. Process

1. Read this prompt + remediation log § evening splits + the contract of the
   WP PO names. **No audit re-read.**
2. First message: §2 pick-list. **STOP.**
3. After name: live `file:line` verify of **that** item only (one grok 4.6
   explore is enough). Then contract delta if product/Cognos-adjacent.
   **STOP for GO.**
4. Cursor grok 4.6 implements **one** WP, exclusive allowlist, no two agents
   on the same file. Planner reviews the diff (do not accept blind).
5. Cognos: **do not stop the train**. Record “needs PO Cognos” on the delta
   and continue to the next **named** item only after a short STOP (PO may
   want to pick again).
6. Append `architecture/structure-remediation-log.md` for structure WPs;
   as-built on the owning contract delta for Track P.

Line budget for **new or newly split** JS: executable ≤150, orchestrator ≤120,
controller fn ≤60, ≤10 AMD imports. **Does not apply to `KDB.js`.** Does not
justify splitting files that are already over 150 and PO said leave.

No `helpers/` `common/` `misc/` `shared/`. No new leftover suffixes
(`Support`/`Helpers`/`Shared`/`Internals`). No new `stage*HistoryReplayHandler`.

---

## 6. Predecessor note to PO (already sent; do not re-litigate unless asked)

Default Track P: **A1 delete history**. Smaller alt: **F**. Restore honesty:
**B** not C. Park: **O**. Batch C: **C1 leave**.

T3 / C2 / remaining >150 splits / gallery: not in the default queue.

---

## OPDRACHT — start hier

1. Confirm live that `tabs_move` is still the only tabs history key
   (`collectReplayHandlers.js`, `pushTabsMoveHistoryStep.js`). One grep, not
   a new audit.
2. Present pick-list **A1 / F / B / O / T3** (one table). Recommend A1.
   Mention C1 is standing unless they say C2. **STOP.**
3. After PO names a letter: that WP only, contract first, grok 4.6 bounded,
   Cognos deferred, log append.

Target is **not** more architecture. Target is the next named product slice
without reopening closed tracks.
