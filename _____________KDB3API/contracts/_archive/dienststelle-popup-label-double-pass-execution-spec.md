# Execution Spec: Dienststelle DEZPV popup label eager + confirm double-pass

**Status:** Draft for execution approval  
**Module / contracts:** `_____________KDB3API/contracts/dienststelle.md`, `_____________KDB3API/contracts/filterDock.md`  
**Phase:** popup display sanitize race fix after browser diagnostics  
**Authoring AI:** Claude (diagnostic session), 2026-06-05  
**Executing AI:** TBD  
**Reviewer:** user / planner AI / supervising AI  
**Communique:** `_____________KDB3API/contracts/dienststelle-popup-label-double-pass-communique.md`

---

## Section A. Pre-flight read list

The executing AI must read each file below before editing and echo one sentence per item:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/contracts/dienststelle.md` — popup display sync + observer ownership sections
12. `_____________KDB3API/contracts/filterDock.md` — `popupDisplayResync` capability sections
13. `_____________KDB3API/contracts/dienststelle-popup-label-double-pass-communique.md`
14. This execution spec.

If implementation requires popup `aria-label` rewriting, a Dienststelle-owned observer, CSS changes, Cognos polling, or state shape changes, stop and report instead of expanding scope.

---

## Section B. Problem statement

### B1. User-visible bug

In DEZPV global Dienststelle hierarchy popup, expanding lower nodes can leave option labels visible with **raw Cognos truncated text** while `title` is sanitized and `KDB_dienststelle_popupLabelsReady` is set.

Canonical broken example:

```html
<div
  data-tid="ba-common-truncated-text__text-node"
  class="ba-common-truncatedText__text KDB_dienststelle_popupLabelsReady"
  aria-label="M06|3h_Ref_ZKS # 3h4_ZKS - Liquidatur"
  title="3h4_ZKS - Liquidatur">M06|3h_Ref…iquidatur</div>
```

### B2. Diagnostic facts (2026-06-05 browser session)

| Fact | Detail |
|------|--------|
| Repro scope | `#filterDock__global` + `[data-id="Dienststelle_DEZPV"]` popup mount |
| Expand outcome | 10/11 labels correct; 1 last-child label broken |
| Broken label | `3h4_ZKS - Liquidatur` — `textContent` truncated with `…`, no `#` |
| Manual probe | Setting `textContent` to sanitized value fixes display immediately |
| Mutation pattern | Multiple `prodTrigger=true` batches, then `prodTrigger=false` tail (~58ms later) |
| Production MO gap | No `characterData`; relevance excludes post-burst truncated text writes |

### B3. Confirmed root causes

**RC1 — Ready gate bypass**

```js
// applyDienststelleDisplaySanitizing.js (current)
if (didStrip || _labelSupport.isLabelSafeToShow(labelEl, _sanitize)) {
  _labelSupport.markLabelNodeReady(labelEl, _selectors);
}
```

Ready can be added when `didStrip === true` even if visible text is not yet equal to sanitized output.

**RC2 — Late Cognos truncated text overwrite without resync**

Cognos may update visible label text via `characterData` after attribute-driven sanitize/resync passes. Production `popupDisplayResync` does not treat those mutations as relevant, so no confirm pass runs.

---

## Section C. Target behavior

### C1. Double-pass model

| Pass | Name | Trigger | Strip actions | Ready rule |
|------|------|---------|---------------|------------|
| 1 | Eager | Existing prod triggers (`childList`, `aria-label`, `title`) via `popupDisplayResync` | `stripLabelElement(text+title)` | `isLabelSafeToShow` only |
| 2 | Confirm | Trailing debounce and/or `characterData` (Tranche 2) | Same idempotent strip | `isLabelSafeToShow` only |

### C2. Ready semantics (strict)

`KDB_dienststelle_popupLabelsReady` is added **only when**:

```js
_labelSupport.isLabelSafeToShow(labelEl, _sanitize) === true
```

