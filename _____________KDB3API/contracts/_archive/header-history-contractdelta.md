# header — history integration (CP-1 contractdelta)

**Status:** Draft for CP-1 review (post-review revision).  
**Datum:** 2026-05-21  
**Relatie:** verfijnt `header.md` §2 (ownership/state), §4/§5 (public API/actions), §7 (events), §8 (dependencies), §9 (folder layout) en sluit aan op `historyService.md`, `kdbControl-header-footer-toolbox-contractdelta.md`, `kdbControl-history-contractdelta.md` en `historyService-kdbControl-replay-bootstrap-contractdelta.md`.

---

## 1. Purpose

Deze delta legt vast hoe `header` zijn eigen chrome- en tekstwijzigingen als undo/redo history steps commit en replayt.

### 1.1 Scope tranches

| Tranche | In scope in deze delta | CP-1 default |
|---|---|---|
| **Chrome** | Kopfzeile `header/toggle`, `header/show`, `header/hide`; Untertitel `header/toggleSubtitle`; `header_chromeChange` commits + replay | May ship first |
| **Text** | `header/commitTitle`, `header/commitSubtitle`; `header_textChange` commits + replay | **May be a separate execution tranche**; does not need to ship together with chrome |

`kdbControl` blijft alleen UI/proxy-dispatcher voor toolbox controls. Het pusht geen header history steps en replayt geen header state.

---

## 2. Ownership

| Concern | Owner |
|---|---|
| `_KDB.state.header` | `header` reducer only. |
| `_KDB.state.history` | `historyService` only. |
| Header chrome/text history step construction | `header`. |
| Replay of header chrome/text steps | `header`, through header-owned internal route `applyHeaderHistoryReplay` (CP-1 default); not through public named API extensions. |
| kdbControl checkbox/radio read-sync | `kdbControl`, through published header selectors and runtime `syncView`; no owner state writes. |

Foreign writes blijven verboden:

- `header` schrijft niet direct in `_KDB.state.history`; het gebruikt `_KDB.services.history.pushCommittedStep(step)`.
- `historyService` schrijft niet in `_KDB.state.header`; replay loopt via the header-owned handler contribution only.
- `historyService` importeert geen dashboard/header modules.
- `kdbControl` schrijft niet in `_KDB.state.header` en pusht geen header history steps.

---

## 3. Implementation State Truth

De huidige implementatie is leidend voor snapshots (`createHeaderReducer.js`, `createHeaderController.js`):

```js
_KDB.state.header = {
  status: "idle" | "active" | "removed",
  subtitleStatus: "active" | "removed",
  titleText: string,
  subtitleText: string,
  activeEditableTarget: string | null,
  editTarget: string | null,
  editStatus: string,
  pendingEdit: object | null,
  draftTitleText: string,
  draftSubtitleText: string
};
```

**CP-1 approved default:** history snapshots use implementation truth for subtitle status:

```txt
"active" | "removed"
```

Do not use the older contract wording `"visible" | "hidden"` from `header.md` §2.1 / §7.1 in history steps unless a separate reducer normalization tranche changes the implementation first. Event payload alignment with `header.md` is out of scope for this delta.

Edit-session fields are not included in history snapshots:

```txt
activeEditableTarget
editTarget
editStatus
pendingEdit
draftTitleText
draftSubtitleText
```

---

## 4. Uniform History Step Shape

All header history steps use the same envelope. **`step.old` and `step.new` are always objects with `target` and `value`.** Never use a raw scalar as `old` or `new` directly (for example `old: "active"` is forbidden).

```js
{
  key: "header_chromeChange" | "header_textChange",
  timestamp: number,
  old: {
    target: string,
    value: serializableValue
  },
  new: {
    target: string,
    value: serializableValue
  }
}
```

`value` is target-specific. It may be a string scalar or a plain object, as defined per target below. `readHeaderHistorySnapshot` and `applyHeaderHistoryReplay` must use the same shapes.

### 4.1 `header_chromeChange`

Step key:

```txt
header_chromeChange
```

Tracked targets:

| Target | User action (commit path) | `value` shape in `old` / `new` |
|---|---|---|
| `header.status` | Kopfzeile toggle/show/hide | **string:** `"idle"` \| `"active"` \| `"removed"` |
| `header.subtitleStatus` | Untertitel visibility toggle | **object:** `{ status, subtitleStatus, subtitleText }` — see below |

Example — `header.status`:

```js
{
  key: "header_chromeChange",
  timestamp: Date.now(),
  old: {
    target: "header.status",
    value: "active"
  },
  new: {
    target: "header.status",
    value: "removed"
  }
}
```

Example — `header.subtitleStatus` (explicit context; no blind flip on replay):

```js
{
  key: "header_chromeChange",
  timestamp: Date.now(),
  old: {
    target: "header.subtitleStatus",
    value: {
      status: "active",
      subtitleStatus: "active",
      subtitleText: "Subtitle"
    }
  },
  new: {
    target: "header.subtitleStatus",
    value: {
      status: "active",
      subtitleStatus: "removed",
      subtitleText: ""
    }
  }
}
```

