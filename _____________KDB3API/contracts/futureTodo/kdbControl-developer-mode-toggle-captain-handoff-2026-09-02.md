# Launch prompt — kdbControl developer-mode toggle captain 2026-09-02

Paste into a **fresh** agent chat. Do **not** continue the previous coordinator chat (token context full). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

Workspace: `REDESIGN 2026.05`. Production tree: `_____________KDB3API`. Talk to PO in **Dutch**. Generated artifacts (contracts, JS, names) **English**; UI strings German under `_KDB.config.labels.de.*` except this WP’s hardcoded `Entwicklermodus` in `fillDashboardSettings.js` as contracted.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you personally re-read all MUST rules, `kdbControl.md`, `writeback.md`, properties, leftover-hide, metricsTree, and the investigation canvases.

- Treat **delegation as mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts into this chat.
- You read/write **contracts** and **execution specs**. Army reads code, writes code, and reviews.
- Extra investigation and review rounds via grok 4.6 subagents are a **good** default. Quality over speed.
- Do **not** dump `KDB.js`, `cognosButtons.css`, or full `writeback.md` into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, patch contracts if a real deviation appears, brief writers. Army holds the file bodies.
- Do **not** load predecessor captain chats or `agent-transcripts`. This file + the approved delta + live JS are source of truth.

---

## You are

**Organizer / coordinator / planner / team captain.**

Predecessor captain investigated SuperUser / SU-toggle / developer-mode, wrote the approved delta, and **did not implement**. You take the **next steps**: execution spec → army implementation → dual review. You do **not** reopen product decisions.

### Do

- **Module Contract First.** Approved delta is law: `_____________KDB3API/contracts/kdbControl-developer-mode-toggle-contractdelta.md` (**Status: Approved**, PO vastenburg 2026-09-02, **includes Slice B**).
- Write an **execution spec** from `_____________KDB3API/contracts/_executionSpecTemplate.md` **before** army writes JS. Path: `_____________KDB3API/contracts/kdbControl-developer-mode-toggle-execution-spec.md`. Required: pre-flight rule echo + per-file `Rules to apply`. Present spec to PO only if a file split or allowlist is ambiguous; do not wait to re-approve the product delta.
- Split work. Tight briefs. **Parallel** grok 4.6 subagents with **exclusive file allowlists**. No two writers on the same file.
- Gate: (1) you write execution spec → (2) army pre-flight echo of MUSTs → (3) writers per allowlist → (4) **fresh** subagents dual-review (mechanical rules + semantic contract vs code, before *and* after) → (5) fix MUST holes via army → (6) tell PO what to check in Cognos.
- First message to PO: started / blocked. After dual review: Cognos checklist.
- If implementation must deviate: **stop**, present to PO, **update the delta first**, then resume. Silent divergence is forbidden.
- Ask PO when grey-ownership / new `_KDB` namespace / new lifecycle term / new cognosHost facet appears. None of those should appear in this WP.

### Do not

- Write production JS/CSS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**.
- Re-investigate whether the SU toggle currently does anything (it does not, visually). Re-open persist SSOT, `hidSu` reuse, SuperUser match, leftover-unhide, Cognos spec write, or gear-lock.
- Implement **before** the execution spec exists.
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Edit `contracts/_archive/*` as if they were live (settings CP-1 archive stays authority for **non-SU** settings only).
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from kdbControl or metricsTree.
- Write `_KDB.superUser` (forbidden top-level). Write `_KDB.properties` from kdbControl. `classList` on `#main` from kdbControl. Invent `_KDB.api.canvas` for this flag.
- Gate the **settings gear**. Touch Diagramme `hideWidgetSettingsButtons` / `hidWs` / `dashboard.settingsButtons.toggle` (leave inert).
- Add `superuser` to specialSingleSelect `TABLE_KEYS`. Use `ensureFreshRows` / `reloadTable` / `abortTable("superuser")`.
- Reuse v3 key `hidSu` for the new meaning. Drop `hidSu` from the catalog (SET of old JSON would fail). Invert old `hidSu: 1` into `devOn`.
- Write Cognos `KDBHideWidgetsToggle` / `content.setPropertyValue` from this WP. Rename persist-id `KDBHideWidgetsToggle`.
- Reintroduce `KDB_superuser` CSS. Split leftover-hide onto a second class.
- New events / `properties:hideWidgetsToggled`. Subscribe-only SuperUser gate (misses cache-hit).
- Folders `helpers` / `common` / `shared` / leftover `Support`. Inline nested functions in AMD entry bodies. ES modules in `KDB3/js/**`.
- Exceed JS 150 lines / orchestrator 120 / controller-fn 60 / 10 AMD imports without PO.

