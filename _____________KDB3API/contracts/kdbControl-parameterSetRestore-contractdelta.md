# Contract Delta: `kdbControl` Parameter-Set Restore

> Delta on top of `contracts/kdbControl.md` and `contracts/writeback.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved`
**Parent contract:** `contracts/kdbControl.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08
**Reviewed by:** `PO (vastenburg), approved 2026-07-10 with tranche-2 step-2 plan; key names synced to the approved descriptive-key redesign (writeback.md §4.1.1: canv/sett with dash/panel/newwg, hidWs/hidSu); restore is absolute per §4.6.1 (omitted keys restore owner defaults)`

---

## 1. Purpose

`writebackSet.restore(v3)` must restore dashboard canvas/settings deltas without mutating `kdbControl` state or DOM directly.

This delta defines the owner dispatch for v3 fields:

- `canv`
- `sett`

It explicitly does **not** restore:

- `head`
- `foot`
- widget settings
- filter state

Those are owned by their own modules.

## 2. Public Dispatch

Required action:

```js
_KDB.api.kdbControl.dispatch({
  type: "kdbControl/parameterSetRestoreRequested",
  payload: {
    canvas: v3.canv,
    settings: v3.sett,
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
  appliedKeys: string[],
  skippedKeys: string[],
  diagnostics: Array<{ code, key?, message }>
}>
```

If the existing dispatch surface is synchronous, the parameter-set restore action must still expose a promise-like completion point to `writebackSet`.

## 3. Payload Shape

`canvas`:

```js
{ w: number, h: number } | undefined
```

`settings`:

```js
{
  dash?: {
    bg?: string,
    hidWs?: 0 | 1,
    devOn?: 0 | 1,
    hidSu?: 0 | 1  // retired: validate, ignore on restore (see developer-mode toggle delta)
  },
  panel?: {
    bg?: string,
    btn?: string,
    act?: string,
    inBg?: string
  },
  newwg?: {
    vis?: { w?: number, h?: number, bg?: string },
    txt?: { w?: number, h?: number, bg?: string }
  }
}
```

Dashboard width/height travel only in `canvas` (`canv`), never as `sett.dash.w/h` (see writeback.md §4.1.1). An omitted key restores the owner default per writeback.md §4.6.1 (absolute restore).

The key catalog is normative in `contracts/writeback.md` §4.1.1. Unknown keys must be rejected by `validateV3` before dispatch.

## 4. Restore Semantics

The owner must:

1. validate `runId` against the active writeback restore run if available;
2. when `status === "newDashboard"`, ignore supplied `canvas`/`settings` restore values and apply owner defaults;
3. otherwise apply `canv` to dashboard dimension settings;
4. otherwise apply `sett.dash`, `sett.panel`, `sett.newwg` through the same reducer/effect paths used by normal settings changes; **`sett.dash.devOn`** uses `kdbControl/settings/setDeveloperMode` then `_KDB.api.properties.applyDeveloperMode` (`source: "writebackRestore"`). **`sett.dash.hidSu` is ignored.** See [kdbControl-developer-mode-toggle-contractdelta.md](./kdbControl-developer-mode-toggle-contractdelta.md);
5. sync configuration UI controls after state commit;
6. avoid history writes when `skipHistory === true`;
7. return applied/skipped diagnostics.

The owner must not:

- restore header/footer state;
- write `_KDB.state.header` or `_KDB.state.footer`;
- write widget defaults outside `settings.defaultsNew`;
- mutate Cognos canvas directly outside existing settings/canvas owner paths.

## 5. Failure Modes

| Condition | Behavior |
|---|---|
| stale `runId` | reject/resolve `{ ok: false }` with `WRITEBACK_RESTORE_CANCELLED` |
| invalid key | should not reach owner; if it does, fail with `WRITEBACK_INVALID_V3_PAYLOAD` |
| owner setting apply failure | fail with `WRITEBACK_KDBCONTROL_RESTORE_FAILED` diagnostic |
| status `"newDashboard"` | apply owner defaults; failure aborts reset unless owner can prove current state already matches defaults |

## 6. Acceptance

- `canv` restores numeric width/height, no `"px"` strings.
- Every supported `sett` key maps to exactly one owner state path.
- `head`/`foot` are not accepted by this action.
- `skipHistory: true` prevents settings restore from pushing history steps.
- Configuration UI reflects restored settings after completion.
