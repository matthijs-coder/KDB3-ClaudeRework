# Contract Delta: Dienststelle restore UX + fallback grain + apply hygiene

> User-visible restore hint when saved Dienststelle members are missing;
> per-scope default **recast**; fail-fast after global cannot apply/fallback.
> CP-3, BW map, display/use protocol, timeout-fail unchanged.

---

**Status:** `Implemented — baseline Cognos green 2026-09-03` (PO vastenburg: false MAG toast gone after §4.2 leaf-id lookup). Host items 5–7 (tab-miss toast, global unrestorable abort, URL overlay) still PO when fixtures exist.
**Parent:** `contracts/writeback.md` §2.2 / §6.5; `contracts/dienststelle-parameterSetRestore-contractdelta.md` §3 return / §5
**Depends on:** `messageService.md` (`notify` vs `showAlert`); `writeback-urlParameterId-contractdelta.md` overlay no-stack; `writeback/set/config/writebackLabels.js`
**Type:** `feature + shared-service contract delta`
**Authoring AI:** planner 2026-09-03
**Related:** `writeback-v2Map-contractdelta.md` (A1, Map only); `writeback-mapping-package-mismatch-contractdelta.md` (A2, validate fail)

---

## 1. Purpose

Live restore already:

- maps BW captions on this path only (`mapOldToNew: true`);
- treats “not in hierarchy index” as missing (no separate Rechte check);
- defaults **per missing scope** including `byTab` (`fallbackToDefault: true`);
- aborts SET when **global** cannot apply and cannot fallback (`required: true`);
- stays **silent** on degraded continue (`executeRestoreRun`: degraded-success
  heeft bewust geen toast);
- is **not** fail-fast inside `applyRestorePlan` (later `byTab` defaults can
  write after global fail, then abort).

PO 2026-09-03: keep abort threshold; **stop** overlaying S6 default on a tab
when global already restored a **saved** valid member; **info toast** on
committed/degraded fallback/missing; **never** stack with abort alert;
fail-fast remaining scopes when global cannot apply/fallback.

---

## 2. PO decisions (2026-09-03)

| # | Choice | Decision |
|---|---|---|
| C4 | Toast | **Info `message.notify`** when Dienststelle `fallbackScopes` **or** `missingValues` and RestoreResult is `committed` or `degraded`. Abort keeps existing `showAlert`. **Never both.** German only in `labels.de.writeback`. |
| C4 owner | Who fires | **`writebackSet` at run finish** (same site as `notifyRestoreFailure`). **Not** `dienststelle`. No “please toast” event. |
| C4 trigger | Not | `hasDegradedPhase()`, `WRITEBACK_DIENSTSTELLE_RESTORE_DISPLAY_DEGRADED` alone, NMS dest-skip, header icon. Stash owner `fallbackScopes` / `missingValues` from the dienststelle phase `result`. |
| C4 abort copy | Move to labels? | **Out of this WP.** Keep hardcoded DE abort alert. Optional hygiene later. |
| C5 | Tab default | If global applied a **saved** valid member, **do not** S6-default a missing `byTab` (leave empty after clear → Cognos inherit + vis global snapshot). If **global** misses: S6-default global when `fallbackToDefault`. If **all** requested scopes miss (including global): default remaining scopes as today (coherent whole-dashboard default). |
| C6 | Abort threshold | **Unchanged:** abort only if required global cannot apply **and** cannot fallback. |
| C6 | Apply hygiene | When global cannot apply/fallback: **do not** write later `byTab` scopes; **skip** restore reconcile; then SET abort. |
| B / CP-3 | BW map | Unchanged. Two-phase Map + restore-only; not on normal reconcile. |

---

## 3. C4 — user message

### 3.1 Copy (SSOT)