### Army (grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**.
- Contract vs live files **before** coding (confirm blast radius) and **after**.
- Pre-flight: one-sentence summary of each MUST rule **before** producing files (execution spec Section A).
- Exclusive allowlists. If blocked: stop and report; do not improvise architecture.
- Mechanical review: AMD, naming `_` prefix, try/catch, file size, no foreign state writes, no `#main` from kdbControl.
- Semantic review: polariteit `true` = developer ON; SuperUser fail-closed no-flash; `applyDeveloperMode` explicit vs Cognos re-read; `hidSu` ignored; Slice B no `_KDB.superUser`.

Subagent model slug: `cursor-grok-4.6-xhigh`. `subagent_type`: `explore` for reads, `generalPurpose` for writes/reviews. Do not poll Task with AwaitShell; end the turn or do other captain work.

---

## Where to start (order)

1. Read **only**:
   - this handoff
   - `_____________KDB3API/contracts/kdbControl-developer-mode-toggle-contractdelta.md` (Approved)
   - `_____________KDB3API/contracts/_executionSpecTemplate.md`
   - `_____________KDB3API/.cursor/rules/feature-structure.mdc` (execution-spec + MUST-set; do not re-read all 11 rules into *your* context — army echoes them)
2. Tell PO you started. Do not implement in that first turn.
3. Write the execution spec (per-file, allowlists, Rules to apply, forbidden actions, acceptance from delta §11).
4. Launch army. Suggested writer slices (adjust if files collide — exclusive allowlists):
   - **W1 properties:** `applyHideWidgetsToggleChange.js` split + `_KDB.api.properties.applyDeveloperMode` + orchestrator register. Do not let kdbControl import apply internals.
   - **W2 writeback schema:** `v3Defaults.js` `devOn` + retired `hidSu`; `collectCanvasSettings.js` stop emitting `hidSu`.
   - **W3 kdbControl state/history/restore:** rename `hideSuButtons` → `isDeveloperMode`; new actions; history target `dashboard.isDeveloperMode`; restore catalog `devOn`; ignore `hidSu`; mount seed from `_KDB.properties.KDBHideWidgetsToggle`.
   - **W4 kdbControl UI/effects:** `fillDashboardSettings.js` labels + gated class; bind/sync `dashboard.developerMode.toggle`; `panels.css`; visibility effect `waitForRows(superuser)`; post-dispatch call `applyDeveloperMode` (kill canvas intent for this flag).
   - **W5 shared utils + Slice B:** `core/utils/isRightAllowed.js` + `readFirstRowScalar.js`; metricsTree `waitForRows` SuperUser then pass boolean into `buildMetricsTreeNodes`; delete `_KDB.superUser` read.
5. Fresh reviewers (not the writers): mechanical + semantic. Fix via army.
6. PO Cognos checklist (below).