Rules inside `isLabelSafeToShow` (unchanged intent):

- If no transformable `#` source exists → safe.
- If transformable source exists → safe only when `textContent === sanitize(source)`.
- Do **not** use sanitized `title` alone as sufficient.

`didStrip` must **not** independently cause ready marking.

### C3. Sanitize timing policy

| DOM signal | Pass | Sanitize | Ready |
|------------|------|----------|-------|
| New option nodes (`childList`) | 1 | yes | only if safe |
| `aria-label` write | 1 | yes | only if safe |
| `title` write | 1 | yes | only if safe |
| Trailing debounce after burst | 2 | yes | only if safe |
| `characterData` on label text node | 2 | yes | only if safe |

### C4. Unchanged contract boundaries

- Popup `aria-label` remains raw (`ariaFromSource: "never"`).
- Dienststelle-owned `MutationObserver` remains forbidden.
- filterDock owns observer lifecycle + confirm scheduling.
- Dienststelle owns strip/transform rules only.
- Existing CSS hide-until-ready remains unchanged.

---

## Section D. Execution tranches

Execute in order. Do not start Tranche 2 until Tranche 1 is complete and smoke-step T1 is recorded.

---

### Tranche 1 — Dienststelle ready gate (required)

#### D1.1 Allowed files

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/applyDienststelleDisplaySanitizing.js
```

Optional read-only verification (no change unless broken):

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/dienststelleDisplayLabelSanitizeSupport.js
```

#### D1.2 Step T1.1 — Baseline static read

1. Open `applyDienststelleDisplaySanitizing.js`.
2. Locate `sanitizePopupLabelsInRoot`.
3. Confirm current ready condition uses `didStrip || isLabelSafeToShow`.
4. Open `dienststelleDisplayLabelSanitizeSupport.js`.
5. Confirm `isLabelSafeToShow` returns `text === sanitized` when `#` source exists.

**Checkpoint T1.1:** Document current lines in handoff; no edits yet.

#### D1.3 Step T1.2 — Change ready marking

In `sanitizePopupLabelsInRoot`, replace ready condition:

```js
// before
if (didStrip || _labelSupport.isLabelSafeToShow(labelEl, _sanitize)) {
  _labelSupport.markLabelNodeReady(labelEl, _selectors);
}

// after
if (_labelSupport.isLabelSafeToShow(labelEl, _sanitize)) {
  _labelSupport.markLabelNodeReady(labelEl, _selectors);
}
```

Rules:

- Keep `didStrip` counter/logic for `changed` return value if present.
- Do not alter `stripLabelElement` options.
- Do not alter `queryLabelTextNodes`.
- Do not alter committed display path.

**Checkpoint T1.2:** Ready marking has no `didStrip ||` branch.

#### D1.4 Step T1.3 — Lint + static checks

1. Run `ReadLints` on touched file.
2. Confirm file remains AMD factory shape and under 150 lines.

**Checkpoint T1.3:** Lint clean.

#### D1.5 Step T1.4 — Smoke (partial expected)

Cognos smoke (DEZPV global popup):

1. Open popup.
2. Expand to `3h4_ZKS - Liquidatur`.
3. Record label state for index-last child.

Expected after Tranche 1 alone:

- **Improved:** no ready + raw truncated flash in most cases.
- **Possible remaining failure:** label stays hidden indefinitely OR still visible raw if RC2 overwrites after a safe-ready moment (record which).

**Checkpoint T1.4:** Capture DOM snapshot + note pass/fail for AC-index-10.

---

### Tranche 2A — filterDock trailing confirm pass (recommended)

#### D2A.1 Allowed files

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/schedulePopupDisplayResync.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/detachPopupDisplayResync.js
```

Read-only coordination files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/dispatchPopupDisplayResync.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/managePopupDisplayResync.js
```

#### D2A.2 Step T2A.1 — Design constants

