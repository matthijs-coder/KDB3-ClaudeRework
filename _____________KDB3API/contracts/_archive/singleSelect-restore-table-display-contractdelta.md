# Contract Delta: Parameter-set restore keeps resolved display (not Cognos `d=u` echo)

> Persist **use** in `filt.sels`. Display comes from a unique hit: dump **map** first, then `{Filter}_Filter`, then dump **singleton** fallback. Owner must keep that caption when Cognos reread echoes `d === u` **or** a member token (`DST_LTNG`) that is not the Filter caption. Closed dock chip stays Cognos `.d` this slice (no overlay). Rights tables are not display.

---

**Status:** `Implemented` (follow-up) — dual review PASS 2026-09-09. **PO Cognos green 2026-09-09.** Parent one-liners applied.  
**Type:** `feature-module contract delta`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Parents:** `contracts/singleSelect-filterInstanceIdentity-contractdelta.md` §7.3 / §8; `contracts/writeback-filterInstanceIdentity-contractdelta.md` §5; `contracts/singleSelect-parameterSetRestore-contractdelta.md` (`vals` = use); `contracts/writeback.md` (`filt.sels` restore use; display derived)  
**OOS:** SSS P1/H2/Leitung/dstl-wins; filterDock overlay (M2); popup hydrate (H0); Jahr/Monat identity caption (F3); persist display in `filt.sels`; new `messageService` method; `applySpecialSelectionPolicy.js`; `writeVerifiedSelection.js` on this path; shared `classifyRestoreObservedDisplay.js`; `.mdc`  
**Spec (wave 1):** `contracts/singleSelect-restore-table-display-execution-spec.md` (`Executed`)  
**Spec (follow-up):** `contracts/singleSelect-restore-filter-over-dump-execution-spec.md`

---

## Diagnosis (contract vs live)

| Layer | Law | Live |
|---|---|---|
| Persist | `vals` = use only | GET copies `useValue` only |
| Derive | map unique, then `*_filter`, then dump singleton | Live still dump-singleton inside `readExplicitPair` **before** Filter — global `DST_LTNG` / `Lehrlinge` never reach `*_filter` |
| Host write | true pair, then reread | writes resolved pair (or transport `d=u`) |
| Commit | §8 step 5: **observed** `.d/.u` | unique **hit** + echo `d===u` → owner stores the MUN as `"cognos"` (`transportOnly` only if already `degraded`) |
| Resync | required; verifies **both** d and u | recements `observed.d`; throws if `displayValue` null (that throw is what blocks `{d:"",u}`) |
| Reconcile | — | `createFilterInstanceState` preserves only `"unavailable"` when host `d===u`; writeback restore **bypasses** restore-phase reconcile; **terminal resync** reconcile recements |
| Chip | Cognos `.d` | KDB does not overlay singleSelect |

**Overflow, not GET/SET mismatch.** SSS does not apply `sels`. Dump-MUN Personengruppe / DST_LTNG hit `readExplicitPair` and **never reach** the option table — M1 must cover that, not only `config.tables` rows.

**Follow-up (Cognos 2026-09-09):** `dienststellenleitung` rights = `{d:1,u:1}` (visibility). Caption lives in `dienststellenleitung_filter` (`display: "Dienststellenleitung"`, same DST_LTNG MUN). Dump singleton `DST_LTNG` wins first → host/owner/chip `DST_LTNG`. Same pattern: `personengruppe` vs `personengruppe_filter`. Relock: Filter unique over dump singleton; lock 6 preserve `"table"` even when host `.d` is a member token (`DST_LTNG !==` MUN).

Dropped earlier: M4 wait-loop, extra restore rewrite, F3, shared classifier file.

---

## TODO — Proposal series (**locked** 2026-09-09, third pass)

| # | Question | Locked |
|---|---|---|
| S | Scope | **S4 instance** = `config.tables[resolveFilterOptionsTableKey(filterLabel)]` exists (umlaut via live `EXPLICIT_TABLE_KEYS` only). **M1 apply** = `resolved.degraded === false`. **Follow-up Q1-B:** unique `*_filter` `use` beats dump **singleton**; map `selectionValuesByDisplay` still first. F1 = lookup actually degraded. Rights keys are not display. |
| M | Unique hit + echo `d===u` | **M1 slim** — commit **resolved `d`**, `displaySource: "table"`. No extra restore write. No wait loop. No new verify **mode**. Resync: write owner pair; 3-arg `verifyCommitFilterValue` or `readValues` as probe; on `!ok` **keep owner**, **no throw**, **no** `rollbackHostWrite`, **no** recement `observed.d`. Do **not** edit `verifyCommitFilterValue.js`. |
| F | Degraded miss | **F1** — restore still writes transport `d=u`. Resync: **skip `writeValues`** (and verify/rollback/canonical) when incoming `"unavailable"` / null `d` **and** non-empty `use`. Do **not** only delete the throw (live would write `{d:"",u}` then rollback restore). Alle/empty still writes `[]`. |
| H | Popup hydrate | **H0** — out. Residual: first open can wipe `use` if option label ≠ owner `d`. |
| Chip | Dock text | **Out.** Overlay = M2 later. This slice: owner / PDF / history pair + SET no longer dies on F1 throw or table-echo verify. |

