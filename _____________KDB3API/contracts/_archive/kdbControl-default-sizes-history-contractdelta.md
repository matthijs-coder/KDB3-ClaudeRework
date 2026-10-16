# kdbControl — default sizes history integration (CP-1 contractdelta)

**Status:** Draft for CP-1 review.  
**Datum:** 2026-05-21  
**Relatie:** verfijnt `kdbControl-history-contractdelta.md` §3, §5, §6, §9, §12 en §13. Deze delta is een beperkte scope-uitbreiding binnen de bestaande `kdbControl_settingsChange` step key; er komt geen nieuwe history handler en geen wijziging aan `historyService`.

---

## 1. Purpose

Deze delta brengt vier kdbControl default-size inputs alsnog in scope voor undo/redo:

- Diagramme Breite
- Diagramme Höhe
- Kommentare Breite
- Kommentare Höhe

De bestaande history infrastructuur blijft leidend:

- step key blijft `kdbControl_settingsChange`;
- replay blijft via de kdbControl-owned handler;
- `historyService` blijft generiek;
- geen public `registerHistoryHandler`;
- geen `_KDB.history`.

---

## 2. Ownership

| Concern | Owner |
|---|---|
| `_KDB.state.kdbControl.settings.defaultsNew.visualization.width` | `kdbControl`. |
| `_KDB.state.kdbControl.settings.defaultsNew.visualization.height` | `kdbControl`. |
| `_KDB.state.kdbControl.settings.defaultsNew.comment.width` | `kdbControl`. |
| `_KDB.state.kdbControl.settings.defaultsNew.comment.height` | `kdbControl`. |
| `_KDB.state.history` | `historyService`. |

Foreign writes blijven verboden:

- `kdbControl` schrijft niet direct in `_KDB.state.history`; het gebruikt `_KDB.services.history.pushCommittedStep(step)`.
- `historyService` schrijft niet in `_KDB.state.kdbControl`; replay loopt via kdbControl.
- Geen canvas/widget/default-size application wordt in deze tranche toegevoegd.

---

## 3. Step Model

Step key blijft:

```txt
kdbControl_settingsChange
```

Deze delta voegt vier tracked targets toe:

| Target | State path | User action |
|---|---|---|
| `defaults.visualization.width` | `_KDB.state.kdbControl.settings.defaultsNew.visualization.width` | `kdbControl/settings/setVisualizationDefault` with `field: "width"` |
| `defaults.visualization.height` | `_KDB.state.kdbControl.settings.defaultsNew.visualization.height` | `kdbControl/settings/setVisualizationDefault` with `field: "height"` |
| `defaults.text.width` | `_KDB.state.kdbControl.settings.defaultsNew.comment.width` | `kdbControl/settings/setCommentDefault` with `field: "width"` |
| `defaults.text.height` | `_KDB.state.kdbControl.settings.defaultsNew.comment.height` | `kdbControl/settings/setCommentDefault` with `field: "height"` |

Snapshot shape:

```js
{
  target: "defaults.visualization.width",
  value: {
    value: "300px"
  }
}
```

Rules:

- `old` and `new` keep the existing `{ target, value }` shape from `kdbControl-history-contractdelta.md`.
- The snapshot value is a serializable dimension string normalized by the existing settings gate/reducer path.
- The canonical target names are the `defaults.*` names above.
- Do not implement aliases for older out-of-scope labels such as `visualization.width`, `visualization.height`, `text.width`, or `text.height`.

This delta supersedes the previous "Not tracked" rows in `kdbControl-history-contractdelta.md` for:

```txt
visualization.width / visualization.height
text.width / text.height
```

Only the canonical `defaults.*` target keys are approved.

---

## 4. Commit Rules

The existing kdbControl commit rules continue to apply:

1. The settings apply succeeded.
2. The committed target is listed in the tracked target list.
3. `didChange === true`.
4. `options.skipHistory !== true`.
5. `options.isHistoryReplay !== true`.
6. `_KDB.services.history.pushCommittedStep` exists.

For these four default-size targets:

- commits are confirmed settings commits from the existing settings form dispatch path;
- no live per-keystroke history is introduced;
- invalid dimensions rejected by the existing gate/reducer path must not create a history step.

---

## 5. Replay Rules