Add bounded confirm debounce constant at module scope in `schedulePopupDisplayResync.js`:

```js
var POPUP_DISPLAY_RESYNC_CONFIRM_MS = 80;
```

Rules:

- Single constant; no env/config surface.
- Value tunable 50–120ms; default **80** based on observed ~58ms tail gap + margin.
- Document in handoff if changed after smoke.

**Checkpoint T2A.1:** Constant declared at factory scope.

#### D2A.3 Step T2A.2 — Scheduler shape

Extend scheduling so each relevant mutation schedules **two flushes**:

| Flush | Timing | Purpose |
|-------|--------|---------|
| Primary | existing rAF (or `setTimeout 0`) | eager pass (current behavior) |
| Confirm | `setTimeout(..., POPUP_DISPLAY_RESYNC_CONFIRM_MS)` sliding reset | pass 2 after burst settles |

Implementation requirements:

1. Keep existing primary coalescing behavior unchanged.
2. Maintain one pending options object (latest wins), same as today.
3. On each schedule call, (re)start confirm timer:
   - clear prior confirm timer if present,
   - set new timeout for confirm flush.
4. Confirm flush calls the same `flushResync` with options merged to include a serializable source marker, e.g. `resyncSource: "mountMutationConfirm"` (string only; no new action type).
5. Confirm flush must respect `isDisposed()` the same as primary.
6. Store confirm timer handle under `_runtime.timers.popupDisplayResyncConfirm` (or equivalent precise name).

**Checkpoint T2A.2:** Primary + confirm scheduler wired; no duplicate primary floods.

#### D2A.4 Step T2A.3 — Detach cleanup

Update `detachPopupDisplayResync.js` to clear confirm timer handle in addition to primary rAF/timer.

**Checkpoint T2A.3:** No orphaned confirm timers after popup close / destroy.

#### D2A.5 Step T2A.4 — Lint + static checks

1. Lint touched filterDock files.
2. Each file ≤ 150 lines; if over, stop and report — do not split without approval.
3. Confirm no new public API, events, or state fields.

**Checkpoint T2A.4:** Lint clean; line counts recorded.

#### D2A.6 Step T2A.5 — Smoke (full fix expected)

Repeat AC-index-10 and general checks (Section H).

Expected after Tranche 1 + 2A:

- `3h4_ZKS - Liquidatur` visible with sanitized text.
- No prolonged hidden stuck state > ~100ms after node appears.
- No raw truncated flash.

**Checkpoint T2A.5:** AC-index-10 pass/fail recorded.

---

### Tranche 2B — filterDock characterData relevance (conditional fallback)

Execute **only if** Tranche 1 + 2A fail AC-index-10.

Requires user/planner approval recorded in handoff before editing.

