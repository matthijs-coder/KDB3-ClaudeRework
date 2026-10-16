# Contract Delta: specialSingleSelect parameterSet restore rights notify

> When writeback SET restores a Personengruppe (Lehrlinge = alias) value the
> user cannot hold (filter right denied), keep live SSS hide+clear and show
> **one** info toast in the **same stride** as Dienststelle C4. Not a new
> service. Not a toast-port of legacy SSS (legacy was silent).

---

**Status:** `Implemented` — JS 2026-09-08; dual grok 4.6 review PASS (NIT-only). **Cognos:** green 2026-09-09  
**Type:** `feature + shared-service contract delta`  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (**SSS** — tick only after Cognos green)  
**Naslag:** `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` §SSS (facts, not law)  
**Stub:** `contracts/futureTodo/toast-message-port-wave3-specialSingleSelect-2026-09-07.md`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-08  
**Parents:** `contracts/specialSingleSelect.md` §9; `contracts/writeback.md` §6.3 / C4 twin `contracts/writeback-dienststelle-restore-ux-contractdelta.md`; `contracts/messageService.md` (`notify` / `showAlert` only)  
**OOS siblings:** WP2 `dienststelle-empty-ok-toast-contractdelta.md`; Leitung widget-banner (`specialSingleSelect.md` §17); Alle-lock popup (`pointer-events`)  
**Spec:** `contracts/specialSingleSelect-parameterSetRestore-rights-notify-execution-spec.md` (Executed; dual review PASS)

---

## Diagnosis (contract vs live)

| Layer | SSS rights / hide+clear / Alle-default | Restore **user message** |
|---|---|---|
| `specialSingleSelect.md` §9 | Specified | **Absent** |
| Live `specialSingleSelect/**` | Applied on every `syncRequested` (incl. `reason: "parameterRestore"`) | **Silent.** Zero `messageService` |
| Live writeback SET | `filt.sels` via `singleSelect` (no rights); then SSS sync (`required: false`) | C4 exists **only** for Dienststelle `fallbackScopes` / `missingValues` |
| Legacy SSS | Silent on hide/show/auto-default | No message to port |

This WP is **not** “SSS rights disagree with the parent matrix.” Policy matches §9. The gap is **overlay**: restore apply does not stash a C4-style hint; SET finish does not notify. Do not re-implement defaulting, Alle-hide, or a per-option allow list. Do not copy Dienststelle hierarchy `hasUseValue`.

There is **no** `core/services/dienststelle` and there will be **no** `core/services/sss*`. C4: apply in the filter owner; **writebackSet** fires the toast.

---

## 1. Purpose

After a successful SET restore, if SSS policy **cleared a non-empty restored Personengruppe value because the filter right is denied**, show one German info toast at SET finish (C4 channel). Live hide+clear stays the only apply. Auto-default notify + H2 Leitung: sibling `specialSingleSelect-restore-default-h2-contractdelta.md` (**Approved** 2026-09-09) — this P1 slice no longer owns those locks.

---

## TODO — Proposal series (**locked** 2026-09-08)

Army series + adversarial HOLD WITH PATCH. Captain locks below. **PO Approve** still required before spec/JS.

