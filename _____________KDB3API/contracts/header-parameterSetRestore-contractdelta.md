# Contract Delta: `header` Parameter-Set Restore

> Delta on top of `contracts/header.md` and `contracts/writeback.md`.
> T2 item 4 (`head.icon`) is specified here and in
> `writeback-t2-item4-contractdelta.md`; that WP owns the production JS.

---

**Status:** `Approved` (restore 2026-07-10; `head.icon` 2026-08-16)
**Parent contract:** `contracts/header.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08; T2 item 4 planner (Grok 4.6), 2026-08-16
**Reviewed by:** `PO (vastenburg), approved 2026-07-10 with tranche-2 step-3 plan; key names synced to the approved descriptive-key redesign (writeback.md §4.1.1: head with on/title/sub/subOn); restore is absolute per §4.6.1 (omitted head applies the owner default: hidden header, cleared texts). T2 item 4 icon persist: PO 2026-08-16, see writeback-t2-item4-contractdelta.md.`

---

## 1. Purpose

`writebackSet.restore(v3)` must restore v3 `head` through the `header` owner. Writeback must not write `_KDB.state.header` or header DOM directly.

## 2. v3 Mapping

v3 field:

```js
head: { on: 1, title: "Title", sub: "Subtitle", subOn: 1, icon: "Stadt-wien" }
```

Mapping:

| v3 | Header owner state |
|---|---|
| `head.on: 1` | `status: "active"` |
| `head.on: 0` | `status: "removed"` |
| omitted `head` | apply owner default: hidden header, cleared texts, default `iconKey` (absolute restore per writeback.md §4.6.1) |
| `head.title` | `titleText` (omitted -> `""`) |
| `head.sub` | `subtitleText` (non-empty `sub` implies a visible subtitle) |
| `head.subOn: 1` | `subtitleStatus: "active"` (owner vocabulary; contract-level "visible") |
| `head.subOn: 0` / omitted with empty `sub` | `subtitleStatus: "removed"` (owner vocabulary; contract-level "hidden") |
| `head.icon` | `iconKey` PNG stem; omitted / default aliases → `"Stadt-wien"`; unknown stem → default + `WRITEBACK_HEADER_FIELD_UNSUPPORTED` (not SET abort). See `writeback-t2-item4-contractdelta.md`. |

Note on omitted `head`: the owner cannot return to the pre-decision `"idle"` status once a header existed; the default restore lands on `"removed"` with cleared texts and default icon. GET then serializes `head: { on: 0 }` instead of omission — behaviorally identical, accepted serialization drift (PO 2026-07-10).

Invalid v3:

- `head.title` without `head.on`;
- `head.sub` without `head.on`;
- `head.subOn` without `head.on`;
- `head.icon` without `head.on`;
- `head.icon` present but not a string.

## 3. Public Dispatch

Required action:

```js
_KDB.api.header.dispatch({
  type: "header/parameterSetRestoreRequested",
  payload: {
    header: v3.head,
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
2. when `status === "newDashboard"`, ignore supplied `header` restore values and apply owner default/empty header state;
3. normalize omitted `head` to owner default behavior;
4. route presence changes through existing owner semantics equivalent to `header/show` or `header/hide`;
5. commit title/subtitle text only when `status === "active"`;
6. apply `subtitleStatus` only when `status === "active"`;
7. apply `iconKey` from `head.icon` (default aliases / omitted → `"Stadt-wien"`; unknown → default + diagnostic, `ok` stays true);
8. sync header DOM after reducer commit;
9. emit owner facts only after confirmed render sync (fact payload unchanged; icon-only need not emit);
10. avoid history writes when `skipHistory === true`.

For `head.on: 0`, title/subtitle/icon fields are ignored and must not be restored as drafts; `iconKey` resets to default.

## 5. Failure Modes

| Condition | Behavior |
|---|---|
| `head.icon` unknown stem | `{ ok: true, degraded: true }` + `WRITEBACK_HEADER_FIELD_UNSUPPORTED`; logo falls back to default; do **not** fail SET |
| `head.icon` wrong type | fail validate before dispatch (`WRITEBACK_INVALID_V3_PAYLOAD`) |
| stale `runId` | cancel with `WRITEBACK_RESTORE_CANCELLED` |
| status `"newDashboard"` default failure | abort reset unless owner can prove current state already matches empty/default header |
| owner apply/DOM sync failure | return `{ ok: false }` with diagnostic `WRITEBACK_HEADER_RESTORE_FAILED` |

For present `head`, header owner `{ ok: false }` is a required-field failure (`WRITEBACK_HEADER_RESTORE_FAILED` / cancel). `writebackSet` must return `ok: false`, `outcome: "failed"` unless the restore was cancelled. Unknown `head.icon` is **not** `{ ok: false }`.

## 6. Acceptance

- `head.on: 1` results in `header.status === "active"`.
- `head.on: 0` results in `header.status === "removed"`.
- omitted `head` applies the owner default (hidden header, cleared texts); it never leaves stale saved content behind.
- `head.title`, `head.sub`, `head.subOn` are rejected without `head.on`.
- `head.icon` default aliases omit on GET; unknown stem degrades restore, does not abort.
- Restore does not mutate footer directly.
