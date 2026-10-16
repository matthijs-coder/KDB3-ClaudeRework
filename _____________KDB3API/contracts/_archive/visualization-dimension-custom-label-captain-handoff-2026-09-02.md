# Launch prompt — dimension `setCustomLabel` captain 2026-09-02

> **DONE 2026-09-02.** PO Cognos ack. Spec Frozen. Do **not** paste this as a new captain launch.

Paste into a **fresh** agent chat. Do **not** continue the previous coordinator chat (token context full). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

Workspace: `REDESIGN 2026.05`. Production tree: `_____________KDB3API`. Talk to PO in **Dutch**. Generated artifacts (contracts, JS, names) **English**.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you personally re-read all MUST rules, full `cognosHostService.md`, `widgetBindingPlan.md`, `widgetBindingApply.md`, `widgetVis.md`, and investigation canvases.

- Treat **delegation as mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts into this chat.
- You read/write **contracts** and **execution specs**. Army reads code, writes code, and reviews.
- Extra investigation and review rounds via grok 4.6 subagents are a **good** default. Quality over speed.
- Do **not** dump `KDB.js`, `cognosButtons.css`, full `cognosHostService.md`, or IBM JSDoc dumps into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, patch contracts if a real deviation appears, brief writers. Army holds the file bodies.
- Do **not** load predecessor captain chats or `agent-transcripts`. This file + the approved delta + live JS are source of truth.

---

## You are

**Organizer / coordinator / planner / team captain.**

Predecessor captain investigated List/legend `"Tooltip"` names, PO proved live `DataItemAPI.setCustomLabel`, wrote the **Approved** delta, and **did not implement**. You take the **next steps**: execution spec → army implementation → dual review. You do **not** reopen product decisions.

### Do

- **Module Contract First.** Approved delta is law: `_____________KDB3API/contracts/visualization-dimension-custom-label-contractdelta.md` (**Status: Approved**, PO vastenburg 2026-09-02). Parents already one-line patched: `cognosHostService.md`, `widgetBindingPlan.md` §6.1, `widgetBindingApply.md` §7/§8/§20, `widgetVis.md` `applyDimension`.
- Write an **execution spec** from `_____________KDB3API/contracts/_executionSpecTemplate.md` **before** army writes JS. Path: `_____________KDB3API/contracts/visualization-dimension-custom-label-execution-spec.md`. Required: pre-flight rule echo + per-file `Rules to apply`. Present spec to PO only if a file split or allowlist is ambiguous; do not wait to re-approve the product delta.
- Split work. Tight briefs. **Parallel** grok 4.6 subagents with **exclusive file allowlists**. No two writers on the same file.
- Gate: (1) you write execution spec → (2) army pre-flight echo of MUSTs → (3) writers per allowlist → (4) **fresh** subagents dual-review (mechanical rules + semantic contract vs code, before *and* after) → (5) fix MUST holes via army → (6) tell PO what to check in Cognos.
- First message to PO: started / blocked. After dual review: Cognos checklist.
- If implementation must deviate: **stop**, present to PO, **update the delta first**, then resume. Silent divergence is forbidden.
- Ask PO when grey-ownership / new `_KDB` namespace / new lifecycle term / **new cognosHost facet** appears. This WP is a **new op on the existing visualization facet**, not a new facet.

### Do not

- Write production JS/CSS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**.
- Re-investigate whether `setCustomLabel` exists (PO live-proved it). Re-open persist, `dimensions.js` itemIds, List `cleanDataIdForList` / binding the level without `[Tooltip]`, legend DOM sanitizers as the primary fix, or `dataQuery.js` as home.
- Implement **before** the execution spec exists.
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from widgetVis, widgetBindingPlan, or apply-effects (ring 1 / inner ring only).
- Invent `_KDB.api.canvas` / a new facet / 11th AMD import on `__orchestratorCognosAPI.js`.
- Put the wrapper in `cognosAPI/dataQuery.js` or a new `cognosAPI/visualization/*.js` sibling (PO: stay in `visualization.js`).
- Match items with `getLabel() === "Tooltip"`. Use `getColumnId() === columnId`, else `getId() === columnId`.
- Copy `sortDataItemInSlot` **reversed** facade wrap for the new method. Use `bindNamed` / facet order `(widgetId, slotId, columnId, label, {signal?})`.
- Call `setCustomLabel` with an empty string. Skip the host call entirely when no real dimension is selected.
- Rename Jahr / Monat / Dienststelle / Kennzahl items. Label **only** the dimension-carrier item.
- Change legend caption/title pipeline (`replaceTooltipInLegendTitle`, LINE title drop, observer captions-only) in this WP.
- Folders `helpers` / `common` / `shared`. Inline nested functions in AMD entry bodies. ES modules in `KDB3/js/**`.
- Exceed JS **150** lines / orchestrator 120 / controller-fn 60 / 10 AMD imports without PO — **except** `visualization.js`: **≤200 without pinging PO**; **>200 stop and ask**. `KDB.js` stays on its existing bootstrap exception.

### Army (grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**.
- Contract vs live files **before** coding (confirm blast radius) and **after**.
- Pre-flight: one-sentence summary of each MUST rule **before** producing files (execution spec Section A).
- Exclusive allowlists. If blocked: stop and report; do not improvise architecture.
- Mechanical review: AMD, naming `_` prefix, try/catch, file size (`visualization.js` ≤200), import count, no foreign state writes, no host leaks from ring 1, no `__getDashboardAPI` outside `cognosAPI/`.
- Semantic review: no-dim skip; real dim always sets dropdown key; empty label never reaches host; only dimension `columnId`; apply after add then sort; List header + chart legend title pick up Cognos custom label.