Replay remains the existing `kdbControl_settingsChange` path.

Required replay action mapping:

| Target | Replay action |
|---|---|
| `defaults.visualization.width` | `kdbControl/settings/setVisualizationDefault`, payload `{ field: "width", value }` |
| `defaults.visualization.height` | `kdbControl/settings/setVisualizationDefault`, payload `{ field: "height", value }` |
| `defaults.text.width` | `kdbControl/settings/setCommentDefault`, payload `{ field: "width", value }` |
| `defaults.text.height` | `kdbControl/settings/setCommentDefault`, payload `{ field: "height", value }` |

Replay must preserve the existing mandatory options:

```js
{
  skipHistory: true,
  isHistoryReplay: true,
  forceApply: true,
  direction: "undo" | "redo",
  step: step
}
```

Replay must return `false` when:

- target is malformed or not tracked;
- value is missing or empty;
- `step.old.target` and `step.new.target` do not match;
- the existing settings gate/reducer rejects the dimension.

---

## 6. DOM / Effects

No new canvas or widget-owner effects are approved in this tranche.

Expected behavior:

- `_KDB.state.kdbControl.settings.defaultsNew.*` is restored by replay.
- The visible kdbControl settings inputs sync through the existing `isHistoryReplay` / `tryFrameworkSyncView()` route.
- No new `_KDB.api.canvas` intents are added.
- No dropped visualization/comment widgets are resized in this tranche.

---

## 7. Files Expected To Change

Expected production files:

```txt
KDB3/js/dashboard/canvas/kdbControl/history/isHistoryTrackedSettingsTarget.js
KDB3/js/dashboard/canvas/kdbControl/history/resolveHistoryTargetFromAction.js
KDB3/js/dashboard/canvas/kdbControl/history/readSettingsTargetSnapshot.js
KDB3/js/dashboard/canvas/kdbControl/history/applyControlSettingsHistoryReplay.js
```

No changes expected:

```txt
KDB3/js/dashboard/canvas/kdbControl/createKdbControlController.js
KDB3/js/dashboard/canvas/kdbControl/history/maybePushSettingsHistoryStep.js
KDB3/js/dashboard/canvas/kdbControl/history/buildControlSettingsHistoryStep.js
KDB3/js/core/services/historyService/
KDB3/js/core/services/collectReplayHandlers.js
KDB3/js/KDB.js
```

If implementation discovers that one of the no-change files must change, stop and escalate before editing.

---

## 8. Out Of Scope

- Header title/subtitle text history.
- Header/footer chrome history.
- Canvas/widget application of default size values.
- New `_KDB.api.canvas` intents.
- New history step keys.
- New public APIs.
- History service changes.
- Stack limit changes.
- Legacy edits or TEST harness.

---

## 9. Acceptance Criteria

1. Changing Diagramme Breite pushes one `kdbControl_settingsChange` step with target `defaults.visualization.width`.
2. Changing Diagramme Höhe pushes one `kdbControl_settingsChange` step with target `defaults.visualization.height`.
3. Changing Kommentare Breite pushes one `kdbControl_settingsChange` step with target `defaults.text.width`.
4. Changing Kommentare Höhe pushes one `kdbControl_settingsChange` step with target `defaults.text.height`.
5. Undo/redo restores the corresponding `_KDB.state.kdbControl.settings.defaultsNew.*` value.
6. Undo/redo syncs the visible kdbControl input through existing replay sync.
7. No extra history step is pushed during replay.
8. No `handler missing kdbControl_settingsChange` warning appears for these steps.
9. No `historyService` files are modified.
10. No public APIs are added.

---

## 10. CP-1 Questions

1. Approve the four canonical target keys:
   - `defaults.visualization.width`
   - `defaults.visualization.height`
   - `defaults.text.width`
   - `defaults.text.height`
2. Approve superseding the old not-tracked rows for default sizes in `kdbControl-history-contractdelta.md`?
3. Confirm that canvas/widget application of default sizes remains out of scope?
4. Confirm no new step key; existing `kdbControl_settingsChange` remains the only kdbControl settings history key?

---

## Approval

| Datum | Actor | Note |
|------|-------|------|
| `<pending>` | `<pending CP-1>` | Draft delta awaiting review and approval. |
