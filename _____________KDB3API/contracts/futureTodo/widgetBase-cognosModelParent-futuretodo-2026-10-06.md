# futureTodo: Cognos model parent is never updated on cross-slot widget moves

**Date:** 2026-10-06 — parked by PO vastenburg (no fix now)
**Tab-mutation part:** closed 2026-10-07. Duplicate, delete, move, and their undo and redo rebuild content on the destination slot's own stock. They do not move a widget DOM node to another tab (`tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1).
**Still open:** launchpad-transfer replay on one tab, and any other same-slot park or take that is not a tab mutation. This file stays open for that remainder. Do not treat the closed tab-mutation clauses as a reason to call `moveContent` or `setParent`.

## Finding (read-only investigation)

- KDB3 never writes a widget's Cognos parent. No `addContent` / `moveContent` / `setParent` / `setContainer` in `KDB3/js`. `setWidgetLayout` writes only left/top/width/height (`cognosAPI/widgets.js:49-61`).
- Park (`moveWidgetToLaunchpad.js:19`) and take (`placeWidgetOnCanvas.js:14`) are DOM `appendChild` only. Tab move, delete/duplicate shift, restoreDeleted, rollback and launchpad-transfer replay move the **same** widget id to another slot; `getContent(id).getContainer().getId()` stays the original page.
- `laatsteOriginal` kept model and DOM aligned: tab copy moved **content** onto the destination slot's own stock widgets, not the node.
- Contracts (`tabs-tabCrud-contractdelta.md`, `widgetBase-tabMutation-contractdelta.md`, `widgetBase.md`) never require model parent = DOM parent → contract gap (b).

## Live status

Tab mutation no longer moves the shell. Duplicate, delete, move, and their undo and redo were live-green on 2026-10-07 and rebuild on the destination slot's own stock. Widgets still render after those operations. Launchpad-transfer replay on one tab can still move the same widget id. No visible symptom has been attributed to a model-parent mismatch.

## Possible risks to check later

Cognos operations that use the model container: Cognos-side render events on hidden pages, Cognos save of the dashboard spec (widget stored under the old page?), Cognos copy/paste, focus/maximize, Cognos page deletion.

## Read-only check (when revisited)

```js
(function(){var k=window.top.getKDB();return k.cognosAPI.canvas.findCanvasContent().map(function(i){var id=i.getId(),el=document.getElementById(id),c=i.getContainer&&i.getContainer(),m=c&&c.getId&&c.getId();return{id:id,modelParent:m,domParent:el&&el.parentElement&&el.parentElement.id,mismatch:!!(el&&m&&el.parentElement&&el.parentElement.id!==m)};});})()
```
