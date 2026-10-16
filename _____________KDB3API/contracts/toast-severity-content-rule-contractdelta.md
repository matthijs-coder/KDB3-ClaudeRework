# Contract Delta: Toast severity content-rule (align live callers)

> One content rule for toast `severity`. Callers map **what happened to the requested domain action**. The service stays a token pipe. No exceptions. Not PROGRAM 2 / 6 / 7 / SSS.

---

**Status:** `Frozen` — PO Cognos green 2026-09-08. Hygiene CLEAN. Parent one-liners written. Residual peel parked. Do not tick PROGRAM 2 / 6 / 7 / SSS.  
**Type:** `cross-module content-rule contract delta`  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (standing orders only — **do not** tick rows 2 / 6 / 7 / SSS)  
**Handoff:** `contracts/futureTodo/toast-severity-content-rule-captain-handoff-2026-09-08.md`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-08  
**Parents:** `contracts/messageService.md` (`severity?` caller-owned; Q2 surface; Q6 / §1 consumers map domain)  
**Census:** army 2026-09-08 — **closed**. Live `notify` / `notifyAnchored`: **30** sites, **26 KEEP**, **4 DRIFT**, **0 UNCERTAIN**. No leftover `message.warn`. No omitted `severity`. Parked (not live): `notifyZoomHint.js` (commented orchestrator). Restore-abort `showAlert` `error` excluded (KEEP).

---

## Diagnosis (contract vs live)

`messageService.md` already owns **tokens**, not **meaning**. Shared option `severity?` is `"info" | "success" | "warning" | "error"`, default `"info"`, **caller-owned**. §1 / Q6: consumers map domain outcomes; the service must not grow a domain Q.

This slice is **not** a missing-toast port and **not** a new `messageService` method.

| Layer | Tokens | Domain meaning |
|---|---|---|
| `messageService.md` | Specified (`severity?`) | **Absent** (caller-owned) |
| Live callers | Tokens present | Some map Glass-legacy / “feels yellow”, not the action outcome |
| This delta | Unchanged tokens | **The mapping rule** + align every live `notify` / `notifyAnchored` |

Census KEEP includes: table load `error`; history undo/redo `error`; WP2/3/4/8; restore C4 + overlay `info`; dropbox name-conflict / helper-tab / out-of-bounds `warning`; tabs conflict / min / max / same-position `warning`; settings **invalid** `warning`; copy OK `success` / copy fallback `warning`. Parents still match those KEEP tokens. `messageService.md` Q2 is surface-only.

DRIFTs (no parking):

| Caller | Live JS | Old lock | New rule | Kind |
|---|---|---|---|---|
| Settings min-applied (`KDB_CONTROL_SETTINGS_DIMENSION_MIN_APPLIED`) | `warning` | **none** (`kdbControl.md` silent) | `info` | Mapping overflow in JS only |
| Tabs **committed** degraded (post-commit / per-entry; copy “Die Aktion wurde ausgeführt…”) | `warning` | `tabs-tabCrud-contractdelta.md` §2.4 as-built **warning notify** | `info` | Old as-built sentence **and** JS agree; both disagree with this rule |
| Tabs **residual rollback** (D-CRUD-7a; same `outcome: "degraded"` + same copy) | `warning` | §2.4 **outcome union** (degraded = committed FYI **and** residual damage). As-built UI sentence only describes committed. | `error` | **Overflow:** one outcome + one toast + executed copy for two domain meanings. Token-only `warning`→`info` on `outcome==="degraded"` **mis-grades residual**. Do not reopen the outcome enum. |

`kdbControl-tabsCrud-contractdelta.md` `warning` on `TABS_MIN_VISIBLE` / `TABS_MUTATION_CONFLICT` **stays** (§2 lock 9). SSS rights-notify `info` is OOS. Copy restyle for “blocked sentence on an applied action”: **no** (min-applied and degraded copy already say applied/executed). Residual copy is the **opposite** lie — ask PO in Q6.

---

## 1. Purpose