---

## 1. Purpose

Stop parameter-set restore from treating a Cognos `d===u` echo as confirmed display after a unique resolved pair. Keep `filt.sels` use-only. Do not paint the dock.

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | Owner: **`singleSelect`**. SSS Personengruppe / Dienststellenleitung ride this path (`selectionOwner: "singleSelect"`). No fifth restore owner. |
| 2 | Unique pair from existing `resolveRestoreSelectionPair` (no new lookup, no MUN parse, no rights tables). Order: unique `selectionValuesByDisplay` map `use` hit **first**; then unique `*_filter` `findMatchingUseValue`; dump `displayValue`+`useValue` **singleton only if** Filter has no unique hit (not ready / 0 / >1). Split map vs singleton so Filter can run between them. |
| 3 | Unique hit (`degraded === false`) ∧ reread `u` matches ∧ `observed.d !== resolved.d` → commit `{ displayValue: resolved.d, useValue: observed.u, displaySource: "table" }`. Do not parse display from a MUN. **Do not** use `observed.d === use` as a gate (collides with lock 4 when `resolved.d === use`). |
| 4 | Unique hit ∧ `observed.d === resolved.d` → commit observed pair, `displaySource: "cognos"`. Covers valid `resolved.d === use`. |
| 5 | `degraded === true` (no unique pair: no config, empty/wait fail, 0 or >1 use matches, dump use mismatch): transport `d=u` + `RESTORE_DISPLAY_DEGRADED` + owner `null` / `"unavailable"`. |
| 6 | `createFilterInstanceState`: **separate** preserve branch for `"table"` (keep table `d`, do **not** reuse the unavailable assignment that zeros `d`). Preserve iff existing source `"table"`, same `use`, existing `d` non-null, **and** `existing.d !== host.d`. **Do not** require `host.d === host.u` (member-token echo `DST_LTNG` ≠ MUN must not wipe Filter caption at terminal reconcile). If host `.d` already equals owner `.d`, lock 4 `"cognos"` — preserve does not fire. Load-bearing pass = **terminal resync reconcile**; writeback restore-phase reconcile is bypassed. Click-commit that sets `"cognos"` is not this branch. |
| 7 | Resync `applyConfirmedPair`: **`"table"`** + non-null `d` → `writeValues` owner pair; probe 3-arg verify or `readValues`; on `!ok` keep owner via `applyConfirmedState` (not `updateCanonicalInstance(observed.d)`). **`"unavailable"` / null `d` + non-empty `use`:** skip write, skip verify, skip rollback, skip canonical recement; leave restore host; SET `ok` with restore `degraded`. **Alle/empty:** still `writeValues([])`. Do not gate skip-write on `!displayValue` after the `null`→`""` coerce (that would skip Alle). |
| 8 | Reuse `hostFilterWrite` + `commitSelectionState.applyConfirmedState`. Do **not** call `writeVerifiedSelection`. Do **not** grow `applySpecialSelectionPolicy.js`. Split `applyRestoreSelectionCore.js` **before** adding lines (**120 / AMD 7**). Classify in the restore-commit **sibling**, not a shared classifier. Resync branches on incoming `displaySource`. |
| 9 | No overlay, no new events, `_KDB` namespace, lifecycle term, or cognosHost facet. Do not persist display in `filt.sels`. Do not edit `.mdc`. |
| 10 | History replay of `"table"` stays `{d: resolved.d, u: use}`. Replay verify-both fail on echo = residual. Hydrate wipe = residual (H0). PDF already allowlists `"table"` — captions may appear there while the chip stays a MUN. |

---

## 3. Locked mechanism

Live sizes at lock (JS **150** / orch **120** / AMD **10**):

| File | Lines | AMD |
|---|---|---|
| `actions/parameterSet/applyRestoreSelectionCore.js` | **120** | **7 — split first** |
| `actions/parameterSet/applyRestoreSelection.js` | 37 | 2 |
| `effects/resolveRestoreSelectionPair.js` | **84** | **4 — follow-up: reorder + split map/singleton** |
| `actions/parameterSet/parameterSetResyncApplyPair.js` | 110 | 5 — skip-write + keep-owner; no twin writer |
| `state/createFilterInstanceState.js` | 77 | 1 |
| `effects/commitSelectionState.js` | 42 | 1 |
| `effects/verifyCommitFilterValue.js` | 54 | 1 — **do not weaken** |
| `effects/writeVerifiedSelection.js` | 93 | 3 — **do not call** |
| `actions/applySpecialSelectionPolicy.js` | 124 | 6 — **do not touch** |
| `effects/hydrateStateFromPopup.js` | 59 | 3 — **do not touch** |
| `filterDock/config/ownerRoutes.js` | 68 | 0 — **do not touch** |