| # | Question | Locked |
|---|---|---|
| 1 | Where gate + hint live | **Keep `filt.sels` + existing `specialSingleSelect/syncRequested`.** No SSS `actions/parameterSet/`. No fifth restore owner. Thread a restore-only hint on the **existing ack** (do **not** re-read tableData / re-evaluate visibility in a sidecar). Writeback captures `phase.result` after the awaited restore sync. |
| 2 | Message owner / stride | **`writebackSet` at run finish** (`executeRestoreRun` → `notifyRestoreOutcome`). Not SSS. No “please toast” event. Existing `message.notify` only. |
| 3 | Predicate | **P1 only:** filter right **known denied** (`personengruppe` table) caused hide+clear of a **non-empty** restored value. **Drop P2** (Alle-denied + already selected is CSS hide; no mutation). **Not P3** (no per-option rights; `*_Filter` is default-only). Sicht-incompatible clear is **not** this toast (existing §9, not Rechte). |
| 4 | Value outcome | **V1:** keep live §9 policy. Toast is extra. Do **not** abort SET. Leave `required: false`, `degradedAllowed: true`. |
| 5 | Notify gate (P4 **strict**) | P1 toast **only** if that P1 clear actually ran. Keep-selected / rightsUnknown / restoreParked / apply fail still silent. **Auto-default notify:** sibling 2026-09-09 (no longer silent). **Do not** stash on `ok !== true`. |
| 6 | One vs N | P1: one toast **per filter** that cleared. Two filters → two `notify`s (sibling). Same filter, N pageContext instances → one label. |
| 7 | Dual fail with Dienststelle C4 | **One** info toast. Dstl `fallbackScopes` / `missingValues` **wins**. Else SSS key. Abort `showAlert` still never stacks. |
| 8 | Copy keys | **New** `writebackLabels.js` key(s). Do **not** reuse `dienststelleRestore*` strings. German only under `_KDB.config.labels.de.writeback`. This SSS toast **may** mention possible missing `Berechtigungen` (cubes register). Dienststelle C4 still must **not** claim Rechte. |
| 9 | Overlay | Reuse **one** pending `{ labelKey }` blob. **Rename** `pendingDienststelleRestoreInfo` → `pendingRestoreInfo`. Do **not** add a second pending field. Ladder unchanged: missing-id > abort > info. |
| 10 | Files / AMD | Thread 2–3 hint fields through SSS apply → `results[]` → restore ack. Thin writeback capture (extract `dispatchSpecialSingleSelectRestore.js` **if** `runFilterRestore.js` would exceed 150; else a few lines). Do **not** grow `createWritebackSetService.js` (148 / AMD 10). `notifyRestoreOutcome.js` stays one file (86 → ~110). |
| 11 | Prefix `dienststelle*` | **H2 in sibling** `specialSingleSelect-restore-default-h2-contractdelta.md` (exact MAG keys + v2 prefix drop; NMS out). |
| 12 | Late `known: false` | **Accepted miss** for this Draft: URL-share/boot can apply sels then no-op; later `loadFinished` mutates **without** C4. Document. Do not stash on ordinary tableData sync. Optional later: hint while `parameterSetRestoreActive` (not this WP unless PO upgrades). |
| 13 | Lehrlinge | Personengruppe alias only. Not a third `filterId`. |

---

## 2. Closed product intent (pending PO Approved)

| # | Lock |
|---|---|
| 1 | Owner of **apply:** `specialSingleSelect` (existing sync). Owner of **message:** `writebackSet`. Channel: `_KDB.services.message.notify` severity `info`. |
| 2 | Trigger: SET restore sync (`reason: "parameterRestore"`) **and** P1 clear of a non-empty restored Personengruppe value. |
| 3 | Copy: *nicht verfügbar* + possible missing `Berechtigungen` (hedged) + selection reset. Same family as cubes `Sie verfügen nicht über die erforderlichen Berechtigungen`, not a hard accusation. **Not** “whole dashboard defaulted”. **Not** Dienststellenleitung until H2. |
| 4 | Fail-closed: missing `notify` / label → `console.warn`; SET and SSS policy still run. |
| 5 | No new `_KDB` namespace, lifecycle term, cognosHost facet, or `messageService` method. SSS files must not call `_KDB.cognosAPI` / `__getDashboardAPI`. |
| 6 | Parent §9 rows for Alle-denied auto-default, keep-selected, unknown, Sicht hide: **unchanged** except this restore overlay. |

---

## 3. Locked mechanism

### 3.1 Apply (SSS)

Live `applyClearHiddenPolicy` already parks non-empty values and clears Cognos. Restore ack today drops `changed`.

- On `reason === "parameterRestore"` only, put on the per-filter result **and** the owner ack a C4-like hint, e.g. `clearedRestoredValues: [{ filterLabel }]` (or equivalent arrays writeback can stash).
- Populate **only** when: rights **known**, **filter right denied**, instance had a **non-empty** value that this sync **cleared**.
- Do **not** set the hint for Sicht-only hide, auto-default, keep-selected, parked restore, or `errorCode` failures.
- `routeSyncRequested` / `performSpecialSingleSelectSync` must forward the hint. Do **not** reuse `buildInventoryReconciledAck.js`.
- Ordinary `scheduleSync` (tableData / Sicht / dock) must not cause writeback to stash.

### 3.2 Writeback

- After the existing SSS `dispatchOwnerPhase` in `runFilterRestore.js`, stash `_run.specialSingleSelectRestoreHint` from `phase.result` when the hint arrays are non-empty. SSS `required: false` remains: owner `ok: false` still remaps to phase ok; **hint ≠ ok**.
- `notifyRestoreOutcome`: if dstl info key would fire, skip SSS. Else if SSS hint non-empty and RestoreResult is `committed` / `degraded`, one `notify` with the SSS label key. Overlay: pend `pendingRestoreInfo.labelKey` (renamed blob).
- Do **not** import SSS effects into writeback. Hint rides `phase.result` only (same as dstl `fallbackScopes`).

