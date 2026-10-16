# Contract Delta: `footer` Parameter-Set Restore

> Delta on top of `contracts/footer.md` and `contracts/writeback.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved`
**Parent contract:** `contracts/footer.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08
**Reviewed by:** `PO (vastenburg), approved 2026-07-10 with tranche-2 step-3 plan; key names synced to the approved descriptive-key redesign (writeback.md §4.1.1: foot with on); restore is absolute per §4.6.1 (omitted foot applies the owner default: hidden footer)`

---

## 1. Purpose

`writebackSet.restore(v3)` must restore v3 `foot` through the `footer` owner. Writeback must not write `_KDB.state.footer` or footer DOM directly.

## 2. v3 Mapping

v3 field:

```js
foot: { on: 1 }
```

Mapping:

| v3 | Footer owner state |
|---|---|
| `foot.on: 1` | `status: "active"` if header is active |
| `foot.on: 0` | `status: "removed"` |
| omitted `foot` | apply owner default: hidden footer (absolute restore per writeback.md §4.6.1) |

Note on omitted `foot`: the owner cannot return to the pre-decision `"idle"` status once a footer existed; the default restore lands on `"removed"`. GET then serializes `foot: { on: 0 }` instead of omission — behaviorally identical, accepted serialization drift (PO 2026-07-10).

Footer inherits the existing guard from `footer.md`: it cannot become active unless `header.status === "active"`.

## 3. Public Dispatch

Required action:

```js
_KDB.api.footer.dispatch({
  type: "footer/parameterSetRestoreRequested",
  payload: {
    footer: v3.foot,
    headerStatus,
    source: "writebackSet",
    runId,
    skipHistory: true,
    status
  }
});
```

Return contract:

```js
Promise<{
  ok: boolean,
  status: "idle" | "active" | "removed",
  diagnostics: Array<{ code, message }>
}>
```

## 4. Restore Semantics

The owner must:

1. validate `runId`;
2. when `status === "newDashboard"`, ignore supplied `footer` restore values and apply owner default/empty footer state;
3. read `headerStatus` from payload or the public header selector;
4. route presence changes through existing owner semantics equivalent to `footer/show` or `footer/hide`;
5. enforce the header guard before allowing `active`;
6. sync footer DOM after reducer commit;
7. avoid history writes when `skipHistory === true`.

If `foot.on: 1` but header is not active, footer restore must not force header active. It must return a diagnostic and leave footer inactive/removed according to owner policy.

Outcome classification:

- If footer owner returns `{ ok: false }` for present `foot`, `writebackSet` must return `ok: false`, `outcome: "failed"` unless the restore was cancelled.
- `WRITEBACK_FOOTER_HEADER_GUARD` with a successfully restored inactive header is a degraded restore, not a committed exact footer restore.
- `WRITEBACK_FOOTER_HEADER_GUARD` caused by header restore failure is a failed restore.

## 5. Failure Modes

| Condition | Behavior |
|---|---|
| stale `runId` | cancel with `WRITEBACK_RESTORE_CANCELLED` |
| `foot.on: 1` while header inactive | do not activate; diagnostic `WRITEBACK_FOOTER_HEADER_GUARD` |
| status `"newDashboard"` default failure | abort reset unless owner can prove current state already matches empty/default footer |
| owner apply/DOM sync failure | return `{ ok: false }` with diagnostic `WRITEBACK_FOOTER_RESTORE_FAILED` |

## 6. Acceptance

- `foot.on: 0` restores `footer.status === "removed"`.
- `foot.on: 1` restores `footer.status === "active"` only when header is active.
- omitted `foot` applies the owner default (hidden footer); it never leaves a stale active footer behind.
- Restore does not mutate header directly.