### 3.1 Files

| File | Role |
|---|---|
| `applyRestoreSelectionCore.js` | Sequencer only after split: write existing resolved pair → use-only reread (`readValues`) → restore-commit sibling. **No** second write. **No** wait loop. |
| Restore-commit sibling (name at spec) | Unique hit ∧ `observed.d !== resolved.d` → `applyConfirmedState` with `resolved.d` + `"table"`; else today’s cognos / unavailable. |
| `resolveRestoreSelectionPair.js` | Follow-up: map unique → Filter unique → dump singleton. Factory-scope split of map vs singleton. `readRows([{ tableName }])` array input. |
| `createFilterInstanceState.js` | Lock 6: preserve `"table"` without `host.d === host.u`. Unavailable branch unchanged. |
| `parameterSetResyncApplyPair.js` | Lock 7. Prefer `applyConfirmedState` with **owner** pair. |

Do **not** add `classifyRestoreObservedDisplay.js`, `waitRestoreHostValues.js`, or `rewriteRestoreHostPair.js`. Keep `applyRestoreSelection.js` as catch wrapper.

---

## 4. Acceptance

1. After SET of a unique **Filter** hit for the DST_LTNG MUN: owner `displayValue` is Filter `display` (`"Dienststellenleitung"`), not dump `"DST_LTNG"`, `useValue` persisted use; `displaySource === "table"` when host `.d` is `DST_LTNG` or `d===u`. If host `.d` equals Filter caption: `"cognos"` (lock 4). Dump singleton `DST_LTNG` / `Lehrlinge` is fallback only when Filter is not unique.
2. Unique hit whose `resolved.d ===` use and host `.d` matches: `displaySource === "cognos"` (lock 4).
3. GET `filt.sels[].vals` still use-only.
4. SSS keep-selected: `use` unchanged → `isUnselected` false → no applyDefault from this slice.
5. F1 miss: restore `degraded: true`, owner `null` / `"unavailable"`; resync does **not** write `{d:"",u}` and does **not** fail SET with `refusing d=u resync synthesis`.
6. Alle resync still writes `[]`.
7. Click commit and SSS policy still use both-field `verifyCommitFilterValue`.
8. No dock overlay; chip may still show Cognos `.d`. PDF may show owner caption.
9. `applyRestoreSelectionCore.js` ≤ 150 / AMD ≤ 10 after split. `applySpecialSelectionPolicy.js` untouched.

---

## 5. Parent one-liners (applied 2026-09-09 after Cognos green)

- `singleSelect-filterInstanceIdentity-contractdelta.md` §8 steps 4–5: on parameter-set restore/resync, when `resolveRestoreSelectionPair` returns a unique pair, **resolved `d` may win over observed `d`** if they differ; transport `d=u` still must not become confirmed display when the lookup was **degraded**. One-shot `readValues` (no new loop).
- `writeback-filterInstanceIdentity-contractdelta.md` §5 steps 4–5: same; resync must not abort SET solely because host `.d` ≠ resolved `d` after a unique hit, and must skip write (not throw) on `"unavailable"` after F1.
- `singleSelect.md`: no new public methods.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-09 | Proposal series locked (S4 instance + M1 on any unique pair, F1 skip-write, H0; drop M4/rewrite/F3/shared classifier) | coordinator + army third pass | Await PO Approved |
| 2026-09-09 | Approved | PO vastenburg | Handoff: implement; do not rewrite S/M/F/H; chip overlay OOS |
| 2026-09-09 | Implemented | dual grok 4.6 | Mechanical PASS; semantic PASS (NIT: table keep-owner skips preCommitGuard; lock 7 holds) |
| 2026-09-09 | Approved follow-up | PO vastenburg (GO if army KEEP) | Q1-B Filter unique over dump singleton; Q2 no M2; lock 6 drop `host.d===host.u`; Q3 S4 `*_filter`. Second-pass KEEP. |
| 2026-09-09 | Implemented follow-up | dual grok 4.6 | Mechanical PASS; semantic PASS |
| 2026-09-09 | Cognos green | PO vastenburg | Dienststellenleitung / Personengruppe restore display confirmed in Cognos. Parent one-liners applied. Chip overlay (M2) and H0 hydrate remain OOS. |
