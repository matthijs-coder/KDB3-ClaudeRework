# Execution Spec: widgetVis parameter-set binding — no degraded on clean success (WP-N)

> Mechanical spec for Grok 4.7. Code-to-contract fix; **no contract change**. Contracts: `widgetVis-parameterSetRestore-contractdelta.md` (return shape `{ ok, bound, skipped, diagnostics }`; `WRITEBACK_WIDGET_BINDING_DEGRADED` only for skipped widgets, §121-122), `widgetBindingApply.md` (§diagnostics: the apply `diagnostics` object is present on every result, including success; `waitForComplete: false` is success).
> Production tree only. One writer. Echo Section A before editing.

---

**Status:** `Ready for execution` pending PO go — review 2026-10-06 SPEC-OK (block is lines 96-99; line 95 `ok === true` test stays)
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** grok 4.7 (W2)
**Reviewer:** coordinator + grok 4.7 review + PO Cognos

---

## Finding (verified 2026-10-06)

`handleParameterSetBinding.js:95-99` marks a bound widget degraded when `applyResult.diagnostics` is truthy. `reportApplyResult.js:18-31` always sets `diagnostics` (the apply trace) on success, so **every** successful bind pushes `WRITEBACK_WIDGET_BINDING_DEGRADED` "binding completed with diagnostics" and sets `result.degraded = true` when nothing was skipped.

Consequences today: writeback restore ends `outcome: "degraded"` instead of `"committed"` on a clean run; `widgetBase/effects/bindRestoredVisWidgets.js:76` and `fillDuplicateWidgetContent.js:74` (`result.degraded !== true` check) report spurious degradation for restore-deleted and duplicate flows.

## Exclusive allowlist

**May edit:** `KDB3/js/dashboard/widgets/widgetVis/actions/handleParameterSetBinding.js`

**Must not edit:** everything else (incl. `parameterSetBindingHelpers.js`, `reportApplyResult.js`, `createApplyResult.js`, widgetBase callers, writeback, contracts, `.mdc`). No commit.

## Section A. Pre-flight read list

1. `.cursor/rules/error-handling.mdc` — no silent catch; no new catch needed.
2. `.cursor/rules/feature-structure.mdc` — file ≤ 150.
3. `.cursor/rules/amd.mdc` — no structural change.
4. `contracts/widgetVis-parameterSetRestore-contractdelta.md` — return shape and §121-123 failure table.
5. `contracts/widgetBindingApply.md` — diagnostics on success; `waitForComplete: false`.
6. This spec.

## Section C. Change

In `handleParameterSetBinding.js` remove exactly the block inside the success branch:

```js
if (applyResult.diagnostics) {
  degraded = true;
  diagnostics.push({ code: DEGRADED, widgetId: widgetId, message: "binding completed with diagnostics" });
}
```

The success branch becomes `bound.push(widgetId);` only. Nothing else changes: the `degraded` flag, the skip paths (content-readiness timeout, missing settings, `isDegradedFailure`), `ok = skipped.length === 0`, the `ok && degraded` branch, stale checks, `deferRenderWait: true`.

- Lines: 134 → 130.
- **Rules to apply:** `error-handling.mdc`, `feature-structure.mdc`, `amd.mdc`.

## Section J. Acceptance

1. Only that block removed (diff = 4 deleted lines).
2. A clean bind yields no diagnostic for that widget; skipped widgets keep their existing diagnostics and codes.
3. Live (PO, together with WP-J run): step-27 phase diagnostics no longer list "binding completed with diagnostics"; the TopN-blocked widget (if still present) remains in `skipped` with `WRITEBACK_WIDGET_BINDING_DEGRADED`.

## Section L. Forbidden

Changing `isDegradedFailure`, the skip paths or any other file; adding warnings passthrough; commit/push.