#### D2B.1 Allowed files

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/managePopupDisplayResync.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/evaluatePopupDisplayResyncSession.js
```

Optional contract note file (create if 2B executed):

```txt
_____________KDB3API/contracts/dienststelle-popup-display-resync-characterData-contractdelta.md
```

#### D2B.2 Step T2B.1 — Observer options

In `managePopupDisplayResync.js`, extend mount observer:

```js
observer.observe(popupMount, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["aria-label", "title"],
  characterData: true
});
```

Rules:

- Do not add `attributeFilter` entries beyond current unless already approved elsewhere.
- Do not observe `document.body`.

**Checkpoint T2B.1:** Observer enables `characterData` on popup mount subtree only.

#### D2B.3 Step T2B.2 — Relevance helper

In `evaluatePopupDisplayResyncSession.js`, extend `isRelevantMutation`:

Treat `characterData` as relevant **only when** the mutation target is a text node whose parent element matches Dienststelle popup label selectors:

- `[data-tid="ba-common-truncated-text__text-node"]`
- `.ba-common-truncatedText__text`

Implementation guidance:

- Use plain DOM checks on `record.target` and `record.target.parentElement`.
- Do not import Dienststelle modules into filterDock.
- Duplicate selector strings locally in filterDock observation helper constants if needed; do not centralize selectors cross-module in this tranche.

**Checkpoint T2B.2:** Non-label `characterData` mutations remain ignored.

#### D2B.4 Step T2B.3 — Contract delta note

If 2B is executed, add short contract delta stating:

- `popupDisplayResync` may observe `characterData` on popup mount subtree,
- relevance is limited to hierarchy option label text nodes,
- Dienststelle still owns transform; filterDock owns lifecycle.

**Checkpoint T2B.3:** Delta file created or communique approval log updated.

#### D2B.5 Step T2B.4 — Smoke

Repeat Section H. Tranche 2A may remain enabled (confirm debounce + characterData together is acceptable if smoke passes and no runaway resync).

**Checkpoint T2B.4:** AC-index-10 pass required before completion.

---

## Section E. Explicitly out of scope

The executing AI must not:

- Modify `dienststelle.css`.
- Rewrite popup `aria-label`.
- Change `sanitizeDienststelleVisibleLabel` string rules.
- Change `resolveSanitizeSource` priority.
- Add a Dienststelle-owned `MutationObserver`.
- Add Cognos polling or unbounded retry loops.
- Change committed display sanitize behavior.
- Change `runDienststelleReconcile` timing unless explicitly approved elsewhere.
- Change Dienststelle state shape, runtime buckets, public API, or events.
- Change widget, history, Sicht, tableData, defaults, or Cognos write behavior.
- Touch legacy trees, `TEST/`, rules, or unrelated contracts except optional 2B delta noted above.

---

## Section F. Implementation notes

### F1. Idempotency

Both passes call the same `sanitizePopupLabelsInRoot`. When text already equals sanitized output, strip is a no-op and ready marking depends only on `isLabelSafeToShow`.

### F2. Interaction with CSS

Hidden-until-ready means pass 1 may safely write text early without user-visible raw flash **as long as ready is not set prematurely**.

### F3. Resync source strings

Existing pattern uses `resyncSource` in options (e.g. `"mountMutation"`, `"openAttach"`). Confirm pass should add a distinct string (e.g. `"mountMutationConfirm"`) for smoke log identification only. No new dispatch action type.

### F4. BW safety

Confirm scheduling runs only for owners with `needsPopupDisplayResync: true`. Existing session guard that skips `Dienststelle_BW` popup resync must remain intact.

### F5. Performance guardrails

- Confirm timer must be sliding-reset, not fixed interval spam.
- Do not schedule confirm timer when popup session is disposed/closed.
- Primary rAF coalescing must remain.

---

## Section G. Rules to apply

All touched files:

- `amd.mdc` — one full-compact AMD `define`; no ES module syntax; no nested subfunction definitions.
- `feature-structure.mdc` — each touched file ≤ 150 lines.
- `naming.mdc` — precise English helper/timer names.
- `dom.mdc` — scoped traversal; no live DOM refs in state.
- `runtime.mdc` — timer handles live under `_KDB.runtime.filterDock`; detach on close/destroy.
- `error-handling.mdc` — preserve existing try/catch patterns; no new noisy logs unless spec explicitly adds trace (not required here).
- `module-public-api.mdc` / `events.mdc` — no public surface changes.

---

## Section H. Acceptance criteria

### H1. Code constraints

AC1. Tranche 1 modifies only `applyDienststelleDisplaySanitizing.js` (unless pre-existing defects force support-file fix — must be reported).

AC2. Tranche 2A modifies only approved filterDock scheduler/detach files.

AC3. Tranche 2B modifies only approved filterDock observation files (+ optional delta doc).

AC4. All touched production files remain ≤ 150 lines and AMD-shaped.

AC5. `ReadLints` clean on all touched production files.

### H2. Behavioral

AC6. Ready marking never uses `didStrip ||` shortcut.

AC7. Popup labels receive ready class only when `isLabelSafeToShow` is true.

AC8. Popup `aria-label` is not rewritten.

AC9. **AC-index-10:** after expand, `3h4_ZKS - Liquidatur` label has sanitized visible text and ready class.

AC10. No label ends expand cycle with `ready === true` and visible text still truncated/raw (`…` prefix case).

AC11. Labels without `#` source remain visible (not stuck hidden).