Lock one severity rule for all live `_KDB.services.message.notify` and `notifyAnchored` callers. Chrome stays as-is (Glass `warning` = yellow + exclamation; Glass/`info` = blue; KDB anchored `warning` = yellow bar, no glyph). Not everything the same colour — one rule, no exceptions.

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | Pick the token from **what happened to the requested domain action**, not from legacy Glass type and not from “this feels yellow.” |
| 2 | **`error`** — machinery / path **failed** (load, replay). User cannot treat it as handled. Restore-abort stays `showAlert` `error` (out of this JS align except: do not change it). |
| 3 | **`warning`** — user click/gesture **refused**. Nothing they asked for landed. They must do a **different** legal action. |
| 4 | **`info`** — domain path **completed**, with substitute or FYI (default applied, restore fallback, zoom hint). Informed recovery. |
| 5 | **`success`** — completed **positive** copy (copy-to-clipboard OK). Do not fold into `info`. |
| 6 | Census DRIFTs (4 sites) are aligned this slice. Residual D-CRUD-7a hitchhiking `info` is an **accepted parked cheat** (PO: do not overdesign). Not a fifth toast. |
| 7 | Service does **not** own this mapping. No new `messageService` method. No new `messageService` Q. No `warn` revival. |
| 8 | **KEEP** (already fit the rule; do not change): WP3 Top-N blocked `warning`; WP4 pad exhausted `warning`; WP8 add-at-max `warning`; WP2 empty-OK `info`; restore H2/H3 `info`. |
| 9 | Settings **invalid** (`proceed: false`) stays **`warning`**. Tabs min/max/conflict/same-position stay **`warning`**. Copy fallback (click did not land) stays **`warning`**. Copy OK stays **`success`**. |
| 10 | Copy restyle is **not** default. Token-only unless a German sentence is literally a “blocked” sentence for an action that **applied** — then ask PO. Do not reopen WP2 copy/hook/`info`. |
| 11 | No new events, `_KDB` namespace, lifecycle term, or cognosHost facet. No `.mdc` edits. |

---

## TODO — Proposal series (**locked** 2026-09-08 — **S**)

PO: go-if-stands. Second pass STAND WITH NIT.

| Depth | Lock |
|---|---|
| **S** | Token-only on the 4 DRIFT sites. Helper honors **valid** `payload.severity` (`info\|success\|warning\|error`), else `"warning"`. Gate passes warning/warning/info. Tabs: three `"info"` on existing degraded `notify`. No `phases.rollback`. No `showAlert`. Residual hitchhikes `info`. |
| **M** | Reject this slice. |
| **D** | Reject. |

---

## 3. Locked mechanism (**S**)

| Piece | Law |
|---|---|
| Rule home | This delta. After Cognos green: one-liner on `messageService.md` `severity?`. No new service Q. |
| JS | Token-only. Copy unchanged. |
| Settings | Gate sets `payload.severity`; helper pipes valid tokens. Invalid `warning`; min-applied `info`. Missing/garbage token → `"warning"` (not `p.severity \|\| "warning"`, not service-default `info`). |
| Tabs | Three `"info"` literals on the existing degraded `notify` only. No `phases.rollback`. No `showAlert` change. Residual hitchhikes `info`. |
| Allowlist | The five files below. One package (helper + gate keys + three flips). |

**CHANGE only:**

- `warnSettingsMessage.js` — both notify paths: allowlist token, else `"warning"`.
- `gateSettingsDimensionActions.js` — INVALID sites `severity: "warning"`; MIN_APPLIED `severity: "info"`.
- `confirmAndDispatchTabDelete.js` / `…Duplicate.js` / `…Move.js` — degraded arm `"warning"` → `"info"`.

**KEEP:** pending-conflict, min/max/same-position, `showAlert` error, copy, codes, `HOST_RESYNC_FAILED` fallback, `readPrimaryCode`. No `defaults.js`. No 6th file.

---

## 4. Out of scope

- PROGRAM WP6 / WP7 / SSS / a new toast census of missing legacy toasts.
- WP2 product (copy, hook, `info`).
- New `messageService` method or domain-interpreting Q.
- Glass footer two-button hacks / toast clones.
- `showAlert` / `confirm` / `choose` restyle. Residual peel / `phases.rollback` branch (**M**) unless PO rejects **S**.
- Re-enable parked `notifyZoomHint.js`. Reopen D-CRUD-7a outcome enum.
- Ticking PROGRAM boxes 2 / 6 / 7 / SSS.

---

## 5. Parent one-liners (**done** 2026-09-08)

- `messageService.md` `severity?` row: pointer to **this** delta (Q2 not rewritten).
- `tabs-tabCrud-contractdelta.md` §2.4 as-built: degraded `notify` **`info`**; Duplicate named; residual parked.
- No `kdbControl.md` one-liner.

---

## Approval log

- 2026-09-08 — Draft opened. Product table §2 locked from PO. Proposal series open. JS forbidden.
- 2026-09-08 — PO go-if-stands. Depth **S** locked. Second pass STAND WITH NIT. JS via execution spec.
- 2026-09-08 — Dual review PASS WITH NITS (mechanical + semantic). Cognos pending. Parent one-liners after green. Pre-existing `payload` without `_` on `warnSettingsMessage` left (NIT, not this slice).
- 2026-09-08 — PO Cognos **green**. Hygiene CLEAN (duplication + dead-code/refs). Parent one-liners written. Slice **closed**.