### 3.3 Candidate files (not a fifth owner)

| Path | Role |
|---|---|
| `specialSingleSelect/effects/applyClearHiddenPolicy.js` | Source of “non-empty cleared” |
| `specialSingleSelect/effects/syncOneSpecialFilter.js` | Put hint on per-filter result; do not grow past 150 |
| `specialSingleSelect/effects/performSpecialSingleSelectSync.js` | Aggregate hint; gate on `reason` |
| `specialSingleSelect/effects/routeSyncRequested.js` | Ack forwards hint |
| `writeback/set/effects/runFilterRestore.js` | Capture; extract dispatcher if 150 |
| `writeback/set/effects/dispatchSpecialSingleSelectRestore.js` | Candidate thin stash (dstl twin) |
| `writeback/set/effects/notifyRestoreOutcome.js` | Pick dstl vs SSS; overlay pend |
| `writeback/set/config/writebackLabels.js` | New SSS key |
| Overlay seeds / present / recover | Rename pending blob only |

**Must not edit (this WP):** `KDB.js`; `createMessageService.js`; generic `singleSelect` popup as rights owner; `dienststelle/actions/parameterSet/**`; WP2 notify helper; `.cursor/rules/*.mdc`.

---

## 4. Proposed copy (PO edits on Approve)

Add to `writebackLabels.js` (merge path unchanged):

```txt
specialSingleSelectRestoreClearedMessage:
"Eine oder mehrere gespeicherte Personengruppe-Auswahlen sind nicht verfügbar. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen. Die Auswahl wurde zurückgesetzt."
```

One key is enough for this WP (no dstl-style fallback vs missing split: SSS does not have glob/byTab inherit).

---

## 5. Out of scope

- New `core/services/` folder; SSS `parameterSetRestoreRequested`.
- Per-option allow list; inventing Lehrlinge as a third filter.
- Alle-lock of the whole popup; Leitung widget-banner.
- Changing rights tables or Sicht BW vs DEZPV policy.
- Making SSS sync `required: true` / aborting SET.
- Reusing Dienststelle restore German strings.
- H2 prefix fix (classify + GET/SET twins) — **sibling writeback WP**.
- Late `loadFinished` mutation toast (accepted miss unless PO upgrades).
- Wave-1 / WP2 / WP6 / WP7 files.

---

## 6. Acceptance (product — after JS, gated)

1. SET restore of a **non-empty** Personengruppe value while `personengruppe` right is denied → live hide+clear **and** one info `notify` at SET finish (C4).
2. Alle-denied, unselected/empty → auto-default **silent** (strict P4).
3. Alle-denied + already selected non-Alle → keep **silent**.
4. Rechte table not ready during SET → no this toast on that run; later tableData sync may still apply §9 **without** this toast.
5. Dienststelle C4 hint on the same run → **only** dstl toast.
6. Abort / cancelled / overlay-live: same C4 stacking rules as dstl.
7. Dienststellenleitung: no claim until H2; if sels never applied, no this toast.
8. Missing messageService: warn, no throw.

---

## 7. Parent one-liners (after dual review + JS, not before)

- `specialSingleSelect.md` §9: parameterRestore hide+clear of a non-empty denied-right value also notifies via writebackSet (this delta). Policy rows otherwise unchanged.
- `writeback.md` §6.3 / restore notify: SSS is still not a fifth owner; SET may stash `specialSingleSelectRestoreHint` from `syncRequested` ack; `pendingRestoreInfo` is the generic overlay info blob.
- `writeback-dienststelle-restore-ux-contractdelta.md`: overlay field rename; dstl-wins vs SSS.

---

## 8. Implement gate (unchanged)

Before **any** production JS/CSS: re-read PROGRAM wave-2 rows **2, 6, 7**. Ask PO in Dutch whether those boxes are `[x]` with Cognos green **and** whether SSS JS may start. Wait for explicit yes.

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-08 | Draft | SSS captain | Intake → series → stress-test HOLD WITH PATCH. Mechanism locked in this Draft. No JS. |
| 2026-09-08 | Draft | PO vastenburg | Copy: add hedged Berechtigungen sentence (cubes register). |
| 2026-09-08 | Approved | PO vastenburg | Full German copy approved. Spec next. No JS. |
| 2026-09-08 | Implemented | SSS captain | Allowlist JS + dual review PASS. Parent one-liners. Cognos pending. |
| 2026-09-09 | Cognos green | PO vastenburg | Behaviour as intended. |