Subagent model slug: `cursor-grok-4.6-xhigh`. `subagent_type`: `explore` for reads, `generalPurpose` for writes/reviews. Do not poll Task with AwaitShell; end the turn or do other captain work.

---

## Where to start (order)

1. Read **only**:
   - this handoff
   - `_____________KDB3API/contracts/visualization-dimension-custom-label-contractdelta.md` (Approved)
   - `_____________KDB3API/contracts/_executionSpecTemplate.md`
   - `_____________KDB3API/.cursor/rules/feature-structure.mdc` and `cognos-adapter.mdc` (MUST-set + three rings; do not re-read all other rules into *your* context — army echoes them)
2. Tell PO you started. Do not implement in that first turn.
3. Write the execution spec (per-file, allowlists, Rules to apply, forbidden actions, acceptance from delta §10).
4. Launch army. Suggested writer slices (adjust if files collide — exclusive allowlists):
   - **W1 inner ring:** `KDB3/js/core/cognosAPI/visualization.js` only. Add `setCustomLabel(widgetId, slotId, columnId, label)`. Count lines; stop if >200.
   - **W2 cognosHost + facade:** new `facets/visualization/write/setCustomLabelInSlot.js`; bind `buildVisualizationSlotSurface.js`; `createCognosBindingFacade.js` `bindNamed` + `isComplete`. Must not edit `visualization.js`.
   - **W3 planner:** `widgetBindingPlan/slots/*` emit `options.customLabel` when `dataConfig.dimension` is a real key. No Cognos.
   - **W4 apply:** `applySlots.js` after `addDataItemsToSlot`, before sort. Fail empty label. Skip when field absent.
5. Fresh reviewers (not the writers): mechanical + semantic. Fix via army.
6. PO Cognos checklist (below).

Do not redo parent one-liners unless army finds a stale sentence.

---

## Product decisions (closed — do not re-ask)

| Topic | Decision |
|---|---|
| Host API | `dataItem.setCustomLabel(label)` — instance only. Live-proved 2026-09-02. |
| Inner ring | `cognosAPI/visualization.js`, not `dataQuery.js`. File **≤200** this WP without extra ask. |
| Facet | Existing `visualization`. Op name `setCustomLabelInSlot`. Not a new facet. |
| No dimension | Ohne / `none` / `default` / empty → no emit, no host call. |
| Real dimension | Always set dropdown key (`Altersgruppe`, `Berufsfamilie`, `Dienstverhältnis`, `Geschlecht`, `Lehrlinge`). Empty string forbidden. |
| Which item | Only the dimension-carrier `columnId` (catalog `itemId`, often `…[Tooltip]`). Not Jahr/DST/Kennzahl. |
| Keep `[Tooltip]` bind | Yes. Do not port `cleanDataIdForList`. |
| Caller | `widgetBindingApply.applySlots` after add. widgetVis stays on `applyBinding`. |
| Legend DOM | Out of this WP. If titles still say Tooltip after custom label, follow-up. |

Live bug this WP fixes: List column header + chart `.lgd-title` showing `Tooltip` because Cognos names the item after the TM1 leaf.

---

## MUST rules (army echoes; you do not ingest all)

`_____________KDB3API/.cursor/rules/`: `kdb-object`, `state`, `runtime`, `module-public-api`, `events`, `feature-structure`, `naming`, `error-handling`, `dom`, `amd`, plus **`cognos-adapter`**. Lifecycle: `_____________KDB3API/.cursor/lifecycleVocabulary.md`. Older rules outside `_____________KDB3API/` do **not** apply.

---

## Cognos checklist for PO (after dual review)

1. List + Geschlecht (or other Tooltip-dimension): column header is the dropdown name, not `Tooltip`. Cell values still look like the Tooltip attribute (not raw IDs) unless Altersgruppe (level bind).
2. Line/stacked/pie + dimension: legend title uses the dimension key instead of leading `Tooltip`.
3. Ohne: no empty custom label; Cognos names unchanged.
4. Jahr / Dienststelle columns still show their Cognos names.
5. Dashboard spec is not dirtied beyond the widget instance (instance label, not package rename).

---

## Out of this WP

Legend observer/title sanitizer timing, `replaceTooltipInLegendTitle` hardening, List header DOM, `dimensions.js` unique-name changes, calculated package items, Ready halt, writeback keys, kdbControl developer-mode (already Reviewed).

---

## Handoff facts (do not re-derive)

- Slot model: List `grid_cols`; Line/Prognose `series`; Stacked `color`; Pie `categories`. No KDB slot named `tooltip`.
- `addDataItemsToSlot` still sends `{ columnId }` only.
- Inner ring already 177 lines (`visualization.js`); wrapper must fit under 200.
- `__orchestratorCognosAPI.js` is at **10 AMD** — do not add a root module.
- `buildVisualizationSlotSurface.js` 4→5 AMD is the intended bind point.
- `applySlots.js` ~115 lines — a third loop may need a factory-scope helper, not a new phase file (`runApplySlotsFiltersPhase.js` already 7 AMD).
- Facade: `sortDataItemInSlot` is historically reversed; **new op is not**.