AC12. Confirm pass runs after mutation burst (observe `resyncSource: "mountMutationConfirm"` in existing trace/logging if present, or document via manual Cognos smoke).

AC13. BW popup flows show no unintended sanitize/hide regression.

AC14. Popup close / filter switch clears confirm timer (no post-close resync).

### H3. Regression smokes

AC15. DEZPV popup open + scroll + reopen: labels stay sanitized.

AC16. DEZPV multiple sequential expands on same branch: no accumulating hidden labels.

AC17. Sicht toggle DEZPV → BW → DEZPV: popup labels still correct.

AC18. Committed bottom display unchanged by this spec (spot-check only).

---

## Section I. Cognos smoke script (manual)

### I1. Primary repro — AC-index-10

1. Dashboard with Sicht = DEZPV, global filter dock visible.
2. Open global **Dienststelle** popup.
3. Expand tree down to **3h4_ZKS - Liquidatur**.
4. Inspect label element:
   - `textContent` equals `3h4_ZKS - Liquidatur`,
   - `title` equals `3h4_ZKS - Liquidatur`,
   - `aria-label` may contain `#`,
   - ready class present,
   - no visible `M06|…` truncated prefix.

### I2. Flash check

Repeat expand on a fresh popup open. Watch for raw truncated flash during expand. **Fail** if user sees `…` raw prefix before final sanitized text.

### I3. Hidden-stuck check

After expand settles (~200ms), all intended visible options should be shown (not permanently `visibility:hidden`).

### I4. Optional console diag reuse

If needed, reattach browser diagnostic observer from communique session:

- global mount observer with `prodTrigger` flag,
- `dumpUnsafe()` should return **0 rows** at settle time.

---

## Section J. Milestone checklist (executing AI)

| Milestone | Steps | Done when |
|-----------|-------|-----------|
| M0 Pre-flight | A + T1.1 | Read list echoed |
| M1 Ready gate | T1.2–T1.4 | T1 smoke recorded |
| M2 Confirm debounce | T2A.1–T2A.5 | AC-index-10 pass OR fail noted |
| M3 characterData fallback | T2B.* (conditional) | AC-index-10 pass |
| M4 Handoff | Section K | Report complete |

---

## Section K. Reviewer / executing AI handoff report

Final report must include:

1. Pre-flight echo (Section A).
2. Tranches executed (1, 2A, 2B) with rationale.
3. File checklist with before/after line counts.
4. Exact ready-gate diff description.
5. Confirm scheduler description (constant value, timer key, detach behavior).
6. If 2B: relevance rule description + delta reference.
7. AC1–AC18 pass/fail table.
8. T1 partial smoke vs final smoke outcomes.
9. Lint results.
10. Any deviation, uncertainty, or recommended follow-up.

---

## Section L. Supersession notes

| Prior doc | Action |
|-----------|--------|
| `dienststelle-popup-safe-to-show-fix-spec.md` | Superseded for execution — insufficient without Tranche 2 |
| `dienststelle-display-sanitize-timing-t1-fix-spec.md` | Partial overlap — popup scan/defer items stand unless already merged; this spec owns ready gate + confirm pass |

Planner should prefer **this spec** for the next execution task.

---

## Section M. Approval log

| Date | Action | Notes |
|------|--------|-------|
| 2026-06-05 | Execution spec drafted | Eager + confirm double-pass; tranched 1 → 2A → 2B |
| TBD | Planner approval | |
| TBD | Execution completed | |
