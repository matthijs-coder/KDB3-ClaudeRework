# Execution Spec: Toast severity content-rule (token-only S)

> Mechanical spec for Grok 4.6. Architecture lives in `toast-severity-content-rule-contractdelta.md` (**Approved**, PO vastenburg 2026-09-08 go-if-stands). Do **not** re-decide S vs M vs D, copy restyle, `phases.rollback`, `showAlert`, or a `defaults.js` severity constant.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo every row in Section A **before** producing files. Ship helper + gate keys + three flips as **one package**.

---

**Status:** `Frozen` — Cognos green 2026-09-08. Dual review PASS WITH NITS. Hygiene CLEAN. Parent one-liners done.  
**Module / contract:** `contracts/toast-severity-content-rule-contractdelta.md` + `contracts/messageService.md` (`severity?` caller-owned)  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-08  
**Executing AI:** grok 4.6 army  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist (one writer)

**May edit (only these five):**

- `KDB3/js/dashboard/canvas/kdbControl/settings/warnSettingsMessage.js`
- `KDB3/js/dashboard/canvas/kdbControl/settings/gateSettingsDimensionActions.js`
- `KDB3/js/dashboard/tabs/effects/confirmAndDispatchTabDelete.js`
- `KDB3/js/dashboard/tabs/effects/confirmAndDispatchTabDuplicate.js`
- `KDB3/js/dashboard/tabs/effects/confirmAndDispatchTabMove.js`

**Must not edit:** `tabEditIconActions.js`; `applySettingsAction.js`; `buildMutationResult.js`; saga / owner-phase files; `tabs/config/defaults.js`; `createMessageService.js`; `KDB.js`; KEEP notify callers; parent contracts (captain after Cognos green: `tabs-tabCrud-contractdelta.md` §2.4 + `messageService.md` `severity?`); `.cursor/rules/*.mdc`; git.

**Must not create:** any new file; `helpers/` / `common/` / `shared/`; a reason→severity mapper; a `phases.rollback` branch.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` via argument; no new top-level namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — this slice does not write `_KDB.state`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no new runtime bucket.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new public method; no new `messageService` method.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150; orch ≤120; AMD >10 requires split. After edit: helper ≤31 / AMD 0; gate ≤84 / AMD 4; Delete ≤91 / AMD 2; Duplicate ≤93 / AMD 2; Move ≤95 / AMD 4 (string flips +0 lines; gate +3 keys).
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files; `_` on boundary params; no DE literals added (copy unchanged).
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — keep existing try/catch; do not strip them.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no new `document.querySelector`; helper DOM branch unchanged.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; factory-scope named helpers; no new nested subfunctions; no ES modules; **no new AMD imports**.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle terms.
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` / `__getDashboardAPI`; no new facet.
13. `_____________KDB3API/contracts/toast-severity-content-rule-contractdelta.md` — Approved **S**: token-only; helper allowlist default `"warning"`; gate warning/warning/info; three degraded `"info"`; residual hitchhike accepted.
14. This execution spec.

---

## Section B. Folder tree (edit order)

```
KDB3/js/dashboard/canvas/kdbControl/settings/warnSettingsMessage.js
KDB3/js/dashboard/canvas/kdbControl/settings/gateSettingsDimensionActions.js
KDB3/js/dashboard/tabs/effects/confirmAndDispatchTabDelete.js
KDB3/js/dashboard/tabs/effects/confirmAndDispatchTabDuplicate.js
KDB3/js/dashboard/tabs/effects/confirmAndDispatchTabMove.js
```

No new folders. No new files.

---

## Section C. Per-file specifications

#### `KDB3/js/dashboard/canvas/kdbControl/settings/warnSettingsMessage.js`

- **Role:** effect helper (pipe to `notify` / `notifyAnchored`)
- **Lines:** keep 30; hard 31 if a named factory-scope resolver is added
- **AMD imports:** none (`define([])`) — do not add
- **Change:** both notify paths (today hardcoded `severity: "warning"`, ~L13 anchored and ~L15 `notify` fallback). Resolve token:
  1. If `payload.severity` is exactly `"info"` or `"success"` or `"warning"` or `"error"` → use it.
  2. Else (missing, `null`, `""`, typo) → `"warning"`.
