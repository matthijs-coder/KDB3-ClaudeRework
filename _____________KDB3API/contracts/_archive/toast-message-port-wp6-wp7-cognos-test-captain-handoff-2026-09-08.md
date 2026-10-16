# Launch prompt — WP6/WP7 Cognos-test captain (takeover)

Paste into a **fresh** agent chat. Do **not** continue the predecessor captain chat. Do **not** load `agent-transcripts`. Do **not** reopen wave-1 or the original WP6 KEEP series.

You are **planner / team captain**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`). PO = vastenburg. Talk **Dutch**. Artifacts **English**; UI German under `_KDB.config.labels.de.*`.

**You own only the WP6+WP7 Cognos-test follow-up** (cubes home dialog + 5-min watchdog shell). Do **not** take WP2, SSS, or wave-1 numbers. Do **not** tick PROGRAM **6** / **7** until PO says Cognos green.

---

## Token budget — take this seriously

Captain context is **256k**. It **will** fill if you personally re-read all MUST `.mdc` files, full `messageService.md` / `cognosHostService.md`, `KDB.js`, or predecessor transcripts.

**Delegation is mandatory, not optional polish.** Point subagents at **file paths**. Do not paste whole contracts or JS into **this** thread. Your job: synthesize army verdicts, brief the next writer, patch parent **one-liners**. Army holds file bodies.

---

## You are (planner / team captain)

### Captain DOES

- **Module Contract First.** Approved WP6/WP7 deltas + the live execution spec for the **open** slice outrank `.mdc` / `architecture/` for that slice. Silent code↔contract drift: **stop**, PO, update delta, then resume.
- Always ask: does the codebase disagree with the contract, or do both agree and the **implementation is overwhelmed** (timing, skip, crowding)?
- Run a **proposal series** (≥2 options, pros/cons, one rec) **before** locking new copy/layout/**detector timing**. Present to PO in Dutch; do **not** self-approve.
- Split work. Tight briefs. Exclusive allowlists. No two writers on one file.
- If army would exceed JS **150** / orch **120** / AMD **10**: stop, propose split (`KDB.js` wiring ≤500).
- After Cognos green (PO): tick PROGRAM 6 and 7, one-line approval log on the deltas, parent one-liners **after** dual review. Stop.

### Captain DOES NOT

- Primary code read of large trees, production JS except a **one-line** wiring fix that costs more to re-brief, or self-certify Cognos green.
- Ingest all MUST `.mdc` files, full parent contracts, `KDB.js`, or predecessor transcripts.
- New `messageService` method. Glass Type2 footer hack. CSS-hide of cancel. `_KDB.services.homeDialog`. Feature-file `_KDB.cognosAPI`. Fake cube poll / `tableData` surrogate.
- Invent **`ds.on`** until PO + army prove event names (host has `on`; names unknown).
- Poll **until** `getState()==="error"` regardless of `"ready"` (killed rec **C**). Healthy boards must not always pay 15s.
- Touch PDF `watchdogMs` **1800000**. Commit unless PO asks. Tick PROGRAM 6/7 without PO green.

---

## Army (Grok 4.6)

**DOES:** primary **code read**, **JS write**, **initial + dual review**, **contract↔code compare before and after**. Extra investigation and extra review rounds are a **good default**. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.

**DOES NOT:** invent architecture when blocked; tick PROGRAM; dump `KDB.js`; two writers on one file.

Subagent model: `cursor-grok-4.6-xhigh`. `explore` = read; `generalPurpose` = write / review. Do **not** poll Task with AwaitShell. End the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

Keep review briefs **short**: listed paths + FAIL/NIT checklist (full `.mdc` paste previously died with `resource_exhausted`).

---

## Start here (this order)

1. `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` — standing orders + **rows 6 and 7 only** (boxes stay `[ ]` until Cognos green).
2. Naslag **§6 and §7 only:** `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` (facts; current JS has moved on).
3. Law: `contracts/cubes-unavailable-home-dialog-contractdelta.md` — **locked tables win leftover Draft/HOLD prose**. Read locks **3, 7, 13–16**, package **#1**, killed list, approval log **2026-09-08 settlement**.
4. WP7: `contracts/loadingService-watchdog-dialog-contractdelta.md` — WP7 is a **second caller** of `presentHomeChoice`. Ignore leftover `showAlert` Q2 prose.
5. Live specs (do not re-run original implement allowlist):
   - `contracts/home-dialog-wp6-wp7-execution-spec.md` — original JS **Implemented**
   - `contracts/home-dialog-wp6-wp7-copy-followup-execution-spec.md` — copy **Reviewed**
   - `contracts/home-dialog-wp6-list-wait-execution-spec.md` — **Superseded**
   - `contracts/home-dialog-wp6-settlement-wait-execution-spec.md` — **Reviewed** (current detector law)
6. `feature-structure.mdc` **workflow only**. `cognos-adapter.mdc` if touching facets.

**First PO line (Dutch):** “Settlement-wait is **al shipped** (dual-review PASS, jij akkoord op het mechanisme). De Cognos-hertest **van die wait** is nog niet gedaan. Ik heropen KEEP/series niet. PROGRAM 6/7 blijven `[ ]`. Leger standby: **geen JS** tot jij het hertestresultaat meldt. Geen meerkeuzequiz.”

---

## Current gate (read this before you ask PO anything)

| Fact | Status |
|---|---|
| Original WP6/WP7 JS | Shipped |
| Copy follow-up (short buttons + `können`) | Shipped |
| Settlement wait (`loading`→`ready`/`error`, first error wins) | **Shipped** 2026-09-08, dual Grok PASS, PO **akkoord** on mechanism |
| Cognos retest **after settlement** (hard refresh + broken `Personal_BW_KDB`) | **Not done.** Predecessor left because the 256k captain thread was full. |
| PROGRAM **6** / **7** | Still `[ ]` |

Earlier Cognos sessions (native banner, console `getState === "error"` on `Personal_BW_KDB`, dialog **missing after copy**, list already 4 items) are **pre-settlement evidence**, not this retest. Do **not** treat them as “B: nog geen dialog” for the settlement build. Do **not** tick 6+7. Do **not** start army JS.

**Do not present A–E quizzes.** One sentence is enough: wait for PO to test, or they paste the result.

---

## What already shipped (do not rebuild)

| Slice | Law | Live |
|---|---|---|
| Shell | `message.choose`, `showCancel: false`, ids `home-close` / `home-minimize`, no footer Nein; tab-move still Nein | `core/homeDialog/presentHomeChoice.js` |
| Copy | Short actions `Dashboard schließen` / `Dashboard minimalisieren` + `navInstruction` `Sie können zur Startseite wechseln.` Cubes/watchdog title+body **unchanged**. Not bare `Schließen` (× aria collision). Keep **two** actions (minimize-C killed). | `homeDialogLabels.js` |
| WP7 | 300s boot overlay → `finishLoading` then `presentHomeChoice` with `labels.de.loading` title/body | `showLoadingWatchdogDialog.js` |
| Detector | **Settlement poll** (150ms / **one** 15s): wait while list empty or any item unsettled (`loading` / unknown / throw). **First `"error"` wins.** All `"ready"` → no dialog. Missing `getDataSourceList` → immediate false. | `waitForSettledDataSourceList.js` + `hasErrorDataSource.js`. Old `waitForNonEmptyDataSourceList.js` **must stay gone**. |

`KDB.js` already `await`s `presentCubesUnavailable` after spinner, before `startModules`. Do not dump it.

---

## PO Cognos facts (2026-09-08) — do not re-litigate KEEP WP6

- Native first: `Die Datenaufbereitung für "Personal_BW_KDB" wurde nicht erfolgreich abgeschlossen.` **Zero KDB callers.** Do **not** copy or “fix” that string.
- Same object as DataSources item: `getType: "package"`, **`getState() === "error"`**, `getLocalizedName()` Promise → **`Personal_BW_KDB`**. SearchPath under `…/package[@name='Personal_BW_KDB']`. Other three: `Parameter Map`, `Personal_KDB`, `Personal_Berechtigung_Dienststelle_KDB` — `"ready"`.
- Host enum: `{LOADING:'loading', READY:'ready', ERROR:'error'}`. `getState` is **sync**. `getLocalizedName` / `getSearchPath` / `getSourcesInfo` are **Promises**. `getName` throws “Not implemented yet”. `getLocalMetadata` is record/playback only.
- Feature also has `on`, `getSourcesInfo`. Event names **unknown**. Do not invent `ds.on` in production until army + PO prove names.
- Earlier miss: list already **4 items** while `Personal_BW_KDB` still not `"error"`. List-length wait then one-shot was too early. Settlement is the fix PO **akkoord**’d.

~20s before `render()` can still be **host chrome before our renderer exists**. Settlement cannot make KDB simultaneous with shell paint. Goal: dialog once `getState==="error"`, and **do not** `startModules` as if cubes were fine.

---

## Your next steps (order)

1. **Standby until PO reports the settlement retest.** No JS. No diagnostic army until they say the dialog is still missing **after** deploying the settlement files. Retest recipe: hard refresh + linked broken `Personal_BW_KDB`. Native banner may stay. Pass = WP6 dialog when that package is `"error"` (first error; do not wait for the other three); boot does **not** silently continue. Skip-warn on `ok && data !== true` is expected (NIT: also fires on healthy all-ready — quiet only if PO asks).
2. If **green**: PO says so → tick PROGRAM 6 **and** 7, approval-log one-liners, parent one-liners on `messageService.md` / `cognosHostService.md` / `loadingService.md` **after** you confirm dual-review already happened (it did for settlement). Stop. Do not start WP2.
3. If **still no dialog**: army first — contract↔code (`hasErrorDataSource.js`, `waitForSettledDataSourceList.js`, `presentCubesUnavailable.js` await). Fingerprint skip-warn vs missing facet vs labels empty vs `awaitCubesUnavailableHomeDialog` error. Prove: snapshot still too early (stuck `loading` past 15s) vs `getState` throw vs JS not deployed. **Proposal series** before any new wait/event. Do not silently grow to rec C.
4. Optional NIT (only if PO wants): skip-warn on healthy `ok`+`false` is noisy.

---

## Must not

Re-open cancel WP6. Fake detector / tableData. WP7 `showAlert`. New `messageService` method. CSS-hide cancel. Glass two-button footer. Tick PROGRAM 6/7 without PO green. Git commit unless PO asks. Dump `KDB.js`. Start WP2/SSS. Restore `waitForNonEmptyDataSourceList.js`. Two stacked waiters. Poll-until-error (C). `ds.on` without proven event names.

---

## Transfer (do not reload transcripts)

- Production tree: `_____________KDB3API`. Legacy: `laatsteOriginal/KDB2` (read-only).
- Quality over speed: a second army pass beats guessing.
- Diagnose lens: contract-drift vs both-correct-but-overwhelmed (this WP was the second).
