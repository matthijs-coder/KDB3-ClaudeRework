# Execution Spec: header history chrome (`header_chromeChange`)

> Execute after `header-footer-history-bootstrap-execution-spec.md` (collect + staging) is complete.
> Contract delta: `_____________KDB3API/contracts/header-history-contractdelta.md` (chrome tranche only; §4.1 and §6.3 chrome rows).

---

**Status:** `Draft`
**Contract delta:** `_____________KDB3API/contracts/header-history-contractdelta.md`
**Phase:** `header history chrome`
**Depends on:** `header-footer-history-bootstrap-execution-spec.md`
**Not in this execution:** `header-history-text-execution-spec.md` (`header_textChange` apply may return `false` until that spec ships).
**Authoring AI:** Auto, 2026-05-21
**Executing AI:** `<pending>`
**Reviewer:** `<pending CP-2>`

**CP-1 approved:**

- Chrome tranche separate from text tranche.
- Uniform `{ target, value }` on `old`/`new`.
- `subtitleStatus` snapshots use `"active" | "removed"`.
- Replay via internal `applyHeaderHistoryReplay` only; no new public API.
- No `header/commitTitle`, `header/commitSubtitle`, or blind `header/toggleSubtitle` on replay path.
- Replay `source: "api"`.
- `header.status` replay to `"idle"` returns `false`.
- kdbControl sync via header effects → `syncView()` after replay.

---

## Section A. Pre-flight read list

Echo one sentence per item before editing:

1. `_____________KDB3API/contracts/header-history-contractdelta.md` — chrome step shapes §4.1, replay §6.
2. `_____________KDB3API/contracts/header.md` — dispatch actions (reference; subtitle wording may differ from implementation).
3. `_____________KDB3API/contracts/header-footer-history-bootstrap-contractdelta.md` — dual keys on one handler.
4. `_____________KDB3API/KDB3/js/dashboard/header/state/createHeaderReducer.js` — toggle, show, hide, toggleSubtitle.
5. `_____________KDB3API/KDB3/js/dashboard/header/createHeaderController.js` — reduceAndEffect, dispatch, no edit-session on replay.
6. `_____________KDB3API/KDB3/js/dashboard/header/effects/__orchestratorHeaderEffects.js` — confirmedChanged, syncKdbControlReadView pattern.
7. `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkKdbActionToggles.js` — header.toggle, header.subtitle.toggle proxy.
8. `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/framework/syncFrameworkViewFromState.js` — checkbox/radio sync from selectors.
9. `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/history/` — kdbControl reference implementation.
10. `_____________KDB3API/.cursor/rules/state.mdc` — header owns state only.
11. `_____________KDB3API/.cursor/rules/amd.mdc` — factory-scope helpers.
12. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mount/dispatch/effect boundaries.

---

## Section B. Scope

Implement header chrome history for:

| Target | User actions |
|---|---|
| `header.status` | `header/toggle`, `header/show`, `header/hide` |
| `header.subtitleStatus` | `header/toggleSubtitle` |

Out of scope for **this** execution:

- `header_textChange` commits/replay (`header/commitTitle`, `header/commitSubtitle`) — handler may branch and return `false` for `header_textChange` until text spec.
- Footer state writes, kdbControl history push, historyService edits, text folder helpers beyond stubs.

---

## Section C. Expected file changes

```txt
_____________KDB3API/KDB3/js/dashboard/header/history/isHeaderHistoryTrackedTarget.js
_____________KDB3API/KDB3/js/dashboard/header/history/readHeaderHistorySnapshot.js
_____________KDB3API/KDB3/js/dashboard/header/history/buildHeaderHistoryStep.js
_____________KDB3API/KDB3/js/dashboard/header/history/maybePushHeaderHistoryStep.js
_____________KDB3API/KDB3/js/dashboard/header/history/applyHeaderHistoryReplay.js
_____________KDB3API/KDB3/js/dashboard/header/history/createHeaderHistoryReplayHandler.js
_____________KDB3API/KDB3/js/dashboard/header/history/stageHeaderHistoryReplayHandler.js
_____________KDB3API/KDB3/js/dashboard/header/createHeaderController.js
_____________KDB3API/KDB3/js/dashboard/header/effects/__orchestratorHeaderEffects.js
```

---

## Section D. Step model (chrome only)

**Key:** `header_chromeChange`

### `header.status`

```js
old: { target: "header.status", value: "active" },
new: { target: "header.status", value: "removed" }
```

`value` is string `"idle" | "active" | "removed"`.

### `header.subtitleStatus`

```js
old: {
  target: "header.subtitleStatus",
  value: { status: "active", subtitleStatus: "active", subtitleText: "..." }
},
new: {
  target: "header.subtitleStatus",
  value: { status: "active", subtitleStatus: "removed", subtitleText: "" }
}
```