Parents already **one-line patched** by predecessor (do not redo unless army finds a stale sentence): `kdbControl.md` S1/S2/§7, `writeback.md` §4.1.1, `kdb-ready-halt-developer-mode-contractdelta.md`, `leftover-widgets-developer-hide-contractdelta.md`, `tableDataService.md` §10, `kdbControl-parameterSetRestore-contractdelta.md`, `properties.md` Q2, `kennzahlenTree.md` L54. Still optional later: `anew.md`, PDF capture delta phrasing — army or you, not a blocker for JS.

---

## Product decisions (closed — do not re-ask)

| Topic | Decision |
|---|---|
| SuperUser table | Visibility gate **only** for kdbControl toggle + caption. Not the settings gear. Not auto-on for developer class. |
| Match | `1` / `"1"` / `true`. First-row first-column scalar (copy special-rights rule, do not import specialSingleSelect). Fail-closed. Start **hidden**, unhide after `waitForRows`. |
| Toggle `true` | Developers modus ON = class `KDB_developerMode` on `#main`. Same as widget property `KDBHideWidgetsToggle`. Leftover widgets **also** unhide (one class — accepted). |
| Names | State `isDeveloperMode`. Action `dashboard.developerMode.toggle`. History `dashboard.isDeveloperMode` payload `{ value }`. UI DE `Entwicklermodus`. |
| Class owner | **properties**. Narrow `_KDB.api.properties = { applyDeveloperMode }`. Explicit `enabled` for kdbControl/writebackRestore. Cognos re-read only for `source: "boot" \| "cognos"`. |
| Cognos spec write | **No** from kdbControl. Echo: Cognos panel → apply `source: "cognos"` → `setDeveloperMode` `skipHistory: true`. |
| Persist | Both layers. Boot: spec. After SET: **writeback wins**. Omitted `sett.dash.devOn` → `false` → class **off** even if spec was on. |
| v3 | New `sett.dash.devOn`. `hidSu` **retired/ignored** (stay in catalog so old JSON validates). Do not invert old `1`. v2 never mapped `hidSu`. |
| Slice B | **In this WP.** metricsTree: SuperUser=`1` sees Freigabe=0 leaves with `(Beta)`. Non-SU do not. Pass explicit boolean; never write `_KDB.superUser`. |
| Sister toggle | `hidWs` / Settings-Buttons / `hideWidgetSettingsButtons` **untouched**. |

Live bug this WP fixes: `data-kdb-action="dashboard.suButtons.toggle"` only flips dead `hideSuButtons` + missing `_KDB.api.canvas`. Properties `applyHideWidgetsToggleChange` **always re-reads Cognos** and ignores payload — writers must split that.

---

## MUST rules (army echoes; you do not ingest all)

`_____________KDB3API/.cursor/rules/`: `kdb-object`, `state`, `runtime`, `module-public-api`, `events`, `feature-structure`, `naming`, `error-handling`, `dom`, `amd`, plus `cognos-adapter`. Lifecycle: `_____________KDB3API/.cursor/lifecycleVocabulary.md`. Architecture: `stateOwnership.md` / `projectStructureRules.md` only if a writer is stuck. Older rules outside `_____________KDB3API/` do **not** apply.

---

## Cognos checklist for PO (after dual review)

1. Non-SU: no Entwicklermodus chrome in Dashboard settings; gear + Diagramme Settings-Buttons remain.
2. SU=`1`: chrome appears without a flash for non-SU; toggle on → IBM buttons + leftover widgets; toggle off → hidden again.
3. Widget-property Developers modus still live-flips class; kdbControl checkbox follows.
4. Reload without SET: spec wins. After save/restore: `devOn` wins; omitted `devOn` turns class off.
5. SU=`1` sees `(Beta)` Kennzahlen; non-SU does not. Freigabe=1 unchanged.
6. Dashboard spec is **not** dirtied by the kdbControl toggle.

---

## Out of this WP

Ready halt, park, widgetBase, overlay SUPER/USER port as separate class, PDF capture behavior, gear `KDB_hide` visual fix, launchpad, writeback GET/SET other keys, special rights filters.
