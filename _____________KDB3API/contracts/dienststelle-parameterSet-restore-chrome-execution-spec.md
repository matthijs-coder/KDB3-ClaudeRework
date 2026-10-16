# Execution Spec: SET restore Dienststelle chrome realign

> Mechanical spec for Grok 4.6 army. Architecture: `dienststelle-parameterSet-restore-chrome-contractdelta.md`. Do **not** re-decide deactivate vs chrome-only, `sichtChanged`, `dstlWillFollow`, or AMD hop.
> Production tree only: `_____________KDB3API/KDB3/js/**`.

---

**Status:** `Implemented` — dual JS review PASS; **PO Cognos green 2026-09-10**.
**Module / contract:** `contracts/dienststelle-parameterSetRestore-contractdelta.md` + this chrome delta
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-10
**Executing AI:** grok 4.6 army (one writer)
**Reviewer:** captain + dual grok 4.6 + PO Cognos

---

## Exclusive allowlist (one writer)

**May edit:**

- `KDB3/js/dashboard/filters/dienststelle/actions/restoreSupport.js`
- `KDB3/js/dashboard/filters/dienststelle/actions/parameterSet/parameterSetRestore.js`

**Must not edit:** `deactivateInactiveDienststelleVariants.js`; `syncDienststelleFromSicht.js`; `handleDienststelleHistoryReplay.js`; `applyRestorePlan.js`; `runFilterRestore.js`; `handleParameterSetDownstreamVisibility.js`; `syncDienststelleWrapperClasses.js`; tableData; widgetBase; `KDB.js`; contracts (captain); `.mdc`; git.

**Must not create:** new files; `helpers/` / `common/` / `shared/`.

---

## Section A. Pre-flight (echo one sentence each before JS)

1. `kdb-object.mdc` — no new `_KDB` namespace.
2. `state.mdc` — no new writers; deactivate already dispatches `FILTER_STATUS_CHANGED` via `dispatchInternal`.
3. `runtime.mdc` — no new runtime bucket.
4. `module-public-api.mdc` — no new public dienststelle method.
5. `events.mdc` — no new events.
6. `feature-structure.mdc` — JS ≤150; AMD ≤10; no helpers/common/shared.
7. `naming.mdc` — English; `_` on boundary params (`_KDB`, `_dispatchInternal`, `_active`, AMD imports).
8. `error-handling.mdc` — `realignInactiveVariants` try/catch; log + rethrow.
9. `dom.mdc` — no new DOM; chrome stays inside existing deactivate.
10. `amd.mdc` — restore AMD stays 10; support AMD 4; factory-scope helper; no ES modules; no nested fn inside the helper.
11. The chrome contract delta + this spec.

---

## Section B. Per-file

#### `restoreSupport.js`

- **AMD:** add `"../effects/deactivateInactiveDienststelleVariants.js"` as `_deactivateInactive`.
- **Add** factory-scope:

```js
async function realignInactiveVariants(_KDB, _dispatchInternal, _active) {
  try {
    await _deactivateInactive(_KDB, _dispatchInternal, _active);
  } catch (error) {
    console.error("[dienststelle.realignInactiveVariants] failed", error);
    throw error;
  }
}
```

- Export it next to `readRows` / `waitForData` / …
- **Must not:** copy chrome/CSS; call `syncDienststelleFromSicht`; swallow errors.

#### `parameterSetRestore.js`

- **AMD:** unchanged (10).
- In `runRestore`, **after** `_buildRestoreScopePlan` and its stale check, **before** `_applyRestorePlan`:

```js
await _support.realignInactiveVariants(_ctx._KDB, _ctx.dispatchInternal, active);
if (_ctx.isStale(payload.runId)) { return cancelledOrTimeout(_ctx, payload.runId, diagnostics); }
```

- **Must not:** import deactivate directly; dispatch public `sichtChanged`; move the await before the hierarchy wait; change `commitActiveDefinition`.

---

## Section C. Done when

Writer reports Section A echoes; line + AMD counts; insert is immediately before apply; no other files touched. Then STOP.