Add to `KDB3/js/core/services/writeback/set/config/writebackLabels.js`, merged
by `__orchestratorWriteback` onto `_KDB.config.labels.de.writeback` (same
path as URL-share keys). Notify is body-only. **Two** keys — pick **one**
per run (never concatenate). **PO 2026-09-08:** both keys use the **same**
German (wbParameterSet info toast). C5 apply is unchanged. Pick logic
unchanged.

```txt
dienststelleRestoreFallbackMessage:
"Eine oder mehrere gespeicherte Dienststellen-Auswahlen sind nicht verfügbar. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen oder alte Filteroptionen können nicht auf neue Options-IDs abgebildet werden. Für die betroffenen Bereiche wurde die Standardauswahl gesetzt."

dienststelleRestoreMissingMessage:
(same string as fallback)
```

Pick:

- `fallbackScopes.length > 0` → `dienststelleRestoreFallbackMessage`
  (even if `missingValues` also set).
- else `missingValues.length > 0` → `dienststelleRestoreMissingMessage`
  (C5: tab miss, global saved MAG kept, no S6 on that tab — copy still
  the Standardauswahl sentence).

Do not say the whole dashboard was defaulted.
Do not duplicate into `dienststelle` labels or inline JS.

### 3.2 Channel and gating

| RestoreResult | User UI |
|---|---|
| `failed` / `abortedByOwner` | Existing `showAlert` only (hardcoded DE). **No** info `notify`. |
| `committed` / `degraded` **and** stashed dstl `fallbackScopes.length \|\| missingValues.length` | **One** `message.notify` using §3.1 pick |
| `cancelled` / no `message` / destroy | Silent |
| DISPLAY_DEGRADED only (member applied, `d=u`) | **No** info toast |

`runFilterRestore.js` is live **149** lines. Capturing the owner result
**must** extract a helper (hard cap 150). `executeRestoreRun.js` (~99):
split a notify helper rather than stuffing overlay + info + abort.

Do **not** reuse `reconcileConfirmedDienststelle` `userNotify` (that is
widgetVis `dienststelleChanged`, not user copy).

### 3.3 URL overlay (`writeback-urlParameterId-contractdelta.md`)

While `urlShareBootOverlayActive`:

- do **not** `notify` this info toast live;
- do **not** `showAlert` from `notifyRestoreFailure` (already);
- deferred info is **below** missing-id and **below** pending abort:
  **missing-id > abort pending > deferred Dienststelle info**;
- **no stack** (at most one modal from `presentPendingUrlShareMessage`;
  info toast after overlay must not accompany that modal in the same
  present call). Destroy clears pending info.

Cite this precedence in any urlParameterId parent one-liner if the overlay
ladder is listed there.

2026-09-08 SSS: overlay field renamed `pendingDienststelleRestoreInfo` →
`pendingRestoreInfo`. Same ladder. If both dstl and SSS info hints exist
on one run, dstl wins (one toast).

---

## 4. C5 — fallback grain (replaces one §5 row)

`dienststelle-parameterSetRestore-contractdelta.md` §5 row
“saved values partially missing | apply valid scopes, fallback missing
scopes only when configured”:

**Replace with:**

| Condition | Behavior |
|---|---|
| saved values partially missing; **global** has at least one **saved** member that validates | apply valid scopes (incl. global); **do not** S6-default missing `byTab`; those PC scopes stay empty after clear (Cognos inherit / vis already binds **global** `dominantValues`) |
| saved values missing on **global** (and `fallbackToDefault`) | S6-default **global** with default-table `{d,u}` pair; then apply other scopes: valid saved → write; missing `byTab` → S6-default only if global itself is on the default path (all-miss / global-miss), not when global kept a saved member |
| hierarchy `rowCount === 0` | unchanged: diagnostic + configured fallback; still not “Rechte” |

Empty PC + valid global MAG is the S3 inherit path (`dienststelle.md`).
Writing S6 onto that tab while vis binds global MAG is **forbidden**
(false working tab).