- **Forbidden:** `p.severity || "warning"` (garbage non-empty still becomes service-default `info`). No `code` switch. No rename. Copy/duration/`fieldId`/code unchanged. Keep existing try/catch.
- **Rules to apply:** `amd.mdc` (no new nested fn inside entry if that would nest; a factory-scope `resolveSeverity(_payload)` is allowed); `naming.mdc` (`_` on boundary); `error-handling.mdc` (keep try/catch); `feature-structure.mdc` (≤150, AMD 0).

#### `KDB3/js/dashboard/canvas/kdbControl/settings/gateSettingsDimensionActions.js`

- **Role:** gate (already knows refuse vs clamp)
- **Lines:** 81 → 84; hard 150; AMD stay **4**
- **Change:** add `severity` key on the three existing `warnSettingsMessage` payloads only:
  - INVALID `!parsed.ok` (~L48–52) → `severity: "warning"`
  - INVALID non-finite compare (~L63–67) → `severity: "warning"`
  - `KDB_CONTROL_SETTINGS_DIMENSION_MIN_APPLIED` (~L71–75) → `severity: "info"`
- **Forbidden:** omit INVALID keys (default is net, not an excuse to omit). Do not change `proceed`, `code`, `message`, `fieldId`.
- **Rules to apply:** `amd.mdc`; `naming.mdc`; `error-handling.mdc` (keep); `feature-structure.mdc` (AMD 4).

#### `KDB3/js/dashboard/tabs/effects/confirmAndDispatchTabDelete.js`

- **Role:** confirm + dispatch effect
- **Lines:** 91 stay; AMD **2** stay
- **Change:** **only** the `outcome === "degraded"` notify object (~L50–56): `severity: "warning"` → `"info"`.
- **KEEP unchanged:** ~L13 pending CONFLICT `warning`; ~L59–61 MIN_VISIBLE `warning`; ~L63–65 CONFLICT `warning`; `showAlert` `error` arms; copy; `readPrimaryCode`; `HOST_RESYNC_FAILED` fallback; `TAB_MUTATION_DEGRADED_TEXT`.
- **Forbidden:** `phases.rollback` branch; retoken other arms.
- **Rules to apply:** `amd.mdc`; `naming.mdc`; `error-handling.mdc` (keep); `feature-structure.mdc`.

#### `KDB3/js/dashboard/tabs/effects/confirmAndDispatchTabDuplicate.js`

- Same as Delete: degraded notify ~L50–56 `"warning"` → `"info"`. KEEP pending CONFLICT, MAX_VISIBLE, CONFLICT, `showAlert` error. AMD **2**. Lines 93.

#### `KDB3/js/dashboard/tabs/effects/confirmAndDispatchTabMove.js`

- Same: degraded notify ~L70–76 `"warning"` → `"info"`. KEEP pending CONFLICT, SAME_POSITION, CONFLICT, `showAlert` error. AMD **4**. Lines 95. Code-read stays inlined.

---

## Section D–I

N/A. No new reducer, selectors, public API, harness, or mocks.

---

## Section J. Acceptance criteria

1. Only the five allowlisted files changed. No new files.
2. Helper: valid four tokens honored; anything else `"warning"`. Not `|| "warning"`.
3. Gate: three explicit `severity` keys (warning, warning, info).
4. Three tabs files: **only** the degraded `notify` token flipped to `"info"`.
5. Blocked / pending / `showAlert` arms still `"warning"` / `"error"` as today.
6. Copy, codes, AMD import counts, `proceed` logic unchanged.
7. Line counts ≤ spec. No new nested functions inside entry bodies.
8. No `_KDB.cognosAPI`, no new `messageService` method, no `defaults.js` edit.
9. Report: Section A 14 echoes + file checklist (path, lines, AMD, matches spec | deviation).

---

## Section K. Forbidden actions

- M / D: `phases.rollback`, `showAlert` retarget, new helper module, copy restyle, `defaults.js` severity constant.
- Edit `.mdc`, parent contracts, git, `KDB.js`, `createMessageService.js`.
- Invent architecture. Skip Section A.

---

## Section L. Reporting template

1. Pre-flight echo (14).
2. File checklist (path, lines, AMD, matches spec | deviation).
3. Deviations (if any).
4. Section J pass/fail.
5. Open questions.

---

## Section M. Reviewer handoff

Captain: verify echoes; dual grok review (short FAIL/NIT: token allowlist, INVALID still warning, only degraded arm flipped); do **not** self-certify Cognos. After green: parent one-liners (`messageService.md` `severity?`; `tabs-tabCrud-contractdelta.md` §2.4 as-built warning→info + mention Duplicate). Residual union stays parked.