`value.status` mirrors `header.status` at commit time so replay can no-op safely when header chrome is not active.

### 4.2 `header_textChange`

Step key:

```txt
header_textChange
```

Tracked targets:

| Target | User action (commit path only) | `value` shape in `old` / `new` |
|---|---|---|
| `header.titleText` | `header/commitTitle` after confirmed text change | **object:** `{ titleText: string }` |
| `header.subtitleText` | `header/commitSubtitle` after confirmed text change | **object:** `{ subtitleText: string, subtitleStatus: "active" \| "removed" }` |

Example — `header.titleText`:

```js
{
  key: "header_textChange",
  timestamp: Date.now(),
  old: {
    target: "header.titleText",
    value: { titleText: "Old title" }
  },
  new: {
    target: "header.titleText",
    value: { titleText: "New title" }
  }
}
```

Example — `header.subtitleText`:

```js
{
  key: "header_textChange",
  timestamp: Date.now(),
  old: {
    target: "header.subtitleText",
    value: { subtitleText: "", subtitleStatus: "removed" }
  },
  new: {
    target: "header.subtitleText",
    value: { subtitleText: "Subtitle", subtitleStatus: "active" }
  }
}
```

`subtitleStatus` is required in subtitle text snapshots because the reducer clears subtitle chrome when text becomes empty.

Not tracked:

- `header/startTitleEdit`
- `header/startSubtitleEdit`
- `header/cancelEdit`
- switching edit target without a committed text change
- mount sync and DOM-only sync

---

## 5. Commit Rules

`header` may call `_KDB.services.history.pushCommittedStep(step)` only when all of these are true:

1. The header reducer accepted the action and returned a changed state.
2. The action target is listed in §4 for the active tranche (chrome and/or text).
3. `didChange === true` for the tracked snapshot (normalized `{ target, value }` pair).
4. `options.skipHistory !== true`.
5. `options.isHistoryReplay !== true`.
6. `_KDB.services.history.pushCommittedStep` exists.
7. The DOM/effects confirmation path for the header change has completed — the same point used before `header:confirmedChanged` may emit.

If `_KDB.services.history` is unavailable, the header action still succeeds and history is skipped with at most one warning per page load/controller instance. Missing history service must not put `header` into error state.

No replay path may push a new history step.

User-facing commits may still use existing dispatch actions (`header/toggle`, `header/commitTitle`, etc.). History commit is separate from replay apply.

---

## 6. Replay Rules (CP-1 Default)

Replay for `header_chromeChange` and `header_textChange` applies the `{ target, value }` snapshot selected by `historyService`:

- undo passes `step.old`;
- redo passes `step.new`.

### 6.1 Header-owned internal replay route (CP-1 default)

**CP-1 approved default:** replay uses a header-owned internal apply route:

```txt
applyHeaderHistoryReplay(_KDB, payload)
```

located under `header/history/`. The staged handler contribution delegates to this route.

Replay must **not** depend on:

- `header/commitTitle` or `header/commitSubtitle` — production requires an active edit session (`activeEditableTarget` / `editTarget`); replay has no edit session.
- blind `header/toggleSubtitle` — flip semantics are unsafe for undo/redo.

If a dispatch action is used inside the internal replay route, it must have **explicit-set semantics** (desired end state, not flip) and remain header-owned. Prefer an internal reducer/effects path invoked only from `applyHeaderHistoryReplay` with `skipHistory` / `isHistoryReplay` options. **No new public named methods** on `_KDB.api.header`.

### 6.2 Replay options

```js
{
  skipHistory: true,
  isHistoryReplay: true,
  forceApply: true,
  source: "api",
  direction: "undo" | "redo",
  step: step
}
```

**CP-1 approved default:** replay uses existing `SourceEnum` value `"api"`. Do not add `"historyReplay"` in this tranche. Closed set in production:

```txt
"kdbControl" | "api" | "bootstrap"
```

### 6.3 Target apply semantics (internal route)

| Target | Apply rule |
|---|---|
| `header.status` | Set explicit `status`. Prefer internal mapping: `"active"` → show path, `"removed"` → hide path. `"idle"` → return `false` (no `header/resetToIdle` in current reducer). |
| `header.subtitleStatus` | Set explicit `subtitleStatus`, `subtitleText`, and respect `value.status === "active"` guard. **Do not** call `header/toggleSubtitle`. |
| `header.titleText` | Set `titleText` from `value.titleText` without opening edit session. |
| `header.subtitleText` | Set `subtitleText` and `subtitleStatus` from `value` without opening edit session. |

Replay must:

- return `true` only when the owner state/effects apply route succeeds;
- return `false` for malformed `target`/`value` payloads;
- not throw through the history service boundary;
- not push a new history step;
- not mutate footer state directly.

---

## 7. Events And kdbControl Read-Sync

`header:confirmedChanged` remains the header-owned fact event.

Expected behavior:

- User commits and replay commits that change confirmed header chrome/text may emit `header:confirmedChanged` after state + DOM sync.
- `header/startTitleEdit` and `header/startSubtitleEdit` still do not emit confirmed facts by themselves.
- kdbControl must not mirror header state into `_KDB.state.kdbControl`.
- kdbControl checkbox/radio UI must reflect owner state after replay.

**CP-1 approved default:** header effects call `runtime.kdbControl.frameworkBindContext.syncView()` after replay and other confirmed changes (existing pattern for edit-related actions). A kdbControl-only `history:changed` subscriber is optional in a later tranche.

---

## 8. Runtime / Replay Handler Contribution

Header stages one replay handler contribution during `header.mount()` after `_KDB.runtime.header` exists:

```txt
_KDB.runtime.header.historyReplayHandlerContribution
```

Handler shape:

```js
{
  apply: function (_KDB, targetValue, step, context) {
    // targetValue is step.old or step.new: { target, value }
    // must branch on step.key and/or targetValue.target
    // delegates to applyHeaderHistoryReplay
  }
}
```

**CP-1 approved default:** one handler object serves both `header_chromeChange` and `header_textChange` in `collectReplayHandlers()`. The handler **must** branch on `step.key` and/or `targetValue.target` before calling `applyHeaderHistoryReplay`. Do not assume all steps are chrome or all are text.

No public `_KDB.api.header.registerHistoryHandler` method is allowed.

Destroy cleanup:

- `header.destroy()` must remove or null `historyReplayHandlerContribution`.
- Replay runtime handles remain header-owned.

---

## 9. Folder / File Placement

Recommended implementation placement:

```txt
KDB3/js/dashboard/header/
  history/
    buildHeaderHistoryStep.js
    maybePushHeaderHistoryStep.js
    readHeaderHistorySnapshot.js
    isHeaderHistoryTrackedTarget.js
    applyHeaderHistoryReplay.js
    createHeaderHistoryReplayHandler.js
    stageHeaderHistoryReplayHandler.js
```

Chrome and text may share these files with internal branching; text-only helpers may be added in a later tranche without changing the public handler contribution shape.

Do not place header replay code under:

```txt
core/services/historyService/
kdbControl/
helpers/
shared/
common/
manager/
```

---

## 10. Dependencies

| Dependency | Use |
|---|---|
| `_KDB.services.history` | Optional `pushCommittedStep` only. |

No dependency on `_KDB.history`.

No imports from `core/services/historyService/replay/*` inside `header`.

No imports from `kdbControl` inside `header`. kdbControl `syncView` is an existing runtime hook only.

---

## 11. Out Of Scope

- Footer history (see `footer-history-contractdelta.md`).
- Combined header+footer atomic history steps.
- New public named methods on `_KDB.api.header`.
- `"historyReplay"` source enum value (replay stays `"api"`).
- Changing `historyService` public API or importing dashboard modules into `historyService`.
- Native Cognos history.
- kdbControl pushing header history steps.
- Aligning `header.md` / `header:confirmedChanged` payload wording with implementation truth (separate doc tranche).
- Porting filters/widgets/tabs/canvas replay.

---

## 12. CP-1 Questions (remaining)

1. Approve chrome and text as **separate execution tranches** (text may follow chrome)?
2. Approve internal-only replay via `applyHeaderHistoryReplay` without new public dispatch surface?
3. Approve `header.status` replay `"idle"` returning `false` until an explicit owner action exists?
4. Approve header effects (not kdbControl) triggering `syncView()` after replay?

**CP-1 approved defaults (no longer open):** step keys `header_chromeChange` / `header_textChange`; uniform `{ target, value }` shape; `subtitleStatus` snapshots `"active"|"removed"`; replay `source: "api"`; kdbControl does not push header steps; one handler branches on `step.key`/`target`; no `commitTitle`/`commitSubtitle`/`toggleSubtitle` on replay path.

---

## 13. Acceptance Criteria

### Chrome tranche

1. Kopfzeile toggle/show/hide creates one `header_chromeChange` step with `{ target, value }` shape after confirmed owner change.
2. Untertitel visibility creates one `header_chromeChange` step with subtitle context object in `value`.
3. Undo/redo restores chrome through `applyHeaderHistoryReplay`, not through flip/edit dispatch shortcuts.
4. Replay creates no new history step.

### Text tranche (when implemented)

5. `header/commitTitle` creates one `header_textChange` step when `value.titleText` changes.
6. `header/commitSubtitle` creates one `header_textChange` step when subtitle text/status changes.
7. Text replay sets committed fields without an active edit session.

### Cross-cutting

8. Edit start/cancel creates no history steps.
9. `historyService` never imports header files.
10. kdbControl pushes no header history steps and performs no header state writes.
11. kdbControl toolbox read view reflects header replay after sync.

---

## Approval

| Datum | Actor | Note |
|------|-------|------|
| `<pending>` | `<pending CP-1>` | Post-review revision; uniform step shape and replay defaults clarified. |