`rowCount === 0` and member-not-in-index share the fallback **boolean**;
diagnostics stay distinct (`RESTORE_FAILED` zero rows vs `missingValues` /
`LABEL_UNMAPPED`). Toast copy must not say Rechte.

---

## 5. C6 — abort residue + fail-fast

Abort threshold **unchanged** (`requiredOk` is **global-only**).

**Apply hygiene (new):** if the global plan entry cannot apply and cannot
fallback, **stop** iterating remaining `byTab` writes; **do not** run
`runDienststelleReconcile` for that restore apply. Then owner `ok: false`.

**Residue (document, do not reorder SET):** `widgetReset` (step 9) already
parked vis shells before filters. On abort: tabs/sicht/other filters stay
SET-applied; widgets unrestored; history baseline replaced (no undo into
pre-SET); abort-lands original tab. Do **not** move Dienststelle before
step 9 to “fix” park.

If bind ran without snapshot: 5s `dienststelleGate` then SET abort with
shells possibly placed. Package abort **before** widget phase avoids that
spinner. Keep it.

---

## 6. Parent / owner sentences (implement GO)

- `writeback.md` §2.2 / §6.5: info `notify` when dstl fallback/missing and
  result ok; abort `showAlert` only; never both; `writebackLabels.js` key
  above. Fallback grain = this delta §4 (not blanket per-scope default).
- `dienststelle-parameterSetRestore-contractdelta.md` §5: replace the
  partial-missing row; add fail-fast when global cannot apply/fallback.
- Return contract §3: keep `fallbackScopes` / `missingValues` (SET reads
  them). No new public `_KDB.api.dienststelle` methods.

---

## 7. Files (implement GO)

Army confirm live names; typical blast:

| Area | Likely files |
|---|---|
| Plan | `dienststelle/actions/parameterSet/buildRestoreScopePlan.js` |
| Apply | `applyRestorePlan.js` (fail-fast) |
| SET capture | extract from `runFilterRestore.js` (149-line cap) |
| SET notify | `executeRestoreRun.js` + new thin helper under `set/effects/` |
| Labels | `writeback/set/config/writebackLabels.js` |
| Overlay | `presentPendingUrlShareMessage.js` precedence only if info can pend |

Do not edit `.mdc`. Do not add `_KDB.events` toast RPC.

---

## 8. Out of scope

- v2 SS `.d` vs `.u` extract
- A1 Map gate / A2 `pkg` fail
- Moving abort `showAlert` strings into labels
- Per-tab vis snapshot (pre-existing: vis binds **global** even when
  `byTab` has a **different** valid member)
- Legacy 10s anchored toast / `showMessageBelowElement`

---

## 9. Acceptance

1. Saved global MAG, missing tab member: global chip MAG; PC chip empty;
   vis queries MAG; **no** S6 chip on that tab; info toast still fires
   (`dienststelleRestoreMissingMessage`; same German as fallback as of
   2026-09-08).
2. Global miss + default table pair: global default; SET continues;
   widgets bind default; **one** info toast; no abort alert.
3. Global miss + no default: SET abort alert; **no** info toast; **no**
   leftover S6 chips on tabs (fail-fast); widgets parked.
4. DISPLAY_DEGRADED only: no info toast.
5. URL overlay: missing-id modal wins; no stacked Dienststelle toast.
6. CP-3: BW map still restore-only.

---

## Approval Log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-03 | `Approved` (contract) | PO vastenburg | C4 SET-finish notify; C5 no tab-default when global saved valid; C6 fail-fast; no Rechte. |
| 2026-09-08 | `Approved` (copy only) | PO vastenburg | Both C4 keys: rights hedge + ID-mapping + Standardauswahl. Pick/C5/abort/overlay unchanged. |
| 2026-09-08 | one-liner | SSS captain | Overlay field → `pendingRestoreInfo`; dstl-wins vs SSS. |