`value.status` is header chrome presence at commit time. Replay must no-op return `false` when `value.status !== "active"` for subtitle targets.

---

## Section E. Per-file specification

### `history/isHeaderHistoryTrackedTarget.js`

- Chrome tranche: true for `header.status` and `header.subtitleStatus` only.

### `history/readHeaderHistorySnapshot.js`

- `header.status` → `{ target, value: string status }`.
- `header.subtitleStatus` → `{ target, value: { status, subtitleStatus, subtitleText } }` from current header state.

### `history/buildHeaderHistoryStep.js`

- Key `header_chromeChange`; clone serializable snapshots.

### `history/maybePushHeaderHistoryStep.js`

- Invoke from `reduceAndEffect` after successful change and `_headerEffects`, when action maps to chrome target.
- Resolve target from action type (toggle/show/hide → status; toggleSubtitle → subtitleStatus).
- Respect `skipHistory`, `isHistoryReplay` on action options.
- No-op if snapshot equal; warn once if history service missing.

### `history/applyHeaderHistoryReplay.js`

- **CP-1 default:** internal apply route; may use private reducer/effect helper or internal dispatch with replay options — **not** public new methods on `_KDB.api.header`.
- **Forbidden on replay path:** `header/commitTitle`, `header/commitSubtitle`, `header/toggleSubtitle`.
- **`header.status` mapping:**
  - `"active"` → internal show path (`header/show` equivalent, `source: "api"`, skipHistory, isHistoryReplay, forceApply).
  - `"removed"` → internal hide path.
  - `"idle"` → return `false`.
- **`header.subtitleStatus` mapping:**
  - Apply explicit `subtitleStatus` and `subtitleText` from `value` object (direct reducer helper or internal action).
  - If `value.status !== "active"` → return `false`.
- Return `true` only when state/effects succeed; no footer mutation.

### `history/createHeaderHistoryReplayHandler.js`

- `apply(_KDB, targetValue, step, context)`:
  - If `step.key === "header_textChange"` → return `false` (text tranche).
  - If `step.key === "header_chromeChange"` → delegate to `applyHeaderHistoryReplay`.
  - Also validate `targetValue.target` matches chrome targets.

### `history/stageHeaderHistoryReplayHandler.js`

- Stage on mount; pass closure/delegate into `applyHeaderHistoryReplay` (pattern: `stageKdbControlHistoryReplayHandler`).

### `createHeaderController.js`

- In `reduceAndEffect`, after `_headerEffects`, call `maybePushHeaderHistoryStep` when action is chrome-related and change succeeded.
- Do not push for edit actions (`startTitleEdit`, `commitTitle`, etc.) in chrome spec.

### `effects/__orchestratorHeaderEffects.js`

- Extend sync trigger: after replay (`action` options `isHistoryReplay`) **or** chrome-changing user actions (`header/toggle`, `show`, `hide`, `toggleSubtitle`), call `syncKdbControlReadView` (existing helper) so Kopfzeile and Untertitel checkboxes update.
- Keep `noEmitTypes` for start-edit actions.
- `header:confirmedChanged` behavior unchanged for chrome replay commits that change chrome snapshot fields.

---

## Section F. Acceptance Criteria

1. Kopfzeile toggle (`header/toggle` from kdbControl) → one `header_chromeChange` step; `{ target: "header.status", value }` shape.
2. Untertitel toggle → one `header_chromeChange` step with subtitle context object in `value`.
3. Undo Kopfzeile restores prior status + header DOM + kdbControl Kopfzeile checkbox after sync.
4. Undo Untertitel restores prior subtitleStatus/subtitleText + checkbox.
5. Redo restores forward snapshot.
6. Replay does not call `toggleSubtitle` or edit commits; no extra stack entry on undo/redo.
7. `header_textChange` steps on stack (if any from manual testing) replay as `false` until text spec — acceptable for chrome-only pass.
8. Replay to `header.status: "idle"` returns `false`.

---

## Section G. Forbidden Actions

- Do not add public `_KDB.api.header.*` history methods.
- Do not import `historyService/replay/*` in header.
- Do not push history from kdbControl.
- Do not implement full `header_textChange` in this tranche.
- Do not use blind toggle for subtitle replay.

---

## Section H. Verification Hints

```txt
header.toggle -> one step, pointer +1.
subtitle toggle -> step value includes subtitleText + subtitleStatus.
undo -> no second inverse step on stack.
console: no handler missing header_chromeChange after bind.
grep toggleSubtitle inside applyHeaderHistoryReplay -> should not be used for replay apply.
```

---

## Section I. Reporting Template

1. Pre-flight echo.
2. File checklist with line counts.
3. Example step JSON (status + subtitle).
4. Replay active for `header_chromeChange` (yes/no).
5. `header_textChange` handler returns false (expected until text spec).
6. syncView after replay (yes/no).
7. ReadLints + forbidden searches.
8. Deviations.
